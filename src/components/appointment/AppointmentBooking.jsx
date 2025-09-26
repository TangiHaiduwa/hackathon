import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout'; // Import the layout
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  CalendarIcon,
  ClockIcon,
  UserCircleIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const AppointmentBooking = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [patientSymptoms, setPatientSymptoms] = useState('');
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  // Define navigation for the sidebar
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'Book Appointment', href: '/appointment', icon: CalendarIcon, current: true },
    { name: 'Medical Records', href: '/patient-medical-records', icon: ExclamationTriangleIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: MagnifyingGlassIcon },
  ];

  // Available time slots
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  useEffect(() => {
    fetchDoctorsAndSpecializations();
    fetchPatientSymptoms();
  }, []);

  const fetchDoctorsAndSpecializations = async () => {
    try {
      setLoading(true);
      
      // Fetch medical staff with user details and specializations
      const { data: medicalStaff, error } = await supabase
        .from('medical_staff')
        .select(`
          id,
          available,
          license_number,
          years_experience,
          qualification,
          bio,
          users (
            id,
            full_name,
            email,
            phone_number,
            date_of_birth,
            address
          ),
          specializations (
            specialization_name,
            category
          ),
          departments (
            department_name,
            description
          )
        `)
        .eq('available', true);

      if (error) throw error;

      // Transform data for frontend
      const doctorsData = medicalStaff.map(staff => ({
        id: staff.id,
        user_id: staff.users.id,
        name: staff.users.full_name,
        email: staff.users.email,
        phone: staff.users.phone_number,
        specialization: staff.specializations?.specialization_name || 'General Medicine',
        experience: staff.years_experience ? `${staff.years_experience} years` : 'Experienced',
        rating: 4.8,
        available: staff.available,
        image: '👨‍⚕️',
        bio: staff.bio || `Specialized in ${staff.specializations?.specialization_name || 'general medicine'}`,
        hospital: staff.departments?.department_name || 'Medical Center',
        address: staff.users.address || 'Medical Facility',
        qualification: staff.qualification,
        license: staff.license_number
      }));

      setDoctors(doctorsData);

      // Get unique specializations
      const uniqueSpecializations = [...new Set(doctorsData.map(doc => doc.specialization))];
      setSpecializations(['all', ...uniqueSpecializations]);

    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientSymptoms = async () => {
    if (!authUser) return;

    try {
      // Fetch recent diagnosis session symptoms for pre-population
      const { data: recentSession } = await supabase
        .from('diagnosis_sessions')
        .select(`
          id,
          created_at,
          diagnosis_session_symptoms (
            symptoms (symptom_name)
          )
        `)
        .eq('patient_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentSession && recentSession.diagnosis_session_symptoms) {
        const symptoms = recentSession.diagnosis_session_symptoms
          .map(session => session.symptoms.symptom_name)
          .join(', ');
        setPatientSymptoms(symptoms);
        setAppointmentReason(`Recent symptoms: ${symptoms}. Seeking professional diagnosis.`);
      }
    } catch (error) {
      console.error('Error fetching patient symptoms:', error);
    }
  };

  // Filter doctors based on search and specialization
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialization = specializationFilter === 'all' || doctor.specialization === specializationFilter;
    return matchesSearch && matchesSpecialization;
  });

  const handleBookAppointment = async () => {
    if (!authUser || !selectedDoctor || !selectedDate || !selectedTime) return;

    try {
      setBookingLoading(true);

      // First, get appointment status ID (assuming 'scheduled' status exists)
      const { data: statusData } = await supabase
        .from('appointment_statuses')
        .select('id')
        .eq('status_code', 'scheduled')
        .single();

      if (!statusData) {
        throw new Error('Appointment status not found');
      }

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: authUser.id,
          doctor_id: selectedDoctor.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status_id: statusData.id,
          reason: appointmentReason
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Add to appointment history
      await supabase
        .from('appointment_history')
        .insert({
          appointment_id: appointment.id,
          status_id: statusData.id,
          notes: 'Appointment scheduled by patient',
          changed_by: authUser.id
        });

      // If there are symptoms from diagnosis, link them to the appointment
      if (patientSymptoms) {
        const symptomNames = patientSymptoms.split(', ');
        const { data: symptoms } = await supabase
          .from('symptoms')
          .select('id, symptom_name')
          .in('symptom_name', symptomNames);

        if (symptoms && symptoms.length > 0) {
          const appointmentSymptoms = symptoms.map(symptom => ({
            appointment_id: appointment.id,
            symptom_id: symptom.id
          }));

          await supabase
            .from('appointment_symptoms')
            .insert(appointmentSymptoms);
        }
      }

      setCurrentStep(4);

    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBooking = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedTime('');
    setAppointmentReason('');
    setCurrentStep(1);
  };

  const goBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Get available dates (next 14 days, excluding weekends)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  const isTimeSlotAvailable = (date, time) => {
    return true;
  };

  const formatTimeDisplay = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  if (loading) {
    return (
      <DashboardLayout user={authUser} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading doctors...</span>
        </div>
      </DashboardLayout>
    );
  }

  // Main content wrapped in DashboardLayout
  return (
    <DashboardLayout user={authUser} navigation={navigation}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Back Button */}
          <button
            onClick={goBackToDashboard}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <CalendarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Book an Appointment</h1>
                <p className="text-lg text-gray-600">Schedule with specialized healthcare professionals</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step === currentStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center text-sm text-gray-600 mb-8">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Choose Doctor</span>
            <span className={`mx-6 ${currentStep >= 2 ? 'text-blue-600 font-medium' : ''}`}>Select Date & Time</span>
            <span className={`mx-6 ${currentStep >= 3 ? 'text-blue-600 font-medium' : ''}`}>Confirm Details</span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : ''}>Confirmation</span>
          </div>

          {/* Step 1: Choose Doctor */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Select a Doctor</h2>
              <p className="text-gray-600 mb-6">Choose from our specialized healthcare professionals</p>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search doctors by name or specialization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={specializationFilter}
                    onChange={(e) => setSpecializationFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
                  >
                    {specializations.map(spec => (
                      <option key={spec} value={spec}>
                        {spec === 'all' ? 'All Specializations' : spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredDoctors.map(doctor => (
                  <div
                    key={doctor.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedDoctor?.id === doctor.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${!doctor.available ? 'opacity-60' : ''}`}
                    onClick={() => doctor.available && setSelectedDoctor(doctor)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-4xl">{doctor.image}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                          {!doctor.available && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Unavailable</span>
                          )}
                        </div>
                        <p className="text-blue-600 font-medium">{doctor.specialization}</p>
                        <p className="text-sm text-gray-600 mt-1">{doctor.experience} experience • ⭐ {doctor.rating}</p>
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{doctor.bio}</p>
                        
                        <div className="flex items-center text-sm text-gray-600 mt-3">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {doctor.hospital}
                        </div>

                        {doctor.available && (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm text-green-600 font-medium">
                              Qualified: {doctor.qualification}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoctor(doctor);
                                setCurrentStep(2);
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                              Select Doctor
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredDoctors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No doctors found matching your criteria. Try adjusting your search.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {currentStep === 2 && selectedDoctor && (
            <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Date & Time</h2>
              
              {/* Doctor Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{selectedDoctor.image}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedDoctor.name}</h3>
                    <p className="text-blue-600">{selectedDoctor.specialization}</p>
                    <p className="text-sm text-gray-600">{selectedDoctor.hospital}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Date Selection */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    Select Date
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {availableDates.map(date => (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`p-3 border rounded-lg text-center transition-all duration-200 ${
                          selectedDate === date
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold">
                          {new Date(date).getDate()}
                        </div>
                        <div className="text-xs">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Available Time Slots
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                    {timeSlots.map(time => {
                      const isAvailable = isTimeSlotAvailable(selectedDate, time);
                      return (
                        <button
                          key={time}
                          onClick={() => isAvailable && setSelectedTime(time)}
                          disabled={!isAvailable}
                          className={`p-3 border rounded-lg text-center transition-all duration-200 ${
                            selectedTime === time
                              ? 'bg-green-600 text-white border-green-600'
                              : isAvailable
                              ? 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          }`}
                        >
                          {formatTimeDisplay(time)}
                          {!isAvailable && <div className="text-xs mt-1">Booked</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Appointment Reason with AI Symptoms Pre-population */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Reason for Appointment</h3>
                {patientSymptoms && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                      <strong>AI Symptom Analysis:</strong> Based on your recent symptoms: {patientSymptoms}
                    </p>
                  </div>
                )}
                <textarea
                  value={appointmentReason}
                  onChange={(e) => setAppointmentReason(e.target.value)}
                  placeholder="Please describe your symptoms or reason for booking this appointment..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                />
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Back to Doctors
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!selectedDate || !selectedTime}
                  className={`px-6 py-3 rounded-lg font-medium text-white ${
                    !selectedDate || !selectedTime
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Continue to Confirmation
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm Details */}
          {currentStep === 3 && selectedDoctor && (
            <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Appointment Details</h2>
              <p className="text-gray-600 mb-6">Please review your appointment information before booking</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                {/* Appointment Summary */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Appointment Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Doctor:</span>
                      <span className="font-medium">{selectedDoctor.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Specialization:</span>
                      <span className="font-medium">{selectedDoctor.specialization}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{formatTimeDisplay(selectedTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hospital:</span>
                      <span className="font-medium">{selectedDoctor.hospital}</span>
                    </div>
                  </div>
                </div>

                {/* Doctor Contact */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Doctor Information</h3>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-4xl">{selectedDoctor.image}</div>
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedDoctor.name}</h4>
                      <p className="text-blue-600">{selectedDoctor.specialization}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {selectedDoctor.address}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      {selectedDoctor.phone}
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Tip:</strong> Arrive 15 minutes early for your appointment and bring any relevant medical records.
                    </p>
                  </div>
                </div>
              </div>

              {/* Appointment Reason Preview */}
              {appointmentReason && (
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Appointment Reason</h3>
                  <p className="text-gray-700">{appointmentReason}</p>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Back to Scheduling
                </button>
                <button
                  onClick={handleBookAppointment}
                  disabled={bookingLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center disabled:opacity-50"
                >
                  {bookingLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Confirm & Book Appointment
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success Confirmation */}
          {currentStep === 4 && selectedDoctor && (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Appointment Booked Successfully!</h2>
              <p className="text-gray-600 mb-6">Your appointment has been confirmed and added to your schedule</p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto mb-6">
                <h3 className="font-semibold text-green-900 mb-3">Appointment Details</h3>
                <div className="text-left space-y-2">
                  <p><strong>Doctor:</strong> {selectedDoctor.name}</p>
                  <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {formatTimeDisplay(selectedTime)}</p>
                  <p><strong>Location:</strong> {selectedDoctor.hospital}</p>
                  <p><strong>Reference:</strong> APPT-{Date.now().toString().slice(-6)}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={resetBooking}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Book Another Appointment
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Back to Dashboard
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📧 A confirmation has been saved to your medical records. 
                  You'll see this appointment in your dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AppointmentBooking;