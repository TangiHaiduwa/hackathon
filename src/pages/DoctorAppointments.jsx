// DoctorAppointments.jsx (Fixed with Backend Integration and Error Corrections)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
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
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon, // Added missing import
} from "@heroicons/react/24/outline";

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("calendar"); // 'calendar' or 'list'
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, selectedDate]);

  useEffect(() => {
    filterAppointments();
  }, [appointments, statusFilter, searchTerm]);

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
          doctorProfile.medical_staff?.specialization_id?.specialization_name,
      });
    } catch (error) {
      console.error("Error fetching doctor data:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      // Get date range for the selected month
      const startOfMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0
      );

      const { data: apptData, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          reason,
          status_id (id, status_code, status_name),
          patient_id,
          created_at,
          appointment_symptoms (symptom_id (symptom_name, category_id (weight)))
        `
        )
        .eq("doctor_id", user.id)
        .gte("appointment_date", startOfMonth.toISOString().split("T")[0])
        .lte("appointment_date", endOfMonth.toISOString().split("T")[0])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (apptError) throw apptError;

      // Fetch patient details separately from users table (since patient_id = users.id)
      const patientIds = [...new Set(apptData.map((apt) => apt.patient_id))];
      const { data: patientData, error: patientError } = await supabase
        .from("users")
        .select("id, first_name, last_name, phone_number, date_of_birth")
        .in("id", patientIds);

      if (patientError) throw patientError;

      const patientMap = new Map(patientData.map((p) => [p.id, p]));

      const appointmentsWithDetails = apptData.map((apt) => {
        const patient = patientMap.get(apt.patient_id) || {
          first_name: "Unknown",
          last_name: "",
        };

        // Calculate urgency based on symptoms
        const urgencyScore =
          apt.appointment_symptoms?.reduce((score, symptom) => {
            return score + (symptom.symptom_id.category_id?.weight || 1);
          }, 0) || 0;

        let urgency = "low";
        if (urgencyScore >= 4) urgency = "high";
        else if (urgencyScore >= 2) urgency = "medium";

        return {
          ...apt,
          urgency,
          patientName: `${patient.first_name} ${patient.last_name}`,
          patientAge: patient.date_of_birth
            ? new Date().getFullYear() -
              new Date(patient.date_of_birth).getFullYear()
            : null,
          patientPhone: patient.phone_number,
          symptoms:
            apt.appointment_symptoms?.map((s) => s.symptom_id.symptom_name) ||
            [],
        };
      });

      setAppointments(appointmentsWithDetails);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAppointments = () => {
    let filtered = appointments;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (apt) => apt.status_id.status_code === statusFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (apt) =>
          apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAppointments(filtered);
  };

  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split("T")[0];
    return filteredAppointments.filter((apt) => apt.appointment_date === today);
  };

  const changeMonth = (delta) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  const renderCalendarView = () => {
    const daysInMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    ).getDate();
    const firstDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    ).getDay();
    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weeks = [];
    let currentWeek = Array(firstDay).fill(null);
    calendarDays.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0)
      weeks.push(currentWeek.concat(Array(7 - currentWeek.length).fill(null)));

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {weeks.flat().map((day, index) => {
              if (!day) return <div key={index} className="h-10" />;
              const dateStr = `${selectedDate.getFullYear()}-${String(
                selectedDate.getMonth() + 1
              ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayAppts = filteredAppointments.filter(
                (apt) => apt.appointment_date === dateStr
              );
              const hasAppts = dayAppts.length > 0;
              return (
                <div
                  key={index}
                  className={`h-10 flex items-center justify-center text-sm rounded ${
                    hasAppts
                      ? "bg-blue-100 text-blue-800 font-medium cursor-pointer hover:bg-blue-200"
                      : "text-gray-700"
                  }`}
                  onClick={
                    hasAppts
                      ? () => setSelectedAppointment(dayAppts[0])
                      : undefined
                  } // Show first for simplicity; adjust if needed
                >
                  {day}{" "}
                  {hasAppts && (
                    <span className="ml-1 text-xs">({dayAppts.length})</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Appointment List
          </h3>
        </div>
        <div className="p-6">
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedAppointment(apt)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {apt.patientName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {apt.appointment_date} at{" "}
                        {apt.appointment_time.substring(0, 5)}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          apt.urgency === "high"
                            ? "bg-red-100 text-red-800"
                            : apt.urgency === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {apt.urgency} urgency
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        apt.status_id.status_code === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {apt.status_id.status_name}
                    </span>
                  </div>
                  {apt.reason && (
                    <p className="text-sm text-gray-500 mt-2 truncate">
                      {apt.reason}
                    </p>
                  )}
                  {apt.symptoms.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Symptoms: {apt.symptoms.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No appointments match the filters
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderAppointmentDetail = () => {
    if (!selectedAppointment) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Appointment Details
            </h3>
            <button
              onClick={() => setSelectedAppointment(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Patient Name</p>
                <p className="font-medium">{selectedAppointment.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-medium">
                  {selectedAppointment.patientAge || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">
                  {selectedAppointment.patientPhone || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    selectedAppointment.status_id.status_code === "confirmed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {selectedAppointment.status_id.status_name}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-medium">
                  {selectedAppointment.appointment_date} at{" "}
                  {selectedAppointment.appointment_time.substring(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Urgency</p>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    selectedAppointment.urgency === "high"
                      ? "bg-red-100 text-red-800"
                      : selectedAppointment.urgency === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {selectedAppointment.urgency.charAt(0).toUpperCase() +
                    selectedAppointment.urgency.slice(1)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Reason</p>
              <p className="text-gray-900">
                {selectedAppointment.reason || "No reason provided"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Symptoms</p>
              {selectedAppointment.symptoms.length > 0 ? (
                <ul className="list-disc pl-5">
                  {selectedAppointment.symptoms.map((sym, i) => (
                    <li key={i} className="text-gray-900">
                      {sym}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-900">No symptoms reported</p>
              )}
            </div>
          </div>
          <div className="px-6 py-4 border-t flex justify-end space-x-3">
            <button
              onClick={() => setSelectedAppointment(null)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Navigate to diagnosis or other action
                navigate(
                  `/doctor-diagnosis?patientId=${selectedAppointment.patient_id}`
                );
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Start Diagnosis
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading appointments...
      </div>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-600 mt-1">
          Manage and view your scheduled consultations
        </p>
      </div>

      {/* Filters and Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients or reasons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-medical pl-10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-medical"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>

        <div className="flex space-x-2">
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-lg ${
              view === "calendar"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            } transition duration-200`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg ${
              view === "list"
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            } transition duration-200`}
          >
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {view === "calendar" ? renderCalendarView() : renderListView()}
        </div>

        {/* Today's Patient List Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-2 text-gray-600" />
                Today's Patients
              </h3>
            </div>
            <div className="p-6">
              {getTodaysAppointments().length > 0 ? (
                <div className="space-y-3">
                  {getTodaysAppointments().map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition duration-200"
                      onClick={() => setSelectedAppointment(apt)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {apt.patientName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {apt.appointment_time.substring(0, 5)}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                              apt.urgency === "high"
                                ? "bg-red-100 text-red-800"
                                : apt.urgency === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {apt.urgency} urgency
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            apt.status_id.status_code === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {apt.status_id.status_code}
                        </span>
                      </div>
                      {apt.reason && (
                        <p className="text-sm text-gray-500 mt-2 truncate">
                          {apt.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No appointments today</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">This Month</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Appointments</span>
                <span className="font-medium">{appointments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmed</span>
                <span className="font-medium text-green-600">
                  {
                    appointments.filter(
                      (a) => a.status_id.status_code === "confirmed"
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-yellow-600">
                  {
                    appointments.filter(
                      (a) => a.status_id.status_code === "scheduled"
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High Urgency</span>
                <span className="font-medium text-red-600">
                  {appointments.filter((a) => a.urgency === "high").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {renderAppointmentDetail()}
    </DashboardLayout>
  );
};

export default DoctorAppointments;
