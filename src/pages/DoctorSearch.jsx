// components/dashboard/DoctorSearch.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  TruckIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

const DoctorSearch = () => {
  const [user, setUser] = useState(null);
  const [searchType, setSearchType] = useState("patients");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: "",
    status: "",
    severity: "",
  });
  const [showFilters, setShowFilters] = useState(false);
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

  useEffect(() => {
    fetchUserData();
  }, []);

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

  const searchOptions = [
    { value: "patients", label: "Patients", icon: UserCircleIcon },
    { value: "appointments", label: "Appointments", icon: CalendarIcon },
    { value: "prescriptions", label: "Prescriptions", icon: DocumentTextIcon },
    { value: "diagnoses", label: "Diagnoses", icon: ClipboardDocumentListIcon },
    { value: "drugs", label: "Drugs", icon: BeakerIcon },
  ];

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      switch (searchType) {
        case "patients":
          await searchPatients();
          break;
        case "appointments":
          await searchAppointments();
          break;
        case "prescriptions":
          await searchPrescriptions();
          break;
        case "diagnoses":
          await searchDiagnoses();
          break;
        case "drugs":
          await searchDrugs();
          break;
        default:
          setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async () => {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        phone_number,
        date_of_birth,
        patients (
          blood_type_id (blood_type_code),
          emergency_contact_name
        )
      `
      )
      .or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
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
      .limit(50);

    if (error) throw error;

    const results = data.map((patient) => ({
      id: patient.id,
      type: "patient",
      title: `${patient.first_name} ${patient.last_name}`,
      subtitle: patient.email,
      details: {
        Phone: patient.phone_number,
        "Date of Birth": patient.date_of_birth,
        "Blood Type":
          patient.patients?.blood_type_id?.blood_type_code || "Unknown",
      },
      action: () => navigate(`/doctor-medical-records?patient=${patient.id}`),
    }));

    setSearchResults(results);
  };

  const searchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        appointment_time,
        reason,
        status_id (status_name),
        patients:patient_id (
          users (first_name, last_name)
        )
      `
      )
      .or(
        `reason.ilike.%${searchQuery}%,appointment_date.ilike.%${searchQuery}%`
      )
      .eq("doctor_id", user.id)
      .order("appointment_date", { ascending: false })
      .limit(50);

    if (error) throw error;

    const results = data.map((appt) => ({
      id: appt.id,
      type: "appointment",
      title: `Appointment with ${appt.patients?.users?.first_name} ${appt.patients?.users?.last_name}`,
      subtitle: `${appt.appointment_date} at ${appt.appointment_time}`,
      details: {
        Reason: appt.reason,
        Status: appt.status_id?.status_name,
      },
      action: () => navigate("/doctor-appointments"),
    }));

    setSearchResults(results);
  };

  const searchPrescriptions = async () => {
    const { data, error } = await supabase
      .from("prescriptions")
      .select(
        `
        id,
        prescription_date,
        status_id (status_name),
        notes,
        patients:patient_id (
          users (first_name, last_name)
        ),
        prescription_items (
          drugs (drug_name, dosage)
        )
      `
      )
      .or(`notes.ilike.%${searchQuery}%`)
      .eq("doctor_id", user.id)
      .order("prescription_date", { ascending: false })
      .limit(50);

    if (error) throw error;

    const results = data.map((prescription) => ({
      id: prescription.id,
      type: "prescription",
      title: `Prescription for ${prescription.patients?.users?.first_name} ${prescription.patients?.users?.last_name}`,
      subtitle: `Date: ${prescription.prescription_date}`,
      details: {
        Status: prescription.status_id?.status_name,
        Medications:
          prescription.prescription_items
            ?.map((item) => item.drugs.drug_name)
            .join(", ") || "None",
        Notes: prescription.notes,
      },
      action: () => navigate("/doctor-prescriptions"),
    }));

    setSearchResults(results);
  };

  const searchDiagnoses = async () => {
    const { data, error } = await supabase
      .from("medical_diagnoses")
      .select(
        `
        id,
        diagnosis_date,
        severity,
        notes,
        diseases (disease_name),
        patients:patient_id (
          users (first_name, last_name)
        )
      `
      )
      .or(`notes.ilike.%${searchQuery}%,severity.ilike.%${searchQuery}%`)
      .eq("doctor_id", user.id)
      .order("diagnosis_date", { ascending: false })
      .limit(50);

    if (error) throw error;

    const results = data.map((diagnosis) => ({
      id: diagnosis.id,
      type: "diagnosis",
      title: `${diagnosis.diseases?.disease_name} - ${diagnosis.patients?.users?.first_name} ${diagnosis.patients?.users?.last_name}`,
      subtitle: `Diagnosed: ${diagnosis.diagnosis_date}`,
      details: {
        Severity: diagnosis.severity,
        Notes: diagnosis.notes,
      },
      action: () => navigate("/doctor-medical-records"),
    }));

    setSearchResults(results);
  };

  const searchDrugs = async () => {
    const { data, error } = await supabase
      .from("drugs")
      .select(
        `
        id,
        drug_name,
        generic_name,
        dosage,
        requires_prescription,
        drug_categories (category_name)
      `
      )
      .or(
        `drug_name.ilike.%${searchQuery}%,generic_name.ilike.%${searchQuery}%`
      )
      .limit(50);

    if (error) throw error;

    const results = data.map((drug) => ({
      id: drug.id,
      type: "drug",
      title: drug.drug_name,
      subtitle: drug.generic_name,
      details: {
        Dosage: drug.dosage,
        Category: drug.drug_categories?.category_name,
        "Prescription Required": drug.requires_prescription ? "Yes" : "No",
      },
      action: () => navigate("/doctor-prescriptions"),
    }));

    setSearchResults(results);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setFilters({ dateRange: "", status: "", severity: "" });
  };

  const getResultIcon = (type) => {
    const option = searchOptions.find((opt) => opt.value === type);
    return option ? option.icon : MagnifyingGlassIcon;
  };

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Advanced Search</h1>
          <p className="text-gray-600 mt-2">
            Search across patients, appointments, prescriptions, and medical
            records
          </p>
        </div>

        {/* Search Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search Type Selector */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {searchOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSearchType(option.value)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      searchType === option.value
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-md border text-sm font-medium ${
                showFilters
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && performSearch()}
                  placeholder={`Search ${searchOptions
                    .find((opt) => opt.value === searchType)
                    ?.label.toLowerCase()}...`}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <button
                onClick={performSearch}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) =>
                        setFilters({ ...filters, dateRange: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Any Date</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({ ...filters, status: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Any Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={filters.severity}
                      onChange={(e) =>
                        setFilters({ ...filters, severity: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Any Severity</option>
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results ({searchResults.length})
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((result) => {
                  const IconComponent = getResultIcon(result.type);
                  return (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={result.action}
                    >
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {result.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {result.subtitle}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2">
                            {Object.entries(result.details).map(
                              ([key, value]) =>
                                value && (
                                  <span
                                    key={key}
                                    className="text-xs text-gray-500"
                                  >
                                    <span className="font-medium">{key}:</span>{" "}
                                    {value}
                                  </span>
                                )
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.type === "patient"
                              ? "bg-green-100 text-green-800"
                              : result.type === "appointment"
                              ? "bg-blue-100 text-blue-800"
                              : result.type === "prescription"
                              ? "bg-purple-100 text-purple-800"
                              : result.type === "diagnosis"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {result.type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No results found for "{searchQuery}"
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Try different keywords or search categories
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <AdjustmentsHorizontalIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Enter search terms to find patients, appointments, and medical
                  records
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorSearch;
