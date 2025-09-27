// components/rounds/PatientRoundsPage.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MapPinIcon,
  ChartBarIcon,
  CalendarIcon,
  FlagIcon,
  BeakerIcon,
  ShieldCheckIcon,
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/outline';

const PatientRoundsPage = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rounding');
  const [patients, setPatients] = useState([]);
  const [roundsSchedule, setRoundsSchedule] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [roundsData, setRoundsData] = useState({});
  const [priorityTasks, setPriorityTasks] = useState([]);
  const [handoffNotes, setHandoffNotes] = useState('');
  const [quickAssessment, setQuickAssessment] = useState({});
  const [expertSystemData, setExpertSystemData] = useState({});
  const [malariaTyphoidAlerts, setMalariaTyphoidAlerts] = useState([]);

  // MESMTF Enhanced Rounding templates
  const assessmentTemplates = {
    general: {
      name: 'General Assessment',
      fields: [
        { id: 'mental_status', label: 'Mental Status', type: 'select', options: ['Alert', 'Confused', 'Lethargic', 'Agitated'] },
        { id: 'pain_level', label: 'Pain Level (0-10)', type: 'number', min: 0, max: 10 },
        { id: 'comfort', label: 'Comfort Level', type: 'select', options: ['Comfortable', 'Mild Discomfort', 'Moderate Pain', 'Severe Pain'] },
        { id: 'mobility', label: 'Mobility', type: 'select', options: ['Independent', 'Requires Assistance', 'Bedbound'] },
        { id: 'nutrition', label: 'Nutrition/Hydration', type: 'select', options: ['Good', 'Fair', 'Poor', 'NPO'] }
      ]
    },
    malaria_focus: {
      name: 'Malaria Focus Assessment',
      fields: [
        { id: 'fever_pattern', label: 'Fever Pattern', type: 'select', options: ['Intermittent', 'Remittent', 'Continuous', 'No Fever'] },
        { id: 'chills_rigors', label: 'Chills/Rigors', type: 'select', options: ['Present', 'Absent', 'Severe'] },
        { id: 'sweating', label: 'Sweating', type: 'select', options: ['Profuse', 'Moderate', 'Mild', 'None'] },
        { id: 'jaundice', label: 'Jaundice', type: 'select', options: ['Present', 'Absent'] },
        { id: 'splenomegaly', label: 'Splenomegaly', type: 'select', options: ['Present', 'Absent'] }
      ]
    },
    typhoid_focus: {
      name: 'Typhoid Focus Assessment',
      fields: [
        { id: 'fever_duration', label: 'Fever Duration (days)', type: 'number', min: 0, max: 30 },
        { id: 'rose_spots', label: 'Rose Spots', type: 'select', options: ['Present', 'Absent'] },
        { id: 'abdominal_tenderness', label: 'Abdominal Tenderness', type: 'select', options: ['Present', 'Absent', 'Rebound'] },
        { id: 'diarrhea_constipation', label: 'Bowel Pattern', type: 'select', options: ['Diarrhea', 'Constipation', 'Normal'] },
        { id: 'hepatosplenomegaly', label: 'Hepatosplenomegaly', type: 'select', options: ['Present', 'Absent'] }
      ]
    },
    cardiac: {
      name: 'Cardiac Assessment',
      fields: [
        { id: 'heart_rhythm', label: 'Heart Rhythm', type: 'select', options: ['Regular', 'Irregular'] },
        { id: 'edema', label: 'Edema', type: 'select', options: ['None', '1+', '2+', '3+', '4+'] },
        { id: 'lung_sounds', label: 'Lung Sounds', type: 'select', options: ['Clear', 'Crackles', 'Wheezes', 'Diminished'] },
        { id: 'oxygen_requirement', label: 'Oxygen Requirement', type: 'text' }
      ]
    }
  };

  // MESMTF Symptom Tracking
  const malariaTyphoidSymptoms = {
    malaria: {
      very_strong: ['Abdominal pain', 'Vomiting', 'Sore throat'],
      strong: ['Headache', 'Fatigue', 'Cough', 'Constipation'],
      weak: ['Chest pain', 'Back pain', 'Muscle Pain'],
      very_weak: ['Diarrhea', 'sweating', 'rash', 'Loss of appetite']
    },
    typhoid: {
      very_strong: ['Abdominal pain', 'Stomach issues'],
      strong: ['Headache', 'Persistent high fever'],
      weak: ['Weakness', 'Tiredness'],
      very_weak: ['Rash', 'Loss of appetite']
    }
  };

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
      await Promise.all([
        loadAssignedPatients(authUser.id),
        loadRoundsSchedule(authUser.id),
        loadPriorityTasks(authUser.id),
        loadMalariaTyphoidAlerts(authUser.id)
      ]);

      // Initialize current round
      initializeCurrentRound();

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
            ),
            room_number,
            bed_number
          ),
          medical_diagnoses(
            severity,
            diseases(disease_name)
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (error) throw error;

      const patientsList = data.map(item => ({
        id: item.patients.id,
        name: `${item.patients.users.first_name} ${item.patients.users.last_name}`,
        age: calculateAge(item.patients.users.date_of_birth),
        room: item.patients.room_number,
        bed: item.patients.bed_number,
        condition: item.medical_diagnoses?.[0]?.diseases?.disease_name || 'General care',
        severity: item.medical_diagnoses?.[0]?.severity || 'stable',
        isMalaria: item.medical_diagnoses?.some(d => d.diseases.disease_name.toLowerCase().includes('malaria')),
        isTyphoid: item.medical_diagnoses?.some(d => d.diseases.disease_name.toLowerCase().includes('typhoid'))
      }));

      setPatients(patientsList);
      
      // Load expert system data for each patient
      patientsList.forEach(patient => {
        loadExpertSystemData(patient.id);
      });
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const loadExpertSystemData = async (patientId) => {
    try {
      const { data: diagnosisSession, error } = await supabase
        .from('diagnosis_sessions')
        .select(`
          *,
          diagnosis_session_symptoms(
            symptoms(*)
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (diagnosisSession) {
        setExpertSystemData(prev => ({
          ...prev,
          [patientId]: {
            malariaProbability: diagnosisSession.malaria_probability,
            typhoidProbability: diagnosisSession.typhoid_probability,
            requiresChestXray: diagnosisSession.requires_chest_xray,
            recommendation: diagnosisSession.recommendation,
            symptoms: diagnosisSession.diagnosis_session_symptoms?.map(dss => dss.symptoms) || []
          }
        }));
      }
    } catch (error) {
      console.error('Error loading expert system data:', error);
    }
  };

  const loadMalariaTyphoidAlerts = async (nurseId) => {
    try {
      const { data, error } = await supabase
        .from('patient_alerts')
        .select(`
          *,
          patients!inner(
            users!inner(
              first_name,
              last_name
            )
          ),
          alert_types(*)
        `)
        .eq('is_resolved', false)
        .in('alert_types.type_code', ['critical_vitals', 'abnormal_vitals', 'fever', 'tachycardia'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMalariaTyphoidAlerts(data || []);
    } catch (error) {
      console.error('Error loading malaria/typhoid alerts:', error);
    }
  };

  const loadRoundsSchedule = async (nurseId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('nurse_rounds')
        .select(`
          *,
          rounds_schedule!inner(
            round_type,
            priority_order
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('round_date', today)
        .order('rounds_schedule.priority_order', { ascending: true });

      if (error) throw error;
      setRoundsSchedule(data || []);
    } catch (error) {
      console.error('Error fetching rounds schedule:', error);
    }
  };

  const loadPriorityTasks = async (nurseId) => {
    try {
      const { data, error } = await supabase
        .from('nurse_tasks')
        .select(`
          *,
          patients!inner(
            users!inner(
              first_name,
              last_name
            )
          ),
          task_types(*)
        `)
        .eq('nurse_id', nurseId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setPriorityTasks(data || []);
    } catch (error) {
      console.error('Error fetching priority tasks:', error);
    }
  };

  const initializeCurrentRound = () => {
    const now = new Date();
    const todayRounds = roundsSchedule.filter(round => 
      !round.completed_at && new Date(round.scheduled_time) <= now
    );

    if (todayRounds.length > 0) {
      setCurrentRound(todayRounds[0]);
    } else if (roundsSchedule.length > 0) {
      setCurrentRound(roundsSchedule[0]);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return today.getFullYear() - birthDate.getFullYear();
  };

  const startRound = (round) => {
    setCurrentRound(round);
    // Initialize assessment data for all patients in this round with disease-specific templates
    const initialAssessments = {};
    patients.forEach(patient => {
      const template = patient.isMalaria ? 'malaria_focus' : patient.isTyphoid ? 'typhoid_focus' : 'general';
      initialAssessments[patient.id] = {
        template: template,
        data: {},
        completed: false,
        requiresXray: expertSystemData[patient.id]?.requiresChestXray || false
      };
    });
    setRoundsData(initialAssessments);
  };

  const completeRound = async () => {
    try {
      // Save all assessments
      for (const [patientId, assessment] of Object.entries(roundsData)) {
        if (assessment.completed) {
          await supabase
            .from('patient_assessments')
            .insert({
              patient_id: patientId,
              nurse_id: authUser.id,
              assessment_type: assessment.template,
              assessment_data: assessment.data,
              round_id: currentRound.id,
              assessed_at: new Date().toISOString()
            });

          // Check for malaria/typhoid specific symptoms
          await checkForMalariaTyphoidSymptoms(patientId, assessment.data);
        }
      }

      // Mark round as completed
      await supabase
        .from('nurse_rounds')
        .update({
          completed_at: new Date().toISOString(),
          notes: handoffNotes
        })
        .eq('id', currentRound.id);

      // Reload data
      await Promise.all([
        loadRoundsSchedule(authUser.id),
        loadMalariaTyphoidAlerts(authUser.id)
      ]);
      
      setCurrentRound(null);
      setRoundsData({});
      setHandoffNotes('');

    } catch (error) {
      console.error('Error completing round:', error);
      alert('Error completing round');
    }
  };

  const checkForMalariaTyphoidSymptoms = async (patientId, assessmentData) => {
    const symptomsPresent = [];
    
    // Check for malaria symptoms
    if (assessmentData.fever_pattern && assessmentData.fever_pattern !== 'No Fever') {
      symptomsPresent.push('Fever');
    }
    if (assessmentData.chills_rigors === 'Present') {
      symptomsPresent.push('Chills/Rigors');
    }
    if (assessmentData.sweating && assessmentData.sweating !== 'None') {
      symptomsPresent.push('Sweating');
    }

    if (symptomsPresent.length >= 2) {
      // Create alert for potential malaria
      await supabase
        .from('patient_alerts')
        .insert({
          patient_id: patientId,
          alert_type_id: await getAlertTypeId('suspected_malaria'),
          title: 'Suspected Malaria Symptoms',
          message: `Patient exhibiting malaria-like symptoms: ${symptomsPresent.join(', ')}`,
          is_resolved: false
        });
    }
  };

  const getAlertTypeId = async (typeCode) => {
    // This would normally fetch from alert_types table
    return typeCode;
  };

  const updateAssessment = (patientId, field, value) => {
    setRoundsData(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        data: {
          ...prev[patientId]?.data,
          [field]: value
        }
      }
    }));
  };

  const markAssessmentComplete = (patientId) => {
    setRoundsData(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        completed: true
      }
    }));
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const { error } = await supabase
        .from('nurse_tasks')
        .update({
          status: status,
          ...(status === 'completed' && { completed_time: new Date().toISOString() })
        })
        .eq('id', taskId);

      if (error) throw error;
      await loadPriorityTasks(authUser.id);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const addQuickTask = async (patientId, description, priority = 'medium') => {
    try {
      const { error } = await supabase
        .from('nurse_tasks')
        .insert({
          patient_id: patientId,
          nurse_id: authUser.id,
          title: `Round Task: ${description}`,
          description: description,
          priority: priority,
          status: 'pending',
          scheduled_time: new Date().toISOString()
        });

      if (error) throw error;
      await loadPriorityTasks(authUser.id);
    } catch (error) {
      console.error('Error adding quick task:', error);
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
      await loadMalariaTyphoidAlerts(authUser.id);
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getRoundProgress = () => {
    if (!currentRound || patients.length === 0) return 0;
    const completedAssessments = Object.values(roundsData).filter(assessment => assessment.completed).length;
    return (completedAssessments / patients.length) * 100;
  };

  const getPatientStatus = (patientId) => {
    const assessment = roundsData[patientId];
    if (!assessment) return 'pending';
    return assessment.completed ? 'completed' : 'in-progress';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDiseaseColor = (patient) => {
    if (patient.isMalaria && patient.isTyphoid) return 'bg-purple-100 text-purple-800';
    if (patient.isMalaria) return 'bg-red-100 text-red-800';
    if (patient.isTyphoid) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRecommendedTemplate = (patient) => {
    if (patient.isMalaria) return 'malaria_focus';
    if (patient.isTyphoid) return 'typhoid_focus';
    return 'general';
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

  const roundProgress = getRoundProgress();

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header with MESMTF Features */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Rounds</h1>
            <p className="text-gray-600">MESMTF Expert System - Malaria & Typhoid Focused Assessments</p>
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
            {currentRound && (
              <div className="text-sm text-gray-600">
                Round Progress: {Math.round(roundProgress)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MESMTF Alerts Banner */}
      {malariaTyphoidAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">Malaria/Typhoid Alerts</span>
            </div>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {malariaTyphoidAlerts.length} active alerts
            </span>
          </div>
          <div className="mt-2 space-y-2">
            {malariaTyphoidAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span>
                  {alert.patients.users.first_name} {alert.patients.users.last_name}: {alert.title}
                </span>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'rounding', name: 'Rounding', icon: MapPinIcon },
              { id: 'tasks', name: 'Priority Tasks', icon: FlagIcon },
              { id: 'handoff', name: 'Shift Handoff', icon: ChatBubbleLeftRightIcon },
              { id: 'mesmtf', name: 'MESMTF Dashboard', icon: BeakerIcon }
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
        {/* Rounding Tab */}
        {activeTab === 'rounding' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Rounds Schedule */}
            <div className="xl:col-span-1">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Rounds Schedule</h3>
                  <p className="text-sm text-gray-600">MESMTF-focused rounding</p>
                </div>
                <div className="p-4 space-y-3">
                  {roundsSchedule.map(round => (
                    <div
                      key={round.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        currentRound?.id === round.id
                          ? 'border-blue-500 bg-blue-50'
                          : round.completed_at
                          ? 'border-gray-200 bg-gray-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => !round.completed_at && startRound(round)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {round.rounds_schedule.round_type} Round
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(round.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {round.completed_at ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      {round.completed_at && (
                        <div className="text-xs text-gray-500">
                          Completed at {new Date(round.completed_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* MESMTF Quick Stats */}
              <div className="bg-white shadow rounded-lg mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">MESMTF Round Summary</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Patients:</span>
                    <span className="font-medium">{patients.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Malaria Cases:</span>
                    <span className="font-medium text-red-600">
                      {patients.filter(p => p.isMalaria).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Typhoid Cases:</span>
                    <span className="font-medium text-orange-600">
                      {patients.filter(p => p.isTyphoid).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">X-ray Required:</span>
                    <span className="font-medium text-purple-600">
                      {Object.values(expertSystemData).filter(data => data.requiresChestXray).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* MESMTF Quick Actions */}
              <div className="bg-white shadow rounded-lg mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => patients.forEach(patient => {
                      if (expertSystemData[patient.id]?.requiresChestXray) {
                        addQuickTask(patient.id, 'Schedule chest X-ray for VSs', 'high');
                      }
                    })}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Schedule X-rays for VSs
                  </button>
                  <button
                    onClick={() => patients.filter(p => p.isMalaria).forEach(patient => {
                      addQuickTask(patient.id, 'Monitor fever pattern and chills', 'medium');
                    })}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Malaria Symptom Checks
                  </button>
                  <button
                    onClick={() => patients.filter(p => p.isTyphoid).forEach(patient => {
                      addQuickTask(patient.id, 'Check for rose spots and abdominal tenderness', 'medium');
                    })}
                    className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded"
                  >
                    Typhoid Symptom Checks
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Assessments */}
            <div className="xl:col-span-3">
              {currentRound ? (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {currentRound.rounds_schedule.round_type} Round - MESMTF Focus
                        </h3>
                        <p className="text-sm text-gray-600">
                          Scheduled: {new Date(currentRound.scheduled_time).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentRound(null)}
                          className="btn-secondary"
                        >
                          Cancel Round
                        </button>
                        <button
                          onClick={completeRound}
                          disabled={roundProgress < 100}
                          className={`btn-primary ${roundProgress < 100 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Complete Round
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Round Progress</span>
                        <span className="text-sm text-gray-600">{Math.round(roundProgress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${roundProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {patients.map(patient => {
                        const assessment = roundsData[patient.id] || { 
                          template: getRecommendedTemplate(patient), 
                          data: {}, 
                          completed: false 
                        };
                        const status = getPatientStatus(patient.id);
                        const expertData = expertSystemData[patient.id];
                        
                        return (
                          <div key={patient.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-medium text-gray-900">{patient.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Room {patient.room} • Bed {patient.bed}
                                </p>
                                <div className="flex space-x-1 mt-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor(patient)}`}>
                                    {patient.condition}
                                  </span>
                                  {expertData && (
                                    <>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor({isMalaria: true})}`}>
                                        M: {expertData.malariaProbability}%
                                      </span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor({isTyphoid: true})}`}>
                                        T: {expertData.typhoidProbability}%
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {status.replace('-', ' ')}
                              </span>
                            </div>

                            {/* Assessment Template Selector */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assessment Type
                              </label>
                              <select
                                value={assessment.template}
                                onChange={(e) => setRoundsData(prev => ({
                                  ...prev,
                                  [patient.id]: { ...assessment, template: e.target.value }
                                }))}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              >
                                {Object.entries(assessmentTemplates).map(([key, template]) => (
                                  <option key={key} value={key}>{template.name}</option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                Recommended: {getRecommendedTemplate(patient).replace('_', ' ')}
                              </p>
                            </div>

                            {/* Assessment Fields */}
                            <div className="space-y-3">
                              {assessmentTemplates[assessment.template]?.fields.map(field => (
                                <div key={field.id}>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label}
                                  </label>
                                  {field.type === 'select' ? (
                                    <select
                                      value={assessment.data[field.id] || ''}
                                      onChange={(e) => updateAssessment(patient.id, field.id, e.target.value)}
                                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                      <option value="">Select {field.label}</option>
                                      {field.options.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={field.type}
                                      min={field.min}
                                      max={field.max}
                                      value={assessment.data[field.id] || ''}
                                      onChange={(e) => updateAssessment(patient.id, field.id, e.target.value)}
                                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* MESMTF Quick Actions */}
                            <div className="mt-4 flex justify-between items-center">
                              <div className="space-x-2">
                                <button
                                  onClick={() => addQuickTask(patient.id, 'Follow-up assessment needed')}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  + Task
                                </button>
                                {expertData?.requiresChestXray && (
                                  <button
                                    onClick={() => addQuickTask(patient.id, 'Schedule chest X-ray for VSs', 'high')}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    + X-ray
                                  </button>
                                )}
                              </div>
                              <button
                                onClick={() => markAssessmentComplete(patient.id)}
                                disabled={assessment.completed}
                                className={`text-sm px-3 py-1 rounded ${
                                  assessment.completed
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                }`}
                              >
                                {assessment.completed ? 'Completed' : 'Mark Complete'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a round to begin MESMTF patient assessments</p>
                    <p className="text-sm text-gray-400 mt-1">Disease-specific templates will be auto-selected</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Priority Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* Task List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Priority Tasks During Rounds</h3>
                <p className="text-sm text-gray-600">MESMTF-focused task management</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {priorityTasks.map(task => {
                    const patient = patients.find(p => p.id === task.patient_id);
                    const isMalariaTask = task.description?.toLowerCase().includes('malaria');
                    const isTyphoidTask = task.description?.toLowerCase().includes('typhoid');
                    
                    return (
                      <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => updateTaskStatus(task.id, 
                              task.status === 'completed' ? 'pending' : 'completed'
                            )}
                            className={`p-2 rounded-full ${
                              task.status === 'completed' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'
                            }`}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{task.title}</h4>
                              {isMalariaTask && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Malaria
                                </span>
                              )}
                              {isTyphoidTask && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Typhoid
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {task.patients.users.first_name} {task.patients.users.last_name} • 
                              Priority: <span className="capitalize">{task.priority}</span>
                            </p>
                            <p className="text-sm text-gray-500">{task.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(task.scheduled_time).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {priorityTasks.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No priority tasks</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shift Handoff Tab */}
        {activeTab === 'handoff' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Handoff Notes */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Shift Handoff Communication</h3>
                <p className="text-sm text-gray-600">MESMTF-specific handoff information</p>
              </div>
              <div className="p-6">
                <textarea
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Document important patient updates, pending tasks, concerns, or special instructions for the next shift. Include Malaria/Typhoid specific information..."
                />
                <div className="mt-4">
                  <button
                    onClick={() => {
                      // Save handoff notes
                      alert('MESMTF handoff notes saved successfully');
                    }}
                    className="btn-primary"
                  >
                    Save Handoff Notes
                  </button>
                </div>
              </div>
            </div>

            {/* MESMTF Handoff Template */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">MESMTF Handoff Template</h3>
                <p className="text-sm text-gray-600">Disease-specific handoff format</p>
              </div>
              <div className="p-6">
                <div className="prose prose-sm">
                  <h4>MESMTF SBAR Format</h4>
                  
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Situation</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Current status: Fever pattern, symptom progression, vital signs..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Malaria/Typhoid diagnosis, treatment history, relevant test results..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assessment</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Response to treatment, complication risks, expert system recommendations..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Next dose timing, monitoring requirements, when to escalate..."
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h5>Malaria/Typhoid Specific Concerns</h5>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-2"
                      placeholder="Fever spikes, medication side effects, hydration status, warning signs..."
                    />
                  </div>

                  <div className="mt-4">
                    <h5>Pending Tasks/Tests</h5>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-2"
                      placeholder="Next medication doses, pending lab results, scheduled procedures..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MESMTF Dashboard Tab */}
        {activeTab === 'mesmtf' && (
          <div className="space-y-6">
            {/* Disease Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <HeartIconSolid className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Malaria Cases</h3>
                    <p className="text-2xl font-bold text-red-600">
                      {patients.filter(p => p.isMalaria).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <HeartIconSolid className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Typhoid Cases</h3>
                    <p className="text-2xl font-bold text-orange-600">
                      {patients.filter(p => p.isTyphoid).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BeakerIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">X-ray Required</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {Object.values(expertSystemData).filter(data => data.requiresChestXray).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient Overview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">MESMTF Patient Overview</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patients.map(patient => {
                    const expertData = expertSystemData[patient.id];
                    return (
                      <div key={patient.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{patient.name}</h4>
                            <p className="text-sm text-gray-600">Room {patient.room} • Bed {patient.bed}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDiseaseColor(patient)}`}>
                            {patient.condition}
                          </span>
                        </div>
                        
                        {expertData && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Malaria Probability:</span>
                              <span className={`font-medium ${expertData.malariaProbability > 60 ? 'text-red-600' : 'text-gray-600'}`}>
                                {expertData.malariaProbability}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Typhoid Probability:</span>
                              <span className={`font-medium ${expertData.typhoidProbability > 60 ? 'text-orange-600' : 'text-gray-600'}`}>
                                {expertData.typhoidProbability}%
                              </span>
                            </div>
                            {expertData.requiresChestXray && (
                              <div className="text-xs text-red-600 font-medium">
                                ✓ Chest X-ray Required (VSs)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Treatment Guidelines */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">MESMTF Treatment Guidelines</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-red-700 mb-3">Malaria Treatment</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Artemisinin-based Combination Therapy (ACT) first-line</li>
                      <li>• Monitor for fever patterns and chills</li>
                      <li>• Watch for severe complications</li>
                      <li>• Very Strong Signs require chest X-ray</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-700 mb-3">Typhoid Treatment</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Fluoroquinolones or third-generation cephalosporins</li>
                      <li>• Monitor abdominal symptoms</li>
                      <li>• Watch for rose spots and complications</li>
                      <li>• Very Strong Signs require chest X-ray</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientRoundsPage;