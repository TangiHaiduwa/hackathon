// components/medication/MedicationAdministrationPage.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserGroupIcon,
  EyeIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/outline';

const Medication= () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [medicationSchedule, setMedicationSchedule] = useState([]);
  const [marData, setMarData] = useState([]);
  const [administeringMed, setAdministeringMed] = useState(null);
  const [missedReason, setMissedReason] = useState('');
  const [refusalReason, setRefusalReason] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon },
    { name: 'Patient Rounds', href: '/patient-rounds-page', icon: DocumentTextIcon },
  ];

  // Status options
  const statusOptions = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    administered: { label: 'Administered', color: 'bg-green-100 text-green-800' },
    missed: { label: 'Missed', color: 'bg-red-100 text-red-800' },
    refused: { label: 'Refused', color: 'bg-orange-100 text-orange-800' }
  };

  useEffect(() => {
    fetchNurseData();
  }, [authUser]);

  useEffect(() => {
    if (selectedDate) {
      loadMedicationData();
    }
  }, [selectedDate, selectedPatient]);

  const fetchNurseData = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      
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
      await loadAssignedPatients(authUser.id);

    } catch (error) {
      console.error('Error fetching nurse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedPatients = async (nurseId) => {
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

      const patientsList = data.map(item => ({
        id: item.patients.id,
        name: `${item.patients.users.first_name} ${item.patients.users.last_name}`,
        age: calculateAge(item.patients.users.date_of_birth)
      }));

      setPatients(patientsList);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const loadMedicationData = async () => {
    await Promise.all([
      fetchMedicationSchedule(),
      fetchMARData()
    ]);
  };

  const fetchMedicationSchedule = async () => {
    try {
      let query = supabase
        .from('medication_schedule')
        .select(`
          *,
          prescription_items!inner(
            dosage_instructions,
            drugs!inner(
              drug_name,
              dosage,
              form_id,
              drug_forms(form_name)
            ),
            prescriptions!inner(
              patient_id,
              patients!inner(
                users!inner(
                  first_name,
                  last_name
                )
              )
            )
          )
        `)
        .gte('scheduled_time', `${selectedDate}T00:00:00`)
        .lte('scheduled_time', `${selectedDate}T23:59:59`)
        .order('scheduled_time', { ascending: true });

      // Filter by patient if not "all"
      if (selectedPatient !== 'all') {
        query = query.eq('prescription_items.prescriptions.patient_id', selectedPatient);
      }

      const { data, error } = await query;

      if (error) throw error;

      const schedule = (data || []).map(med => ({
        id: med.id,
        patientId: med.prescription_items.prescriptions.patient_id,
        patientName: `${med.prescription_items.prescriptions.patients.users.first_name} ${med.prescription_items.prescriptions.patients.users.last_name}`,
        medication: med.prescription_items.drugs.drug_name,
        dosage: med.prescription_items.drugs.dosage,
        form: med.prescription_items.drugs.drug_forms?.form_name || 'Tablet',
        instructions: med.prescription_items.dosage_instructions,
        scheduledTime: new Date(med.scheduled_time),
        administeredTime: med.administered_time ? new Date(med.administered_time) : null,
        status: med.status,
        administeredBy: med.administered_by,
        notes: med.notes,
        isOverdue: med.status === 'scheduled' && new Date(med.scheduled_time) < new Date()
      }));

      setMedicationSchedule(schedule);
    } catch (error) {
      console.error('Error fetching medication schedule:', error);
    }
  };

  const fetchMARData = async () => {
    try {
      // Get the start of the week for MAR view (last 7 days)
      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate() - 6); // Last 7 days including today

      let query = supabase
        .from('medication_schedule')
        .select(`
          *,
          prescription_items!inner(
            drugs!inner(
              drug_name,
              dosage
            ),
            prescriptions!inner(
              patient_id,
              patients!inner(
                users!inner(
                  first_name,
                  last_name
                )
              )
            )
          )
        `)
        .gte('scheduled_time', startDate.toISOString().split('T')[0] + 'T00:00:00')
        .lte('scheduled_time', `${selectedDate}T23:59:59`)
        .order('scheduled_time', { ascending: true });

      if (selectedPatient !== 'all') {
        query = query.eq('prescription_items.prescriptions.patient_id', selectedPatient);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by patient and medication for MAR view
      const marGrouped = groupMARData(data || []);
      setMarData(marGrouped);
    } catch (error) {
      console.error('Error fetching MAR data:', error);
    }
  };

  const groupMARData = (data) => {
    const grouped = {};
    
    data.forEach(med => {
      const key = `${med.prescription_items.prescriptions.patient_id}-${med.prescription_items.drugs.drug_name}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          patientId: med.prescription_items.prescriptions.patient_id,
          patientName: `${med.prescription_items.prescriptions.patients.users.first_name} ${med.prescription_items.prescriptions.patients.users.last_name}`,
          medication: med.prescription_items.drugs.drug_name,
          dosage: med.prescription_items.drugs.dosage,
          administrations: {}
        };
      }

      const dateKey = med.scheduled_time.split('T')[0];
      grouped[key].administrations[dateKey] = {
        status: med.status,
        scheduledTime: med.scheduled_time,
        administeredTime: med.administered_time,
        notes: med.notes
      };
    });

    return Object.values(grouped);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return today.getFullYear() - birthDate.getFullYear();
  };

  const handleAdminister = async (medicationId, status = 'administered', notes = '') => {
    try {
      const updateData = {
        status: status,
        notes: notes,
        administered_by: authUser.id
      };

      if (status === 'administered') {
        updateData.administered_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('medication_schedule')
        .update(updateData)
        .eq('id', medicationId);

      if (error) throw error;

      // Also record in drug_administration table for comprehensive tracking
      if (status === 'administered') {
        const med = medicationSchedule.find(m => m.id === medicationId);
        await supabase
          .from('drug_administration')
          .insert({
            prescription_item_id: medicationId, // This should be the actual prescription_item_id
            patient_id: med.patientId,
            administered_by: authUser.id,
            scheduled_time: med.scheduledTime.toISOString(),
            actual_time: new Date().toISOString(),
            dosage_administered: med.dosage,
            status: 'administered',
            notes: notes
          });
      }

      setAdministeringMed(null);
      setMissedReason('');
      setRefusalReason('');
      await loadMedicationData();

    } catch (error) {
      console.error('Error updating medication status:', error);
      alert('Error updating medication status');
    }
  };

  const getTimeSlots = () => {
    return [
      '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
    ];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'administered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'missed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'refused':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getDatesForMAR = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
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

  const marDates = getDatesForMAR();

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medication Administration</h1>
            <p className="text-gray-600">Manage medication schedules and administration records</p>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="date-select" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Patient Selector and Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Patient
            </label>
            <select
              id="patient-select"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} ({patient.age} years)
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1"></div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            {[
              { id: 'schedule', name: 'Today\'s Schedule', icon: ClipboardDocumentListIcon },
              { id: 'mar', name: 'MAR View', icon: DocumentTextIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Today's Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {medicationSchedule.length}
                    </p>
                  </div>
                  <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Administered</p>
                    <p className="text-2xl font-bold text-green-600">
                      {medicationSchedule.filter(m => m.status === 'administered').length}
                    </p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {medicationSchedule.filter(m => m.status === 'scheduled').length}
                    </p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-orange-500" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">
                      {medicationSchedule.filter(m => m.isOverdue).length}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </div>

            {/* Medication Schedule */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Medication Schedule for {new Date(selectedDate).toLocaleDateString()}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medication
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dosage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Instructions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {medicationSchedule.map((med) => (
                      <tr key={med.id} className={med.isOverdue ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {med.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {med.isOverdue && (
                            <div className="text-xs text-red-600 font-medium">OVERDUE</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{med.patientName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{med.medication}</div>
                          <div className="text-xs text-gray-500">{med.form}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {med.dosage}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {med.instructions}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusOptions[med.status]?.color}`}>
                            {getStatusIcon(med.status)}
                            <span className="ml-1">{statusOptions[med.status]?.label}</span>
                          </span>
                          {med.administeredTime && (
                            <div className="text-xs text-gray-500 mt-1">
                              {med.administeredTime.toLocaleTimeString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {med.status === 'scheduled' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAdminister(med.id, 'administered')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Administer
                              </button>
                              <button
                                onClick={() => setAdministeringMed({...med, action: 'missed'})}
                                className="text-red-600 hover:text-red-900"
                              >
                                Missed
                              </button>
                              <button
                                onClick={() => setAdministeringMed({...med, action: 'refused'})}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Refused
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {medicationSchedule.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No medications scheduled for this date
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAR View Tab */}
        {activeTab === 'mar' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Medication Administration Record (MAR) - Last 7 Days
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Patient & Medication
                    </th>
                    {marDates.map(date => (
                      <th key={date} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {marData.map((item) => (
                    <tr key={`${item.patientId}-${item.medication}`}>
                      <td className="px-6 py-4 border-b">
                        <div className="font-medium text-gray-900">{item.patientName}</div>
                        <div className="text-sm text-gray-600">{item.medication}</div>
                        <div className="text-xs text-gray-500">{item.dosage}</div>
                      </td>
                      {marDates.map(date => {
                        const administration = item.administrations[date];
                        return (
                          <td key={date} className="px-4 py-4 text-center border-b">
                            {administration ? (
                              <div className="flex flex-col items-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  statusOptions[administration.status]?.color || 'bg-gray-100 text-gray-800'
                                }`}>
                                  {getStatusIcon(administration.status)}
                                </span>
                                {administration.administeredTime && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(administration.administeredTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {marData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No medication administration records found
                </div>
              )}
            </div>

            {/* MAR Legend */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-medium">Legend:</span>
                {Object.entries(statusOptions).map(([key, option]) => (
                  <span key={key} className="flex items-center space-x-1">
                    {getStatusIcon(key)}
                    <span>{option.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals for Missed/Refused Medications */}
      {administeringMed && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {administeringMed.action === 'missed' ? 'Document Missed Dose' : 'Document Patient Refusal'}
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-medium">{administeringMed.patientName}</p>
                <p className="text-sm text-gray-600">{administeringMed.medication} • {administeringMed.dosage}</p>
                <p className="text-xs text-gray-500">Scheduled: {administeringMed.scheduledTime.toLocaleString()}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason {administeringMed.action === 'missed' ? 'for Missed Dose' : 'for Refusal'}
                </label>
                <textarea
                  value={administeringMed.action === 'missed' ? missedReason : refusalReason}
                  onChange={(e) => administeringMed.action === 'missed' ? setMissedReason(e.target.value) : setRefusalReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter reason for ${administeringMed.action}...`}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setAdministeringMed(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAdminister(
                    administeringMed.id, 
                    administeringMed.action,
                    administeringMed.action === 'missed' ? missedReason : refusalReason
                  )}
                  className={`px-4 py-2 text-white rounded-md ${
                    administeringMed.action === 'missed' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  Confirm {administeringMed.action === 'missed' ? 'Missed Dose' : 'Refusal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Medication;