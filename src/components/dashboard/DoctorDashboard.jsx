// DoctorDashboard.jsx (Improved Version)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import supabase from "../../lib/supabase";
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BeakerIcon,
  TruckIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  AcademicCapIcon,
  BellIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const DoctorDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    todaysAppointments: 0,
    activePatients: 0,
    pendingDiagnoses: 0,
    urgentCases: 0,
    prescriptionsPending: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [urgentCases, setUrgentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    // { name: 'Decision Support', href: '/doctor-decision-support', icon: LightBulbIcon },
    // { name: 'Resources', href: '/doctor-resources', icon: AcademicCapIcon },
  ];

  // Status configurations with better styling
  const statusConfigs = {
    confirmed: {
      label: "Confirmed",
      className: "bg-green-100 text-green-800 border-green-200",
      fullLabel: "Confirmed",
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      fullLabel: "Pending",
    },
    scheduled: {
      label: "Scheduled",
      className: "bg-blue-100 text-blue-800 border-blue-200",
      fullLabel: "Scheduled",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 border-red-200",
      fullLabel: "Cancelled",
    },
    severe: {
      label: "Severe",
      className: "bg-red-100 text-red-800 border-red-200",
      fullLabel: "Severe",
    },
    moderate: {
      label: "Moderate",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      fullLabel: "Moderate",
    },
    mild: {
      label: "Mild",
      className: "bg-green-100 text-green-800 border-green-200",
      fullLabel: "Mild",
    },
  };

  // Cache state to prevent reloads
  const [dataCache, setDataCache] = useState({
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000, // 5 minutes cache
  });

  useEffect(() => {
    const shouldRefetch =
      !dataCache.lastFetch ||
      Date.now() - dataCache.lastFetch > dataCache.cacheDuration;

    if (shouldRefetch) {
      fetchDoctorData();
    }
  }, []);

  const fetchDoctorData = async () => {
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setError("Authentication required");
        navigate("/login");
        return;
      }

      // Fetch doctor profile with role information
      const { data: doctorProfile, error: profileError } = await supabase
        .from("users")
        .select(
          `
        id, 
        email, 
        first_name, 
        last_name, 
        phone_number,
        role_id (
          role_name
        )
      `
        )
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      // Fetch medical staff details separately
      const { data: medicalStaff, error: staffError } = await supabase
        .from("medical_staff")
        .select(
          `
        specialization_id (specialization_name),
        department_id (department_name),
        license_number
      `
        )
        .eq("id", authUser.id)
        .single();

      if (staffError) {
        console.error("Medical staff error:", staffError);
      }

      setUser({
        id: doctorProfile.id,
        name: `${doctorProfile.first_name} ${doctorProfile.last_name}`,
        email: doctorProfile.email,
        phone: doctorProfile.phone_number,
        role: doctorProfile.role_id?.role_name || "doctor",
        specialization:
          medicalStaff?.specialization_id?.specialization_name ||
          "General Practitioner",
        licenseNumber: medicalStaff?.license_number || "N/A",
        department:
          medicalStaff?.department_id?.department_name || "General Medicine",
      });

      // Fetch all dashboard data
      await Promise.all([
        fetchDashboardStats(doctorProfile.id),
        fetchTodaysAppointments(doctorProfile.id),
        fetchRecentPatients(doctorProfile.id),
        fetchUrgentCases(doctorProfile.id),
      ]);

      // Update cache timestamp
      setDataCache((prev) => ({
        ...prev,
        lastFetch: Date.now(),
      }));
    } catch (err) {
      console.error("Error fetching doctor data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (doctorId) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Today's appointments count
      const { count: appointmentsCount, error: apptError } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", doctorId)
        .eq("appointment_date", today);

      if (apptError) console.error("Appointment count error:", apptError);

      // Active patients (patients with appointments or diagnoses in last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { data: recentAppointments } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("doctor_id", doctorId)
        .gte("appointment_date", thirtyDaysAgo);

      const { data: recentDiagnoses } = await supabase
        .from("medical_diagnoses")
        .select("patient_id")
        .eq("doctor_id", doctorId)
        .gte("diagnosis_date", thirtyDaysAgo);

      const allPatientIds = [
        ...(recentAppointments?.map((apt) => apt.patient_id) || []),
        ...(recentDiagnoses?.map((diag) => diag.patient_id) || []),
      ];
      const uniquePatientIds = [...new Set(allPatientIds)];
      const activePatientsCount = uniquePatientIds.length;

      // Pending diagnoses
      const { count: pendingDiagnosesCount, error: diagError } = await supabase
        .from("medical_diagnoses")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", doctorId);

      if (diagError) console.error("Diagnosis count error:", diagError);

      // Urgent cases
      const { count: urgentCasesCount, error: urgentError } = await supabase
        .from("medical_diagnoses")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", doctorId)
        .eq("severity", "severe");

      if (urgentError) console.error("Urgent cases error:", urgentError);

      // Pending prescriptions
      const { count: prescriptionsPendingCount, error: presError } =
        await supabase
          .from("prescriptions")
          .select("*", { count: "exact", head: true })
          .eq("doctor_id", doctorId);

      if (presError) console.error("Prescription count error:", presError);

      setStats({
        todaysAppointments: appointmentsCount || 0,
        activePatients: activePatientsCount || 0,
        pendingDiagnoses: pendingDiagnosesCount || 0,
        urgentCases: urgentCasesCount || 0,
        prescriptionsPending: prescriptionsPendingCount || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchTodaysAppointments = async (doctorId) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
          `
        id,
        appointment_date,
        appointment_time,
        status_id (status_name),
        reason,
        patient_id
      `
        )
        .eq("doctor_id", doctorId)
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true })
        .limit(5);

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setTodayAppointments([]);
        return;
      }

      const patientIds = appointments.map((apt) => apt.patient_id);

      const { data: patients, error: patientsError } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", patientIds);

      if (patientsError) throw patientsError;

      const appointmentsWithPatientNames = appointments.map((apt) => {
        const patient = patients.find((p) => p.id === apt.patient_id);
        const status = apt.status_id?.status_name || "Scheduled";
        const statusConfig =
          statusConfigs[status.toLowerCase()] || statusConfigs.scheduled;

        return {
          id: apt.id,
          patientName: patient
            ? `${patient.first_name} ${patient.last_name}`
            : "Unknown Patient",
          time: apt.appointment_time?.substring(0, 5) || "N/A",
          status: status,
          statusConfig: statusConfig,
          reason: apt.reason || "General Consultation",
        };
      });

      setTodayAppointments(appointmentsWithPatientNames);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const fetchRecentPatients = async (doctorId) => {
    try {
      const { data: diagnoses, error } = await supabase
        .from("medical_diagnoses")
        .select(
          `
        patient_id,
        diagnosis_date,
        disease_id (disease_name),
        status_id (status_name),
        severity
      `
        )
        .eq("doctor_id", doctorId)
        .order("diagnosis_date", { ascending: false })
        .limit(4);

      if (error) throw error;

      if (!diagnoses || diagnoses.length === 0) {
        setRecentPatients([]);
        return;
      }

      const patientIds = diagnoses.map((diag) => diag.patient_id);

      const { data: patients, error: patientsError } = await supabase
        .from("users")
        .select("id, first_name, last_name, date_of_birth")
        .in("id", patientIds);

      if (patientsError) throw patientsError;

      const recentPatientsData = diagnoses.map((diag) => {
        const patient = patients.find((p) => p.id === diag.patient_id);
        const severity = diag.severity || "mild";
        const statusConfig = statusConfigs[severity] || statusConfigs.mild;

        return {
          id: diag.patient_id,
          name: patient
            ? `${patient.first_name} ${patient.last_name}`
            : "Unknown Patient",
          age: patient?.date_of_birth
            ? new Date().getFullYear() -
              new Date(patient.date_of_birth).getFullYear()
            : "Unknown",
          lastVisit: new Date(diag.diagnosis_date).toLocaleDateString(),
          condition: diag.disease_id?.disease_name || "Unknown Condition",
          status: diag.status_id?.status_name || "Unknown Status",
          severity: severity,
          statusConfig: statusConfig,
        };
      });

      setRecentPatients(recentPatientsData);
    } catch (err) {
      console.error("Error fetching recent patients:", err);
    }
  };

  const fetchUrgentCases = async (doctorId) => {
    try {
      const { data: diagnoses, error } = await supabase
        .from("medical_diagnoses")
        .select(
          `
        patient_id,
        disease_id (disease_name),
        severity,
        diagnosis_date,
        notes
      `
        )
        .eq("doctor_id", doctorId)
        .eq("severity", "severe")
        .order("diagnosis_date", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (!diagnoses || diagnoses.length === 0) {
        setUrgentCases([]);
        return;
      }

      const patientIds = diagnoses.map((diag) => diag.patient_id);

      const { data: patients, error: patientsError } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", patientIds);

      if (patientsError) throw patientsError;

      const urgentCasesData = diagnoses.map((caseItem) => {
        const patient = patients.find((p) => p.id === caseItem.patient_id);
        return {
          id: caseItem.patient_id,
          patientName: patient
            ? `${patient.first_name} ${patient.last_name}`
            : "Unknown Patient",
          condition: caseItem.disease_id?.disease_name || "Severe Condition",
          severity: caseItem.severity,
          date: new Date(caseItem.diagnosis_date).toLocaleDateString(),
          notes: caseItem.notes || "Urgent attention required",
        };
      });

      setUrgentCases(urgentCasesData);
    } catch (err) {
      console.error("Error fetching urgent cases:", err);
    }
  };

  // Improved Status Badge Component
  const StatusBadge = ({ status, type = "default" }) => {
    const config =
      statusConfigs[status.toLowerCase()] ||
      (type === "severity" ? statusConfigs.mild : statusConfigs.pending);

    return (
      <span
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${config.className}`}
        title={config.fullLabel}
      >
        {config.fullLabel}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-lg text-gray-600">
              Loading Doctor Dashboard...
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">Error: {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, Dr. {user?.name}
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.specialization} • {user?.department}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                License: {user?.licenseNumber}
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                {user?.email}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/doctor-appointments")}
              className="btn-primary flex items-center space-x-2 whitespace-nowrap"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>View Schedule</span>
            </button>
            <button
              onClick={() => navigate("/doctor-diagnosis")}
              className="btn-secondary flex items-center space-x-2 whitespace-nowrap"
            >
              <PlusIcon className="h-4 w-4" />
              <span>New Diagnosis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Today's Appointments
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.todaysAppointments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Active Patients
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activePatients}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Diagnoses
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pendingDiagnoses}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <BellIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Urgent Cases</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.urgentCases}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Prescriptions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.prescriptionsPending}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Today's Appointments
              </h3>
            </div>
            <div className="p-6">
              {todayAppointments.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {appointment.patientName}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>Time: {appointment.time}</span>
                          {appointment.reason && (
                            <>
                              <span>•</span>
                              <span className="truncate">
                                Reason: {appointment.reason}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    No appointments scheduled for today
                  </p>
                  <button
                    onClick={() => navigate("/doctor-appointments")}
                    className="btn-primary mt-2"
                  >
                    Schedule Appointments
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Patients */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Patients
              </h3>
            </div>
            <div className="p-6">
              {recentPatients.length > 0 ? (
                <div className="space-y-4">
                  {recentPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200 cursor-pointer"
                      onClick={() =>
                        navigate(
                          `/doctor-medical-records?patient=${patient.id}`
                        )
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {patient.name}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>Age: {patient.age}</span>
                          <span>•</span>
                          <span>Last Visit: {patient.lastVisit}</span>
                          <span>•</span>
                          <span className="truncate">
                            Condition: {patient.condition}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={patient.severity} type="severity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent patients</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Urgent Cases and Quick Actions */}
        <div className="space-y-8">
          {/* Urgent Cases */}
          <div className="bg-white rounded-xl border border-red-200 shadow-sm">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-900 flex items-center">
                <BellIcon className="h-5 w-5 mr-2" />
                Urgent Cases
              </h3>
            </div>
            <div className="p-6">
              {urgentCases.length > 0 ? (
                <div className="space-y-4">
                  {urgentCases.map((urgentCase) => (
                    <div
                      key={urgentCase.id}
                      className="p-4 border border-red-200 rounded-lg bg-red-50"
                    >
                      <p className="font-medium text-red-900 truncate">
                        {urgentCase.patientName}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {urgentCase.condition}
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        Diagnosed: {urgentCase.date}
                      </p>
                      {urgentCase.notes && (
                        <p className="text-xs text-red-500 mt-1 truncate">
                          Notes: {urgentCase.notes}
                        </p>
                      )}
                      <button
                        onClick={() =>
                          navigate(
                            `/doctor-medical-records?patient=${urgentCase.id}`
                          )
                        }
                        className="w-full mt-3 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition duration-200"
                      >
                        Review Case
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
                    <BellIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-green-600 font-medium">No urgent cases</p>
                  <p className="text-green-500 text-sm mt-1">
                    All patients are stable
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate("/doctor-diagnosis")}
                className="w-full flex items-center space-x-3 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition duration-200 border border-blue-200"
              >
                <UserGroupIcon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">Start New Diagnosis</span>
              </button>
              <button
                onClick={() => navigate("/doctor-prescriptions")}
                className="w-full flex items-center space-x-3 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition duration-200 border border-green-200"
              >
                <DocumentTextIcon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">Write Prescription</span>
              </button>
              <button
                onClick={() => navigate("/doctor-medical-records")}
                className="w-full flex items-center space-x-3 p-4 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition duration-200 border border-gray-200"
              >
                <ClipboardDocumentListIcon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">View Medical Records</span>
              </button>
              <button
                onClick={() => navigate("/doctor-reporting")}
                className="w-full flex items-center space-x-3 p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition duration-200 border border-purple-200"
              >
                <ChartBarIcon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">Generate Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
