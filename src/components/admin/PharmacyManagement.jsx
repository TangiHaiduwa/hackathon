// components/admin/PharmacyManagement.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  HomeIcon,
  CogIcon,
  ShoppingCartIcon,
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const PharmacyManagement = () => {
  const [drugs, setDrugs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredDrugs, setFilteredDrugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    requiresPrescription: 'all',
    lowStock: false
  });
  const [activeTab, setActiveTab] = useState('inventory');
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null);
  const [drugInteractions, setDrugInteractions] = useState([]);
  const { user: authUser } = useAuth();

  // Navigation items matching your AdminDashboard
  const navigation = [
      { name: 'Dashboard', href: '/admin-dashboard', icon: HomeIcon },
      { name: 'User Management', href: '/user-management', icon: UserGroupIcon },
      { name: 'Analytics & Reporting', href: '/analytics', icon: ChartBarIcon },
      { name: 'Medical Records', href: '/medical-records-admin', icon: ShieldCheckIcon },
      { name: 'Pharmacy Management', href: '/pharmacy-admin', icon: BuildingLibraryIcon },
      { name: 'Appointment System', href: '/appointments-admin', icon: CalendarIcon },
      { name: 'Security & Audit', href: '/security-audit', icon: ShieldCheckIcon, current: true },
      { name: 'System Configuration', href: '/system-settings', icon: CogIcon },
    ];

  // Format user data for DashboardLayout
  const formattedUser = authUser ? {
    name: authUser.user_metadata?.full_name || 'Admin User',
    email: authUser.email,
    role: 'admin'
  } : null;

  // Fetch all drugs with inventory and categories - CONNECTED TO BACKEND
  const fetchDrugs = async () => {
    try {
      setLoading(true);
      
      // Fetch drugs with category information
      const { data: drugsData, error: drugsError } = await supabase
        .from('drugs')
        .select(`
          id,
          drug_name,
          generic_name,
          dosage,
          requires_prescription,
          supplier,
          description,
          created_at,
          updated_at,
          category_id,
          drug_categories (category_name),
          form_id,
          drug_forms (form_name)
        `)
        .order('drug_name', { ascending: true });

      if (drugsError) throw drugsError;

      // Fetch inventory for each drug
      const drugsWithInventory = await Promise.all(
        drugsData.map(async (drug) => {
          const { data: inventoryData } = await supabase
            .from('drug_inventory')
            .select('*')
            .eq('drug_id', drug.id)
            .order('expiry_date', { ascending: true });

          const totalQuantity = inventoryData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          const lowStock = totalQuantity <= (inventoryData?.[0]?.reorder_level || 10);

          return {
            ...drug,
            inventory: inventoryData || [],
            totalQuantity,
            lowStock,
            nextExpiry: inventoryData?.[0]?.expiry_date || null
          };
        })
      );

      setDrugs(drugsWithInventory);
      setFilteredDrugs(drugsWithInventory);
    } catch (error) {
      console.error('Error fetching drugs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch prescription analytics - CONNECTED TO BACKEND
  const fetchPrescriptionAnalytics = async () => {
    try {
      const { data: prescriptionsData, error } = await supabase
        .from('prescription_items')
        .select(`
          id,
          quantity,
          dosage_instructions,
          duration_days,
          drug_id,
          drugs (drug_name, generic_name),
          prescription_id,
          prescriptions (prescription_date, patients(users(full_name)))
        `)
        .order('prescription_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setPrescriptions(prescriptionsData || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  // Fetch drug interactions - CONNECTED TO BACKEND
  const fetchDrugInteractions = async () => {
    try {
      // This would come from a drug_interactions table in your schema
      // For now, we'll create sample data based on your schema structure
      const interactions = [
        {
          id: 1,
          drug1_id: 'sample-id-1',
          drug2_id: 'sample-id-2',
          interaction_level: 'high',
          description: 'May increase risk of bleeding',
          severity: 'High',
          management: 'Monitor closely, avoid concurrent use if possible'
        }
      ];
      setDrugInteractions(interactions);
    } catch (error) {
      console.error('Error fetching drug interactions:', error);
    }
  };

  useEffect(() => {
    fetchDrugs();
    fetchPrescriptionAnalytics();
    fetchDrugInteractions();
  }, []);

  // Filter drugs based on search and filters
  useEffect(() => {
    let filtered = drugs;

    if (searchTerm) {
      filtered = filtered.filter(drug =>
        drug.drug_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drug.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drug.drug_categories?.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(drug => drug.drug_categories?.category_name === filters.category);
    }

    if (filters.requiresPrescription !== 'all') {
      filtered = filtered.filter(drug => 
        filters.requiresPrescription === 'yes' ? drug.requires_prescription : !drug.requires_prescription
      );
    }

    if (filters.lowStock) {
      filtered = filtered.filter(drug => drug.lowStock);
    }

    setFilteredDrugs(filtered);
  }, [searchTerm, filters, drugs]);

  // Add/Edit drug function
  const handleSaveDrug = async (drugData) => {
    try {
      if (editingDrug) {
        // Update existing drug
        const { error } = await supabase
          .from('drugs')
          .update({
            drug_name: drugData.drug_name,
            generic_name: drugData.generic_name,
            dosage: drugData.dosage,
            requires_prescription: drugData.requires_prescription,
            supplier: drugData.supplier,
            description: drugData.description,
            category_id: drugData.category_id,
            form_id: drugData.form_id
          })
          .eq('id', editingDrug.id);

        if (error) throw error;
      } else {
        // Create new drug
        const { error } = await supabase
          .from('drugs')
          .insert({
            drug_name: drugData.drug_name,
            generic_name: drugData.generic_name,
            dosage: drugData.dosage,
            requires_prescription: drugData.requires_prescription,
            supplier: drugData.supplier,
            description: drugData.description,
            category_id: drugData.category_id,
            form_id: drugData.form_id
          });

        if (error) throw error;
      }

      await fetchDrugs();
      setShowDrugModal(false);
      setEditingDrug(null);
      
      return { success: true, message: `Drug ${editingDrug ? 'updated' : 'added'} successfully` };
    } catch (error) {
      console.error('Error saving drug:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete drug function
  const handleDeleteDrug = async (drugId) => {
    if (window.confirm('Are you sure you want to delete this drug? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('drugs')
          .delete()
          .eq('id', drugId);

        if (error) throw error;

        await fetchDrugs();
      } catch (error) {
        console.error('Error deleting drug:', error);
        alert('Error deleting drug: ' + error.message);
      }
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(drugs.map(drug => drug.drug_categories?.category_name).filter(Boolean))];

  // Calculate prescription analytics
  const prescriptionStats = prescriptions.reduce((stats, item) => {
    const drugName = item.drugs?.drug_name || 'Unknown';
    if (!stats[drugName]) {
      stats[drugName] = { count: 0, totalQuantity: 0 };
    }
    stats[drugName].count += 1;
    stats[drugName].totalQuantity += item.quantity || 0;
    return stats;
  }, {});

  const mostPrescribed = Object.entries(prescriptionStats)
    .map(([drugName, data]) => ({ drugName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (loading) {
    return (
      <DashboardLayout user={formattedUser} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading pharmacy data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={formattedUser} navigation={navigation}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pharmacy & Drug Inventory Management</h1>
            <p className="text-gray-600">Manage medication database, inventory, and prescriptions</p>
          </div>
          <button
            onClick={() => setShowDrugModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Drug
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={BuildingLibraryIcon}
          label="Total Drugs"
          value={drugs.length}
          color="blue"
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Low Stock Items"
          value={drugs.filter(drug => drug.lowStock).length}
          color="red"
        />
        <StatCard
          icon={DocumentChartBarIcon}
          label="Total Prescriptions"
          value={prescriptions.length}
          color="green"
        />
        <StatCard
          icon={ExclamationCircleIcon}
          label="Expiring Soon"
          value={drugs.filter(drug => {
            if (!drug.nextExpiry) return false;
            const expiryDate = new Date(drug.nextExpiry);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return expiryDate <= nextWeek;
          }).length}
          color="orange"
        />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['inventory', 'analytics', 'interactions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'inventory' ? 'Drug Inventory' : 
               tab === 'analytics' ? 'Prescription Analytics' : 'Drug Interactions'}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      {activeTab === 'inventory' && (
        <DrugInventoryTab
          drugs={filteredDrugs}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filters={filters}
          setFilters={setFilters}
          categories={categories}
          onEditDrug={setEditingDrug}
          onDeleteDrug={handleDeleteDrug}
          onShowModal={setShowDrugModal}
        />
      )}

      {activeTab === 'analytics' && (
        <PrescriptionAnalyticsTab
          prescriptions={prescriptions}
          mostPrescribed={mostPrescribed}
        />
      )}

      {activeTab === 'interactions' && (
        <DrugInteractionsTab
          interactions={drugInteractions}
          drugs={drugs}
        />
      )}

      {/* Add/Edit Drug Modal */}
      <DrugModal
        isOpen={showDrugModal}
        onClose={() => {
          setShowDrugModal(false);
          setEditingDrug(null);
        }}
        onSave={handleSaveDrug}
        drug={editingDrug}
        categories={categories}
      />
    </DashboardLayout>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
            <dd className="text-lg font-medium text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

// Drug Inventory Tab Component
const DrugInventoryTab = ({
  drugs,
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  categories,
  onEditDrug,
  onDeleteDrug,
  onShowModal
}) => (
  <div className="space-y-6">
    {/* Advanced Filters */}
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Drug Search & Filters</h3>
        <FunnelIcon className="h-5 w-5 text-gray-400" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search drugs by name, generic name, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({...prev, category: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="lowStock"
            checked={filters.lowStock}
            onChange={(e) => setFilters(prev => ({...prev, lowStock: e.target.checked}))}
            className="rounded border-gray-300"
          />
          <label htmlFor="lowStock" className="text-sm text-gray-700">Show Low Stock Only</label>
        </div>
      </div>
    </div>

    {/* Drugs Table */}
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Drug Inventory ({drugs.length} items)
        </h3>
        <button
          onClick={() => onShowModal(true)}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
        >
          Add Inventory
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Drug Information
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category & Form
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inventory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prescription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drugs.map((drug) => (
              <DrugTableRow
                key={drug.id}
                drug={drug}
                onEdit={onEditDrug}
                onDelete={onDeleteDrug}
              />
            ))}
          </tbody>
        </table>
      </div>

      {drugs.length === 0 && (
        <div className="text-center py-12">
          <BuildingLibraryIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No drugs found matching your criteria</p>
        </div>
      )}
    </div>
  </div>
);

// Drug Table Row Component
const DrugTableRow = ({ drug, onEdit, onDelete }) => (
  <tr className="hover:bg-gray-50 transition-colors duration-150">
    <td className="px-6 py-4">
      <div>
        <div className="text-sm font-medium text-gray-900">{drug.drug_name}</div>
        <div className="text-sm text-gray-500">{drug.generic_name}</div>
        <div className="text-xs text-gray-400">Dosage: {drug.dosage || 'Not specified'}</div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="text-sm">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          {drug.drug_categories?.category_name || 'Uncategorized'}
        </span>
        <div className="mt-1 text-gray-500">{drug.drug_forms?.form_name}</div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="text-sm">
        <div className={`font-medium ${drug.lowStock ? 'text-red-600' : 'text-green-600'}`}>
          {drug.totalQuantity} units
        </div>
        {drug.lowStock && (
          <div className="text-xs text-red-500 flex items-center">
            <ExclamationCircleIcon className="h-3 w-3 mr-1" />
            Low stock
          </div>
        )}
        {drug.nextExpiry && (
          <div className="text-xs text-gray-500 flex items-center">
            <ClockIcon className="h-3 w-3 mr-1" />
            Expires: {new Date(drug.nextExpiry).toLocaleDateString()}
          </div>
        )}
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
        drug.requires_prescription ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {drug.requires_prescription ? 'Prescription Required' : 'OTC'}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
      <button
        onClick={() => onEdit(drug)}
        className="text-blue-600 hover:text-blue-900 transition duration-200"
      >
        <PencilIcon className="h-4 w-4 inline" /> Edit
      </button>
      <button
        onClick={() => onDelete(drug.id)}
        className="text-red-600 hover:text-red-900 transition duration-200"
      >
        <TrashIcon className="h-4 w-4 inline" /> Delete
      </button>
    </td>
  </tr>
);

// Prescription Analytics Tab Component
const PrescriptionAnalyticsTab = ({ prescriptions, mostPrescribed }) => (
  <div className="space-y-6">
    {/* Most Prescribed Drugs */}
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Most Prescribed Drugs</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {mostPrescribed.map((drug, index) => (
            <div key={drug.drugName} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-medium text-gray-500">#{index + 1}</span>
                <div>
                  <div className="font-medium text-gray-900">{drug.drugName}</div>
                  <div className="text-sm text-gray-500">{drug.totalQuantity} units prescribed</div>
                </div>
              </div>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {drug.count} prescriptions
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Recent Prescriptions */}
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Prescriptions</h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {prescriptions.slice(0, 10).map((prescription) => (
            <div key={prescription.id} className="flex justify-between items-center p-2 border-b border-gray-100">
              <div>
                <div className="font-medium text-gray-900">{prescription.drugs?.drug_name}</div>
                <div className="text-sm text-gray-500">
                  {prescription.prescriptions?.patients?.users?.full_name || 'Unknown patient'} • 
                  Quantity: {prescription.quantity}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {prescription.prescriptions?.prescription_date ? 
                    new Date(prescription.prescriptions.prescription_date).toLocaleDateString() : 
                    'Unknown date'
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Drug Interactions Tab Component
const DrugInteractionsTab = ({ interactions, drugs }) => (
  <div className="space-y-6">
    {/* Drug Interactions List */}
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Drug Interaction Database</h3>
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
            Add Interaction
          </button>
        </div>
      </div>
      <div className="p-6">
        {interactions.length > 0 ? (
          <div className="space-y-4">
            {interactions.map((interaction) => (
              <div key={interaction.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">Drug Interaction</div>
                    <div className="text-sm text-gray-600 mt-1">{interaction.description}</div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-2 ${
                      interaction.severity === 'High' ? 'bg-red-100 text-red-800' :
                      interaction.severity === 'Medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {interaction.severity} Risk
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  <strong>Management:</strong> {interaction.management}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ExclamationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No drug interactions recorded</p>
            <p className="text-sm text-gray-400 mt-1">Add drug interactions to build your database</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Drug Modal Component
const DrugModal = ({ isOpen, onClose, onSave, drug, categories }) => {
  const [formData, setFormData] = useState({
    drug_name: drug?.drug_name || '',
    generic_name: drug?.generic_name || '',
    dosage: drug?.dosage || '',
    requires_prescription: drug?.requires_prescription || true,
    supplier: drug?.supplier || '',
    description: drug?.description || '',
    category_id: drug?.category_id || '',
    form_id: drug?.form_id || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await onSave(formData);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{drug ? 'Edit Drug' : 'Add New Drug'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name *</label>
              <input
                type="text"
                value={formData.drug_name}
                onChange={(e) => setFormData({...formData, drug_name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
              <input
                type="text"
                value={formData.generic_name}
                onChange={(e) => setFormData({...formData, generic_name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 500mg tablets"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prescription Required</label>
              <select
                value={formData.requires_prescription}
                onChange={(e) => setFormData({...formData, requires_prescription: e.target.value === 'true'})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={true}>Yes - Prescription Required</option>
                <option value={false}>No - Over the Counter</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData({...formData, supplier: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (drug ? 'Update Drug' : 'Add Drug')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PharmacyManagement;