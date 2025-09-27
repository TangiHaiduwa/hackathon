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
  XMarkIcon,
  BeakerIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon
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
  const [expertSystemData, setExpertSystemData] = useState({});
  const [malariaTyphoidStats, setMalariaTyphoidStats] = useState({});

  // MESMTF Competition Features
  const malariaTyphoidDrugs = {
    malaria: ['Artemisinin-based Combination Therapy (ACT)', 'Chloroquine', 'Quinine', 'Primaquine'],
    typhoid: ['Ciprofloxacin', 'Azithromycin', 'Ceftriaxone', 'Amoxicillin'],
    combined: ['ACT + Ciprofloxacin', 'ACT + Azithromycin', 'Quinine + Ceftriaxone']
  };

  const symptomSeverity = {
    very_strong: { label: 'Very Strong Signs (VSs)', color: 'bg-red-100 text-red-800', requiresXray: true },
    strong: { label: 'Strong Signs (Ss)', color: 'bg-orange-100 text-orange-800', requiresXray: false },
    weak: { label: 'Weak Signs (Ws)', color: 'bg-yellow-100 text-yellow-800', requiresXray: false },
    very_weak: { label: 'Very Weak Signs (VWs)', color: 'bg-blue-100 text-blue-800', requiresXray: false }
  };

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
    nursing_notes: { label: 'Nursing Notes', color: 'indigo' },
    diagnosis: { label: 'Diagnosis', color: 'red' },
    expert_system: { label: 'Expert System', color: 'purple' }
  };

  const clinicalNoteTypes = [
    { value: 'progress_note', label: 'Progress Note' },
    { value: 'nursing_assessment', label: 'Nursing Assessment' },
    { value: 'shift_handover', label: 'Shift Handover' },
    { value: 'patient_education', label: 'Patient Education' },
    { value: 'incident_report', label: 'Incident Report' },
    { value: 'malaria_typhoid_followup', label: 'Malaria/Typhoid Follow-up' }
  ];

  useEffect(() => {
    fetchNurseData();
  }, [authUser]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientRecords();
      loadExpertSystemData(selectedPatient);
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

  const loadExpertSystemData = async (patientId) => {
    try {
      // Get diagnosis sessions
      const { data: diagnosisSessions, error } = await supabase
        .from('diagnosis_sessions')
        .select(`
          *,
          diagnosis_session_symptoms(
            symptoms(*)
          ),
          medical_diagnoses(
            diseases(disease_name),
            severity,
            diagnosis_date
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (diagnosisSessions && diagnosisSessions.length > 0) {
        const latestSession = diagnosisSessions[0];
        setExpertSystemData(prev => ({
          ...prev,
          [patientId]: {
            malariaProbability: latestSession.malaria_probability,
            typhoidProbability: latestSession.typhoid_probability,
            requiresChestXray: latestSession.requires_chest_xray,
            recommendation: latestSession.recommendation,
            symptoms: latestSession.diagnosis_session_symptoms?.map(dss => dss.symptoms) || [],
            diagnoses: latestSession.medical_diagnoses || []
          }
        }));

        // Calculate stats
        calculateMalariaTyphoidStats(diagnosisSessions);
      }
    } catch (error) {
      console.error('Error loading expert system data:', error);
    }
  };

  const calculateMalariaTyphoidStats = (diagnosisSessions) => {
    const stats = {
      malariaCases: 0,
      typhoidCases: 0,
      coInfections: 0,
      chestXraysRequired: 0,
      totalSessions: diagnosisSessions.length
    };

    diagnosisSessions.forEach(session => {
      if (session.malaria_probability > 60) stats.malariaCases++;
      if (session.typhoid_probability > 60) stats.typhoidCases++;
      if (session.malaria_probability > 60 && session.typhoid_probability > 60) stats.coInfections++;
      if (session.requires_chest_xray) stats.chestXraysRequired++;
    });

    setMalariaTyphoidStats(stats);
  };

  const loadPatientRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch various types of records in parallel
      const [
        vitalSignsData,
        clinicalNotesData,
        medicationData,
        labResultsData,
        diagnosisData,
        expertSystemData
      ] = await Promise.all([
        fetchVitalSigns(),
        fetchClinicalNotes(),
        fetchMedicationRecords(),
        fetchLabResults(),
        fetchDiagnosisData(),
        fetchExpertSystemRecords()
      ]);

      // Combine all records with their types
      const allRecords = [
        ...vitalSignsData.map(record => ({ ...record, record_type: 'vital_signs' })),
        ...clinicalNotesData.map(record => ({ ...record, record_type: 'clinical_notes' })),
        ...medicationData.map(record => ({ ...record, record_type: 'medication' })),
        ...labResultsData.map(record => ({ ...record, record_type: 'lab_results' })),
        ...diagnosisData.map(record => ({ ...record, record_type: 'diagnosis' })),
        ...expertSystemData.map(record => ({ ...record, record_type: 'expert_system' }))
      ].sort((a, b) => new Date(b.recorded_at || b.created_at || b.actual_time) - new Date(a.recorded_at || a.created_at || a.actual_time));

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
            dosage,
            generic_name
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

  const fetchDiagnosisData = async () => {
    const { data, error } = await supabase
      .from('medical_diagnoses')
      .select(`
        *,
        diseases!inner(
          disease_name,
          icd_code
        ),
        medical_staff!medical_diagnoses_doctor_id_fkey(
          users!inner(
            first_name,
            last_name
          )
        )
      `)
      .eq('patient_id', selectedPatient)
      .order('diagnosis_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchExpertSystemRecords = async () => {
    const { data, error } = await supabase
      .from('diagnosis_sessions')
      .select(`
        *,
        diagnosis_session_symptoms(
          symptoms(*)
        )
      `)
      .eq('patient_id', selectedPatient)
      .order('created_at', { ascending: false });

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
          return record.prescription_items?.drugs?.drug_name?.toLowerCase().includes(term) ||
                 record.prescription_items?.drugs?.generic_name?.toLowerCase().includes(term);
        }
        if (record.record_type === 'lab_results') {
          return record.lab_tests?.test_name?.toLowerCase().includes(term);
        }
        if (record.record_type === 'diagnosis') {
          return record.diseases?.disease_name?.toLowerCase().includes(term);
        }
        if (record.record_type === 'expert_system') {
          return record.recommendation?.toLowerCase().includes(term);
        }
        return false;
      });
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at || record.created_at || record.actual_time || record.diagnosis_date);
        return recordDate >= new Date(dateRange.start);
      });
    }

    if (dateRange.end) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.recorded_at || record.created_at || record.actual_time || record.diagnosis_date);
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
      
      case 'diagnosis':
        return `${record.diseases?.disease_name} - ${record.severity}`;
      
      case 'expert_system':
        return `MESMTF: Malaria ${record.malaria_probability}% | Typhoid ${record.typhoid_probability}%`;
      
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
      case 'diagnosis':
        return <BeakerIcon className="h-5 w-5 text-red-500" />;
      case 'expert_system':
        return <ShieldCheckIcon className="h-5 w-5 text-purple-500" />;
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
      ['Date', 'Type', 'Details', 'Recorded By', 'MESMTF Data'],
      ...filteredRecords.map(record => [
        new Date(record.recorded_at || record.created_at || record.actual_time || record.diagnosis_date).toLocaleDateString(),
        recordTypes[record.record_type]?.label || 'Unknown',
        formatRecordValue(record),
        record.medical_staff?.users ? 
          `${record.medical_staff.users.first_name} ${record.medical_staff.users.last_name}` : 
          'System',
        record.record_type === 'expert_system' ? `Malaria: ${record.malaria_probability}%, Typhoid: ${record.typhoid_probability}%` : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesmtf-records-${selectedPatient}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDiseaseColor = (diseaseName) => {
    if (!diseaseName) return 'bg-gray-100 text-gray-800';
    
    const lowerDisease = diseaseName.toLowerCase();
    if (lowerDisease.includes('malaria')) return 'bg-red-100 text-red-800';
    if (lowerDisease.includes('typhoid')) return 'bg-orange-100 text-orange-800';
    if (lowerDisease.includes('co-infection')) return 'bg-purple-100 text-purple-800';
    return 'bg-blue-100 text-blue-800';
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
  const patientExpertData = expertSystemData[selectedPatient];

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header with MESMTF Features */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600">MESMTF Expert System - Comprehensive Patient Records</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <BeakerIcon className="h-3 w-3 mr-1" />
                Expert System Integrated
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <ShieldCheckIcon className="h-3 w-3 mr-1" />
                MESMTF Compliant
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportRecords}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export MESMTF Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* MESMTF Statistics Banner */}
      {malariaTyphoidStats.totalSessions > 0 && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{malariaTyphoidStats.malariaCases}</div>
              <div className="text-sm text-gray-600">Malaria Cases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{malariaTyphoidStats.typhoidCases}</div>
              <div className="text-sm text-gray-600">Typhoid Cases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{malariaTyphoidStats.coInfections}</div>
              <div className="text-sm text-gray-600">Co-infections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{malariaTyphoidStats.chestXraysRequired}</div>
              <div className="text-sm text-gray-600">Chest X-rays Required</div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Selector with Expert System Data */}
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
                  {patientExpertData && (
                    <div className="flex space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getDiseaseColor('malaria')}`}>
                        Malaria: {patientExpertData.malariaProbability}%
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getDiseaseColor('typhoid')}`}>
                        Typhoid: {patientExpertData.typhoidProbability}%
                      </span>
                      {patientExpertData.requiresChestXray && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                          Chest X-ray Required
                        </span>
                      )}
                    </div>
                  )}
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
              { id: 'medication', name: 'Medication', icon: ClipboardDocumentListIcon },
              { id: 'diagnosis', name: 'MESMTF Diagnosis', icon: BeakerIcon }
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
                      placeholder="Search records... (Malaria, Typhoid, etc.)"
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
                <p className="text-sm text-gray-600">MESMTF Expert System Integrated Records</p>
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
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${recordTypes[record.record_type]?.color}-100 text-${recordTypes[record.record_type]?.color}-800`}>
                              {recordTypes[record.record_type]?.label}
                            </span>
                            
                            {/* Disease-specific badges */}
                            {record.record_type === 'diagnosis' && record.diseases?.disease_name && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor(record.diseases.disease_name)}`}>
                                {record.diseases.disease_name}
                              </span>
                            )}
                            
                            {record.record_type === 'expert_system' && (
                              <>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor('malaria')}`}>
                                  Malaria: {record.malaria_probability}%
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor('typhoid')}`}>
                                  Typhoid: {record.typhoid_probability}%
                                </span>
                              </>
                            )}

                            <span className="text-sm text-gray-500">
                              {new Date(record.recorded_at || record.created_at || record.actual_time || record.diagnosis_date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatRecordValue(record)}
                          </p>
                          {record.notes && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {record.notes}
                            </p>
                          )}
                          {record.recommendation && (
                            <p className="mt-1 text-sm text-blue-600 line-clamp-2">
                              {record.recommendation}
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
              <p className="text-sm text-gray-600">MESMTF-specific note templates available</p>
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
                      placeholder="Enter note title (e.g., Malaria Treatment Follow-up)..."
                      required
                    />
                  </div>
                </div>
                
                {/* MESMTF Template Suggestions */}
                {newClinicalNote.type === 'malaria_typhoid_followup' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">MESMTF Follow-up Template</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Patient response to prescribed medication</p>
                      <p>• Fever pattern and symptom progression</p>
                      <p>• Adverse effects or complications</p>
                      <p>• Vital signs trends and concerns</p>
                      <p>• Recommendations for treatment adjustment</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <textarea
                    value={newClinicalNote.content}
                    onChange={(e) => setNewClinicalNote({...newClinicalNote, content: e.target.value})}
                    rows={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter clinical note content. For Malaria/Typhoid cases, include specific symptoms, treatment response, and expert system recommendations..."
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
              <p className="text-sm text-gray-600">MESMTF Monitoring - Critical values highlighted</p>
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
                      MESMTF Alert
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patientRecords
                    .filter(record => record.record_type === 'vital_signs')
                    .map((record, index) => {
                      const isCritical = 
                        (record.heart_rate && (record.heart_rate < 50 || record.heart_rate > 120)) ||
                        (record.temperature && record.temperature > 38.5) ||
                        (record.oxygen_saturation && record.oxygen_saturation < 92);
                      
                      return (
                        <tr key={record.id} className={isCritical ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.recorded_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={record.heart_rate && (record.heart_rate < 50 || record.heart_rate > 120) ? 'text-red-600 font-bold' : ''}>
                              {record.heart_rate || '--'} BPM
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.blood_pressure_systolic || '--'}/{record.blood_pressure_diastolic || '--'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={record.temperature && record.temperature > 38.5 ? 'text-red-600 font-bold' : ''}>
                              {record.temperature || '--'}°C
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={record.oxygen_saturation && record.oxygen_saturation < 92 ? 'text-red-600 font-bold' : ''}>
                              {record.oxygen_saturation || '--'}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isCritical && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                                Critical
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
              <p className="text-sm text-gray-600">MESMTF-specific Malaria/Typhoid medications highlighted</p>
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
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dosage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patientRecords
                    .filter(record => record.record_type === 'medication')
                    .map((record, index) => {
                      const drugName = record.prescription_items?.drugs?.drug_name?.toLowerCase() || '';
                      const isMalariaDrug = malariaTyphoidDrugs.malaria.some(drug => drugName.includes(drug.toLowerCase().split(' ')[0]));
                      const isTyphoidDrug = malariaTyphoidDrugs.typhoid.some(drug => drugName.includes(drug.toLowerCase().split(' ')[0]));
                      
                      return (
                        <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.actual_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                              <span>{record.prescription_items?.drugs?.drug_name}</span>
                              {isMalariaDrug && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Malaria
                                </span>
                              )}
                              {isTyphoidDrug && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Typhoid
                                </span>
                              )}
                            </div>
                            {record.prescription_items?.drugs?.generic_name && (
                              <div className="text-xs text-gray-500">
                                {record.prescription_items.drugs.generic_name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isMalariaDrug ? 'Antimalarial' : isTyphoidDrug ? 'Antibiotic' : 'General'}
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
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MESMTF Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <div className="space-y-6">
            {/* Expert System Sessions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">MESMTF Expert System Diagnosis Sessions</h3>
                <p className="text-sm text-gray-600">AI-powered Malaria and Typhoid Fever assessments</p>
              </div>
              <div className="p-6">
                {patientRecords
                  .filter(record => record.record_type === 'expert_system')
                  .map((session, index) => (
                    <div key={session.id} className="border rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Expert System Assessment
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor('malaria')}`}>
                            Malaria: {session.malaria_probability}%
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor('typhoid')}`}>
                            Typhoid: {session.typhoid_probability}%
                          </span>
                          {session.requires_chest_xray && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Chest X-ray Required
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Symptoms Analyzed</h5>
                          <div className="flex flex-wrap gap-1">
                            {session.diagnosis_session_symptoms?.map((dss, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                {dss.symptoms.symptom_name}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Recommendation</h5>
                          <p className="text-sm text-gray-800">{session.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {patientRecords.filter(record => record.record_type === 'expert_system').length === 0 && (
                  <div className="text-center py-8">
                    <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No expert system sessions</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No MESMTF expert system diagnosis sessions found for this patient.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Diagnoses */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Medical Diagnoses</h3>
                <p className="text-sm text-gray-600">Formal diagnoses by healthcare providers</p>
              </div>
              <div className="p-6">
                {patientRecords
                  .filter(record => record.record_type === 'diagnosis')
                  .map((diagnosis, index) => (
                    <div key={diagnosis.id} className="border rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {diagnosis.diseases?.disease_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Diagnosed on {new Date(diagnosis.diagnosis_date).toLocaleDateString()} by {diagnosis.medical_staff?.users?.first_name} {diagnosis.medical_staff?.users?.last_name}
                          </p>
                          <p className="text-sm text-gray-700 mt-2">{diagnosis.notes}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          diagnosis.severity === 'severe' ? 'bg-red-100 text-red-800' :
                          diagnosis.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {diagnosis.severity}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Record Detail Modal */}
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
                    {new Date(selectedRecord.recorded_at || selectedRecord.created_at || selectedRecord.actual_time || selectedRecord.diagnosis_date).toLocaleString()}
                  </p>
                  
                  {/* MESMTF Specific Badges */}
                  {selectedRecord.record_type === 'diagnosis' && selectedRecord.diseases?.disease_name && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getDiseaseColor(selectedRecord.diseases.disease_name)}`}>
                      {selectedRecord.diseases.disease_name}
                    </span>
                  )}
                  
                  {selectedRecord.record_type === 'expert_system' && (
                    <div className="flex space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor('malaria')}`}>
                        Malaria: {selectedRecord.malaria_probability}%
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor('typhoid')}`}>
                        Typhoid: {selectedRecord.typhoid_probability}%
                      </span>
                      {selectedRecord.requires_chest_xray && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Chest X-ray Required
                        </span>
                      )}
                    </div>
                  )}
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
                      <p className={`text-lg font-semibold ${selectedRecord.heart_rate && (selectedRecord.heart_rate < 50 || selectedRecord.heart_rate > 120) ? 'text-red-600' : ''}`}>
                        {selectedRecord.heart_rate || '--'} BPM
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Blood Pressure</label>
                      <p className="text-lg font-semibold">
                        {selectedRecord.blood_pressure_systolic || '--'}/{selectedRecord.blood_pressure_diastolic || '--'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Temperature</label>
                      <p className={`text-lg font-semibold ${selectedRecord.temperature && selectedRecord.temperature > 38.5 ? 'text-red-600' : ''}`}>
                        {selectedRecord.temperature || '--'}°C
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">O2 Saturation</label>
                      <p className={`text-lg font-semibold ${selectedRecord.oxygen_saturation && selectedRecord.oxygen_saturation < 92 ? 'text-red-600' : ''}`}>
                        {selectedRecord.oxygen_saturation || '--'}%
                      </p>
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
                      {selectedRecord.prescription_items?.drugs?.generic_name && (
                        <p className="text-sm text-gray-600">Generic: {selectedRecord.prescription_items.drugs.generic_name}</p>
                      )}
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

                {selectedRecord.record_type === 'expert_system' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Malaria Probability</label>
                        <p className={`text-2xl font-bold ${selectedRecord.malaria_probability > 60 ? 'text-red-600' : 'text-gray-900'}`}>
                          {selectedRecord.malaria_probability}%
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Typhoid Probability</label>
                        <p className={`text-2xl font-bold ${selectedRecord.typhoid_probability > 60 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {selectedRecord.typhoid_probability}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Recommendation</label>
                      <p className="text-sm text-gray-800 bg-blue-50 p-3 rounded">{selectedRecord.recommendation}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Additional Requirements</label>
                      <p className="text-sm">
                        {selectedRecord.requires_chest_xray ? 'Chest X-ray required for Very Strong Signs (VSs)' : 'Standard drug administration only'}
                      </p>
                    </div>
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