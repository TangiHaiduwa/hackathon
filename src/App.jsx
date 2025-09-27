import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";

// Dashboard Pages
import PatientDashboard from "./components/dashboard/PatientDashboard";
import DoctorDashboard from "./components/dashboard/DoctorDashboard";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import NurseDashboard from "./components/dashboard/NurseDashboard";
import PharmacistDashboard from "./components/dashboard/PharmacistDashboard";
import ReceptionistDashboard from "./components/dashboard/ReceptionistDashboard";

//Admins Routes
import UserManagement from "./components/admin/UserManagement";
import MedicalRecordsAdmin from "./components/admin/MedicalRecordsAdmin";
import PharmacyManagement from "./components/admin/PharmacyManagement";
import AppointmentManagement from "./components/admin/AppointmentManagement";
import AnalyticsReporting from "./components/admin/AnalyticsReporting";
import SystemConfiguration from "./components/admin/SystemConfiguration";
import SecurityAudit from "./components/admin/SecurityAudit";

// Pharmacy Routes
import PrescriptionsList from "./components/pharmacy/PrescriptionsList";
import InventoryManagement from "./components/pharmacy/InventoryManagement";
import DispensingManagement from "./components/pharmacy/DispensingManagement";
import PharmacyReports from "./components/pharmacy/PharmacyReports";
import DrugAdministration from "./components/pharmacy/DrugAdministration";
import DispensingWorkflow from "./components/pharmacy/DispensingWorkflow";

//Doctor Routes
import DoctorAppointments from "./pages/DoctorAppointments";
import DoctorMedicalRecords from "./pages/DoctorMedicalRecords";
import DoctorPrescriptions from "./pages/DoctorPrescriptions";
import DoctorPharmacy from "./pages/DoctorPharmacy";
import DoctorDrugAdmin from "./pages/DoctorDrugAdmin";
import DoctorReporting from "./pages/DoctorReporting";
import DoctorSearch from "./pages/DoctorSearch";
import DecisionSupport from "./pages/DecisionSupport";
import DoctorDiagnosis from "./pages/DoctorDiagnosis";

//Nurse Routes
import Vitals from "./components/nurse/Vitals";
import Medication from "./components/nurse/Medication";
import PatientCare from "./components/nurse/PatientCare";
import TreatmentRoomPage from "./components/nurse/TreatmentRoomPage";
import PatientRoundsPage from "./components/nurse/PatientRoundsPage";
import MedicalRecordsPage from "./components/nurse/MedicalRecordsPage";

//Receptionist Routes
import MedicalRecordsPage1 from "./components/receptionist/MedicalRecordsPage1";
import PatientRegistration from "./components/receptionist/PatientRegistration";
import ReceptionistAppointments from "./components/receptionist/ReceptionistAppointments";
import Scheduling from "./components/receptionist/Scheduling";

//Patient Routes
import SymptomChecker from './components/diagnosis/SymptomChecker';


// Feature Modules
import Appointment from "./pages/Appointment";
import Pharmacy from "./pages/Pharmacy";
import MedicalRecords from "./pages/MedicalRecords";
import PatientMedicalRecords from "./pages/PatientMedicalRecords";
import Reporting from "./pages/Reporting";

// Additional Pages for Navigation Links
// import PatientCare from './pages/PatientCare';
import Prescriptions from "./pages/Prescriptions";
import AppointmentsAdmin from "./pages/AppointmentsAdmin";
// import Vitals from './pages/Vitals';
// import Medication from './pages/Medication';

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Role-based Dashboards */}
            <Route path="/dashboard" element={<PatientDashboard />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/nurse-dashboard" element={<NurseDashboard />} />
            <Route
              path="/pharmacist-dashboard"
              element={<PharmacistDashboard />}
            />
            <Route
              path="/reception-dashboard"
              element={<ReceptionistDashboard />}
            />

            {/* Doctor Modules */}
            <Route
              path="/doctor-appointments"
              element={<DoctorAppointments />}
            />
            <Route
              path="/doctor-medical-records"
              element={<DoctorMedicalRecords />}
            />
            <Route
              path="/doctor-decision-support"
              element={<DecisionSupport />}
            />
            <Route
              path="/doctor-prescriptions"
              element={<DoctorPrescriptions />}
            />
            <Route path="/doctor-pharmacy" element={<DoctorPharmacy />} />
            <Route path="/doctor-drug-admin" element={<DoctorDrugAdmin />} />
            <Route path="/doctor-reporting" element={<DoctorReporting />} />
            <Route path="/doctor-search" element={<DoctorSearch />} />
            <Route path="/decision-support" element={<DoctorDiagnosis />} />
            {/* Nurse Modules */}
            <Route path="/nurse-medication" element={<Medication />} />
            <Route path="/nurse-patientcare" element={<PatientCare />} />
            <Route
              path="/nurse-treatmentroom"
              element={<TreatmentRoomPage />}
            />
            <Route path="/nurse-vitals" element={<Vitals />} />
            <Route path="/patient-rounds" element={<PatientRoundsPage />} />
            <Route path="/medical-records" element={<MedicalRecordsPage />} />

            {/* Symptom Checker */}
            <Route path="/diagnosis" element={<SymptomChecker />} />

            {/* Receptionist Modules */}
            <Route
              path="/receptionist/receptionist-appointments"
              element={<ReceptionistAppointments />}
            />
            <Route
              path="/receptionist/patient-registration"
              element={<PatientRegistration />}
            />
            <Route path="/receptionist/scheduling" element={<Scheduling />} />
            <Route
              path="/reception/medical-records1"
              element={<MedicalRecordsPage1 />}
            />

            {/* Pharmacy Modules */}
            <Route
              path="/pharmacy/prescriptions"
              element={<PrescriptionsList />}
            />
            <Route
              path="/pharmacy/inventory"
              element={<InventoryManagement />}
            />
            <Route
              path="/pharmacy/dispensing"
              element={<DispensingManagement />}
            />
            <Route path="/pharmacy/reports" element={<PharmacyReports />} />
            <Route
              path="/pharmacy/administration"
              element={<DrugAdministration />}
            />
            <Route
              path="/pharmacy/dispensing-workflow"
              element={<DispensingWorkflow />}
            />

            {/* Core Feature Modules */}
            <Route path="/doctor-diagnosis" element={<DoctorDiagnosis />} />
            <Route path="/appointment" element={<Appointment />} />
            <Route path="/pharmacy" element={<Pharmacy />} />
            <Route path="/medical-records" element={<MedicalRecords />} />
            <Route
              path="/patient-medical-records"
              element={<PatientMedicalRecords />}
            />
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route
              path="/medical-records-admin"
              element={<MedicalRecordsAdmin />}
            />
            <Route path="/pharmacy-admin" element={<PharmacyManagement />} />
            <Route
              path="/appointments-admin"
              element={<AppointmentManagement />}
            />
            <Route path="/analytics" element={<AnalyticsReporting />} />
            <Route path="/system-settings" element={<SystemConfiguration />} />
            <Route path="/security-audit" element={<SecurityAudit />} />

            {/* Additional Navigation Pages */}
            <Route path="/patient-care" element={<PatientCare />} />
            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/appointments" element={<AppointmentsAdmin />} />
            <Route path="/vitals" element={<Vitals />} />
            <Route path="/medication" element={<Medication />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
