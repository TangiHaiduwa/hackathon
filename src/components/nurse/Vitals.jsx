// components/vitals/VitalSignsPage.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ChartBarIcon,
  PlusIcon,
  ClockIcon,
  BellIcon,
  CalendarIcon,
  UserGroupIcon,
  HeartIcon,
  // ThermometerIcon,
  SunIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';

const Vitals = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [vitalSigns, setVitalSigns] = useState([]);
  const [monitoringSchedules, setMonitoringSchedules] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // New vital signs form state
  const [newVitals, setNewVitals] = useState({
    patient_id: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    notes: ''
  });

  // Monitoring schedule form state
  const [newSchedule, setNewSchedule] = useState({
    patient_id: '',
    frequency: '4h', // 1h, 2h, 4h, 6h, 8h, 12h, 24h
    parameters: ['heart_rate', 'temperature'], // Track which vitals to monitor
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });

  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon },
    { name: 'Patient Rounds', href: '/patient-rounds-page', icon: DocumentTextIcon },

  ];

  useEffect(() => {
    fetchNurseData();
  }, [authUser]);

  const fetchNurseData = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      
      // Get nurse profile
      const { data: nurseData } = await supabase
        .from('users')
        .select(`
          *,
          medical_staff!inner(
            *,
            departments(*)
          )
        `)
        .eq('id', authUser.id)
        .single();

      setUser(nurseData);

      // Fetch assigned patients
      const patientsData = await fetchAssignedPatients(authUser.id);
      setPatients(patientsData);

      if (patientsData.length > 0) {
        setSelectedPatient(patientsData[0].id);
        // Load initial data for first patient
        await loadPatientData(patientsData[0].id);
      }

    } catch (error) {
      console.error('Error fetching nurse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedPatients = async (nurseId) => {
    try {
      const { data, error } = await supabase
        .from('nurse_patient_assignments')
        .select(`
          patient_id,
          patients!inner(
            id,
            users!inner(
              first_name,
              last_name,
              date_of_birth
            )
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (error) throw error;

      return data.map(item => ({
        id: item.patients.id,
        name: `${item.patients.users.first_name} ${item.patients.users.last_name}`,
        age: calculateAge(item.patients.users.date_of_birth)
      }));
    } catch (error) {
      console.error('Error fetching patients:', error);
      return [];
    }
  };

  const loadPatientData = async (patientId) => {
    await Promise.all([
      fetchVitalSignsHistory(patientId),
      fetchMonitoringSchedules(patientId),
      fetchVitalAlerts(patientId)
    ]);
  };

  const fetchVitalSignsHistory = async (patientId) => {
    try {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVitalSigns(data || []);
    } catch (error) {
      console.error('Error fetching vital signs:', error);
    }
  };

  const fetchMonitoringSchedules = async (patientId) => {
    try {
      const { data, error } = await supabase
        .from('vital_signs_monitoring') // You'll need to create this table
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true);

      if (error) throw error;
      setMonitoringSchedules(data || []);
    } catch (error) {
      console.error('Error fetching monitoring schedules:', error);
    }
  };

  const fetchVitalAlerts = async (patientId) => {
    try {
      const { data, error } = await supabase
        .from('patient_alerts')
        .select(`
          *,
          alert_types(*)
        `)
        .eq('patient_id', patientId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return today.getFullYear() - birthDate.getFullYear();
  };

  const handlePatientChange = (patientId) => {
    setSelectedPatient(patientId);
    loadPatientData(patientId);
  };

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('vital_signs')
        .insert({
          ...newVitals,
          patient_id: selectedPatient,
          taken_by: authUser.id,
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;

      // Check for abnormal readings and create alerts
      await checkForAbnormalReadings(newVitals, selectedPatient);

      // Reset form
      setNewVitals({
        patient_id: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        heart_rate: '',
        temperature: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        notes: ''
      });

      // Refresh data
      await loadPatientData(selectedPatient);
      
      alert('Vital signs recorded successfully!');
    } catch (error) {
      console.error('Error recording vital signs:', error);
      alert('Error recording vital signs');
    }
  };

  const checkForAbnormalReadings = async (vitals, patientId) => {
    const abnormalConditions = [];

    // Check heart rate (normal: 60-100 bpm)
    if (vitals.heart_rate && (vitals.heart_rate < 60 || vitals.heart_rate > 100)) {
      abnormalConditions.push(`Heart rate ${vitals.heart_rate} BPM`);
    }

    // Check temperature (normal: 36.1-37.2°C)
    if (vitals.temperature && (vitals.temperature < 36.1 || vitals.temperature > 37.2)) {
      abnormalConditions.push(`Temperature ${vitals.temperature}°C`);
    }

    // Check blood pressure (normal: systolic < 120, diastolic < 80)
    if (vitals.blood_pressure_systolic && vitals.blood_pressure_systolic > 120) {
      abnormalConditions.push(`High systolic BP: ${vitals.blood_pressure_systolic}`);
    }
    if (vitals.blood_pressure_diastolic && vitals.blood_pressure_diastolic > 80) {
      abnormalConditions.push(`High diastolic BP: ${vitals.blood_pressure_diastolic}`);
    }

    // Check oxygen saturation (normal: > 95%)
    if (vitals.oxygen_saturation && vitals.oxygen_saturation < 95) {
      abnormalConditions.push(`Low O2 saturation: ${vitals.oxygen_saturation}%`);
    }

    if (abnormalConditions.length > 0) {
      // Create alert for abnormal readings
      await supabase
        .from('patient_alerts')
        .insert({
          patient_id: patientId,
          alert_type_id: await getAlertTypeId('abnormal_vitals'),
          title: 'Abnormal Vital Signs',
          message: `Abnormal readings detected: ${abnormalConditions.join(', ')}`,
          vital_sign_id: null, // You might want to link to the actual vital sign record
          is_resolved: false
        });
    }
  };

  const getAlertTypeId = async (typeCode) => {
    // This would fetch the appropriate alert type ID from your database
    // For now, return a placeholder
    return 'critical_vitals'; // You'll need to set this up in your alert_types table
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('vital_signs_monitoring')
        .insert({
          ...newSchedule,
          patient_id: selectedPatient,
          created_by: authUser.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Reset form
      setNewSchedule({
        patient_id: '',
        frequency: '4h',
        parameters: ['heart_rate', 'temperature'],
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true
      });

      // Refresh schedules
      await fetchMonitoringSchedules(selectedPatient);
      
      alert('Monitoring schedule created successfully!');
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating monitoring schedule');
    }
  };

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
      await fetchVitalAlerts(selectedPatient);
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error resolving alert');
    }
  };

  // Chart data preparation for trends
  const prepareChartData = () => {
    const last7Days = vitalSigns.slice(0, 7).reverse();
    
    return {
      labels: last7Days.map(v => new Date(v.recorded_at).toLocaleDateString()),
      heartRate: last7Days.map(v => v.heart_rate),
      temperature: last7Days.map(v => v.temperature),
      systolic: last7Days.map(v => v.blood_pressure_systolic),
      diastolic: last7Days.map(v => v.blood_pressure_diastolic),
      oxygen: last7Days.map(v => v.oxygen_saturation)
    };
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

  const chartData = prepareChartData();

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vital Signs Management</h1>
            <p className="text-gray-600">Monitor and track patient vital signs</p>
          </div>
        </div>
      </div>

      {/* Patient Selector */}
      <div className="mb-6">
        <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Patient
        </label>
        <select
          id="patient-select"
          value={selectedPatient}
          onChange={(e) => handlePatientChange(e.target.value)}
          className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {patients.map(patient => (
            <option key={patient.id} value={patient.id}>
              {patient.name} ({patient.age} years)
            </option>
          ))}
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'history', name: 'History & Trends', icon: ChartBarIcon },
              { id: 'record', name: 'Record Vitals', icon: PlusIcon },
              { id: 'monitoring', name: 'Monitoring', icon: ClockIcon },
              { id: 'alerts', name: 'Alerts', icon: BellIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* History & Trends Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {vitalSigns[0] && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Heart Rate</p>
                        <p className="text-2xl font-bold">
                          {vitalSigns[0].heart_rate || '--'} <span className="text-sm font-normal">BPM</span>
                        </p>
                      </div>
                      <HeartIcon className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Temperature</p>
                        <p className="text-2xl font-bold">
                          {vitalSigns[0].temperature || '--'} <span className="text-sm font-normal">°C</span>
                        </p>
                      </div>
                      <SunIcon className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Blood Pressure</p>
                        <p className="text-2xl font-bold">
                          {vitalSigns[0].blood_pressure_systolic || '--'}/{vitalSigns[0].blood_pressure_diastolic || '--'}
                        </p>
                      </div>
                      <ChartBarSquareIcon className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">O2 Sat</p>
                        <p className="text-2xl font-bold">
                          {vitalSigns[0].oxygen_saturation || '--'} <span className="text-sm font-normal">%</span>
                        </p>
                      </div>
                      <ChartBarIcon className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Recent Readings Table */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Vital Signs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heart Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Temp (°C)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        BP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O2 Sat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resp. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vitalSigns.map((vital, index) => (
                      <tr key={vital.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(vital.recorded_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.heart_rate || '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.temperature || '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.blood_pressure_systolic || '--'}/{vital.blood_pressure_diastolic || '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.oxygen_saturation || '--'}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.respiratory_rate || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Record Vitals Tab */}
        {activeTab === 'record' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Record New Vital Signs</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleVitalsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Heart Rate (BPM)</label>
                    <input
                      type="number"
                      value={newVitals.heart_rate}
                      onChange={(e) => setNewVitals({...newVitals, heart_rate: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 72"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newVitals.temperature}
                      onChange={(e) => setNewVitals({...newVitals, temperature: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 36.6"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Systolic BP</label>
                    <input
                      type="number"
                      value={newVitals.blood_pressure_systolic}
                      onChange={(e) => setNewVitals({...newVitals, blood_pressure_systolic: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Diastolic BP</label>
                    <input
                      type="number"
                      value={newVitals.blood_pressure_diastolic}
                      onChange={(e) => setNewVitals({...newVitals, blood_pressure_diastolic: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 80"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Oxygen Saturation (%)</label>
                    <input
                      type="number"
                      value={newVitals.oxygen_saturation}
                      onChange={(e) => setNewVitals({...newVitals, oxygen_saturation: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 98"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Respiratory Rate</label>
                    <input
                      type="number"
                      value={newVitals.respiratory_rate}
                      onChange={(e) => setNewVitals({...newVitals, respiratory_rate: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="e.g., 16"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={newVitals.notes}
                    onChange={(e) => setNewVitals({...newVitals, notes: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Additional notes or observations..."
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Record Vital Signs
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {/* Current Schedules */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Active Monitoring Schedules</h3>
              </div>
              <div className="p-6">
                {monitoringSchedules.length > 0 ? (
                  <div className="space-y-4">
                    {monitoringSchedules.map(schedule => (
                      <div key={schedule.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">Every {schedule.frequency}</h4>
                            <p className="text-sm text-gray-600">
                              Monitoring: {schedule.parameters.join(', ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              Started: {new Date(schedule.start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No active monitoring schedules</p>
                )}
              </div>
            </div>

            {/* Create New Schedule */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Create Monitoring Schedule</h3>
              </div>
              <div className="p-6">
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Frequency</label>
                      <select
                        value={newSchedule.frequency}
                        onChange={(e) => setNewSchedule({...newSchedule, frequency: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="1h">Every Hour</option>
                        <option value="2h">Every 2 Hours</option>
                        <option value="4h">Every 4 Hours</option>
                        <option value="6h">Every 6 Hours</option>
                        <option value="8h">Every 8 Hours</option>
                        <option value="12h">Every 12 Hours</option>
                        <option value="24h">Every 24 Hours</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
                      <input
                        type="date"
                        value={newSchedule.end_date}
                        onChange={(e) => setNewSchedule({...newSchedule, end_date: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parameters to Monitor</label>
                    <div className="space-y-2">
                      {[
                        { id: 'heart_rate', label: 'Heart Rate' },
                        { id: 'temperature', label: 'Temperature' },
                        { id: 'blood_pressure', label: 'Blood Pressure' },
                        { id: 'oxygen_saturation', label: 'Oxygen Saturation' },
                        { id: 'respiratory_rate', label: 'Respiratory Rate' }
                      ].map(param => (
                        <label key={param.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newSchedule.parameters.includes(param.id)}
                            onChange={(e) => {
                              const updatedParams = e.target.checked
                                ? [...newSchedule.parameters, param.id]
                                : newSchedule.parameters.filter(p => p !== param.id);
                              setNewSchedule({...newSchedule, parameters: updatedParams});
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{param.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      Create Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Vital Signs Alerts</h3>
            </div>
            <div className="p-6">
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <div key={alert.id} className={`border-l-4 p-4 rounded ${
                      alert.alert_types?.severity === 'critical' 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-yellow-400 bg-yellow-50'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{alert.title}</h4>
                          <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="btn-secondary text-sm"
                        >
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No active alerts</p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Vitals;