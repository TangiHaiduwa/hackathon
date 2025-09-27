import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  CalendarIcon,
  ClockIcon,
  UserCircleIcon,
  MapPinIcon,
  PhoneIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowLeftIcon,
  EyeIcon,
  XMarkIcon,
  CheckBadgeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  BellIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

const AppointmentManagement = () => {
  const [activeTab, setActiveTab] = useState('book');
  const [appointments, setAppointments] = useState({
    upcoming: [],
    history: []
  });
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [modifyingAppointment, setModifyingAppointment] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'Appointments', href: '/appointment', icon: CalendarIcon, current: true },
    { name: 'Medical Records', href: '/patient-medical-records', icon: EyeIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: MagnifyingGlassIcon },
  ];

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  useEffect(() => {
    if (authUser) {
      fetchDoctors();
      fetchAppointments();
      fetchMedicalHistory();
    }
  }, [authUser]);

  const fetchDoctors = async () => {
    try {
      const { data: doctorRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'doctor')
        .single();

      if (roleError) throw roleError;

      const { data: medicalStaff, error } = await supabase
        .from('medical_staff')
        .select(`
          id,
          available,
          license_number,
          years_experience,
          qualification,
          bio,
          users!inner(
            id,
            first_name,
            last_name,
            email,
            phone_number,
            role_id
          ),
          specializations(
            specialization_name,
            category
          ),
          departments(
            department_name,
            description,
            location
          )
        `)
        .eq('available', true)
        .eq('users.role_id', doctorRole.id);

      if (error) throw error;

      const doctorsData = medicalStaff.map(staff => {
        const user = staff.users || {};
        const specialization = staff.specializations || {};
        const department = staff.departments || {};
        
        return {
          id: staff.id,
          user_id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Doctor',
          email: user.email || '',
          phone: user.phone_number || '',
          specialization: specialization.specialization_name || 'General Medicine',
          experience: staff.years_experience ? `${staff.years_experience} years` : 'Experienced',
          rating: 4.5,
          available: staff.available,
          image: '👨‍⚕️',
          bio: staff.bio || `Specialized in ${specialization.specialization_name || 'general medicine'}`,
          department: department.department_name || 'Medical Center',
          location: department.location || 'Main Hospital',
          qualification: staff.qualification || 'Medical Professional',
          license: staff.license_number
        };
      }).filter(doctor => doctor.name !== 'Doctor');

      setDoctors(doctorsData);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      
      const { data: upcomingAppointments, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          status_id,
          created_at,
          appointment_statuses!inner(
            status_code,
            status_name
          ),
          medical_staff(
            id,
            users(
              first_name,
              last_name
            ),
            specializations(
              specialization_name
            ),
            departments(
              department_name,
              location
            )
          )
        `)
        .eq('patient_id', authUser.id)
        .in('appointment_statuses.status_code', ['pending', 'confirmed', 'checked_in', 'in_progress'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (upcomingError) throw upcomingError;

      const { data: appointmentHistory, error: historyError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          status_id,
          appointment_statuses!inner(
            status_code,
            status_name
          ),
          medical_staff(
            users(
              first_name,
              last_name
            ),
            specializations(
              specialization_name
            ),
            departments(
              department_name,
              location
            )
          )
        `)
        .eq('patient_id', authUser.id)
        .in('appointment_statuses.status_code', ['completed', 'cancelled', 'no_show'])
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (historyError) throw historyError;

      setAppointments({
        upcoming: upcomingAppointments || [],
        history: appointmentHistory || []
      });

    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalHistory = async () => {
    try {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (patientError) return;

      const { data: history, error } = await supabase
        .from('medical_diagnoses')
        .select(`
          id,
          diagnosis_date,
          severity,
          notes,
          diseases(
            disease_name
          ),
          diagnosis_statuses(
            status_name
          )
        `)
        .eq('patient_id', patient.id)
        .order('diagnosis_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      setMedicalHistory(history || []);
    } catch (error) {
      console.error('Error fetching medical history:', error);
    }
  };

  const bookAppointment = async () => {
    if (!authUser || !selectedDoctor || !selectedDate || !selectedTime) return;

    try {
      setBookingLoading(true);

      const { data: statusData, error: statusError } = await supabase
        .from('appointment_statuses')
        .select('id')
        .eq('status_code', 'pending')
        .single();

      if (statusError) throw statusError;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: authUser.id,
          doctor_id: selectedDoctor.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status_id: statusData.id,
          reason: appointmentReason
        })
        .select(`
          id,
          appointment_date,
          appointment_time,
          reason,
          medical_staff(
            users(
              first_name,
              last_name
            ),
            specializations(
              specialization_name
            )
          )
        `)
        .single();

      if (error) throw error;

      await supabase
        .from('appointment_history')
        .insert({
          appointment_id: appointment.id,
          status_id: statusData.id,
          notes: 'Appointment scheduled by patient',
          changed_by: authUser.id
        });

      await fetchAppointments();
      setActiveTab('upcoming');
      resetBookingForm();
      alert('Appointment booked successfully! You will receive a confirmation shortly.');

    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const modifyAppointment = async (appointmentId, newDate, newTime) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      const { data: statusData } = await supabase
        .from('appointment_statuses')
        .select('id')
        .eq('status_code', 'pending')
        .single();

      await supabase
        .from('appointment_history')
        .insert({
          appointment_id: appointmentId,
          status_id: statusData.id,
          notes: 'Appointment rescheduled by patient',
          changed_by: authUser.id
        });

      await fetchAppointments();
      setModifyingAppointment(null);
      alert('Appointment updated successfully!');

    } catch (error) {
      console.error('Error modifying appointment:', error);
      alert('Failed to update appointment. Please try again.');
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) return;

    try {
      const { data: cancelledStatus, error: statusError } = await supabase
        .from('appointment_statuses')
        .select('id')
        .eq('status_code', 'cancelled')
        .single();

      if (statusError) throw statusError;

      const { error } = await supabase
        .from('appointments')
        .update({
          status_id: cancelledStatus.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      await supabase
        .from('appointment_history')
        .insert({
          appointment_id: appointmentId,
          status_id: cancelledStatus.id,
          notes: 'Appointment cancelled by patient',
          changed_by: authUser.id
        });

      await fetchAppointments();
      alert('Appointment cancelled successfully.');

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  const resetBookingForm = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedTime('');
    setAppointmentReason('');
  };

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = specializationFilter === 'all' || doctor.specialization === specializationFilter;
    return matchesSearch && matchesSpecialization;
  });

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  return (
    <DashboardLayout user={authUser} navigation={navigation}>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Mobile Menu Button */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-blue-800 hover:bg-gray-100 transition duration-200"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-3 font-medium text-sm sm:text-base"
            >
              <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Back to Dashboard
            </button>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Appointment Management</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Book, modify, or cancel your medical appointments</p>
              </div>
              <button
                onClick={() => setActiveTab('book')}
                className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
              >
                <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                New Appointment
              </button>
            </div>
          </div>

          {/* Appointment Reminders */}
          <AppointmentReminders appointments={appointments.upcoming} />

          {/* Mobile Tabs */}
          <div className="md:hidden mb-4">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="book">Book Appointment</option>
              <option value="upcoming">Upcoming ({appointments.upcoming.length})</option>
              <option value="history">Appointment History</option>
            </select>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <div className="flex border-b border-gray-200">
              {['book', 'upcoming', 'history'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 lg:px-6 lg:py-4 font-medium border-b-2 transition-colors capitalize text-sm lg:text-base ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'book' ? 'Book Appointment' : 
                   tab === 'upcoming' ? `Upcoming (${appointments.upcoming.length})` : 
                   'History'}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6">
              {activeTab === 'book' && (
                <BookAppointmentTab
                  doctors={filteredDoctors}
                  selectedDoctor={selectedDoctor}
                  setSelectedDoctor={setSelectedDoctor}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedTime={selectedTime}
                  setSelectedTime={setSelectedTime}
                  appointmentReason={appointmentReason}
                  setAppointmentReason={setAppointmentReason}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  specializationFilter={specializationFilter}
                  setSpecializationFilter={setSpecializationFilter}
                  availableDates={availableDates}
                  timeSlots={timeSlots}
                  onBookAppointment={bookAppointment}
                  bookingLoading={bookingLoading}
                  specializations={[...new Set(doctors.map(d => d.specialization))]}
                />
              )}

              {activeTab === 'upcoming' && (
                <UpcomingAppointmentsTab
                  appointments={appointments.upcoming}
                  loading={loading}
                  onModify={setModifyingAppointment}
                  onCancel={cancelAppointment}
                  modifyingAppointment={modifyingAppointment}
                  onSaveModification={modifyAppointment}
                  availableDates={availableDates}
                  timeSlots={timeSlots}
                />
              )}

              {activeTab === 'history' && (
                <AppointmentHistoryTab
                  appointments={appointments.history}
                  loading={loading}
                  medicalHistory={medicalHistory}
                />
              )}
            </div>
          </div>

          {/* Mobile Content */}
          <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {activeTab === 'book' && (
              <BookAppointmentTab
                doctors={filteredDoctors}
                selectedDoctor={selectedDoctor}
                setSelectedDoctor={setSelectedDoctor}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                appointmentReason={appointmentReason}
                setAppointmentReason={setAppointmentReason}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                specializationFilter={specializationFilter}
                setSpecializationFilter={setSpecializationFilter}
                availableDates={availableDates}
                timeSlots={timeSlots}
                onBookAppointment={bookAppointment}
                bookingLoading={bookingLoading}
                specializations={[...new Set(doctors.map(d => d.specialization))]}
                isMobile={true}
              />
            )}

            {activeTab === 'upcoming' && (
              <UpcomingAppointmentsTab
                appointments={appointments.upcoming}
                loading={loading}
                onModify={setModifyingAppointment}
                onCancel={cancelAppointment}
                modifyingAppointment={modifyingAppointment}
                onSaveModification={modifyAppointment}
                availableDates={availableDates}
                timeSlots={timeSlots}
                isMobile={true}
              />
            )}

            {activeTab === 'history' && (
              <AppointmentHistoryTab
                appointments={appointments.history}
                loading={loading}
                medicalHistory={medicalHistory}
                isMobile={true}
              />
            )}
          </div>

          {/* Medical History Integration */}
          {medicalHistory.length > 0 && activeTab === 'book' && (
            <MedicalHistoryIntegration medicalHistory={medicalHistory} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Book Appointment Tab Component
const BookAppointmentTab = ({
  doctors, selectedDoctor, setSelectedDoctor, selectedDate, setSelectedDate,
  selectedTime, setSelectedTime, appointmentReason, setAppointmentReason,
  searchTerm, setSearchTerm, specializationFilter, setSpecializationFilter,
  availableDates, timeSlots, onBookAppointment, bookingLoading, specializations,
  isMobile = false
}) => {
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Book New Appointment</h2>
        <p className="text-gray-600 text-xs sm:text-sm">Search for qualified doctors and schedule your appointment</p>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search doctors by name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          >
            <option value="all">All Specializations</option>
            {specializations.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Count */}
      <div className="text-xs sm:text-sm text-gray-600">
        Found {doctors.length} doctor{doctors.length !== 1 ? 's' : ''}
        {specializationFilter !== 'all' && ` in ${specializationFilter}`}
      </div>

      {/* Doctors Grid */}
      <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {doctors.map(doctor => (
          <div
            key={doctor.id}
            className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200 ${
              selectedDoctor?.id === doctor.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => setSelectedDoctor(doctor)}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="text-2xl sm:text-3xl">{doctor.image}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">Dr. {doctor.name}</h3>
                <p className="text-blue-600 text-xs sm:text-sm truncate">{doctor.specialization}</p>
                <p className="text-green-600 text-xs font-medium">Covered by insurance</p>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <p>⭐ {doctor.rating.toFixed(1)} • {doctor.experience}</p>
              <p className="flex items-center truncate">
                <MapPinIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{doctor.location}</span>
              </p>
              <p className="text-xs truncate">{doctor.qualification}</p>
              <div className="flex items-center text-xs">
                <ShieldCheckIcon className="h-3 w-3 mr-1 text-green-600 flex-shrink-0" />
                Licensed Professional
              </div>
            </div>
          </div>
        ))}
      </div>

      {doctors.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <UserCircleIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
          <p className="text-sm sm:text-base">No doctors found matching your criteria.</p>
          <p className="text-xs sm:text-sm mt-1">Try adjusting your search terms or filters.</p>
        </div>
      )}

      {/* Date and Time Selection */}
      {selectedDoctor && (
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
            <UserCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
            Schedule with Dr. {selectedDoctor.name}
            <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
              {selectedDoctor.specialization}
            </span>
          </h3>
          
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 mb-3 sm:mb-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Select Date</label>
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              >
                <option value="">Choose a date</option>
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Select Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={!selectedDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm sm:text-base"
              >
                <option value="">Choose a time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>
                    {time} - {formatTimeDisplay(time)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason for Appointment */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Reason for Appointment
            </label>
            <textarea
              value={appointmentReason}
              onChange={(e) => setAppointmentReason(e.target.value)}
              placeholder="Please describe the reason for your appointment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-20 sm:h-24 resize-none text-sm sm:text-base"
            />
          </div>

          {/* Book Button */}
          <button
            onClick={onBookAppointment}
            disabled={!selectedDate || !selectedTime || bookingLoading}
            className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center text-sm sm:text-base"
          >
            {bookingLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                Booking...
              </>
            ) : (
              <>
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Confirm Appointment
              </>
            )}
          </button>

          {/* Confirmation Notice */}
          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-xs sm:text-sm flex items-center">
              <BellIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
              You will receive a confirmation message after booking
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Upcoming Appointments Tab Component
const UpcomingAppointmentsTab = ({ appointments, loading, onModify, onCancel, modifyingAppointment, onSaveModification, availableDates, timeSlots, isMobile = false }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-6 sm:py-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 sm:ml-3 text-gray-600 text-sm sm:text-base">Loading appointments...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Upcoming Appointments</h2>
      
      {appointments.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <CalendarIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
          <p className="text-sm sm:text-base">No upcoming appointments scheduled.</p>
          <p className="text-xs sm:text-sm mt-1">Book an appointment to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {appointments.map(appointment => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onModify={onModify}
              onCancel={onCancel}
              isModifying={modifyingAppointment === appointment.id}
              onSaveModification={onSaveModification}
              availableDates={availableDates}
              timeSlots={timeSlots}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Appointment History Tab Component
const AppointmentHistoryTab = ({ appointments, loading, medicalHistory, isMobile = false }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-6 sm:py-8">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 sm:ml-3 text-gray-600 text-sm sm:text-base">Loading appointment history...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Appointment History</h2>
      
      {appointments.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-500">
          <CalendarIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
          <p className="text-sm sm:text-base">No appointment history found.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {appointments.map(appointment => (
            <div key={appointment.id} className="border rounded-lg p-3 sm:p-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    Dr. {appointment.medical_staff?.users?.first_name} {appointment.medical_staff?.users?.last_name}
                  </h3>
                  <p className="text-blue-600 text-xs sm:text-sm">{appointment.medical_staff?.specializations?.specialization_name}</p>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    {new Date(appointment.appointment_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {formatTimeDisplay(appointment.appointment_time)}
                  </p>
                  {appointment.reason && (
                    <p className="text-gray-600 text-xs sm:text-sm mt-1">Reason: {appointment.reason}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium self-start sm:self-auto ${
                  appointment.appointment_statuses?.status_code === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.appointment_statuses?.status_code === 'cancelled' ? 'bg-red-100 text-red-800' :
                  appointment.appointment_statuses?.status_code === 'no_show' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {appointment.appointment_statuses?.status_name}
                </span>
              </div>
              {appointment.medical_staff?.departments?.location && (
                <p className="text-gray-500 text-xs mt-2">
                  Location: {appointment.medical_staff.departments.location}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Medical History Summary */}
      {medicalHistory.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Recent Medical History</h3>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {medicalHistory.map(record => (
              <div key={record.id} className="border-l-4 border-blue-500 pl-2 sm:pl-3 py-1">
                <p className="font-medium text-xs sm:text-sm">{record.diseases?.disease_name || 'Medical Condition'}</p>
                <p className="text-gray-600 text-xs">
                  {new Date(record.diagnosis_date).toLocaleDateString()} • {record.severity}
                </p>
                {record.notes && (
                  <p className="text-gray-500 text-xs mt-1">{record.notes.substring(0, 60)}...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Appointment Card Component
const AppointmentCard = ({ appointment, onModify, onCancel, isModifying, onSaveModification, availableDates, timeSlots, isMobile = false }) => {
  const [newDate, setNewDate] = useState(appointment.appointment_date);
  const [newTime, setNewTime] = useState(appointment.appointment_time);

  if (isModifying) {
    return (
      <div className="border border-blue-300 rounded-lg p-3 sm:p-4 bg-blue-50">
        <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Modify Appointment</h3>
        
        <div className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-2 mb-3 sm:mb-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">New Date</label>
            <select
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded text-sm"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">New Time</label>
            <select
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded text-sm"
            >
              {timeSlots.map(time => (
                <option key={time} value={time}>{formatTimeDisplay(time)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onSaveModification(appointment.id, newDate, newTime)}
            className="bg-green-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-green-700 flex-1"
          >
            Save Changes
          </button>
          <button
            onClick={() => onModify(null)}
            className="bg-gray-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-600 flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-white">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
            Dr. {appointment.medical_staff?.users?.first_name} {appointment.medical_staff?.users?.last_name}
          </h3>
          <p className="text-blue-600 text-xs sm:text-sm">{appointment.medical_staff?.specializations?.specialization_name}</p>
          <p className="text-gray-600 text-xs sm:text-sm">
            {new Date(appointment.appointment_date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} at {formatTimeDisplay(appointment.appointment_time)}
          </p>
          {appointment.reason && (
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Reason: {appointment.reason}</p>
          )}
          <p className="text-gray-500 text-xs mt-2">
            {appointment.medical_staff?.departments?.department_name} • {appointment.medical_staff?.departments?.location || 'Main Hospital'}
          </p>
        </div>
        
        <div className="flex space-x-2 self-end sm:self-auto">
          <button
            onClick={() => onModify(appointment.id)}
            className="bg-blue-600 text-white p-1 sm:p-2 rounded hover:bg-blue-700 transition-colors"
            title="Modify Appointment"
          >
            <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => onCancel(appointment.id)}
            className="bg-red-600 text-white p-1 sm:p-2 rounded hover:bg-red-700 transition-colors"
            title="Cancel Appointment"
          >
            <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Appointment Reminders Component
const AppointmentReminders = ({ appointments }) => {
  const upcomingAppointments = appointments.filter(apt => {
    const appointmentDate = new Date(apt.appointment_date);
    const today = new Date();
    const diffTime = appointmentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  if (upcomingAppointments.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
      <h3 className="font-semibold text-blue-900 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
        <BellIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
        Upcoming Appointment Reminders
      </h3>
      <div className="space-y-2">
        {upcomingAppointments.map(apt => {
          const appointmentDate = new Date(apt.appointment_date);
          const today = new Date();
          const diffTime = appointmentDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return (
            <div key={apt.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-blue-100 last:border-0 space-y-1 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-xs sm:text-sm">
                  {appointmentDate.toLocaleDateString()} at {formatTimeDisplay(apt.appointment_time)}
                </span>
                <span className="text-blue-600 text-xs ml-2">
                  with Dr. {apt.medical_staff?.users?.first_name}
                </span>
                {apt.medical_staff?.departments?.location && (
                  <span className="text-gray-500 text-xs ml-2">• {apt.medical_staff.departments.location}</span>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium self-start sm:self-auto ${
                diffDays === 0 ? 'bg-orange-100 text-orange-800' :
                diffDays === 1 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Medical History Integration Component
const MedicalHistoryIntegration = ({ medicalHistory }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mt-4 sm:mt-6">
    <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
      <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
      Recent Medical History Context
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {medicalHistory.slice(0, 4).map(record => (
        <div key={record.id} className="border-l-4 border-blue-500 pl-2 sm:pl-3">
          <p className="font-medium text-xs sm:text-sm">{record.diseases?.disease_name || 'Medical Condition'}</p>
          <p className="text-gray-600 text-xs">{new Date(record.diagnosis_date).toLocaleDateString()}</p>
          {record.notes && (
            <p className="text-gray-500 text-xs mt-1">{record.notes.substring(0, 60)}...</p>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Helper function
const formatTimeDisplay = (time) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

export default AppointmentManagement;