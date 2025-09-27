// DoctorPharmacy.jsx (Improved Professional Version)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import supabase from "../lib/supabase";
import {
  TruckIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PaperAirplaneIcon,
  LightBulbIcon,
  AcademicCapIcon,
  HomeIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const DoctorPharmacy = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [drugInventory, setDrugInventory] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    drugCategory: "",
    urgency: "",
  });
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

  // Order status mapping
  const orderStatuses = {
    pending: {
      name: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: ClockIcon,
    },
    sent: {
      name: "Sent to Pharmacy",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: PaperAirplaneIcon,
    },
    processing: {
      name: "Processing",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: BeakerIcon,
    },
    filled: {
      name: "Filled",
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircleIcon,
    },
    partially_filled: {
      name: "Partially Filled",
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: DocumentTextIcon,
    },
    cancelled: {
      name: "Cancelled",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XMarkIcon,
    },
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPrescriptions();
      fetchPharmacyOrders();
      fetchDrugInventory();
    }
  }, [user]);

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

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(
          `
          id,
          prescription_date,
          status_id (status_code, status_name),
          notes,
          patient_id (first_name, last_name),
          prescription_items (
            drug_id (drug_name, dosage, form_id (form_name)),
            dosage_instructions,
            quantity,
            duration_days
          )
        `
        )
        .eq("doctor_id", user.id)
        .order("prescription_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    }
  };

  const fetchPharmacyOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(
          `
          id,
          prescription_date,
          status_id (status_code, status_name),
          notes,
          patient_id (first_name, last_name, phone_number),
          prescription_items (
            id,
            drug_id (drug_name, dosage),
            dosage_instructions,
            quantity,
            duration_days,
            drug_dispensing (
              id,
              quantity_dispensed,
              dispensed_at,
              dispensed_by (first_name, last_name),
              notes
            )
          ),
          drug_dispensing (
            inventory_id (batch_number, expiry_date),
            dispensed_at,
            dispensed_by (first_name, last_name)
          )
        `
        )
        .eq("doctor_id", user.id)
        .order("prescription_date", { ascending: false });

      if (error) throw error;

      const ordersWithStatus = (data || []).map((prescription) => {
        const items = prescription.prescription_items || [];
        const totalItems = items.length;
        const filledItems = items.filter(
          (item) => item.drug_dispensing && item.drug_dispensing.length > 0
        ).length;

        let orderStatus = "pending";
        if (filledItems === totalItems && totalItems > 0) {
          orderStatus = "filled";
        } else if (filledItems > 0) {
          orderStatus = "partially_filled";
        } else if (prescription.status_id.status_code === "sent") {
          orderStatus = "sent";
        } else if (prescription.status_id.status_code === "cancelled") {
          orderStatus = "cancelled";
        }

        const itemsWithAvailability = items.map((item) => ({
          ...item,
          available: checkDrugAvailability(
            item.drug_id.drug_name,
            item.quantity
          ),
          inventory: getDrugInventory(item.drug_id.drug_name),
        }));

        return {
          ...prescription,
          orderStatus,
          items: itemsWithAvailability,
          fillPercentage:
            totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0,
        };
      });

      setPharmacyOrders(ordersWithStatus);
    } catch (error) {
      console.error("Error fetching pharmacy orders:", error);
    }
  };

  const fetchDrugInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("drug_inventory")
        .select(
          `
          id,
          quantity,
          expiry_date,
          drug_id (drug_name, dosage, form_id (form_name)),
          batch_number
        `
        )
        .gt("quantity", 0)
        .gt("expiry_date", new Date().toISOString())
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      setDrugInventory(data || []);
    } catch (error) {
      console.error("Error fetching drug inventory:", error);
    }
  };

  const checkDrugAvailability = (drugName, requiredQuantity) => {
    const availableStock = drugInventory
      .filter((item) => item.drug_id.drug_name === drugName)
      .reduce((sum, item) => sum + item.quantity, 0);

    return {
      available: availableStock >= requiredQuantity,
      availableQuantity: availableStock,
      requiredQuantity: requiredQuantity,
      shortage:
        availableStock < requiredQuantity
          ? requiredQuantity - availableStock
          : 0,
    };
  };

  const getDrugInventory = (drugName) => {
    return drugInventory.filter((item) => item.drug_id.drug_name === drugName);
  };

  const filterOrders = () => {
    let filtered = pharmacyOrders;

    // Filter by status
    if (orderStatusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.orderStatus === orderStatusFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.patient_id.first_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.patient_id.last_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.prescription_items.some((item) =>
            item.drug_id.drug_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
      );
    }

    // Advanced filters
    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(
        (order) =>
          new Date(order.prescription_date) >=
          new Date(advancedFilters.dateFrom)
      );
    }

    if (advancedFilters.dateTo) {
      filtered = filtered.filter(
        (order) =>
          new Date(order.prescription_date) <= new Date(advancedFilters.dateTo)
      );
    }

    return filtered;
  };

  const sendToPharmacy = async (prescriptionId) => {
    try {
      setLoading(true);

      const { data: sentStatus } = await supabase
        .from("prescription_statuses")
        .select("id")
        .eq("status_code", "sent")
        .single();

      if (!sentStatus) {
        throw new Error("Sent status not found in database");
      }

      const { error } = await supabase
        .from("prescriptions")
        .update({
          status_id: sentStatus.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prescriptionId);

      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: await getPharmacistUserId(),
        notification_type_id: await getNotificationTypeId("new_prescription"),
        title: "New Prescription Received",
        message: `New prescription from Dr. ${user.name} requires processing`,
        related_entity_type: "prescription",
        related_entity_id: prescriptionId,
      });

      await supabase.from("activity_log").insert({
        user_id: user.id,
        activity_type_id: await getActivityTypeId("send_to_pharmacy"),
        table_name: "prescriptions",
        record_id: prescriptionId,
        new_values: { status: "sent" },
      });

      alert("Prescription sent to pharmacy successfully!");
      await fetchPharmacyOrders();
    } catch (error) {
      console.error("Error sending to pharmacy:", error);
      alert(`Error sending prescription to pharmacy: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPharmacistUserId = async () => {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("role_id", await getRoleId("pharmacist"))
      .limit(1)
      .single();
    return data?.id || user.id;
  };

  const getRoleId = async (roleName) => {
    const { data } = await supabase
      .from("roles")
      .select("id")
      .eq("role_name", roleName)
      .single();
    return data?.id;
  };

  const getNotificationTypeId = async (typeCode) => {
    const { data } = await supabase
      .from("notification_types")
      .select("id")
      .eq("type_code", typeCode)
      .single();
    return data?.id;
  };

  const getActivityTypeId = async (activityCode) => {
    const { data } = await supabase
      .from("activity_types")
      .select("id")
      .eq("activity_code", activityCode)
      .single();
    return data?.id;
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = orderStatuses[status];
    const IconComponent = statusConfig.icon;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
      >
        <IconComponent className="h-3 w-3 mr-1" />
        {statusConfig.name}
      </span>
    );
  };

  const renderOrderCard = (order) => (
    <div
      key={order.id}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-4 hover:shadow-lg transition-all duration-200 hover:border-blue-200"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h4 className="font-semibold text-gray-900 text-lg">
              {order.patient_id.first_name} {order.patient_id.last_name}
            </h4>
            <StatusBadge status={order.orderStatus} />
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>
              📅 {new Date(order.prescription_date).toLocaleDateString()}
            </span>
            <span>•</span>
            <span
              className={`flex items-center ${
                order.fillPercentage === 100
                  ? "text-green-600"
                  : "text-blue-600"
              }`}
            >
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div
                  className={`h-2 rounded-full ${
                    order.fillPercentage === 100
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${order.fillPercentage}%` }}
                ></div>
              </div>
              {order.fillPercentage}% filled
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {order.items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-1">
                <span className="font-medium text-gray-900">
                  {item.drug_id.drug_name}
                </span>
                <span className="text-sm text-gray-500">
                  {item.drug_id.dosage}
                </span>
                {!item.available.available && (
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-sm text-gray-600">
                {item.dosage_instructions}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                {item.quantity} units
              </div>
              <div
                className={`text-xs ${
                  item.available.available ? "text-green-600" : "text-red-600"
                }`}
              >
                {item.available.available
                  ? "✅ In stock"
                  : `❌ Shortage: ${item.available.shortage}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="flex space-x-3">
          <button
            onClick={() => setSelectedPrescription(order)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
            <span>View Details</span>
          </button>
          {order.orderStatus === "pending" && (
            <button
              onClick={() => sendToPharmacy(order.id)}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              <span>Send to Pharmacy</span>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          {order.items.filter((item) => !item.available.available).length >
            0 && (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
          )}
          {order.items.filter((item) => !item.available.available).length} items
          need attention
        </div>
      </div>
    </div>
  );

  const filteredOrders = filterOrders();

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pharmacy Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage prescriptions, track drug availability, and coordinate with
              pharmacy
            </p>
          </div>
          <button
            onClick={() => navigate("/doctor-prescriptions")}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Prescription</span>
          </button>
        </div>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Enhanced Search Bar */}
          <div className="relative flex-1 max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients, medications, or prescription notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex space-x-3">
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {Object.entries(orderStatuses).map(([key, status]) => (
                <option key={key} value={key}>
                  {status.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                showFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.dateFrom}
                  onChange={(e) =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      dateFrom: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={advancedFilters.dateTo}
                  onChange={(e) =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      dateTo: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drug Category
                </label>
                <select
                  value={advancedFilters.drugCategory}
                  onChange={(e) =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      drugCategory: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="antibiotic">Antibiotics</option>
                  <option value="analgesic">Pain Relief</option>
                  <option value="antimalarial">Antimalarial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency
                </label>
                <select
                  value={advancedFilters.urgency}
                  onChange={(e) =>
                    setAdvancedFilters({
                      ...advancedFilters,
                      urgency: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any Urgency</option>
                  <option value="urgent">Urgent</option>
                  <option value="routine">Routine</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-900">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">
                {pharmacyOrders.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-900">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  pharmacyOrders.filter((o) => o.orderStatus === "filled")
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-900">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {
                  pharmacyOrders.filter((o) => o.orderStatus === "pending")
                    .length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-900">Need Attention</p>
              <p className="text-2xl font-bold text-red-600">
                {
                  pharmacyOrders.filter((o) =>
                    o.items.some((item) => !item.available.available)
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pharmacy Orders ({filteredOrders.length})
                </h3>
                <span className="text-sm text-gray-500">
                  Sorted by most recent
                </span>
              </div>
            </div>
            <div className="p-6">
              {filteredOrders.length > 0 ? (
                <div className="space-y-4">
                  {filteredOrders.map(renderOrderCard)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BeakerIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No orders found
                  </h4>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || orderStatusFilter !== "all"
                      ? "Try adjusting your search criteria"
                      : "Get started by creating a new prescription"}
                  </p>
                  <button
                    onClick={() => navigate("/doctor-prescriptions")}
                    className="btn-primary"
                  >
                    Create Prescription
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Sidebar */}
        <div className="space-y-6">
          {/* Drug Availability Summary */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Drug Stock Overview
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {drugInventory.slice(0, 6).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.drug_id.drug_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.drug_id.dosage}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.quantity > 20
                              ? "bg-green-500"
                              : item.quantity > 5
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (item.quantity / 50) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          item.quantity > 20
                            ? "text-green-600"
                            : item.quantity > 5
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {drugInventory.length > 6 && (
                <button className="w-full mt-4 text-center text-blue-600 text-sm font-medium hover:text-blue-800">
                  View all {drugInventory.length} medications
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate("/doctor-prescriptions")}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <PlusIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  New Prescription
                </span>
              </button>
              <button
                onClick={() => navigate("/doctor-drug-admin")}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <TruckIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  Drug Administration
                </span>
              </button>
              <button
                onClick={() => navigate("/pharmacy/inventory")}
                className="w-full flex items-center space-x-3 p-3 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <BeakerIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">
                  View Full Inventory
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorPharmacy;
