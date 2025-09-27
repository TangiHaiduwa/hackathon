// DoctorDiagnosis.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  HeartIcon,
  BeakerIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HomeIcon,
  CalendarIcon,
  TruckIcon,
  ChartBarIcon,
  LightBulbIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const DoctorDiagnosis = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [clinicalFindings, setClinicalFindings] = useState({
    temperature: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    physicalExam: "",
    notes: "",
  });
  const [diagnosisResults, setDiagnosisResults] = useState(null);
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState([]);
  const [finalDiagnosis, setFinalDiagnosis] = useState(null);
  const [treatmentPlan, setTreatmentPlan] = useState({
    medications: [],
    procedures: [],
    followUp: "",
    instructions: "",
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("patient");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation for sidebar (consistent with dashboard)
  const navigation = [
    { name: "Dashboard", href: "/doctor-dashboard", icon: HomeIcon },
    {
      name: "My Appointments",
      href: "/doctor-appointments",
      icon: CalendarIcon,
    },
    {
      name: "Patient Diagnosis",
      href: "/doctor-diagnosis",
      icon: UserGroupIcon,
    },
    {
      name: "Medical Records",
      href: "/doctor-medical-records",
      icon: ClipboardDocumentListIcon,
    },
    {
      name: "Treatment & Prescriptions",
      href: "/doctor-prescriptions",
      icon: DocumentTextIcon,
    },
    { name: "Pharmacy Orders", href: "/doctor-pharmacy", icon: BeakerIcon },
    {
      name: "Drug Administration",
      href: "/doctor-drug-admin",
      icon: TruckIcon,
    },
    { name: "Reporting", href: "/doctor-reporting", icon: ChartBarIcon },
    { name: "Search", href: "/doctor-search", icon: MagnifyingGlassIcon },
    // { name: 'Decision Support', href: '/doctor-decision-support', icon: LightBulbIcon },
    // { name: 'Resources', href: '/doctor-resources', icon: AcademicCapIcon },
  ];

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPatients();
      fetchSymptoms();

      // Check for patient ID in URL parameters
      const patientId = searchParams.get("patient");
      if (patientId) {
        handlePatientSelect(patientId);
      }
    }
  }, [user, searchParams]);

  const fetchDoctorData = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        navigate("/login");
        return;
      }

      const { data: doctorProfile } = await supabase
        .from("users")
        .select(
          `
          id, first_name, last_name, email,
          role_id (role_name),
          medical_staff (specialization_id (specialization_name))
        `
        )
        .eq("id", authUser.id)
        .single();

      setUser({
        id: doctorProfile.id,
        name: `${doctorProfile.first_name} ${doctorProfile.last_name}`,
        email: doctorProfile.email,
        role: doctorProfile.role_id.role_name,
        specialization:
          doctorProfile.medical_staff?.[0]?.specialization_id
            ?.specialization_name,
      });
    } catch (error) {
      console.error("Error fetching doctor data:", error);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
        id,
        patient_id,
        appointment_date,
        reason,
        appointment_symptoms (symptom_id (id, symptom_name))
      `
        )
        .eq("doctor_id", user.id)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date", { ascending: true });

      if (apptError) throw apptError;

      // Get unique patient IDs
      const patientIds = [...new Set(apptData.map((apt) => apt.patient_id))];

      // Fetch patient details from users table
      const { data: patientData, error: patientError } = await supabase
        .from("users")
        .select("id, first_name, last_name, date_of_birth, phone_number")
        .in("id", patientIds);

      if (patientError) throw patientError;

      // Map appointments to patient details
      const uniquePatients = [];
      const seenPatients = new Set();
      apptData.forEach((apt) => {
        const patientId = apt.patient_id;
        if (!seenPatients.has(patientId)) {
          const patient = patientData.find((p) => p.id === patientId);
          if (patient) {
            uniquePatients.push({
              ...patient,
              latestAppointment: apt.appointment_date,
              appointmentReason: apt.reason,
              preSelectedSymptoms:
                apt.appointment_symptoms?.map((s) => s.symptom_id) || [],
            });
            seenPatients.add(patientId);
          }
        }
      });

      setPatients(uniquePatients);
    } catch (error) {
      console.error("Error fetching patients:", error.message);
      // Optionally, set an error state to display to the user
    }
  };

  const fetchSymptoms = async () => {
    try {
      const { data, error } = await supabase
        .from("symptoms")
        .select(
          `
          id,
          symptom_name,
          category_id (
            category_name,
            weight
          ),
          description
        `
        )
        .order("symptom_name");

      if (error) throw error;
      setSymptoms(data);
    } catch (error) {
      console.error("Error fetching symptoms:", error);
    }
  };

  const fetchPatientHistory = async (patientId) => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select(
          `
          id,
          allergies: patient_allergies (
            allergy_id (allergy_name),
            severity_id (severity_name)
          ),
          conditions: patient_conditions (
            condition_id (condition_name),
            diagnosis_date,
            status_id (status_name)
          ),
          vitals: vital_signs (
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            temperature,
            respiratory_rate,
            oxygen_saturation,
            recorded_at
          ),
          previous_diagnoses: medical_diagnoses (
            disease_id (disease_name),
            diagnosis_date,
            severity,
            notes
          )
        `
        )
        .eq("id", patientId)
        .single();

      if (error) throw error;
      setPatientHistory(data);
    } catch (error) {
      console.error("Error fetching patient history:", error);
    }
  };

  const handlePatientSelect = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setSelectedSymptoms(patient.preSelectedSymptoms.map((s) => s.id));
      await fetchPatientHistory(patientId);
      setActiveTab("symptoms");
    }
  };

  const performRuleBasedDiagnosis = () => {
    if (selectedSymptoms.length === 0) {
      alert("Please select at least one symptom");
      return;
    }

    setLoading(true);

    // Rule-based diagnosis logic (expanded from dashboard version)
    const malariaSymptoms = [
      "fever",
      "chills",
      "headache",
      "nausea",
      "vomiting",
      "sweating",
      "fatigue",
      "abdominal pain",
      "muscle pain",
    ];
    const typhoidSymptoms = [
      "fever",
      "headache",
      "abdominal pain",
      "constipation",
      "diarrhea",
      "rash",
      "weakness",
      "loss of appetite",
    ];

    let malariaScore = 0;
    let typhoidScore = 0;
    let hasVeryStrongSigns = false;

    selectedSymptoms.forEach((symptomId) => {
      const symptom = symptoms.find((s) => s.id === symptomId);
      if (symptom) {
        const weight = symptom.category_id?.weight || 1;
        const symptomName = symptom.symptom_name.toLowerCase();

        if (malariaSymptoms.some((ms) => symptomName.includes(ms))) {
          malariaScore += weight;
        }
        if (typhoidSymptoms.some((ts) => symptomName.includes(ts))) {
          typhoidScore += weight;
        }
        if (weight === 4) hasVeryStrongSigns = true;
      }
    });

    // Calculate probabilities
    const totalScore = malariaScore + typhoidScore;
    const malariaProbability =
      totalScore > 0 ? (malariaScore / totalScore) * 100 : 0;
    const typhoidProbability =
      totalScore > 0 ? (typhoidScore / totalScore) * 100 : 0;

    // Generate differential diagnoses
    const differentials = [];

    if (malariaProbability >= 60) {
      differentials.push({
        disease: "Malaria",
        probability: malariaProbability,
        icd10: "B54",
        confidence: "High",
        supportingSymptoms: selectedSymptoms
          .filter((id) => {
            const symptom = symptoms.find((s) => s.id === id);
            return (
              symptom &&
              malariaSymptoms.some((ms) =>
                symptom.symptom_name.toLowerCase().includes(ms)
              )
            );
          })
          .map((id) => symptoms.find((s) => s.id === id).symptom_name),
      });
    }

    if (typhoidProbability >= 60) {
      differentials.push({
        disease: "Typhoid Fever",
        probability: typhoidProbability,
        icd10: "A01.0",
        confidence: "High",
        supportingSymptoms: selectedSymptoms
          .filter((id) => {
            const symptom = symptoms.find((s) => s.id === id);
            return (
              symptom &&
              typhoidSymptoms.some((ts) =>
                symptom.symptom_name.toLowerCase().includes(ts)
              )
            );
          })
          .map((id) => symptoms.find((s) => s.id === id).symptom_name),
      });
    }

    // Add other possible diagnoses based on symptoms
    if (
      selectedSymptoms.some((id) => {
        const symptom = symptoms.find((s) => s.id === id);
        return symptom && symptom.symptom_name.toLowerCase().includes("fever");
      })
    ) {
      differentials.push({
        disease: "Acute Febrile Illness",
        probability: 40,
        icd10: "R50.9",
        confidence: "Medium",
        supportingSymptoms: ["Fever"],
      });
    }

    setDiagnosisResults({
      malariaProbability: Math.round(malariaProbability),
      typhoidProbability: Math.round(typhoidProbability),
      requiresChestXray: hasVeryStrongSigns,
      differentialDiagnoses: differentials.sort(
        (a, b) => b.probability - a.probability
      ),
    });

    setDifferentialDiagnoses(differentials);
    setActiveTab("diagnosis");
    setLoading(false);
  };

  const saveDiagnosis = async () => {
    if (!finalDiagnosis || !selectedPatient) {
      alert("Please select a final diagnosis and ensure patient is selected");
      return;
    }

    try {
      setLoading(true);

      // Get disease ID
      const { data: disease } = await supabase
        .from("diseases")
        .select("id")
        .eq("disease_name", finalDiagnosis.disease)
        .single();

      // Get diagnosis status ID (confirmed)
      const { data: status } = await supabase
        .from("diagnosis_statuses")
        .select("id")
        .eq("status_code", "confirmed")
        .single();

      // Save medical diagnosis
      const { data: diagnosis, error: diagError } = await supabase
        .from("medical_diagnoses")
        .insert({
          patient_id: selectedPatient.id,
          doctor_id: user.id,
          disease_id: disease?.id,
          diagnosis_date: new Date().toISOString().split("T")[0],
          status_id: status?.id,
          severity: finalDiagnosis.severity || "moderate",
          notes: `Rule-based diagnosis. Confidence: ${finalDiagnosis.confidence}. ${clinicalFindings.notes}`,
        })
        .select()
        .single();

      if (diagError) throw diagError;

      // Save diagnosis symptoms
      for (const symptomId of selectedSymptoms) {
        await supabase.from("diagnosis_symptoms").insert({
          diagnosis_id: diagnosis.id,
          symptom_id: symptomId,
        });
      }

      // Save vital signs
      if (
        clinicalFindings.temperature ||
        clinicalFindings.bloodPressureSystolic
      ) {
        await supabase.from("vital_signs").insert({
          patient_id: selectedPatient.id,
          taken_by: user.id,
          temperature: clinicalFindings.temperature
            ? parseFloat(clinicalFindings.temperature)
            : null,
          blood_pressure_systolic: clinicalFindings.bloodPressureSystolic
            ? parseInt(clinicalFindings.bloodPressureSystolic)
            : null,
          blood_pressure_diastolic: clinicalFindings.bloodPressureDiastolic
            ? parseInt(clinicalFindings.bloodPressureDiastolic)
            : null,
          heart_rate: clinicalFindings.heartRate
            ? parseInt(clinicalFindings.heartRate)
            : null,
          respiratory_rate: clinicalFindings.respiratoryRate
            ? parseInt(clinicalFindings.respiratoryRate)
            : null,
          oxygen_saturation: clinicalFindings.oxygenSaturation
            ? parseFloat(clinicalFindings.oxygenSaturation)
            : null,
          notes: clinicalFindings.physicalExam,
        });
      }

      // Save treatment plan
      if (
        treatmentPlan.medications.length > 0 ||
        treatmentPlan.procedures.length > 0
      ) {
        // This would be expanded to save actual treatment plan
        console.log("Treatment plan to be saved:", treatmentPlan);
      }

      alert("Diagnosis saved successfully!");
      navigate("/doctor-prescriptions", {
        state: {
          patientId: selectedPatient.id,
          diagnosisId: diagnosis.id,
          disease: finalDiagnosis.disease,
        },
      });
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      alert("Error saving diagnosis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderPatientSelection = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Select Patient</h3>
        <p className="text-sm text-gray-600">
          Choose from your upcoming appointments
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPatient?.id === patient.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-25"
              }`}
              onClick={() => handlePatientSelect(patient.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Age:{" "}
                    {patient.date_of_birth
                      ? new Date().getFullYear() -
                        new Date(patient.date_of_birth).getFullYear()
                      : "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Appointment:{" "}
                    {new Date(patient.latestAppointment).toLocaleDateString()}
                  </p>
                </div>
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              </div>
              {patient.appointmentReason && (
                <p className="text-sm text-gray-600 mt-2">
                  Reason: {patient.appointmentReason}
                </p>
              )}
              {patient.preSelectedSymptoms.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-blue-600">
                    Pre-reported symptoms:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patient.preSelectedSymptoms.slice(0, 3).map((symptom) => (
                      <span
                        key={symptom.id}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {symptom.symptom_name}
                      </span>
                    ))}
                    {patient.preSelectedSymptoms.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{patient.preSelectedSymptoms.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {patients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No patients with upcoming appointments</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSymptomReview = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Symptom Review</h3>
        <p className="text-sm text-gray-600">
          Review and add symptoms for {selectedPatient?.first_name}
        </p>
      </div>
      <div className="p-6">
        {/* Pre-selected symptoms */}
        {selectedPatient?.preSelectedSymptoms.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Patient-Reported Symptoms
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedPatient.preSelectedSymptoms.map((symptom) => (
                <span
                  key={symptom.id}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                >
                  ✓ {symptom.symptom_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Symptom selection */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">
              Additional Clinical Symptoms
            </h4>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search symptoms..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                onChange={(e) => {
                  // Implement search functionality
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {symptoms.map((symptom) => (
              <label
                key={symptom.id}
                className="flex items-start space-x-2 p-2 rounded-lg hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedSymptoms.includes(symptom.id)}
                  onChange={() => {
                    setSelectedSymptoms((prev) =>
                      prev.includes(symptom.id)
                        ? prev.filter((id) => id !== symptom.id)
                        : [...prev, symptom.id]
                    );
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {symptom.symptom_name}
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        symptom.category_id?.weight === 4
                          ? "bg-red-100 text-red-800"
                          : symptom.category_id?.weight === 3
                          ? "bg-orange-100 text-orange-800"
                          : symptom.category_id?.weight === 2
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {symptom.category_id?.category_name} (
                      {symptom.category_id?.weight})
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setActiveTab("patient")}
            className="btn-secondary"
          >
            Back to Patient Selection
          </button>
          <button
            onClick={() => setActiveTab("clinical")}
            className="btn-primary"
          >
            Continue to Clinical Findings
          </button>
        </div>
      </div>
    </div>
  );

  const renderClinicalFindings = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Clinical Findings
        </h3>
        <p className="text-sm text-gray-600">
          Record vital signs and physical examination
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vital Signs */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Vital Signs</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={clinicalFindings.temperature}
                onChange={(e) =>
                  setClinicalFindings((prev) => ({
                    ...prev,
                    temperature: e.target.value,
                  }))
                }
                className="input-medical"
                placeholder="36.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  BP Systolic
                </label>
                <input
                  type="number"
                  value={clinicalFindings.bloodPressureSystolic}
                  onChange={(e) =>
                    setClinicalFindings((prev) => ({
                      ...prev,
                      bloodPressureSystolic: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  BP Diastolic
                </label>
                <input
                  type="number"
                  value={clinicalFindings.bloodPressureDiastolic}
                  onChange={(e) =>
                    setClinicalFindings((prev) => ({
                      ...prev,
                      bloodPressureDiastolic: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="80"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                value={clinicalFindings.heartRate}
                onChange={(e) =>
                  setClinicalFindings((prev) => ({
                    ...prev,
                    heartRate: e.target.value,
                  }))
                }
                className="input-medical"
                placeholder="72"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Respiratory Rate
              </label>
              <input
                type="number"
                value={clinicalFindings.respiratoryRate}
                onChange={(e) =>
                  setClinicalFindings((prev) => ({
                    ...prev,
                    respiratoryRate: e.target.value,
                  }))
                }
                className="input-medical"
                placeholder="16"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                O2 Saturation (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={clinicalFindings.oxygenSaturation}
                onChange={(e) =>
                  setClinicalFindings((prev) => ({
                    ...prev,
                    oxygenSaturation: e.target.value,
                  }))
                }
                className="input-medical"
                placeholder="98.0"
              />
            </div>
          </div>

          {/* Physical Exam */}
          <div className="md:col-span-2">
            <h4 className="font-medium text-gray-900 mb-3">
              Physical Examination
            </h4>
            <textarea
              rows="6"
              value={clinicalFindings.physicalExam}
              onChange={(e) =>
                setClinicalFindings((prev) => ({
                  ...prev,
                  physicalExam: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="General appearance, systems review, notable findings..."
            />

            <h4 className="font-medium text-gray-900 mt-4 mb-3">
              Clinical Notes
            </h4>
            <textarea
              rows="3"
              value={clinicalFindings.notes}
              onChange={(e) =>
                setClinicalFindings((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="Additional observations, assessment..."
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setActiveTab("symptoms")}
            className="btn-secondary"
          >
            Back to Symptoms
          </button>
          <button
            onClick={performRuleBasedDiagnosis}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Generate Diagnosis"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderDiagnosisResults = () => (
    <div className="space-y-6">
      {/* Rule-Based Results */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Rule-Based Diagnosis Results
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {diagnosisResults.malariaProbability}%
              </div>
              <div className="text-sm text-blue-800">Malaria Probability</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {diagnosisResults.typhoidProbability}%
              </div>
              <div className="text-sm text-orange-800">Typhoid Probability</div>
            </div>
          </div>

          {diagnosisResults.requiresChestXray && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <XCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-800">
                  Chest X-ray Recommended
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Very strong signs detected. Recommend chest X-ray in addition to
                standard treatment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Differential Diagnosis */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Differential Diagnoses
          </h3>
          <p className="text-sm text-gray-600">Select the final diagnosis</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {differentialDiagnoses.map((diagnosis, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  finalDiagnosis?.disease === diagnosis.disease
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
                onClick={() => setFinalDiagnosis(diagnosis)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {diagnosis.disease}
                    </h4>
                    <p className="text-sm text-gray-600">
                      ICD-10: {diagnosis.icd10}
                    </p>
                    <p className="text-sm text-gray-500">
                      Confidence: {diagnosis.confidence}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {diagnosis.probability}%
                    </div>
                    <div
                      className={`text-xs px-2 py-1 rounded ${
                        diagnosis.confidence === "High"
                          ? "bg-green-100 text-green-800"
                          : diagnosis.confidence === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {diagnosis.confidence}
                    </div>
                  </div>
                </div>
                {diagnosis.supportingSymptoms && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-gray-500">
                      Supporting Symptoms:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {diagnosis.supportingSymptoms.map((symptom, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {symptom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {finalDiagnosis && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">
                  Final Diagnosis Selected
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {finalDiagnosis.disease} (ICD-10: {finalDiagnosis.icd10}) -{" "}
                {finalDiagnosis.confidence} confidence
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setActiveTab("clinical")}
              className="btn-secondary"
            >
              Back to Clinical Findings
            </button>
            <button
              onClick={() => setActiveTab("treatment")}
              disabled={!finalDiagnosis}
              className="btn-primary"
            >
              Continue to Treatment Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTreatmentPlan = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Treatment Plan</h3>
        <p className="text-sm text-gray-600">
          Create treatment plan for {finalDiagnosis?.disease}
        </p>
      </div>
      <div className="p-6">
        {/* Treatment recommendations based on diagnosis */}
        {finalDiagnosis && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Recommended Treatment for {finalDiagnosis.disease}
            </h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              {finalDiagnosis.disease === "Malaria" && (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>First-line treatment:</strong>{" "}
                    Artemether-lumefantrine (Coartem) or Artesunate-based
                    therapy
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Duration:</strong> 3 days for uncomplicated malaria
                  </p>
                </div>
              )}
              {finalDiagnosis.disease === "Typhoid Fever" && (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>First-line treatment:</strong> Azithromycin or
                    Ceftriaxone for severe cases
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Duration:</strong> 7-14 days depending on severity
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Medications</h4>
            <div className="space-y-3">
              {treatmentPlan.medications.map((med, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="flex-1">
                    {med.name} - {med.dosage}
                  </span>
                  <button
                    onClick={() =>
                      setTreatmentPlan((prev) => ({
                        ...prev,
                        medications: prev.medications.filter(
                          (_, i) => i !== index
                        ),
                      }))
                    }
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setTreatmentPlan((prev) => ({
                    ...prev,
                    medications: [
                      ...prev.medications,
                      { name: "", dosage: "", frequency: "" },
                    ],
                  }))
                }
                className="btn-secondary flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Medication
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Instructions
            </label>
            <textarea
              rows="3"
              value={treatmentPlan.followUp}
              onChange={(e) =>
                setTreatmentPlan((prev) => ({
                  ...prev,
                  followUp: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="Follow-up appointment timing, warning signs to watch for, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Instructions
            </label>
            <textarea
              rows="3"
              value={treatmentPlan.instructions}
              onChange={(e) =>
                setTreatmentPlan((prev) => ({
                  ...prev,
                  instructions: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="Dietary restrictions, activity limitations, medication instructions..."
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setActiveTab("diagnosis")}
            className="btn-secondary"
          >
            Back to Diagnosis
          </button>
          <button
            onClick={saveDiagnosis}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Saving..." : "Save Diagnosis & Treatment Plan"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPatientInfoSidebar = () => {
    if (!selectedPatient) return null;

    return (
      <div className="space-y-6">
        {/* Patient Summary */}
        <div className="card-medical">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Patient Summary
            </h3>
          </div>
          <div className="p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">
                  {selectedPatient.first_name[0]}
                  {selectedPatient.last_name[0]}
                </span>
              </div>
              <h4 className="font-medium text-gray-900">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h4>
              <p className="text-sm text-gray-600">
                Age:{" "}
                {selectedPatient.date_of_birth
                  ? new Date().getFullYear() -
                    new Date(selectedPatient.date_of_birth).getFullYear()
                  : "N/A"}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Appointment Date:
                </span>
                <p className="text-sm">
                  {new Date(
                    selectedPatient.latestAppointment
                  ).toLocaleDateString()}
                </p>
              </div>
              {selectedPatient.appointmentReason && (
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Reason:
                  </span>
                  <p className="text-sm">{selectedPatient.appointmentReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Symptoms */}
        <div className="card-medical">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Selected Symptoms
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {selectedSymptoms.map((symptomId) => {
                const symptom = symptoms.find((s) => s.id === symptomomId);
                return symptom ? (
                  <div
                    key={symptom.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>{symptom.symptom_name}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        symptom.category_id?.weight === 4
                          ? "bg-red-100 text-red-800"
                          : symptom.category_id?.weight === 3
                          ? "bg-orange-100 text-orange-800"
                          : symptom.category_id?.weight === 2
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {symptom.category_id?.category_name}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
            {selectedSymptoms.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                No symptoms selected
              </p>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="card-medical">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Diagnosis Progress
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                "patient",
                "symptoms",
                "clinical",
                "diagnosis",
                "treatment",
              ].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      activeTab === step
                        ? "bg-blue-600 text-white"
                        : index <
                          [
                            "patient",
                            "symptoms",
                            "clinical",
                            "diagnosis",
                            "treatment",
                          ].indexOf(activeTab)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`ml-3 text-sm ${
                      activeTab === step
                        ? "font-medium text-blue-600"
                        : "text-gray-600"
                    }`}
                  >
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Patient Diagnosis</h1>
        <p className="text-gray-600">
          Comprehensive diagnostic tool with rule-based expert system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeTab === "patient" && renderPatientSelection()}
          {activeTab === "symptoms" && renderSymptomReview()}
          {activeTab === "clinical" && renderClinicalFindings()}
          {activeTab === "diagnosis" && renderDiagnosisResults()}
          {activeTab === "treatment" && renderTreatmentPlan()}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">{renderPatientInfoSidebar()}</div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDiagnosis;
