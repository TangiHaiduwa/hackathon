import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const DispensingWorkflow = () => {
  const { user } = useAuth();
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [dispensingItems, setDispensingItems] = useState([]);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchDispensingData();
  }, [user]);

  const fetchDispensingData = async () => {
    try {
      setLoading(true);
      
      // Fetch prescriptions ready for dispensing (status = processed)
      const { data: processedStatus } = await supabase
        .from('prescription_statuses')
        .select('id')
        .eq('status_code', 'processed')
        .single();

      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_date,
          patients!inner(
            users!inner(first_name, last_name, phone_number)
          ),
          medical_staff!inner(
            users!inner(first_name, last_name)
          ),
          prescription_items(
            id,
            quantity,
            dosage_instructions,
            drugs!inner(
              id,
              drug_name,
              generic_name,
              dosage,
              requires_prescription
            ),
            drug_dispensing(quantity_dispensed)
          )
        `)
        .eq('status_id', processedStatus?.id)
        .order('prescription_date', { ascending: true });

      setPendingPrescriptions(prescriptions || []);

      // Fetch current inventory
      const { data: inventoryData } = await supabase
        .from('drug_inventory')
        .select(`
          id,
          quantity,
          batch_number,
          expiry_date,
          drugs!inner(
            drug_name,
            generic_name
          )
        `)
        .gt('quantity', 0)
        .gt('expiry_date', new Date().toISOString());

      setInventory(inventoryData || []);

    } catch (error) {
      console.error('Error fetching dispensing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDispenseModal = (prescription) => {
    setSelectedPrescription(prescription);
    
    // Initialize dispensing items with available inventory
    const items = prescription.prescription_items.map(item => {
      const alreadyDispensed = item.drug_dispensing?.reduce((sum, d) => sum + d.quantity_dispensed, 0) || 0;
      const remaining = item.quantity - alreadyDispensed;
      
      // Find available inventory for this drug
      const availableInventory = inventory.filter(inv => 
        inv.drugs.id === item.drugs.id
      );

      return {
        prescriptionItemId: item.id,
        drugId: item.drugs.id,
        drugName: item.drugs.drug_name,
        prescribedQuantity: item.quantity,
        alreadyDispensed,
        remaining,
        quantityToDispense: Math.min(remaining, availableInventory.reduce((sum, inv) => sum + inv.quantity, 0)),
        availableInventory,
        selectedBatch: null,
        dosage: item.dosage_instructions
      };
    });

    setDispensingItems(items);
    setShowDispenseModal(true);
  };

  const updateDispensingQuantity = (itemIndex, quantity) => {
    const updatedItems = [...dispensingItems];
    const item = updatedItems[itemIndex];
    
    // Ensure quantity doesn't exceed available stock
    const maxAvailable = item.availableInventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const newQuantity = Math.max(0, Math.min(quantity, Math.min(item.remaining, maxAvailable)));
    
    updatedItems[itemIndex] = {
      ...item,
      quantityToDispense: newQuantity
    };
    
    setDispensingItems(updatedItems);
  };

  const selectBatch = (itemIndex, batchId) => {
    const updatedItems = [...dispensingItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      selectedBatch: batchId
    };
    setDispensingItems(updatedItems);
  };

  const dispensePrescription = async () => {
    try {
      setProcessing(true);
      
      // Validate all items have selected batches
      const invalidItems = dispensingItems.filter(item => 
        item.quantityToDispense > 0 && !item.selectedBatch
      );
      
      if (invalidItems.length > 0) {
        alert('Please select batches for all items being dispensed');
        return;
      }

      // Get dispensed status ID
      const { data: dispensedStatus } = await supabase
        .from('prescription_statuses')
        .select('id')
        .eq('status_code', 'dispensed')
        .single();

      // Process each medication item
      for (const item of dispensingItems) {
        if (item.quantityToDispense > 0 && item.selectedBatch) {
          // Find the selected inventory batch
          const selectedInventory = inventory.find(inv => inv.id === item.selectedBatch);
          
          if (!selectedInventory) {
            throw new Error(`Selected batch not found for ${item.drugName}`);
          }

          if (selectedInventory.quantity < item.quantityToDispense) {
            throw new Error(`Insufficient quantity in batch ${selectedInventory.batch_number} for ${item.drugName}`);
          }

          // Create dispensing record
          const { error: dispensingError } = await supabase
            .from('drug_dispensing')
            .insert({
              prescription_item_id: item.prescriptionItemId,
              inventory_id: item.selectedBatch,
              quantity_dispensed: item.quantityToDispense,
              dispensed_by: user.id,
              notes: `Dispensed ${item.quantityToDispense} of ${item.prescribedQuantity} prescribed`
            });

          if (dispensingError) throw dispensingError;

          // Update inventory quantity
          const { error: inventoryError } = await supabase
            .from('drug_inventory')
            .update({ 
              quantity: selectedInventory.quantity - item.quantityToDispense 
            })
            .eq('id', item.selectedBatch);

          if (inventoryError) throw inventoryError;
        }
      }

      // Check if prescription is fully dispensed
      const allDispensed = dispensingItems.every(item => 
        item.quantityToDispense === item.remaining
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
          notes: `Dispensed medications for ${selectedPrescription.patients.users.first_name} ${selectedPrescription.patients.users.last_name}`
        });

      setShowDispenseModal(false);
      fetchDispensingData();
      alert('Medications dispensed successfully!');

    } catch (error) {
      console.error('Error dispensing prescription:', error);
      alert('Error dispensing medications: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const adjustInventory = async (inventoryId, adjustmentType, quantity, reason) => {
    try {
      setProcessing(true);
      
      const inventoryItem = inventory.find(inv => inv.id === inventoryId);
      if (!inventoryItem) throw new Error('Inventory item not found');

      let newQuantity = inventoryItem.quantity;
      
      if (adjustmentType === 'add') {
        newQuantity += quantity;
      } else if (adjustmentType === 'remove') {
        newQuantity = Math.max(0, newQuantity - quantity);
      } else if (adjustmentType === 'set') {
        newQuantity = quantity;
      }

      const { error } = await supabase
        .from('drug_inventory')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryId);

      if (error) throw error;

      // Log inventory adjustment
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'inventory_adjusted').single()).data?.id,
          table_name: 'drug_inventory',
          record_id: inventoryId,
          old_values: { quantity: inventoryItem.quantity },
          new_values: { quantity: newQuantity },
          notes: `Inventory ${adjustmentType}: ${quantity} units. Reason: ${reason}`
        });

      setShowInventoryModal(false);
      fetchDispensingData();
      alert('Inventory adjusted successfully!');

    } catch (error) {
      console.error('Error adjusting inventory:', error);
      alert('Error adjusting inventory: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const generateDispensingLabel = (prescription) => {
    const labelContent = `
      PHARMACY DISPENSING LABEL
      =========================
      Patient: ${prescription.patients.users.first_name} ${prescription.patients.users.last_name}
      Date: ${new Date().toLocaleDateString()}
      Prescribing Doctor: Dr. ${prescription.medical_staff.users.first_name}
      
      MEDICATIONS:
      ${prescription.prescription_items.map(item => `
      • ${item.drugs.drug_name} - ${item.quantity} units
        Dosage: ${item.dosage_instructions}
      `).join('')}
      
      Dispensed by: ${user.user_metadata?.first_name || 'Pharmacist'}
      Pharmacy: MESMTF Pharmacy
      Contact: +264 61 207 2052
    `;

    const blob = new Blob([labelContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispensing_label_${prescription.patients.users.first_name}_${new Date().toISOString().split('T')[0]}.txt`;
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
        <h1 className="text-3xl font-bold text-gray-900">Medication Dispensing Workflow</h1>
        <p className="text-gray-600">Dispense medications and manage inventory in real-time</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Pending Dispensing</h3>
              <p className="text-2xl font-bold">{pendingPrescriptions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Active Inventory Items</h3>
              <p className="text-2xl font-bold">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Low Stock Items</h3>
              <p className="text-2xl font-bold">
                {inventory.filter(item => item.quantity < 10).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Prescriptions */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Prescriptions Ready for Dispensing</h2>
        </div>
        
        <div className="p-6">
          {pendingPrescriptions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">No prescriptions pending dispensing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPrescriptions.map(prescription => (
                <div key={prescription.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {prescription.patients.users.first_name} {prescription.patients.users.last_name}
                      </h3>
                      <p className="text-gray-600">
                        Dr. {prescription.medical_staff.users.first_name} • 
                        {new Date(prescription.prescription_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => generateDispensingLabel(prescription)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        Print Label
                      </button>
                      <button
                        onClick={() => openDispenseModal(prescription)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Dispense
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prescription.prescription_items.map(item => {
                      const dispensed = item.drug_dispensing?.reduce((sum, d) => sum + d.quantity_dispensed, 0) || 0;
                      const remaining = item.quantity - dispensed;
                      const availableStock = inventory.filter(inv => inv.drugs.id === item.drugs.id)
                        .reduce((sum, inv) => sum + inv.quantity, 0);

                      return (
                        <div key={item.id} className="text-sm">
                          <div className="font-medium">{item.drugs.drug_name}</div>
                          <div className="text-gray-600">
                            Prescribed: {item.quantity} • Remaining: {remaining} • Stock: {availableStock}
                          </div>
                          <div className="text-gray-500">{item.dosage_instructions}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Inventory Management */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Quick Inventory Overview</h2>
          <button
            onClick={() => setShowInventoryModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Adjust Stock
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.slice(0, 6).map(item => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="font-medium">{item.drugs.drug_name}</div>
                <div className="text-sm text-gray-600">Batch: {item.batch_number}</div>
                <div className={`text-lg font-bold ${
                  item.quantity < 10 ? 'text-red-600' : 
                  item.quantity < 25 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {item.quantity} units
                </div>
                <div className="text-xs text-gray-500">
                  Expires: {new Date(item.expiry_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dispense Medication Modal */}
      {showDispenseModal && selectedPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Dispense Medications</h2>
              
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold">Patient: {selectedPrescription.patients.users.first_name} {selectedPrescription.patients.users.last_name}</h3>
                <p>Phone: {selectedPrescription.patients.users.phone_number}</p>
                <p>Prescribing Doctor: Dr. {selectedPrescription.medical_staff.users.first_name}</p>
              </div>

              {dispensingItems.map((item, index) => (
                <div key={item.prescriptionItemId} className="border rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{item.drugName}</h4>
                      <p className="text-sm text-gray-600">
                        Prescribed: {item.prescribedQuantity} • 
                        Already Dispensed: {item.alreadyDispensed} • 
                        Remaining: {item.remaining}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Stock: {item.availableInventory.reduce((sum, inv) => sum + inv.quantity, 0)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Quantity to Dispense</label>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(item.remaining, item.availableInventory.reduce((sum, inv) => sum + inv.quantity, 0))}
                        value={item.quantityToDispense}
                        onChange={(e) => updateDispensingQuantity(index, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Select Batch</label>
                      <select
                        value={item.selectedBatch || ''}
                        onChange={(e) => selectBatch(index, e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="">Select batch</option>
                        {item.availableInventory.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.batch_number} ({inv.quantity} units) - Exp: {new Date(inv.expiry_date).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {item.availableInventory.length === 0 && (
                    <div className="mt-2 text-red-600 text-sm">
                      No inventory available for this medication
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDispenseModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={dispensePrescription}
                  disabled={processing || dispensingItems.every(item => item.quantityToDispense === 0)}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  {processing ? 'Dispensing...' : 'Confirm Dispensing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Adjustment Modal */}
      {showInventoryModal && (
        <InventoryAdjustmentModal 
          inventory={inventory}
          onAdjust={adjustInventory}
          onClose={() => setShowInventoryModal(false)}
          processing={processing}
        />
      )}
    </DashboardLayout>
  );
};

// Separate component for inventory adjustment
const InventoryAdjustmentModal = ({ inventory, onAdjust, onClose, processing }) => {
  const [selectedItem, setSelectedItem] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedItem && quantity > 0 && reason) {
      onAdjust(selectedItem, adjustmentType, quantity, reason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Adjust Inventory</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Medication</label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">Select medication</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.drugs.drug_name} - {item.batch_number} ({item.quantity} units)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Adjustment Type</label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="add">Add Stock</option>
                <option value="remove">Remove Stock</option>
                <option value="set">Set Exact Quantity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                rows="3"
                placeholder="e.g., Received shipment, damaged goods, etc."
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing || !selectedItem || quantity <= 0 || !reason}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {processing ? 'Adjusting...' : 'Adjust Inventory'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DispensingWorkflow;