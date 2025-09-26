import React, { useState } from 'react';
import { 
  BuildingLibraryIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const PharmacyModule = () => {
  const [activeTab, setActiveTab] = useState('drugs');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);

  // Sample drug data
  const drugs = [
    {
      id: 1,
      name: 'Chloroquine Phosphate',
      genericName: 'Chloroquine',
      category: 'Antimalarial',
      dosage: '500mg',
      form: 'Tablet',
      stock: 45,
      price: 25.50,
      supplier: 'PharmaCorp',
      expiryDate: '2026-12-31',
      requiresPrescription: true,
      description: 'Used for the treatment of malaria and extraintestinal amebiasis.'
    },
    {
      id: 2,
      name: 'Artemether-Lumefantrine',
      genericName: 'Coartem',
      category: 'Antimalarial',
      dosage: '20mg/120mg',
      form: 'Tablet',
      stock: 28,
      price: 35.75,
      supplier: 'MediPharm',
      expiryDate: '2026-08-15',
      requiresPrescription: true,
      description: 'First-line treatment for uncomplicated Plasmodium falciparum malaria.'
    },
    {
      id: 3,
      name: 'Ciprofloxacin',
      genericName: 'Cipro',
      category: 'Antibiotic',
      dosage: '500mg',
      form: 'Tablet',
      stock: 67,
      price: 18.25,
      supplier: 'BioLab',
      expiryDate: '2027-03-20',
      requiresPrescription: true,
      description: 'Broad-spectrum antibiotic for typhoid fever and other bacterial infections.'
    },
    {
      id: 4,
      name: 'Azithromycin',
      genericName: 'Zithromax',
      category: 'Antibiotic',
      dosage: '250mg',
      form: 'Capsule',
      stock: 32,
      price: 42.00,
      supplier: 'PharmaCorp',
      expiryDate: '2026-11-30',
      requiresPrescription: true,
      description: 'Macrolide antibiotic for typhoid and respiratory infections.'
    },
    {
      id: 5,
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      category: 'Analgesic',
      dosage: '500mg',
      form: 'Tablet',
      stock: 150,
      price: 5.25,
      supplier: 'MediSupply',
      expiryDate: '2027-05-15',
      requiresPrescription: false,
      description: 'Pain reliever and fever reducer.'
    },
    {
      id: 6,
      name: 'Ibuprofen',
      genericName: 'Advil',
      category: 'NSAID',
      dosage: '400mg',
      form: 'Tablet',
      stock: 89,
      price: 8.75,
      supplier: 'HealthPlus',
      expiryDate: '2027-02-28',
      requiresPrescription: false,
      description: 'Nonsteroidal anti-inflammatory drug for pain and inflammation.'
    }
  ];

  const categories = ['all', 'Antimalarial', 'Antibiotic', 'Analgesic', 'NSAID', 'Antipyretic'];

  const prescriptions = [
    {
      id: 1,
      patientName: 'John Patient',
      doctorName: 'Dr. Sarah Smith',
      date: '2025-03-15',
      status: 'Pending',
      items: [
        { drug: 'Chloroquine Phosphate', quantity: 30, dosage: '500mg daily' },
        { drug: 'Paracetamol', quantity: 20, dosage: '500mg as needed' }
      ]
    },
    {
      id: 2,
      patientName: 'Mary Johnson',
      doctorName: 'Dr. Michael Brown',
      date: '2025-03-14',
      status: 'Filled',
      items: [
        { drug: 'Ciprofloxacin', quantity: 14, dosage: '500mg twice daily' }
      ]
    }
  ];

  const filteredDrugs = drugs.filter(drug => {
    const matchesSearch = drug.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drug.genericName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || drug.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (drug, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.drug.id === drug.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.drug.id === drug.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { drug, quantity }];
    });
  };

  const removeFromCart = (drugId) => {
    setCart(prevCart => prevCart.filter(item => item.drug.id !== drugId));
  };

  const getStockStatus = (stock) => {
    if (stock > 20) return { status: 'In Stock', color: 'green' };
    if (stock > 5) return { status: 'Low Stock', color: 'yellow' };
    return { status: 'Out of Stock', color: 'red' };
  };

  const totalCartValue = cart.reduce((total, item) => total + (item.drug.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-green-600 p-3 rounded-xl">
              <BuildingLibraryIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Pharmacy Management</h1>
              <p className="text-lg text-gray-600">Drug inventory, prescriptions, and dispensing</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-8 px-6">
            {['drugs', 'prescriptions', 'inventory', 'suppliers'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'drugs' ? 'Drug Catalog' :
                 tab === 'prescriptions' ? 'Prescriptions' :
                 tab === 'inventory' ? 'Inventory Management' : 'Suppliers'}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Drugs Catalog */}
            {activeTab === 'drugs' && (
              <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Drug Catalog</h2>
                  <div className="flex space-x-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search drugs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent capitalize"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Drugs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDrugs.map(drug => {
                    const stockStatus = getStockStatus(drug.stock);
                    return (
                      <div key={drug.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{drug.name}</h3>
                            <p className="text-blue-600 text-sm">{drug.genericName}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${stockStatus.color}-100 text-${stockStatus.color}-800`}>
                            {stockStatus.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Category:</span> {drug.category}
                          </div>
                          <div>
                            <span className="font-medium">Dosage:</span> {drug.dosage}
                          </div>
                          <div>
                            <span className="font-medium">Form:</span> {drug.form}
                          </div>
                          <div>
                            <span className="font-medium">Stock:</span> {drug.stock} units
                          </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{drug.description}</p>

                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-lg font-bold text-gray-900">N${drug.price.toFixed(2)}</span>
                            {drug.requiresPrescription && (
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Prescription Required</span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedDrug(drug)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition duration-200"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => addToCart(drug)}
                              disabled={drug.stock === 0}
                              className={`p-2 rounded ${
                                drug.stock === 0
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              } transition duration-200`}
                              title="Add to Cart"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredDrugs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No drugs found matching your criteria.
                  </div>
                )}
              </div>
            )}

            {/* Prescriptions */}
            {activeTab === 'prescriptions' && (
              <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Prescription Management</h2>
                
                <div className="space-y-4">
                  {prescriptions.map(prescription => (
                    <div key={prescription.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">Prescription #{prescription.id}</h3>
                          <p className="text-sm text-gray-600">Patient: {prescription.patientName}</p>
                          <p className="text-sm text-gray-600">Doctor: {prescription.doctorName}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            prescription.status === 'Filled' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {prescription.status}
                          </span>
                          <span className="text-sm text-gray-500">{prescription.date}</span>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <h4 className="font-medium text-gray-900 mb-2">Medications:</h4>
                        {prescription.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <div>
                              <span className="font-medium">{item.drug}</span>
                              <span className="text-sm text-gray-600 ml-2">({item.dosage})</span>
                            </div>
                            <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end space-x-2 mt-4">
                        {prescription.status === 'Pending' && (
                          <>
                            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                              Fill Prescription
                            </button>
                            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                              View Details
                            </button>
                          </>
                        )}
                        {prescription.status === 'Filled' && (
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                            Print Label
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Management */}
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Inventory Management</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {drugs.map(drug => {
                        const stockStatus = getStockStatus(drug.stock);
                        const needsReorder = drug.stock <= 10;
                        return (
                          <tr key={drug.id} className={needsReorder ? 'bg-red-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{drug.name}</div>
                                <div className="text-sm text-gray-500">{drug.genericName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drug.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{drug.stock}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">10</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{drug.expiryDate}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color === 'green' ? 'bg-green-100 text-green-800' : stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                {stockStatus.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              {needsReorder && (
                                <button className="text-red-600 hover:text-red-900">
                                  <TruckIcon className="h-4 w-4 inline" /> Reorder
                                </button>
                              )}
                              <button className="text-blue-600 hover:text-blue-900">
                                <PencilIcon className="h-4 w-4 inline" /> Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Shopping Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                Dispensing Cart
                {cart.length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    {cart.length}
                  </span>
                )}
              </h3>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.drug.id} className="flex justify-between items-center p-2 border border-gray-200 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.drug.name}</div>
                          <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            N${(item.drug.price * item.quantity).toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.drug.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
                      <span>Total:</span>
                      <span>N${totalCartValue.toFixed(2)}</span>
                    </div>

                    <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium mb-2">
                      Process Dispensing
                    </button>
                    <button 
                      onClick={() => setCart([])}
                      className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Clear Cart
                    </button>
                  </div>
                </>
              )}

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Pharmacy Overview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Drugs:</span>
                    <span className="font-medium">{drugs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Low Stock Items:</span>
                    <span className="font-medium text-red-600">
                      {drugs.filter(d => d.stock <= 10).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Prescriptions:</span>
                    <span className="font-medium text-yellow-600">
                      {prescriptions.filter(p => p.status === 'Pending').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drug Detail Modal */}
        {selectedDrug && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{selectedDrug.name}</h3>
                  <button
                    onClick={() => setSelectedDrug(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Generic Name:</span>
                    <span className="ml-2 text-gray-900">{selectedDrug.genericName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="ml-2 text-gray-900">{selectedDrug.category}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Dosage Form:</span>
                    <span className="ml-2 text-gray-900">{selectedDrug.dosage} {selectedDrug.form}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Supplier:</span>
                    <span className="ml-2 text-gray-900">{selectedDrug.supplier}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Expiry Date:</span>
                    <span className="ml-2 text-gray-900">{selectedDrug.expiryDate}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Prescription Required:</span>
                    <span className={`ml-2 ${selectedDrug.requiresPrescription ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedDrug.requiresPrescription ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-gray-600">{selectedDrug.description}</p>

                <div className="flex justify-between items-center mt-6">
                  <span className="text-2xl font-bold text-gray-900">N${selectedDrug.price.toFixed(2)}</span>
                  <button
                    onClick={() => {
                      addToCart(selectedDrug);
                      setSelectedDrug(null);
                    }}
                    disabled={selectedDrug.stock === 0}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      selectedDrug.stock === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyModule;