import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  QrCodeIcon,
  PrinterIcon,
  ChartBarIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const DispensingManagement = () => {
  const { user } = useAuth();
  const [dispensingRecords, setDispensingRecords] = useState([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dispensingForm, setDispensingForm] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [barcodeSearch, setBarcodeSearch] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/pharmacist-dashboard', icon: BuildingLibraryIcon },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: ClipboardDocumentListIcon },
    { name: 'Dispensing Workflow', href: '/pharmacy/dispensing-workflow', icon: ClipboardDocumentListIcon },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: TruckIcon },
    { name: 'Dispensing', href: '/pharmacy/dispensing', icon: CheckCircleIcon },
    { name: 'Drug Administration', href: '/pharmacy/administration', icon: UserGroupIcon },
    { name: 'Reports', href: '/pharmacy/reports', icon: ChartBarIcon },
  ];


  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending Dispensing' },
    { value: 'partial', label: 'Partially Dispensed' },
    { value: 'completed', label: 'Fully Dispensed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    fetchDispensingData();
  }, [user]);

  useEffect(() => {
    filterRecords();
    calculateAnalytics();
  }, [dispensingRecords, searchTerm, statusFilter, dateFilter, barcodeSearch]);

  const fetchDispensingData = async () => {
  try {
    setLoading(true);
    
    // Fetch processed prescriptions ready for dispensing
    const { data: processedStatus } = await supabase
      .from('prescription_statuses')
      .select('id')
      .eq('status_code', 'processed')
      .single();

    // Simplified prescription query
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select(`
        id,
        prescription_date,
        notes,
        patients (
          users (first_name, last_name, phone_number)
        ),
        medical_staff (
          users (first_name, last_name)
        ),
        prescription_items (
          id,
          quantity,
          dosage_instructions,
          duration_days,
          drugs (drug_name, generic_name, dosage, requires_prescription)
        )
      `)
      .eq('status_id', processedStatus?.id)
      .order('prescription_date', { ascending: false });

    // Get dispensing data separately for each prescription item
    if (prescriptions) {
      for (let prescription of prescriptions) {
        for (let item of prescription.prescription_items) {
          const { data: dispensing } = await supabase
            .from('drug_dispensing')
            .select('quantity_dispensed')
            .eq('prescription_item_id', item.id);
          
          item.drug_dispensing = dispensing || [];
        }
      }
    }

    setPendingPrescriptions(prescriptions || []);

    // Simplified dispensing history query - break into multiple queries
    // First get basic dispensing records
    const { data, error } = await supabase
      .from('drug_dispensing')
      .select(`
        id,
        quantity_dispensed,
        dispensed_at,
        notes,
        dispensed_by,
        prescription_item_id,
        inventory_id,
        medical_staff!dispensed_by(
          users(first_name, last_name)
        )
      `)
      .order('dispensed_at', { ascending: false })
      .limit(100);
      if (error) throw error; // Limit results to avoid overload

    // Then enrich the data with additional information
    if (data) {
      const enrichedRecords = await Promise.all(
        data.map(async (record) => { // ✅ Now using 'data' which is defined
          // Get prescription item details
          const { data: prescriptionItem } = await supabase
            .from('prescription_items')
            .select(`
              quantity,
              dosage_instructions,
              drug_id,
              prescription_id,
              drugs(drug_name, generic_name, dosage)
            `)
            .eq('id', record.prescription_item_id)
            .single();

          // Get prescription details
          const { data: prescription } = await supabase
            .from('prescriptions')
            .select(`
              prescription_date,
              patient_id,
              doctor_id
            `)
            .eq('id', prescriptionItem?.prescription_id)
            .single();

          // Get patient details
          const { data: patient } = await supabase
            .from('patients')
            .select(`
              users(first_name, last_name)
            `)
            .eq('id', prescription?.patient_id)
            .single();

          // Get doctor details
          const { data: doctor } = await supabase
            .from('medical_staff')
            .select(`
              users(first_name, last_name)
            `)
            .eq('id', prescription?.doctor_id)
            .single();

          // Get inventory details
          const { data: inventory } = await supabase
            .from('drug_inventory')
            .select('batch_number, unit_price')
            .eq('id', record.inventory_id)
            .single();

          return {
            ...record,
            prescription_items: {
              ...prescriptionItem,
              prescriptions: {
                ...prescription,
                patients: { users: patient?.users },
                medical_staff: { users: doctor?.users }
              }
            },
            drug_inventory: inventory
          };
        })
      );

      setDispensingRecords(enrichedRecords);
    } else {
      setDispensingRecords([]);
    }

  } catch (error) {
    console.error('Error fetching dispensing data:', error);
    alert('Error loading dispensing data: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const filterRecords = () => {
    const now = new Date();
    let filtered = dispensingRecords;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.prescription_items.prescriptions.patients.users.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.prescription_items.prescriptions.patients.users.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.prescription_items.drugs.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.prescription_items.drugs.generic_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Barcode search
    if (barcodeSearch) {
      filtered = filtered.filter(record =>
        record.drug_inventory.batch_number.includes(barcodeSearch) ||
        record.prescription_items.drugs.drug_name.toLowerCase().includes(barcodeSearch.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.dispensed_at);
        switch (dateFilter) {
          case 'today':
            return recordDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return recordDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return recordDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredRecords(filtered);
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const today = new Date(now.toDateString());
    
    const todayDispensing = dispensingRecords.filter(record => 
      new Date(record.dispensed_at) >= today
    );

    const totalDispensed = dispensingRecords.reduce((sum, record) => 
      sum + record.quantity_dispensed, 0
    );

    const todayValue = todayDispensing.reduce((sum, record) => 
      sum + (record.quantity_dispensed * record.drug_inventory.unit_price), 0
    );

    const totalValue = dispensingRecords.reduce((sum, record) => 
      sum + (record.quantity_dispensed * record.drug_inventory.unit_price), 0
    );

    const uniquePatients = new Set(dispensingRecords.map(record => 
      record.prescription_items.prescriptions.patients.users.first_name + 
      record.prescription_items.prescriptions.patients.users.last_name
    )).size;

    setAnalytics({
      todayCount: todayDispensing.length,
      todayValue,
      totalCount: dispensingRecords.length,
      totalValue,
      totalDispensed,
      uniquePatients
    });
  };

  const openDispenseModal = (prescription) => {
    setSelectedPrescription(prescription);
    
    // Initialize dispensing form with available quantities
    const formData = {};
    prescription.prescription_items.forEach(item => {
      const alreadyDispensed = item.drug_dispensing?.reduce((sum, disp) => sum + disp.quantity_dispensed, 0) || 0;
      const remaining = item.quantity - alreadyDispensed;
      
      formData[item.id] = {
        prescriptionItemId: item.id,
        drugName: item.drugs.drug_name,
        prescribedQuantity: item.quantity,
        alreadyDispensed,
        remaining,
        toDispense: remaining > 0 ? remaining : 0,
        dosage: item.dosage_instructions,
        duration: item.duration_days
      };
    });

    setDispensingForm(formData);
    setShowDispenseModal(true);
  };

  const openDetailsModal = (record) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const updateDispensingQuantity = (itemId, quantity) => {
    const item = dispensingForm[itemId];
    const newQuantity = Math.max(0, Math.min(quantity, item.remaining));
    
    setDispensingForm(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        toDispense: newQuantity
      }
    }));
  };

  const dispenseMedications = async () => {
    try {
      setProcessing(true);
      
      // Get dispensed status ID
      const { data: dispensedStatus } = await supabase
        .from('prescription_statuses')
        .select('id')
        .eq('status_code', 'dispensed')
        .single();

      // Process each medication
      for (const itemId in dispensingForm) {
        const item = dispensingForm[itemId];
        
        if (item.toDispense > 0) {
          // Find available inventory
          const { data: inventory } = await supabase
            .from('drug_inventory')
            .select('*')
            .eq('drug_id', selectedPrescription.prescription_items.find(pi => pi.id === itemId).drugs.id)
            .gt('quantity', 0)
            .gt('expiry_date', new Date().toISOString())
            .order('expiry_date', { ascending: true })
            .limit(1);

          if (!inventory || inventory.length === 0) {
            throw new Error(`No inventory available for ${item.drugName}`);
          }

          const inventoryItem = inventory[0];
          const quantityToDispense = Math.min(item.toDispense, inventoryItem.quantity);

          // Create dispensing record
          const { error: dispensingError } = await supabase
            .from('drug_dispensing')
            .insert({
              prescription_item_id: itemId,
              inventory_id: inventoryItem.id,
              quantity_dispensed: quantityToDispense,
              dispensed_by: user.id,
              notes: `Dispensed ${quantityToDispense} of ${item.prescribedQuantity} prescribed`
            });

          if (dispensingError) throw dispensingError;

          // Update inventory
          const { error: inventoryError } = await supabase
            .from('drug_inventory')
            .update({ 
              quantity: inventoryItem.quantity - quantityToDispense 
            })
            .eq('id', inventoryItem.id);

          if (inventoryError) throw inventoryError;
        }
      }

      // Check if all items are fully dispensed
      const allDispensed = Object.values(dispensingForm).every(item => 
        item.toDispense === item.remaining
      );

      if (allDispensed) {
        // Update prescription status to dispensed
        const { error: statusError } = await supabase
          .from('prescriptions')
          .update({ status_id: dispensedStatus.id })
          .eq('id', selectedPrescription.id);

        if (statusError) throw statusError;
      }

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'prescription_dispensed').single()).data?.id,
          table_name: 'prescriptions',
          record_id: selectedPrescription.id,
          new_values: dispensingForm,
          notes: `Medications dispensed for prescription ${selectedPrescription.id}`
        });

      setShowDispenseModal(false);
      fetchDispensingData();
      alert('Medications dispensed successfully!');
    } catch (error) {
      console.error('Error dispensing medications:', error);
      alert('Error dispensing medications: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const generateDispensingLabel = (record) => {
    const labelContent = `
      DRUG DISPENSING LABEL
      =====================
      Patient: ${record.prescription_items.prescriptions.patients.users.first_name} ${record.prescription_items.prescriptions.patients.users.last_name}
      Medication: ${record.prescription_items.drugs.drug_name}
      Generic: ${record.prescription_items.drugs.generic_name}
      Dosage: ${record.prescription_items.dosage_instructions}
      Quantity: ${record.quantity_dispensed}
      Batch: ${record.drug_inventory.batch_number}
      Dispensed: ${new Date(record.dispensed_at).toLocaleDateString()}
      Pharmacist: ${record.users.first_name} ${record.users.last_name}
      
      Instructions: Take as directed by physician
      Store in a cool, dry place
    `;

    const blob = new Blob([labelContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label_${record.prescription_items.drugs.drug_name}_${record.drug_inventory.batch_number}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportDispensingReport = () => {
    const headers = ['Date', 'Patient', 'Medication', 'Quantity', 'Batch', 'Unit Price', 'Total Value', 'Pharmacist'];
    const csvData = filteredRecords.map(record => [
      new Date(record.dispensed_at).toLocaleDateString(),
      `${record.prescription_items.prescriptions.patients.users.first_name} ${record.prescription_items.prescriptions.patients.users.last_name}`,
      record.prescription_items.drugs.drug_name,
      record.quantity_dispensed,
      record.drug_inventory.batch_number,
      `N$${record.drug_inventory.unit_price.toFixed(2)}`,
      `N$${(record.quantity_dispensed * record.drug_inventory.unit_price).toFixed(2)}`,
      `${record.users.first_name} ${record.users.last_name}`
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispensing_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getDispensingStatus = (prescription) => {
    const totalItems = prescription.prescription_items.length;
    const dispensedItems = prescription.prescription_items.filter(item => 
      item.drug_dispensing && item.drug_dispensing.length > 0
    ).length;

    if (dispensedItems === 0) return { status: 'pending', color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
    if (dispensedItems === totalItems) return { status: 'completed', color: 'bg-green-100 text-green-800', label: 'Completed' };
    return { status: 'partial', color: 'bg-blue-100 text-blue-800', label: 'Partial' };
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

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Drug Dispensing</h1>
            <p className="text-gray-600">Smart medication dispensing with barcode tracking and analytics</p>
          </div>
          <button
            onClick={exportDispensingReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Today's Dispensing</p>
              <p className="text-2xl font-bold text-blue-900">{analytics.todayCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Today's Value</p>
              <p className="text-2xl font-bold text-green-900">N${analytics.todayValue?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Total Patients</p>
              <p className="text-2xl font-bold text-purple-900">{analytics.uniquePatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Total Dispensed</p>
              <p className="text-2xl font-bold text-orange-900">{analytics.totalDispensed}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Pending Rx</p>
              <p className="text-2xl font-bold text-red-900">{pendingPrescriptions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-indigo-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-indigo-600">Total Value</p>
              <p className="text-2xl font-bold text-indigo-900">N${analytics.totalValue?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patients or medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Barcode Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <QrCodeIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Scan barcode or batch..."
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Results Count */}
          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">
              {filteredRecords.length} of {dispensingRecords.length} records
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Pending Prescriptions Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
            <h3 className="text-lg font-medium text-orange-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Prescriptions Ready for Dispensing ({pendingPrescriptions.length})
            </h3>
          </div>
          <div className="p-6">
            {pendingPrescriptions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">All prescriptions have been dispensed!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPrescriptions.map(prescription => {
                  const status = getDispensingStatus(prescription);
                  return (
                    <div key={prescription.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {prescription.patients.users.first_name} {prescription.patients.users.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Dr. {prescription.medical_staff.users.first_name} • {new Date(prescription.prescription_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {prescription.prescription_items.slice(0, 3).map(item => {
                            const dispensed = item.drug_dispensing?.reduce((sum, d) => sum + d.quantity_dispensed, 0) || 0;
                            const remaining = item.quantity - dispensed;
                            return (
                              <span key={item.id} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                                {item.drugs.drug_name} ({remaining}/{item.quantity})
                              </span>
                            );
                          })}
                          {prescription.prescription_items.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-50 text-gray-600">
                              +{prescription.prescription_items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openDispenseModal(prescription)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
                      >
                        Dispense Medications
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dispensing History Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-medium text-blue-900 flex items-center">
              <TruckIcon className="h-5 w-5 mr-2" />
              Dispensing History
            </h3>
          </div>
          <div className="p-6">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No dispensing records found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredRecords.map(record => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {record.prescription_items.prescriptions.patients.users.first_name} {record.prescription_items.prescriptions.patients.users.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{record.prescription_items.drugs.drug_name}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(record.dispensed_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      <div>Quantity: <span className="font-medium">{record.quantity_dispensed}</span></div>
                      <div>Batch: <span className="font-medium">{record.drug_inventory.batch_number}</span></div>
                      <div>Value: <span className="font-medium">N${(record.quantity_dispensed * record.drug_inventory.unit_price).toFixed(2)}</span></div>
                      <div>By: <span className="font-medium">{record.users.first_name}</span></div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailsModal(record)}
                        className="flex-1 bg-gray-100 text-gray-700 py-1 rounded text-sm hover:bg-gray-200 transition duration-200"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => generateDispensingLabel(record)}
                        className="flex-1 bg-green-100 text-green-700 py-1 rounded text-sm hover:bg-green-200 transition duration-200 flex items-center justify-center"
                      >
                        <PrinterIcon className="h-4 w-4 mr-1" />
                        Label
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispense Medications Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Dispense Medications</h3>
              
              {/* Patient Info */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Patient Information</h4>
                <p><strong>Name:</strong> {selectedPrescription.patients.users.first_name} {selectedPrescription.patients.users.last_name}</p>
                <p><strong>Phone:</strong> {selectedPrescription.patients.users.phone_number || 'N/A'}</p>
                <p><strong>Prescription Date:</strong> {new Date(selectedPrescription.prescription_date).toLocaleDateString()}</p>
                <p><strong>Prescribing Doctor:</strong> Dr. {selectedPrescription.medical_staff.users.first_name}</p>
              </div>

              {/* Medications */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-gray-900">Medications to Dispense</h4>
                {Object.values(dispensingForm).map(item => (
                  <div key={item.prescriptionItemId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-medium text-gray-900">{item.drugName}</h5>
                        <p className="text-sm text-gray-600">Dosage: {item.dosage}</p>
                        <p className="text-sm text-gray-600">Duration: {item.duration} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Prescribed: {item.prescribedQuantity}</p>
                        <p className="text-sm text-gray-600">Already Dispensed: {item.alreadyDispensed}</p>
                        <p className="text-sm font-medium text-blue-600">Remaining: {item.remaining}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">Quantity to Dispense:</label>
                      <input
                        type="number"
                        min="0"
                        max={item.remaining}
                        value={item.toDispense}
                        onChange={(e) => updateDispensingQuantity(item.prescriptionItemId, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <span className="text-sm text-gray-500">Max: {item.remaining}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-green-900 mb-2">Dispensing Summary</h4>
                <p>Total items to dispense: {Object.values(dispensingForm).filter(item => item.toDispense > 0).length}</p>
                <p>Total quantity: {Object.values(dispensingForm).reduce((sum, item) => sum + item.toDispense, 0)} units</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={dispenseMedications}
                  disabled={processing || Object.values(dispensingForm).every(item => item.toDispense === 0)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Dispensing...' : 'Confirm Dispensing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispensing Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Dispensing Details</h3>
              
              <div className="space-y-3">
                <div>
                  <strong>Patient:</strong> {selectedRecord.prescription_items.prescriptions.patients.users.first_name} {selectedRecord.prescription_items.prescriptions.patients.users.last_name}
                </div>
                <div>
                  <strong>Medication:</strong> {selectedRecord.prescription_items.drugs.drug_name}
                </div>
                <div>
                  <strong>Generic:</strong> {selectedRecord.prescription_items.drugs.generic_name}
                </div>
                <div>
                  <strong>Quantity Dispensed:</strong> {selectedRecord.quantity_dispensed}
                </div>
                <div>
                  <strong>Batch Number:</strong> {selectedRecord.drug_inventory.batch_number}
                </div>
                <div>
                  <strong>Unit Price:</strong> N${selectedRecord.drug_inventory.unit_price.toFixed(2)}
                </div>
                <div>
                  <strong>Total Value:</strong> N${(selectedRecord.quantity_dispensed * selectedRecord.drug_inventory.unit_price).toFixed(2)}
                </div>
                <div>
                  <strong>Dispensed By:</strong> {selectedRecord.users.first_name} {selectedRecord.users.last_name}
                </div>
                <div>
                  <strong>Dispensed At:</strong> {new Date(selectedRecord.dispensed_at).toLocaleString()}
                </div>
                {selectedRecord.notes && (
                  <div>
                    <strong>Notes:</strong> {selectedRecord.notes}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => generateDispensingLabel(selectedRecord)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Print Label
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DispensingManagement;