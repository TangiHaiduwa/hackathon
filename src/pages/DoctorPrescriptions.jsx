// DoctorPrescriptions.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  BeakerIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  TruckIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CalculatorIcon,
  HomeIcon,
  CalendarIcon,
  LightBulbIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const DoctorPrescriptions = () => {
  const [patients, setPatients] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAllergies, setPatientAllergies] = useState([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [currentPrescription, setCurrentPrescription] = useState({
    diagnosis_id: "",
    notes: "",
    items: [],
  });
  const [drugSearchTerm, setDrugSearchTerm] = useState("");
  const [filteredDrugs, setFilteredDrugs] = useState([]);
  const [interactionWarnings, setInteractionWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("patient");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

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

  // WHO/MOH Treatment Guidelines
  const treatmentGuidelines = {
    Malaria: {
      firstLine: [
        {
          drug: "Artemether-lumefantrine",
          dosage: "20mg/120mg",
          duration: 3,
          frequency: "Twice daily",
        },
        {
          drug: "Artesunate-amodiaquine",
          dosage: "100mg/270mg",
          duration: 3,
          frequency: "Once daily",
        },
      ],
      secondLine: [
        {
          drug: "Quinine",
          dosage: "600mg",
          duration: 7,
          frequency: "Three times daily",
        },
        {
          drug: "Doxycycline",
          dosage: "100mg",
          duration: 7,
          frequency: "Once daily",
        },
      ],
      notes:
        "For severe malaria, use parenteral artesunate for minimum 24 hours",
    },
    "Typhoid Fever": {
      firstLine: [
        {
          drug: "Azithromycin",
          dosage: "500mg",
          duration: 7,
          frequency: "Once daily",
        },
        {
          drug: "Ceftriaxone",
          dosage: "2g",
          duration: 10,
          frequency: "Once daily IV",
        },
      ],
      secondLine: [
        {
          drug: "Ciprofloxacin",
          dosage: "500mg",
          duration: 7,
          frequency: "Twice daily",
        },
        {
          drug: "Cefixime",
          dosage: "400mg",
          duration: 7,
          frequency: "Once daily",
        },
      ],
      notes: "Consider drug susceptibility testing in resistant cases",
    },
    "Malaria & Typhoid Fever": {
      firstLine: [
        {
          drug: "Artemether-lumefantrine",
          dosage: "20mg/120mg",
          duration: 3,
          frequency: "Twice daily",
        },
        {
          drug: "Azithromycin",
          dosage: "500mg",
          duration: 7,
          frequency: "Once daily",
        },
      ],
      notes: "Combined therapy for co-infection",
    },
  };

  // Drug Interaction Database (simplified)
  const drugInteractions = {
    "Artemether-lumefantrine": [
      "Ketoconazole",
      "Rifampicin",
      "Anticonvulsants",
    ],
    Azithromycin: ["Warfarin", "Digoxin", "Cyclosporine"],
    Ciprofloxacin: ["Theophylline", "Warfarin", "Antacids"],
    Quinine: ["Digoxin", "Warfarin", "Antacids"],
    Doxycycline: ["Antacids", "Iron supplements", "Warfarin"],
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTodaysPatients();
      const patientId = new URLSearchParams(location.search).get("patient");
      if (patientId) {
        handlePatientSelect(patientId);
      }
    }
  }, [user, location.search]);

  useEffect(() => {
    filterDrugs();
    checkDrugInteractions();
  }, [drugSearchTerm, currentPrescription.items]);

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

  const fetchTodaysPatients = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0]; // e.g., "2025-09-25"
      console.log(
        "Fetching appointments for doctor:",
        user.id,
        "on date:",
        today
      ); // Debug
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(
          "id, patient_id, appointment_date, appointment_time, status_id (status_name), reason"
        )
        .eq("doctor_id", user.id)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true });

      if (apptError) {
        console.error("Appointment error:", apptError);
        throw apptError;
      }
      console.log("Appointments fetched:", apptData); // Debug

      if (!apptData || apptData.length === 0) {
        console.log("No appointments found for today");
        setPatients([]);
        return;
      }

      const patientIds = [...new Set(apptData.map((apt) => apt.patient_id))];
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, date_of_birth, phone_number, email, address"
        )
        .in("id", patientIds);

      if (userError) {
        console.error("User error:", userError);
        throw userError;
      }
      console.log("Users fetched:", userData); // Debug

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(
          "id, blood_type_id, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number"
        )
        .in("id", patientIds);

      if (patientError) {
        console.error("Patient error:", patientError);
        throw patientError;
      }
      console.log("Patients fetched:", patientData); // Debug

      const userMap = new Map(userData.map((u) => [u.id, u]));
      const patientMap = new Map(patientData.map((p) => [p.id, p]));
      const uniquePatients = apptData
        .map((apt) => {
          const userInfo = userMap.get(apt.patient_id);
          const patientInfo = patientMap.get(apt.patient_id);
          return userInfo
            ? {
                ...userInfo,
                ...patientInfo,
                appointmentTime: apt.appointment_time,
                status: apt.status_id.status_name,
                reason: apt.reason,
              }
            : null;
        })
        .filter((p) => p);

      setPatients(uniquePatients);
    } catch (error) {
      console.error("Error fetching today's patients:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrugs = async () => {
    try {
      const { data, error } = await supabase
        .from("drugs")
        .select(
          `
          id,
          drug_name,
          generic_name,
          dosage,
          form_id (form_name),
          category_id (category_name),
          requires_prescription,
          description
        `
        )
        .order("drug_name");

      if (error) throw error;
      setDrugs(data);
      setFilteredDrugs(data);
    } catch (error) {
      console.error("Error fetching drugs:", error);
    }
  };

  const fetchPatientData = async (patientId) => {
    try {
      // Fetch patient allergies
      const { data: allergies } = await supabase
        .from("patient_allergies")
        .select(
          `
          allergy_id (allergy_name),
          severity_id (severity_name),
          reaction_description
        `
        )
        .eq("patient_id", patientId);

      setPatientAllergies(allergies || []);

      // Fetch prescription history
      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select(
          `
          id,
          prescription_date,
          status_id (status_name),
          notes,
          prescription_items (
            drug_id (drug_name, dosage),
            dosage_instructions,
            duration_days,
            quantity
          ),
          diagnosis_id (disease_id (disease_name))
        `
        )
        .eq("patient_id", patientId)
        .order("prescription_date", { ascending: false });

      setPrescriptionHistory(prescriptions || []);
    } catch (error) {
      console.error("Error fetching patient data:", error);
    }
  };

  const handlePatientSelect = async (patientId) => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, date_of_birth, phone_number, email, address"
        )
        .eq("id", patientId)
        .single();

      if (userError) throw userError;
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(
          "id, blood_type_id, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number"
        )
        .eq("id", patientId)
        .single();

      if (patientError) throw patientError;
      const { data: allergyData, error: allergyError } = await supabase
        .from("patient_allergies")
        .select(
          `
        allergy_id (allergy_name), severity_id (severity_name), reaction_description
      `
        )
        .eq("patient_id", patientId);

      if (allergyError) throw allergyError;
      setSelectedPatient({ ...userData, ...patientData });
      setPatientAllergies(allergyData || []);
      setActiveTab("prescription");
    } catch (error) {
      console.error("Error selecting patient:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterDrugs = () => {
    if (!drugSearchTerm) {
      setFilteredDrugs(drugs);
      return;
    }

    const filtered = drugs.filter(
      (drug) =>
        drug.drug_name.toLowerCase().includes(drugSearchTerm.toLowerCase()) ||
        drug.generic_name?.toLowerCase().includes(drugSearchTerm.toLowerCase())
    );
    setFilteredDrugs(filtered);
  };

  const checkDrugInteractions = () => {
    const warnings = [];
    const currentDrugs = currentPrescription.items.map(
      (item) => item.drug_name
    );

    currentDrugs.forEach((drug) => {
      if (drugInteractions[drug]) {
        drugInteractions[drug].forEach((interactingDrug) => {
          if (currentDrugs.includes(interactingDrug)) {
            warnings.push(`${drug} may interact with ${interactingDrug}`);
          }
        });
      }
    });

    // Check allergies
    currentDrugs.forEach((drug) => {
      patientAllergies.forEach((allergy) => {
        if (
          drug
            .toLowerCase()
            .includes(allergy.allergy_id.allergy_name.toLowerCase())
        ) {
          warnings.push(
            `PATIENT ALLERGY: ${drug} contraindicated due to ${allergy.allergy_id.allergy_name} allergy`
          );
        }
      });
    });

    setInteractionWarnings(warnings);
  };

  const calculateDosage = (drug, patientWeight, condition) => {
    // Simplified dosage calculation based on WHO guidelines
    const dosageRules = {
      "Artemether-lumefantrine": (weight) => {
        if (weight < 15) return "1 tablet twice daily";
        if (weight < 25) return "2 tablets twice daily";
        if (weight < 35) return "3 tablets twice daily";
        return "4 tablets twice daily";
      },
      Azithromycin: () => "500mg once daily",
      Ciprofloxacin: () => "500mg twice daily",
      default: () => "As prescribed",
    };

    return dosageRules[drug]?.(patientWeight) || dosageRules.default();
  };

  const addDrugToPrescription = (drug) => {
    setCurrentPrescription((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          drug_id: drug.id,
          drug_name: drug.drug_name,
          dosage: drug.dosage,
          dosage_instructions: "",
          duration_days: 7,
          quantity: 10,
          calculated_dosage: calculateDosage(drug.drug_name, 70), // Default weight
        },
      ],
    }));
    setDrugSearchTerm("");
  };

  const removeDrugFromPrescription = (index) => {
    setCurrentPrescription((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updatePrescriptionItem = (index, field, value) => {
    setCurrentPrescription((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const applyTreatmentGuideline = (disease) => {
    const guideline = treatmentGuidelines[disease];
    if (!guideline) return;

    // Clear current items and add guideline drugs
    setCurrentPrescription((prev) => ({
      ...prev,
      items: guideline.firstLine
        .map((drug) => {
          const foundDrug = drugs.find((d) => d.drug_name === drug.drug);
          return foundDrug
            ? {
                drug_id: foundDrug.id,
                drug_name: foundDrug.drug_name,
                dosage: drug.dosage,
                dosage_instructions: `${drug.dosage} ${drug.frequency} for ${drug.duration} days`,
                duration_days: drug.duration,
                quantity:
                  drug.duration * (drug.frequency.includes("twice") ? 2 : 1),
                calculated_dosage: drug.dosage,
              }
            : null;
        })
        .filter(Boolean),
    }));
  };

  const savePrescription = async () => {
    if (!selectedPatient || currentPrescription.items.length === 0) {
      alert("Please select a patient and add at least one medication");
      return;
    }

    try {
      setLoading(true);

      // Get prescription status ID for 'active'
      const { data: status } = await supabase
        .from("prescription_statuses")
        .select("id")
        .eq("status_code", "active")
        .single();

      // Create prescription
      const { data: prescription, error: presError } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: selectedPatient.id,
          doctor_id: user.id,
          diagnosis_id: currentPrescription.diagnosis_id || null,
          prescription_date: new Date().toISOString().split("T")[0],
          status_id: status?.id,
          notes: currentPrescription.notes,
        })
        .select()
        .single();

      if (presError) throw presError;

      // Add prescription items
      for (const item of currentPrescription.items) {
        await supabase.from("prescription_items").insert({
          prescription_id: prescription.id,
          drug_id: item.drug_id,
          quantity: item.quantity,
          dosage_instructions: item.dosage_instructions,
          duration_days: item.duration_days,
        });
      }

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type_id: await getActivityTypeId("create_prescription"),
        table_name: "prescriptions",
        record_id: prescription.id,
        new_values: {
          patient_id: selectedPatient.id,
          items_count: currentPrescription.items.length,
        },
      });

      alert("Prescription saved successfully!");

      // Reset form
      setCurrentPrescription({ diagnosis_id: "", notes: "", items: [] });
      await fetchPatientData(selectedPatient.id); // Refresh history
    } catch (error) {
      console.error("Error saving prescription:", error);
      alert("Error saving prescription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeId = async (activityCode) => {
    const { data } = await supabase
      .from("activity_types")
      .select("id")
      .eq("activity_code", activityCode)
      .single();
    return data?.id;
  };

  const renderPatientSelection = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Select Patient</h3>
        <p className="text-sm text-gray-600">
          Choose a patient to create prescription
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-25 transition-all"
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
                  {patient.appointmentReason && (
                    <p className="text-sm text-gray-500">
                      Reason: {patient.appointmentReason}
                    </p>
                  )}
                </div>
                <PlusIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
        {patients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No patients with appointments today</p>
            <button
              onClick={() => navigate("/doctor-medical-records")}
              className="btn-primary mt-4"
            >
              Search All Patients
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPrescriptionForm = () => (
    <div className="space-y-6">
      {/* Patient Info Header */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Prescription for {selectedPatient?.first_name}{" "}
                {selectedPatient?.last_name}
              </h3>
              <p className="text-sm text-gray-600">
                Age:{" "}
                {selectedPatient?.date_of_birth
                  ? new Date().getFullYear() -
                    new Date(selectedPatient.date_of_birth).getFullYear()
                  : "N/A"}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("history")}
              className="btn-secondary"
            >
              View Prescription History
            </button>
          </div>
        </div>
      </div>

      {/* Treatment Guidelines */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            WHO/MOH Treatment Guidelines
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(treatmentGuidelines).map((disease) => (
              <div key={disease} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{disease}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  {treatmentGuidelines[disease].firstLine.map((drug, index) => (
                    <div key={index}>
                      • {drug.drug}: {drug.dosage} {drug.frequency}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => applyTreatmentGuideline(disease)}
                  className="btn-primary text-xs mt-3 w-full"
                >
                  Apply Guideline
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drug Search and Selection */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Add Medications
          </h3>
        </div>
        <div className="p-6">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search medications..."
              value={drugSearchTerm}
              onChange={(e) => setDrugSearchTerm(e.target.value)}
              className="input-medical pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {filteredDrugs.slice(0, 12).map((drug) => (
              <button
                key={drug.id}
                onClick={() => addDrugToPrescription(drug)}
                className="text-left p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-25 transition-all"
              >
                <div className="font-medium text-gray-900">
                  {drug.drug_name}
                </div>
                {drug.generic_name && (
                  <div className="text-sm text-gray-600">
                    {drug.generic_name}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {drug.dosage} • {drug.form_id.form_name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Prescription Items */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Current Prescription
          </h3>
        </div>
        <div className="p-6">
          {currentPrescription.items.length > 0 ? (
            <div className="space-y-4">
              {currentPrescription.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {item.drug_name}
                      </h4>
                      <p className="text-sm text-gray-600">{item.dosage}</p>
                    </div>
                    <button
                      onClick={() => removeDrugFromPrescription(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dosage Instructions
                      </label>
                      <input
                        type="text"
                        value={item.dosage_instructions}
                        onChange={(e) =>
                          updatePrescriptionItem(
                            index,
                            "dosage_instructions",
                            e.target.value
                          )
                        }
                        className="input-medical text-sm"
                        placeholder="e.g., 1 tablet twice daily"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        value={item.duration_days}
                        onChange={(e) =>
                          updatePrescriptionItem(
                            index,
                            "duration_days",
                            parseInt(e.target.value)
                          )
                        }
                        className="input-medical text-sm"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updatePrescriptionItem(
                            index,
                            "quantity",
                            parseInt(e.target.value)
                          )
                        }
                        className="input-medical text-sm"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center space-x-2">
                    <CalculatorIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Calculated: {item.calculated_dosage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BeakerIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No medications added to prescription</p>
              <p className="text-sm">Search and add medications above</p>
            </div>
          )}

          {/* Prescription Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prescription Notes
            </label>
            <textarea
              rows="3"
              value={currentPrescription.notes}
              onChange={(e) =>
                setCurrentPrescription((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="Additional instructions, precautions, or follow-up information..."
            />
          </div>
        </div>
      </div>

      {/* Interaction Warnings */}
      {interactionWarnings.length > 0 && (
        <div className="card-medical border-yellow-200">
          <div className="px-6 py-4 border-b bg-yellow-50">
            <h3 className="text-lg font-semibold text-yellow-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Drug Interaction Warnings
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {interactionWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start text-sm text-yellow-800"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  {warning}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Prescription */}
      <div className="flex justify-between">
        <button
          onClick={() => setActiveTab("patient")}
          className="btn-secondary"
        >
          ← Back to Patient Selection
        </button>
        <button
          onClick={savePrescription}
          disabled={loading || currentPrescription.items.length === 0}
          className="btn-primary"
        >
          {loading ? "Saving..." : "Save Prescription"}
        </button>
      </div>
    </div>
  );

  const renderPrescriptionHistory = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Prescription History
          </h3>
          <button
            onClick={() => setActiveTab("prescription")}
            className="btn-primary"
          >
            ← Back to Current Prescription
          </button>
        </div>
      </div>
      <div className="p-6">
        {prescriptionHistory.length > 0 ? (
          <div className="space-y-4">
            {prescriptionHistory.map((prescription) => (
              <div key={prescription.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Prescription from{" "}
                      {new Date(
                        prescription.prescription_date
                      ).toLocaleDateString()}
                    </h4>
                    {prescription.diagnosis_id && (
                      <p className="text-sm text-gray-600">
                        For: {prescription.diagnosis_id.disease_id.disease_name}
                      </p>
                    )}
                    {prescription.notes && (
                      <p className="text-sm text-gray-600">
                        Notes: {prescription.notes}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      prescription.status_id.status_name === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {prescription.status_id.status_name}
                  </span>
                </div>

                <div className="space-y-2">
                  {prescription.prescription_items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {item.drug_id.drug_name}
                        </span>
                        <span className="text-gray-600 ml-2">
                          {item.drug_id.dosage}
                        </span>
                      </div>
                      <div className="text-right">
                        <div>{item.dosage_instructions}</div>
                        <div className="text-gray-500">
                          {item.duration_days} days • Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No prescription history found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPatientAllergies = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Patient Allergies
        </h3>
      </div>
      <div className="p-6">
        {patientAllergies.length > 0 ? (
          <div className="space-y-3">
            {patientAllergies.map((allergy, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div>
                  <span className="font-medium text-red-900">
                    {allergy.allergy_id.allergy_name}
                  </span>
                  <span className="ml-2 text-sm text-red-700">
                    ({allergy.severity_id.severity_name})
                  </span>
                  {allergy.reaction_description && (
                    <p className="text-sm text-red-600 mt-1">
                      {allergy.reaction_description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-green-600">
            <CheckCircleIcon className="h-12 w-12 mx-auto mb-2" />
            <p>No known allergies</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Treatment & Prescription Management
        </h1>
        <p className="text-gray-600">
          Create prescriptions with drug interaction checks and treatment
          guidelines
        </p>
      </div>

      {activeTab === "patient" && renderPatientSelection()}

      {activeTab === "prescription" && selectedPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Prescription Form */}
          <div className="lg:col-span-3">{renderPrescriptionForm()}</div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {renderPatientAllergies()}

            {/* Quick Actions */}
            <div className="card-medical">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Quick Actions
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() =>
                    navigate("/doctor-diagnosis", {
                      state: { patientId: selectedPatient.id },
                    })
                  }
                  className="w-full btn-secondary text-left p-3 rounded-lg"
                >
                  Create New Diagnosis
                </button>
                <button
                  onClick={() =>
                    navigate("/doctor-medical-records", {
                      state: { patientId: selectedPatient.id },
                    })
                  }
                  className="w-full btn-secondary text-left p-3 rounded-lg"
                >
                  View Medical Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && renderPrescriptionHistory()}
    </DashboardLayout>
  );
};

export default DoctorPrescriptions;
