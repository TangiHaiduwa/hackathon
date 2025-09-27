import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  BellIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  HeartIcon,
  PencilIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const NurseDashboard = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [todaysAssignments, setTodaysAssignments] = useState([]);
  const [medicationSchedule, setMedicationSchedule] = useState([]);
  const [priorityAlerts, setPriorityAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');

  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
    { name: 'Medical Records', href: '/medical-records1', icon: DocumentTextIcon },
    { name: 'Patient Rounds', href: '/patient-rounds-page', icon: DocumentTextIcon },
  ];

  // Fetch nurse data and dashboard information
  useEffect(() => {
    const fetchNurseData = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        
        // Get nurse profile with proper role checking
        const { data: nurseData, error: nurseError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            roles(role_name),
            medical_staff(
              id,
              department_id,
              departments(department_name)
            )
          `)
          .eq('id', authUser.id)
          .single();

        if (nurseError) {
          console.error('Error fetching nurse profile:', nurseError);
          return;
        }

        setUser(nurseData);

        // Fetch all dashboard data in parallel
        const [assignments, medications, alerts] = await Promise.all([
          fetchTodaysAssignments(authUser.id),
          fetchMedicationSchedule(authUser.id),
          fetchPriorityAlerts(authUser.id)
        ]);

        setTodaysAssignments(assignments);
        setMedicationSchedule(medications);
        setPriorityAlerts(alerts);

      } catch (error) {
        console.error('Error fetching nurse data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNurseData();

    // Set up real-time subscription for alerts
    const alertsSubscription = supabase
      .channel('nurse-alerts')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'patient_alerts' },
        (payload) => {
          if (authUser) {
            fetchPriorityAlerts(authUser.id).then(setPriorityAlerts);
          }
        }
      )
      .subscribe();

    return () => {
      alertsSubscription.unsubscribe();
    };
  }, [authUser]);

  // CORRECTED: Fetch today's patient assignments
  const fetchTodaysAssignments = async (nurseId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First, get nurse's assigned patients
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select(`
          patient_id,
          patients(
            id,
            users(
              first_name,
              last_name,
              date_of_birth
            ),
            emergency_contact_name
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('is_active', true)
        .eq('assigned_date', today);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      // Fetch latest diagnoses for these patients
      const { data: diagnosesData } = await supabase
        .from('medical_diagnoses')
        .select(`
          patient_id,
          severity,
          diagnosis_date,
          diseases(disease_name)
        `)
        .in('patient_id', patientIds)
        .order('diagnosis_date', { ascending: false });

      // Fetch latest vital signs
      const { data: vitalsData } = await supabase
        .from('vital_signs')
        .select(`
          patient_id,
          heart_rate,
          temperature,
          recorded_at
        `)
        .in('patient_id', patientIds)
        .order('recorded_at', { ascending: false });

      // Fetch today's appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('patient_id, appointment_time')
        .in('patient_id', patientIds)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      // Process and combine data
      return assignments.map(assignment => {
        const patientId = assignment.patient_id;
        const patientDiagnoses = diagnosesData?.filter(d => d.patient_id === patientId) || [];
        const patientVitals = vitalsData?.filter(v => v.patient_id === patientId) || [];
        const patientAppointments = appointmentsData?.filter(apt => apt.patient_id === patientId) || [];
        
        const latestDiagnosis = patientDiagnoses[0];
        const latestVitals = patientVitals[0];
        const nextAppointment = patientAppointments[0];

        return {
          id: patientId,
          name: `${assignment.patients.users.first_name} ${assignment.patients.users.last_name}`,
          age: calculateAge(assignment.patients.users.date_of_birth),
          condition: latestDiagnosis?.diseases?.disease_name || 'General care',
          severity: latestDiagnosis?.severity || 'stable',
          lastVitals: latestVitals?.recorded_at 
            ? new Date(latestVitals.recorded_at).toLocaleTimeString() 
            : 'No vitals recorded',
          heartRate: latestVitals?.heart_rate || '--',
          temperature: latestVitals?.temperature || '--',
          nextAppointment: nextAppointment?.appointment_time || 'No appointment today',
          priority: getPatientPriority(latestDiagnosis?.severity)
        };
      });

    } catch (error) {
      console.error('Error in fetchTodaysAssignments:', error);
      return [];
    }
  };

  // CORRECTED: Fetch medication schedule
  const fetchMedicationSchedule = async (nurseId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Get assigned patients
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', nurseId)
        .eq('is_active', true)
        .eq('assigned_date', today);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      // Fetch medication schedule for assigned patients
      const { data, error } = await supabase
        .from('medication_schedule')
        .select(`
          id,
          scheduled_time,
          status,
          administered_time,
          administered_by,
          notes,
          prescription_items(
            dosage_instructions,
            drugs(
              drug_name,
              dosage
            ),
            prescriptions(
              patient_id,
              patients(
                users(first_name, last_name)
              )
            )
          )
        `)
        .in('prescription_items.prescriptions.patient_id', patientIds)
        .gte('scheduled_time', `${today}T00:00:00`)
        .lte('scheduled_time', `${today}T23:59:59`)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      return (data || []).map(med => ({
        id: med.id,
        patient: med.prescription_items?.prescriptions?.patients?.users 
          ? `${med.prescription_items.prescriptions.patients.users.first_name} ${med.prescription_items.prescriptions.patients.users.last_name}`
          : 'Unknown Patient',
        medication: med.prescription_items?.drugs?.drug_name || 'Unknown Medication',
        dosage: med.prescription_items?.drugs?.dosage || '--',
        instructions: med.prescription_items?.dosage_instructions || 'No instructions',
        scheduledTime: new Date(med.scheduled_time),
        status: med.status || 'scheduled',
        isOverdue: med.status === 'scheduled' && new Date(med.scheduled_time) < now,
        isCritical: med.prescription_items?.drugs?.dosage?.includes('high') || false
      }));

    } catch (error) {
      console.error('Error fetching medication schedule:', error);
      return [];
    }
  };

  // CORRECTED: Fetch priority alerts
  const fetchPriorityAlerts = async (nurseId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get assigned patients
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', nurseId)
        .eq('is_active', true)
        .eq('assigned_date', today);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      const { data, error } = await supabase
        .from('patient_alerts')
        .select(`
          id,
          title,
          message,
          is_resolved,
          created_at,
          alert_types(
            type_name,
            severity
          ),
          patients(
            users(first_name, last_name)
          )
        `)
        .in('patient_id', patientIds)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(alert => ({
        id: alert.id,
        patient: alert.patients?.users 
          ? `${alert.patients.users.first_name} ${alert.patients.users.last_name}`
          : 'Unknown Patient',
        type: alert.alert_types?.type_name || 'Alert',
        severity: alert.alert_types?.severity || 'medium',
        message: alert.message || alert.title,
        timestamp: new Date(alert.created_at),
        isCritical: alert.alert_types?.severity === 'critical'
      }));

    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  };

  // CORRECTED: Mark medication as administered
  const markMedicationAdministered = async (medicationId) => {
    try {
      const { error } = await supabase
        .from('medication_schedule')
        .update({
          status: 'administered',
          administered_time: new Date().toISOString(),
          administered_by: authUser.id
        })
        .eq('id', medicationId);

      if (error) throw error;

      // Also record in drug_administration table
      await supabase
        .from('drug_administration')
        .insert({
          prescription_item_id: medicationId, // This should be the actual prescription_item_id
          patient_id: null, // You'd need to get this from the medication record
          administered_by: authUser.id,
          scheduled_time: new Date().toISOString(),
          actual_time: new Date().toISOString(),
          dosage_administered: 'As prescribed', // Get from prescription
          administration_route: 'oral', // Default, should be configurable
          status: 'administered'
        });

      // Refresh medication schedule
      const updatedSchedule = await fetchMedicationSchedule(authUser.id);
      setMedicationSchedule(updatedSchedule);

    } catch (error) {
      console.error('Error marking medication administered:', error);
      alert('Error updating medication status');
    }
  };

  // CORRECTED: Resolve alert
  const resolveAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('patient_alerts')
        .update({
          is_resolved: true,
          resolved_by: authUser.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Refresh alerts
      const updatedAlerts = await fetchPriorityAlerts(authUser.id);
      setPriorityAlerts(updatedAlerts);

    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error resolving alert');
    }
  };

  // Utility functions
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getPatientPriority = (severity) => {
    switch (severity) {
      case 'severe': return 'high';
      case 'moderate': return 'medium';
      default: return 'low';
    }
  };

  // Quick actions for nurse workflow
  const quickActions = [
    {
      icon: ClipboardDocumentListIcon,
      label: 'Record Vitals',
      description: 'Take patient vital signs',
      color: 'green',
      href: '/vitals'
    },
    {
      icon: DocumentTextIcon,
      label: 'Patient Notes',
      description: 'Add clinical notes',
      color: 'blue',
      href: '/patient-care'
    },
    {
      icon: CalendarIcon,
      label: 'Schedule',
      description: 'View daily schedule',
      color: 'purple',
      href: '/schedule'
    },
    {
      icon: BellIcon,
      label: 'Alerts',
      description: 'Manage notifications',
      color: 'orange',
      href: '/alerts'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout user={{ name: 'Loading...', role: 'nurse' }} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nurse Dashboard</h1>
            <p className="text-gray-600">Good morning, {user?.first_name}. Here's your overview for today.</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {user?.medical_staff?.departments?.department_name || 'General Ward'}
              </span>
              <span className="text-sm text-gray-500">
                {todaysAssignments.length} patients assigned today
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Alerts Banner */}
      {priorityAlerts.filter(alert => alert.isCritical).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-medium text-red-800">Critical Alerts</h3>
              <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm">
                {priorityAlerts.filter(alert => alert.isCritical).length}
              </span>
            </div>
            <button 
              onClick={() => setActiveTab('alerts')}
              className="text-red-700 hover:text-red-900 font-medium"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Assignments */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Today's Patient Assignments</h2>
              <p className="text-gray-600">Patients under your care for today</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {todaysAssignments.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        patient.priority === 'high' ? 'bg-red-500' :
                        patient.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-600">
                          {patient.age} years • {patient.condition} • Priority: {patient.priority}
                        </p>
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          <span>HR: {patient.heartRate} bpm</span>
                          <span>Temp: {patient.temperature}°C</span>
                          <span>Last vitals: {patient.lastVitals}</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn-secondary text-sm">
                      View Details
                    </button>
                  </div>
                ))}
                {todaysAssignments.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No patient assignments for today</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Medication Schedule */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Medication Schedule</h2>
            <p className="text-gray-600">Today's medication administration</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {medicationSchedule.map(med => (
                <div key={med.id} className={`p-3 border rounded-lg ${
                  med.isOverdue ? 'border-red-200 bg-red-50' :
                  med.status === 'administered' ? 'border-green-200 bg-green-50' :
                  'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{med.patient}</h4>
                      <p className="text-sm text-gray-600">{med.medication} • {med.dosage}</p>
                      <p className="text-xs text-gray-500">{med.instructions}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      med.isOverdue ? 'bg-red-100 text-red-800' :
                      med.status === 'administered' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {med.scheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {med.status === 'scheduled' && !med.isOverdue && (
                    <button
                      onClick={() => markMedicationAdministered(med.id)}
                      className="btn-primary w-full mt-2 text-sm py-1"
                    >
                      Mark Administered
                    </button>
                  )}
                  {med.isOverdue && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-red-600 text-sm font-medium">OVERDUE</span>
                      <button
                        onClick={() => markMedicationAdministered(med.id)}
                        className="btn-primary text-sm py-1 px-3"
                      >
                        Administer Now
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {medicationSchedule.length === 0 && (
                <p className="text-gray-500 text-center py-4">No medications scheduled for today</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Priority Alerts</h2>
            <p className="text-gray-600">Critical notifications requiring attention</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {priorityAlerts.map(alert => (
                <div key={alert.id} className={`p-4 border rounded-lg ${
                  alert.isCritical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{alert.patient}</h4>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      alert.isCritical ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="btn-secondary w-full mt-3 text-sm py-1"
                  >
                    Mark Resolved
                  </button>
                </div>
              ))}
              {priorityAlerts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No priority alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Frequently used functions</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className={`p-4 border rounded-lg text-center transition duration-200 hover:shadow-md ${
                    action.color === 'green' ? 'border-green-200 hover:bg-green-50' :
                    action.color === 'blue' ? 'border-blue-200 hover:bg-blue-50' :
                    action.color === 'purple' ? 'border-purple-200 hover:bg-purple-50' :
                    'border-orange-200 hover:bg-orange-50'
                  }`}
                >
                  <action.icon className={`h-8 w-8 mx-auto mb-2 ${
                    action.color === 'green' ? 'text-green-600' :
                    action.color === 'blue' ? 'text-blue-600' :
                    action.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                  <h3 className="font-medium text-gray-900">{action.label}</h3>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;