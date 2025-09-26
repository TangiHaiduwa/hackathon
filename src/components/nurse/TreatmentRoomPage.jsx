// components/treatment/TreatmentRoomPage.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const TreatmentRoomPage = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('procedures');
  const [patients, setPatients] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [activeProcedure, setActiveProcedure] = useState(null);
  const [checklistProgress, setChecklistProgress] = useState({});

  // Form states
  const [newProcedure, setNewProcedure] = useState({
    patient_id: '',
    procedure_type_id: '',
    scheduled_time: new Date().toISOString().slice(0, 16),
    priority: 'medium',
    notes: ''
  });

  const [supplyUsage, setSupplyUsage] = useState({
    procedure_id: '',
    supply_id: '',
    quantity_used: 1,
    notes: ''
  });

  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon },
    { name: 'Patient Rounds', href: '/patient-rounds-page', icon: DocumentTextIcon },
  ];

  // Procedure types and their checklists
  const procedureTypes = {
    wound_care: {
      name: 'Wound Dressing Change',
      checklist: [
        'Verify patient identity',
        'Explain procedure to patient',
        'Wash hands and don gloves',
        'Gather supplies: gauze, tape, antiseptic, gloves',
        'Remove old dressing carefully',
        'Assess wound appearance and size',
        'Clean wound with antiseptic solution',
        'Apply new dressing',
        'Secure dressing with tape',
        'Document wound assessment',
        'Dispose of materials properly',
        'Remove gloves and wash hands'
      ],
      supplies: ['gauze_pads', 'medical_tape', 'antiseptic_solution', 'gloves', 'waste_bag']
    },
    iv_insertion: {
      name: 'IV Catheter Insertion',
      checklist: [
        'Verify patient identity and consent',
        'Select appropriate IV site',
        'Gather IV supplies: catheter, tubing, tegaderm',
        'Apply tourniquet',
        'Clean site with antiseptic',
        'Insert catheter at 15-30 degree angle',
        'Advance catheter, retract needle',
        'Secure catheter with tegaderm',
        'Connect IV tubing',
        'Label with date, time, gauge',
        'Document procedure',
        'Dispose of sharps properly'
      ],
      supplies: ['iv_catheter', 'iv_tubing', 'tegaderm', 'antiseptic_swabs', 'tourniquet', 'gloves']
    },
    blood_draw: {
      name: 'Venipuncture (Blood Draw)',
      checklist: [
        'Verify patient identity',
        'Confirm test requirements',
        'Select venipuncture site',
        'Apply tourniquet',
        'Clean site with alcohol',
        'Perform venipuncture',
        'Fill appropriate tubes',
        'Release tourniquet',
        'Apply pressure to site',
        'Label tubes correctly',
        'Document procedure',
        'Send specimens to lab'
      ],
      supplies: ['vacutainer_needle', 'blood_tubes', 'alcohol_swabs', 'tourniquet', 'bandage', 'gloves']
    },
    catheter_care: {
      name: 'Foley Catheter Care',
      checklist: [
        'Verify patient identity',
        'Explain procedure to patient',
        'Wash hands and don gloves',
        'Inspect catheter insertion site',
        'Clean meatal-catheter junction',
        'Empty drainage bag',
        'Measure urine output',
        'Document characteristics',
        'Secure catheter properly',
        'Provide patient education',
        'Remove gloves and wash hands'
      ],
      supplies: ['cleaning_solution', 'gloves', 'measuring_jug', 'chlorhexidine_swabs']
    }
  };

  // Documentation templates
  const documentationTemplates = {
    wound_care: {
      name: 'Wound Care Documentation',
      fields: [
        { name: 'wound_location', label: 'Wound Location', type: 'text' },
        { name: 'wound_size', label: 'Size (cm)', type: 'text' },
        { name: 'appearance', label: 'Appearance', type: 'select', options: ['Clean', 'Reddened', 'Draining', 'Necrotic'] },
        { name: 'drainage_amount', label: 'Drainage Amount', type: 'select', options: ['None', 'Small', 'Moderate', 'Large'] },
        { name: 'drainage_color', label: 'Drainage Color', type: 'text' },
        { name: 'pain_level', label: 'Patient Pain Level (0-10)', type: 'number' },
        { name: 'patient_tolerance', label: 'Patient Tolerance', type: 'select', options: ['Good', 'Fair', 'Poor'] }
      ]
    },
    iv_care: {
      name: 'IV Site Assessment',
      fields: [
        { name: 'insertion_site', label: 'Insertion Site', type: 'text' },
        { name: 'catheter_gauge', label: 'Catheter Gauge', type: 'text' },
        { name: 'site_appearance', label: 'Site Appearance', type: 'select', options: ['Normal', 'Redness', 'Swelling', 'Pain'] },
        { name: 'dressing_condition', label: 'Dressing Condition', type: 'select', options: ['Clean/Dry', 'Loose', 'Soiled'] },
        { name: 'infusion_status', label: 'Infusion Status', type: 'select', options: ['Patent', 'Slowed', 'Infiltration'] }
      ]
    }
  };

  useEffect(() => {
    fetchNurseData();
  }, [authUser]);

  const fetchNurseData = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      
      const { data: nurseData } = await supabase
        .from('users')
        .select(`
          *,
          medical_staff!inner(
            *,
            departments(*)
          )
        `)
        .eq('id', authUser.id)
        .single();

      setUser(nurseData);
      await Promise.all([
        loadAssignedPatients(authUser.id),
        loadProcedures(authUser.id),
        loadSupplies(),
        loadTemplates()
      ]);

    } catch (error) {
      console.error('Error fetching nurse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedPatients = async (nurseId) => {
    try {
      const { data, error } = await supabase
        .from('nurse_patient_assignments')
        .select(`
          patient_id,
          patients!inner(
            id,
            users!inner(
              first_name,
              last_name,
              date_of_birth
            )
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (error) throw error;

      const patientsList = data.map(item => ({
        id: item.patients.id,
        name: `${item.patients.users.first_name} ${item.patients.users.last_name}`,
        age: calculateAge(item.patients.users.date_of_birth)
      }));

      setPatients(patientsList);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const loadProcedures = async (nurseId) => {
    try {
      const { data, error } = await supabase
        .from('nurse_tasks')
        .select(`
          *,
          patients!inner(
            users!inner(
              first_name,
              last_name
            )
          ),
          task_types(*)
        `)
        .eq('nurse_id', nurseId)
        .eq('status', 'pending')
        .in('task_type_id', Object.keys(procedureTypes).map(key => 
          // This would need to match your actual task_type IDs
          key === 'wound_care' ? 'wound_care' : 
          key === 'iv_insertion' ? 'iv_insertion' : 
          key === 'blood_draw' ? 'blood_draw' : 'catheter_care'
        ))
        .order('priority', { ascending: false })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      setProcedures(data || []);
    } catch (error) {
      console.error('Error fetching procedures:', error);
    }
  };

  const loadSupplies = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_supplies')
        .select('*')
        .order('supply_name');

      if (error) throw error;

      setSupplies(data || []);
    } catch (error) {
      console.error('Error fetching supplies:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('documentation_templates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    return today.getFullYear() - birthDate.getFullYear();
  };

  const startProcedure = (procedure) => {
    setActiveProcedure(procedure);
    setSelectedProcedure(procedure);
    setChecklistProgress({});
  };

  const completeProcedure = async () => {
    try {
      const { error } = await supabase
        .from('nurse_tasks')
        .update({
          status: 'completed',
          completed_time: new Date().toISOString(),
          notes: activeProcedure.notes
        })
        .eq('id', activeProcedure.id);

      if (error) throw error;

      // Record procedure completion
      await supabase
        .from('procedure_documentation')
        .insert({
          patient_id: activeProcedure.patient_id,
          procedure_type: activeProcedure.task_types.type_code,
          performed_by: authUser.id,
          performed_at: new Date().toISOString(),
          notes: activeProcedure.notes,
          checklist_completed: true
        });

      setActiveProcedure(null);
      setSelectedProcedure(null);
      setChecklistProgress({});
      await loadProcedures(authUser.id);

    } catch (error) {
      console.error('Error completing procedure:', error);
      alert('Error completing procedure');
    }
  };

  const updateChecklistItem = (itemIndex, completed) => {
    setChecklistProgress(prev => ({
      ...prev,
      [itemIndex]: completed
    }));
  };

  const recordSupplyUsage = async () => {
    try {
      const { error } = await supabase
        .from('supply_usage_log')
        .insert({
          ...supplyUsage,
          used_by: authUser.id,
          used_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update inventory
      await supabase
        .from('treatment_supplies')
        .update({
          current_stock: supabase.sql`current_stock - ${supplyUsage.quantity_used}`
        })
        .eq('id', supplyUsage.supply_id);

      setSupplyUsage({
        procedure_id: '',
        supply_id: '',
        quantity_used: 1,
        notes: ''
      });

      await loadSupplies();
      alert('Supply usage recorded successfully');

    } catch (error) {
      console.error('Error recording supply usage:', error);
      alert('Error recording supply usage');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChecklistCompletion = () => {
    const totalItems = selectedProcedure ? procedureTypes[selectedProcedure.task_types?.type_code]?.checklist.length || 0 : 0;
    const completedItems = Object.values(checklistProgress).filter(Boolean).length;
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
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

  const completionPercentage = getChecklistCompletion();

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Treatment Room</h1>
            <p className="text-gray-600">Manage procedures, documentation, and supplies</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {procedures.length} pending procedures
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'procedures', name: 'Procedures', icon: ClipboardDocumentCheckIcon },
              { id: 'supplies', name: 'Supplies', icon: ShoppingCartIcon },
              { id: 'templates', name: 'Templates', icon: DocumentTextIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Procedures Tab */}
        {activeTab === 'procedures' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Pending Procedures List */}
            <div className="xl:col-span-1">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Pending Procedures</h3>
                  <p className="text-sm text-gray-600">Patients needing treatments</p>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {procedures.map(procedure => (
                    <div
                      key={procedure.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProcedure?.id === procedure.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedProcedure(procedure)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {procedure.patients.users.first_name} {procedure.patients.users.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {procedureTypes[procedure.task_types?.type_code]?.name || procedure.title}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(procedure.priority)}`}>
                          {procedure.priority}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          {new Date(procedure.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!activeProcedure && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startProcedure(procedure);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {procedures.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pending procedures</p>
                  )}
                </div>
              </div>
            </div>

            {/* Procedure Details and Checklist */}
            <div className="xl:col-span-2">
              {activeProcedure ? (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {procedureTypes[activeProcedure.task_types?.type_code]?.name || activeProcedure.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Patient: {activeProcedure.patients.users.first_name} {activeProcedure.patients.users.last_name}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setActiveProcedure(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={completeProcedure}
                          disabled={completionPercentage < 100}
                          className={`btn-primary ${completionPercentage < 100 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Complete Procedure
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 py-3 bg-gray-50 border-b">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Checklist Progress</span>
                      <span className="text-sm text-gray-600">{Math.round(completionPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Procedure Checklist</h4>
                    <div className="space-y-3">
                      {procedureTypes[activeProcedure.task_types?.type_code]?.checklist.map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={!!checklistProgress[index]}
                            onChange={(e) => updateChecklistItem(index, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className={`text-sm ${checklistProgress[index] ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Documentation Section */}
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-4">Procedure Documentation</h4>
                      <textarea
                        value={activeProcedure.notes || ''}
                        onChange={(e) => setActiveProcedure({...activeProcedure, notes: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Document any observations, findings, or patient responses..."
                      />
                    </div>

                    {/* Supply Usage */}
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-4">Record Supply Usage</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select
                          value={supplyUsage.supply_id}
                          onChange={(e) => setSupplyUsage({...supplyUsage, supply_id: e.target.value})}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select Supply</option>
                          {supplies.filter(s => s.current_stock > 0).map(supply => (
                            <option key={supply.id} value={supply.id}>
                              {supply.supply_name} ({supply.current_stock} in stock)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={supplyUsage.quantity_used}
                          onChange={(e) => setSupplyUsage({...supplyUsage, quantity_used: parseInt(e.target.value)})}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Quantity"
                        />
                        <button
                          onClick={recordSupplyUsage}
                          disabled={!supplyUsage.supply_id}
                          className="btn-primary"
                        >
                          Record Usage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedProcedure ? (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Procedure Details</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Patient</label>
                        <p className="text-lg">{selectedProcedure.patients.users.first_name} {selectedProcedure.patients.users.last_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Scheduled Time</label>
                        <p className="text-lg">{new Date(selectedProcedure.scheduled_time).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Priority</label>
                        <p className="text-lg capitalize">{selectedProcedure.priority}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Procedure Type</label>
                        <p className="text-lg">{procedureTypes[selectedProcedure.task_types?.type_code]?.name || selectedProcedure.title}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="text-sm font-medium text-gray-700">Description</label>
                      <p className="text-gray-900">{selectedProcedure.description}</p>
                    </div>

                    <button
                      onClick={() => startProcedure(selectedProcedure)}
                      className="btn-primary"
                    >
                      Start Procedure
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <ClipDocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a procedure to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Supplies Tab */}
        {activeTab === 'supplies' && (
          <div className="space-y-6">
            {/* Supply Inventory */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Treatment Room Supplies</h3>
                <p className="text-sm text-gray-600">Current inventory levels</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supply Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reorder Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplies.map(supply => (
                      <tr key={supply.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{supply.supply_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supply.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supply.current_stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {supply.reorder_level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            supply.current_stock === 0 
                              ? 'bg-red-100 text-red-800'
                              : supply.current_stock <= supply.reorder_level
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {supply.current_stock === 0 
                              ? 'Out of Stock'
                              : supply.current_stock <= supply.reorder_level
                              ? 'Low Stock'
                              : 'In Stock'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {supplies.filter(s => s.current_stock <= s.reorder_level).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                  <h4 className="text-lg font-medium text-yellow-800">Low Stock Alerts</h4>
                </div>
                <div className="mt-2">
                  {supplies.filter(s => s.current_stock <= s.reorder_level).map(supply => (
                    <div key={supply.id} className="text-sm text-yellow-700">
                      • {supply.supply_name}: {supply.current_stock} remaining (reorder at {supply.reorder_level})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(documentationTemplates).map(([key, template]) => (
              <div key={key} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {template.fields.map(field => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        {field.type === 'select' ? (
                          <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            <option value="">Select {field.label}</option>
                            {field.options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary w-full mt-4">
                    Use This Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TreatmentRoomPage;