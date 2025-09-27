// components/dashboard/DoctorDecisionSupport.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  LightBulbIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  CalendarIcon,
  TruckIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const DoctorDecisionSupport = () => {
  const [user, setUser] = useState(null);
  const [patientId, setPatientId] = useState("");
  const [patients, setPatients] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patientDetails, setPatientDetails] = useState(null);
  const navigate = useNavigate();

  // Doctor sidebar navigation
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
    // { name: 'Resources', href: '/doctor-resources', icon: AcademicCapIcon },
  ];

  // Symptom categories with weights (from competition document)
  const symptomCategories = {
    very_strong: {
      weight: 4,
      description: "Very Strong Signs - Requires chest X-ray",
    },
    strong: { weight: 3, description: "Strong Signs" },
    weak: { weight: 2, description: "Weak Signs" },
    very_weak: { weight: 1, description: "Very Weak Signs" },
  };

  // Malaria and Typhoid symptoms mapping
  const diseaseSymptoms = {
    malaria: {
      very_strong: ["Abdominal pain", "Vomiting", "Sore throat"],
      strong: ["Headache", "Fatigue", "Cough", "Constipation"],
      weak: ["Chest pain", "Back pain", "Muscle Pain"],
      very_weak: ["Diarrhea", "Sweating", "Rash", "Loss of appetite"],
    },
    typhoid: {
      very_strong: ["Abdominal pain", "Stomach issues"],
      strong: ["Headache", "Persistent high fever"],
      weak: ["Weakness", "Tiredness"],
      very_weak: ["Rash", "Loss of appetite"],
    },
  };

  useEffect(() => {
    fetchUserData();
    fetchSymptoms();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (patientId) {
      fetchPatientDetails(patientId);
    }
  }, [patientId]);

  const fetchUserData = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        navigate("/login");
        return;
      }

      const { data: userProfile } = await supabase
        .from("users")
        .select(
          `
          id, 
          email, 
          first_name, 
          last_name,
          role_id (role_name)
        `
        )
        .eq("id", authUser.id)
        .single();

      setUser({
        id: userProfile.id,
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        email: userProfile.email,
        role: userProfile.role_id?.role_name,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          last_name,
          date_of_birth,
          patients (
            blood_type_id (blood_type_code)
          )
        `
        )
        .eq(
          "role_id",
          (
            await supabase
              .from("roles")
              .select("id")
              .eq("role_name", "patient")
              .single()
          ).data?.id
        )
        .order("first_name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchPatientDetails = async (id) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          last_name,
          date_of_birth,
          phone_number,
          address,
          patients (
            blood_type_id (blood_type_code),
            emergency_contact_name,
            emergency_contact_phone,
            insurance_provider
          ),
          medical_diagnoses (
            disease_id (disease_name),
            diagnosis_date,
            severity
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setPatientDetails(data);
    } catch (error) {
      console.error("Error fetching patient details:", error);
    }
  };

  const fetchSymptoms = async () => {
    try {
      // First, ensure we have the symptoms in the database
      await ensureSymptomsExist();

      const { data, error } = await supabase
        .from("symptoms")
        .select(
          `
          id,
          symptom_name,
          category_id (
            category_name,
            weight
          )
        `
        )
        .order("symptom_name");

      if (error) throw error;
      setSymptoms(data || []);
    } catch (error) {
      console.error("Error fetching symptoms:", error);
    }
  };

  const ensureSymptomsExist = async () => {
    try {
      // Check if symptoms exist, if not, insert them
      const { count, error } = await supabase
        .from("symptoms")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      if (count === 0) {
        // Get category IDs
        const { data: categories } = await supabase
          .from("symptom_categories")
          .select("id, category_name");

        const categoryMap = {};
        categories.forEach((cat) => {
          categoryMap[cat.category_name] = cat.id;
        });

        // Insert all symptoms from both diseases
        const allSymptoms = new Set();
        Object.values(diseaseSymptoms).forEach((disease) => {
          Object.values(disease).forEach((symptomList) => {
            symptomList.forEach((symptom) => allSymptoms.add(symptom));
          });
        });

        const symptomsToInsert = Array.from(allSymptoms).map((symptom) => {
          let category = "very_weak";
          if (
            diseaseSymptoms.malaria.very_strong.includes(symptom) ||
            diseaseSymptoms.typhoid.very_strong.includes(symptom)
          ) {
            category = "very_strong";
          } else if (
            diseaseSymptoms.malaria.strong.includes(symptom) ||
            diseaseSymptoms.typhoid.strong.includes(symptom)
          ) {
            category = "strong";
          } else if (
            diseaseSymptoms.malaria.weak.includes(symptom) ||
            diseaseSymptoms.typhoid.weak.includes(symptom)
          ) {
            category = "weak";
          }

          return {
            symptom_name: symptom,
            category_id: categoryMap[category],
          };
        });

        await supabase.from("symptoms").insert(symptomsToInsert);
      }
    } catch (error) {
      console.error("Error ensuring symptoms exist:", error);
    }
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((prev) => {
      const isSelected = prev.find((s) => s.id === symptom.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== symptom.id);
      } else {
        return [...prev, symptom];
      }
    });
  };

  const calculateDiagnosis = () => {
    if (selectedSymptoms.length === 0) {
      alert("Please select at least one symptom");
      return;
    }

    setLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const result = performRuleBasedDiagnosis(selectedSymptoms);
      setDiagnosisResult(result);
      setLoading(false);
    }, 1500);
  };

  const performRuleBasedDiagnosis = (selectedSymptoms) => {
    let malariaScore = 0;
    let typhoidScore = 0;
    let veryStrongSignsPresent = false;

    // Calculate scores based on symptom weights
    selectedSymptoms.forEach((symptom) => {
      const weight =
        symptomCategories[symptom.category_id?.category_name]?.weight || 1;

      if (
        diseaseSymptoms.malaria.very_strong.includes(symptom.symptom_name) ||
        diseaseSymptoms.typhoid.very_strong.includes(symptom.symptom_name)
      ) {
        veryStrongSignsPresent = true;
      }

      if (
        diseaseSymptoms.malaria.very_strong.includes(symptom.symptom_name) ||
        diseaseSymptoms.malaria.strong.includes(symptom.symptom_name) ||
        diseaseSymptoms.malaria.weak.includes(symptom.symptom_name) ||
        diseaseSymptoms.malaria.very_weak.includes(symptom.symptom_name)
      ) {
        malariaScore += weight;
      }

      if (
        diseaseSymptoms.typhoid.very_strong.includes(symptom.symptom_name) ||
        diseaseSymptoms.typhoid.strong.includes(symptom.symptom_name) ||
        diseaseSymptoms.typhoid.weak.includes(symptom.symptom_name) ||
        diseaseSymptoms.typhoid.very_weak.includes(symptom.symptom_name)
      ) {
        typhoidScore += weight;
      }
    });

    // Normalize scores to percentages
    const maxPossibleScore = selectedSymptoms.length * 4; // Maximum weight is 4
    const malariaProbability = (malariaScore / maxPossibleScore) * 100;
    const typhoidProbability = (typhoidScore / maxPossibleScore) * 100;

    // Determine diagnosis
    let diagnosis = "No clear diagnosis";
    let confidence = "low";
    let requiresChestXray = veryStrongSignsPresent;

    if (malariaProbability >= 60 && typhoidProbability >= 60) {
      diagnosis = "Possible co-infection of Malaria and Typhoid";
      confidence = "high";
    } else if (malariaProbability >= 70) {
      diagnosis = "Malaria";
      confidence = malariaProbability >= 85 ? "high" : "medium";
    } else if (typhoidProbability >= 70) {
      diagnosis = "Typhoid Fever";
      confidence = typhoidProbability >= 85 ? "high" : "medium";
    } else if (malariaProbability >= 50 || typhoidProbability >= 50) {
      diagnosis = "Suspected infection (Malaria or Typhoid)";
      confidence = "medium";
    }

    // Treatment recommendations
    const treatmentRecommendations = [];
    if (diagnosis.includes("Malaria")) {
      treatmentRecommendations.push(
        "Artemisinin-based combination therapy (ACT)"
      );
      treatmentRecommendations.push("Paracetamol for fever management");
    }
    if (diagnosis.includes("Typhoid")) {
      treatmentRecommendations.push("Antibiotics: Azithromycin or Ceftriaxone");
      treatmentRecommendations.push("Adequate hydration and nutrition");
    }
    if (requiresChestXray) {
      treatmentRecommendations.push(
        "Chest X-ray recommended due to very strong signs"
      );
    }

    return {
      diagnosis,
      confidence,
      probabilities: {
        malaria: Math.round(malariaProbability),
        typhoid: Math.round(typhoidProbability),
      },
      requiresChestXray,
      treatmentRecommendations,
      selectedSymptoms: selectedSymptoms.map((s) => s.symptom_name),
    };
  };

  const saveDiagnosisToRecords = async () => {
    if (!diagnosisResult || !patientId) return;

    try {
      // Get disease IDs
      const { data: diseases } = await supabase
        .from("diseases")
        .select("id, disease_name")
        .in("disease_name", ["Malaria", "Typhoid Fever"]);

      const diseaseMap = {};
      diseases.forEach((d) => {
        diseaseMap[d.disease_name] = d.id;
      });

      // Determine which disease to record
      let diseaseId = null;
      if (
        diagnosisResult.diagnosis.includes("Malaria") &&
        diagnosisResult.diagnosis.includes("Typhoid")
      ) {
        diseaseId = diseaseMap["Malaria"]; // Record primary diagnosis
      } else if (diagnosisResult.diagnosis.includes("Malaria")) {
        diseaseId = diseaseMap["Malaria"];
      } else if (diagnosisResult.diagnosis.includes("Typhoid")) {
        diseaseId = diseaseMap["Typhoid Fever"];
      }

      if (diseaseId) {
        const { data, error } = await supabase
          .from("medical_diagnoses")
          .insert({
            patient_id: patientId,
            doctor_id: user.id,
            disease_id: diseaseId,
            diagnosis_date: new Date().toISOString().split("T")[0],
            severity:
              diagnosisResult.confidence === "high" ? "severe" : "moderate",
            notes: `AI-assisted diagnosis: ${
              diagnosisResult.diagnosis
            }. Confidence: ${
              diagnosisResult.confidence
            }. Symptoms: ${diagnosisResult.selectedSymptoms.join(", ")}`,
          })
          .select();

        if (error) throw error;

        alert("Diagnosis saved to medical records successfully!");
        setDiagnosisResult(null);
        setSelectedSymptoms([]);
      }
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      alert("Error saving diagnosis to records");
    }
  };

  const clearDiagnosis = () => {
    setDiagnosisResult(null);
    setSelectedSymptoms([]);
  };

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            AI Decision Support System
          </h1>
          <p className="text-gray-600 mt-2">
            Rule-based expert system for Malaria and Typhoid Fever diagnosis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Patient Selection and Symptoms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Patient Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Patient
                  </label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                        {patient.date_of_birth &&
                          ` (${
                            new Date().getFullYear() -
                            new Date(patient.date_of_birth).getFullYear()
                          }y)`}
                      </option>
                    ))}
                  </select>
                </div>

                {patientDetails && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h3 className="font-medium text-gray-900">
                      Patient Details
                    </h3>
                    <p className="text-sm text-gray-600">
                      Age:{" "}
                      {new Date().getFullYear() -
                        new Date(
                          patientDetails.date_of_birth
                        ).getFullYear()}{" "}
                      years
                    </p>
                    <p className="text-sm text-gray-600">
                      Blood Type:{" "}
                      {patientDetails.patients?.blood_type_id
                        ?.blood_type_code || "Unknown"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Symptom Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Symptom Selection
                </h2>
                <span className="text-sm text-gray-500">
                  {selectedSymptoms.length} symptoms selected
                </span>
              </div>

              {/* Symptom Categories */}
              <div className="space-y-6">
                {Object.entries(symptomCategories).map(([category, info]) => {
                  const categorySymptoms = symptoms.filter(
                    (s) => s.category_id?.category_name === category
                  );

                  if (categorySymptoms.length === 0) return null;

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg"
                    >
                      <div
                        className={`px-4 py-3 ${
                          category === "very_strong"
                            ? "bg-red-50 border-b border-red-200"
                            : category === "strong"
                            ? "bg-orange-50 border-b border-orange-200"
                            : category === "weak"
                            ? "bg-yellow-50 border-b border-yellow-200"
                            : "bg-blue-50 border-b border-blue-200"
                        }`}
                      >
                        <h3 className="font-medium capitalize">
                          {category.replace("_", " ")} Signs
                          <span className="ml-2 text-sm font-normal">
                            (Weight: {info.weight}) - {info.description}
                          </span>
                        </h3>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categorySymptoms.map((symptom) => (
                          <label
                            key={symptom.id}
                            className="flex items-center space-x-3"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSymptoms.some(
                                (s) => s.id === symptom.id
                              )}
                              onChange={() => toggleSymptom(symptom)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                              {symptom.symptom_name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={calculateDiagnosis}
                  disabled={selectedSymptoms.length === 0 || loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing Symptoms...
                    </span>
                  ) : (
                    "Analyze Symptoms & Diagnose"
                  )}
                </button>

                <button
                  onClick={clearDiagnosis}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Results and Recommendations */}
          <div className="space-y-6">
            {/* Diagnosis Results */}
            {diagnosisResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Diagnosis Results
                </h2>

                <div className="space-y-4">
                  {/* Diagnosis */}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Primary Diagnosis
                    </h3>
                    <p
                      className={`text-lg font-semibold ${
                        diagnosisResult.confidence === "high"
                          ? "text-red-600"
                          : diagnosisResult.confidence === "medium"
                          ? "text-orange-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {diagnosisResult.diagnosis}
                    </p>
                    <p className="text-sm text-gray-600">
                      Confidence:{" "}
                      <span className="capitalize">
                        {diagnosisResult.confidence}
                      </span>
                    </p>
                  </div>

                  {/* Probabilities */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {diagnosisResult.probabilities.malaria}%
                      </div>
                      <div className="text-sm text-blue-800">
                        Malaria Probability
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {diagnosisResult.probabilities.typhoid}%
                      </div>
                      <div className="text-sm text-green-800">
                        Typhoid Probability
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {diagnosisResult.treatmentRecommendations.map(
                        (rec, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{rec}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  {/* Chest X-ray Warning */}
                  {diagnosisResult.requiresChestXray && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-center space-x-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">
                          Chest X-ray Required
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        Very strong signs detected. Chest X-ray is recommended
                        for further evaluation.
                      </p>
                    </div>
                  )}

                  {/* Save to Records */}
                  <button
                    onClick={saveDiagnosisToRecords}
                    disabled={!patientId}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save to Medical Records
                  </button>
                </div>
              </div>
            )}

            {/* Information Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">How It Works</h3>
              </div>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Select patient and relevant symptoms</p>
                <p>• System uses rule-based AI for diagnosis</p>
                <p>• Very strong signs trigger chest X-ray recommendation</p>
                <p>• Treatment recommendations based on WHO guidelines</p>
                <p>• Results can be saved to patient medical records</p>
              </div>
            </div>

            {/* Symptom Legend */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-3">
                Symptom Weight Legend
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Very Strong (4) - Requires chest X-ray</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Strong (3) - High significance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Weak (2) - Moderate significance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Very Weak (1) - Low significance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDecisionSupport;
