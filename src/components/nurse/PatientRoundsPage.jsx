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
  FlagIcon
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

  // Rounding templates
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
    cardiac: {
      name: 'Cardiac Assessment',
      fields: [
        { id: 'heart_rhythm', label: 'Heart Rhythm', type: 'select', options: ['Regular', 'Irregular'] },
        { id: 'edema', label: 'Edema', type: 'select', options: ['None', '1+', '2+', '3+', '4+'] },
        { id: 'lung_sounds', label: 'Lung Sounds', type: 'select', options: ['Clear', 'Crackles', 'Wheezes', 'Diminished'] },
        { id: 'oxygen_requirement', label: 'Oxygen Requirement', type: 'text' }
      ]
    },
    neuro: {
      name: 'Neuro Assessment',
      fields: [
        { id: 'orientation', label: 'Orientation', type: 'select', options: ['x4', 'x3', 'x2', 'x1', 'x0'] },
        { id: 'motor_function', label: 'Motor Function', type: 'select', options: ['Normal', 'Weakness', 'Paralysis'] },
        { id: 'sensation', label: 'Sensation', type: 'select', options: ['Intact', 'Decreased', 'Absent'] },
        { id: 'pupils', label: 'Pupils', type: 'select', options: ['PERRLA', 'Sluggish', 'Fixed'] }
      ]
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
        loadPriorityTasks(authUser.id)
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
        severity: item.medical_diagnoses?.[0]?.severity || 'stable'
      }));

      setPatients(patientsList);
    } catch (error) {
      console.error('Error fetching patients:', error);
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
    // Find the next round that hasn't been completed today
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
    // Initialize assessment data for all patients in this round
    const initialAssessments = {};
    patients.forEach(patient => {
      initialAssessments[patient.id] = {
        template: 'general',
        data: {},
        completed: false
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
      await loadRoundsSchedule(authUser.id);
      setCurrentRound(null);
      setRoundsData({});
      setHandoffNotes('');

    } catch (error) {
      console.error('Error completing round:', error);
      alert('Error completing round');
    }
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

  const addQuickTask = async (patientId, description) => {
    try {
      const { error } = await supabase
        .from('nurse_tasks')
        .insert({
          patient_id: patientId,
          nurse_id: authUser.id,
          title: `Round Task: ${description}`,
          description: description,
          priority: 'medium',
          status: 'pending',
          scheduled_time: new Date().toISOString()
        });

      if (error) throw error;
      await loadPriorityTasks(authUser.id);
    } catch (error) {
      console.error('Error adding quick task:', error);
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Rounds</h1>
            <p className="text-gray-600">Systematic patient assessments and task management</p>
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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'rounding', name: 'Rounding', icon: MapPinIcon },
              { id: 'tasks', name: 'Priority Tasks', icon: FlagIcon },
              { id: 'handoff', name: 'Shift Handoff', icon: ChatBubbleLeftRightIcon }
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
                  <p className="text-sm text-gray-600">Today's rounding schedule</p>
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

              {/* Quick Stats */}
              <div className="bg-white shadow rounded-lg mt-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Round Summary</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Patients:</span>
                    <span className="font-medium">{patients.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Assessments Completed:</span>
                    <span className="font-medium">
                      {Object.values(roundsData).filter(a => a.completed).length} / {patients.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Tasks:</span>
                    <span className="font-medium text-red-600">
                      {priorityTasks.filter(t => t.status === 'pending').length}
                    </span>
                  </div>
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
                          {currentRound.rounds_schedule.round_type} Round
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
                        const assessment = roundsData[patient.id] || { template: 'general', data: {}, completed: false };
                        const status = getPatientStatus(patient.id);
                        
                        return (
                          <div key={patient.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-medium text-gray-900">{patient.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Room {patient.room} • Bed {patient.bed} • {patient.condition}
                                </p>
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

                            {/* Quick Actions */}
                            <div className="mt-4 flex justify-between items-center">
                              <button
                                onClick={() => addQuickTask(patient.id, 'Follow-up assessment needed')}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                + Add Task
                              </button>
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
                    <p className="text-gray-500">Select a round to begin patient assessments</p>
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
                <p className="text-sm text-gray-600">Tasks identified during patient rounds</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {priorityTasks.map(task => (
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
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
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
                  ))}
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
                <p className="text-sm text-gray-600">Important notes for the next shift</p>
              </div>
              <div className="p-6">
                <textarea
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Document important patient updates, pending tasks, concerns, or special instructions for the next shift..."
                />
                <div className="mt-4">
                  <button
                    onClick={() => {
                      // Save handoff notes
                      alert('Handoff notes saved successfully');
                    }}
                    className="btn-primary"
                  >
                    Save Handoff Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Handoff Template */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Handoff Template</h3>
                <p className="text-sm text-gray-600">Standard handoff format</p>
              </div>
              <div className="p-6">
                <div className="prose prose-sm">
                  <h4>SBAR Format (Situation-Background-Assessment-Recommendation)</h4>
                  
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Situation</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="What is happening right now?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Relevant clinical context"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assessment</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Current assessment findings"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="What needs to be done?"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h5>Critical Patients Summary</h5>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-2"
                      placeholder="List critical patients and their status..."
                    />
                  </div>

                  <div className="mt-4">
                    <h5>Pending Tasks/Tests</h5>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-2"
                      placeholder="Outstanding tasks, pending results..."
                    />
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