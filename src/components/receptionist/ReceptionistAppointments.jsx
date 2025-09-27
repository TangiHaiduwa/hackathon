// src/pages/receptionist/AppointmentScheduling.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  UserGroupIcon,
  PhoneIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const AppointmentScheduling = () => {
  const [user, setUser] = useState({
    name: 'Receptionist',
    email: '',
    role: 'receptionist',
    department: 'Front Desk'
  });

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filter, setFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffType, setStaffType] = useState('doctor');

  const navigation = [
    { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: false },
    { name: 'Appointment Scheduling', href: '/receptionist/appointment-scheduling', icon: CalendarIcon, current: true },
    { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
    { name: 'Medical Records', href: '/reception/medical-records1', icon: UserIcon, current: false },
  ];

  // Time slots for scheduling
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
    '15:30', '16:00', '16:30', '17:00'
  ];

  const [formData, setFormData] = useState({
    patientId: '',
    staffId: '',
    staffType: 'doctor',
    appointmentDate: '',
    appointmentTime: '',
    reason: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAppointmentData();
    }
  }, [filter, selectedDate, selectedStaff, staffType, user]);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser({
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
            role: 'receptionist',
            department: 'Front Desk'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchAppointmentData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAppointments(),
        fetchDoctors(),
        fetchNurses(),
        fetchPatients(),
        fetchStatuses()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          created_at,
          patients:patient_id(
            id,
            users:users!inner(
              first_name,
              last_name,
              phone_number
            )
          ),
          doctors:doctor_id(
            id,
            users:users!inner(
              first_name,
              last_name
            ),
            specializations:specialization_id(
              specialization_name
            )
          ),
          appointment_statuses:status_id(
            status_code,
            status_name
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('appointment_date', today);
      } else if (filter === 'upcoming') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('appointment_date', today);
      } else if (filter === 'past') {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('appointment_date', today);
      }

      if (selectedStaff) {
        query = query.eq('doctor_id', selectedStaff);
      }

      if (selectedDate) {
        query = query.eq('appointment_date', selectedDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'doctor')
        .single();

      if (roleError) throw roleError;

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone_number,
          medical_staff:medical_staff!inner(
            id,
            specializations:specialization_id(
              specialization_name
            ),
            departments:department_id(
              department_name
            ),
            license_number,
            available
          )
        `)
        .eq('role_id', roleData.id)
        .eq('medical_staff.available', true)
        .order('first_name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchNurses = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'nurse')
        .single();

      if (roleError) throw roleError;

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone_number,
          medical_staff:medical_staff!inner(
            id,
            specializations:specialization_id(
              specialization_name
            ),
            departments:department_id(
              department_name
            ),
            license_number,
            available
          )
        `)
        .eq('role_id', roleData.id)
        .eq('medical_staff.available', true)
        .order('first_name');

      if (error) throw error;
      setNurses(data || []);
    } catch (error) {
      console.error('Error fetching nurses:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'patient')
        .single();

      if (roleError) throw roleError;

      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          phone_number,
          date_of_birth,
          patients:patients!inner(
            insurance_provider
          )
        `)
        .eq('role_id', roleData.id)
        .order('first_name')
        .limit(500);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_statuses')
        .select('*')
        .order('status_name');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const getAvailableTimeSlots = (staffId, date) => {
    if (!staffId || !date) return timeSlots;

    const staffAppointments = appointments.filter(apt => 
      apt.doctors.id === staffId && 
      apt.appointment_date === date &&
      apt.appointment_statuses.status_code !== 'cancelled'
    );

    const bookedSlots = staffAppointments.map(apt => apt.appointment_time);
    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const availableSlots = getAvailableTimeSlots(formData.staffId, formData.appointmentDate);
      if (!availableSlots.includes(formData.appointmentTime)) {
        alert('Selected time slot is no longer available. Please choose another time.');
        return;
      }

      const pendingStatus = statuses.find(s => s.status_code === 'pending');
      if (!pendingStatus) throw new Error('Pending status not found');

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: formData.patientId,
          doctor_id: formData.staffId,
          appointment_date: formData.appointmentDate,
          appointment_time: formData.appointmentTime,
          reason: formData.reason,
          status_id: pendingStatus.id
        });

      if (error) throw error;

      alert('Appointment scheduled successfully!');
      setShowBookingModal(false);
      resetForm();
      fetchAppointmentData();
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Error booking appointment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAppointment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const { error } = await supabase
        .from('appointments')
        .update({
          patient_id: formData.patientId,
          doctor_id: formData.staffId,
          appointment_date: formData.appointmentDate,
          appointment_time: formData.appointmentTime,
          reason: formData.reason
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      alert('Appointment updated successfully!');
      setShowEditModal(false);
      resetForm();
      fetchAppointmentData();
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Error updating appointment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatusCode) => {
    try {
      const newStatus = statuses.find(s => s.status_code === newStatusCode);
      if (!newStatus) throw new Error('Status not found');

      const { error } = await supabase
        .from('appointments')
        .update({ status_id: newStatus.id })
        .eq('id', appointmentId);

      if (error) throw error;

      fetchAppointmentData();
      alert(`Appointment ${newStatusCode.replace('_', ' ')} successfully!`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Error updating appointment: ' + error.message);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      alert('Appointment deleted successfully!');
      fetchAppointmentData();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Error deleting appointment: ' + error.message);
    }
  };

  const openEditModal = (appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      patientId: appointment.patients.id,
      staffId: appointment.doctors.id,
      staffType: 'doctor',
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time,
      reason: appointment.reason || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      staffId: '',
      staffType: 'doctor',
      appointmentDate: '',
      appointmentTime: '',
      reason: ''
    });
    setSelectedAppointment(null);
  };

  const recommendMalariaTyphoidDoctors = () => {
    return doctors.filter(doctor => {
      const specialization = doctor.medical_staff?.specializations?.specialization_name?.toLowerCase();
      return specialization && (
        specialization.includes('infectious') ||
        specialization.includes('internal') ||
        specialization.includes('general') ||
        specialization.includes('family')
      );
    });
  };

  const filteredAppointments = appointments.filter(apt => {
    const patientName = `${apt.patients?.users?.first_name || ''} ${apt.patients?.users?.last_name || ''}`.toLowerCase();
    const doctorName = `${apt.doctors?.users?.first_name || ''} ${apt.doctors?.users?.last_name || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return patientName.includes(searchLower) || 
           doctorName.includes(searchLower) ||
           apt.reason?.toLowerCase().includes(searchLower) ||
           apt.appointment_date.includes(searchLower);
  });

  const getStatusColor = (statusCode) => {
    switch (statusCode) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading appointments...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Appointment Scheduling</h1>
          <p className="text-gray-600">Manage and schedule appointments between patients and medical staff</p>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients, doctors, reasons, or dates..."
                  className="input-medical pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <select
                  className="input-medical"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="all">All Appointments</option>
                </select>

                <select
                  className="input-medical"
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                >
                  <option value="">All Staff</option>
                  <optgroup label="Doctors">
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Nurses">
                    {nurses.map(nurse => (
                      <option key={nurse.id} value={nurse.id}>
                        Nurse {nurse.first_name} {nurse.last_name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <input
                  type="date"
                  className="input-medical"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={() => setShowBookingModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Appointment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">Available Doctors</p>
                <p className="text-2xl font-bold text-blue-700">{doctors.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <UserPlusIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Available Nurses</p>
                <p className="text-2xl font-bold text-green-700">{nurses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-900">Total Appointments</p>
                <p className="text-2xl font-bold text-purple-700">{appointments.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Appointments ({filteredAppointments.length})
            </h2>
            <div className="text-sm text-gray-500">
              {filter === 'today' && 'Showing today\'s appointments'}
              {filter === 'upcoming' && 'Showing upcoming appointments'}
              {filter === 'past' && 'Showing past appointments'}
              {filter === 'all' && 'Showing all appointments'}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments found</p>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="btn-primary mt-4"
                >
                  Schedule First Appointment
                </button>
              </div>
            ) : (
              filteredAppointments.map(appointment => (
                <div key={appointment.id} className="p-6 hover:bg-gray-50 transition duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2 flex-wrap">
                        <h3 className="text-lg font-medium text-gray-900">
                          {appointment.patients?.users?.first_name} {appointment.patients?.users?.last_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.appointment_statuses?.status_code)}`}>
                          {appointment.appointment_statuses?.status_name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Dr. {appointment.doctors?.users?.first_name} {appointment.doctors?.users?.last_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>{appointment.appointment_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BuildingLibraryIcon className="h-4 w-4" />
                          <span>{appointment.doctors?.specializations?.specialization_name || 'General'}</span>
                        </div>
                      </div>
                      
                      {appointment.reason && (
                        <p className="mt-2 text-sm text-gray-700">
                          <strong>Reason:</strong> {appointment.reason}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {appointment.appointment_statuses?.status_code === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Confirm
                          </button>
                          <button
                            onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            <XCircleIcon className="h-4 w-4" />
                            Cancel
                          </button>
                        </>
                      )}
                      
                      {appointment.appointment_statuses?.status_code === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'checked_in')}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Check In
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(appointment)}
                        className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                      >
                        <PencilIcon className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Schedule New Appointment</h3>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient *</label>
                  <select
                    required
                    className="input-medical"
                    value={formData.patientId}
                    onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                  >
                    <option value="">Select Patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                        {patient.date_of_birth && ` (DOB: ${new Date(patient.date_of_birth).getFullYear()})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Medical Staff Type *</label>
                  <select
                    required
                    className="input-medical"
                    value={formData.staffType}
                    onChange={(e) => setFormData({...formData, staffType: e.target.value, staffId: ''})}
                  >
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.staffType === 'doctor' ? 'Doctor' : 'Nurse'} *
                    {formData.staffType === 'doctor' && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Infectious disease specialists recommended for fever symptoms)
                      </span>
                    )}
                  </label>
                  <select
                    required
                    className="input-medical"
                    value={formData.staffId}
                    onChange={(e) => setFormData({...formData, staffId: e.target.value})}
                  >
                    <option value="">Select {formData.staffType === 'doctor' ? 'Doctor' : 'Nurse'}</option>
                    {formData.staffType === 'doctor' ? (
                      <>
                        <optgroup label="Recommended for Fever Symptoms">
                          {recommendMalariaTyphoidDoctors().map(doctor => (
                            <option key={doctor.id} value={doctor.id}>
                              Dr. {doctor.first_name} {doctor.last_name} 
                              {doctor.medical_staff?.specializations && ` - ${doctor.medical_staff.specializations.specialization_name}`}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Other Doctors">
                          {doctors.filter(d => !recommendMalariaTyphoidDoctors().includes(d)).map(doctor => (
                            <option key={doctor.id} value={doctor.id}>
                              Dr. {doctor.first_name} {doctor.last_name}
                              {doctor.medical_staff?.specializations && ` - ${doctor.medical_staff.specializations.specialization_name}`}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      nurses.map(nurse => (
                        <option key={nurse.id} value={nurse.id}>
                          Nurse {nurse.first_name} {nurse.last_name}
                          {nurse.medical_staff?.specializations && ` - ${nurse.medical_staff.specializations.specialization_name}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      required
                      className="input-medical"
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time *</label>
                    <select
                      required
                      className="input-medical"
                      value={formData.appointmentTime}
                      onChange={(e) => setFormData({...formData, appointmentTime: e.target.value})}
                    >
                      <option value="">Select Time</option>
                      {getAvailableTimeSlots(formData.staffId, formData.appointmentDate).map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Visit *</label>
                  <textarea
                    required
                    rows={3}
                    className="input-medical"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="Describe the reason for the appointment..."
                  />
                </div>

                {formData.staffId && formData.appointmentDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Available Time Slots for {
                        formData.staffType === 'doctor' ? 'Dr.' : 'Nurse'
                      } {
                        (formData.staffType === 'doctor' ? doctors : nurses)
                          .find(d => d.id === formData.staffId)?.first_name
                      }
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableTimeSlots(formData.staffId, formData.appointmentDate).map(slot => (
                        <span
                          key={slot}
                          className={`px-2 py-1 rounded text-sm ${
                            slot === formData.appointmentTime
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-blue-700 border border-blue-300'
                          }`}
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Appointment</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleEditAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient *</label>
                  <select
                    required
                    className="input-medical"
                    value={formData.patientId}
                    onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                  >
                    <option value="">Select Patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                  <select
                    required
                    className="input-medical"
                    value={formData.staffId}
                    onChange={(e) => setFormData({...formData, staffId: e.target.value})}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                        {doctor.medical_staff?.specializations && ` - ${doctor.medical_staff.specializations.specialization_name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      required
                      className="input-medical"
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData({...formData, appointmentDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time *</label>
                    <select
                      required
                      className="input-medical"
                      value={formData.appointmentTime}
                      onChange={(e) => setFormData({...formData, appointmentTime: e.target.value})}
                    >
                      <option value="">Select Time</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Visit *</label>
                  <textarea
                    required
                    rows={3}
                    className="input-medical"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="Describe the reason for the appointment..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AppointmentScheduling;