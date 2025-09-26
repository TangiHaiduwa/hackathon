import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { 
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  ServerIcon,
  BellIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activePatients: 0,
    medicalStaff: 0,
    todayAppointments: 0,
    pendingDiagnoses: 0,
    systemUptime: '99.9%'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/admin-dashboard', icon: HomeIcon },
    { name: 'User Management', href: '/user-management', icon: UserGroupIcon },
    { name: 'Analytics & Reporting', href: '/analytics', icon: ChartBarIcon },
    { name: 'Medical Records', href: '/medical-records-admin', icon: ShieldCheckIcon },
    { name: 'Pharmacy Management', href: '/pharmacy-admin', icon: BuildingLibraryIcon },
    { name: 'Appointment System', href: '/appointments-admin', icon: CalendarIcon },
    { name: 'Security & Audit', href: '/security-audit', icon: ShieldCheckIcon },
    { name: 'System Configuration', href: '/system-settings', icon: CogIcon },
  ];

  useEffect(() => {
    if (authUser) {
      fetchAdminData();
      const unsubscribe = fetchRealTimeData();
      return () => unsubscribe();
    }
  }, [authUser]);

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

    getStatusId: async (table, statusCode) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .eq('status_code', statusCode)
          .single();
        
        if (error) return null;
        return data?.id;
      } catch (error) {
        console.error(`Error getting status ID for ${statusCode}:`, error);
        return null;
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

  // Password management functions - CORRECTLY PLACED
  const handleResetPassword = async (userId, userEmail) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not configured.');
      }

      // Generate new temporary password
      const newTempPassword = generateTempPassword();

      // Reset password using admin API
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newTempPassword }
      );

      if (error) {
        throw new Error(`Password reset failed: ${error.message}`);
      }

      // Log the activity
      await logActivity('password_reset', `Reset password for user: ${userEmail}`);

      return {
        success: true,
        message: 'Password reset successfully!',
        newPassword: newTempPassword,
        userEmail: userEmail
      };

    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSendPasswordReset = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(`Password reset email failed: ${error.message}`);
      }

      await logActivity('password_reset_email', `Sent password reset email to: ${email}`);

      return {
        success: true,
        message: 'Password reset email sent successfully!'
      };

    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  };

  const handleManageUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUser(null);
    setShowUserModal(false);
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      // Fetch admin user details
      const { data: userData } = await supabase
        .from('users')
        .select(`
          *,
          roles (role_name)
        `)
        .eq('id', authUser.id)
        .single();

      setUser({
        ...userData,
        department: 'IT & System Management',
        role: userData.roles?.role_name || 'admin'
      });

      // Fetch all data in parallel
      await Promise.all([
        fetchSystemStatistics(),
        fetchRecentUsers(),
        fetchSystemAlerts(),
        fetchRecentActivities(),
        fetchDepartments(),
        fetchSpecializations()
      ]);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatistics = async () => {
    try {
      // Get role IDs first
      const patientRoleId = await databaseHelpers.getRoleId('patient');
      
      // Execute all counts in parallel
      const [
        totalUsersResult,
        activePatientsResult,
        medicalStaffResult,
        todayAppointmentsResult,
        pendingDiagnosesResult
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role_id', patientRoleId),
        supabase.from('medical_staff').select('*', { count: 'exact', head: true }),
        supabase.from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', new Date().toISOString().split('T')[0]),
        supabase.from('medical_diagnoses')
          .select('*', { count: 'exact', head: true })
          .eq('status_id', await databaseHelpers.getStatusId('diagnosis_statuses', 'pending'))
      ]);

      setSystemStats({
        totalUsers: totalUsersResult.count || 0,
        activePatients: activePatientsResult.count || 0,
        medicalStaff: medicalStaffResult.count || 0,
        todayAppointments: todayAppointmentsResult.count || 0,
        pendingDiagnoses: pendingDiagnosesResult.count || 0,
        systemUptime: '99.9%'
      });

    } catch (error) {
      console.error('Error fetching system statistics:', error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at,
          role_id,
          roles (role_name),
          phone_number,
          date_of_birth
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (users) {
        const formattedUsers = users.map(user => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.roles?.role_name || 'user',
          phone: user.phone_number,
          joinDate: new Date(user.created_at).toLocaleDateString(),
          status: 'Active'
        }));

        setRecentUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('department_name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const { data, error } = await supabase
        .from('specializations')
        .select('*')
        .order('specialization_name');
      
      if (error) throw error;
      setSpecializations(data || []);
    } catch (error) {
      console.error('Error fetching specializations:', error);
    }
  };

  const fetchSystemAlerts = async () => {
    try {
      // Check for low inventory
      const { data: lowInventory } = await supabase
        .from('drug_inventory')
        .select('drug_id, drugs(drug_name), quantity')
        .lt('quantity', 10)
        .limit(5);

      const alerts = [];

      // Low inventory alerts
      if (lowInventory && lowInventory.length > 0) {
        alerts.push({
          id: 1,
          type: 'warning',
          message: `${lowInventory.length} drugs running low on inventory`,
          time: 'Recently',
          details: lowInventory.map(item => item.drugs.drug_name).join(', ')
        });
      }

      // System health alert
      alerts.push({
        id: 2,
        type: 'success',
        message: 'All core systems operational',
        time: '1 hour ago'
      });

      // Pending appointments alert
      const today = new Date().toISOString().split('T')[0];
      const { count: pendingAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today);

      if (pendingAppointments > 0) {
        alerts.push({
          id: 3,
          type: 'info',
          message: `${pendingAppointments} appointments scheduled for today`,
          time: 'Today'
        });
      }

      setSystemAlerts(alerts);
    } catch (error) {
      console.error('Error fetching system alerts:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data: activities } = await supabase
        .from('activity_log')
        .select(`
          id,
          created_at,
          activity_type_id,
          user_id,
          users (first_name, last_name),
          activity_types (activity_name),
          new_values
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activities) {
        const formattedActivities = activities.map(activity => ({
          id: activity.id,
          action: activity.activity_types?.activity_name || 'System Activity',
          target: activity.new_values?.action || 'System',
          time: formatTimeAgo(activity.created_at),
          user: activity.users ? `${activity.users.first_name} ${activity.users.last_name}` : 'System'
        }));

        setRecentActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchRealTimeData = () => {
    const subscription = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        (payload) => {
          console.log('Real-time user update:', payload);
          fetchRecentUsers();
          fetchSystemStatistics();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('Real-time appointment update:', payload);
          fetchSystemStatistics();
          fetchSystemAlerts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  // Enhanced staff creation function
  const handleAddStaff = async (staffData) => {
    try {
    // Check if admin client is available
    if (!supabaseAdmin) {
      throw new Error('Admin client not configured. Check your VITE_SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    // Generate secure temporary password
    const tempPassword = generateTempPassword();
      
      // Create auth user using admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: staffData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: staffData.first_name,
        last_name: staffData.last_name,
        user_type: staffData.role,
        phone_number: staffData.phone,
        temporary_password: true
      }
    });

      if (authError) {
        throw new Error(`User creation failed: ${authError.message}`);
      }

      // Get role ID
      const roleId = await databaseHelpers.getRoleId(staffData.role);
      
      // Get gender ID if provided
      const genderId = staffData.gender ? await databaseHelpers.getGenderId(staffData.gender) : null;

      // Create user record
      const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: staffData.email,
        first_name: staffData.first_name,
        last_name: staffData.last_name,
        role_id: roleId,
        phone_number: staffData.phone,
        date_of_birth: staffData.date_of_birth,
        gender_id: genderId,
        address: staffData.address
      });

      if (userError) {
      // Rollback: delete auth user if user creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`User record creation failed: ${userError.message}`);
    }

      // Create medical staff record for medical roles
      if (['doctor', 'nurse', 'pharmacist'].includes(staffData.role)) {
      const { error: staffError } = await supabase
        .from('medical_staff')
        .insert({
          id: authData.user.id,
          specialization_id: staffData.specialization_id || null,
          department_id: staffData.department_id || null,
          license_number: staffData.license_number,
          qualification: staffData.qualification,
          years_experience: staffData.years_experience ? parseInt(staffData.years_experience) : null,
          bio: staffData.bio
        });

        if (staffError) {
        // Rollback: delete both records
        await supabase.from('users').delete().eq('id', authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Medical staff record creation failed: ${staffError.message}`);
      }
    }

      // Create patient record if role is patient
      if (staffData.role === 'patient') {
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: authData.user.id,
          emergency_contact_name: staffData.emergency_contact_name,
          emergency_contact_phone: staffData.emergency_contact_phone,
          insurance_provider: staffData.insurance_provider,
          insurance_number: staffData.insurance_number
        });

      if (patientError) {
        await supabase.from('users').delete().eq('id', authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Patient record creation failed: ${patientError.message}`);
      }
    }

      // Log the activity
      await logActivity('user_created', `Created ${staffData.role} account for ${staffData.first_name} ${staffData.last_name}`);

    // Refresh data
    fetchRecentUsers();
    fetchSystemStatistics();

      return { 
      success: true, 
      message: `${staffData.role.charAt(0).toUpperCase() + staffData.role.slice(1)} account created successfully!`,
      tempPassword: tempPassword
    };

    } catch (error) {
    console.error('Error adding staff:', error);
    return { success: false, error: error.message };
  }
};

  const handleUserAction = async (userId, action) => {
    try {
      if (!supabaseAdmin) {
      throw new Error('Admin client not configured.');
    }
      switch (action) {
      case 'deactivate':
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { active: false }
        });
        break;
        
        case 'activate':
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { active: true }
        });
        break;
        
        case 'delete':
        await supabaseAdmin.auth.admin.deleteUser(userId);
        break;
    }

      fetchRecentUsers();
    return { success: true };
  } catch (error) {
    console.error('Error performing user action:', error);
    return { success: false, error: error.message };
  }
};

  // Department and Specialization Management
  const handleAddDepartment = async (departmentData) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([
          {
            department_name: departmentData.name,
            description: departmentData.description
          }
        ])
        .select();

      if (error) throw error;

      await logActivity('department_created', `Created department: ${departmentData.name}`);
      fetchDepartments();

      return { success: true, message: 'Department created successfully!' };
    } catch (error) {
      console.error('Error adding department:', error);
      return { success: false, error: error.message };
    }
  };

  const handleAddSpecialization = async (specializationData) => {
    try {
      const { data, error } = await supabase
        .from('specializations')
        .insert([
          {
            specialization_name: specializationData.name,
            category: specializationData.category
          }
        ])
        .select();

      if (error) throw error;

      await logActivity('specialization_created', `Created specialization: ${specializationData.name}`);
      fetchSpecializations();

      return { success: true, message: 'Specialization created successfully!' };
    } catch (error) {
      console.error('Error adding specialization:', error);
      return { success: false, error: error.message };
    }
  };

  const handleDeleteDepartment = async (departmentId) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

      if (error) throw error;

      await logActivity('department_deleted', `Deleted department ID: ${departmentId}`);
      fetchDepartments();

      return { success: true, message: 'Department deleted successfully!' };
    } catch (error) {
      console.error('Error deleting department:', error);
      return { success: false, error: error.message };
    }
  };

  const handleDeleteSpecialization = async (specializationId) => {
    try {
      const { error } = await supabase
        .from('specializations')
        .delete()
        .eq('id', specializationId);

      if (error) throw error;

      await logActivity('specialization_deleted', `Deleted specialization ID: ${specializationId}`);
      fetchSpecializations();

      return { success: true, message: 'Specialization deleted successfully!' };
    } catch (error) {
      console.error('Error deleting specialization:', error);
      return { success: false, error: error.message };
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

  const logActivity = async (activityCode, description) => {
    try {
      const { data: activityType } = await supabase
        .from('activity_types')
        .select('id')
        .eq('activity_code', activityCode)
        .single();

      if (activityType) {
        await supabase
          .from('activity_log')
          .insert({
            user_id: authUser.id,
            activity_type_id: activityType.id,
            table_name: 'users',
            new_values: { action: description },
            ip_address: '127.0.0.1',
            user_agent: navigator.userAgent
          });
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredUsers = recentUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading admin dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">System Administration & Management</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {user?.department}
              </span>
              <span className="text-sm text-gray-500">Full System Access</span>
            </div>
          </div>
          <div className="flex space-x-3">
            <AddStaffModal onAddStaff={handleAddStaff} />
            <button 
              onClick={() => setActiveTab('system')}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition duration-200 flex items-center"
            >
              <CogIcon className="h-4 w-4 mr-2" />
              System Settings
            </button>
          </div>
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <StatCard
          icon={UserGroupIcon}
          label="Total Users"
          value={systemStats.totalUsers.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={UserGroupIcon}
          label="Active Patients"
          value={systemStats.activePatients.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={ShieldCheckIcon}
          label="Medical Staff"
          value={systemStats.medicalStaff}
          color="orange"
        />
        <StatCard
          icon={CalendarIcon}
          label="Today's Appointments"
          value={systemStats.todayAppointments}
          color="purple"
        />
        <StatCard
          icon={DocumentChartBarIcon}
          label="Pending Diagnoses"
          value={systemStats.pendingDiagnoses}
          color="red"
        />
        <StatCard
          icon={ServerIcon}
          label="System Uptime"
          value={systemStats.systemUptime}
          color="gray"
        />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'users', 'reference-data', 'analytics', 'system'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' ? 'Dashboard Overview' : 
               tab === 'users' ? 'User Management' :
               tab === 'reference-data' ? 'Reference Data' :
               tab === 'analytics' ? 'System Analytics' : 'System Monitoring'}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* User Management Quick Actions */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AddStaffModal onAddStaff={handleAddStaff} role="doctor" />
                    <AddStaffModal onAddStaff={handleAddStaff} role="nurse" />
                    <AddStaffModal onAddStaff={handleAddStaff} role="pharmacist" />
                    <AddStaffModal onAddStaff={handleAddStaff} role="receptionist" />
                  </div>
                </div>
              </div>

              {/* Recent System Activities */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent System Activities</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{activity.action}</h4>
                            <span className="text-xs text-gray-500">{activity.time}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{activity.target}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                            By: {activity.user}
                          </span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 ml-4">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <UserManagementTable 
              users={filteredUsers}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onUserAction={handleUserAction}
              onManageUser={handleManageUser}
            />
          )}

          {activeTab === 'reference-data' && (
            <ReferenceDataManagement 
              departments={departments}
              specializations={specializations}
              onAddDepartment={handleAddDepartment}
              onAddSpecialization={handleAddSpecialization}
              onDeleteDepartment={handleDeleteDepartment}
              onDeleteSpecialization={handleDeleteSpecialization}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Analytics</h3>
              <div className="text-center py-12 text-gray-500">
                Analytics dashboard coming soon...
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Monitoring</h3>
              <div className="text-center py-12 text-gray-500">
                System monitoring dashboard coming soon...
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <SystemAlerts alerts={systemAlerts} />
          <SystemHealthStats />
          <RecentRegistrations users={recentUsers.slice(0, 3)} />
        </div>
      </div>

      {showUserModal && selectedUser && (
        <UserManagementModal
          user={selectedUser}
          onClose={handleCloseUserModal}
          onResetPassword={handleResetPassword}
          onSendResetEmail={handleSendPasswordReset}
        />
      )}
    </DashboardLayout>
  );
};

// Component: User Management Modal
const UserManagementModal = ({ user, onClose, onResetPassword, onSendResetEmail }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const handleResetPassword = async () => {
    setActionLoading(true);
    setActionResult(null);
    
    const result = await onResetPassword(user.id, user.email);
    setActionResult(result);
    setActionLoading(false);
  };

  const handleSendResetEmail = async () => {
    setActionLoading(true);
    setActionResult(null);
    
    const result = await onSendResetEmail(user.email);
    setActionResult(result);
    setActionLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">User Management: {user.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Action Results */}
        {actionResult && (
          <div className={`p-3 rounded mb-4 ${actionResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {actionResult.success ? 
              <CheckCircleIcon className="h-5 w-5 inline mr-2" /> : 
              <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
            }
            {actionResult.success ? actionResult.message : actionResult.error}
            
            {/* Show new password if reset was successful */}
            {actionResult.success && actionResult.newPassword && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">New Temporary Password</h4>
                <div className="flex items-center justify-between">
                  <span className="font-mono bg-white px-3 py-1 rounded border">{actionResult.newPassword}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(actionResult.newPassword)}
                    className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  Share this password securely with the user. They should change it on first login.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['details', 'security'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'details' ? 'User Details' : 'Security Settings'}
              </button>
            ))}
          </nav>
        </div>

        {/* User Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p className="text-gray-900">{user.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {user.role}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{user.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                <p className="text-gray-900">{user.joinDate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <h4 className="font-medium text-yellow-800">Password Security</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    For security reasons, you cannot view existing passwords. You can reset passwords to new temporary ones.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Reset Password</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Generate a new temporary password for this user. They will need to set a new password on next login.
                </p>
                <button
                  onClick={handleResetPassword}
                  disabled={actionLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Resetting...' : 'Reset to Temporary Password'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Send Password Reset Email</h4>
                <p className="text-gray-600 text-sm mb-3">
                  Send a password reset link to the user's email address. They can set their own new password.
                </p>
                <button
                  onClick={handleSendResetEmail}
                  disabled={actionLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Component: Stat Card
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

// Component: Add Staff Modal
const AddStaffModal = ({ onAddStaff, role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [specializations, setSpecializations] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    
    // Role-specific
    role: role || 'doctor',
    
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

  const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    // You can add a toast notification here if you have a toast system
    alert('Copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    const result = await onAddStaff(formData);
    setResult(result);
    
    if (result.success) {
      setFormData({
      first_name: '', last_name: '', email: '', phone: '', role: role || 'doctor',
      specialization_id: '', department_id: '', license_number: '',
      qualification: '', years_experience: '', bio: '',
      date_of_birth: '', gender: '', address: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      insurance_provider: '', insurance_number: ''
    });
  }
  
  setLoading(false);
};

  const showMedicalFields = ['doctor', 'nurse', 'pharmacist'].includes(formData.role);
  const showPatientFields = formData.role === 'patient';

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`p-4 rounded-lg hover:bg-${getRoleColor(role)}-100 transition duration-200 flex flex-col items-center border ${getRoleBorderColor(role)} ${getRoleTextColor(role)}`}
      >
        <UserPlusIcon className="h-6 w-6 mb-2" />
        <span className="text-sm font-medium">Add {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {result && (
  <div className={`p-4 rounded mb-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="flex items-center">
          {result.success ? 
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" /> : 
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
          }
          <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
            {result.success ? result.message : result.error}
          </span>
        </div>
        
        {result.success && (
  <div className="mt-3 space-y-2">
    <div className="flex items-center justify-between">
      <div>
        <span className="font-semibold text-gray-700">Email:</span>
        <span className="ml-2 bg-white border px-2 py-1 rounded font-mono text-sm">{formData.email}</span>
      </div>
      <button
        onClick={() => copyToClipboard(formData.email)}
        className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
        title="Copy email"
      >
        Copy
      </button>
    </div>
    
    {result.tempPassword && (
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-700">Temporary Password:</span>
          <span className="ml-2 bg-white border px-2 py-1 rounded font-mono text-sm">{result.tempPassword}</span>
        </div>
        <button
          onClick={() => copyToClipboard(result.tempPassword)}
          className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
          title="Copy password"
        >
          Copy
        </button>
      </div>
    )}
  </div>
)}
      </div>
      
      {/* Close button for the result message only */}
      <button
        onClick={() => setResult(null)}
        className="ml-4 text-gray-500 hover:text-gray-700"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
    
    {/* Success action buttons */}
    {result.success && (
      <div className="flex space-x-3 mt-4">
        <button
          onClick={() => {
            setResult(null);
            setIsOpen(false);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition duration-200 text-sm"
        >
          Close & Finish
        </button>
        <button
          onClick={() => {
            setResult(null);
            // Keep modal open to add another user
            setFormData({
              first_name: '', last_name: '', email: '', phone: '', role: role || 'doctor',
              specialization_id: '', department_id: '', license_number: '',
              qualification: '', years_experience: '', bio: '',
              date_of_birth: '', gender: '', address: '',
              emergency_contact_name: '', emergency_contact_phone: '',
              insurance_provider: '', insurance_number: ''
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition duration-200 text-sm"
        >
          Add Another User
        </button>
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
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="patient">Patient</option>
                </select>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full p-2 border rounded"
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
                  className="w-full p-2 border rounded"
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
                        className="w-full p-2 border rounded"
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
                        className="w-full p-2 border rounded"
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
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                      <input
                        type="number"
                        value={formData.years_experience}
                        onChange={(e) => setFormData({...formData, years_experience: e.target.value})}
                        className="w-full p-2 border rounded"
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
                        className="w-full p-2 border rounded"
                        placeholder="e.g., MBBS, BSc Nursing, PharmD"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bio/Description</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full p-2 border rounded"
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
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
                      <input
                        type="text"
                        value={formData.insurance_provider}
                        onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Number</label>
                      <input
                        type="text"
                        value={formData.insurance_number}
                        onChange={(e) => setFormData({...formData, insurance_number: e.target.value})}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
  {!result?.success ? (
    <>
      <button 
        type="submit" 
        disabled={loading}
        className="flex-1 bg-blue-600 text-white p-3 rounded disabled:opacity-50 font-medium"
      >
        {loading ? 'Creating Account...' : `Create ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} Account`}
      </button>
      <button 
        type="button"
        onClick={() => setIsOpen(false)}
        className="px-6 bg-gray-300 text-gray-700 p-3 rounded font-medium"
        disabled={loading}
      >
        Cancel
      </button>
    </>
  ) : (
    // Show only close button when success is shown
    <button 
      type="button"
      onClick={() => {
        setResult(null);
        setIsOpen(false);
      }}
      className="flex-1 bg-green-600 text-white p-3 rounded font-medium"
    >
      Finish
    </button>
  )}
</div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Component: User Management Table
const UserManagementTable = ({ users, searchTerm, onSearchChange, onUserAction, onManageUser }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
    <div className="p-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.joinDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button 
                    onClick={() => onManageUser(user)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Manage User"
                  >
                    <CogIcon className="h-4 w-4 inline" />
                  </button>
                  <button className="text-green-600 hover:text-green-900">
                    <PencilIcon className="h-4 w-4 inline" />
                  </button>
                  <button 
                    onClick={() => onUserAction(user.id, 'deactivate')}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  </div>
);

// Component: Reference Data Management
const ReferenceDataManagement = ({ 
  departments, 
  specializations, 
  onAddDepartment, 
  onAddSpecialization, 
  onDeleteDepartment, 
  onDeleteSpecialization 
}) => {
  const [activeSection, setActiveSection] = useState('departments');

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['departments', 'specializations'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeSection === section
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {section === 'departments' ? 'Departments' : 'Specializations'}
            </button>
          ))}
        </nav>
      </div>

      {/* Departments Section */}
      {activeSection === 'departments' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Departments Management</h3>
            <AddDepartmentModal onAddDepartment={onAddDepartment} />
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {departments.map((dept) => (
                    <tr key={dept.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{dept.department_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{dept.description || 'No description'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => onDeleteDepartment(dept.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {departments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No departments found. Add your first department.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Specializations Section */}
      {activeSection === 'specializations' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Specializations Management</h3>
            <AddSpecializationModal onAddSpecialization={onAddSpecialization} />
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {specializations.map((spec) => (
                    <tr key={spec.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{spec.specialization_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{spec.category || 'No category'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => onDeleteSpecialization(spec.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {specializations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No specializations found. Add your first specialization.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component: Add Department Modal
const AddDepartmentModal = ({ onAddDepartment }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    const result = await onAddDepartment(formData);
    setResult(result);
    
    if (result.success) {
      setTimeout(() => {
        setIsOpen(false);
        setFormData({ name: '', description: '' });
        setResult(null);
      }, 3000);
    }
    
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Department
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Department</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {result && (
              <div className={`p-3 rounded mb-4 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.success ? <CheckCircleIcon className="h-5 w-5 inline mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />}
                {result.success ? result.message : result.error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white p-3 rounded disabled:opacity-50 font-medium"
                >
                  {loading ? 'Adding...' : 'Add Department'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 bg-gray-300 text-gray-700 p-3 rounded font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Component: Add Specialization Modal
const AddSpecializationModal = ({ onAddSpecialization }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    const result = await onAddSpecialization(formData);
    setResult(result);
    
    if (result.success) {
      setTimeout(() => {
        setIsOpen(false);
        setFormData({ name: '', category: '' });
        setResult(null);
      }, 3000);
    }
    
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Specialization
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Specialization</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {result && (
              <div className={`p-3 rounded mb-4 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.success ? <CheckCircleIcon className="h-5 w-5 inline mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />}
                {result.success ? result.message : result.error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., Surgery, Internal Medicine"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white p-3 rounded disabled:opacity-50 font-medium"
                >
                  {loading ? 'Adding...' : 'Add Specialization'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 bg-gray-300 text-gray-700 p-3 rounded font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Component: System Alerts
const SystemAlerts = ({ alerts }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50">
      <h3 className="text-lg font-medium text-yellow-900 flex items-center">
        <BellIcon className="h-5 w-5 mr-2" />
        System Alerts
      </h3>
    </div>
    <div className="p-6">
      {alerts.length > 0 ? (
        <ul className="space-y-4">
          {alerts.map((alert) => (
            <li key={alert.id} className={`p-3 border rounded-lg ${
              alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              alert.type === 'info' ? 'border-blue-200 bg-blue-50' :
              'border-green-200 bg-green-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-medium ${
                    alert.type === 'warning' ? 'text-yellow-800' :
                    alert.type === 'info' ? 'text-blue-800' :
                    'text-green-800'
                  }`}>
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{alert.time}</p>
                  {alert.details && (
                    <p className="text-xs text-gray-500 mt-1">{alert.details}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-green-600 text-center py-4">No system alerts</p>
      )}
    </div>
  </div>
);

// Component: System Health Stats
const SystemHealthStats = () => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">System Health</h3>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Database Status</span>
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          Online
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">API Response Time</span>
        <span className="font-medium">128ms</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Active Sessions</span>
        <span className="font-medium">47</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Storage Usage</span>
        <span className="font-medium">68%</span>
      </div>
    </div>
  </div>
);

// Component: Recent Registrations
const RecentRegistrations = ({ users }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-6 py-4 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">Recent Registrations</h3>
    </div>
    <div className="p-6">
      {users.length > 0 ? (
        users.map((user) => (
          <div key={user.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <span className={`text-xs ${
              user.status === 'Active' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {user.status}
            </span>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-4">No recent registrations</p>
      )}
    </div>
  </div>
);

// Helper functions for styling
const getRoleColor = (role) => {
  switch (role) {
    case 'doctor': return 'blue';
    case 'nurse': return 'green';
    case 'pharmacist': return 'orange';
    default: return 'purple';
  }
};

const getRoleBorderColor = (role) => {
  const color = getRoleColor(role);
  return `border-${color}-200`;
};

const getRoleTextColor = (role) => {
  const color = getRoleColor(role);
  return `text-${color}-700`;
};

export default AdminDashboard;