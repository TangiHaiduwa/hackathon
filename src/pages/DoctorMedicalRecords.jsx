// DoctorMedicalRecords.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  TruckIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  EyeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  LightBulbIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const DoctorMedicalRecords = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientRecords, setPatientRecords] = useState(null);
  const [activeTab, setActiveTab] = useState("search");
  const [soapNote, setSoapNote] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [newLabResult, setNewLabResult] = useState({
    test_name: "",
    result: "",
    units: "",
    reference_range: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
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
      fetchTodaysPatients();

      // Check for patient ID in URL parameters
      const patientId = searchParams.get("patient");
      if (patientId) {
        handlePatientSelect(patientId);
      }
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (user) {
      fetchTodaysPatients();
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

  const fetchTodaysPatients = async () => {
    if (!user) return; // Add this check
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(
          "id, patient_id, appointment_date, appointment_time, status_id (status_name)"
        )
        .eq("doctor_id", user.id)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true });

      if (apptError) throw apptError;

      const patientIds = [...new Set(apptData.map((apt) => apt.patient_id))];
      const { data: patientData, error: patientError } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, date_of_birth, phone_number, email, address"
        )
        .in("id", patientIds);

      if (patientError) throw patientError;

      const { data: patientDetails, error: detailsError } = await supabase
        .from("patients")
        .select(
          "id, blood_type_id, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number"
        )
        .in("id", patientIds);

      if (detailsError) throw detailsError;

      const patientMap = new Map(patientData.map((p) => [p.id, p]));
      const detailsMap = new Map(patientDetails.map((p) => [p.id, p]));
      const uniquePatients = apptData
        .map((apt) => {
          const userData = patientMap.get(apt.patient_id);
          const patientData = detailsMap.get(apt.patient_id);
          return userData
            ? {
                ...userData,
                ...patientData,
                appointmentTime: apt.appointment_time,
                status: apt.status_id.status_name,
              }
            : null;
        })
        .filter((p) => p); // Filter out nulls

      setPatients(uniquePatients);
    } catch (error) {
      console.error("Error fetching today's patients:", error.message);
    }
  };

  const searchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select(
          `
          id,
          first_name,
          last_name,
          date_of_birth,
          phone_number,
          email,
          address,
          users!inner (
            role_id (role_name)
          )
        `
        )
        .or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`
        )
        .limit(20);

      if (error) throw error;

      setPatients(data);
    } catch (error) {
      console.error("Error searching patients:", error);
    }
  };

  const fetchPatientRecords = async (patientId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select(
          `
          id,
          first_name,
          last_name,
          date_of_birth,
          phone_number,
          email,
          address,
          emergency_contact_name,
          emergency_contact_phone,
          insurance_provider,
          insurance_number,
          blood_type_id (blood_type_code, description),
          
          // Medical History
          allergies: patient_allergies (
            allergy_id (allergy_name),
            severity_id (severity_name),
            reaction_description,
            diagnosed_date
          ),
          conditions: patient_conditions (
            condition_id (condition_name),
            diagnosis_date,
            status_id (status_name),
            notes
          ),
          diagnoses: medical_diagnoses (
            id,
            disease_id (disease_name, icd_code),
            diagnosis_date,
            severity,
            notes,
            doctor_id (first_name, last_name),
            status_id (status_name)
          ),
          prescriptions: prescriptions (
            id,
            prescription_date,
            status_id (status_name),
            notes,
            prescription_items (
              drug_id (drug_name, dosage),
              dosage_instructions,
              duration_days
            )
          ),
          vital_signs (
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            temperature,
            respiratory_rate,
            oxygen_saturation,
            recorded_at,
            taken_by (first_name, last_name)
          ),
          medical_notes (
            id,
            title,
            content,
            note_type_id (type_name),
            created_at,
            staff_id (first_name, last_name)
          ),
          lab_results (
            id,
            test_name,
            result,
            units,
            reference_range,
            notes,
            performed_at,
            ordered_by (first_name, last_name)
          )
        `
        )
        .eq("id", patientId)
        .single();

      if (error) throw error;
      setPatientRecords(data);
      setActiveTab("records");
    } catch (error) {
      console.error("Error fetching patient records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      await fetchPatientRecords(patientId);
    }
  };

  const saveSOAPNote = async () => {
    if (!selectedPatient || !soapNote.subjective || !soapNote.assessment) {
      alert("Please fill in at least Subjective and Assessment sections");
      return;
    }

    try {
      setLoading(true);

      // Get SOAP note type ID
      const { data: noteType } = await supabase
        .from("note_types")
        .select("id")
        .eq("type_name", "SOAP Note")
        .single();

      const { error } = await supabase.from("medical_notes").insert({
        patient_id: selectedPatient.id,
        staff_id: user.id,
        note_type_id: noteType?.id,
        title: `SOAP Note - ${new Date().toLocaleDateString()}`,
        content: JSON.stringify(soapNote),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type_id: await getActivityTypeId("create_note"),
        table_name: "medical_notes",
        record_id: selectedPatient.id,
        new_values: { note_type: "SOAP", patient_id: selectedPatient.id },
      });

      alert("SOAP note saved successfully!");
      setSoapNote({ subjective: "", objective: "", assessment: "", plan: "" });
      await fetchPatientRecords(selectedPatient.id); // Refresh records
    } catch (error) {
      console.error("Error saving SOAP note:", error);
      alert("Error saving SOAP note. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveLabResult = async () => {
    if (!selectedPatient || !newLabResult.test_name || !newLabResult.result) {
      alert("Please fill in test name and result");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("lab_results").insert({
        patient_id: selectedPatient.id,
        test_name: newLabResult.test_name,
        result: newLabResult.result,
        units: newLabResult.units,
        reference_range: newLabResult.reference_range,
        notes: newLabResult.notes,
        performed_at: new Date().toISOString(),
        ordered_by: user.id,
      });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type_id: await getActivityTypeId("add_lab_result"),
        table_name: "lab_results",
        record_id: selectedPatient.id,
        new_values: { test_name: newLabResult.test_name },
      });

      alert("Lab result saved successfully!");
      setNewLabResult({
        test_name: "",
        result: "",
        units: "",
        reference_range: "",
        notes: "",
      });
      await fetchPatientRecords(selectedPatient.id); // Refresh records
    } catch (error) {
      console.error("Error saving lab result:", error);
      alert("Error saving lab result. Please try again.");
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

  const renderPatientSearch = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Search Patients</h3>
        <p className="text-sm text-gray-600">Search by name or patient ID</p>
      </div>
      <div className="p-6">
        <div className="relative mb-6">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-medical pl-10"
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            {searchTerm ? "Search Results" : "Today's Appointments"}
          </h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-25 transition-all"
                onClick={() => handlePatientSelect(patient.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </h5>
                    <p className="text-sm text-gray-600">
                      DOB:{" "}
                      {patient.date_of_birth
                        ? new Date(patient.date_of_birth).toLocaleDateString()
                        : "N/A"}{" "}
                      | ID: {patient.id.substring(0, 8)}...
                    </p>
                    {patient.appointmentTime && (
                      <p className="text-sm text-gray-500">
                        Appointment: {patient.appointmentTime.substring(0, 5)} -{" "}
                        {patient.status}
                      </p>
                    )}
                  </div>
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>
                  {searchTerm ? "No patients found" : "No appointments today"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPatientDemographics = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Patient Demographics
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Personal Information
            </h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.first_name} {patientRecords.last_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Date of Birth
                </dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.date_of_birth
                    ? new Date(
                        patientRecords.date_of_birth
                      ).toLocaleDateString()
                    : "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact</dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.phone_number || "N/A"}
                </dd>
                <dd className="text-sm text-gray-900">
                  {patientRecords.email || "N/A"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.address || "N/A"}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Medical Information
            </h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Blood Type
                </dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.blood_type_id?.blood_type_code || "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Insurance</dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.insurance_provider || "None"}
                </dd>
                <dd className="text-sm text-gray-900">
                  {patientRecords.insurance_number || ""}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Emergency Contact
                </dt>
                <dd className="text-sm text-gray-900">
                  {patientRecords.emergency_contact_name || "None"}
                </dd>
                <dd className="text-sm text-gray-900">
                  {patientRecords.emergency_contact_phone || ""}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAllergiesAlerts = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
          Allergies & Alerts
        </h3>
      </div>
      <div className="p-6">
        {patientRecords.allergies && patientRecords.allergies.length > 0 ? (
          <div className="space-y-3">
            {patientRecords.allergies.map((allergy, index) => (
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
                <span className="text-sm text-red-600">
                  Diagnosed:{" "}
                  {new Date(allergy.diagnosed_date).toLocaleDateString()}
                </span>
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

  const renderMedicalHistory = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Medical History</h3>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {/* Diagnoses */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Past Diagnoses</h4>
            {patientRecords.diagnoses && patientRecords.diagnoses.length > 0 ? (
              <div className="space-y-3">
                {patientRecords.diagnoses.map((diagnosis) => (
                  <div key={diagnosis.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">
                          {diagnosis.disease_id.disease_name}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          (ICD-10: {diagnosis.disease_id.icd_code})
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {diagnosis.notes}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>
                          {new Date(
                            diagnosis.diagnosis_date
                          ).toLocaleDateString()}
                        </div>
                        <div>
                          Dr. {diagnosis.doctor_id.first_name}{" "}
                          {diagnosis.doctor_id.last_name}
                        </div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${
                            diagnosis.severity === "severe"
                              ? "bg-red-100 text-red-800"
                              : diagnosis.severity === "moderate"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {diagnosis.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No diagnosis history</p>
            )}
          </div>

          {/* Medications */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Medication History
            </h4>
            {patientRecords.prescriptions &&
            patientRecords.prescriptions.length > 0 ? (
              <div className="space-y-3">
                {patientRecords.prescriptions.map((prescription) => (
                  <div key={prescription.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">
                          {prescription.prescription_items
                            .map((item) => item.drug_id.drug_name)
                            .join(", ")}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {prescription.notes}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>
                          {new Date(
                            prescription.prescription_date
                          ).toLocaleDateString()}
                        </div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${
                            prescription.status_id.status_name === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {prescription.status_id.status_name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No medication history</p>
            )}
          </div>

          {/* Lab Results */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Lab Results</h4>
            {patientRecords.lab_results &&
            patientRecords.lab_results.length > 0 ? (
              <div className="space-y-3">
                {patientRecords.lab_results.map((lab) => (
                  <div key={lab.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">
                          {lab.test_name}
                        </span>
                        <p className="text-lg font-bold text-blue-600">
                          {lab.result} {lab.units}
                        </p>
                        {lab.reference_range && (
                          <p className="text-sm text-gray-600">
                            Ref: {lab.reference_range}
                          </p>
                        )}
                        {lab.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            {lab.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>
                          {new Date(lab.performed_at).toLocaleDateString()}
                        </div>
                        <div>
                          By: {lab.ordered_by.first_name}{" "}
                          {lab.ordered_by.last_name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No lab results</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSOAPNoteForm = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">New SOAP Note</h3>
        <p className="text-sm text-gray-600">Document current consultation</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subjective (S)
            </label>
            <textarea
              rows="3"
              value={soapNote.subjective}
              onChange={(e) =>
                setSoapNote((prev) => ({ ...prev, subjective: e.target.value }))
              }
              className="input-medical"
              placeholder="Patient's complaints, symptoms, history in their own words..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objective (O)
            </label>
            <textarea
              rows="3"
              value={soapNote.objective}
              onChange={(e) =>
                setSoapNote((prev) => ({ ...prev, objective: e.target.value }))
              }
              className="input-medical"
              placeholder="Vital signs, physical exam findings, lab results..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment (A)
            </label>
            <textarea
              rows="3"
              value={soapNote.assessment}
              onChange={(e) =>
                setSoapNote((prev) => ({ ...prev, assessment: e.target.value }))
              }
              className="input-medical"
              placeholder="Diagnosis, differential diagnosis, problem list..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan (P)
            </label>
            <textarea
              rows="3"
              value={soapNote.plan}
              onChange={(e) =>
                setSoapNote((prev) => ({ ...prev, plan: e.target.value }))
              }
              className="input-medical"
              placeholder="Treatment plan, medications, follow-up, patient education..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={saveSOAPNote}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Saving..." : "Save SOAP Note"}
            </button>
            <button
              onClick={() =>
                navigate("/doctor-diagnosis", {
                  state: { patientId: selectedPatient.id },
                })
              }
              className="btn-secondary flex-1"
            >
              Create Full Diagnosis
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLabResultForm = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Add Lab Result</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Name
            </label>
            <input
              type="text"
              value={newLabResult.test_name}
              onChange={(e) =>
                setNewLabResult((prev) => ({
                  ...prev,
                  test_name: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="e.g., Complete Blood Count"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Result
            </label>
            <input
              type="text"
              value={newLabResult.result}
              onChange={(e) =>
                setNewLabResult((prev) => ({ ...prev, result: e.target.value }))
              }
              className="input-medical"
              placeholder="e.g., 12.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Units
            </label>
            <input
              type="text"
              value={newLabResult.units}
              onChange={(e) =>
                setNewLabResult((prev) => ({ ...prev, units: e.target.value }))
              }
              className="input-medical"
              placeholder="e.g., g/dL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Range
            </label>
            <input
              type="text"
              value={newLabResult.reference_range}
              onChange={(e) =>
                setNewLabResult((prev) => ({
                  ...prev,
                  reference_range: e.target.value,
                }))
              }
              className="input-medical"
              placeholder="e.g., 11.5-15.5"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              rows="3"
              value={newLabResult.notes}
              onChange={(e) =>
                setNewLabResult((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="input-medical"
              placeholder="Additional notes or interpretations..."
            />
          </div>
        </div>

        <button
          onClick={saveLabResult}
          disabled={loading}
          className="btn-primary w-full mt-4"
        >
          {loading ? "Saving..." : "Save Lab Result"}
        </button>
      </div>
    </div>
  );

  if (loading && activeTab === "records") {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading patient records...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Patient Medical Records
        </h1>
        <p className="text-gray-600">
          Comprehensive patient history and clinical documentation
        </p>
      </div>

      {activeTab === "search" && renderPatientSearch()}

      {activeTab === "records" && patientRecords && (
        <div className="space-y-6">
          {/* Patient Header */}
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {patientRecords.first_name} {patientRecords.last_name}
                  </h2>
                  <p className="text-gray-600">Medical Records</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setActiveTab("soap")}
                    className="btn-primary flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New SOAP Note
                  </button>
                  <button
                    onClick={() => setActiveTab("lab")}
                    className="btn-secondary flex items-center"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Lab Result
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Demographics & Allergies */}
            <div className="lg:col-span-1 space-y-6">
              {renderPatientDemographics()}
              {renderAllergiesAlerts()}
            </div>

            {/* Right Column - Medical History */}
            <div className="lg:col-span-2">{renderMedicalHistory()}</div>
          </div>
        </div>
      )}

      {activeTab === "soap" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderSOAPNoteForm()}</div>
          <div className="lg:col-span-1">
            <div className="card-medical">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  SOAP Guidelines
                </h3>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div>
                  <strong>Subjective:</strong> Patient's symptoms, concerns,
                  medical history
                </div>
                <div>
                  <strong>Objective:</strong> Measurable findings, exam results,
                  vital signs
                </div>
                <div>
                  <strong>Assessment:</strong> Diagnosis, clinical impression,
                  problem list
                </div>
                <div>
                  <strong>Plan:</strong> Treatment, medications, follow-up,
                  education
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "lab" && renderLabResultForm()}

      {/* Navigation Back */}
      {(activeTab === "records" ||
        activeTab === "soap" ||
        activeTab === "lab") && (
        <div className="mt-6">
          <button
            onClick={() => setActiveTab("search")}
            className="btn-secondary"
          >
            ← Back to Patient Search
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorMedicalRecords;
