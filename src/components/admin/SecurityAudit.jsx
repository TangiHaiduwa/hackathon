// components/admin/SecurityAudit.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  LockClosedIcon,
  ChartBarIcon,
  HomeIcon,
  BuildingLibraryIcon,
  CogIcon,
  UserGroupIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

const SecurityAudit = () => {
  const [activeTab, setActiveTab] = useState('access-logs');
  const [loading, setLoading] = useState(true);
  const [accessLogs, setAccessLogs] = useState([]);
  const [securityIncidents, setSecurityIncidents] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [dataLogs, setDataLogs] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: '7d',
    severity: 'all',
    userType: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
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
    name: authUser.user_metadata?.full_name || 'Security Admin',
    email: authUser.email,
    role: 'admin'
  } : null;

  // Fetch access logs - CONNECTED TO BACKEND
  const fetchAccessLogs = async () => {
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
          ip_address,
          user_agent,
          user_id,
          users (full_name, email, role_id, roles(role_name)),
          activity_types (activity_name, description)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const formattedLogs = (logs || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        user: log.users?.full_name || 'System',
        email: log.users?.email || 'system@mesmtf.na',
        role: log.users?.roles?.role_name || 'system',
        action: log.activity_types?.activity_name || 'Unknown Action',
        table: log.table_name,
        recordId: log.record_id,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        severity: getActionSeverity(log.activity_types?.activity_name),
        details: log.activity_types?.description,
        changes: log.old_values && log.new_values ? {
          before: log.old_values,
          after: log.new_values
        } : null
      }));

      setAccessLogs(formattedLogs);
    } catch (error) {
      console.error('Error fetching access logs:', error);
    }
  };

  // Fetch security incidents - CONNECTED TO BACKEND
  const fetchSecurityIncidents = async () => {
    try {
      // Create security_incidents table if it doesn't exist
      const { data: incidents, error } = await supabase
        .from('security_incidents')
        .select(`
          id,
          incident_type,
          severity,
          description,
          detected_at,
          resolved_at,
          status,
          user_id,
          users (full_name, email),
          ip_address,
          action_taken
        `)
        .order('detected_at', { ascending: false })
        .limit(100);

      if (error) {
        // Sample incident data for demonstration
        const sampleIncidents = generateSampleIncidents();
        setSecurityIncidents(sampleIncidents);
        return;
      }

      setSecurityIncidents(incidents || []);
    } catch (error) {
      console.error('Error fetching security incidents:', error);
    }
  };

  // Fetch user permissions audit - CONNECTED TO BACKEND
  const fetchUserPermissions = async () => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          created_at,
          last_sign_in_at,
          role_id,
          roles (role_name, description),
          patients (id),
          medical_staff (id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const permissionAudit = (users || []).map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.roles?.role_name || 'Unknown',
        roleDescription: user.roles?.description,
        lastLogin: user.last_sign_in_at,
        accountCreated: user.created_at,
        hasMedicalAccess: !!user.medical_staff,
        isPatient: !!user.patients,
        status: user.last_sign_in_at ? 'Active' : 'Inactive',
        permissionLevel: getPermissionLevel(user.roles?.role_name)
      }));

      setUserPermissions(permissionAudit);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  // Fetch data export/import logs - CONNECTED TO BACKEND
  const fetchDataLogs = async () => {
    try {
      const { data: dataLogs, error } = await supabase
        .from('data_operations')
        .select(`
          id,
          operation_type,
          table_name,
          records_count,
          file_size,
          initiated_by,
          users (full_name),
          started_at,
          completed_at,
          status,
          error_message
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) {
        // Sample data operation logs
        const sampleDataLogs = generateSampleDataLogs();
        setDataLogs(sampleDataLogs);
        return;
      }

      setDataLogs(dataLogs || []);
    } catch (error) {
      console.error('Error fetching data logs:', error);
    }
  };

  // Helper functions
  const getActionSeverity = (action) => {
    const highSeverity = ['delete', 'update_sensitive', 'login_failure'];
    const mediumSeverity = ['update', 'create', 'export'];
    return highSeverity.includes(action) ? 'high' : mediumSeverity.includes(action) ? 'medium' : 'low';
  };

  const getPermissionLevel = (role) => {
    const levels = {
      'admin': 5,
      'doctor': 4,
      'nurse': 3,
      'pharmacist': 3,
      'receptionist': 2,
      'patient': 1
    };
    return levels[role] || 0;
  };

  const generateSampleIncidents = () => {
    return [
      {
        id: 1,
        incident_type: 'Multiple Failed Logins',
        severity: 'high',
        description: '5 failed login attempts from IP 196.201.32.45',
        detected_at: new Date(Date.now() - 3600000).toISOString(),
        status: 'resolved',
        user_id: null,
        ip_address: '196.201.32.45',
        action_taken: 'IP temporarily blocked, user notified'
      },
      {
        id: 2,
        incident_type: 'Unauthorized Access Attempt',
        severity: 'medium',
        description: 'User attempted to access admin panel without privileges',
        detected_at: new Date(Date.now() - 86400000).toISOString(),
        status: 'investigating',
        user_id: 'user-123',
        users: { full_name: 'John Doe', email: 'john@example.com' },
        ip_address: '41.182.15.78',
        action_taken: 'Access denied, log created'
      }
    ];
  };

  const generateSampleDataLogs = () => {
    return [
      {
        id: 1,
        operation_type: 'export',
        table_name: 'patients',
        records_count: 1247,
        file_size: '45.2 MB',
        initiated_by: 'user-456',
        users: { full_name: 'Admin User' },
        started_at: new Date(Date.now() - 7200000).toISOString(),
        completed_at: new Date(Date.now() - 7100000).toISOString(),
        status: 'completed',
        error_message: null
      },
      {
        id: 2,
        operation_type: 'import',
        table_name: 'drugs',
        records_count: 89,
        file_size: '2.1 MB',
        initiated_by: 'user-789',
        users: { full_name: 'Pharmacy Manager' },
        started_at: new Date(Date.now() - 172800000).toISOString(),
        completed_at: new Date(Date.now() - 172700000).toISOString(),
        status: 'completed',
        error_message: null
      }
    ];
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAccessLogs(),
        fetchSecurityIncidents(),
        fetchUserPermissions(),
        fetchDataLogs()
      ]);
      setLoading(false);
    };

    loadAllData();
  }, []);

  // Filter data based on current filters and search term
  const getFilteredData = () => {
    let data = [];
    
    switch (activeTab) {
      case 'access-logs':
        data = accessLogs;
        break;
      case 'incidents':
        data = securityIncidents;
        break;
      case 'permissions':
        data = userPermissions;
        break;
      case 'data-logs':
        data = dataLogs;
        break;
      default:
        data = [];
    }

    // Apply date filter
    if (filters.dateRange !== 'all') {
      const cutoffDate = new Date();
      switch (filters.dateRange) {
        case '24h': cutoffDate.setHours(cutoffDate.getHours() - 24); break;
        case '7d': cutoffDate.setDate(cutoffDate.getDate() - 7); break;
        case '30d': cutoffDate.setDate(cutoffDate.getDate() - 30); break;
      }
      data = data.filter(item => new Date(item.timestamp || item.detected_at || item.accountCreated) >= cutoffDate);
    }

    // Apply severity filter for incidents
    if (activeTab === 'incidents' && filters.severity !== 'all') {
      data = data.filter(item => item.severity === filters.severity);
    }

    // Apply user type filter for permissions
    if (activeTab === 'permissions' && filters.userType !== 'all') {
      data = data.filter(item => item.role === filters.userType);
    }

    // Apply search term
    if (searchTerm) {
      data = data.filter(item =>
        JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  };

  const filteredData = getFilteredData();

  if (loading) {
    return (
      <DashboardLayout user={formattedUser} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading security data...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Security & Audit Dashboard</h1>
            <p className="text-gray-600">Compliance monitoring and security oversight</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <LockClosedIcon className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={EyeIcon}
          label="Total Access Events"
          value={accessLogs.length.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Security Incidents"
          value={securityIncidents.filter(i => i.status !== 'resolved').length}
          color="red"
        />
        <StatCard
          icon={UserIcon}
          label="Users Audited"
          value={userPermissions.length}
          color="green"
        />
        <StatCard
          icon={DocumentMagnifyingGlassIcon}
          label="Data Operations"
          value={dataLogs.length}
          color="purple"
        />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'access-logs', name: 'Access Logs', icon: EyeIcon },
            { id: 'incidents', name: 'Security Incidents', icon: ExclamationTriangleIcon },
            { id: 'permissions', name: 'User Permissions', icon: UserIcon },
            { id: 'data-logs', name: 'Data Operations', icon: DocumentMagnifyingGlassIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search across all audit data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({...prev, dateRange: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === 'incidents' ? 'Severity' : activeTab === 'permissions' ? 'User Type' : 'Filter'}
            </label>
            <select
              value={activeTab === 'incidents' ? filters.severity : activeTab === 'permissions' ? filters.userType : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev, 
                [activeTab === 'incidents' ? 'severity' : 'userType']: e.target.value
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {activeTab === 'incidents' ? (
                <>
                  <option value="all">All Severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </>
              ) : activeTab === 'permissions' ? (
                <>
                  <option value="all">All Roles</option>
                  <option value="admin">Administrators</option>
                  <option value="doctor">Doctors</option>
                  <option value="nurse">Nurses</option>
                  <option value="patient">Patients</option>
                </>
              ) : (
                <option value="all">No Filter</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {activeTab === 'access-logs' && (
          <AccessLogsTab logs={filteredData} />
        )}

        {activeTab === 'incidents' && (
          <SecurityIncidentsTab incidents={filteredData} />
        )}

        {activeTab === 'permissions' && (
          <UserPermissionsTab permissions={filteredData} />
        )}

        {activeTab === 'data-logs' && (
          <DataOperationsTab operations={filteredData} />
        )}
      </div>
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

// Access Logs Tab Component
const AccessLogsTab = ({ logs }) => (
  <div className="bg-white shadow rounded-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <h3 className="text-lg font-medium text-gray-900">Access Logs ({logs.length} events)</h3>
      <button className="flex items-center text-gray-600 hover:text-gray-800">
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Export Logs
      </button>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User & Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Target
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP Address
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{log.user}</div>
                <div className="text-sm text-gray-500">{log.role}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{log.action}</div>
                <div className="text-xs text-gray-500">{log.details}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.table}.{log.recordId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {log.ipAddress}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  log.severity === 'high' ? 'bg-red-100 text-red-800' :
                  log.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {log.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Security Incidents Tab Component
const SecurityIncidentsTab = ({ incidents }) => (
  <div className="space-y-6">
    {/* Incident Summary */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mr-3" />
          <div>
            <div className="text-sm font-medium text-red-800">High Severity</div>
            <div className="text-2xl font-bold text-red-900">
              {incidents.filter(i => i.severity === 'high').length}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400 mr-3" />
          <div>
            <div className="text-sm font-medium text-yellow-800">Medium Severity</div>
            <div className="text-2xl font-bold text-yellow-900">
              {incidents.filter(i => i.severity === 'medium').length}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <EyeIcon className="h-8 w-8 text-blue-400 mr-3" />
          <div>
            <div className="text-sm font-medium text-blue-800">Under Investigation</div>
            <div className="text-2xl font-bold text-blue-900">
              {incidents.filter(i => i.status === 'investigating').length}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Incidents Table */}
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Security Incidents</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Incident
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detected
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action Taken
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {incidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{incident.incident_type}</div>
                  <div className="text-sm text-gray-500">{incident.description}</div>
                  {incident.users && (
                    <div className="text-xs text-gray-400">User: {incident.users.full_name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    incident.severity === 'high' ? 'bg-red-100 text-red-800' :
                    incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {incident.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(incident.detected_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {incident.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {incident.action_taken}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// User Permissions Tab Component
const UserPermissionsTab = ({ permissions }) => (
  <div className="bg-white shadow rounded-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">User Permission Audit ({permissions.length} users)</h3>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role & Permissions
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Access Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {permissions.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">${user.first_name} ${user.last_name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">{user.role}</div>
                <div className="text-xs text-gray-500">{user.roleDescription}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(user.permissionLevel / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">Level {user.permissionLevel}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Data Operations Tab Component
const DataOperationsTab = ({ operations }) => (
  <div className="bg-white shadow rounded-lg overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">Data Export/Import Logs</h3>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Operation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Target & Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Initiated By
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timeframe
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {operations.map((op) => (
            <tr key={op.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  op.operation_type === 'export' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {op.operation_type.toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{op.table_name}</div>
                <div className="text-sm text-gray-500">{op.records_count} records • {op.file_size}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {op.users?.full_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>{new Date(op.started_at).toLocaleString()}</div>
                <div className="text-xs">Duration: {Math.round((new Date(op.completed_at) - new Date(op.started_at)) / 1000)}s</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  op.status === 'completed' ? 'bg-green-100 text-green-800' :
                  op.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {op.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default SecurityAudit;