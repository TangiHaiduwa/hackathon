// components/medical-records/MedicalRecordsPage.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  DocumentTextIcon,
  UserGroupIcon,
  HeartIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const MedicalRecordsPage = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patientRecords, setPatientRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newClinicalNote, setNewClinicalNote] = useState({
    title: '',
    content: '',
    type: 'progress_note'
  });

  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: false },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon, current: false },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon, current: false },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon, current: false },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon, current: true },
    { name: 'Patient Rounds', href: '/patient-rounds', icon: ClockIcon, current: false },
  ];

  const recordTypes = {
    all: { label: 'All Records', color: 'gray' },
    vital_signs: { label: 'Vital Signs', color: 'blue' },
    clinical_notes: { label: 'Clinical Notes', color: 'green' },
    medication: { label: 'Medication', color: 'purple' },
    lab_results: { label: 'Lab Results', color: 'orange' },
    imaging: { label: 'Imaging', color: 'pink' },
    nursing_notes: { label: 'Nursing Notes', color: 'indigo' }
  };

  const clinicalNoteTypes = [
    { value: 'progress_note', label: 'Progress Note' },
    { value: 'nursing_assessment', label: 'Nursing Assessment' },
    { value: 'shift_handover', label: 'Shift Handover' },
    { value: 'patient_education', label: 'Patient Education' },
    { value: 'incident_report', label: 'Incident Report' }
  ];

  useEffect(() => {
    fetchNurseData();
  }, [authUser]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientRecords();
    }
  }, [selectedPatient]);

  useEffect(() => {
    filterRecords();
  }, [patientRecords, searchTerm, recordTypeFilter, dateRange]);

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
              date_of_birth,
              medical_record_number
            )
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (error) throw error;

      const patientsList = data.map(item => ({
        id: item.patients.id,
        name: `${item.patients.users.first_name} ${item.patients.users.last_name}`,
        age: calculateAge(item.patients.users.date_of_birth),
        mrn: item.patients.users.medical_record_number,
        dateOfBirth: item.patients.users.date_of_birth
      }));

      setPatients(patientsList);
      
      if (patientsList.length > 0) {
        setSelectedPatient(patientsList[0].id);
      }

    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const loadPatientRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch various types of records in parallel
      const [
        vitalSignsData,
        clinicalNotesData,
        medicationData,
        labResultsData
      ] = await Promise.all([
        fetchVitalSigns(),
        fetchClinicalNotes(),
        fetchMedicationRecords(),
        fetchLabResults()
      ]);

      // Combine all records with their types
      const allRecords = [
        ...vitalSignsData.map(record => ({ ...record, record_type: 'vital_signs' })),
        ...clinicalNotesData.map(record => ({ ...record, record_type: 'clinical_notes' })),
        ...medicationData.map(record => ({ ...record, record_type: 'medication' })),
        ...labResultsData.map(record => ({ ...record, record_type: 'lab_results' }))
      ].sort((a, b) => new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || a.created_at));

      setPatientRecords(allRecords);

    } catch (error) {
      console.error('Error loading patient records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVitalSigns = async () => {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('patient_id', selectedPatient)
      .order('recorded_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  };

  const fetchClinicalNotes = async () => {
    const { data, error } = await supabase
      .from('clinical_notes')
      .select(`
        *,
        medical_staff!clinical_notes_created_by_fkey(
          users!inner(
            first_name,
            last_name
          )
        )
      `)
      .eq('patient_id', selectedPatient)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchMedicationRecords = async () => {
    const { data, error } = await supabase
      .from('drug_administration')
      .select(`
        *,
        prescription_items!inner(
          drugs!inner(
            drug_name,
            dosage
          )
        ),
        medical_staff!drug_administration_administered_by_fkey(
          users!inner(
            first_name,
            last_name
          )
        )
      `)
      .eq('patient_id', selectedPatient)
      .order('actual_time', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  };

  const fetchLabResults = async () => {
    const { data, error } = await supabase
      .from('lab_results')
      .select(`
        *,
        lab_tests!inner(
          test_name,
          normal_range
        )
      `)
      .eq('patient_id', selectedPatient)
      .order('result_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const filterRecords = () => {
    let filtered = patientRecords;

    // Filter by record type
    if (recordTypeFilter !== 'all') {
      filtered = filtered.filter(record => record.record_type === recordTypeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        if (record.record_type === 'vital_signs') {
          return 'heart_rate' in record && record.heart_rate?.toString().includes(term);
        }
        if (record.record_type === 'clinical_notes') {
          return record.title?.toLowerCase().includes(term) || 
                 record.content?.toLowerCase().includes(term);
        }
        if (record.record_type === 'medication') {
          return record.prescription_items?.drugs?.drug_name?.toLowerCase().includes(term);
        }
        if (record.record_type === 'lab_results') {
          return record.lab_tests?.test_name?.toLowerCase().includes(term);
        }
        return false;
      });
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at || record.created_at || record.actual_time);
        return recordDate >= new Date(dateRange.start);
      });
    }

    if (dateRange.end) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at || record.created_at || record.actual_time);
        recordDate.setHours(23, 59, 59);
        return recordDate <= new Date(dateRange.end);
      });
    }

    setFilteredRecords(filtered);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return today.getFullYear() - birthDate.getFullYear();
  };

  const formatRecordValue = (record) => {
    switch (record.record_type) {
      case 'vital_signs':
        return `HR: ${record.heart_rate || '--'} BPM, Temp: ${record.temperature || '--'}°C, BP: ${record.blood_pressure_systolic || '--'}/${record.blood_pressure_diastolic || '--'}`;
      
      case 'clinical_notes':
        return record.title;
      
      case 'medication':
        return `${record.prescription_items?.drugs?.drug_name} - ${record.prescription_items?.drugs?.dosage}`;
      
      case 'lab_results':
        return `${record.lab_tests?.test_name}: ${record.result_value} ${record.units}`;
      
      default:
        return 'Unknown record type';
    }
  };

  const getRecordIcon = (recordType) => {
    switch (recordType) {
      case 'vital_signs':
        return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
      case 'clinical_notes':
        return <DocumentTextIcon className="h-5 w-5 text-green-500" />;
      case 'medication':
        return <ClipboardDocumentListIcon className="h-5 w-5 text-purple-500" />;
      case 'lab_results':
        return <DocumentTextIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleAddClinicalNote = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('clinical_notes')
        .insert({
          patient_id: selectedPatient,
          title: newClinicalNote.title,
          content: newClinicalNote.content,
          note_type: newClinicalNote.type,
          created_by: authUser.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Reset form
      setNewClinicalNote({
        title: '',
        content: '',
        type: 'progress_note'
      });

      // Refresh records
      await loadPatientRecords();
      
      alert('Clinical note added successfully!');
    } catch (error) {
      console.error('Error adding clinical note:', error);
      alert('Error adding clinical note');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRecordTypeFilter('all');
    setDateRange({ start: '', end: '' });
  };

  const exportRecords = () => {
    const csvContent = [
      ['Date', 'Type', 'Details', 'Recorded By'],
      ...filteredRecords.map(record => [
        new Date(record.recorded_at || record.created_at || record.actual_time).toLocaleDateString(),
        recordTypes[record.record_type]?.label || 'Unknown',
        formatRecordValue(record),
        record.medical_staff?.users ? 
          `${record.medical_staff.users.first_name} ${record.medical_staff.users.last_name}` : 
          'System'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-records-${selectedPatient}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !patientRecords.length) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600">Access and manage patient medical records</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportRecords}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Selector */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <label htmlFor="patient-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Patient
            </label>
            <select
              id="patient-select"
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} (MRN: {patient.mrn}) - {patient.age} years
                </option>
              ))}
            </select>
          </div>

          {selectedPatientData && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <UserIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">{selectedPatientData.name}</h3>
                  <p className="text-sm text-blue-700">
                    MRN: {selectedPatientData.mrn} • DOB: {new Date(selectedPatientData.dateOfBirth).toLocaleDateString()} • {selectedPatientData.age} years
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Records Overview', icon: DocumentTextIcon },
              { id: 'add_note', name: 'Add Clinical Note', icon: PlusIcon },
              { id: 'vitals', name: 'Vital Signs', icon: ChartBarIcon },
              { id: 'medication', name: 'Medication', icon: ClipboardDocumentListIcon }
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
        {/* Records Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <select
                  value={recordTypeFilter}
                  onChange={(e) => setRecordTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(recordTypes).map(([key, type]) => (
                    <option key={key} value={key}>{type.label}</option>
                  ))}
                </select>

                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start date"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="End date"
                  />
                </div>

                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Records List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Medical Records ({filteredRecords.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <div 
                    key={`${record.record_type}-${record.id}`} 
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowRecordModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getRecordIcon(record.record_type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${recordTypes[record.record_type]?.color}-100 text-${recordTypes[record.record_type]?.color}-800`}>
                              {recordTypes[record.record_type]?.label}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(record.recorded_at || record.created_at || record.actual_time).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {formatRecordValue(record)}
                          </p>
                          {record.notes && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Clinical Note Tab */}
        {activeTab === 'add_note' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add Clinical Note</h3>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddClinicalNote} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note Type</label>
                    <select
                      value={newClinicalNote.type}
                      onChange={(e) => setNewClinicalNote({...newClinicalNote, type: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {clinicalNoteTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={newClinicalNote.title}
                      onChange={(e) => setNewClinicalNote({...newClinicalNote, title: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter note title..."
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <textarea
                    value={newClinicalNote.content}
                    onChange={(e) => setNewClinicalNote({...newClinicalNote, content: e.target.value})}
                    rows={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter clinical note content..."
                    required
                  />
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Save Clinical Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Vital Signs Tab */}
        {activeTab === 'vitals' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Vital Signs History</h3>
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
                      BP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temperature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      O2 Sat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Respiratory Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patientRecords
                    .filter(record => record.record_type === 'vital_signs')
                    .map((record, index) => (
                      <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.recorded_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.heart_rate || '--'} BPM
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.blood_pressure_systolic || '--'}/{record.blood_pressure_diastolic || '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.temperature || '--'}°C
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.oxygen_saturation || '--'}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.respiratory_rate || '--'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Medication Tab */}
        {activeTab === 'medication' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Medication Administration History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medication
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dosage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Administered By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patientRecords
                    .filter(record => record.record_type === 'medication')
                    .map((record, index) => (
                      <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.actual_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.prescription_items?.drugs?.drug_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.prescription_items?.drugs?.dosage}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'administered' 
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'missed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.medical_staff?.users ? 
                            `${record.medical_staff.users.first_name} ${record.medical_staff.users.last_name}` : 
                            'System'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {showRecordModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {recordTypes[selectedRecord.record_type]?.label}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedRecord.recorded_at || selectedRecord.created_at || selectedRecord.actual_time).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowRecordModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                {selectedRecord.record_type === 'vital_signs' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Heart Rate</label>
                      <p className="text-lg font-semibold">{selectedRecord.heart_rate || '--'} BPM</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Blood Pressure</label>
                      <p className="text-lg font-semibold">
                        {selectedRecord.blood_pressure_systolic || '--'}/{selectedRecord.blood_pressure_diastolic || '--'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Temperature</label>
                      <p className="text-lg font-semibold">{selectedRecord.temperature || '--'}°C</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">O2 Saturation</label>
                      <p className="text-lg font-semibold">{selectedRecord.oxygen_saturation || '--'}%</p>
                    </div>
                    {selectedRecord.notes && (
                      <div className="col-span-2 md:col-span-4">
                        <label className="text-sm font-medium text-gray-600">Notes</label>
                        <p className="text-sm">{selectedRecord.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedRecord.record_type === 'clinical_notes' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Title</label>
                      <p className="text-lg font-semibold">{selectedRecord.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Content</label>
                      <p className="text-sm whitespace-pre-wrap">{selectedRecord.content}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Note Type</label>
                      <p className="text-sm capitalize">{selectedRecord.note_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                )}

                {selectedRecord.record_type === 'medication' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Medication</label>
                      <p className="text-lg font-semibold">{selectedRecord.prescription_items?.drugs?.drug_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Dosage</label>
                      <p className="text-lg font-semibold">{selectedRecord.prescription_items?.drugs?.dosage}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="text-sm capitalize">{selectedRecord.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Administered By</label>
                      <p className="text-sm">
                        {selectedRecord.medical_staff?.users ? 
                          `${selectedRecord.medical_staff.users.first_name} ${selectedRecord.medical_staff.users.last_name}` : 
                          'System'}
                      </p>
                    </div>
                    {selectedRecord.notes && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-600">Notes</label>
                        <p className="text-sm">{selectedRecord.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MedicalRecordsPage;