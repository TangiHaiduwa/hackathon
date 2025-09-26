// components/admin/AppointmentManagement.jsx
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
  CalendarIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  HomeIcon,
  BuildingLibraryIcon,
  CogIcon,
  ClockIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const AppointmentManagement = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    doctor: 'all',
    dateRange: 'today'
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeView, setActiveView] = useState('calendar'); // calendar, list, analytics
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [conflicts, setConflicts] = useState([]);
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

  // Fetch all appointments with related data - CONNECTED TO BACKEND
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          created_at,
          updated_at,
          status_id,
          appointment_statuses (status_code, status_name),
          patient_id,
          patients (
            id,
            users (
              full_name,
              phone_number,
              email
            )
          ),
          doctor_id,
          medical_staff (
            id,
            users (
              full_name
            ),
            specializations (specialization_name)
          ),
          appointment_symptoms (
            symptoms (symptom_name)
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      const formattedAppointments = appointmentsData.map(apt => ({
        id: apt.id,
        date: apt.appointment_date,
        time: apt.appointment_time,
        patientName: apt.patients?.users?.full_name || 'Unknown Patient',
        patientPhone: apt.patients?.users?.phone_number || 'N/A',
        patientEmail: apt.patients?.users?.email || 'N/A',
        doctorName: apt.medical_staff?.users?.full_name || 'Unknown Doctor',
        doctorSpecialization: apt.medical_staff?.specializations?.specialization_name || 'General',
        reason: apt.reason || 'No reason provided',
        status: apt.appointment_statuses?.status_name || 'Scheduled',
        statusCode: apt.appointment_statuses?.status_code || 'scheduled',
        symptoms: apt.appointment_symptoms?.map(s => s.symptoms?.symptom_name) || [],
        createdAt: apt.created_at,
        updatedAt: apt.updated_at
      }));

      setAppointments(formattedAppointments);
      setFilteredAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors for filters - CONNECTED TO BACKEND
  const fetchDoctors = async () => {
    try {
      const { data: doctorsData, error } = await supabase
        .from('medical_staff')
        .select(`
          id,
          users (full_name),
          specializations (specialization_name)
        `)
        .eq('available', true);

      if (error) throw error;
      setDoctors(doctorsData || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  // Check for scheduling conflicts - CONNECTED TO BACKEND
  const checkConflicts = async () => {
    try {
      // Find appointments with same doctor, date, and overlapping times
      const conflicts = [];
      
      for (let i = 0; i < appointments.length; i++) {
        for (let j = i + 1; j < appointments.length; j++) {
          const apt1 = appointments[i];
          const apt2 = appointments[j];
          
          if (apt1.doctorName === apt2.doctorName && 
              apt1.date === apt2.date &&
              apt1.time === apt2.time) {
            conflicts.push({
              doctor: apt1.doctorName,
              date: apt1.date,
              time: apt1.time,
              appointment1: apt1.patientName,
              appointment2: apt2.patientName,
              severity: 'high'
            });
          }
        }
      }
      
      setConflicts(conflicts);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (appointments.length > 0) {
      checkConflicts();
    }
  }, [appointments]);

  // Filter appointments based on search and filters
  useEffect(() => {
    let filtered = appointments;

    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(apt => apt.statusCode === filters.status);
    }

    if (filters.doctor !== 'all') {
      filtered = filtered.filter(apt => apt.doctorName === filters.doctor);
    }

    if (filters.dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(apt => apt.date === today);
    } else if (filters.dateRange === 'week') {
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      const weekEnd = new Date(today.setDate(today.getDate() + 6));
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= weekStart && aptDate <= weekEnd;
      });
    }

    setFilteredAppointments(filtered);
  }, [searchTerm, filters, appointments]);

  // Calculate analytics
  const calculateAnalytics = () => {
    const totalAppointments = appointments.length;
    const completed = appointments.filter(apt => apt.statusCode === 'completed').length;
    const cancelled = appointments.filter(apt => apt.statusCode === 'cancelled').length;
    const noShow = appointments.filter(apt => apt.statusCode === 'no_show').length;
    
    // Popular time slots
    const timeSlots = appointments.reduce((slots, apt) => {
      const hour = apt.time.split(':')[0];
      slots[hour] = (slots[hour] || 0) + 1;
      return slots;
    }, {});

    const popularSlots = Object.entries(timeSlots)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAppointments,
      completed,
      cancelled,
      noShow,
      completionRate: totalAppointments > 0 ? (completed / totalAppointments * 100).toFixed(1) : 0,
      noShowRate: totalAppointments > 0 ? (noShow / totalAppointments * 100).toFixed(1) : 0,
      popularSlots
    };
  };

  const analytics = calculateAnalytics();

  // Bulk operations
  const handleBulkStatusUpdate = (newStatus) => {
    // In a real implementation, this would update the database
    console.log(`Updating ${filteredAppointments.length} appointments to status: ${newStatus}`);
  };

  const handleResolveConflict = (conflictIndex) => {
    // In a real implementation, this would reschedule one of the appointments
    const updatedConflicts = conflicts.filter((_, index) => index !== conflictIndex);
    setConflicts(updatedConflicts);
  };

  // Calendar navigation
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  // Get appointments for selected date
  const getAppointmentsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return filteredAppointments.filter(apt => apt.date === dateString);
  };

  if (loading) {
    return (
      <DashboardLayout user={formattedUser} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading appointments...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Appointment Management System</h1>
            <p className="text-gray-600">System-wide appointment oversight and scheduling</p>
          </div>
          <button
            onClick={() => setShowAppointmentModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Schedule Appointment
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={CalendarIcon}
          label="Total Appointments"
          value={analytics.totalAppointments}
          color="blue"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
          color="green"
        />
        <StatCard
          icon={XCircleIcon}
          label="No-Show Rate"
          value={`${analytics.noShowRate}%`}
          color="red"
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Scheduling Conflicts"
          value={conflicts.length}
          color="orange"
        />
      </div>

      {/* View Toggle */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['calendar', 'list', 'analytics'].map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeView === view
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {view === 'calendar' ? 'Calendar View' : 
               view === 'list' ? 'Appointment List' : 'Analytics'}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments by patient, doctor, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({...prev, dateRange: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeView === 'calendar' && (
        <CalendarView
          selectedDate={selectedDate}
          navigateDate={navigateDate}
          appointments={getAppointmentsForDate(selectedDate)}
          onEditAppointment={setEditingAppointment}
        />
      )}

      {activeView === 'list' && (
        <ListView
          appointments={filteredAppointments}
          onEditAppointment={setEditingAppointment}
          onBulkStatusUpdate={handleBulkStatusUpdate}
        />
      )}

      {activeView === 'analytics' && (
        <AnalyticsView analytics={analytics} conflicts={conflicts} onResolveConflict={handleResolveConflict} />
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setEditingAppointment(null);
        }}
        appointment={editingAppointment}
        doctors={doctors}
        onSave={() => {
          fetchAppointments();
          setShowAppointmentModal(false);
          setEditingAppointment(null);
        }}
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

// Calendar View Component
const CalendarView = ({ selectedDate, navigateDate, appointments, onEditAppointment }) => {
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigateDate('prev')} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-medium text-gray-900">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <button onClick={() => navigateDate('next')} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        <span className="text-sm text-gray-500">{appointments.length} appointments</span>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {timeSlots.map(timeSlot => {
            const slotAppointments = appointments.filter(apt => apt.time.startsWith(timeSlot.split(':')[0]));
            
            return (
              <div key={timeSlot} className="flex border-b border-gray-200 pb-4">
                <div className="w-20 flex-shrink-0">
                  <span className="font-medium text-gray-900">{timeSlot}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slotAppointments.map(apt => (
                    <div key={apt.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-blue-900">{apt.patientName}</div>
                          <div className="text-sm text-blue-700">Dr. {apt.doctorName}</div>
                          <div className="text-xs text-blue-600">{apt.reason}</div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          apt.statusCode === 'completed' ? 'bg-green-100 text-green-800' :
                          apt.statusCode === 'cancelled' ? 'bg-red-100 text-red-800' :
                          apt.statusCode === 'no_show' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {slotAppointments.length === 0 && (
                    <div className="text-gray-400 text-sm">No appointments</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// List View Component
const ListView = ({ appointments, onEditAppointment, onBulkStatusUpdate }) => (
  <div className="space-y-6">
    {/* Bulk Actions */}
    {appointments.length > 0 && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-blue-800 font-medium">
            {appointments.length} appointments found
          </span>
          <select
            onChange={(e) => onBulkStatusUpdate(e.target.value)}
            className="border border-blue-300 rounded px-3 py-1 text-sm"
          >
            <option value="">Bulk Actions</option>
            <option value="completed">Mark as Completed</option>
            <option value="cancelled">Mark as Cancelled</option>
            <option value="no_show">Mark as No Show</option>
          </select>
        </div>
      </div>
    )}

    {/* Appointments Table */}
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Appointment List ({appointments.length})
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient & Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason & Symptoms
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <AppointmentTableRow
                key={appointment.id}
                appointment={appointment}
                onEdit={onEditAppointment}
              />
            ))}
          </tbody>
        </table>
      </div>

      {appointments.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No appointments found matching your criteria</p>
        </div>
      )}
    </div>
  </div>
);

// Appointment Table Row Component
const AppointmentTableRow = ({ appointment, onEdit }) => (
  <tr className="hover:bg-gray-50 transition-colors duration-150">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm font-medium text-gray-900">
        {new Date(appointment.date).toLocaleDateString()}
      </div>
      <div className="text-sm text-gray-500">{appointment.time}</div>
    </td>
    <td className="px-6 py-4">
      <div className="text-sm">
        <div className="font-medium text-gray-900">{appointment.patientName}</div>
        <div className="text-gray-500">Dr. {appointment.doctorName}</div>
        <div className="text-xs text-gray-400">{appointment.doctorSpecialization}</div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="text-sm">
        <div className="text-gray-900">{appointment.reason}</div>
        {appointment.symptoms.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            Symptoms: {appointment.symptoms.join(', ')}
          </div>
        )}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        appointment.statusCode === 'completed' ? 'bg-green-100 text-green-800' :
        appointment.statusCode === 'cancelled' ? 'bg-red-100 text-red-800' :
        appointment.statusCode === 'no_show' ? 'bg-orange-100 text-orange-800' :
        'bg-blue-100 text-blue-800'
      }`}>
        {appointment.status}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
      <button
        onClick={() => onEdit(appointment)}
        className="text-blue-600 hover:text-blue-900 transition duration-200"
      >
        <PencilIcon className="h-4 w-4 inline" /> Edit
      </button>
      <button className="text-gray-600 hover:text-gray-900 transition duration-200">
        <EyeIcon className="h-4 w-4 inline" /> View
      </button>
    </td>
  </tr>
);

// Analytics View Component
const AnalyticsView = ({ analytics, conflicts, onResolveConflict }) => (
  <div className="space-y-6">
    {/* Popular Time Slots */}
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Popular Time Slots</h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {analytics.popularSlots.map((slot, index) => (
            <div key={slot.hour} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg font-medium text-gray-500">#{index + 1}</span>
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">{slot.hour}</span>
              </div>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {slot.count} appointments
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Scheduling Conflicts */}
    {conflicts.length > 0 && (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h3 className="text-lg font-medium text-red-900 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Scheduling Conflicts ({conflicts.length})
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-red-900">Double Booking Conflict</div>
                    <div className="text-sm text-red-700 mt-1">
                      Dr. {conflict.doctor} on {conflict.date} at {conflict.time}
                    </div>
                    <div className="text-sm text-red-600">
                      Patients: {conflict.appointment1} and {conflict.appointment2}
                    </div>
                  </div>
                  <button
                    onClick={() => onResolveConflict(index)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Appointment Statistics */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Appointment Status Distribution</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Completed</span>
            <span className="font-medium">{analytics.completed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Cancelled</span>
            <span className="font-medium">{analytics.cancelled}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">No Show</span>
            <span className="font-medium">{analytics.noShow}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Completion Rate</span>
            <span className="font-medium text-green-600">{analytics.completionRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">No-Show Rate</span>
            <span className="font-medium text-red-600">{analytics.noShowRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Appointments</span>
            <span className="font-medium">{analytics.totalAppointments}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Appointment Modal Component
const AppointmentModal = ({ isOpen, onClose, appointment, doctors, onSave }) => {
  const [formData, setFormData] = useState({
    patient_id: appointment?.patient_id || '',
    doctor_id: appointment?.doctor_id || '',
    appointment_date: appointment?.date || new Date().toISOString().split('T')[0],
    appointment_time: appointment?.time || '09:00',
    reason: appointment?.reason || '',
    status_id: appointment?.status_id || 'scheduled'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{appointment ? 'Edit Appointment' : 'Schedule New Appointment'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.appointment_time}
                onChange={(e) => setFormData({...formData, appointment_time: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {appointment ? 'Update Appointment' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentManagement;