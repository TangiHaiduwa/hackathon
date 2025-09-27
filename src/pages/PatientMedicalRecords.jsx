import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  UserCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  HomeIcon,
  HeartIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const PatientMedicalRecords = () => {
  const [patientData, setPatientData] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  // CORRECTED Navigation - "Appointments" not "Book Appointment"
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'My Appointments', href: '/appointment', icon: CalendarIcon, current: true },
    { name: 'Medical Records', href: '/patient-medical-records', icon: EyeIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: MagnifyingGlassIcon },
  ];

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!authUser) return;

      try {
        setLoading(true);

        // Fetch patient profile with proper field names
        const { data: patientProfile, error: profileError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone_number,
            date_of_birth,
            address,
            created_at,
            gender_id,
            genders (gender_code, gender_name),
            patients (
              blood_type_id,
              emergency_contact_name,
              emergency_contact_phone,
              insurance_provider,
              insurance_number
            )
          `)
          .eq('id', authUser.id)
          .single();

        if (profileError) throw profileError;

        // Fetch blood type
        let bloodType = 'Not recorded';
        if (patientProfile.patients?.blood_type_id) {
          const { data: bloodTypeData } = await supabase
            .from('blood_types')
            .select('blood_type_code')
            .eq('id', patientProfile.patients.blood_type_id)
            .single();
          bloodType = bloodTypeData?.blood_type_code || 'Not recorded';
        }

        // Fetch patient allergies
        const { data: patientAllergies } = await supabase
          .from('patient_allergies')
          .select(`
            id,
            allergy_id,
            severity_id,
            reaction_description,
            diagnosed_date,
            allergies (allergy_name),
            allergy_severities (severity_name)
          `)
          .eq('patient_id', authUser.id);

        // Fetch medical history (diagnoses)
        const { data: diagnoses } = await supabase
          .from('medical_diagnoses')
          .select(`
            id,
            diagnosis_date,
            severity,
            notes,
            disease_id,
            doctor_id,
            diseases (disease_name, icd_code),
            medical_staff (
              id,
              users (first_name, last_name)
            )
          `)
          .eq('patient_id', authUser.id)
          .order('diagnosis_date', { ascending: false });

        // Fetch recent vital signs
        const { data: recentVitals } = await supabase
          .from('vital_signs')
          .select(`
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            temperature,
            oxygen_saturation,
            respiratory_rate,
            recorded_at
          `)
          .eq('patient_id', authUser.id)
          .order('recorded_at', { ascending: false })
          .limit(5);

        // Fetch prescriptions for each diagnosis
        const medicalHistoryWithPrescriptions = await Promise.all(
          (diagnoses || []).map(async (diagnosis) => {
            const { data: prescriptions } = await supabase
              .from('prescriptions')
              .select(`
                id,
                prescription_date,
                prescription_items (
                  id,
                  drug_id,
                  dosage_instructions,
                  duration_days,
                  drugs (drug_name, dosage)
                )
              `)
              .eq('diagnosis_id', diagnosis.id);

            return {
              ...diagnosis,
              prescriptions: prescriptions || []
            };
          })
        );

        setPatientData({ ...patientProfile, bloodType });
        setAllergies(patientAllergies || []);
        setMedicalHistory(medicalHistoryWithPrescriptions || []);
        setVitalSigns(recentVitals || []);

      } catch (error) {
        console.error('Error fetching medical records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedicalRecords();
  }, [authUser]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  const getDoctorName = (medicalStaff) => {
    if (!medicalStaff?.users) return 'Unknown Doctor';
    return `Dr. ${medicalStaff.users.first_name} ${medicalStaff.users.last_name}`;
  };

  const exportMedicalRecords = () => {
    if (!patientData) return;

    const data = {
      patient: {
        name: `${patientData.first_name} ${patientData.last_name}`,
        patientId: patientData.id,
        dateOfBirth: patientData.date_of_birth,
        age: calculateAge(patientData.date_of_birth),
        gender: patientData.genders?.gender_name,
        bloodType: patientData.bloodType,
        contact: patientData.phone_number,
        email: patientData.email,
        address: patientData.address
      },
      allergies: allergies.map(a => ({
        allergy: a.allergies?.allergy_name,
        severity: a.allergy_severities?.severity_name,
        reaction: a.reaction_description,
        diagnosed: a.diagnosed_date
      })),
      medicalHistory: medicalHistory.map(m => ({
        date: m.diagnosis_date,
        condition: m.diseases?.disease_name,
        icdCode: m.diseases?.icd_code,
        doctor: getDoctorName(m.medical_staff),
        severity: m.severity,
        notes: m.notes
      })),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-records-${patientData.first_name}-${patientData.last_name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout user={patientData} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading your medical records...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!patientData) {
    return (
      <DashboardLayout user={patientData} navigation={navigation}>
        <div className="text-center py-12">
          <UserCircleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Medical Records Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load your medical records at this time.</p>
          <Link to="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={patientData} navigation={navigation}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-600">Your complete health history and medical information</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportMedicalRecords}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export Records
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Patient Summary Card - BETTER ORGANIZED */}
      <div className="bg-white shadow-lg rounded-lg mb-8 border-l-4 border-blue-600">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <UserCircleIcon className="h-6 w-6 mr-2 text-blue-600" />
            Patient Summary
          </h2>
          
          {/* Personal Information Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <UserCircleIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {patientData.first_name} {patientData.last_name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth & Age</label>
                  <p className="text-lg text-gray-900">
                    {formatDate(patientData.date_of_birth)}
                    <span className="text-sm text-gray-500 ml-2">
                      ({calculateAge(patientData.date_of_birth)} years)
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <UserCircleIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-lg text-gray-900">{patientData.genders?.gender_name || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <PhoneIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-lg text-gray-900">{patientData.phone_number || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <EnvelopeIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email Address</label>
                  <p className="text-lg text-gray-900 break-all">{patientData.email}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <MapPinIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-lg text-gray-900">{patientData.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Section */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Blood Type</label>
                <p className="text-lg font-semibold text-gray-900">{patientData.bloodType}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Patient ID</label>
                <p className="text-lg font-mono text-gray-900">{patientData.id?.substring(0, 8).toUpperCase()}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Member Since</label>
                <p className="text-lg text-gray-900">{formatDate(patientData.created_at)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Allergies</label>
                <p className="text-lg text-gray-900">{allergies.length} recorded</p>
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          {patientData.patients?.insurance_provider && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Insurance Information</h4>
              <p className="text-gray-900">
                {patientData.patients.insurance_provider}
                {patientData.patients.insurance_number && ` • #${patientData.patients.insurance_number}`}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar - Critical Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Known Allergies */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
                Known Allergies
              </h3>
            </div>
            <div className="p-6">
              {allergies.length > 0 ? (
                <ul className="space-y-3">
                  {allergies.map((allergy) => (
                    <li key={allergy.id} className="border-l-4 border-red-500 pl-4 py-2">
                      <p className="font-medium text-gray-900">{allergy.allergies?.allergy_name}</p>
                      <p className="text-sm text-gray-600">
                        Severity: <span className="font-medium">{allergy.allergy_severities?.severity_name}</span>
                      </p>
                      {allergy.reaction_description && (
                        <p className="text-sm text-gray-500 mt-1">{allergy.reaction_description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No known allergies recorded</p>
                  <p className="text-sm text-gray-400 mt-1">Please inform your doctor of any allergies</p>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            </div>
            <div className="p-6">
              {patientData.patients?.emergency_contact_name ? (
                <div>
                  <p className="font-medium text-gray-900">{patientData.patients.emergency_contact_name}</p>
                  <p className="text-gray-600">{patientData.patients.emergency_contact_phone}</p>
                  <p className="text-sm text-gray-500 mt-2">Relationship: Emergency Contact</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No emergency contact provided</p>
                  <p className="text-sm text-gray-400 mt-1">Please update your emergency contact information</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Vital Signs */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Vital Signs</h3>
            </div>
            <div className="p-6">
              {vitalSigns.length > 0 ? (
                <div className="space-y-4">
                  {vitalSigns.slice(0, 2).map((vital, index) => (
                    <div key={index} className="text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-600">Blood Pressure:</span>
                        <span className="font-medium text-right">
                          {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic} mmHg
                        </span>
                        <span className="text-gray-600">Heart Rate:</span>
                        <span className="font-medium text-right">{vital.heart_rate} BPM</span>
                        <span className="text-gray-600">Temperature:</span>
                        <span className="font-medium text-right">{vital.temperature}°C</span>
                        <span className="text-gray-600">Oxygen:</span>
                        <span className="font-medium text-right">{vital.oxygen_saturation}%</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        {formatDateTime(vital.recorded_at)}
                      </div>
                      {index < vitalSigns.length - 1 && <hr className="my-3" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent vital signs recorded</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Medical History */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Medical History</h3>
                  <p className="text-sm text-gray-600">Your clinical encounters and diagnoses</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {medicalHistory.length} records
                </span>
              </div>
            </div>
            <div className="p-6">
              {medicalHistory.length > 0 ? (
                <div className="space-y-6">
                  {medicalHistory.map((encounter) => (
                    <div key={encounter.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {encounter.diseases?.disease_name || 'Medical Consultation'}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatDate(encounter.diagnosis_date)} • {getDoctorName(encounter.medical_staff)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          encounter.severity === 'severe' ? 'bg-red-100 text-red-800' :
                          encounter.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {encounter.severity || 'Diagnosed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <label className="font-medium text-gray-700">Diagnosis:</label>
                          <p className="text-gray-900">{encounter.diseases?.disease_name}</p>
                          {encounter.diseases?.icd_code && (
                            <p className="text-xs text-gray-500">ICD-10: {encounter.diseases.icd_code}</p>
                          )}
                        </div>

                        <div>
                          <label className="font-medium text-gray-700">Doctor's Notes:</label>
                          <p className="text-gray-900">{encounter.notes || 'No additional notes'}</p>
                        </div>
                      </div>

                      {encounter.prescriptions.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <label className="font-medium text-gray-700 text-sm">Prescribed Medication:</label>
                          <ul className="mt-1 space-y-1">
                            {encounter.prescriptions[0].prescription_items?.map((item) => (
                              <li key={item.id} className="text-sm text-gray-700">
                                • {item.drugs?.drug_name} - {item.dosage_instructions} 
                                {item.duration_days && ` for ${item.duration_days} days`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Medical History Yet</h4>
                  <p className="text-gray-500 mb-4">
                    Your medical history will appear here after consultations following symptom checker recommendations.
                  </p>
                  <Link 
                    to="/diagnosis" 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 inline-flex items-center"
                  >
                    <HeartIcon className="h-4 w-4 mr-2" />
                    Start Symptom Checker
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Medical Process Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              <strong>Proper Medical Flow:</strong> Always start with the Symptom Checker for initial assessment. 
              If the system recommends a consultation, your appointment will be scheduled and appear here once approved. 
              Direct appointment booking is not available to ensure proper medical triage.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientMedicalRecords;