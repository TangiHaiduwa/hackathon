// components/admin/UserManagement.jsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  UserGroupIcon,
  HomeIcon,
  ChartBarIcon,
  BuildingLibraryIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(null);
  const { user: authUser } = useAuth();

  // Navigation items for the sidebar - matching your DashboardLayout structure
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

  // Database helper functions
  const databaseHelpers = {
    getRoleId: async (roleName) => {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id')
          .eq('role_name', roleName)
          .single();
        
        if (error) throw error;
        return data.id;
      } catch (error) {
        console.error(`Error getting role ID for ${roleName}:`, error);
        throw new Error(`Role '${roleName}' not found`);
      }
    },

    getGenderId: async (genderCode) => {
      try {
        if (!genderCode) return null;
        
        const { data, error } = await supabase
          .from('genders')
          .select('id')
          .eq('gender_code', genderCode)
          .single();
        
        if (error) return null;
        return data?.id;
      } catch (error) {
        console.error('Error getting gender ID:', error);
        return null;
      }
    }
  };

  // Fetch all users with their roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone_number,
          date_of_birth,
          address,
          created_at,
          updated_at,
          role_id,
          roles (role_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        // Fallback to basic user data
        const { data: basicUsers, error: basicError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (basicError) throw basicError;
        
        const formattedUsers = basicUsers.map(user => ({
          id: user.id,
          email: user.email,
          fullName: `${user.first_name} ${user.last_name}`,
          phone: user.phone_number,
          dateOfBirth: user.date_of_birth,
          address: user.address,
          role: 'user',
          joinDate: new Date(user.created_at).toLocaleDateString(),
          status: 'Active'
        }));

        setUsers(formattedUsers);
        setFilteredUsers(formattedUsers);
        return;
      }

      const formattedUsers = usersData.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        phone: user.phone_number,
        dateOfBirth: user.date_of_birth,
        address: user.address,
        role: user.roles?.role_name || 'user',
        joinDate: new Date(user.created_at).toLocaleDateString(),
        status: 'Active'
      }));

      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);

  // Enhanced user creation function (similar to AdminDashboard)
  const handleAddUser = async (userData) => {
    try {
      // Generate secure temporary password
      const tempPassword = generateTempPassword();

      // Create auth user (admin function)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          user_type: userData.role,
          phone_number: userData.phone,
          temporary_password: true
        }
      });

      if (authError) {
        throw new Error(`User creation failed: ${authError.message}`);
      }

      // Get role ID
      const roleId = await databaseHelpers.getRoleId(userData.role);
      
      // Get gender ID if provided
      const genderId = userData.gender ? await databaseHelpers.getGenderId(userData.gender) : null;

      // Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role_id: roleId,
          phone_number: userData.phone,
          date_of_birth: userData.dateOfBirth,
          gender_id: genderId,
          address: userData.address
        });

      if (userError) {
        // Rollback: delete auth user if user creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`User record creation failed: ${userError.message}`);
      }

      // Create medical staff record for medical roles
      if (['doctor', 'nurse', 'pharmacist'].includes(userData.role)) {
        const { error: staffError } = await supabase
          .from('medical_staff')
          .insert({
            id: authData.user.id,
            specialization_id: userData.specialization_id || null,
            department_id: userData.department_id || null,
            license_number: userData.license_number,
            qualification: userData.qualification,
            years_experience: userData.years_experience ? parseInt(userData.years_experience) : null,
            bio: userData.bio
          });

        if (staffError) {
          // Rollback: delete both records
          await supabase.from('users').delete().eq('id', authData.user.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Medical staff record creation failed: ${staffError.message}`);
        }
      }

      // Create patient record if role is patient
      if (userData.role === 'patient') {
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            id: authData.user.id,
            emergency_contact_name: userData.emergency_contact_name,
            emergency_contact_phone: userData.emergency_contact_phone,
            insurance_provider: userData.insurance_provider,
            insurance_number: userData.insurance_number
          });

        if (patientError) {
          await supabase.from('users').delete().eq('id', authData.user.id);
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Patient record creation failed: ${patientError.message}`);
        }
      }

      await fetchUsers();
      setShowAddUserModal(false);
      
      return { 
        success: true, 
        message: `${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} account created successfully!`,
        tempPassword: tempPassword
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  };

  // User actions
  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'reset_password':
          const user = users.find(u => u.id === userId);
          if (user) {
            const { error } = await supabase.auth.admin.resetPasswordForEmail(user.email);
            if (error) throw error;
            alert('Password reset email sent!');
          }
          break;
        
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user?')) {
            await supabase.auth.admin.deleteUser(userId);
            await fetchUsers();
          }
          break;
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      alert('Error: ' + error.message);
    }
  };

  // Helper functions
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (loading) {
    return (
      <DashboardLayout user={formattedUser} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage all user accounts and permissions</p>
          </div>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New User
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={UserGroupIcon}
          label="Total Users"
          value={users.length}
          color="blue"
        />
        <StatCard
          icon={UserGroupIcon}
          label="Patients"
          value={users.filter(u => u.role === 'patient').length}
          color="green"
        />
        <StatCard
          icon={ShieldCheckIcon}
          label="Medical Staff"
          value={users.filter(u => ['doctor', 'nurse', 'pharmacist'].includes(u.role)).length}
          color="purple"
        />
        <StatCard
          icon={CalendarIcon}
          label="Active Today"
          value={users.filter(u => u.status === 'Active').length}
          color="orange"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              />
            </div>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          >
            <option value="all">All Roles</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="receptionist">Receptionist</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={fetchUsers}
            className="flex items-center text-gray-600 hover:text-gray-800 transition duration-200"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <span className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            User Accounts
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  onUserAction={handleUserAction}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserPlusIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No users found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Enhanced Add User Modal */}
      <EnhancedAddUserModal 
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onAddUser={handleAddUser}
      />

      {/* User Details Modal */}
      {showUserDetails && (
        <UserDetailsModal
          user={showUserDetails}
          onClose={() => setShowUserDetails(null)}
          onUserAction={handleUserAction}
        />
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

// User Table Row Component
const UserTableRow = ({ user, onUserAction }) => (
  <tr className="hover:bg-gray-50 transition-colors duration-150">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-medium">
            {user.fullName?.charAt(0) || user.email?.charAt(0)}
          </span>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{user.fullName || 'No Name'}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      </div>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
        user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
        user.role === 'nurse' ? 'bg-green-100 text-green-800' :
        user.role === 'pharmacist' ? 'bg-orange-100 text-orange-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {user.role}
      </span>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      <div>{user.phone || 'No phone'}</div>
      <div className="text-xs text-gray-400">{user.email}</div>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      {user.joinDate}
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {user.status}
      </span>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
      <button
        onClick={() => onUserAction(user.id, 'reset_password')}
        className="text-blue-600 hover:text-blue-900 transition duration-200"
        title="Reset Password"
      >
        Reset Password
      </button>
      <button
        onClick={() => onUserAction(user.id, 'delete')}
        className="text-red-600 hover:text-red-900 transition duration-200"
        title="Delete User"
      >
        <TrashIcon className="h-4 w-4 inline" /> Delete
      </button>
    </td>
  </tr>
);

// Enhanced Add User Modal Component (similar to AdminDashboard)
const EnhancedAddUserModal = ({ isOpen, onClose, onAddUser }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'patient',
    dateOfBirth: '',
    gender: '',
    address: '',
    
    // Medical Staff Fields
    specialization_id: '',
    department_id: '',
    license_number: '',
    qualification: '',
    years_experience: '',
    bio: '',
    
    // Patient Fields
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_number: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchReferenceData();
    }
  }, [isOpen]);

  const fetchReferenceData = async () => {
    try {
      const [specsResult, deptsResult] = await Promise.all([
        supabase.from('specializations').select('id, specialization_name').order('specialization_name'),
        supabase.from('departments').select('id, department_name').order('department_name')
      ]);

      setSpecializations(specsResult.data || []);
      setDepartments(deptsResult.data || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    const result = await onAddUser(formData);
    setResult(result);
    
    if (result.success) {
      setTimeout(() => {
        onClose();
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'patient',
          dateOfBirth: '',
          gender: '',
          address: '',
          specialization_id: '',
          department_id: '',
          license_number: '',
          qualification: '',
          years_experience: '',
          bio: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          insurance_provider: '',
          insurance_number: ''
        });
        setResult(null);
      }, 5000);
    }
    
    setLoading(false);
  };

  const showMedicalFields = ['doctor', 'nurse', 'pharmacist'].includes(formData.role);
  const showPatientFields = formData.role === 'patient';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {result && (
          <div className={`p-3 rounded mb-4 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success ? <CheckCircleIcon className="h-5 w-5 inline mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />}
            {result.success ? result.message : result.error}
            {result.tempPassword && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-sm">
                <strong>Temporary Password:</strong> {result.tempPassword}
                <br /><small className="text-yellow-800">Share this securely with the user for first login</small>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="receptionist">Receptionist</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          {/* Medical Staff Fields */}
          {showMedicalFields && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Professional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  <select
                    value={formData.specialization_id}
                    onChange={(e) => setFormData({...formData, specialization_id: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Specialization</option>
                    {specializations.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.specialization_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({...formData, years_experience: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., MBBS, BSc Nursing, PharmD"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio/Description</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Professional background and expertise..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Patient Fields */}
          {showPatientFields && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
                  <input
                    type="text"
                    value={formData.insurance_provider}
                    onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Number</label>
                  <input
                    type="text"
                    value={formData.insurance_number}
                    onChange={(e) => setFormData({...formData, insurance_number: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50 font-medium hover:bg-blue-700 transition duration-200"
            >
              {loading ? 'Creating Account...' : `Create ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} Account`}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-300 text-gray-700 p-3 rounded-lg font-medium hover:bg-gray-400 transition duration-200"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose, onUserAction }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">User Details</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <InfoRow label="Name" value={user.fullName} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Phone" value={user.phone} />
        <InfoRow label="Role" value={user.role} />
        <InfoRow label="Join Date" value={user.joinDate} />
        <InfoRow label="Status" value={user.status} />
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={() => onUserAction(user.id, 'reset_password')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Reset Password
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// Helper Component for Info Rows
const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b">
    <span className="text-gray-600 font-medium">{label}:</span>
    <span className="text-gray-900">{value || 'Not provided'}</span>
  </div>
);

export default UserManagement;