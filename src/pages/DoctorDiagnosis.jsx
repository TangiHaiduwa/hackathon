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
  CalendarIcon,
  TruckIcon,
  HomeIcon,
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
  const [medications, setMedications] = useState([]);
  const [treatmentPlan, setTreatmentPlan] = useState({
    medications: [],
    procedures: [],
    followUp: "",
    instructions: "",
    additionalRecommendations: "",
    followUpDate: "",
    followUpType: ""
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("patient");
  const [user, setUser] = useState(null);
  const [availableMedications, setAvailableMedications] = useState([]);
  const [inventoryCheck, setInventoryCheck] = useState({});
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
    {
      name: "Decision Support",
      href: "/doctor-decision-support",
      icon: LightBulbIcon,
    },
  ];

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPatients();
      fetchSymptoms();
      fetchMedications();

      // Check for patient ID in URL parameters
      const patientId = searchParams.get("patient");
      if (patientId) {
        handlePatientSelect(patientId);
      }
    }
  }, [user, searchParams]);

  // Check medication availability when treatment plan tab is activated
  useEffect(() => {
    if (activeTab === "treatment" && finalDiagnosis) {
      checkMedicationAvailability();
    }
  }, [activeTab, finalDiagnosis]);

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

  const fetchMedications = async () => {
  try {
    const { data, error } = await supabase
      .from("drugs")
      .select(`
        id,
        drug_name,
        generic_name,
        dosage,
        requires_prescription,
        drug_inventory!left (
          quantity,
          expiry_date
        )
      `)
      .gt('drug_inventory.expiry_date', new Date().toISOString())
      .gt('drug_inventory.quantity', 0)
      .order("drug_name");

    if (error) {
      console.error("Error fetching medications:", error);
      // Try without inventory join if it fails
      const { data: simpleData, error: simpleError } = await supabase
        .from("drugs")
        .select("id, drug_name, generic_name, dosage, requires_prescription")
        .order("drug_name");
      
      if (!simpleError) {
        setMedications(simpleData || []);
      }
    } else {
      setMedications(data || []);
    }
  } catch (error) {
    console.error("Error fetching medications:", error);
    // Set empty array as fallback
    setMedications([]);
  }
};

  const checkMedicationAvailability = async () => {
    try {
      // Get recommended medications based on diagnosis
      const recommendedMeds = getRecommendedMedications(finalDiagnosis.disease);
      
      // Check inventory for each recommended medication
      const inventoryPromises = recommendedMeds.map(async (med) => {
        const { data, error } = await supabase
          .from("drug_inventory")
          .select(`
            quantity,
            drugs!inner(
              id,
              drug_name,
              generic_name,
              dosage,
              requires_prescription
            )
          `)
          .eq("drugs.drug_name", med.name)
          .gt("quantity", 0)
          .gt("expiry_date", new Date().toISOString())
          .order("expiry_date", { ascending: true });

        return {
          medication: med,
          available: data && data.length > 0,
          inventory: data || [],
          quantity: data ? data.reduce((sum, item) => sum + item.quantity, 0) : 0
        };
      });

      const results = await Promise.all(inventoryPromises);
      const inventoryMap = {};
      results.forEach(result => {
        inventoryMap[result.medication.name] = result;
      });

      setInventoryCheck(inventoryMap);

      // Pre-populate treatment plan with available medications
      const availableMeds = results.filter(r => r.available).map(r => ({
        medication_id: r.inventory[0]?.drugs.id || "",
        name: r.medication.name,
        dosage: r.medication.dosage,
        frequency: r.medication.frequency,
        duration: r.medication.duration,
        instructions: r.medication.instructions,
        available: true,
        inventory: r.inventory
      }));

      setTreatmentPlan(prev => ({
        ...prev,
        medications: availableMeds.length > 0 ? availableMeds : [{
          medication_id: "",
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
          available: false
        }]
      }));

    } catch (error) {
      console.error("Error checking medication availability:", error);
    }
  };

  const getRecommendedMedications = (disease) => {
    const recommendations = {
      "Malaria": [
        {
          name: "Artemether-lumefantrine",
          dosage: "20mg/120mg",
          frequency: "Twice daily",
          duration: "3 days",
          instructions: "Take with fatty food"
        },
        {
          name: "Artesunate",
          dosage: "100mg",
          frequency: "Once daily",
          duration: "3 days", 
          instructions: "Follow with primaquine if needed"
        }
      ],
      "Typhoid Fever": [
        {
          name: "Azithromycin",
          dosage: "500mg",
          frequency: "Once daily", 
          duration: "7 days",
          instructions: "Take 1 hour before or 2 hours after food"
        },
        {
          name: "Ceftriaxone",
          dosage: "1g",
          frequency: "Once daily",
          duration: "10-14 days",
          instructions: "Intravenous administration"
        }
      ],
      "Influenza": [
        {
          name: "Oseltamivir",
          dosage: "75mg",
          frequency: "Twice daily",
          duration: "5 days",
          instructions: "Start within 48 hours of symptom onset"
        }
      ],
      "Pneumonia": [
        {
          name: "Amoxicillin",
          dosage: "500mg",
          frequency: "Three times daily",
          duration: "7 days",
          instructions: "Take with plenty of water"
        },
        {
          name: "Azithromycin",
          dosage: "500mg",
          frequency: "Once daily",
          duration: "3 days",
          instructions: "Take 1 hour before or 2 hours after food"
        }
      ],
      "Gastroenteritis": [
        {
          name: "Oral Rehydration Solution",
          dosage: "As needed",
          frequency: "Frequently",
          duration: "Until rehydrated",
          instructions: "Drink small amounts frequently"
        }
      ],
      "Acute Febrile Illness": [
        {
          name: "Paracetamol",
          dosage: "500mg",
          frequency: "Every 6 hours",
          duration: "As needed",
          instructions: "For fever and pain relief"
        }
      ]
    };

    return recommendations[disease] || [{
      name: "Symptomatic Treatment",
      dosage: "As needed",
      frequency: "As required",
      duration: "Until symptoms resolve",
      instructions: "Rest and hydration recommended"
    }];
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

    // Enhanced disease symptom patterns
    const diseasePatterns = {
      Malaria: {
        symptoms: [
          "fever",
          "chills",
          "headache",
          "nausea",
          "vomiting",
          "sweating",
          "fatigue",
          "abdominal pain",
          "muscle pain",
        ],
        icd10: "B54",
        baseProbability: 30,
      },
      "Typhoid Fever": {
        symptoms: [
          "fever",
          "headache",
          "abdominal pain",
          "constipation",
          "diarrhea",
          "rash",
          "weakness",
          "loss of appetite",
        ],
        icd10: "A01.0",
        baseProbability: 25,
      },
      Influenza: {
        symptoms: [
          "fever",
          "cough",
          "sore throat",
          "runny nose",
          "body ache",
          "headache",
          "fatigue",
        ],
        icd10: "J11.1",
        baseProbability: 20,
      },
      Pneumonia: {
        symptoms: [
          "cough",
          "fever",
          "difficulty breathing",
          "chest pain",
          "fatigue",
        ],
        icd10: "J18.9",
        baseProbability: 15,
      },
      Gastroenteritis: {
        symptoms: ["diarrhea", "vomiting", "abdominal pain", "nausea", "fever"],
        icd10: "A09",
        baseProbability: 10,
      },
    };

    // Calculate scores for each disease
    const diseaseScores = {};

    Object.keys(diseasePatterns).forEach((disease) => {
      const pattern = diseasePatterns[disease];
      let score = pattern.baseProbability;

      selectedSymptoms.forEach((symptomId) => {
        const symptom = symptoms.find((s) => s.id === symptomId);
        if (symptom) {
          const symptomName = symptom.symptom_name.toLowerCase();
          const weight = symptom.category_id?.weight || 1;

          if (
            pattern.symptoms.some((patternSymptom) =>
              symptomName.includes(patternSymptom)
            )
          ) {
            score += weight * 10; // Increase score for matching symptoms
          }
        }
      });

      diseaseScores[disease] = Math.min(score, 95); // Cap at 95%
    });

    // Generate differential diagnoses
    const differentials = Object.keys(diseaseScores)
      .filter((disease) => diseaseScores[disease] >= 40) // Only include diseases with >= 40% probability
      .map((disease) => ({
        disease: disease,
        probability: diseaseScores[disease],
        icd10: diseasePatterns[disease].icd10,
        confidence:
          diseaseScores[disease] >= 70
            ? "High"
            : diseaseScores[disease] >= 50
            ? "Medium"
            : "Low",
        supportingSymptoms: selectedSymptoms
          .filter((id) => {
            const symptom = symptoms.find((s) => s.id === id);
            return (
              symptom &&
              diseasePatterns[disease].symptoms.some((patternSymptom) =>
                symptom.symptom_name.toLowerCase().includes(patternSymptom)
              )
            );
          })
          .map((id) => symptoms.find((s) => s.id === id).symptom_name),
        severity:
          diseaseScores[disease] >= 70
            ? "severe"
            : diseaseScores[disease] >= 50
            ? "moderate"
            : "mild",
      }))
      .sort((a, b) => b.probability - a.probability);

    // If no specific diagnosis found, suggest general diagnosis
    if (differentials.length === 0) {
      const hasFever = selectedSymptoms.some((id) => {
        const symptom = symptoms.find((s) => s.id === id);
        return symptom && symptom.symptom_name.toLowerCase().includes("fever");
      });

      if (hasFever) {
        differentials.push({
          disease: "Acute Febrile Illness",
          probability: 60,
          icd10: "R50.9",
          confidence: "Medium",
          supportingSymptoms: ["Fever"],
          severity: "mild",
        });
      } else {
        differentials.push({
          disease: "General Medical Condition",
          probability: 50,
          icd10: "R69",
          confidence: "Low",
          supportingSymptoms: selectedSymptoms.map(
            (id) => symptoms.find((s) => s.id === id).symptom_name
          ),
          severity: "mild",
        });
      }
    }

    setDiagnosisResults({
      differentialDiagnoses: differentials,
      requiresChestXray:
        differentials.some((d) => d.disease === "Pneumonia") ||
        selectedSymptoms.some((id) => {
          const symptom = symptoms.find((s) => s.id === id);
          return (
            symptom && symptom.symptom_name.toLowerCase().includes("chest pain")
          );
        }),
    });

    setDifferentialDiagnoses(differentials);
    setActiveTab("diagnosis");
    setLoading(false);
  };

  const handleMedicationChange = (index, field, value) => {
    const newMeds = [...treatmentPlan.medications];
    newMeds[index][field] = value;

    // If medication is selected, auto-populate based on recommendation
    if (field === 'medication_id' && value) {
      const selectedMed = medications.find(m => m.id === value);
      if (selectedMed) {
        const recommendation = getRecommendedMedications(finalDiagnosis.disease)
          .find(rec => rec.name.toLowerCase().includes(selectedMed.drug_name.toLowerCase()) ||
                     selectedMed.drug_name.toLowerCase().includes(rec.name.toLowerCase()));

        if (recommendation) {
          newMeds[index].dosage = recommendation.dosage;
          newMeds[index].frequency = recommendation.frequency;
          newMeds[index].duration = recommendation.duration;
          newMeds[index].instructions = recommendation.instructions;
        } else {
          // Default values if no specific recommendation
          newMeds[index].dosage = selectedMed.dosage || "As prescribed";
          newMeds[index].frequency = "As directed";
          newMeds[index].duration = "As needed";
          newMeds[index].instructions = "Take as prescribed by doctor";
        }
      }
    }

    setTreatmentPlan(prev => ({ ...prev, medications: newMeds }));
  };

  const handleSubmitTreatmentPlan = async () => {
  if (!finalDiagnosis || !selectedPatient) {
    alert("Please select a final diagnosis and ensure patient is selected");
    return;
  }

  try {
    setLoading(true);

    // First, ensure we have the disease in the database or create it if it doesn't exist
    let diseaseId = null;
    const { data: existingDisease } = await supabase
      .from("diseases")
      .select("id")
      .eq("disease_name", finalDiagnosis.disease)
      .single();

    if (existingDisease) {
      diseaseId = existingDisease.id;
    } else {
      // Create the disease if it doesn't exist
      const { data: newDisease, error: diseaseError } = await supabase
        .from("diseases")
        .insert({
          disease_name: finalDiagnosis.disease,
          icd_code: finalDiagnosis.icd10 || "R69", // Default to unspecified if no ICD code
          description: `Auto-created for diagnosis: ${finalDiagnosis.disease}`,
        })
        .select()
        .single();
      
      if (diseaseError) {
        console.error("Error creating disease:", diseaseError);
        // Continue without disease ID if creation fails
      } else {
        diseaseId = newDisease.id;
      }
    }

    // Get or create diagnosis status
    let statusId = null;
    const { data: statusData } = await supabase
      .from("diagnosis_statuses")
      .select("id")
      .eq("status_code", "confirmed")
      .single();

    if (statusData) {
      statusId = statusData.id;
    } else {
      // Create diagnosis status if it doesn't exist
      const { data: newStatus } = await supabase
        .from("diagnosis_statuses")
        .insert({
          status_code: "confirmed",
          status_name: "Confirmed Diagnosis",
          description: "Diagnosis has been confirmed by a doctor"
        })
        .select()
        .single();
      
      if (newStatus) statusId = newStatus.id;
    }

    // Save medical diagnosis
    const { data: diagnosis, error: diagError } = await supabase
      .from("medical_diagnoses")
      .insert({
        patient_id: selectedPatient.id,
        doctor_id: user.id,
        disease_id: diseaseId,
        diagnosis_date: new Date().toISOString().split("T")[0],
        status_id: statusId,
        severity: finalDiagnosis.severity || "moderate",
        notes: `Rule-based diagnosis. Confidence: ${finalDiagnosis.confidence}. ${clinicalFindings.notes || ''}`,
      })
      .select()
      .single();

    if (diagError) {
      console.error("Diagnosis error details:", diagError);
      throw diagError;
    }

    // Save diagnosis symptoms
    if (selectedSymptoms.length > 0) {
      const symptomInserts = selectedSymptoms.map(symptomId => ({
        diagnosis_id: diagnosis.id,
        symptom_id: symptomId,
      }));

      const { error: symptomsError } = await supabase
        .from("diagnosis_symptoms")
        .insert(symptomInserts);

      if (symptomsError) {
        console.error("Symptoms error:", symptomsError);
        // Don't throw here - continue with diagnosis even if symptoms fail
      }
    }

    // Save vital signs if any are provided
    const hasVitalSigns = clinicalFindings.temperature || 
                         clinicalFindings.bloodPressureSystolic || 
                         clinicalFindings.heartRate;

    if (hasVitalSigns) {
      const { error: vitalError } = await supabase
        .from("vital_signs")
        .insert({
          patient_id: selectedPatient.id,
          taken_by: user.id,
          temperature: clinicalFindings.temperature ? parseFloat(clinicalFindings.temperature) : null,
          blood_pressure_systolic: clinicalFindings.bloodPressureSystolic ? parseInt(clinicalFindings.bloodPressureSystolic) : null,
          blood_pressure_diastolic: clinicalFindings.bloodPressureDiastolic ? parseInt(clinicalFindings.bloodPressureDiastolic) : null,
          heart_rate: clinicalFindings.heartRate ? parseInt(clinicalFindings.heartRate) : null,
          respiratory_rate: clinicalFindings.respiratoryRate ? parseInt(clinicalFindings.respiratoryRate) : null,
          oxygen_saturation: clinicalFindings.oxygenSaturation ? parseFloat(clinicalFindings.oxygenSaturation) : null,
          notes: clinicalFindings.physicalExam || "Recorded during diagnosis",
        });

      if (vitalError) {
        console.error("Vital signs error:", vitalError);
        // Continue even if vital signs fail
      }
    }

    // Save treatment plan and prescriptions if medications are specified
    if (treatmentPlan.medications.length > 0 && treatmentPlan.medications.some(med => med.medication_id)) {
      // Get or create prescription status
      let prescriptionStatusId = null;
      const { data: presStatusData } = await supabase
        .from("prescription_statuses")
        .select("id")
        .eq("status_code", "active")
        .single();

      if (presStatusData) {
        prescriptionStatusId = presStatusData.id;
      } else {
        // Create prescription status if it doesn't exist
        const { data: newPresStatus } = await supabase
          .from("prescription_statuses")
          .insert({
            status_code: "active",
            status_name: "Active Prescription",
            description: "Prescription is currently active"
          })
          .select()
          .single();
        
        if (newPresStatus) prescriptionStatusId = newPresStatus.id;
      }

      // Create prescription
      const { data: prescription, error: presError } = await supabase
        .from("prescriptions")
        .insert({
          diagnosis_id: diagnosis.id,
          patient_id: selectedPatient.id,
          doctor_id: user.id,
          prescription_date: new Date().toISOString().split("T")[0],
          status_id: prescriptionStatusId,
          notes: treatmentPlan.additionalRecommendations || `Treatment for ${finalDiagnosis.disease}`,
        })
        .select()
        .single();

      if (presError) {
        console.error("Prescription error:", presError);
        // Continue without prescription if it fails
      } else {
        // Save prescription items
        const prescriptionItems = treatmentPlan.medications
          .filter(med => med.medication_id && med.dosage)
          .map(med => ({
            prescription_id: prescription.id,
            drug_id: med.medication_id,
            quantity: 1, // Default quantity
            dosage_instructions: `${med.dosage}, ${med.frequency}, ${med.duration}. ${med.instructions || ''}`.trim(),
            duration_days: parseInt(med.duration) || (med.duration.includes('day') ? parseInt(med.duration) : 7),
          }));

        if (prescriptionItems.length > 0) {
          const { error: itemsError } = await supabase
            .from("prescription_items")
            .insert(prescriptionItems);

          if (itemsError) {
            console.error("Prescription items error:", itemsError);
            // Continue even if prescription items fail
          }
        }
      }
    }

    alert("Diagnosis and treatment plan saved successfully!");
    
    // Navigate to prescriptions page
    navigate("/doctor-prescriptions", {
      state: {
        patientId: selectedPatient.id,
        diagnosisId: diagnosis.id,
        disease: finalDiagnosis.disease,
      },
    });

  } catch (error) {
    console.error("Error saving diagnosis:", error);
    
    // More detailed error message
    let errorMessage = "Error saving diagnosis. Please try again.";
    
    if (error.code === '23503') { // Foreign key violation
      errorMessage = "Database reference error. Please check if all required reference data exists.";
    } else if (error.code === '23505') { // Unique violation
      errorMessage = "Duplicate record detected. Please refresh and try again.";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    alert(errorMessage);
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
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
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
                      {Math.round(diagnosis.probability)}%
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
              className={`btn-primary ${
                !finalDiagnosis ? "opacity-50 cursor-not-allowed" : ""
              }`}
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
        
        {/* Inventory Status Alert */}
        {Object.keys(inventoryCheck).length > 0 && (
          <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-900">Medication Availability</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.values(inventoryCheck).map((item, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded ${
                    item.available 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.medication.name}: {item.available ? `Available (${item.quantity})` : "Out of Stock"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Treatment recommendations */}
        {finalDiagnosis && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              Recommended Treatment for {finalDiagnosis.disease}
            </h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              {finalDiagnosis.disease === "Malaria" && (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>First-line treatment:</strong> Artemether-lumefantrine or Artesunate-based therapy
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Supportive care:</strong> Hydration, antipyretics, rest
                  </p>
                </div>
              )}
              {finalDiagnosis.disease === "Typhoid Fever" && (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Antibiotic therapy:</strong> Azithromycin or Ceftriaxone
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Supportive care:</strong> Adequate hydration, nutrition, antipyretics
                  </p>
                </div>
              )}
              {finalDiagnosis.disease === "Pneumonia" && (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Antibiotic therapy:</strong> Amoxicillin or Azithromycin
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Supportive care:</strong> Rest, hydration, oxygen if needed
                  </p>
                </div>
              )}
              {finalDiagnosis.disease === "Influenza" && (
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Antiviral therapy:</strong> Oseltamivir (Tamiflu)
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>Supportive care:</strong> Rest, hydration, antipyretics
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medications section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900">Medications</h4>
            <button
              type="button"
              onClick={() => setTreatmentPlan(prev => ({
                ...prev,
                medications: [...prev.medications, {
                  medication_id: "",
                  name: "",
                  dosage: "",
                  frequency: "",
                  duration: "",
                  instructions: "",
                  available: false
                }]
              }))}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Add Medication
            </button>
          </div>

          {treatmentPlan.medications.map((med, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication
                  </label>
                  // In the medication select dropdown, add a fallback
<select
  value={med.medication_id}
  onChange={(e) => handleMedicationChange(index, 'medication_id', e.target.value)}
  className="w-full p-2 border rounded-md"
  required
>
  <option value="">Select Medication</option>
  {medications.length > 0 ? (
    medications.map(medication => (
      <option key={medication.id} value={medication.id}>
        {medication.drug_name} {medication.dosage ? `- ${medication.dosage}` : ''}
      </option>
    ))
  ) : (
    <option value="" disabled>Loading medications...</option>
  )}
</select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={med.frequency}
                    onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select Frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="e.g., 7 days"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    value={med.instructions}
                    onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    rows="2"
                    placeholder="Special instructions for the patient..."
                  />
                </div>
              </div>

              {treatmentPlan.medications.length > 1 && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const newMeds = treatmentPlan.medications.filter((_, i) => i !== index);
                      setTreatmentPlan(prev => ({ ...prev, medications: newMeds }));
                    }}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Remove Medication
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional recommendations */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Additional Recommendations</h4>
          <textarea
            value={treatmentPlan.additionalRecommendations}
            onChange={(e) => setTreatmentPlan(prev => ({
              ...prev,
              additionalRecommendations: e.target.value
            }))}
            className="w-full p-3 border rounded-md"
            rows="4"
            placeholder="Enter additional recommendations, lifestyle advice, follow-up instructions..."
          />
        </div>

        {/* Follow-up plan */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Follow-up Plan</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={treatmentPlan.followUpDate}
                onChange={(e) => setTreatmentPlan(prev => ({
                  ...prev,
                  followUpDate: e.target.value
                }))}
                className="w-full p-2 border rounded-md"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow-up Type
              </label>
              <select
                value={treatmentPlan.followUpType}
                onChange={(e) => setTreatmentPlan(prev => ({
                  ...prev,
                  followUpType: e.target.value
                }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select Type</option>
                <option value="clinic">Clinic Visit</option>
                <option value="teleconsultation">Teleconsultation</option>
                <option value="phone">Phone Follow-up</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab("diagnosis")}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back to Diagnosis
          </button>
          <button
            type="button"
            onClick={handleSubmitTreatmentPlan}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Submit Treatment Plan"}
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
                const symptom = symptoms.find((s) => s.id === symptomId);
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