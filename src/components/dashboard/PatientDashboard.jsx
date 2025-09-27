import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  HomeIcon,
  UserCircleIcon,
  CalendarIcon,
  HeartIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArchiveBoxIcon,
  BellAlertIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const PatientDashboard = () => {
  const [user, setUser] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentDiagnoses, setRecentDiagnoses] = useState([]);
  const [currentMedications, setCurrentMedications] = useState([]);
  const [recentVitals, setRecentVitals] = useState(null);
  const [healthAlerts, setHealthAlerts] = useState([]);
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    activeDiagnoses: 0,
    currentMedications: 0,
    pendingActions: 0
  });
  const [loading, setLoading] = useState(true);
  const { user: authUser, signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'My Appointments', href: '/appointment', icon: CalendarIcon, current: true },
    { name: 'Medical Records', href: '/patient-medical-records', icon: EyeIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: MagnifyingGlassIcon },
  ];

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        
        // 1. Fetch user profile with role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone_number,
            date_of_birth,
            address,
            created_at,
            roles (role_name)
          `)
          .eq('id', authUser.id)
          .single();

        if (userError) throw userError;
        setUser({
          ...userData,
          role: userData.roles?.role_name || 'patient'
        });

        // 2. Fetch upcoming appointments (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            reason,
            appointment_statuses!inner(
              status_code,
              status_name
            ),
            medical_staff (
              users (first_name, last_name),
              specializations (specialization_name)
            )
          `)
          .eq('patient_id', authUser.id)
          .in('appointment_statuses.status_code', ['pending', 'confirmed', 'checked_in', 'in_progress'])
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .lte('appointment_date', nextWeek.toISOString().split('T')[0])
          .order('appointment_date', { ascending: true })
          .limit(5);

        if (!appointmentsError) {
          setUpcomingAppointments(appointments || []);
        }

        // 3. Fetch recent diagnoses (last 3)
        const { data: diagnoses, error: diagnosesError } = await supabase
          .from('medical_diagnoses')
          .select(`
            id,
            diagnosis_date,
            severity,
            notes,
            diseases (disease_name),
            diagnosis_statuses (status_name)
          `)
          .eq('patient_id', authUser.id)
          .order('diagnosis_date', { ascending: false })
          .limit(3);

        if (!diagnosesError) {
          setRecentDiagnoses(diagnoses || []);
        }

        // 4. Fetch current active medications
        const { data: medications, error: medsError } = await supabase
          .from('prescriptions')
          .select(`
            id,
            prescription_date,
            prescription_statuses (status_name),
            prescription_items (
              id,
              dosage_instructions,
              duration_days,
              drugs (drug_name)
            )
          `)
          .eq('patient_id', authUser.id)
          .eq('prescription_statuses.status_code', 'active')
          .limit(4);

        if (!medsError) {
          setCurrentMedications(medications || []);
        }

        // 5. Fetch most recent vital signs - FIXED: Remove .single() and handle empty results
        const { data: vitals, error: vitalsError } = await supabase
          .from('vital_signs')
          .select(`
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            temperature,
            oxygen_saturation,
            recorded_at
          `)
          .eq('patient_id', authUser.id)
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (!vitalsError && vitals && vitals.length > 0) {
          setRecentVitals(vitals[0]); // Take the first record if exists
        } else {
          console.log('No vital signs found for patient');
          setRecentVitals(null);
        }

        // 6. Fetch health alerts
        const { data: alerts, error: alertsError } = await supabase
          .from('patient_alerts')
          .select(`
            id,
            title,
            message,
            created_at,
            alert_types (type_name, severity)
          `)
          .eq('patient_id', authUser.id)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!alertsError) {
          setHealthAlerts(alerts || []);
        }

        // Calculate final stats
        setStats({
          upcomingAppointments: appointments?.length || 0,
          activeDiagnoses: diagnoses?.length || 0,
          currentMedications: medications?.length || 0,
          pendingActions: (appointments?.length || 0) + (alerts?.length || 0)
        });

      } catch (error) {
        console.error('Error fetching patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [authUser]);

  // Format appointments for display
  const formatAppointments = (appointments) => {
    return appointments.map(apt => ({
      id: apt.id,
      doctor: apt.medical_staff?.users ? 
        `${apt.medical_staff.users.first_name} ${apt.medical_staff.users.last_name}` : 'Doctor',
      specialization: apt.medical_staff?.specializations?.specialization_name || 'General',
      date: new Date(apt.appointment_date).toLocaleDateString(),
      time: apt.appointment_time,
      status: apt.appointment_statuses?.status_name || 'Scheduled'
    }));
  };

  // Format diagnoses for display
  const formatDiagnoses = (diagnoses) => {
    return diagnoses.map(diag => ({
      id: diag.id,
      condition: diag.diseases?.disease_name || 'Medical Condition',
      date: new Date(diag.diagnosis_date).toLocaleDateString(),
      status: diag.diagnosis_statuses?.status_name || 'Confirmed',
      severity: diag.severity || 'Moderate'
    }));
  };

  // Format medications for display
  const formatMedications = (medications) => {
    const meds = [];
    medications.forEach(prescription => {
      prescription.prescription_items?.forEach(item => {
        meds.push({
          id: item.id,
          name: item.drugs?.drug_name || 'Medication',
          dosage: item.dosage_instructions,
          duration: item.duration_days ? `${item.duration_days} days` : 'Ongoing'
        });
      });
    });
    return meds.slice(0, 3);
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load user data.</p>
          <button
            onClick={signOut}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign Out
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {location.state?.message && (
        <div className={`mb-6 p-4 rounded-lg ${
          location.state.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          location.state.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {location.state.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Patient'}! Here's your health overview.
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Member since {new Date(user.created_at).toLocaleDateString()}
        </div>
      </div>

      {healthAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <BellAlertIcon className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Health Alerts</h3>
          </div>
          {healthAlerts.map(alert => (
            <div key={alert.id} className="text-red-700 text-sm mb-1">
              • {alert.title}: {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.upcomingAppointments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HeartIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Diagnoses</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeDiagnoses}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArchiveBoxIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Medications</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.currentMedications}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Actions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingActions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/appointment" 
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Book Appointment
          </Link>
          <Link 
            to="/diagnosis" 
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition duration-200 flex items-center justify-center"
          >
            <HeartIcon className="h-5 w-5 mr-2" />
            Symptom Checker
          </Link>
          <Link 
            to="/patient-medical-records" 
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center"
          >
            <UserCircleIcon className="h-5 w-5 mr-2" />
            Medical Records
          </Link>
          <Link 
            to="/pharmacy" 
            className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition duration-200 flex items-center justify-center"
          >
            <BuildingLibraryIcon className="h-5 w-5 mr-2" />
            Pharmacy
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
            <Link to="/appointment" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
              View All <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="p-6">
            {upcomingAppointments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {formatAppointments(upcomingAppointments).map((appointment) => (
                  <li key={appointment.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{appointment.doctor}</p>
                        <p className="text-sm text-gray-500">{appointment.specialization}</p>
                        <p className="text-sm text-gray-500">{appointment.date} at {appointment.time}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Details
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming appointments</p>
                <Link to="/appointment" className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                  Book your first appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Diagnoses</h3>
            <Link to="/patient-medical-records" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
              View All <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="p-6">
            {recentDiagnoses.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {formatDiagnoses(recentDiagnoses).map((diagnosis) => (
                  <li key={diagnosis.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{diagnosis.condition}</p>
                        <p className="text-sm text-gray-500">Diagnosed on {diagnosis.date}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            diagnosis.status === 'Confirmed' ? 'bg-red-100 text-red-800' :
                            diagnosis.status === 'Treated' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {diagnosis.status}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {diagnosis.severity}
                          </span>
                        </div>
                      </div>
                      {diagnosis.status === 'Confirmed' && (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <HeartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent diagnoses</p>
                <Link to="/diagnosis" className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                  Start symptom checker
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Current Medications</h3>
            <Link to="" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
              View All <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="p-6">
            {currentMedications.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {formatMedications(currentMedications).map((med, index) => (
                  <li key={index} className="py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.dosage}</p>
                      <p className="text-xs text-gray-400">Duration: {med.duration}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <ArchiveBoxIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No current medications</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Vital Signs</h3>
          </div>
          <div className="p-6">
            {recentVitals ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Blood Pressure</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {recentVitals.blood_pressure_systolic}/{recentVitals.blood_pressure_diastolic} mmHg
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Heart Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {recentVitals.heart_rate} BPM
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Temperature</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {recentVitals.temperature}°C
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Oxygen</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {recentVitals.oxygen_saturation}%
                  </p>
                </div>
                <div className="col-span-2 text-xs text-gray-500 mt-2">
                  Last recorded: {new Date(recentVitals.recorded_at).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <HeartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent vital signs recorded</p>
                <p className="text-gray-400 text-sm mt-1">Vital signs will appear here after your next check-up</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Health Tip of the Day</h3>
        <p className="text-blue-800">
          Remember to stay hydrated and maintain a balanced diet to support your immune system. 
          If you experience persistent symptoms like fever, headache, or abdominal pain, 
          use our symptom checker or consult with your healthcare provider.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;