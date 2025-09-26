import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  TruckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShoppingCartIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const InventoryManagement = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [drugForms, setDrugForms] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [predictiveData, setPredictiveData] = useState([]);

  const navigation = [
    { name: 'Dashboard', href: '/pharmacist-dashboard', icon: BuildingLibraryIcon },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: ClipboardDocumentListIcon },
    { name: 'Dispensing Workflow', href: '/pharmacy/dispensing-workflow', icon: ClipboardDocumentListIcon },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: TruckIcon },
    { name: 'Dispensing', href: '/pharmacy/dispensing', icon: CheckCircleIcon },
    { name: 'Drug Administration', href: '/pharmacy/administration', icon: UserGroupIcon },
    { name: 'Reports', href: '/pharmacy/reports', icon: ChartBarIcon },
  ];

  const stockOptions = [
    { value: 'all', label: 'All Stock Levels' },
    { value: 'critical', label: 'Critical (<5)' },
    { value: 'low', label: 'Low Stock' },
    { value: 'adequate', label: 'Adequate' },
    { value: 'overstock', label: 'Overstocked' }
  ];

  const expiryOptions = [
    { value: 'all', label: 'All Expiry Dates' },
    { value: 'expired', label: 'Expired' },
    { value: '30days', label: 'Expires in 30 days' },
    { value: '90days', label: 'Expires in 90 days' },
    { value: '6months', label: 'Expires in 6 months' }
  ];

  // New drug form
  const [newDrug, setNewDrug] = useState({
    drug_name: '',
    generic_name: '',
    category_id: '',
    form_id: '',
    dosage: '',
    requires_prescription: true,
    supplier: '',
    description: ''
  });

  // Inventory form for existing drug
  const [inventoryForm, setInventoryForm] = useState({
    drug_id: '',
    batch_number: '',
    quantity: 0,
    unit_price: 0,
    expiry_date: '',
    reorder_level: 10
  });

  // Reorder form
  const [reorderForm, setReorderForm] = useState({
    quantity: 0,
    supplier: '',
    expected_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchInventoryData();
  }, [user]);

  useEffect(() => {
    filterInventory();
    calculateAnalytics();
  }, [inventory, searchTerm, categoryFilter, stockFilter, expiryFilter]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories and forms
      const [categoriesRes, formsRes] = await Promise.all([
        supabase.from('drug_categories').select('*').order('category_name'),
        supabase.from('drug_forms').select('*').order('form_name')
      ]);

      setCategories(categoriesRes.data || []);
      setDrugForms(formsRes.data || []);

      // Fetch inventory with drug details
      const { data: inventoryData, error } = await supabase
        .from('drug_inventory')
        .select(`
          *,
          drugs!inner(
            id,
            drug_name,
            generic_name,
            category_id,
            form_id,
            dosage,
            requires_prescription,
            supplier,
            description,
            drug_categories(category_name),
            drug_forms(form_name)
          )
        `)
        .order('expiry_date', { ascending: true });

      if (error) throw error;

      setInventory(inventoryData || []);
      await calculatePredictiveAnalytics(inventoryData || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Error loading inventory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    const now = new Date();
    let filtered = inventory;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.drugs.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.drugs.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.drugs.category_id === categoryFilter);
    }

    // Stock level filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(item => {
        const ratio = item.quantity / item.reorder_level;
        switch (stockFilter) {
          case 'critical': return item.quantity < 5;
          case 'low': return ratio < 1;
          case 'adequate': return ratio >= 1 && ratio < 3;
          case 'overstock': return ratio >= 3;
          default: return true;
        }
      });
    }

    // Expiry filter
    if (expiryFilter !== 'all') {
      filtered = filtered.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        switch (expiryFilter) {
          case 'expired': return daysUntilExpiry < 0;
          case '30days': return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
          case '90days': return daysUntilExpiry > 30 && daysUntilExpiry <= 90;
          case '6months': return daysUntilExpiry > 90 && daysUntilExpiry <= 180;
          default: return true;
        }
      });
    }

    setFilteredInventory(filtered);
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const criticalStock = inventory.filter(item => item.quantity < 5).length;
    const lowStock = inventory.filter(item => item.quantity < item.reorder_level).length;
    const expiredItems = inventory.filter(item => new Date(item.expiry_date) < now).length;
    const expiringSoon = inventory.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;

    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );

    setAnalytics({
      totalItems: inventory.length,
      totalValue,
      criticalStock,
      lowStock,
      expiredItems,
      expiringSoon
    });
  };

  const calculatePredictiveAnalytics = async (inventoryData) => {
    // Simulate predictive analytics based on dispensing history
    try {
      const { data: dispensingData } = await supabase
        .from('drug_dispensing')
        .select(`
          quantity_dispensed,
          dispensed_at,
          prescription_items!inner(drug_id)
        `)
        .gte('dispensed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      const usageByDrug = {};
      dispensingData?.forEach(record => {
        const drugId = record.prescription_items.drug_id;
        if (!usageByDrug[drugId]) usageByDrug[drugId] = 0;
        usageByDrug[drugId] += record.quantity_dispensed;
      });

      const predictive = inventoryData.map(item => {
        const dailyUsage = (usageByDrug[item.drugs.id] || 0) / 90; // Average daily usage over 90 days
        const daysOfSupply = dailyUsage > 0 ? Math.floor(item.quantity / dailyUsage) : 999;
        const reorderUrgency = daysOfSupply < 10 ? 'high' : daysOfSupply < 30 ? 'medium' : 'low';

        return {
          ...item,
          dailyUsage,
          daysOfSupply,
          reorderUrgency,
          suggestedReorder: dailyUsage > 0 ? Math.ceil(dailyUsage * 30) : item.reorder_level // 30-day supply
        };
      });

      setPredictiveData(predictive);
    } catch (error) {
      console.error('Error calculating predictive analytics:', error);
    }
  };

  const getStockStatus = (item) => {
    const ratio = item.quantity / item.reorder_level;
    if (item.quantity < 5) return { status: 'critical', color: 'bg-red-100 text-red-800' };
    if (ratio < 1) return { status: 'low', color: 'bg-orange-100 text-orange-800' };
    if (ratio < 3) return { status: 'adequate', color: 'bg-green-100 text-green-800' };
    return { status: 'overstock', color: 'bg-blue-100 text-blue-800' };
  };

  const getExpiryStatus = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'bg-red-100 text-red-800' };
    if (daysUntilExpiry <= 30) return { status: 'soon', color: 'bg-orange-100 text-orange-800' };
    if (daysUntilExpiry <= 90) return { status: 'warning', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'good', color: 'bg-green-100 text-green-800' };
  };

  const openAddModal = () => {
    setNewDrug({
      drug_name: '',
      generic_name: '',
      category_id: categories[0]?.id || '',
      form_id: drugForms[0]?.id || '',
      dosage: '',
      requires_prescription: true,
      supplier: '',
      description: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setInventoryForm({
      drug_id: item.drugs.id,
      batch_number: item.batch_number,
      quantity: item.quantity,
      unit_price: item.unit_price,
      expiry_date: item.expiry_date.split('T')[0],
      reorder_level: item.reorder_level
    });
    setShowEditModal(true);
  };

  const openReorderModal = (item) => {
    setSelectedItem(item);
    setReorderForm({
      quantity: Math.max(item.reorder_level * 2, 100), // Smart default
      supplier: item.drugs.supplier || '',
      expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `Reorder for ${item.drugs.drug_name}`
    });
    setShowReorderModal(true);
  };

  const addNewDrug = async () => {
    try {
      setProcessing(true);
      
      // First, add the drug definition
      const { data: drug, error: drugError } = await supabase
        .from('drugs')
        .insert([newDrug])
        .select()
        .single();

      if (drugError) throw drugError;

      // Then add initial inventory
      const { error: inventoryError } = await supabase
        .from('drug_inventory')
        .insert([{
          drug_id: drug.id,
          batch_number: `BATCH-${Date.now()}`,
          quantity: 0,
          unit_price: 0,
          expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          reorder_level: 10
        }]);

      if (inventoryError) throw inventoryError;

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'drug_added').single()).data?.id,
          table_name: 'drugs',
          record_id: drug.id,
          new_values: newDrug,
          notes: `New drug ${newDrug.drug_name} added to inventory`
        });

      setShowAddModal(false);
      fetchInventoryData();
      alert('Drug added successfully!');
    } catch (error) {
      console.error('Error adding drug:', error);
      alert('Error adding drug: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const updateInventory = async () => {
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('drug_inventory')
        .update(inventoryForm)
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'inventory_updated').single()).data?.id,
          table_name: 'drug_inventory',
          record_id: selectedItem.id,
          old_values: selectedItem,
          new_values: inventoryForm,
          notes: `Inventory updated for ${selectedItem.drugs.drug_name}`
        });

      setShowEditModal(false);
      fetchInventoryData();
      alert('Inventory updated successfully!');
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Error updating inventory: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const placeReorder = async () => {
    try {
      setProcessing(true);
      
      // In a real system, this would integrate with a supplier API
      // For now, we'll simulate the reorder and update inventory
      const { error } = await supabase
        .from('drug_inventory')
        .update({
          quantity: selectedItem.quantity + reorderForm.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Log the reorder activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'drug_reorder').single()).data?.id,
          table_name: 'drug_inventory',
          record_id: selectedItem.id,
          new_values: reorderForm,
          notes: `Reorder placed for ${selectedItem.drugs.drug_name}`
        });

      setShowReorderModal(false);
      fetchInventoryData();
      alert(`Reorder placed successfully! ${reorderForm.quantity} units added to inventory.`);
    } catch (error) {
      console.error('Error placing reorder:', error);
      alert('Error placing reorder: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const exportInventory = () => {
    const headers = ['Drug Name', 'Generic Name', 'Batch', 'Quantity', 'Reorder Level', 'Unit Price', 'Expiry Date', 'Stock Status', 'Days Until Expiry'];
    const csvData = filteredInventory.map(item => {
      const expiryStatus = getExpiryStatus(item.expiry_date);
      const daysUntilExpiry = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      return [
        item.drugs.drug_name,
        item.drugs.generic_name,
        item.batch_number,
        item.quantity,
        item.reorder_level,
        `N$${item.unit_price.toFixed(2)}`,
        new Date(item.expiry_date).toLocaleDateString(),
        getStockStatus(item).status,
        daysUntilExpiry
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
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
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Inventory Management</h1>
            <p className="text-gray-600">AI-powered inventory tracking and predictive analytics</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportInventory}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export CSV
            </button>
            <button
              onClick={openAddModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Drug
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <TruckIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-900">{analytics.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Value</p>
              <p className="text-2xl font-bold text-green-900">N${analytics.totalValue?.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Critical Stock</p>
              <p className="text-2xl font-bold text-red-900">{analytics.criticalStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-900">{analytics.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Expired</p>
              <p className="text-2xl font-bold text-yellow-900">{analytics.expiredItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-purple-900">{analytics.expiringSoon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search drugs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.category_name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {stockOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Expiry Filter */}
          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {expiryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Results Count */}
          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">
              {filteredInventory.length} of {inventory.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Drug Inventory</h3>
        </div>
        
        {filteredInventory.length === 0 ? (
          <div className="text-center py-12">
            <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No inventory items found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drug Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch & Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Predictive Analytics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map(item => {
                  const stockStatus = getStockStatus(item);
                  const expiryStatus = getExpiryStatus(item.expiry_date);
                  const predictive = predictiveData.find(p => p.id === item.id);
                  const daysUntilExpiry = Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition duration-150">
                      {/* Drug Information */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.drugs.drug_name}</div>
                          <div className="text-sm text-gray-500">{item.drugs.generic_name}</div>
                          <div className="text-xs text-gray-400">
                            {item.drugs.drug_categories?.category_name} • {item.drugs.drug_forms?.form_name}
                          </div>
                          <div className="text-xs text-gray-400">{item.drugs.dosage}</div>
                        </div>
                      </td>

                      {/* Batch & Stock */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Batch: {item.batch_number}</div>
                        <div className="flex items-center mt-1">
                          <div className="text-sm font-medium text-gray-900">{item.quantity} units</div>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">Reorder at: {item.reorder_level}</div>
                      </td>

                      {/* Pricing */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          N${item.unit_price.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Total: N${(item.quantity * item.unit_price).toFixed(2)}
                        </div>
                      </td>

                      {/* Expiry & Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${expiryStatus.color}`}>
                          {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry} days`}
                        </span>
                      </td>

                      {/* Predictive Analytics */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {predictive ? (
                          <div>
                            <div className="text-sm">
                              <span className="font-medium">{predictive.daysOfSupply}</span> days supply
                            </div>
                            <div className="text-xs text-gray-500">
                              Usage: {predictive.dailyUsage?.toFixed(1)}/day
                            </div>
                            <div className={`text-xs font-medium ${
                              predictive.reorderUrgency === 'high' ? 'text-red-600' :
                              predictive.reorderUrgency === 'medium' ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {predictive.reorderUrgency} priority
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">No data</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {stockStatus.status === 'critical' || stockStatus.status === 'low' ? (
                            <button
                              onClick={() => openReorderModal(item)}
                              className="text-green-600 hover:text-green-900"
                              title="Reorder"
                            >
                              <ShoppingCartIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => openReorderModal(item)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Reorder"
                            >
                              <ShoppingCartIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Drug Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Add New Drug</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Drug Name *</label>
                  <input
                    type="text"
                    value={newDrug.drug_name}
                    onChange={(e) => setNewDrug({...newDrug, drug_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter brand name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Generic Name</label>
                  <input
                    type="text"
                    value={newDrug.generic_name}
                    onChange={(e) => setNewDrug({...newDrug, generic_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter generic name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={newDrug.category_id}
                    onChange={(e) => setNewDrug({...newDrug, category_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form *</label>
                  <select
                    value={newDrug.form_id}
                    onChange={(e) => setNewDrug({...newDrug, form_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {drugForms.map(form => (
                      <option key={form.id} value={form.id}>{form.form_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                  <input
                    type="text"
                    value={newDrug.dosage}
                    onChange={(e) => setNewDrug({...newDrug, dosage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 500mg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <input
                    type="text"
                    value={newDrug.supplier}
                    onChange={(e) => setNewDrug({...newDrug, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Supplier name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newDrug.description}
                    onChange={(e) => setNewDrug({...newDrug, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Drug description and usage"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newDrug.requires_prescription}
                    onChange={(e) => setNewDrug({...newDrug, requires_prescription: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">Requires Prescription</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addNewDrug}
                  disabled={processing || !newDrug.drug_name}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Adding...' : 'Add Drug'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Edit Inventory: {selectedItem.drugs.drug_name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (N$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={inventoryForm.unit_price}
                    onChange={(e) => setInventoryForm({...inventoryForm, unit_price: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reorder Level</label>
                  <input
                    type="number"
                    value={inventoryForm.reorder_level}
                    onChange={(e) => setInventoryForm({...inventoryForm, reorder_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={inventoryForm.expiry_date}
                    onChange={(e) => setInventoryForm({...inventoryForm, expiry_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={updateInventory}
                  disabled={processing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Updating...' : 'Update Inventory'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Modal */}
      {showReorderModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Reorder: {selectedItem.drugs.drug_name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Order</label>
                  <input
                    type="number"
                    value={reorderForm.quantity}
                    onChange={(e) => setReorderForm({...reorderForm, quantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                  <input
                    type="text"
                    value={reorderForm.supplier}
                    onChange={(e) => setReorderForm({...reorderForm, supplier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Supplier name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={reorderForm.expected_date}
                    onChange={(e) => setReorderForm({...reorderForm, expected_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={reorderForm.notes}
                    onChange={(e) => setReorderForm({...reorderForm, notes: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button
                  onClick={() => setShowReorderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={placeReorder}
                  disabled={processing}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? 'Ordering...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default InventoryManagement;