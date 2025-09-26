// components/admin/MedicalRecordsAdmin.jsx - CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  DocumentTextIcon,
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
  BuildingLibraryIcon,
  CogIcon
} from '@heroicons/react/24/outline';

const MedicalRecordsAdmin = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    hasAllergies: 'all',
    hasConditions: 'all'
  });
  const [selectedPatients, setSelectedPatients] = useState(new Set());
  const [auditLogs, setAuditLogs] = useState([]);
  const [dataIntegrityIssues, setDataIntegrityIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('patients');
  const { user: authUser } = useAuth();

  // Correct navigation items matching your AdminDashboard
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

  // Fetch all patients with their medical data - CONNECTED TO BACKEND
  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // First, get all users with patient role
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'patient')
        .single();

      if (rolesError) throw rolesError;

      // Get users with patient role
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          date_of_birth,
          address,
          created_at,
          updated_at,
          gender_id,
          genders (gender_name)
        `)
        .eq('role_id', rolesData.id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get patient-specific data for each user
      const patientsWithDetails = await Promise.all(
        usersData.map(async (user) => {
          // Get patient record
          const { data: patientData } = await supabase
            .from('patients')
            .select(`
              emergency_contact_name,
              emergency_contact_phone,
              insurance_provider,
              insurance_number
            `)
            .eq('id', user.id)
            .single();

          // Get allergies
          const { data: allergiesData } = await supabase
            .from('patient_allergies')
            .select(`
              allergies (allergy_name),
              allergy_severities (severity_name)
            `)
            .eq('patient_id', user.id);

          // Get conditions
          const { data: conditionsData } = await supabase
            .from('patient_conditions')
            .select(`
              medical_conditions (condition_name),
              diagnosis_date,
              diagnosis_statuses (status_name)
            `)
            .eq('patient_id', user.id);

          // Get latest vitals
          const { data: vitalsData } = await supabase
            .from('vital_signs')
            .select('*')
            .eq('patient_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: user.id,
            fullName: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone_number,
            dateOfBirth: user.date_of_birth,
            gender: user.genders?.gender_name || 'Not specified',
            address: user.address,
            emergencyContact: patientData?.emergency_contact_name || 'Not provided',
            insuranceProvider: patientData?.insurance_provider || 'Not insured',
            allergies: allergiesData || [],
            conditions: conditionsData || [],
            lastVitals: vitalsData || null,
            recordStatus: 'Active',
            lastUpdated: user.updated_at || user.created_at
          };
        })
      );

      setPatients(patientsWithDetails);
      setFilteredPatients(patientsWithDetails);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit logs - CONNECTED TO BACKEND
  const fetchAuditLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('activity_log')
        .select(`
          id,
          created_at,
          activity_type_id,
          table_name,
          record_id,
          old_values,
          new_values,
          user_id,
          users (full_name, email),
          activity_types (activity_name)
        `)
        .or('table_name.eq.patients,table_name.eq.users,table_name.eq.medical_notes,table_name.eq.vital_signs')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs(logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  // Check data integrity - CONNECTED TO BACKEND
  const checkDataIntegrity = async () => {
    try {
      const issues = [];

      // Check for patients without complete user records
      const { data: incompleteUsers } = await supabase
        .from('users')
        .select('id, full_name')
        .or('full_name.is.null,phone_number.is.null,date_of_birth.is.null')
        .eq('role_id', (await supabase.from('roles').select('id').eq('role_name', 'patient').single()).data?.id);

      if (incompleteUsers?.length > 0) {
        issues.push({
          type: 'Incomplete Patient Records',
          description: `${incompleteUsers.length} patient records missing essential information`,
          severity: 'medium',
          count: incompleteUsers.length
        });
      }

      // Check for patients without emergency contacts
      const { data: noEmergencyContact } = await supabase
        .from('patients')
        .select('id')
        .is('emergency_contact_name', null);

      if (noEmergencyContact?.length > 0) {
        issues.push({
          type: 'Missing Emergency Contacts',
          description: `${noEmergencyContact.length} patients without emergency contact information`,
          severity: 'high',
          count: noEmergencyContact.length
        });
      }

      // Check for recent activity
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: staleRecords } = await supabase
        .from('users')
        .select('id, first_name, last_name, updated_at')
        .lt('updated_at', weekAgo.toISOString())
        .eq('role_id', (await supabase.from('roles').select('id').eq('role_name', 'patient').single()).data?.id);

      if (staleRecords?.length > 0) {
        issues.push({
          type: 'Stale Records',
          description: `${staleRecords.length} patient records not updated in the last 7 days`,
          severity: 'low',
          count: staleRecords.length
        });
      }

      setDataIntegrityIssues(issues);
    } catch (error) {
      console.error('Error checking data integrity:', error);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchAuditLogs();
    checkDataIntegrity();
  }, []);

  // Filter patients based on search and filters
  useEffect(() => {
    let filtered = patients;

    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm)
      );
    }

    if (filters.hasAllergies !== 'all') {
      filtered = filtered.filter(patient => 
        filters.hasAllergies === 'yes' ? patient.allergies.length > 0 : patient.allergies.length === 0
      );
    }

    if (filters.hasConditions !== 'all') {
      filtered = filtered.filter(patient => 
        filters.hasConditions === 'yes' ? patient.conditions.length > 0 : patient.conditions.length === 0
      );
    }

    setFilteredPatients(filtered);
  }, [searchTerm, filters, patients]);

  // Bulk operations
  const handleBulkExport = () => {
    const dataToExport = selectedPatients.size > 0 
      ? patients.filter(p => selectedPatients.has(p.id))
      : filteredPatients;

    const csvContent = convertToCSV(dataToExport);
    downloadCSV(csvContent, 'medical_records_export.csv');
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPatients(new Set(filteredPatients.map(p => p.id)));
    } else {
      setSelectedPatients(new Set());
    }
  };

  const handleSelectPatient = (patientId, checked) => {
    const newSelected = new Set(selectedPatients);
    if (checked) {
      newSelected.add(patientId);
    } else {
      newSelected.delete(patientId);
    }
    setSelectedPatients(newSelected);
  };

  // Utility functions
  const convertToCSV = (data) => {
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 'Address', 'Emergency Contact', 'Insurance Provider', 'Allergies Count', 'Conditions Count'];
    const csvRows = data.map(patient => [
      patient.id,
      `"${patient.fullName}"`,
      patient.email,
      patient.phone,
      patient.dateOfBirth,
      patient.gender,
      `"${patient.address}"`,
      patient.emergencyContact,
      patient.insuranceProvider,
      patient.allergies.length,
      patient.conditions.length
    ]);
    
    return [headers, ...csvRows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <DashboardLayout user={formattedUser} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading medical records...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Medical Records Administration</h1>
            <p className="text-gray-600">Oversight of all patient data and records</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleBulkExport}
              disabled={filteredPatients.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center transition duration-200"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export {selectedPatients.size > 0 ? `${selectedPatients.size} Selected` : 'All'}
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition duration-200"
            >
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={UserGroupIcon}
          label="Total Patients"
          value={patients.length}
          color="blue"
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="With Allergies"
          value={patients.filter(p => p.allergies.length > 0).length}
          color="orange"
        />
        <StatCard
          icon={DocumentTextIcon}
          label="With Conditions"
          value={patients.filter(p => p.conditions.length > 0).length}
          color="purple"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Data Issues"
          value={dataIntegrityIssues.reduce((sum, issue) => sum + (issue.count || 0), 0)}
          color={dataIntegrityIssues.length === 0 ? 'green' : 'red'}
        />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['patients', 'audit', 'integrity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'patients' ? 'Patient Database' : 
               tab === 'audit' ? 'Audit Trail' : 'Data Integrity'}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      {activeTab === 'patients' && (
        <PatientDatabaseTab
          patients={filteredPatients}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filters={filters}
          setFilters={setFilters}
          selectedPatients={selectedPatients}
          handleSelectAll={handleSelectAll}
          handleSelectPatient={handleSelectPatient}
          handleBulkExport={handleBulkExport}
        />
      )}

      {activeTab === 'audit' && <AuditTrailTab auditLogs={auditLogs} />}

      {activeTab === 'integrity' && (
        <DataIntegrityTab issues={dataIntegrityIssues} onRefresh={checkDataIntegrity} />
      )}
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

// Patient Database Tab Component
const PatientDatabaseTab = ({
  patients,
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  selectedPatients,
  handleSelectAll,
  handleSelectPatient,
  handleBulkExport
}) => (
  <div className="space-y-6">
    {/* Advanced Filters */}
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
        <FunnelIcon className="h-5 w-5 text-gray-400" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
          <select
            value={filters.hasAllergies}
            onChange={(e) => setFilters(prev => ({...prev, hasAllergies: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Patients</option>
            <option value="yes">With Allergies</option>
            <option value="no">Without Allergies</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conditions</label>
          <select
            value={filters.hasConditions}
            onChange={(e) => setFilters(prev => ({...prev, hasConditions: e.target.value}))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Patients</option>
            <option value="yes">With Conditions</option>
            <option value="no">Without Conditions</option>
          </select>
        </div>
      </div>
    </div>

    {/* Bulk Operations Bar */}
    {selectedPatients.size > 0 && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              {selectedPatients.size} patients selected
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBulkExport}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Export Selected
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Patients Table */}
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Patient Records ({patients.length})
        </h3>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedPatients.size === patients.length && patients.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Select all</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                Select
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient Information
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medical Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((patient) => (
              <PatientTableRow
                key={patient.id}
                patient={patient}
                isSelected={selectedPatients.has(patient.id)}
                onSelect={handleSelectPatient}
              />
            ))}
          </tbody>
        </table>
      </div>

      {patients.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No patients found matching your criteria</p>
        </div>
      )}
    </div>
  </div>
);

// Patient Table Row Component
const PatientTableRow = ({ patient, isSelected, onSelect }) => (
  <tr className="hover:bg-gray-50 transition-colors duration-150">
    <td className="px-6 py-4 whitespace-nowrap">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onSelect(patient.id, e.target.checked)}
        className="rounded border-gray-300"
      />
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-medium">
            {patient.fullName?.charAt(0) || 'P'}
          </span>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{patient.fullName}</div>
          <div className="text-sm text-gray-500">{patient.email}</div>
          <div className="text-sm text-gray-500">{patient.phone}</div>
          <div className="text-xs text-gray-400">DOB: {patient.dateOfBirth || 'Not provided'}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="space-y-1">
        <div className="flex space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
            patient.allergies.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            Allergies: {patient.allergies.length}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
            patient.conditions.length > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
          }`}>
            Conditions: {patient.conditions.length}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Insurance: {patient.insuranceProvider}
        </div>
        <div className="text-xs text-gray-500">
          Emergency: {patient.emergencyContact}
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {new Date(patient.lastUpdated).toLocaleDateString()}
      <div className="text-xs text-gray-400">
        {new Date(patient.lastUpdated).toLocaleTimeString()}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
      <button className="text-blue-600 hover:text-blue-900 transition duration-200">
        <EyeIcon className="h-4 w-4 inline" /> View
      </button>
      <button className="text-gray-600 hover:text-gray-900 transition duration-200">
        <PencilIcon className="h-4 w-4 inline" /> Edit
      </button>
    </td>
  </tr>
);

// Audit Trail Tab Component
const AuditTrailTab = ({ auditLogs }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>
        <span className="text-sm text-gray-500">Last 50 activities</span>
      </div>
    </div>
    <div className="p-6">
      <div className="space-y-4">
        {auditLogs.map((log) => (
          <div key={log.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{log.activity_types?.activity_name}</span>
                  <span className="text-sm text-gray-500">by {log.users?.full_name || 'System'}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Table: {log.table_name} • Record: {log.record_id}
                </div>
                {log.old_values && (
                  <div className="mt-2 text-xs bg-red-50 p-2 rounded">
                    <strong>Before:</strong> {JSON.stringify(log.old_values)}
                  </div>
                )}
                {log.new_values && (
                  <div className="mt-1 text-xs bg-green-50 p-2 rounded">
                    <strong>After:</strong> {JSON.stringify(log.new_values)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  {log.users?.email}
                </div>
              </div>
            </div>
          </div>
        ))}
        {auditLogs.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Data Integrity Tab Component
const DataIntegrityTab = ({ issues, onRefresh }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <h3 className="text-lg font-medium text-gray-900">Data Integrity Check</h3>
      <button
        onClick={onRefresh}
        className="flex items-center text-blue-600 hover:text-blue-800 transition duration-200"
      >
        <ArrowPathIcon className="h-4 w-4 mr-2" />
        Refresh Check
      </button>
    </div>
    <div className="p-6">
      {issues.length > 0 ? (
        <div className="space-y-4">
          {issues.map((issue, index) => (
            <div key={index} className={`border-l-4 p-4 ${
              issue.severity === 'high' ? 'border-red-400 bg-red-50' :
              issue.severity === 'medium' ? 'border-orange-400 bg-orange-50' :
              'border-yellow-400 bg-yellow-50'
            }`}>
              <div className="flex items-center">
                {issue.severity === 'high' ? (
                  <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                ) : issue.severity === 'medium' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-400 mr-2" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                )}
                <div>
                  <h4 className="font-medium text-gray-900">{issue.type}</h4>
                  <p className="text-sm text-gray-600">{issue.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">All data integrity checks passed</p>
          <p className="text-gray-600">No issues found in the medical records database</p>
        </div>
      )}
    </div>
  </div>
);

export default MedicalRecordsAdmin;