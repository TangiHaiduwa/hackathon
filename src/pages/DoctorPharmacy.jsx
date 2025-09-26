// DoctorPharmacy.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import supabase from '../lib/supabase';
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
  CalendarIcon
} from '@heroicons/react/24/outline';

const DoctorPharmacy = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [drugInventory, setDrugInventory] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Navigation for sidebar
  const navigation = [
    { name: 'Dashboard', href: '/doctor-dashboard', icon: HomeIcon },
    { name: 'My Appointments', href: '/doctor-appointments', icon: CalendarIcon },
    { name: 'Patient Diagnosis', href: '/doctor-diagnosis', icon: UserGroupIcon },
    { name: 'Medical Records', href: '/doctor-medical-records', icon: ClipboardDocumentListIcon },
    { name: 'Treatment & Prescriptions', href: '/doctor-prescriptions', icon: DocumentTextIcon },
    { name: 'Pharmacy Orders', href: '/doctor-pharmacy', icon: BeakerIcon },
    { name: 'Drug Administration', href: '/doctor-drug-admin', icon: TruckIcon },
    { name: 'Reporting', href: '/doctor-reporting', icon: ChartBarIcon },
    { name: 'Search', href: '/doctor-search', icon: MagnifyingGlassIcon },
    { name: 'Decision Support', href: '/doctor-decision-support', icon: LightBulbIcon },
    { name: 'Resources', href: '/doctor-resources', icon: AcademicCapIcon },
  ];

  // Order status mapping
  const orderStatuses = {
    'pending': { name: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    'sent': { name: 'Sent to Pharmacy', color: 'bg-blue-100 text-blue-800' },
    'processing': { name: 'Processing', color: 'bg-orange-100 text-orange-800' },
    'filled': { name: 'Filled', color: 'bg-green-100 text-green-800' },
    'partially_filled': { name: 'Partially Filled', color: 'bg-purple-100 text-purple-800' },
    'cancelled': { name: 'Cancelled', color: 'bg-red-100 text-red-800' }
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

  useEffect(() => {
    filterOrders();
  }, [pharmacyOrders, orderStatusFilter, searchTerm]);

  const fetchDoctorData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data: doctorProfile } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, email,
          role_id (role_name),
          medical_staff (specialization_id (specialization_name))
        `)
        .eq('id', authUser.id)
        .single();

      setUser({
        id: doctorProfile.id,
        name: `${doctorProfile.first_name} ${doctorProfile.last_name}`,
        email: doctorProfile.email,
        role: doctorProfile.role_id.role_name,
        specialization: doctorProfile.medical_staff?.[0]?.specialization_id?.specialization_name
      });
    } catch (error) {
      console.error('Error fetching doctor data:', error);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
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
        `)
        .eq('doctor_id', user.id)
        .order('prescription_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const fetchPharmacyOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
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
        `)
        .eq('doctor_id', user.id)
        .order('prescription_date', { ascending: false });

      if (error) throw error;

      // Transform data to include order status and availability
      const ordersWithStatus = (data || []).map(prescription => {
        const items = prescription.prescription_items || [];
        const totalItems = items.length;
        const filledItems = items.filter(item => 
          item.drug_dispensing && item.drug_dispensing.length > 0
        ).length;

        let orderStatus = 'pending';
        if (filledItems === totalItems && totalItems > 0) {
          orderStatus = 'filled';
        } else if (filledItems > 0) {
          orderStatus = 'partially_filled';
        } else if (prescription.status_id.status_code === 'sent') {
          orderStatus = 'sent';
        } else if (prescription.status_id.status_code === 'cancelled') {
          orderStatus = 'cancelled';
        }

        // Check drug availability
        const itemsWithAvailability = items.map(item => ({
          ...item,
          available: checkDrugAvailability(item.drug_id.drug_name, item.quantity),
          inventory: getDrugInventory(item.drug_id.drug_name)
        }));

        return {
          ...prescription,
          orderStatus,
          items: itemsWithAvailability,
          fillPercentage: totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0
        };
      });

      setPharmacyOrders(ordersWithStatus);
    } catch (error) {
      console.error('Error fetching pharmacy orders:', error);
    }
  };

  const fetchDrugInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('drug_inventory')
        .select(`
          id,
          quantity,
          expiry_date,
          drug_id (drug_name, dosage, form_id (form_name)),
          batch_number
        `)
        .gt('quantity', 0)
        .gt('expiry_date', new Date().toISOString())
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setDrugInventory(data || []);
    } catch (error) {
      console.error('Error fetching drug inventory:', error);
    }
  };

  const checkDrugAvailability = (drugName, requiredQuantity) => {
    const availableStock = drugInventory
      .filter(item => item.drug_id.drug_name === drugName)
      .reduce((sum, item) => sum + item.quantity, 0);

    return {
      available: availableStock >= requiredQuantity,
      availableQuantity: availableStock,
      requiredQuantity: requiredQuantity,
      shortage: availableStock < requiredQuantity ? requiredQuantity - availableStock : 0
    };
  };

  const getDrugInventory = (drugName) => {
    return drugInventory.filter(item => item.drug_id.drug_name === drugName);
  };

  const filterOrders = () => {
    let filtered = pharmacyOrders;

    // Filter by status
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === orderStatusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.patient_id.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.patient_id.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.prescription_items.some(item => 
          item.drug_id.drug_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    return filtered;
  };

  const sendToPharmacy = async (prescriptionId) => {
    try {
      setLoading(true);

      // Get 'sent' status ID
      const { data: sentStatus } = await supabase
        .from('prescription_statuses')
        .select('id')
        .eq('status_code', 'sent')
        .single();

      if (!sentStatus) {
        throw new Error('Sent status not found in database');
      }

      const { error } = await supabase
        .from('prescriptions')
        .update({ 
          status_id: sentStatus.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      // Create notification for pharmacy
      await supabase
        .from('notifications')
        .insert({
          user_id: await getPharmacistUserId(),
          notification_type_id: await getNotificationTypeId('new_prescription'),
          title: 'New Prescription Received',
          message: `New prescription from Dr. ${user.name} requires processing`,
          related_entity_type: 'prescription',
          related_entity_id: prescriptionId
        });

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: await getActivityTypeId('send_to_pharmacy'),
          table_name: 'prescriptions',
          record_id: prescriptionId,
          new_values: { status: 'sent' }
        });

      alert('Prescription sent to pharmacy successfully!');
      await fetchPharmacyOrders(); // Refresh data
    } catch (error) {
      console.error('Error sending to pharmacy:', error);
      alert(`Error sending prescription to pharmacy: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPharmacistUserId = async () => {
    // This would typically get an actual pharmacist user ID
    // For now, return a placeholder or handle differently
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('role_id', await getRoleId('pharmacist'))
      .limit(1)
      .single();
    
    return data?.id || user.id; // Fallback to current user if no pharmacist found
  };

  const getRoleId = async (roleName) => {
    const { data } = await supabase
      .from('roles')
      .select('id')
      .eq('role_name', roleName)
      .single();
    return data?.id;
  };

  const getNotificationTypeId = async (typeCode) => {
    const { data } = await supabase
      .from('notification_types')
      .select('id')
      .eq('type_code', typeCode)
      .single();
    return data?.id;
  };

  const getActivityTypeId = async (activityCode) => {
    const { data } = await supabase
      .from('activity_types')
      .select('id')
      .eq('activity_code', activityCode)
      .single();
    return data?.id;
  };

  const renderOrderCard = (order) => (
    <div key={order.id} className="border rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">
            {order.patient_id.first_name} {order.patient_id.last_name}
          </h4>
          <p className="text-sm text-gray-600">
            Date: {new Date(order.prescription_date).toLocaleDateString()}
          </p>
          {order.notes && (
            <p className="text-sm text-gray-500">Notes: {order.notes}</p>
          )}
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${orderStatuses[order.orderStatus]?.color}`}>
            {orderStatuses[order.orderStatus]?.name}
          </span>
          <div className="text-xs text-gray-500 mt-1">
            {order.fillPercentage}% filled
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium">{item.drug_id.drug_name}</span>
              <span className="text-gray-600 ml-2">{item.drug_id.dosage}</span>
              <div className="text-gray-500">{item.dosage_instructions}</div>
            </div>
            <div className="text-right">
              <div>Qty: {item.quantity}</div>
              <div className={`text-xs ${item.available.available ? 'text-green-600' : 'text-red-600'}`}>
                {item.available.available ? 'In stock' : `Shortage: ${item.available.shortage}`}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedPrescription(order)}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View Details
          </button>
          {order.orderStatus === 'pending' && (
            <button
              onClick={() => sendToPharmacy(order.id)}
              disabled={loading}
              className="text-green-600 hover:text-green-800 text-sm flex items-center"
            >
              <PaperAirplaneIcon className="h-4 w-4 mr-1" />
              Send to Pharmacy
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {order.items.filter(item => !item.available.available).length > 0 && (
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 inline mr-1" />
          )}
          {order.items.filter(item => !item.available.available).length} items low in stock
        </div>
      </div>
    </div>
  );

  const renderPrescriptionDetail = () => {
    if (!selectedPrescription) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Prescription Details</h3>
              <button
                onClick={() => setSelectedPrescription(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                <dl className="space-y-1 text-sm">
                  <div>
                    <dt className="text-gray-500">Name:</dt>
                    <dd>{selectedPrescription.patient_id.first_name} {selectedPrescription.patient_id.last_name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Phone:</dt>
                    <dd>{selectedPrescription.patient_id.phone_number || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Prescription Date:</dt>
                    <dd>{new Date(selectedPrescription.prescription_date).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Order Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Current Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${orderStatuses[selectedPrescription.orderStatus]?.color}`}>
                      {orderStatuses[selectedPrescription.orderStatus]?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fill Progress:</span>
                    <span>{selectedPrescription.fillPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            <h4 className="font-medium text-gray-900 mb-3">Medications</h4>
            <div className="space-y-3">
              {selectedPrescription.items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium">{item.drug_id.drug_name}</span>
                      <span className="text-gray-600 ml-2">{item.drug_id.dosage}</span>
                    </div>
                    <div className={`text-sm ${item.available.available ? 'text-green-600' : 'text-red-600'}`}>
                      {item.available.available ? 'Available' : 'Low Stock'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Instructions:</span>
                      <p>{item.dosage_instructions}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <p>{item.quantity} for {item.duration_days} days</p>
                    </div>
                  </div>

                  {item.inventory && item.inventory.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Available Stock:</span>
                      <div className="space-y-1 mt-1">
                        {item.inventory.map((stock, stockIndex) => (
                          <div key={stockIndex} className="text-xs text-gray-600">
                            Batch {stock.batch_number}: {stock.quantity} units (Exp: {new Date(stock.expiry_date).toLocaleDateString()})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.drug_dispensing && item.drug_dispensing.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Dispensing History:</span>
                      {item.drug_dispensing.map((dispensing, dispIndex) => (
                        <div key={dispIndex} className="text-xs text-gray-600">
                          {dispensing.quantity_dispensed} units on {new Date(dispensing.dispensed_at).toLocaleDateString()}
                          {dispensing.dispensed_by && ` by ${dispensing.dispensed_by.first_name} ${dispensing.dispensed_by.last_name}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedPrescription.notes && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Doctor's Notes</h4>
                <p className="text-sm text-gray-600">{selectedPrescription.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filteredOrders = filterOrders();

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pharmacy Orders</h1>
        <p className="text-gray-600">Electronic prescription sending and drug availability tracking</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients or medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-medical pl-10"
            />
          </div>
          
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="input-medical"
          >
            <option value="all">All Statuses</option>
            {Object.entries(orderStatuses).map(([key, status]) => (
              <option key={key} value={key}>{status.name}</option>
            ))}
          </select>
        </div>

        {/* Quick Stats */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Active Orders</p>
              <p className="text-2xl font-bold text-blue-600">
                {pharmacyOrders.filter(o => !['filled', 'cancelled'].includes(o.orderStatus)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Pharmacy Orders</h3>
            </div>
            <div className="p-6">
              {filteredOrders.length > 0 ? (
                <div className="space-y-4">
                  {filteredOrders.map(renderOrderCard)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TruckIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No pharmacy orders found</p>
                  <p className="text-sm">Create prescriptions to see them here</p>
                  <button 
                    onClick={() => navigate('/doctor-prescriptions')}
                    className="btn-primary mt-4"
                  >
                    Create Prescription
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Drug Availability Summary */}
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Drug Availability</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {drugInventory.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="truncate">{item.drug_id.drug_name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.quantity > 20 ? 'bg-green-100 text-green-800' :
                      item.quantity > 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.quantity} in stock
                    </span>
                  </div>
                ))}
                {drugInventory.length > 5 && (
                  <button className="text-blue-600 text-sm w-full text-center">
                    View all {drugInventory.length} drugs
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {Object.entries(orderStatuses).map(([key, status]) => (
                  <div key={key} className="flex items-center text-sm">
                    <span className={`w-3 h-3 rounded-full mr-2 ${status.color.split(' ')[0]}`}></span>
                    <span>{status.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Detail Modal */}
      {renderPrescriptionDetail()}
    </DashboardLayout>
  );
};

export default DoctorPharmacy;