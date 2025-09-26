import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const PharmacistDashboard = () => {
  const { user } = useAuth();
  const [pharmacistData, setPharmacistData] = useState(null);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [todaysAdministrations, setTodaysAdministrations] = useState([]);
  const [stats, setStats] = useState({
    pendingRx: 0,
    totalDrugs: 0,
    lowStock: 0,
    todaySales: 0,
    administrationsToday: 0,
    complianceRate: 0
  });
  const [loading, setLoading] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/pharmacist-dashboard', icon: BuildingLibraryIcon },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: ClipboardDocumentListIcon },
    { name: 'Dispensing Workflow', href: '/pharmacy/dispensing-workflow', icon: ClipboardDocumentListIcon },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: TruckIcon },
    { name: 'Dispensing', href: '/pharmacy/dispensing', icon: CheckCircleIcon },
    { name: 'Drug Administration', href: '/pharmacy/administration', icon: UserGroupIcon },
    { name: 'Reports', href: '/pharmacy/reports', icon: ChartBarIcon },
  ];

  useEffect(() => {
    if (user) {
      fetchPharmacistData();
    }
  }, [user]);

  const fetchPharmacistData = async () => {
  try {
    setLoading(true);
    
    // Get pharmacist profile with department info
    const { data: pharmacist, error: pharmacistError } = await supabase
      .from('medical_staff')
      .select(`
        *,
        users!inner(first_name, last_name, email, phone_number),
        departments(department_name)
      `)
      .eq('id', user.id)
      .single();

    if (pharmacistError) throw pharmacistError;
    setPharmacistData(pharmacist);

    // Get prescription status IDs
    const { data: statuses } = await supabase
      .from('prescription_statuses')
      .select('id, status_code')
      .in('status_code', ['pending', 'processed', 'dispensed']);

    const statusMap = {};
    statuses?.forEach(status => {
      statusMap[status.status_code] = status.id;
    });

    // Get pending prescriptions count and details
    const { data: pendingRx, error: rxError } = await supabase
      .from('prescriptions')
      .select('*', { count: 'exact' })
      .eq('status_id', statusMap.pending);

    if (rxError) console.error('Rx error:', rxError);

    // Get all non-expired inventory items
    const { data: inventory, error: stockError } = await supabase
      .from('drug_inventory')
      .select(`
        *,
        drugs!inner(drug_name, generic_name, dosage)
      `)
      .gt('expiry_date', new Date().toISOString());

    if (stockError) console.error('Stock error:', stockError);
    
    // Filter low stock items on client side
    const lowStockItemsFiltered = inventory?.filter(item => item.quantity <= item.reorder_level) || [];
    setLowStockItems(lowStockItemsFiltered);

    // Rest of the function remains the same...
    // Get today's drug administrations
    const today = new Date().toISOString().split('T')[0];
    const { data: administrations, error: adminError } = await supabase
      .from('drug_administration')
      .select(`
        *,
        patients!inner(
          users!inner(first_name, last_name)
        ),
        prescription_items!inner(
          drugs!inner(drug_name)
        )
      `)
      .gte('scheduled_time', `${today}T00:00:00`)
      .lte('scheduled_time', `${today}T23:59:59`)
      .order('scheduled_time', { ascending: true });

    if (adminError) console.error('Admin error:', adminError);
    setTodaysAdministrations(administrations || []);

    // Calculate today's sales from dispensing records
    const { data: todayDispensing, error: dispensingError } = await supabase
      .from('drug_dispensing')
      .select(`
        quantity_dispensed,
        drug_inventory!inner(unit_price)
      `)
      .gte('dispensed_at', `${today}T00:00:00`)
      .lte('dispensed_at', `${today}T23:59:59`);

    const todaySales = todayDispensing?.reduce((total, item) => {
      return total + (item.quantity_dispensed * (item.drug_inventory?.unit_price || 0));
    }, 0) || 0;

    // Get total active drugs count (non-expired)
    const { data: drugs, error: drugsError } = await supabase
      .from('drug_inventory')
      .select('drug_id', { count: 'exact' })
      .gt('expiry_date', new Date().toISOString())
      .gt('quantity', 0);

    if (drugsError) console.error('Drugs error:', drugsError);

    // Calculate compliance rate
    const { data: complianceData } = await supabase
      .from('treatment_compliance')
      .select('compliance_percentage')
      .gte('calculation_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('calculation_date', { ascending: false })
      .limit(100);

    const avgCompliance = complianceData?.length > 0 
      ? complianceData.reduce((sum, item) => sum + item.compliance_percentage, 0) / complianceData.length 
      : 0;

    // Fetch recent pending prescriptions with details
    await fetchPendingPrescriptions(statusMap.pending);

    setStats({
      pendingRx: pendingRx?.length || 0,
      totalDrugs: drugs?.length || 0,
      lowStock: lowStockItemsFiltered?.length || 0,
      todaySales: Math.round(todaySales * 100) / 100,
      administrationsToday: administrations?.length || 0,
      complianceRate: Math.round(avgCompliance * 100) / 100
    });

  } catch (error) {
    console.error('Error fetching pharmacist data:', error);
  } finally {
    setLoading(false);
  }
};

  const fetchPendingPrescriptions = async (pendingStatusId) => {
    try {
      const { data: prescriptions, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_date,
          notes,
          patients!inner(
            users!inner(first_name, last_name)
          ),
          medical_staff!inner(
            users!inner(first_name, last_name)
          ),
          prescription_items(
            id,
            dosage_instructions,
            duration_days,
            drugs!inner(drug_name, generic_name)
          )
        `)
        .eq('status_id', pendingStatusId)
        .order('prescription_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPendingPrescriptions(prescriptions || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  const processPrescription = async (prescriptionId) => {
    try {
      // Get processed status ID
      const { data: status } = await supabase
        .from('prescription_statuses')
        .select('id')
        .eq('status_code', 'processed')
        .single();

      if (!status) throw new Error('Processed status not found');

      const { error } = await supabase
        .from('prescriptions')
        .update({ 
          status_id: status.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      // Refresh data
      fetchPharmacistData();
      
      // Show success message
      alert('Prescription processed successfully!');
    } catch (error) {
      console.error('Error processing prescription:', error);
      alert('Error processing prescription: ' + error.message);
    }
  };

  const reorderDrug = async (inventoryId, drugName) => {
  try {
    // First, get the current quantity
    const { data: currentItem, error: fetchError } = await supabase
      .from('drug_inventory')
      .select('quantity')
      .eq('id', inventoryId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new quantity
    const newQuantity = (currentItem.quantity || 0) + 50;

    // Update with the new quantity
    const { error } = await supabase
      .from('drug_inventory')
      .update({ 
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId);

    if (error) throw error;

    // Log the reorder activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'drug_reorder').single()).data?.id,
        table_name: 'drug_inventory',
        record_id: inventoryId,
        new_values: { reorder_quantity: 50, new_quantity: newQuantity },
        notes: `Manual reorder of ${drugName}`
      });

    // Refresh data
    fetchPharmacistData();
    
    alert(`Reorder placed for ${drugName}! Inventory updated.`);
  } catch (error) {
    console.error('Error reordering drug:', error);
    alert('Error placing reorder: ' + error.message);
  }
};

  const markAdministrationComplete = async (administrationId, status) => {
    try {
      const { error } = await supabase
        .from('drug_administration')
        .update({
          status: status,
          actual_time: new Date().toISOString(),
          administered_by: user.id
        })
        .eq('id', administrationId);

      if (error) throw error;

      // Refresh data
      fetchPharmacistData();
      
      alert(`Administration marked as ${status}`);
    } catch (error) {
      console.error('Error updating administration:', error);
      alert('Error updating administration: ' + error.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const userDisplayName = pharmacistData?.users 
    ? `${pharmacistData.users.first_name} ${pharmacistData.users.last_name}`
    : 'Pharmacist User';

  return (
    <DashboardLayout user={{ ...user, name: userDisplayName, role: 'pharmacist' }} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Pharmacist Dashboard</h1>
        <p className="text-gray-600">Pharmacy management and prescription dispensing</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            {pharmacistData?.departments?.department_name || 'Pharmacy Department'}
          </span>
          <span className="text-sm text-gray-500">
            License: {pharmacistData?.license_number || 'Not specified'}
          </span>
          <span className="text-sm text-gray-500">
            Exp: {pharmacistData?.years_experience || '0'} years
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Rx</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingRx}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <BuildingLibraryIcon className="h-6 w-6 text-green-600" />
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Drugs</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalDrugs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Low Stock</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.lowStock}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <TruckIcon className="h-6 w-6 text-purple-600" />
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today's Sales</dt>
                  <dd className="text-lg font-medium text-gray-900">N${stats.todaySales}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <UserGroupIcon className="h-6 w-6 text-red-600" />
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Admin Today</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.administrationsToday}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <ChartBarIcon className="h-6 w-6 text-indigo-600" />
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Compliance</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.complianceRate}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Prescriptions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Pending Prescriptions</h3>
            <Link to="/pharmacy/prescriptions" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="p-6">
            {pendingPrescriptions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No pending prescriptions</p>
            ) : (
              pendingPrescriptions.map(rx => (
                <div key={rx.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {rx.patients?.users?.first_name} {rx.patients?.users?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Dr. {rx.medical_staff?.users?.first_name} • {rx.prescription_items?.length || 0} meds
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(rx.prescription_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={() => processPrescription(rx.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition duration-200"
                    >
                      Process
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50">
            <h3 className="text-lg font-medium text-red-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Low Stock Items
            </h3>
          </div>
          <div className="p-6">
            {lowStockItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">All items are well stocked</p>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.drugs?.drug_name}</p>
                    <p className="text-sm text-gray-600">
                      {item.drugs?.generic_name} • Reorder at: {item.reorder_level}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-medium">{item.quantity} left</p>
                    <button 
                      onClick={() => reorderDrug(item.id, item.drugs?.drug_name)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium mt-1"
                    >
                      Reorder
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Administrations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
            <h3 className="text-lg font-medium text-blue-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Today's Administrations
            </h3>
          </div>
          <div className="p-6">
            {todaysAdministrations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No administrations scheduled for today</p>
            ) : (
              todaysAdministrations.map(admin => (
                <div key={admin.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {admin.patients?.users?.first_name} {admin.patients?.users?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {admin.prescription_items?.drugs?.drug_name} • {admin.dosage_administered}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(admin.scheduled_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      admin.status === 'administered' ? 'bg-green-100 text-green-800' :
                      admin.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {admin.status}
                    </span>
                    {admin.status === 'scheduled' && (
                      <button 
                        onClick={() => markAdministrationComplete(admin.id, 'administered')}
                        className="block text-green-600 hover:text-green-800 text-sm font-medium mt-1"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Pharmacy Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Link to="/pharmacy/prescriptions" className="bg-white border border-blue-200 text-blue-700 p-3 rounded-lg hover:bg-blue-50 transition duration-200 flex flex-col items-center">
            <ClipboardDocumentListIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium text-center">Process Prescriptions</span>
          </Link>
          <Link to="/pharmacy/inventory" className="bg-white border border-green-200 text-green-700 p-3 rounded-lg hover:bg-green-50 transition duration-200 flex flex-col items-center">
            <TruckIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium text-center">Manage Inventory</span>
          </Link>
          <Link to="/pharmacy/dispensing" className="bg-white border border-purple-200 text-purple-700 p-3 rounded-lg hover:bg-purple-50 transition duration-200 flex flex-col items-center">
            <CheckCircleIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium text-center">Drug Dispensing</span>
          </Link>
          <Link to="/pharmacy/administration" className="bg-white border border-red-200 text-red-700 p-3 rounded-lg hover:bg-red-50 transition duration-200 flex flex-col items-center">
            <UserGroupIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium text-center">Administration</span>
          </Link>
          <Link to="/pharmacy/reports" className="bg-white border border-orange-200 text-orange-700 p-3 rounded-lg hover:bg-orange-50 transition duration-200 flex flex-col items-center">
            <ChartBarIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium text-center">Reports</span>
          </Link>
          {/* <Link to="/pharmacy/settings" className="bg-white border border-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition duration-200 flex flex-col items-center">
            <CogIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium text-center">Settings</span>
          </Link> */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacistDashboard;