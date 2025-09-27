// src/components/dashboard/ReceptionistDashboard.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { 
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const ReceptionistDashboard = () => {
  const [user, setUser] = useState({
    name: 'Receptionist',
    email: '',
    role: 'receptionist',
    department: 'Front Desk'
  });
  const [stats, setStats] = useState({
    todaysAppointments: 0,
    waitingPatients: 0,
    newRegistrations: 0
  });
  const [todaysAppointments, setTodaysAppointments] = useState([]);
  const [waitingPatients, setWaitingPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigation = [
    { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Appointments', href: '/receptionist/receptionist-appointments', icon: CalendarIcon, current: false },
    { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
    // { name: 'Scheduling', href: '/receptionist/scheduling', icon: ClockIcon, current: false },
    { name: 'Medical Records', href: '/reception/medical-records1', icon: ClockIcon, current: false },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get current user info from auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (authUser) {
        // Fetch user details from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            first_name,
            last_name,
            email,
            roles:role_id(role_name)
          `)
          .eq('id', authUser.id)
          .single();

        if (!userError && userData) {
          setUser({
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email || authUser.email,
            role: userData.roles?.role_name || 'receptionist',
            department: 'Front Desk'
          });
        }
      }

      await Promise.all([
        fetchTodaysStats(),
        fetchTodaysAppointments(),
        fetchWaitingPatients()
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's appointments count
      const { count: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today);

      if (appointmentsError) throw appointmentsError;

      // Get waiting patients (appointments with pending status for today)
      const pendingStatusId = await getStatusId('pending');
      const { count: waitingCount, error: waitingError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', today)
        .eq('status_id', pendingStatusId);

      if (waitingError) throw waitingError;

      // Get new registrations for today
      const { count: registrationsCount, error: regError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (regError) throw regError;

      setStats({
        todaysAppointments: appointmentsCount || 0,
        waitingPatients: waitingCount || 0,
        newRegistrations: registrationsCount || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't throw error here to prevent breaking the entire dashboard
    }
  };

  const fetchTodaysAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          reason,
          patients:patient_id(
            users:users(
              first_name,
              last_name
            )
          ),
          doctors:doctor_id(
            users:users(
              first_name,
              last_name
            )
          ),
          appointment_statuses:status_id(
            status_code,
            status_name
          )
        `)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })
        .limit(10); // Increased limit to show more appointments

      if (error) throw error;

      const formattedAppointments = (data || []).map(apt => ({
        id: apt.id,
        patient: `${apt.patients?.users?.first_name || ''} ${apt.patients?.users?.last_name || ''}`.trim() || 'Unknown Patient',
        doctor: `Dr. ${apt.doctors?.users?.first_name || ''} ${apt.doctors?.users?.last_name || ''}`.trim() || 'Unknown Doctor',
        time: formatTime(apt.appointment_time),
        status: apt.appointment_statuses?.status_name || 'Pending',
        statusCode: apt.appointment_statuses?.status_code || 'pending',
        reason: apt.reason || 'Consultation'
      }));

      setTodaysAppointments(formattedAppointments);

    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Don't throw error here to prevent breaking the entire dashboard
    }
  };

  const fetchWaitingPatients = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const pendingStatusId = await getStatusId('pending');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          reason,
          created_at,
          patients:patient_id(
            users:users(
              first_name,
              last_name
            )
          )
        `)
        .eq('appointment_date', today)
        .eq('status_id', pendingStatusId)
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (error) throw error;

      const formattedPatients = (data || []).map(apt => {
        const checkInTime = new Date(apt.created_at);
        const now = new Date();
        const waitingMinutes = Math.floor((now - checkInTime) / (1000 * 60));
        
        return {
          id: apt.id,
          name: `${apt.patients?.users?.first_name || ''} ${apt.patients?.users?.last_name || ''}`.trim() || 'Unknown Patient',
          checkIn: formatTime(apt.appointment_time),
          waiting: `${waitingMinutes} min`,
          purpose: apt.reason || 'Consultation'
        };
      });

      setWaitingPatients(formattedPatients);

    } catch (error) {
      console.error('Error fetching waiting patients:', error);
      // Don't throw error here to prevent breaking the entire dashboard
    }
  };

  // Helper function to get status ID by code
  const getStatusId = async (statusCode) => {
    try {
      const { data, error } = await supabase
        .from('appointment_statuses')
        .select('id')
        .eq('status_code', statusCode)
        .single();

      if (error) throw error;
      return data?.id;
    } catch (error) {
      console.error(`Error getting status ID for ${statusCode}:`, error);
      return null;
    }
  };

  // Helper function to format time
  const formatTime = (timeString) => {
    if (!timeString) return 'Unknown Time';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      setError('');
      
      // Get the checked-in status ID
      const checkedInStatusId = await getStatusId('checked_in');
      if (!checkedInStatusId) {
        throw new Error('Could not find checked-in status');
      }

      const { error } = await supabase
        .from('appointments')
        .update({ status_id: checkedInStatusId })
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh the data
      await fetchDashboardData();
      
      // Show success message
      console.log('Patient checked in successfully');

    } catch (error) {
      console.error('Error checking in patient:', error);
      setError('Failed to check in patient. Please try again.');
    }
  };

  const handleNotifyDoctor = async (patientId) => {
    try {
      setError('');
      
      // In a real application, this would send a notification to the doctor
      console.log(`Notifying doctor about patient ${patientId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Doctor notified successfully');
      
      // You could add a toast notification here
      alert('Doctor has been notified about the waiting patient.');

    } catch (error) {
      console.error('Error notifying doctor:', error);
      setError('Failed to notify doctor. Please try again.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Error Display - Only show if there's an actual error that persists */}
      {error && !loading && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
          <button 
            onClick={() => setError('')}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Receptionist Dashboard</h1>
        <p className="text-gray-600">Patient coordination and appointment management</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {user.department}
          </span>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Quick Stats - Removed Calls Today */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today's Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.todaysAppointments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Waiting Patients</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.waitingPatients}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PlusIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">New Registrations</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.newRegistrations}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Appointments - Bigger card showing more appointments */}
        <div className="bg-white shadow rounded-lg lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Today's Appointments</h3>
            <span className="text-sm text-gray-500">
              {todaysAppointments.length} appointments today
            </span>
          </div>
          <div className="p-6">
            {todaysAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaysAppointments.map(appointment => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 text-lg">{appointment.patient}</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.statusCode === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : appointment.statusCode === 'checked_in'
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.statusCode === 'completed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Doctor:</span> {appointment.doctor}
                        </div>
                        <div>
                          <span className="font-medium">Time:</span> {appointment.time}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Reason:</span> {appointment.reason}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {appointment.statusCode !== 'checked_in' && appointment.statusCode !== 'completed' && (
                        <button 
                          onClick={() => handleCheckIn(appointment.id)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition duration-200"
                        >
                          Check In
                        </button>
                      )}
                      <button 
                        onClick={() => window.location.href = `/receptionist/appointments?edit=${appointment.id}`}
                        className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium transition duration-200"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Waiting Patients */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Waiting Patients</h3>
            <span className="text-sm text-gray-500">
              {waitingPatients.length} waiting
            </span>
          </div>
          <div className="p-6">
            {waitingPatients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No patients currently waiting</p>
              </div>
            ) : (
              <div className="space-y-4">
                {waitingPatients.map(patient => (
                  <div key={patient.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{patient.name}</p>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                        Waiting: {patient.waiting}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">Purpose:</span> {patient.purpose}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">Checked in:</span> {patient.checkIn}
                    </p>
                    <button 
                      onClick={() => handleNotifyDoctor(patient.id)}
                      className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm font-medium transition duration-200"
                    >
                      Notify Doctor
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => window.location.href = '/receptionist/patient-registration'}
            className="bg-white border border-blue-200 text-blue-700 p-4 rounded-lg hover:bg-blue-50 transition duration-200 flex flex-col items-center"
          >
            <PlusIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">New Patient</span>
          </button>
          <button 
            onClick={() => window.location.href = '/receptionist/scheduling'}
            className="bg-white border border-green-200 text-green-700 p-4 rounded-lg hover:bg-green-50 transition duration-200 flex flex-col items-center"
          >
            <CalendarIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Schedule</span>
          </button>
          <button 
            onClick={() => window.location.href = '/receptionist/receptionist-appointments'}
            className="bg-white border border-purple-200 text-purple-700 p-4 rounded-lg hover:bg-purple-50 transition duration-200 flex flex-col items-center"
          >
            <ClockIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Appointments</span>
          </button>
          <button 
            onClick={() => window.location.href = '/reception/medical-records1'}
            className="bg-white border border-orange-200 text-orange-700 p-4 rounded-lg hover:bg-orange-50 transition duration-200 flex flex-col items-center"
          >
            <CheckCircleIcon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Records</span>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReceptionistDashboard;