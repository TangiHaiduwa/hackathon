// src/pages/ReceptionistAppointments.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

const ReceptionistAppointments = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [statuses, setStatuses] = useState([]);

  const navigation = [
      { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: true },
      { name: 'Appointments', href: '/receptionist/receptionist-appointments', icon: CalendarIcon, current: false },
      { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
      { name: 'Scheduling', href: '/receptionist/scheduling', icon: ClockIcon, current: false },
      { name: 'Medical Records', href: '/reception/medical-records1', icon: ClockIcon, current: false },
  
  
    ];

  // New appointment form data
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    symptoms: []
  });

  // Available time slots
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30'
  ];

  // Common symptoms for quick selection
  const commonSymptoms = [
    'Fever', 'Headache', 'Abdominal Pain', 'Fatigue', 'Cough',
    'Vomiting', 'Diarrhea', 'Muscle Pain', 'Loss of Appetite', 'Rash'
  ];

  useEffect(() => {
    fetchUserData();
  }, [authUser]);

  useEffect(() => {
    if (authUser) {
      fetchAppointmentsData();
    }
  }, [filter, authUser]);

  const fetchUserData = async () => {
    if (!authUser) return;

    try {
      // Fetch user details from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          first_name,
          last_name,
          roles:role_id(role_name)
        `)
        .eq('id', authUser.id)
        .single();

      if (!userError && userData) {
        setUser({
          name: `${userData.first_name} ${userData.last_name}`,
          email: authUser.email,
          role: userData.roles?.role_name || 'receptionist',
          department: 'Front Desk'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchAppointmentsData = async () => {
    try {
      setLoading(true);
      
      await Promise.all([
        fetchAppointments(),
        fetchDoctors(),
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
          *,
          patients:patient_id(
            users:id(
              first_name,
              last_name,
              phone_number
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
      } else if (filter === 'upcoming') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('appointment_date', today);
      } else if (filter === 'pending') {
        const pendingStatus = statuses.find(s => s.status_code === 'pending');
        if (pendingStatus) {
          query = query.eq('status_id', pendingStatus.id);
        }
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
      // Fetch doctors specialized in infectious diseases (Malaria/Typhoid)
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
          available
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
            phone_number
          )
        `)
        .limit(100); // Limit for performance

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

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      // Check if doctor is available at the selected time
      const conflictingAppointment = appointments.find(apt => 
        apt.doctor_id === formData.doctorId &&
        apt.appointment_date === formData.appointmentDate &&
        apt.appointment_time === formData.appointmentTime &&
        apt.status_id !== (statuses.find(s => s.status_code === 'cancelled')?.id)
      );

      if (conflictingAppointment) {
        alert('Doctor is not available at the selected time. Please choose a different time.');
        return;
      }

      const pendingStatus = statuses.find(s => s.status_code === 'pending');
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: formData.patientId,
          doctor_id: formData.doctorId,
          appointment_date: formData.appointmentDate,
          appointment_time: formData.appointmentTime,
          reason: formData.reason,
          status_id: pendingStatus?.id
        });

      if (error) throw error;

      // Add symptoms to appointment_symptoms table if any
      if (formData.symptoms.length > 0) {
        // This would require additional implementation for symptoms
        console.log('Symptoms to be recorded:', formData.symptoms);
      }

      alert('Appointment booked successfully!');
      setShowBookingModal(false);
      setFormData({
        patientId: '',
        doctorId: '',
        appointmentDate: '',
        appointmentTime: '',
        reason: '',
        symptoms: []
      });
      fetchAppointmentsData();
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Error booking appointment: ' + error.message);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatusCode) => {
    try {
      const newStatus = statuses.find(s => s.status_code === newStatusCode);
      if (!newStatus) throw new Error('Status not found');

      const { error } = await supabase
        .from('appointments')
        .update({ status_id: newStatus.id })
        .eq('id', appointmentId);

      if (error) throw error;

      fetchAppointmentsData();
      alert(`Appointment ${newStatusCode.replace('_', ' ')} successfully!`);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      alert('Error updating appointment: ' + error.message);
    }
  };

  const recommendMalariaTyphoidDoctors = () => {
    return doctors.filter(doctor => {
      const specialization = doctor.specializations?.specialization_name?.toLowerCase();
      return specialization && (
        specialization.includes('infectious') ||
        specialization.includes('internal medicine') ||
        specialization.includes('general medicine')
      );
    });
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
          <div className="text-lg text-gray-600">Loading appointments...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
        <p className="text-gray-600">Manage and schedule patient appointments</p>
        <div className="flex items-center space-x-4 mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {user?.department}
          </span>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
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
                <option value="all">All Appointments</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* New Appointment Button */}
          <button
            onClick={() => setShowBookingModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New Appointment
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Appointments ({filteredAppointments.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span>Dr. {appointment.doctors?.users?.first_name} {appointment.doctors?.users?.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{appointment.appointment_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        <span>{appointment.appointment_time}</span>
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
                    {appointment.appointment_statuses?.status_code === 'pending' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Confirm
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {appointment.appointment_statuses?.status_code === 'confirmed' && (
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'checked_in')}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Check In
                      </button>
                    )}

                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Book New Appointment</h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-4">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
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
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor Selection with Malaria/Typhoid specialists recommended */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Doctor 
                    <span className="text-xs text-gray-500 ml-2">
                      (Infectious disease specialists recommended for fever symptoms)
                    </span>
                  </label>
                  <select
                    required
                    className="input-medical"
                    value={formData.doctorId}
                    onChange={(e) => setFormData({...formData, doctorId: e.target.value})}
                  >
                    <option value="">Select Doctor</option>
                    <optgroup label="Recommended for Fever Symptoms">
                      {recommendMalariaTyphoidDoctors().map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.users.first_name} {doctor.users.last_name} 
                          {doctor.specializations && ` - ${doctor.specializations.specialization_name}`}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Doctors">
                      {doctors.filter(d => !recommendMalariaTyphoidDoctors().includes(d)).map(doctor => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.users.first_name} {doctor.users.last_name}
                          {doctor.specializations && ` - ${doctor.specializations.specialization_name}`}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
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
                    <label className="block text-sm font-medium text-gray-700">Time</label>
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

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Visit</label>
                  <textarea
                    required
                    rows={3}
                    className="input-medical"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                    placeholder="Describe the reason for the appointment..."
                  />
                </div>

                {/* Symptoms (for expert system integration) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Symptoms (Optional - for doctor's reference)
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {commonSymptoms.map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => {
                          const newSymptoms = formData.symptoms.includes(symptom)
                            ? formData.symptoms.filter(s => s !== symptom)
                            : [...formData.symptoms, symptom];
                          setFormData({...formData, symptoms: newSymptoms});
                        }}
                        className={`px-3 py-1 rounded-full text-sm border ${
                          formData.symptoms.includes(symptom)
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-100 border-gray-300 text-gray-700'
                        }`}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Book Appointment
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

export default ReceptionistAppointments;