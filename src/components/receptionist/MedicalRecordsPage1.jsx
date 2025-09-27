// src/pages/MedicalRecords.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const MedicalRecords1 = () => {
  const [user, setUser] = useState({
    name: 'Receptionist',
    email: '',
    role: 'receptionist',
    department: 'Front Desk'
  });

  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientMedicalHistory, setPatientMedicalHistory] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: false },
    { name: 'Appointments', href: '/receptionist/receptionist-appointments', icon: CalendarIcon, current: false },
    { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
    // { name: 'Scheduling', href: '/receptionist/scheduling', icon: ClockIcon, current: false },
    { name: 'Medical Records', href: '/reception/medical-records1', icon: ClipboardDocumentListIcon, current: true },
  ];

  useEffect(() => {
    fetchPatientsWithMedicalData();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, patients]);

  const fetchPatientsWithMedicalData = async () => {
    try {
      setLoading(true);
      setError('');

      // First, get all patients with their basic info
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          id,
          insurance_provider,
          insurance_number,
          emergency_contact_name,
          emergency_contact_phone,
          blood_type_id,
          users:users!inner(
            first_name,
            last_name,
            email,
            phone_number,
            date_of_birth,
            gender_id,
            address,
            created_at
          ),
          blood_types:blood_type_id(
            blood_type_code,
            description
          ),
          genders:users!inner(gender_id(
            gender_code,
            gender_name
          ))
        `)
        .order('created_at', { foreignTable: 'users', ascending: false });

      if (patientsError) throw patientsError;

      // For each patient, fetch their medical records
      const patientsWithMedicalData = await Promise.all(
        (patientsData || []).map(async (patient) => {
          // Fetch appointments as medical encounters
          const { data: appointmentsData } = await supabase
            .from('appointments')
            .select(`
              id,
              appointment_date,
              appointment_time,
              reason,
              notes,
              created_at,
              doctors:doctor_id(
                users:users(
                  first_name,
                  last_name
                ),
                specializations:specialization_id(
                  specialization_name
                )
              ),
              appointment_statuses:status_id(
                status_name
              )
            `)
            .eq('patient_id', patient.id)
            .order('appointment_date', { ascending: false });

          // Fetch any existing medical records from medical_encounters if table exists
          let medicalEncounters = [];
          try {
            const { data: encountersData } = await supabase
              .from('medical_encounters')
              .select('*')
              .eq('patient_id', patient.id)
              .order('encounter_date', { ascending: false });
            medicalEncounters = encountersData || [];
          } catch (error) {
            console.log('Medical encounters table not available');
          }

          // Fetch prescriptions if table exists
          let prescriptions = [];
          try {
            const { data: prescriptionsData } = await supabase
              .from('prescriptions')
              .select('*')
              .eq('patient_id', patient.id)
              .order('prescribed_date', { ascending: false });
            prescriptions = prescriptionsData || [];
          } catch (error) {
            console.log('Prescriptions table not available');
          }

          // Fetch lab results if table exists
          let labResults = [];
          try {
            const { data: labData } = await supabase
              .from('lab_results')
              .select('*')
              .eq('patient_id', patient.id)
              .order('test_date', { ascending: false });
            labResults = labData || [];
          } catch (error) {
            console.log('Lab results table not available');
          }

          // Fetch allergies if table exists
          let allergies = [];
          try {
            const { data: allergiesData } = await supabase
              .from('patient_allergies')
              .select('*')
              .eq('patient_id', patient.id);
            allergies = allergiesData || [];
          } catch (error) {
            console.log('Allergies table not available');
          }

          return {
            id: patient.id,
            firstName: patient.users.first_name,
            lastName: patient.users.last_name,
            email: patient.users.email,
            phone: patient.users.phone_number,
            dateOfBirth: patient.users.date_of_birth,
            age: patient.users.date_of_birth ? calculateAge(patient.users.date_of_birth) : 'Unknown',
            gender: patient.genders?.gender_name || 'Not specified',
            address: patient.users.address,
            bloodType: patient.blood_types?.blood_type_code || 'Not specified',
            insuranceProvider: patient.insurance_provider,
            insuranceNumber: patient.insurance_number,
            emergencyContact: patient.emergency_contact_name,
            emergencyPhone: patient.emergency_contact_phone,
            appointments: appointmentsData || [],
            medicalEncounters: medicalEncounters,
            prescriptions: prescriptions,
            labResults: labResults,
            allergies: allergies,
            totalVisits: (appointmentsData?.length || 0) + medicalEncounters.length,
            lastVisit: getLastVisitDate(appointmentsData, medicalEncounters),
            createdAt: patient.users.created_at
          };
        })
      );

      setPatients(patientsWithMedicalData);
    } catch (error) {
      console.error('Error fetching patients with medical data:', error);
      setError('Failed to load medical records');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  };

  const getLastVisitDate = (appointments, encounters) => {
    const allDates = [
      ...(appointments?.map(apt => apt.appointment_date) || []),
      ...(encounters?.map(enc => enc.encounter_date) || [])
    ].filter(date => date);
    
    if (allDates.length === 0) return 'No visits';
    
    return new Date(Math.max(...allDates.map(date => new Date(date)))).toLocaleDateString();
  };

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = patients.filter(patient =>
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.email.toLowerCase().includes(searchLower) ||
      patient.phone.toLowerCase().includes(searchLower) ||
      patient.insuranceNumber.toLowerCase().includes(searchLower) ||
      patient.bloodType.toLowerCase().includes(searchLower)
    );
    
    setFilteredPatients(filtered);
  };

  const handleViewPatient = async (patient) => {
    setSelectedPatient(patient);
    
    // Combine all medical history for this patient
    const medicalHistory = [
      ...patient.appointments.map(apt => ({
        type: 'Appointment',
        date: apt.appointment_date,
        time: apt.appointment_time,
        description: apt.reason,
        doctor: `Dr. ${apt.doctors?.users?.first_name || ''} ${apt.doctors?.users?.last_name || ''}`,
        specialization: apt.doctors?.specializations?.specialization_name,
        status: apt.appointment_statuses?.status_name,
        notes: apt.notes
      })),
      ...patient.medicalEncounters.map(enc => ({
        type: 'Medical Visit',
        date: enc.encounter_date,
        description: enc.diagnosis || enc.reason,
        doctor: 'Doctor',
        notes: enc.notes || enc.treatment_plan
      })),
      ...patient.prescriptions.map(pres => ({
        type: 'Prescription',
        date: pres.prescribed_date,
        description: `${pres.medication_name} - ${pres.dosage}`,
        doctor: 'Prescribing Doctor',
        notes: pres.instructions
      })),
      ...patient.labResults.map(lab => ({
        type: 'Lab Test',
        date: lab.test_date,
        description: lab.test_name,
        notes: `Results: ${lab.results} (${lab.normal_range})`
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    setPatientMedicalHistory(medicalHistory);
    setShowRecordModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && patients.length === 0) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading medical records...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600">Manage and view patient medical records and history</p>
        </div>

        {/* Notifications */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-800">{success}</span>
            <button 
              onClick={() => setSuccess('')}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, email, phone, or medical information..."
                  className="input-medical pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = '/receptionist/patient-registration'}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                New Patient
              </button>
            </div>
          </div>
        </div>

        {/* Patients with Medical Records */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Patients with Medical Records ({filteredPatients.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? 'No patients found matching your search' : 'No patients with medical records found'}
                </p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div key={patient.id} className="p-6 hover:bg-gray-50 transition duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <h3 className="text-lg font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {patient.age} years
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {patient.bloodType}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {patient.gender}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>DOB: {formatDate(patient.dateOfBirth)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HeartIcon className="h-4 w-4" />
                          <span>Visits: {patient.totalVisits}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BeakerIcon className="h-4 w-4" />
                          <span>Last Visit: {patient.lastVisit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="h-4 w-4" />
                          <span>Insurance: {patient.insuranceProvider || 'None'}</span>
                        </div>
                      </div>

                      {/* Medical Summary */}
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Allergies:</span>
                          <span className="text-gray-600 ml-2">
                            {patient.allergies.length > 0 
                              ? patient.allergies.map(a => a.allergy_name).join(', ')
                              : 'None recorded'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Recent Appointments:</span>
                          <span className="text-gray-600 ml-2">
                            {patient.appointments.slice(0, 3).map(apt => 
                              `${formatDate(apt.appointment_date)} (${apt.reason})`
                            ).join('; ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleViewPatient(patient)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <EyeIcon className="h-4 w-4" />
                        View Medical History
                      </button>
                      
                      <button
                        onClick={() => window.location.href = `/receptionist/appointments?patient=${patient.id}`}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        Schedule Visit
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Patient Medical History Modal */}
        {showRecordModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Medical History - {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedPatient.age} years • {selectedPatient.bloodType} • {selectedPatient.gender}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRecordModal(false);
                      setSelectedPatient(null);
                      setPatientMedicalHistory([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Patient Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Patient Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="font-medium">Phone:</span> {selectedPatient.phone}</div>
                      <div><span className="font-medium">Email:</span> {selectedPatient.email}</div>
                      <div><span className="font-medium">Insurance:</span> {selectedPatient.insuranceProvider || 'None'}</div>
                      <div><span className="font-medium">Emergency Contact:</span> {selectedPatient.emergencyContact}</div>
                    </div>
                  </div>

                  {/* Medical History Timeline */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Medical History Timeline</h4>
                    <div className="space-y-4">
                      {patientMedicalHistory.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No medical history recorded</p>
                      ) : (
                        patientMedicalHistory.map((record, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4 ml-4 py-2">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-gray-900">{record.type}</span>
                              <span className="text-sm text-gray-500">{formatDate(record.date)} {record.time && `at ${record.time}`}</span>
                            </div>
                            <p className="text-sm text-gray-700">{record.description}</p>
                            {record.doctor && (
                              <p className="text-sm text-gray-600">With: {record.doctor}</p>
                            )}
                            {record.notes && (
                              <p className="text-sm text-gray-600 mt-1">Notes: {record.notes}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
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

export default MedicalRecords1;