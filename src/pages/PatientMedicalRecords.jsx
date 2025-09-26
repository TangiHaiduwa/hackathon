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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const PatientMedicalRecords = () => {
  const [patientData, setPatientData] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'Medical Records', href: '/medical-records', icon: ClipboardDocumentListIcon, current: true },
    { name: 'Book Appointment', href: '/appointment', icon: CalendarIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: DocumentTextIcon },
  ];

  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        console.log('Fetching medical records for user:', authUser.id);

        // Fetch patient profile with related data - FIXED QUERY
        const { data: patientProfile, error: profileError } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
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

        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        console.log('Patient profile:', patientProfile);

        // Fetch blood type separately
        let bloodType = 'Not recorded';
        if (patientProfile.patients && patientProfile.patients.length > 0 && patientProfile.patients[0].blood_type_id) {
          const { data: bloodTypeData } = await supabase
            .from('blood_types')
            .select('blood_type_code')
            .eq('id', patientProfile.patients[0].blood_type_id)
            .single();
          bloodType = bloodTypeData?.blood_type_code || 'Not recorded';
        }

        // Fetch patient allergies - FIXED QUERY
        const { data: patientAllergies, error: allergiesError } = await supabase
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

        if (allergiesError) console.error('Allergies error:', allergiesError);
        console.log('Patient allergies:', patientAllergies);

        // Fetch medical history (diagnoses) - SIMPLIFIED QUERY
        const { data: diagnoses, error: diagnosesError } = await supabase
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
              users (full_name)
            )
          `)
          .eq('patient_id', authUser.id)
          .order('diagnosis_date', { ascending: false });

        if (diagnosesError) console.error('Diagnoses error:', diagnosesError);
        console.log('Medical diagnoses:', diagnoses);

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

        // Set the data with blood type included
        setPatientData({
          ...patientProfile,
          bloodType
        });
        setAllergies(patientAllergies || []);
        setMedicalHistory(medicalHistoryWithPrescriptions || []);

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

  const exportMedicalRecords = () => {
    if (!patientData) return;

    const data = {
      patient: {
        fullName: patientData.full_name,
        patientId: patientData.id,
        dateOfBirth: patientData.date_of_birth,
        age: calculateAge(patientData.date_of_birth),
        gender: patientData.genders?.gender_name,
        bloodType: patientData.bloodType,
        contact: patientData.phone_number,
        email: patientData.email
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
        doctor: m.medical_staff?.users?.full_name,
        severity: m.severity,
        notes: m.notes
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-records-${patientData.full_name?.replace(/\s+/g, '-') || 'patient'}-${new Date().toISOString().split('T')[0]}.json`;
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

      {/* Patient Summary Card */}
      <div className="bg-white shadow-lg rounded-lg mb-8 border-l-4 border-blue-600">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <UserCircleIcon className="h-6 w-6 mr-2 text-blue-600" />
            Patient Summary
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-lg font-semibold text-gray-900">{patientData.full_name || 'Not provided'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Patient ID</label>
              <p className="text-lg font-mono text-gray-900">{patientData.id?.substring(0, 8).toUpperCase()}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="text-lg text-gray-900">
                {formatDate(patientData.date_of_birth)}
                <span className="text-sm text-gray-500 ml-2">
                  ({calculateAge(patientData.date_of_birth)} years)
                </span>
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Gender</label>
              <p className="text-lg text-gray-900">{patientData.genders?.gender_name || 'Not provided'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Blood Type</label>
              <p className="text-lg font-semibold text-gray-900">{patientData.bloodType}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Contact</label>
              <p className="text-lg text-gray-900">{patientData.phone_number || 'Not provided'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg text-gray-900">{patientData.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Member Since</label>
              <p className="text-lg text-gray-900">{formatDate(patientData.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Known Allergies & Emergency Contact */}
        <div className="lg:col-span-1 space-y-6">
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
                      {allergy.diagnosed_date && (
                        <p className="text-xs text-gray-400 mt-1">
                          Diagnosed: {formatDate(allergy.diagnosed_date)}
                        </p>
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
              {patientData.patients && patientData.patients.length > 0 && patientData.patients[0].emergency_contact_name ? (
                <div>
                  <p className="font-medium text-gray-900">{patientData.patients[0].emergency_contact_name}</p>
                  <p className="text-gray-600">{patientData.patients[0].emergency_contact_phone}</p>
                  <p className="text-sm text-gray-500 mt-2">Relationship: Emergency Contact</p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No emergency contact information provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Medical History</h3>
              <p className="text-sm text-gray-600">Chronological list of your clinical encounters</p>
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
                            {formatDate(encounter.diagnosis_date)} • 
                            Dr. {encounter.medical_staff?.users?.full_name || 'Unknown'}
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="font-medium text-gray-700">Final Diagnosis:</label>
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
                        <div className="mt-3">
                          <label className="font-medium text-gray-700">Prescribed Medication:</label>
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

                      <div className="mt-4 flex justify-end">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Full Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Medical History Yet</h4>
                  <p className="text-gray-500 mb-4">Your medical history will appear here after your first consultation</p>
                  <Link 
                    to="/appointment" 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 inline-flex items-center"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Book Your First Appointment
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
            <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This medical record is for informational purposes only. Please consult with your healthcare provider 
              for any medical concerns. Patients cannot edit official medical records - all updates must be made 
              by authorized medical staff.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientMedicalRecords;