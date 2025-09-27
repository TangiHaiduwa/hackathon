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
  BeakerIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const PatientCare = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [medicalNotes, setMedicalNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', type: 'general' });
  const [newVitals, setNewVitals] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    temperature: '',
    oxygen_saturation: '',
    respiratory_rate: '',
    notes: ''
  });

const navigation = [
  { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon },
  { name: 'Patient Care', href: '/patient-care', icon: HeartIcon, current: true },
  { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
  { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
  { name: 'Medical Records', href: '/medical-records1', icon: DocumentTextIcon },
  { name: 'Patient Rounds', href: '/patient-rounds-page', icon: DocumentTextIcon },
];

  // Fetch patients and initial data
  // Fetch patients and initial data
useEffect(() => {
  const fetchPatientCareData = async () => {
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

      // First, get patient IDs assigned to this nurse
      const { data: assignments } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', authUser.id)
        .eq('is_active', true);

      if (!assignments || assignments.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      // Fetch patients assigned to this nurse
      const { data: patientsData } = await supabase
        .from('patients')
        .select(`
          id,
          users!inner(
            first_name,
            last_name,
            phone_number,
            date_of_birth,
            address
          ),
          blood_type_id,
          emergency_contact_name,
          emergency_contact_phone,
          insurance_provider
        `)
        .in('id', patientIds);

      if (patientsData) {
        // Fetch additional data for each patient
        const patientsWithDetails = await Promise.all(
          patientsData.map(async (patient) => {
            // Fetch latest diagnosis
            const { data: diagnosisData } = await supabase
              .from('medical_diagnoses')
              .select(`
                severity,
                diseases(disease_name)
              `)
              .eq('patient_id', patient.id)
              .order('diagnosis_date', { ascending: false })
              .limit(1)
              .single();

            // Fetch latest vital signs
            const { data: vitalsData } = await supabase
              .from('vital_signs')
              .select('recorded_at')
              .eq('patient_id', patient.id)
              .order('recorded_at', { ascending: false })
              .limit(1)
              .single();

            // Fetch blood type
            const { data: bloodTypeData } = await supabase
              .from('blood_types')
              .select('blood_type_code')
              .eq('id', patient.blood_type_id)
              .single();

            return {
              id: patient.id,
              name: `${patient.users.first_name} ${patient.users.last_name}`,
              phone: patient.users.phone_number,
              age: calculateAge(patient.users.date_of_birth),
              bloodType: bloodTypeData?.blood_type_code || 'Unknown',
              condition: diagnosisData?.diseases?.disease_name || 'Stable',
              severity: diagnosisData?.severity || 'stable',
              lastVitals: vitalsData?.recorded_at || null,
              emergencyContact: patient.emergency_contact_name,
              address: patient.users.address
            };
          })
        );

        setPatients(patientsWithDetails);

        // Select first patient by default
        if (patientsWithDetails.length > 0) {
          handlePatientSelect(patientsWithDetails[0].id);
        }
      }

    } catch (error) {
      console.error('Error fetching patient care data:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchPatientCareData();
}, [authUser]);

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

  const handlePatientSelect = async (patientId) => {
  try {
    setSelectedPatient(patientId);
    
    // Fetch detailed patient information
    const { data: patientData } = await supabase
      .from('patients')
      .select(`
        *,
        users(*),
        blood_types(*)
      `)
      .eq('id', patientId)
      .single();

    setPatientDetails(patientData);

    // Fetch patient's medical diagnoses
    const { data: diagnosesData } = await supabase
      .from('medical_diagnoses')
      .select(`
        *,
        diseases(*),
        medical_staff(
          users(first_name, last_name)
        )
      `)
      .eq('patient_id', patientId)
      .order('diagnosis_date', { ascending: false });

    // Fetch patient's allergies
    const { data: allergiesData } = await supabase
      .from('patient_allergies')
      .select(`
        *,
        allergies(*),
        allergy_severities(*)
      `)
      .eq('patient_id', patientId);

    // Fetch patient's conditions
    const { data: conditionsData } = await supabase
      .from('patient_conditions')
      .select(`
        *,
        medical_conditions(*)
      `)
      .eq('patient_id', patientId);

    // Combine all data
    setPatientDetails({
      ...patientData,
      medical_diagnoses: diagnosesData || [],
      patient_allergies: allergiesData || [],
      patient_conditions: conditionsData || []
    });

    // Fetch patient's vital signs history
    const { data: vitalsData } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    setVitalSigns(vitalsData || []);

    // Fetch patient's medical notes
    const { data: notesData } = await supabase
      .from('medical_notes')
      .select(`
        *,
        note_types(*),
        medical_staff(
          users(first_name, last_name)
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    setMedicalNotes(notesData || []);

  } catch (error) {
    console.error('Error fetching patient details:', error);
  }
};
const addMedicalNote = async (e) => {
  e.preventDefault();
  try {
    // First, get or create note type
    let noteTypeId;
    const { data: existingNoteType } = await supabase
      .from('note_types')
      .select('id')
      .eq('type_name', newNote.type)
      .single();

    if (existingNoteType) {
      noteTypeId = existingNoteType.id;
    } else {
      // Create new note type if it doesn't exist
      const { data: newNoteType } = await supabase
        .from('note_types')
        .insert({
          type_name: newNote.type,
          description: `${newNote.type} note type`
        })
        .select()
        .single();
      noteTypeId = newNoteType.id;
    }

    const { error } = await supabase
      .from('medical_notes')
      .insert({
        patient_id: selectedPatient,
        staff_id: authUser.id,
        note_type_id: noteTypeId,
        title: newNote.title,
        content: newNote.content
      });

    if (error) throw error;

    // Refresh notes
    const { data: notesData } = await supabase
      .from('medical_notes')
      .select(`
        *,
        note_types(*),
        medical_staff(
          users(first_name, last_name)
        )
      `)
      .eq('patient_id', selectedPatient)
      .order('created_at', { ascending: false });

    setMedicalNotes(notesData || []);
    setShowNoteModal(false);
    setNewNote({ title: '', content: '', type: 'general' });

    alert('Note added successfully!');

  } catch (error) {
    console.error('Error adding medical note:', error);
    alert('Error adding note: ' + error.message);
  }
};

  const recordVitalSigns = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('vital_signs')
        .insert({
          patient_id: selectedPatient,
          taken_by: authUser.id,
          ...newVitals
        });

      if (error) throw error;

      // Refresh vital signs
      const { data: vitalsData } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', selectedPatient)
        .order('recorded_at', { ascending: false })
        .limit(10);

      setVitalSigns(vitalsData || []);
      setShowVitalsModal(false);
      setNewVitals({
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        heart_rate: '',
        temperature: '',
        oxygen_saturation: '',
        respiratory_rate: '',
        notes: ''
      });

      alert('Vital signs recorded successfully!');

    } catch (error) {
      console.error('Error recording vital signs:', error);
      alert('Error recording vital signs: ' + error.message);
    }
  };

  const getPriorityBadge = (severity) => {
    const styles = {
      severe: 'bg-red-100 text-red-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      mild: 'bg-green-100 text-green-800',
      stable: 'bg-blue-100 text-blue-800'
    };
    return styles[severity] || styles.stable;
  };

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Patient Care Management</h1>
        <p className="text-gray-600">Comprehensive patient monitoring and care coordination</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient List Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Patients</h3>
              <p className="text-sm text-gray-500">{patients.length} patients under care</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {patients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient.id)}
                  className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition duration-200 ${
                    selectedPatient === patient.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-600">Age: {patient.age} • Blood: {patient.bloodType}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(patient.severity)}`}>
                      {patient.severity}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-3 w-3" />
                      <span>{patient.phone}</span>
                    </div>
                    {patient.lastVitals && (
                      <div className="flex items-center space-x-2 mt-1">
                        <ChartBarIcon className="h-3 w-3" />
                        <span>Last vitals: {new Date(patient.lastVitals).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Details Main Content */}
        <div className="lg:col-span-3">
          {selectedPatient && patientDetails ? (
            <div className="bg-white shadow rounded-lg">
              {/* Patient Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {patientDetails.users.first_name} {patientDetails.users.last_name}
                    </h2>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">Age: {calculateAge(patientDetails.users.date_of_birth)}</span>
                      <span className="text-sm text-gray-600">Blood Type: {patientDetails.blood_types?.blood_type_code || 'Unknown'}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(patientDetails.medical_diagnoses?.[0]?.severity)}`}>
                        {patientDetails.medical_diagnoses?.[0]?.severity || 'stable'}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowVitalsModal(true)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      <span>Record Vitals</span>
                    </button>
                    <button
                      onClick={() => setShowNoteModal(true)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Add Note</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  {['overview', 'vitals', 'notes', 'medication', 'allergies'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{patientDetails.users.phone_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date of Birth:</span>
                          <span className="font-medium">
                            {new Date(patientDetails.users.date_of_birth).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Emergency Contact:</span>
                          <span className="font-medium">
                            {patientDetails.emergency_contact_name} ({patientDetails.emergency_contact_phone})
                          </span>
                        </div>
                        {patientDetails.users.address && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Address:</span>
                            <span className="font-medium text-right">{patientDetails.users.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-gray-600">Current Diagnosis:</span>
                          <div className="mt-1">
                            {patientDetails.medical_diagnoses?.map(diagnosis => (
                              <div key={diagnosis.id} className="flex justify-between items-center">
                                <span className="font-medium">{diagnosis.diseases?.disease_name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${getPriorityBadge(diagnosis.severity)}`}>
                                  {diagnosis.severity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Allergies:</span>
                          <div className="mt-1">
                            {patientDetails.patient_allergies?.length > 0 ? (
                              patientDetails.patient_allergies.map(allergy => (
                                <span key={allergy.id} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                  {allergy.allergies.allergy_name}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">No known allergies</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vitals Tab */}
                {activeTab === 'vitals' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Vital Signs History</h3>
                    {vitalSigns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BP</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HR</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">O2 Sat</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resp Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {vitalSigns.map(vital => (
                              <tr key={vital.id}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {new Date(vital.recorded_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{vital.heart_rate} bpm</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{vital.temperature}°C</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{vital.oxygen_saturation}%</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{vital.respiratory_rate} rpm</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No vital signs recorded yet</p>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Notes</h3>
                    {medicalNotes.length > 0 ? (
                      <div className="space-y-4">
                        {medicalNotes.map(note => (
                          <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">{note.title}</h4>
                              <span className="text-xs text-gray-500">
                                {new Date(note.created_at).toLocaleDateString()} by {note.staff?.users?.first_name}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{note.content}</p>
                            <div className="mt-2">
                              <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                {note.note_types?.type_name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No medical notes yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Patient Selected</h3>
              <p className="text-gray-500">Select a patient from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add Medical Note</h3>
            <form onSubmit={addMedicalNote}>
              <div className="space-y-4">
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote({...newNote, type: e.target.value})}
                  className="input-medical"
                  required
                >
                  <option value="general">General Note</option>
                  <option value="nursing">Nursing Note</option>
                  <option value="progress">Progress Note</option>
                  <option value="assessment">Assessment Note</option>
                </select>
                <input
                  type="text"
                  placeholder="Note Title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                  className="input-medical"
                  required
                />
                <textarea
                  placeholder="Note Content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  className="input-medical h-32"
                  required
                />
                <div className="flex space-x-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Add Note
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowNoteModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Vitals Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Record Vital Signs</h3>
            <form onSubmit={recordVitalSigns}>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Systolic BP"
                  value={newVitals.blood_pressure_systolic}
                  onChange={(e) => setNewVitals({...newVitals, blood_pressure_systolic: e.target.value})}
                  className="input-medical"
                />
                <input
                  type="number"
                  placeholder="Diastolic BP"
                  value={newVitals.blood_pressure_diastolic}
                  onChange={(e) => setNewVitals({...newVitals, blood_pressure_diastolic: e.target.value})}
                  className="input-medical"
                />
                <input
                  type="number"
                  placeholder="Heart Rate (bpm)"
                  value={newVitals.heart_rate}
                  onChange={(e) => setNewVitals({...newVitals, heart_rate: e.target.value})}
                  className="input-medical"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Temperature (°C)"
                  value={newVitals.temperature}
                  onChange={(e) => setNewVitals({...newVitals, temperature: e.target.value})}
                  className="input-medical"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="O2 Saturation (%)"
                  value={newVitals.oxygen_saturation}
                  onChange={(e) => setNewVitals({...newVitals, oxygen_saturation: e.target.value})}
                  className="input-medical"
                />
                <input
                  type="number"
                  placeholder="Respiratory Rate"
                  value={newVitals.respiratory_rate}
                  onChange={(e) => setNewVitals({...newVitals, respiratory_rate: e.target.value})}
                  className="input-medical"
                />
              </div>
              <textarea
                placeholder="Additional Notes"
                value={newVitals.notes}
                onChange={(e) => setNewVitals({...newVitals, notes: e.target.value})}
                className="input-medical mt-4 h-20"
              />
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Record Vitals
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowVitalsModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientCare;