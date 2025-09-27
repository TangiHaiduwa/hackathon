import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const navigate = useNavigate();
  const { signUp } = useAuth();

  // Test Supabase connection on component mount
  useEffect(() => {
    const testSupabaseConnection = async () => {
      try {
        console.log('Testing Supabase connection...');
        
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          setSupabaseStatus('error');
          setError('System configuration issue. Please contact support.');
          return;
        }

        const { error } = await supabase
          .from('roles')
          .select('count')
          .limit(1);

        if (error) {
          console.error('Database connection test failed:', error);
          setSupabaseStatus('error');
        } else {
          console.log('Database connection successful!');
          setSupabaseStatus('connected');
        }
      } catch (err) {
        console.error('Connection test failed:', err);
        setSupabaseStatus('error');
      }
    };

    testSupabaseConnection();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (formData.firstName.trim().length < 2) {
      setError('First name must be at least 2 characters long');
      return false;
    }
    if (formData.lastName.trim().length < 2) {
      setError('Last name must be at least 2 characters long');
      return false;
    }
    if (!formData.dateOfBirth) {
      setError('Date of birth is required');
      return false;
    }
    
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 1) {
      setError('Please enter a valid date of birth');
      return false;
    }
    
    if (!formData.gender) {
      setError('Gender is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid phone number (10-15 digits)');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      setError('Email address is required');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    if (formData.address.trim().length < 10) {
      setError('Please enter a complete address');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (supabaseStatus !== 'connected') {
      setError('System temporarily unavailable. Please try again later.');
      return;
    }

    if (!validateStep3()) return;

    setIsLoading(true);

    try {
      const result = await signUp(formData);
      
      if (result.success) {
        // Redirect to login page with success message
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please check your email for verification and then login.',
            type: 'success'
          }
        });
      } else {
        if (result.error.includes('User already registered')) {
          setError('This email address is already registered. Please try logging in.');
        } else if (result.error.includes('invalid_email')) {
          setError('Please enter a valid email address.');
        } else if (result.error.includes('weak_password')) {
          setError('Password is too weak. Please choose a stronger password.');
        } else {
          setError(result.error || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Unexpected error during registration:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    setError('');
    
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  // Show connection status indicator
  const renderConnectionStatus = () => {
    if (supabaseStatus === 'checking') {
      return (
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2 sm:mr-3"></div>
            <span className="text-blue-700 text-xs sm:text-sm font-medium">Verifying system connection...</span>
          </div>
        </div>
      );
    }

    if (supabaseStatus === 'error') {
      return (
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2 sm:mr-3" />
            <span className="text-red-700 text-xs sm:text-sm font-medium">
              System temporarily unavailable. Please try again later.
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Don't render form if connection check failed
  if (supabaseStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 sm:p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold">System Unavailable</h2>
          </div>
          <div className="p-6 sm:p-8 text-center">
            <p className="text-gray-700 text-sm sm:text-base mb-6">
              We're experiencing technical difficulties. Please try again in a few moments.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium text-sm sm:text-base"
              >
                Retry Connection
              </button>
              <Link 
                to="/"
                className="block w-full border border-gray-300 text-gray-700 px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-gray-50 transition duration-200 font-medium text-sm sm:text-base"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl lg:max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden mx-2 sm:mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-white/20 p-2 sm:p-3 rounded-2xl">
                <UserCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
              <div>
                <div className="flex items-baseline">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold">MESMTF</span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-light text-blue-200 ml-1">Pro</span>
                </div>
                <p className="text-blue-100 text-xs sm:text-sm">Ministry of Health & Social Services</p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="bg-white/20 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm">
                Step {currentStep} of 3
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-6 text-center">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Patient Registration</h2>
            <p className="mt-1 sm:mt-2 opacity-90 text-sm sm:text-base">
              Create your secure patient account in three simple steps
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Error Message */}
        {error && supabaseStatus === 'connected' && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-3 sm:p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mr-2 sm:mr-3" />
              <p className="text-red-700 font-medium text-sm sm:text-base">{error}</p>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
          <div className="flex items-center justify-between mb-2">
            {['Personal Info', 'Contact Details', 'Account Setup'].map((label, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full border-2 ${
                  currentStep > index + 1 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : currentStep === index + 1
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                } transition-all duration-300`}>
                  {currentStep > index + 1 ? (
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  ) : (
                    <span className="font-semibold text-sm sm:text-base">{index + 1}</span>
                  )}
                </div>
                <span className={`mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-center ${
                  currentStep >= index + 1 ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Progress Bar */}
          <div className="relative mb-4 sm:mb-6 lg:mb-8">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 transform -translate-y-1/2"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-blue-600 transform -translate-y-1/2 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Registration Form */}
        <form className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 space-y-4 sm:space-y-6 lg:space-y-8" onSubmit={handleSubmit}>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="bg-blue-50 rounded-xl p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900 flex items-center">
                  <UserCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Personal Information
                </h3>
                <p className="text-blue-700 text-xs sm:text-sm mt-1">
                  Please provide your basic personal details
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <UserCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                    placeholder="Enter your first name"
                  />
                </div>
                
                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                    placeholder="Enter your last name"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="dateOfBirth" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                    Date of Birth *
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="gender" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                    placeholder="e.g., 264812345678"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center text-sm sm:text-base"
                >
                  Continue to Contact Details
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="bg-blue-50 rounded-xl p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Contact Details
                </h3>
                <p className="text-blue-700 text-xs sm:text-sm mt-1">
                  How we can contact you for appointments and updates
                </p>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
                  <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
                  <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                  Residential Address *
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                  placeholder="Enter your complete address including street, city, and postal code"
                />
              </div>

              <div className="flex justify-between pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-gray-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-gray-100 transition duration-200 font-medium border border-gray-300 disabled:opacity-50 flex items-center text-sm sm:text-base"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center text-sm sm:text-base"
                >
                  Continue to Account Setup
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Account Setup */}
          {currentStep === 3 && (
            <div className="space-y-4 sm:space-y-6 animate-fade-in">
              <div className="bg-blue-50 rounded-xl p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900 flex items-center">
                  <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Account Security
                </h3>
                <p className="text-blue-700 text-xs sm:text-sm mt-1">
                  Create secure credentials for your account
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2 flex items-center">
                    <LockClosedIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                    placeholder="Minimum 8 characters"
                    minLength="8"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-8 sm:top-11 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 text-sm sm:text-base"
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>

              {/* Password requirements */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                  <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center ${/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/(?=.*[a-z])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One lowercase letter
                  </div>
                  <div className={`flex items-center ${/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/(?=.*[A-Z])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One uppercase letter
                  </div>
                  <div className={`flex items-center ${/(?=.*\d)/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${/(?=.*\d)/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    One number
                  </div>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 flex-shrink-0"
                  />
                  <label htmlFor="terms" className="ml-3 text-xs sm:text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                      Privacy Policy
                    </a>. I understand that this account is for patient use only.
                  </label>
                </div>
              </div>

              <div className="flex justify-between pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-gray-600 px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-gray-100 transition duration-200 font-medium border border-gray-300 disabled:opacity-50 flex items-center text-sm sm:text-base"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center text-sm sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Complete Registration
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-t text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign in to your account
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-1 sm:mt-2">
            Medical staff members: Please contact your administrator for account setup
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;