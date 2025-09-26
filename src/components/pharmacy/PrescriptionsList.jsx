import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  ClipboardDocumentListIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  BuildingLibraryIcon,
  TruckIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const PrescriptionsList = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

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
    { value: 'pending', label: 'Pending' },
    { value: 'processed', label: 'Processed' },
    { value: 'dispensed', label: 'Dispensed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const dateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  useEffect(() => {
    fetchPrescriptions();
  }, [user]);

  useEffect(() => {
    filterPrescriptions();
  }, [prescriptions, searchTerm, statusFilter, dateFilter]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      
      // Get prescription statuses mapping
      const { data: statuses } = await supabase
        .from('prescription_statuses')
        .select('*');
      
      const statusMap = {};
      statuses?.forEach(status => {
        statusMap[status.id] = status.status_code;
      });

      // Fetch prescriptions with related data
      const { data: prescriptionsData, error } = await supabase
      .from('prescriptions')
      .select(`
        id,
        prescription_date,
        notes,
        status_id,
        created_at,
        patient_id,
        doctor_id
      `)
      .order('prescription_date', { ascending: false });

    if (error) throw error;

        const enrichedPrescriptions = await Promise.all(
      prescriptionsData?.map(async (prescription) => {
        // Get patient info
        const { data: patient } = await supabase
          .from('patients')
          .select(`
            users (first_name, last_name, phone_number, date_of_birth)
          `)
          .eq('id', prescription.patient_id)
          .single();

        // Get doctor info
        const { data: medicalStaff } = await supabase
          .from('medical_staff')
          .select(`
            users (first_name, last_name),
            specializations (specialization_name)
          `)
          .eq('id', prescription.doctor_id)
          .single();

        // Get prescription items
        const { data: prescriptionItems } = await supabase
          .from('prescription_items')
          .select(`
            id,
            quantity,
            dosage_instructions,
            duration_days,
            drugs (drug_name, generic_name, dosage, requires_prescription)
          `)
          .eq('prescription_id', prescription.id);

        // Get diagnoses
        const { data: medicalDiagnoses } = await supabase
          .from('medical_diagnoses')
          .select(`
            diseases (disease_name)
          `)
          .eq('prescription_id', prescription.id);

        return {
          ...prescription,
          status: statusMap[prescription.status_id] || 'unknown',
          patients: patient ? { users: patient.users } : null,
          medical_staff: medicalStaff,
          prescription_items: prescriptionItems || [],
          medical_diagnoses: medicalDiagnoses || []
        };
      }) || []
    )

      // Map status codes to prescriptions
    //   const prescriptionsWithStatus = prescriptionsData?.map(prescription => ({
    //     ...prescription,
    //     status: statusMap[prescription.status_id] || 'unknown'
    //   })) || [];

      setPrescriptions(enrichedPrescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    alert('Error loading prescriptions: ' + error.message);
  } finally {
    setLoading(false);
    }
  };

  const filterPrescriptions = () => {
    let filtered = prescriptions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(prescription =>
        prescription.patients.users.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.patients.users.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.medical_staff.users.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prescription.prescription_items.some(item => 
          item.drugs.drug_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(prescription => prescription.status === statusFilter);
    }

    // Date filter
    const now = new Date();
    if (dateFilter !== 'all') {
      filtered = filtered.filter(prescription => {
        const prescriptionDate = new Date(prescription.prescription_date);
        switch (dateFilter) {
          case 'today':
            return prescriptionDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return prescriptionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return prescriptionDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredPrescriptions(filtered);
  };

  const viewPrescriptionDetails = async (prescription) => {
    setSelectedPrescription(prescription);
    setShowModal(true);
  };

  const processPrescription = async (prescriptionId, newStatus) => {
    try {
      setProcessing(true);
      
      // Get the status ID for the new status
      const { data: status } = await supabase
        .from('prescription_statuses')
        .select('id')
        .eq('status_code', newStatus)
        .single();

      if (!status) throw new Error(`Status ${newStatus} not found`);

      const { error } = await supabase
        .from('prescriptions')
        .update({ 
          status_id: status.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      // If dispensing, create dispensing records
      if (newStatus === 'dispensed') {
        await createDispensingRecords(prescriptionId);
      }

      // Log the activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'prescription_processed').single()).data?.id,
          table_name: 'prescriptions',
          record_id: prescriptionId,
          new_values: { status: newStatus },
          notes: `Prescription ${newStatus} by pharmacist`
        });

      // Refresh data
      await fetchPrescriptions();
      setShowModal(false);
      
      alert(`Prescription ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error processing prescription:', error);
      alert('Error processing prescription: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const createDispensingRecords = async (prescriptionId) => {
    try {
      // Get prescription items
      const { data: items } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_id', prescriptionId);

      if (!items) return;

      // For each item, find available inventory and create dispensing record
      for (const item of items) {
        // Find available inventory for this drug
        const { data: inventory } = await supabase
          .from('drug_inventory')
          .select('*')
          .eq('drug_id', item.drug_id)
          .gt('quantity', 0)
          .gt('expiry_date', new Date().toISOString())
          .order('expiry_date', { ascending: true }) // Use oldest first
          .limit(1);

        if (inventory && inventory.length > 0) {
          const availableItem = inventory[0];
          const quantityToDispense = Math.min(item.quantity, availableItem.quantity);

          // Create dispensing record
          await supabase
            .from('drug_dispensing')
            .insert({
              prescription_item_id: item.id,
              inventory_id: availableItem.id,
              quantity_dispensed: quantityToDispense,
              dispensed_by: user.id,
              notes: `Dispensed as part of prescription ${prescriptionId}`
            });

          // Update inventory
          await supabase
            .from('drug_inventory')
            .update({ 
              quantity: availableItem.quantity - quantityToDispense 
            })
            .eq('id', availableItem.id);
        }
      }
    } catch (error) {
      console.error('Error creating dispensing records:', error);
      throw error;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'dispensed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'processed': return <CheckCircleIcon className="h-4 w-4" />;
      case 'dispensed': return <DocumentArrowDownIcon className="h-4 w-4" />;
      case 'cancelled': return <XCircleIcon className="h-4 w-4" />;
      default: return <ClipboardDocumentListIcon className="h-4 w-4" />;
    }
  };

  const exportPrescriptions = () => {
    // Simple CSV export functionality
    const headers = ['Patient Name', 'Doctor', 'Date', 'Status', 'Medications', 'Diagnosis'];
    const csvData = filteredPrescriptions.map(prescription => [
      `${prescription.patients.users.first_name} ${prescription.patients.users.last_name}`,
      `Dr. ${prescription.medical_staff.users.first_name} ${prescription.medical_staff.users.last_name}`,
      new Date(prescription.prescription_date).toLocaleDateString(),
      prescription.status,
      prescription.prescription_items.map(item => item.drugs.drug_name).join('; '),
      prescription.medical_diagnoses.map(d => d.diseases?.disease_name).join('; ') || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescriptions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prescription Management</h1>
            <p className="text-gray-600">Manage and process patient prescriptions</p>
          </div>
          <button
            onClick={exportPrescriptions}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
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
              placeholder="Search prescriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

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
              {filteredPrescriptions.length} of {prescriptions.length} prescriptions
            </span>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Prescriptions</h3>
        </div>
        
        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No prescriptions found matching your criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPrescriptions.map(prescription => (
              <div key={prescription.id} className="p-6 hover:bg-gray-50 transition duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {prescription.patients.users.first_name} {prescription.patients.users.last_name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}>
                        {getStatusIcon(prescription.status)}
                        <span className="ml-1 capitalize">{prescription.status}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Doctor:</span>{' '}
                        Dr. {prescription.medical_staff.users.first_name} {prescription.medical_staff.users.last_name}
                        {prescription.medical_staff.specializations && (
                          <span> ({prescription.medical_staff.specializations.specialization_name})</span>
                        )}
                      </div>
                      
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(prescription.prescription_date).toLocaleDateString()}
                      </div>
                      
                      <div>
                        <span className="font-medium">Medications:</span>{' '}
                        {prescription.prescription_items.length} items
                      </div>
                    </div>

                    {/* Medications Preview */}
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {prescription.prescription_items.slice(0, 3).map(item => (
                          <span key={item.id} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                            {item.drugs.drug_name}
                          </span>
                        ))}
                        {prescription.prescription_items.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-50 text-gray-600">
                            +{prescription.prescription_items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => viewPrescriptionDetails(prescription)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition duration-200"
                      title="View Details"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    
                    {prescription.status === 'pending' && (
                      <button
                        onClick={() => processPrescription(prescription.id, 'processed')}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition duration-200 text-sm font-medium"
                        disabled={processing}
                      >
                        Process
                      </button>
                    )}
                    
                    {prescription.status === 'processed' && (
                      <button
                        onClick={() => processPrescription(prescription.id, 'dispensed')}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition duration-200 text-sm font-medium"
                        disabled={processing}
                      >
                        Dispense
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Detail Modal */}
      {showModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Prescription Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Patient and Doctor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                  <p><strong>Name:</strong> {selectedPrescription.patients.users.first_name} {selectedPrescription.patients.users.last_name}</p>
                  <p><strong>Date of Birth:</strong> {new Date(selectedPrescription.patients.users.date_of_birth).toLocaleDateString()}</p>
                  <p><strong>Phone:</strong> {selectedPrescription.patients.users.phone_number || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Prescribing Doctor</h4>
                  <p><strong>Name:</strong> Dr. {selectedPrescription.medical_staff.users.first_name} {selectedPrescription.medical_staff.users.last_name}</p>
                  <p><strong>Specialization:</strong> {selectedPrescription.medical_staff.specializations?.specialization_name || 'General'}</p>
                </div>
              </div>

              {/* Diagnosis */}
              {selectedPrescription.medical_diagnoses.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Diagnosis</h4>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    {selectedPrescription.medical_diagnoses.map((diagnosis, index) => (
                      <p key={index} className="text-sm">
                        {diagnosis.diseases?.disease_name || 'Unknown Diagnosis'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Prescribed Medications</h4>
                <div className="space-y-4">
                  {selectedPrescription.prescription_items.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{item.drugs.drug_name}</h5>
                          <p className="text-sm text-gray-600">{item.drugs.generic_name}</p>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                          {item.drugs.requires_prescription ? 'Rx Required' : 'OTC'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <strong>Dosage:</strong> {item.dosage_instructions}
                        </div>
                        <div>
                          <strong>Quantity:</strong> {item.quantity}
                        </div>
                        <div>
                          <strong>Duration:</strong> {item.duration_days} days
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedPrescription.notes && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Doctor's Notes</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm">{selectedPrescription.notes}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
                >
                  Close
                </button>
                
                {selectedPrescription.status === 'pending' && (
                  <button
                    onClick={() => processPrescription(selectedPrescription.id, 'processed')}
                    disabled={processing}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 disabled:opacity-50"
                  >
                    {processing ? 'Processing...' : 'Process Prescription'}
                  </button>
                )}
                
                {selectedPrescription.status === 'processed' && (
                  <button
                    onClick={() => processPrescription(selectedPrescription.id, 'dispensed')}
                    disabled={processing}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                  >
                    {processing ? 'Dispensing...' : 'Dispense Medications'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PrescriptionsList;