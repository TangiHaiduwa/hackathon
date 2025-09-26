import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  QrCodeIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  BuildingLibraryIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

const DrugAdministration = () => {
  const { user } = useAuth();
  const [administrations, setAdministrations] = useState([]);
  const [scheduledAdministrations, setScheduledAdministrations] = useState([]);
  const [filteredAdministrations, setFilteredAdministrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('scheduled');
  const [dateFilter, setDateFilter] = useState('today');
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSideEffectsModal, setShowSideEffectsModal] = useState(false);
  const [selectedAdministration, setSelectedAdministration] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [administrationForm, setAdministrationForm] = useState({});
  const [sideEffectsForm, setSideEffectsForm] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [sideEffects, setSideEffects] = useState([]);
  const [complianceData, setComplianceData] = useState([]);

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
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'administered', label: 'Administered' },
    { value: 'missed', label: 'Missed' },
    { value: 'refused', label: 'Refused' }
  ];

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'all', label: 'All Dates' }
  ];

  const routeOptions = [
    { value: 'oral', label: 'Oral' },
    { value: 'iv', label: 'Intravenous (IV)' },
    { value: 'im', label: 'Intramuscular (IM)' },
    { value: 'topical', label: 'Topical' },
    { value: 'other', label: 'Other' }
  ];

  const severityOptions = [
    { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'severe', label: 'Severe' },
    { value: 'life_threatening', label: 'Life-Threatening' }
  ];

  useEffect(() => {
    fetchAdministrationData();
  }, [user]);

  useEffect(() => {
    filterAdministrations();
    calculateAnalytics();
  }, [administrations, searchTerm, statusFilter, dateFilter]);

  const fetchAdministrationData = async () => {
    try {
      setLoading(true);
      
      // Fetch drug administration records
      const { data: adminRecords, error } = await supabase
      .from('drug_administration')
      .select(`
        *,
        patients (
          users (first_name, last_name, date_of_birth)
        ),
        prescription_items (
          dosage_instructions,
          drugs (drug_name, generic_name, dosage),
          prescriptions (
            medical_staff (
              users (first_name, last_name)
            )
          )
        )
      `)
      .order('scheduled_time', { ascending: true });

    if (error) throw error;

    setAdministrations(adminRecords || []);

    if (adminRecords) {
      const enrichedRecords = await Promise.all(
        adminRecords.map(async (admin) => {
          let administeredUser = null;
          let verifiedUser = null;
          
          if (admin.administered_by) {
            const { data: userData } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', admin.administered_by)
              .single();
            administeredUser = userData;
          }
          
          if (admin.verified_by) {
            const { data: userData } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', admin.verified_by)
              .single();
            verifiedUser = userData;
          }
          
          return {
            ...admin,
            administered_user: administeredUser,
            verified_user: verifiedUser
          };
        })
      );
      
      setAdministrations(enrichedRecords);
    }

      // Fetch side effects data
      const { data: sideEffectsData } = await supabase
      .from('side_effects')
      .select('*')
      .order('side_effect_name');

    setSideEffects(sideEffectsData || []);

      // Fetch compliance data
      const { data: compliance } = await supabase
      .from('treatment_compliance')
      .select(`
        *,
        patients (
          users (first_name, last_name)
        ),
        prescriptions (
          prescription_items (
            drugs (drug_name)
          )
        )
      `)
      .order('calculation_date', { ascending: false })
      .limit(10);

    setComplianceData(compliance || []);

    } catch (error) {
      console.error('Error fetching administration data:', error);
      alert('Error loading administration data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterAdministrations = () => {
    const now = new Date();
    let filtered = administrations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(admin =>
        admin.patients.users.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.patients.users.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.prescription_items.drugs.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.prescription_items.drugs.generic_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(admin => admin.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(admin => {
        const scheduledDate = new Date(admin.scheduled_time);
        const today = new Date(now.toDateString());
        
        switch (dateFilter) {
          case 'today':
            return scheduledDate.toDateString() === today.toDateString();
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return scheduledDate.toDateString() === tomorrow.toDateString();
          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return scheduledDate >= weekStart && scheduledDate <= weekEnd;
          default:
            return true;
        }
      });
    }

    setFilteredAdministrations(filtered);

    // Separate scheduled administrations for today
    const todayScheduled = filtered.filter(admin => 
      admin.status === 'scheduled' && 
      new Date(admin.scheduled_time).toDateString() === new Date().toDateString()
    );
    setScheduledAdministrations(todayScheduled);
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const today = new Date(now.toDateString());
    
    const todayAdmin = administrations.filter(admin => 
      new Date(admin.scheduled_time) >= today
    );

    const administeredToday = todayAdmin.filter(admin => admin.status === 'administered').length;
    const scheduledToday = todayAdmin.filter(admin => admin.status === 'scheduled').length;
    const missedToday = todayAdmin.filter(admin => admin.status === 'missed').length;

    const totalAdministered = administrations.filter(admin => admin.status === 'administered').length;
    const totalMissed = administrations.filter(admin => admin.status === 'missed').length;
    const complianceRate = totalAdministered > 0 ? 
      (totalAdministered / (totalAdministered + totalMissed)) * 100 : 0;

    // Calculate safety metrics
    const administrationsWithSideEffects = administrations.filter(admin => 
      admin.notes && admin.notes.toLowerCase().includes('side effect')
    ).length;

    const dualVerified = administrations.filter(admin => 
      admin.verified_by !== null
    ).length;

    setAnalytics({
      administeredToday,
      scheduledToday,
      missedToday,
      totalAdministered,
      totalMissed,
      complianceRate: Math.round(complianceRate),
      safetyScore: Math.max(0, 100 - (administrationsWithSideEffects / Math.max(1, totalAdministered) * 100)),
      dualVerified,
      totalRecords: administrations.length
    });
  };

  const openAdministerModal = (administration) => {
    setSelectedAdministration(administration);
    setAdministrationForm({
      actual_time: new Date().toISOString().slice(0, 16),
      dosage_administered: administration.prescription_items.dosage_instructions,
      administration_route: 'oral',
      status: 'administered',
      notes: '',
      verified_by: null
    });
    setShowAdministerModal(true);
  };

  const openDetailsModal = (administration) => {
    setSelectedAdministration(administration);
    setShowDetailsModal(true);
  };

  const openSideEffectsModal = (administration) => {
    setSelectedAdministration(administration);
    setSideEffectsForm({
      side_effect_id: '',
      severity: 'mild',
      onset_time: new Date().toISOString().slice(0, 16),
      action_taken: '',
      resolution_time: '',
      notes: ''
    });
    setShowSideEffectsModal(true);
  };

  const recordAdministration = async () => {
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('drug_administration')
        .update({
          actual_time: administrationForm.actual_time,
          dosage_administered: administrationForm.dosage_administered,
          administration_route: administrationForm.administration_route,
          status: administrationForm.status,
          administered_by: user.id,
          verified_by: administrationForm.verified_by,
          notes: administrationForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAdministration.id);

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'drug_administered').single()).data?.id,
          table_name: 'drug_administration',
          record_id: selectedAdministration.id,
          new_values: administrationForm,
          notes: `Drug administration recorded for ${selectedAdministration.patients.users.first_name}`
        });

      // Update compliance data
      await updateComplianceData(selectedAdministration.patient_id);

      setShowAdministerModal(false);
      fetchAdministrationData();
      alert('Drug administration recorded successfully!');
    } catch (error) {
      console.error('Error recording administration:', error);
      alert('Error recording administration: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const recordSideEffect = async () => {
    try {
      setProcessing(true);
      
      const { data: sideEffect, error } = await supabase
        .from('patient_side_effects')
        .insert({
          drug_administration_id: selectedAdministration.id,
          side_effect_id: sideEffectsForm.side_effect_id,
          patient_id: selectedAdministration.patient_id,
          onset_time: sideEffectsForm.onset_time,
          severity: sideEffectsForm.severity,
          action_taken: sideEffectsForm.action_taken,
          resolution_time: sideEffectsForm.resolution_time || null,
          notes: sideEffectsForm.notes
        })
        .select()
        .single();

      if (error) throw error;

      // Update administration notes with side effect information
      const sideEffectName = sideEffects.find(se => se.id === sideEffectsForm.side_effect_id)?.side_effect_name;
      await supabase
        .from('drug_administration')
        .update({
          notes: `Side effect reported: ${sideEffectName} (${sideEffectsForm.severity}). ${sideEffectsForm.notes}`
        })
        .eq('id', selectedAdministration.id);

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'side_effect_reported').single()).data?.id,
          table_name: 'patient_side_effects',
          record_id: sideEffect.id,
          new_values: sideEffectsForm,
          notes: `Side effect reported for ${selectedAdministration.patients.users.first_name}`
        });

      setShowSideEffectsModal(false);
      fetchAdministrationData();
      alert('Side effect recorded successfully!');
    } catch (error) {
      console.error('Error recording side effect:', error);
      alert('Error recording side effect: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const updateComplianceData = async (patientId) => {
    try {
      // Calculate compliance for the patient
      const { data: patientAdmins } = await supabase
        .from('drug_administration')
        .select('*')
        .eq('patient_id', patientId)
        .gte('scheduled_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!patientAdmins) return;

      const scheduled = patientAdmins.length;
      const administered = patientAdmins.filter(admin => admin.status === 'administered').length;
      const complianceRate = scheduled > 0 ? (administered / scheduled) * 100 : 100;

      // Update or insert compliance record
      const { error } = await supabase
        .from('treatment_compliance')
        .upsert({
          patient_id: patientId,
          calculation_date: new Date().toISOString().split('T')[0],
          compliance_percentage: Math.round(complianceRate * 100) / 100,
          doses_scheduled: scheduled,
          doses_taken: administered,
          notes: `Auto-calculated compliance based on ${scheduled} scheduled administrations`
        }, {
          onConflict: 'patient_id,calculation_date'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating compliance data:', error);
    }
  };

  const markAsMissed = async (administration) => {
    try {
      const { error } = await supabase
        .from('drug_administration')
        .update({
          status: 'missed',
          actual_time: new Date().toISOString(),
          notes: 'Dose missed - marked by system',
          updated_at: new Date().toISOString()
        })
        .eq('id', administration.id);

      if (error) throw error;

      fetchAdministrationData();
      alert('Dose marked as missed.');
    } catch (error) {
      console.error('Error marking as missed:', error);
      alert('Error marking dose as missed: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'administered': return 'bg-green-100 text-green-800';
      case 'missed': return 'bg-red-100 text-red-800';
      case 'refused': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <ClockIcon className="h-4 w-4" />;
      case 'administered': return <CheckCircleIcon className="h-4 w-4" />;
      case 'missed': return <XCircleIcon className="h-4 w-4" />;
      case 'refused': return <ExclamationTriangleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const exportAdministrationReport = () => {
    const headers = ['Patient', 'Medication', 'Scheduled Time', 'Actual Time', 'Status', 'Route', 'Dosage', 'Administered By', 'Verified By', 'Notes'];
    const csvData = filteredAdministrations.map(admin => [
      `${admin.patients.users.first_name} ${admin.patients.users.last_name}`,
      admin.prescription_items.drugs.drug_name,
      new Date(admin.scheduled_time).toLocaleString(),
      admin.actual_time ? new Date(admin.actual_time).toLocaleString() : 'N/A',
      admin.status,
      admin.administration_route || 'N/A',
      admin.dosage_administered || admin.prescription_items.dosage_instructions,
      admin.administered_user ? `${admin.administered_user.first_name} ${admin.administered_user.last_name}` : 'N/A',
      admin.verified_user ? `${admin.verified_user.first_name} ${admin.verified_user.last_name}` : 'N/A',
      admin.notes || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drug_administration_${new Date().toISOString().split('T')[0]}.csv`;
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
            <h1 className="text-3xl font-bold text-gray-900">Drug Administration Management</h1>
            <p className="text-gray-600">Advanced medication administration tracking with safety monitoring</p>
          </div>
          <button
            onClick={exportAdministrationReport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Administered Today</p>
              <p className="text-2xl font-bold text-blue-900">{analytics.administeredToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Scheduled Today</p>
              <p className="text-2xl font-bold text-green-900">{analytics.scheduledToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">Missed Today</p>
              <p className="text-2xl font-bold text-red-900">{analytics.missedToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Compliance Rate</p>
              <p className="text-2xl font-bold text-purple-900">{analytics.complianceRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-600">Safety Score</p>
              <p className="text-2xl font-bold text-orange-900">{Math.round(analytics.safetyScore)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div className="flex items-center justify-end">
            <span className="text-sm text-gray-600">
              {filteredAdministrations.length} records
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Today's Scheduled Administrations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-orange-200 bg-orange-50">
            <h3 className="text-lg font-medium text-orange-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Today's Schedule ({scheduledAdministrations.length})
            </h3>
          </div>
          <div className="p-6">
            {scheduledAdministrations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500">No administrations scheduled for today!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {scheduledAdministrations.map(admin => (
                  <div key={admin.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {admin.patients.users.first_name} {admin.patients.users.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{admin.prescription_items.drugs.drug_name}</p>
                      </div>
                      <span className="text-sm font-medium text-orange-600">
                        {new Date(admin.scheduled_time).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p>Dosage: {admin.prescription_items.dosage_instructions}</p>
                      <p>Age: {Math.floor((new Date() - new Date(admin.patients.users.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))} years</p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openAdministerModal(admin)}
                        className="flex-1 bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700 transition duration-200"
                      >
                        Administer
                      </button>
                      <button
                        onClick={() => markAsMissed(admin)}
                        className="flex-1 bg-red-600 text-white py-2 rounded text-sm hover:bg-red-700 transition duration-200"
                      >
                        Mark Missed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Administration History */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-blue-200 bg-blue-50">
            <h3 className="text-lg font-medium text-blue-900 flex items-center">
              <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
              Administration History
            </h3>
          </div>
          <div className="p-6">
            {filteredAdministrations.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No administration records found</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredAdministrations.map(admin => (
                  <div key={admin.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {admin.patients.users.first_name} {admin.patients.users.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{admin.prescription_items.drugs.drug_name}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(admin.status)}`}>
                        {getStatusIcon(admin.status)}
                        <span className="ml-1 capitalize">{admin.status}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      <div>Scheduled: {new Date(admin.scheduled_time).toLocaleString()}</div>
                      <div>Actual: {admin.actual_time ? new Date(admin.actual_time).toLocaleString() : 'N/A'}</div>
                      <div>Route: {admin.administration_route || 'N/A'}</div>
                      <div>By: {admin.administered_user ? admin.administered_user.first_name : 'N/A'}</div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailsModal(admin)}
                        className="flex-1 bg-gray-100 text-gray-700 py-1 rounded text-sm hover:bg-gray-200 transition duration-200"
                      >
                        View Details
                      </button>
                      {admin.status === 'administered' && (
                        <button
                          onClick={() => openSideEffectsModal(admin)}
                          className="flex-1 bg-red-100 text-red-700 py-1 rounded text-sm hover:bg-red-200 transition duration-200"
                        >
                          Report Side Effect
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compliance Monitoring */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-green-200 bg-green-50">
            <h3 className="text-lg font-medium text-green-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Compliance Monitoring
            </h3>
          </div>
          <div className="p-6">
            {complianceData.length === 0 ? (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No compliance data available</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {complianceData.map(compliance => (
                  <div key={compliance.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">
                        {compliance.patients.users.first_name} {compliance.patients.users.last_name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        compliance.compliance_percentage >= 80 ? 'bg-green-100 text-green-800' :
                        compliance.compliance_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {compliance.compliance_percentage}%
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <p>Doses Taken: {compliance.doses_taken} / {compliance.doses_scheduled}</p>
                      <p>Date: {new Date(compliance.calculation_date).toLocaleDateString()}</p>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          compliance.compliance_percentage >= 80 ? 'bg-green-600' :
                          compliance.compliance_percentage >= 60 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${compliance.compliance_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Administer Medication Modal */}
      {showAdministerModal && selectedAdministration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Administer Medication</h3>
              
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 p-3 rounded">
                  <p><strong>Patient:</strong> {selectedAdministration.patients.users.first_name} {selectedAdministration.patients.users.last_name}</p>
                  <p><strong>Medication:</strong> {selectedAdministration.prescription_items.drugs.drug_name}</p>
                  <p><strong>Scheduled:</strong> {new Date(selectedAdministration.scheduled_time).toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Actual Administration Time</label>
                  <input
                    type="datetime-local"
                    value={administrationForm.actual_time}
                    onChange={(e) => setAdministrationForm({...administrationForm, actual_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dosage Administered</label>
                  <input
                    type="text"
                    value={administrationForm.dosage_administered}
                    onChange={(e) => setAdministrationForm({...administrationForm, dosage_administered: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter actual dosage administered"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Administration Route</label>
                  <select
                    value={administrationForm.administration_route}
                    onChange={(e) => setAdministrationForm({...administrationForm, administration_route: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {routeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={administrationForm.notes}
                    onChange={(e) => setAdministrationForm({...administrationForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Any observations or special instructions..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAdministerModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={recordAdministration}
                  disabled={processing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Recording...' : 'Record Administration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Administration Details Modal */}
      {showDetailsModal && selectedAdministration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Administration Details</h3>
              
              <div className="space-y-3 text-sm">
                <div><strong>Patient:</strong> {selectedAdministration.patients.users.first_name} {selectedAdministration.patients.users.last_name}</div>
                <div><strong>Medication:</strong> {selectedAdministration.prescription_items.drugs.drug_name}</div>
                <div><strong>Generic:</strong> {selectedAdministration.prescription_items.drugs.generic_name}</div>
                <div><strong>Scheduled Time:</strong> {new Date(selectedAdministration.scheduled_time).toLocaleString()}</div>
                <div><strong>Actual Time:</strong> {selectedAdministration.actual_time ? new Date(selectedAdministration.actual_time).toLocaleString() : 'N/A'}</div>
                <div><strong>Status:</strong> <span className="capitalize">{selectedAdministration.status}</span></div>
                <div><strong>Route:</strong> {selectedAdministration.administration_route || 'N/A'}</div>
                <div><strong>Dosage:</strong> {selectedAdministration.dosage_administered || selectedAdministration.prescription_items.dosage_instructions}</div>
                <div><strong>Administered By:</strong> {selectedAdministration.administered_user ? `${selectedAdministration.administered_user.first_name} ${selectedAdministration.administered_user.last_name}` : 'N/A'}</div>
                <div><strong>Verified By:</strong> {selectedAdministration.verified_user ? `${selectedAdministration.verified_user.first_name} ${selectedAdministration.verified_user.last_name}` : 'N/A'}</div>
                {selectedAdministration.notes && (
                  <div><strong>Notes:</strong> {selectedAdministration.notes}</div>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Effects Modal */}
      {showSideEffectsModal && selectedAdministration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Report Side Effect</h3>
              
              <div className="space-y-4 mb-6">
                <div className="bg-red-50 p-3 rounded">
                  <p><strong>Patient:</strong> {selectedAdministration.patients.users.first_name} {selectedAdministration.patients.users.last_name}</p>
                  <p><strong>Medication:</strong> {selectedAdministration.prescription_items.drugs.drug_name}</p>
                  <p><strong>Administered:</strong> {new Date(selectedAdministration.actual_time).toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Side Effect</label>
                  <select
                    value={sideEffectsForm.side_effect_id}
                    onChange={(e) => setSideEffectsForm({...sideEffectsForm, side_effect_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a side effect</option>
                    {sideEffects.map(effect => (
                      <option key={effect.id} value={effect.id}>{effect.side_effect_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <select
                    value={sideEffectsForm.severity}
                    onChange={(e) => setSideEffectsForm({...sideEffectsForm, severity: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {severityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Onset Time</label>
                  <input
                    type="datetime-local"
                    value={sideEffectsForm.onset_time}
                    onChange={(e) => setSideEffectsForm({...sideEffectsForm, onset_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Action Taken</label>
                  <input
                    type="text"
                    value={sideEffectsForm.action_taken}
                    onChange={(e) => setSideEffectsForm({...sideEffectsForm, action_taken: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dose reduced, medication changed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={sideEffectsForm.notes}
                    onChange={(e) => setSideEffectsForm({...sideEffectsForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the side effect in detail..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSideEffectsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={recordSideEffect}
                  disabled={processing || !sideEffectsForm.side_effect_id}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {processing ? 'Reporting...' : 'Report Side Effect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DrugAdministration;