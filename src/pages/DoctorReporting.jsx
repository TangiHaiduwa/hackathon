// DoctorReporting.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  ChartBarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BeakerIcon,
  TruckIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  PlusIcon,
  HomeIcon,
  LightBulbIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const DoctorReporting = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportTemplates, setReportTemplates] = useState([]);
  const [activeReportType, setActiveReportType] = useState("case");
  const [reportContent, setReportContent] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportRef = useRef();

  // Navigation for sidebar
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

  // Report types
  const reportTypes = {
    case: {
      name: "Patient Case Report",
      icon: DocumentTextIcon,
      description: "Comprehensive patient case summary",
    },
    prescription: {
      name: "Prescription Print",
      icon: PrinterIcon,
      description: "Printable prescription form",
    },
    certificate: {
      name: "Medical Certificate",
      icon: DocumentArrowDownIcon,
      description: "Official medical certification",
    },
    referral: {
      name: "Referral Letter",
      icon: DocumentArrowDownIcon,
      description: "Specialist referral document",
    },
  };

  // Certificate types
  const certificateTypes = [
    "Sick Leave Certificate",
    "Fitness Certificate",
    "Medical Fitness Certificate",
    "Insurance Medical Report",
    "School/College Medical Certificate",
  ];

  // Specialist types for referrals
  const specialistTypes = [
    "Cardiologist",
    "Dermatologist",
    "Neurologist",
    "Orthopedic Surgeon",
    "Psychiatrist",
    "Gastroenterologist",
    "Endocrinologist",
    "Ophthalmologist",
    "ENT Specialist",
    "Pulmonologist",
  ];

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPatients();
      fetchReportTemplates();
      fetchGeneratedReports();

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
          id, first_name, last_name, email, phone_number,
          role_id (role_name),
          medical_staff (
            specialization_id (specialization_name),
            license_number,
            department_id (department_name)
          )
        `
        )
        .eq("id", authUser.id)
        .single();

      setUser({
        id: doctorProfile.id,
        name: `${doctorProfile.first_name} ${doctorProfile.last_name}`,
        email: doctorProfile.email,
        phone: doctorProfile.phone_number,
        role: doctorProfile.role_id.role_name,
        specialization:
          doctorProfile.medical_staff?.[0]?.specialization_id
            ?.specialization_name,
        licenseNumber: doctorProfile.medical_staff?.[0]?.license_number,
        department:
          doctorProfile.medical_staff?.[0]?.department_id?.department_name,
      });
    } catch (error) {
      console.error("Error fetching doctor data:", error);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(
          `
        patient_id,
        patients!inner(
          id,
          users!inner(
            id,
            first_name,
            last_name,
            date_of_birth,
            phone_number,
            address
          )
        )
      `
        )
        .eq("doctor_id", user.id)
        .not("patient_id", "is", null)
        .limit(50);

      if (error) throw error;

      // Get unique patients and extract user data
      const uniquePatients = data.reduce((acc, prescription) => {
        const patient = prescription.patients?.users;
        if (patient && !acc.find((p) => p.id === patient.id)) {
          acc.push(patient);
        }
        return acc;
      }, []);

      setPatients(uniquePatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchReportTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("report_types")
        .select("*")
        .order("type_name");

      if (error) throw error;
      setReportTemplates(data || []);
    } catch (error) {
      console.error("Error fetching report templates:", error);
    }
  };

  const fetchGeneratedReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `
          id,
          title,
          report_type_id (type_name, type_code),
          generated_at,
          report_data
        `
        )
        .eq("generated_by", user.id)
        .order("generated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching generated reports:", error);
    }
  };

  const fetchPatientData = async (patientId) => {
    try {
      setLoading(true);

      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", patientId)
        .single();

      if (userError) throw userError;

      // Fetch patient-specific data
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(
          `
        id,
        emergency_contact_name,
        emergency_contact_phone,
        insurance_provider,
        insurance_number,
        blood_type_id (blood_type_code)
      `
        )
        .eq("id", patientId)
        .single();

      if (patientError) throw patientError;

      // Fetch medical history data separately
      const { data: allergies } = await supabase
        .from("patient_allergies")
        .select(
          `
        allergy_id (allergy_name),
        severity_id (severity_name)
      `
        )
        .eq("patient_id", patientId);

      const { data: conditions } = await supabase
        .from("patient_conditions")
        .select(
          `
        condition_id (condition_name),
        diagnosis_date
      `
        )
        .eq("patient_id", patientId);

      const { data: diagnoses } = await supabase
        .from("medical_diagnoses")
        .select(
          `
        disease_id (disease_name, icd_code),
        diagnosis_date,
        severity,
        notes,
        doctor_id (first_name, last_name)
      `
        )
        .eq("patient_id", patientId)
        .order("diagnosis_date", { ascending: false });

      const { data: prescriptions } = await supabase
        .from("prescriptions")
        .select(
          `
        id,
        prescription_date,
        prescription_items (
          drug_id (drug_name, dosage),
          dosage_instructions,
          duration_days
        )
      `
        )
        .eq("patient_id", patientId)
        .order("prescription_date", { ascending: false });

      const { data: vitalSigns } = await supabase
        .from("vital_signs")
        .select("*")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(5);

      // Combine all data
      const combinedData = {
        ...userData,
        ...patientData,
        allergies: allergies || [],
        conditions: conditions || [],
        diagnoses: diagnoses || [],
        prescriptions: prescriptions || [],
        vital_signs: vitalSigns || [],
      };

      setPatientData(combinedData);
      initializeReportContent(combinedData);
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeReportContent = (patient) => {
    const baseContent = {
      patientName: `${patient.first_name} ${patient.last_name}`,
      patientAge: patient.date_of_birth
        ? new Date().getFullYear() -
          new Date(patient.date_of_birth).getFullYear()
        : "N/A",
      patientDOB: patient.date_of_birth
        ? new Date(patient.date_of_birth).toLocaleDateString()
        : "N/A",
      patientPhone: patient.phone_number || "N/A",
      patientAddress: patient.address || "N/A",
      doctorName: user?.name || "Dr. Unknown",
      doctorLicense: user?.licenseNumber || "N/A",
      doctorSpecialization: user?.specialization || "General Practitioner",
      reportDate: new Date().toLocaleDateString(),
      currentDate: new Date().toLocaleDateString(),
    };

    setReportContent(baseContent);
  };

  const handlePatientSelect = async (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      await fetchPatientData(patientId);
    }
  };

  const generateCaseReport = () => {
    if (!patientData) return "";

    const latestDiagnosis = patientData.diagnoses?.[0];
    const latestVitals = patientData.vital_signs?.[0];

    return `
      PATIENT CASE REPORT

      PATIENT INFORMATION:
      Name: ${reportContent.patientName}
      Date of Birth: ${reportContent.patientDOB} (Age: ${
      reportContent.patientAge
    })
      Contact: ${reportContent.patientPhone}
      Address: ${reportContent.patientAddress}
      Insurance: ${patientData.insurance_provider || "None"}

      MEDICAL HISTORY:
      ${
        patientData.conditions
          ?.map(
            (cond) =>
              `- ${cond.condition_id.condition_name} (Diagnosed: ${new Date(
                cond.diagnosis_date
              ).toLocaleDateString()})`
          )
          .join("\n") || "No significant medical history"
      }

      ALLERGIES:
      ${
        patientData.allergies
          ?.map(
            (allergy) =>
              `- ${allergy.allergy_id.allergy_name} (${allergy.severity_id.severity_name})`
          )
          .join("\n") || "No known allergies"
      }

      CURRENT DIAGNOSIS:
      ${
        latestDiagnosis
          ? `
        Condition: ${latestDiagnosis.disease_id.disease_name}
        ICD-10 Code: ${latestDiagnosis.disease_id.icd_code}
        Severity: ${latestDiagnosis.severity}
        Diagnosis Date: ${new Date(
          latestDiagnosis.diagnosis_date
        ).toLocaleDateString()}
        Notes: ${latestDiagnosis.notes || "None"}
      `
          : "No current diagnosis"
      }

      VITAL SIGNS (Latest):
      ${
        latestVitals
          ? `
        Blood Pressure: ${latestVitals.blood_pressure_systolic}/${
              latestVitals.blood_pressure_diastolic
            } mmHg
        Heart Rate: ${latestVitals.heart_rate} bpm
        Temperature: ${latestVitals.temperature} °C
        Recorded: ${new Date(latestVitals.recorded_at).toLocaleDateString()}
      `
          : "No recent vital signs recorded"
      }

      CURRENT MEDICATIONS:
      ${
        patientData.prescriptions
          ?.flatMap((prescription) =>
            prescription.prescription_items.map(
              (item) =>
                `- ${item.drug_id.drug_name} ${item.drug_id.dosage}: ${item.dosage_instructions}`
            )
          )
          .join("\n") || "No current medications"
      }

      ASSESSMENT:
      ${reportContent.assessment || "To be completed by physician"}

      RECOMMENDATIONS:
      ${reportContent.recommendations || "To be completed by physician"}

      PHYSICIAN'S SIGNATURE:
      ${reportContent.doctorName}
      ${reportContent.doctorSpecialization}
      License: ${reportContent.doctorLicense}
      Date: ${reportContent.reportDate}
    `;
  };

  const generatePrescription = () => {
    if (!patientData) return "";

    return `
      MEDICAL PRESCRIPTION

      Patient: ${reportContent.patientName}
      Date of Birth: ${reportContent.patientDOB}
      Date: ${reportContent.reportDate}

      PRESCRIBED MEDICATIONS:

      ${reportContent.medications || "No medications prescribed"}

      DOCTOR'S INSTRUCTIONS:
      ${reportContent.instructions || "Take as directed"}

      IMPORTANT NOTES:
      ${
        reportContent.prescriptionNotes ||
        "Complete the full course of treatment"
      }

      Prescribing Physician:
      ${reportContent.doctorName}
      ${reportContent.doctorSpecialization}
      License: ${reportContent.doctorLicense}
      Contact: ${user?.phone || "N/A"}

      --- This prescription is valid for 30 days ---
    `;
  };

  const generateMedicalCertificate = () => {
    return `
      MEDICAL CERTIFICATE

      This is to certify that ${reportContent.patientName}
      (Date of Birth: ${reportContent.patientDOB}) 
      was under my medical care from ${
        reportContent.certificateStartDate || "[Start Date]"
      } 
      to ${reportContent.certificateEndDate || "[End Date]"}.

      Type of Certificate: ${
        reportContent.certificateType || "Medical Certificate"
      }

      Medical Condition:
      ${
        reportContent.certificateCondition ||
        "Medical condition requiring attention"
      }

      Recommendations:
      ${
        reportContent.certificateRecommendations ||
        "Patient is advised to follow medical recommendations"
      }

      This certificate is issued for the purpose of:
      ${reportContent.certificatePurpose || "Medical documentation"}

      Physician's Details:
      Name: ${reportContent.doctorName}
      Qualification: ${reportContent.doctorSpecialization}
      License Number: ${reportContent.doctorLicense}
      Date Issued: ${reportContent.reportDate}

      Signature: _________________________
      Stamp: 
    `;
  };

  const generateReferralLetter = () => {
    return `
      REFERRAL LETTER

      To: ${reportContent.referralSpecialist || "Specialist Physician"}
      Department: ${reportContent.referralDepartment || "Specialist Department"}
      Hospital/Clinic: ${reportContent.referralFacility || "Medical Facility"}

      Dear Doctor,

      I am referring ${reportContent.patientName} (DOB: ${
      reportContent.patientDOB
    }) 
      for further evaluation and management.

      Reason for Referral:
      ${reportContent.referralReason || "Requires specialist evaluation"}

      Presenting Condition:
      ${reportContent.referralCondition || "Current medical condition"}

      Relevant History:
      ${reportContent.referralHistory || "Patient medical history"}

      Investigations Done:
      ${reportContent.referralInvestigations || "Relevant test results"}

      Current Medications:
      ${reportContent.referralMedications || "Current treatment regimen"}

      Specific Questions/Requests:
      ${
        reportContent.referralRequests ||
        "Please evaluate and manage accordingly"
      }

      Please feel free to contact me if you require any further information.

      Sincerely,

      ${reportContent.doctorName}
      ${reportContent.doctorSpecialization}
      ${user?.department || "Medical Department"}
      License: ${reportContent.doctorLicense}
      Contact: ${user?.phone || "N/A"}
      Date: ${reportContent.reportDate}
    `;
  };

  const generateReport = () => {
    switch (activeReportType) {
      case "case":
        return generateCaseReport();
      case "prescription":
        return generatePrescription();
      case "certificate":
        return generateMedicalCertificate();
      case "referral":
        return generateReferralLetter();
      default:
        return "";
    }
  };

  const saveReport = async () => {
    if (!selectedPatient) {
      alert("Please select a patient first");
      return;
    }

    try {
      setGenerating(true);

      const reportType = reportTemplates.find(
        (t) => t.type_code === activeReportType
      );

      const { error } = await supabase.from("reports").insert({
        report_type_id: reportType?.id,
        title: `${reportTypes[activeReportType].name} - ${selectedPatient.first_name} ${selectedPatient.last_name}`,
        generated_by: user.id,
        report_data: {
          content: generateReport(),
          patient_id: selectedPatient.id,
          generated_data: reportContent,
          template_used: activeReportType,
        },
      });

      if (error) throw error;

      alert("Report saved successfully!");
      await fetchGeneratedReports();
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Error saving report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const printReport = () => {
    const printContent = reportRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([generateReport()], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${reportTypes[activeReportType].name}_${
      selectedPatient.first_name
    }_${selectedPatient.last_name}_${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderPatientSelection = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Select Patient</h3>
        <p className="text-sm text-gray-600">
          Choose a patient to generate reports
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
                  <p className="text-sm text-gray-500">
                    {patient.phone_number}
                  </p>
                </div>
                <EyeIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
        {patients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No patients found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderReportGenerator = () => (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Report Type</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(reportTypes).map(([key, report]) => (
              <button
                key={key}
                onClick={() => setActiveReportType(key)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  activeReportType === key
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <report.icon
                  className={`h-8 w-8 mb-2 ${
                    activeReportType === key ? "text-blue-600" : "text-gray-400"
                  }`}
                />
                <h4 className="font-medium text-gray-900">{report.name}</h4>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Customization */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Customize Report
          </h3>
        </div>
        <div className="p-6">
          {activeReportType === "case" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment
                </label>
                <textarea
                  rows="4"
                  value={reportContent.assessment || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      assessment: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="Clinical assessment and findings..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recommendations
                </label>
                <textarea
                  rows="4"
                  value={reportContent.recommendations || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      recommendations: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="Treatment recommendations and follow-up..."
                />
              </div>
            </div>
          )}

          {activeReportType === "prescription" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medications
                </label>
                <textarea
                  rows="6"
                  value={reportContent.medications || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      medications: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="List medications with dosages and instructions..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  rows="3"
                  value={reportContent.instructions || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="Special instructions for the patient..."
                />
              </div>
            </div>
          )}

          {activeReportType === "certificate" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certificate Type
                </label>
                <select
                  value={reportContent.certificateType || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      certificateType: e.target.value,
                    }))
                  }
                  className="input-medical"
                >
                  <option value="">Select certificate type</option>
                  {certificateTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose
                </label>
                <input
                  type="text"
                  value={reportContent.certificatePurpose || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      certificatePurpose: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="Purpose of this certificate..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reportContent.certificateStartDate || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      certificateStartDate: e.target.value,
                    }))
                  }
                  className="input-medical"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={reportContent.certificateEndDate || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      certificateEndDate: e.target.value,
                    }))
                  }
                  className="input-medical"
                />
              </div>
            </div>
          )}

          {activeReportType === "referral" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialist Type
                </label>
                <select
                  value={reportContent.referralSpecialist || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      referralSpecialist: e.target.value,
                    }))
                  }
                  className="input-medical"
                >
                  <option value="">Select specialist</option>
                  {specialistTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facility
                </label>
                <input
                  type="text"
                  value={reportContent.referralFacility || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      referralFacility: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="Hospital or clinic name..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Referral
                </label>
                <textarea
                  rows="3"
                  value={reportContent.referralReason || ""}
                  onChange={(e) =>
                    setReportContent((prev) => ({
                      ...prev,
                      referralReason: e.target.value,
                    }))
                  }
                  className="input-medical"
                  placeholder="Detailed reason for referral..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Preview */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Report Preview
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={printReport}
              className="btn-secondary flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={downloadReport}
              className="btn-secondary flex items-center"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={saveReport}
              disabled={generating}
              className="btn-primary flex items-center"
            >
              {generating ? "Saving..." : "Save Report"}
            </button>
          </div>
        </div>
        <div className="p-6">
          <div
            ref={reportRef}
            className="bg-white p-6 border rounded-lg font-mono text-sm whitespace-pre-line"
            style={{ minHeight: "400px" }}
          >
            {generateReport()}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReportHistory = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Generated Reports
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{report.title}</h4>
                  <p className="text-sm text-gray-600">
                    {report.report_type_id.type_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Generated:{" "}
                    {new Date(report.generated_at).toLocaleDateString()}
                  </p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  View Details
                </button>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No reports generated yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!selectedPatient) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        {renderPatientSelection()}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Medical Reporting
            </h1>
            <p className="text-gray-600">
              for {selectedPatient.first_name} {selectedPatient.last_name}
            </p>
          </div>
          <button
            onClick={() => setSelectedPatient(null)}
            className="btn-secondary"
          >
            Change Patient
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading patient data...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">{renderReportGenerator()}</div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Summary */}
            <div className="card-medical">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Patient Summary
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Name:</span>
                    <p>
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Age:</span>
                    <p>{reportContent.patientAge}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Contact:</span>
                    <p>{selectedPatient.phone_number}</p>
                  </div>
                  {patientData?.insurance_provider && (
                    <div>
                      <span className="font-medium text-gray-500">
                        Insurance:
                      </span>
                      <p>{patientData.insurance_provider}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Report History */}
            {renderReportHistory()}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorReporting;
