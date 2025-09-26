// src/pages/Scheduling.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ClockIcon as ClockSolid
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const Scheduling = () => {
  const [user, setUser] = useState({
    name: 'Receptionist Lisa Brown',
    email: 'reception@demo.com',
    role: 'receptionist',
    department: 'Front Desk'
  });

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [filter, setFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    urgency: 'routine',
    duration: '30' // minutes
  });

  const navigation = [
      { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: true },
      { name: 'Appointments', href: '/receptionist/receptionist-appointments', icon: CalendarIcon, current: false },
      { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
      { name: 'Scheduling', href: '/receptionist/scheduling', icon: ClockIcon, current: false },
      { name: 'Medical Records', href: '/reception/medical-records1', icon: ClockIcon, current: false },
  
  
    ];

  // Time slots for scheduling
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
    '15:30', '16:00', '16:30', '17:00'
  ];

  useEffect(() => {
    fetchSchedulingData();
  }, [filter, selectedDate, selectedDoctor]);

  const fetchSchedulingData = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        fetchDoctors(),
        fetchPatients(),
        fetchAppointments()
      ]);
    } catch (error) {
      console.error('Error fetching scheduling data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_staff')
        .select(`
          id,
          users:id(
            first_name,
            last_name,
            email
          ),
          specializations:specialization_id(*),
          departments:department_id(*),
          available,
          consultation_fee,
          max_patients_per_day
        `)
        .eq('available', true)
        .order('first_name', { foreignTable: 'users' });

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          users:id(
            first_name,
            last_name,
            phone_number,
            date_of_birth
          ),
          insurance_provider
        `)
        .order('first_name', { foreignTable: 'users' })
        .limit(200);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
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
          duration,
          patients:patient_id(
            users:id(
              first_name,
              last_name
            )
          ),
          doctors:doctor_id(
            users:id(
              first_name,
              last_name
            ),
            specializations:specialization_id(*)
          ),
          appointment_statuses:status_id(*)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      // Apply filters
      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('appointment_date', today);
      } else if (filter === 'week') {
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(today.setDate(today.getDate() + 6));
        query = query.gte('appointment_date', weekStart.toISOString().split('T')[0])
                   .lte('appointment_date', weekEnd.toISOString().split('T')[0]);
      }

      if (selectedDoctor) {
        query = query.eq('doctor_id', selectedDoctor);
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

  const getAvailableTimeSlots = (doctorId, date) => {
    if (!doctorId || !date) return timeSlots;

    const doctorAppointments = appointments.filter(apt => 
      apt.doctor_id === doctorId && 
      apt.appointment_date === date &&
      apt.appointment_statuses?.status_code !== 'cancelled'
    );

    const bookedSlots = doctorAppointments.map(apt => apt.appointment_time);
    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  };

  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    try {
      // Validate time slot availability
      const availableSlots = getAvailableTimeSlots(formData.doctorId, formData.appointmentDate);
      if (!availableSlots.includes(formData.appointmentTime)) {
        alert('Selected time slot is no longer available. Please choose another time.');
        return;
      }

      // Get pending status ID
      const { data: statusData, error: statusError } = await supabase
        .from('appointment_statuses')
        .select('id')
        .eq('status_code', 'pending')
        .single();

      if (statusError) throw statusError;

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: formData.patientId,
          doctor_id: formData.doctorId,
          appointment_date: formData.appointmentDate,
          appointment_time: formData.appointmentTime,
          reason: formData.reason,
          duration: parseInt(formData.duration),
          status_id: statusData.id,
          urgency: formData.urgency
        });

      if (error) throw error;

      alert('Appointment scheduled successfully!');
      setShowSchedulingModal(false);
      setFormData({
        patientId: '',
        doctorId: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: '',
        urgency: 'routine',
        duration: '30'
      });
      fetchSchedulingData();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('Error scheduling appointment: ' + error.message);
    }
  };

  const handleRescheduleAppointment = async (appointmentId, newDate, newTime) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          status_id: (await supabase.from('appointment_statuses').select('id').eq('status_code', 'confirmed').single()).data.id
        })
        .eq('id', appointmentId);

      if (error) throw error;

      alert('Appointment rescheduled successfully!');
      fetchSchedulingData();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Error rescheduling appointment: ' + error.message);
    }
  };

  const getDoctorSchedule = (doctorId, date) => {
    return appointments.filter(apt => 
      apt.doctor_id === doctorId && 
      apt.appointment_date === date
    ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  };

  const calculateDoctorUtilization = (doctorId, date) => {
    const doctorApps = appointments.filter(apt => 
      apt.doctor_id === doctorId && 
      apt.appointment_date === date
    );
    const totalDuration = doctorApps.reduce((sum, apt) => sum + (parseInt(apt.duration) || 30), 0);
    const workingHours = 8 * 60; // 8 hours in minutes
    return Math.min(100, Math.round((totalDuration / workingHours) * 100));
  };

  const filteredAppointments = appointments.filter(apt => {
    const patientName = `${apt.patients?.users?.first_name || ''} ${apt.patients?.users?.last_name || ''}`.toLowerCase();
    const doctorName = `${apt.doctors?.users?.first_name || ''} ${apt.doctors?.users?.last_name || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return patientName.includes(searchLower) || 
           doctorName.includes(searchLower) ||
           apt.reason?.toLowerCase().includes(searchLower);
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

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading scheduling data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Appointment Scheduling</h1>
          <p className="text-gray-600">Manage doctor schedules and appointment bookings</p>
        </div>

        {/* Controls */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients, doctors, or reasons..."
                  className="input-medical pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  className="input-medical"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="all">All Appointments</option>
                </select>

                <select
                  className="input-medical"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                >
                  <option value="">All Doctors</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.users.first_name} {doctor.users.last_name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="input-medical"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* New Schedule Button */}
            <button
              onClick={() => setShowSchedulingModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Schedule Appointment
            </button>
          </div>
        </div>

        {/* Doctor Schedule Overview */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Doctor Schedule Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doctor => {
              const utilization = calculateDoctorUtilization(doctor.id, selectedDate);
              return (
                <div key={doctor.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Dr. {doctor.users.first_name} {doctor.users.last_name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      utilization >= 80 ? 'bg-red-100 text-red-800' :
                      utilization >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {utilization}% utilized
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {doctor.specializations?.specialization_name || 'General Practitioner'}
                  </p>
                  <div className="space-y-2">
                    {getDoctorSchedule(doctor.id, selectedDate).map(apt => (
                      <div key={apt.id} className="flex justify-between items-center text-sm">
                        <span>{apt.appointment_time}</span>
                        <span className="text-gray-600 truncate ml-2">
                          {apt.patients?.users?.first_name} {apt.patients?.users?.last_name}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(apt.appointment_statuses?.status_code)}`}>
                          {apt.appointment_statuses?.status_name}
                        </span>
                      </div>
                    ))}
                    {getDoctorSchedule(doctor.id, selectedDate).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">No appointments</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Scheduled Appointments ({filteredAppointments.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments found</p>
              </div>
            ) : (
              filteredAppointments.map(appointment => (
                <div key={appointment.id} className="p-6 hover:bg-gray-50 transition duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Appointment Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {appointment.patients?.users?.first_name} {appointment.patients?.users?.last_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.appointment_statuses?.status_code)}`}>
                          {appointment.appointment_statuses?.status_name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Dr. {appointment.doctors?.users?.first_name} {appointment.doctors?.users?.last_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>{appointment.appointment_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockSolid className="h-4 w-4" />
                          <span>{appointment.appointment_time} ({appointment.duration || 30} min)</span>
                        </div>
                      </div>
                      
                      {appointment.reason && (
                        <p className="mt-2 text-sm text-gray-700">
                          <strong>Reason:</strong> {appointment.reason}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          const newDate = prompt('Enter new date (YYYY-MM-DD):', appointment.appointment_date);
                          const newTime = prompt('Enter new time (HH:MM):', appointment.appointment_time);
                          if (newDate && newTime) {
                            handleRescheduleAppointment(appointment.id, newDate, newTime);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Reschedule
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Scheduling Modal */}
      {showSchedulingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Schedule New Appointment</h3>
                <button
                  onClick={() => setShowSchedulingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleScheduleAppointment} className="space-y-4">
                {/* Patient Selection */}
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
                        {patient.users.first_name} {patient.users.last_name}
                        {patient.users.date_of_birth && ` (DOB: ${new Date(patient.users.date_of_birth).getFullYear()})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                  <select
                    required
                    className="input-medical"
                    value={formData.doctorId}
                    onChange={(e) => setFormData({...formData, doctorId: e.target.value})}
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.users.first_name} {doctor.users.last_name} 
                        {doctor.specializations && ` - ${doctor.specializations.specialization_name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date and Time */}
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
                      {getAvailableTimeSlots(formData.doctorId, formData.appointmentDate).map(time => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration and Urgency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (minutes) *</label>
                    <select
                      required
                      className="input-medical"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Urgency *</label>
                    <select
                      required
                      className="input-medical"
                      value={formData.urgency}
                      onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
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

                {/* Available Time Slots Preview */}
                {formData.doctorId && formData.appointmentDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Available Time Slots</h4>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableTimeSlots(formData.doctorId, formData.appointmentDate).map(slot => (
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

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSchedulingModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Schedule Appointment
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

export default Scheduling;