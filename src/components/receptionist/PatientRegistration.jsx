// src/pages/PatientRegistration.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  UserCircleIcon,
  IdentificationIcon,
  PhoneIcon as PhoneSolid,
  EnvelopeIcon,
  MapPinIcon,
  CakeIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const PatientRegistration = () => {
  const [user, setUser] = useState({
    name: 'Receptionist Lisa Brown',
    email: 'reception@demo.com',
    role: 'receptionist',
    department: 'Front Desk'
  });

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    postalCode: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Medical Information
    bloodType: '',
    insuranceProvider: '',
    insuranceNumber: '',
    medicalHistory: '',
    knownAllergies: '',
    
    // Account Information
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [genders, setGenders] = useState([]);
  const [bloodTypes, setBloodTypes] = useState([]);

  const navigation = [
      { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: true },
      { name: 'Appointments', href: '/receptionist/receptionist-appointments', icon: CalendarIcon, current: false },
      { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
      { name: 'Scheduling', href: '/receptionist/scheduling', icon: ClockIcon, current: false },
      { name: 'Medical Records', href: '/reception/medical-records1', icon: ClockIcon, current: false },
  
  
    ];

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      // Fetch genders
      const { data: gendersData } = await supabase
        .from('genders')
        .select('*')
        .order('gender_name');

      // Fetch blood types
      const { data: bloodTypesData } = await supabase
        .from('blood_types')
        .select('*')
        .order('blood_type_code');

      setGenders(gendersData || []);
      setBloodTypes(bloodTypesData || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: 'patient'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please use a different email.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Get patient role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'patient')
        .single();

      if (roleError) throw roleError;

      // Step 3: Get gender ID
      let genderId = null;
      if (formData.gender) {
        const { data: genderData } = await supabase
          .from('genders')
          .select('id')
          .eq('gender_code', formData.gender)
          .single();
        genderId = genderData?.id;
      }

      // Step 4: Get blood type ID
      let bloodTypeId = null;
      if (formData.bloodType) {
        const { data: bloodTypeData } = await supabase
          .from('blood_types')
          .select('id')
          .eq('blood_type_code', formData.bloodType)
          .single();
        bloodTypeId = bloodTypeData?.id;
      }

      // Step 5: Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role_id: roleData.id,
          phone_number: formData.phone,
          date_of_birth: formData.dateOfBirth,
          gender_id: genderId,
          address: formData.address
        });

      if (userError) {
        // If user creation fails, delete the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw userError;
      }

      // Step 6: Create patient record
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: authData.user.id,
          blood_type_id: bloodTypeId,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          insurance_provider: formData.insuranceProvider,
          insurance_number: formData.insuranceNumber
        });

      if (patientError) {
        // Rollback: delete user record and auth user
        await supabase.from('users').delete().eq('id', authData.user.id);
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw patientError;
      }

      // Step 7: Add medical history and allergies if provided
      if (formData.medicalHistory || formData.knownAllergies) {
        // This would require additional tables for medical history and allergies
        console.log('Medical history and allergies to be recorded:', {
          medicalHistory: formData.medicalHistory,
          knownAllergies: formData.knownAllergies
        });
      }

      setSuccess(true);
      resetForm();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (error) {
      console.error('Error registering patient:', error);
      setError(error.message || 'Failed to register patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      city: '',
      postalCode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      bloodType: '',
      insuranceProvider: '',
      insuranceNumber: '',
      medicalHistory: '',
      knownAllergies: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
          <p className="text-gray-600">Register new patients in the system</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-800">
              Patient registered successfully! A verification email has been sent to the patient.
            </span>
            <button 
              onClick={() => setSuccess(false)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <span className="text-red-800">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">New Patient Information</h2>
            <p className="text-sm text-gray-600">Fill in all required fields to register a new patient</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Personal Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <UserCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    className="input-medical"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    className="input-medical"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      className="input-medical pl-10"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="patient@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <PhoneSolid className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      className="input-medical pl-10"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+264 00 000 0000"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <CakeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      className="input-medical pl-10"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    required
                    className="input-medical"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Gender</option>
                    {genders.map(gender => (
                      <option key={gender.gender_code} value={gender.gender_code}>
                        {gender.gender_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                      name="address"
                      required
                      rows={3}
                      className="input-medical pl-10"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Full residential address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <IdentificationIcon className="h-5 w-5 mr-2 text-orange-600" />
                Emergency Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    required
                    className="input-medical"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    placeholder="Full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    required
                    className="input-medical"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    name="emergencyContactRelationship"
                    required
                    className="input-medical"
                    value={formData.emergencyContactRelationship}
                    onChange={handleInputChange}
                    placeholder="e.g., Spouse, Parent, Child"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Type
                  </label>
                  <select
                    name="bloodType"
                    className="input-medical"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Blood Type</option>
                    {bloodTypes.map(bloodType => (
                      <option key={bloodType.blood_type_code} value={bloodType.blood_type_code}>
                        {bloodType.blood_type_code} - {bloodType.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    name="insuranceProvider"
                    className="input-medical"
                    value={formData.insuranceProvider}
                    onChange={handleInputChange}
                    placeholder="Insurance company name"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Number
                  </label>
                  <input
                    type="text"
                    name="insuranceNumber"
                    className="input-medical"
                    value={formData.insuranceNumber}
                    onChange={handleInputChange}
                    placeholder="Policy number"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical History
                  </label>
                  <textarea
                    name="medicalHistory"
                    rows={3}
                    className="input-medical"
                    value={formData.medicalHistory}
                    onChange={handleInputChange}
                    placeholder="Previous medical conditions, surgeries, etc."
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Known Allergies
                  </label>
                  <textarea
                    name="knownAllergies"
                    rows={2}
                    className="input-medical"
                    value={formData.knownAllergies}
                    onChange={handleInputChange}
                    placeholder="List any known allergies"
                  />
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="input-medical"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    className="input-medical"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter password"
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
                disabled={loading}
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-5 w-5" />
                    Register Patient
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <UserCircleIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">Total Patients</p>
                <p className="text-2xl font-bold text-blue-700">1,247</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Registered Today</p>
                <p className="text-2xl font-bold text-green-700">12</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-900">Active Patients</p>
                <p className="text-2xl font-bold text-purple-700">893</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientRegistration;