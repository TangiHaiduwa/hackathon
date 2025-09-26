import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
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
        
        // Test 1: Check if environment variables are set
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          setSupabaseStatus('error');
          setError('Supabase configuration missing. Please check environment variables.');
          return;
        }

        // Test 2: Test basic Supabase query
        const { data, error } = await supabase
          .from('roles')
          .select('count')
          .limit(1);

        if (error) {
          console.error('Supabase connection test failed:', error);
          setSupabaseStatus('error');
          setError(`Database connection error: ${error.message}`);
        } else {
          console.log('Supabase connection successful!');
          setSupabaseStatus('connected');
        }
      } catch (err) {
        console.error('Supabase connection test failed:', err);
        setSupabaseStatus('error');
        setError(`Connection failed: ${err.message}`);
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
      setError('First Name must be at least 2 characters long');
      return false;
    }
    if (formData.lastName.trim().length < 2) {
      setError('Last Name must be at least 2 characters long');
      return false;
    }
    if (!formData.dateOfBirth) {
      setError('Date of birth is required');
      return false;
    }
    
    // Validate age (at least 1 year old)
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
      setError('Database connection unavailable. Please try again later.');
      return;
    }

    if (!validateStep3()) return;

    setIsLoading(true);

    try {
      console.log('Starting registration with data:', {
        ...formData,
        password: '***' // Don't log actual password
      });

      const result = await signUp(formData);
      
      console.log('Registration result:', result);

      if (result.success) {
        // Registration successful
        navigate('/dashboard', { 
          state: { 
            message: 'Registration successful! Please check your email for verification.',
            type: 'success'
          }
        });
      } else {
        // Handle specific error cases
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
        <div className="mx-8 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-700 text-sm">Checking database connection...</span>
          </div>
        </div>
      );
    }

    if (supabaseStatus === 'error') {
      return (
        <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700 text-sm">
              Database connection issue: {error}. Please refresh the page or contact support.
            </span>
          </div>
        </div>
      );
    }

    if (supabaseStatus === 'connected') {
      return (
        <div className="mx-8 mt-6 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-700 text-sm">Database connection established</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Don't render form if connection check failed
  if (supabaseStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-red-600 text-white p-8 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Connection Error</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-gray-700 mb-6">
              Unable to connect to the database. This might be due to:
            </p>
            <ul className="text-left text-gray-600 mb-6 space-y-2">
              <li>• Incorrect Supabase configuration</li>
              <li>• Network connectivity issues</li>
              <li>• Database service temporarily unavailable</li>
            </ul>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShieldCheckIcon className="h-10 w-10 text-white" />
            <div>
              <span className="text-4xl font-bold">MESMTF</span>
              <span className="text-4xl font-light text-blue-200">Pro</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold">Patient Registration</h2>
          <p className="mt-2 opacity-90">
            Create your patient account to access medical services
          </p>
        </div>

        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Error Message */}
        {error && supabaseStatus === 'connected' && (
          <div className="mx-8 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === currentStep 
                    ? 'bg-blue-600 text-white' 
                    : step < currentStep 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-24 h-1 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-8">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Personal Info</span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>Contact Details</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>Account Setup</span>
          </div>
        </div>

        {/* Registration Form */}
        <form className="px-8 pb-8 space-y-6" onSubmit={handleSubmit}>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
      First Name *
    </label>
    <input
      id="firstName"
      name="firstName"
      type="text"
      required
      value={formData.firstName}
      onChange={handleChange}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
      placeholder="Enter your first name"
    />
  </div>
  
  <div>
    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
      Last Name *
    </label>
    <input
      id="lastName"
      name="lastName"
      type="text"
      required
      value={formData.lastName}
      onChange={handleChange}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
      placeholder="Enter your last name"
    />
  </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    max={new Date().toISOString().split('T')[0]}
                    disabled={isLoading || supabaseStatus !== 'connected'}
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    disabled={isLoading || supabaseStatus !== 'connected'}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="e.g., 264812345678"
                    disabled={isLoading || supabaseStatus !== 'connected'}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
                  disabled={isLoading || supabaseStatus !== 'connected'}
                >
                  Next: Contact Details
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900">Contact Details</h3>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  placeholder="Enter your email address"
                  disabled={isLoading || supabaseStatus !== 'connected'}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Residential Address *
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  placeholder="Enter your complete address including city and postal code"
                  disabled={isLoading || supabaseStatus !== 'connected'}
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition duration-200 font-medium disabled:opacity-50"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-medium disabled:opacity-50"
                  disabled={isLoading || supabaseStatus !== 'connected'}
                >
                  Next: Account Setup
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Account Setup */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900">Account Setup</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Minimum 8 characters"
                    minLength="8"
                    disabled={isLoading || supabaseStatus !== 'connected'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-11 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="Re-enter your password"
                    disabled={isLoading || supabaseStatus !== 'connected'}
                  />
                </div>
              </div>

              {/* Password requirements */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Password must contain:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                    • At least 8 characters
                  </li>
                  <li className={/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : ''}>
                    • One lowercase letter
                  </li>
                  <li className={/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : ''}>
                    • One uppercase letter
                  </li>
                  <li className={/(?=.*\d)/.test(formData.password) ? 'text-green-600' : ''}>
                    • One number
                  </li>
                </ul>
              </div>

              {/* Terms Agreement */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    disabled={isLoading || supabaseStatus !== 'connected'}
                  />
                  <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                      Privacy Policy
                    </a>. I understand that this account is for patient use only and medical staff accounts are created by administrators.
                  </label>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition duration-200 font-medium disabled:opacity-50"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || supabaseStatus !== 'connected'}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-200 font-medium disabled:opacity-50 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign in here
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Medical staff members: Please contact your administrator for account creation
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;