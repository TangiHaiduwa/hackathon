import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ShieldCheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  BuildingLibraryIcon,
  UserIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  // Role-based dashboard routing
  const getRoleDashboard = (role) => {
    switch (role?.toLowerCase()) {
      case 'patient':
        return '/dashboard';
      case 'doctor':
        return '/doctor-dashboard';
      case 'nurse':
        return '/nurse-dashboard';
      case 'pharmacist':
        return '/pharmacist-dashboard';
      case 'receptionist':
        return '/reception-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Attempting login with:', formData.email);
      
      // Use the actual Supabase authentication
      const result = await signIn(formData.email, formData.password);
      
      console.log('Login result:', result);

      if (result.success) {
        console.log('Login successful! User:', result.data.user);
        
        // Get user role from the users table with correct column names
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            role_id,
            roles (role_name)
          `)
          .eq('id', result.data.user.id)
          .single();

        if (userError) {
          console.error('Error fetching user role:', userError);
          console.log('Full error details:', userError);
          
          // Try alternative query if the first one fails
          const { data: altUserData, error: altError } = await supabase
            .from('users')
            .select('*')
            .eq('id', result.data.user.id)
            .single();
            
          if (altError) {
            console.error('Alternative query also failed:', altError);
            setError('Unable to fetch user profile. Please contact support.');
            setIsLoading(false);
            return;
          }
          
          console.log('Alternative user data:', altUserData);
          // Default to patient role if we can't determine the role
          navigate('/dashboard');
          return;
        }

        console.log('User data fetched:', userData);
        
        const userRole = userData.roles?.role_name || 'patient';
        console.log('User role determined:', userRole);
        
        // Redirect to role-specific dashboard
        const dashboardPath = getRoleDashboard(userRole);
        console.log('Redirecting to:', dashboardPath);
        
        navigate(dashboardPath, { 
          state: { 
            message: `Welcome back, ${userData.first_name || userData.last_name || 'User'}!`,
            type: 'success'
          }
        });
        
      } else {
        // Handle specific error cases
        if (result.error.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (result.error.includes('Email not confirmed')) {
          setError('Please verify your email address before logging in.');
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg">
              <BuildingLibraryIcon className="h-10 w-10 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">MESMTF</span>
                <span className="text-xl font-light text-blue-600 ml-1">Pro</span>
              </div>
              <p className="text-sm text-gray-600">Ministry of Health & Social Services</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Login Portal</h2>
          <p className="text-gray-600 text-sm">
            Access your healthcare account with secure authentication
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">Account Sign In</h3>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <EnvelopeIcon className="h-4 w-4 inline-block mr-1" />
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-gray-50"
                  placeholder="Enter your official email address"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <KeyIcon className="h-4 w-4 inline-block mr-1" />
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-gray-50"
                  placeholder="Enter your secure password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition duration-200" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition duration-200" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Keep me signed in
                </label>
              </div>

              <Link 
                to="/forgot-password" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition duration-200"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'transform hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="h-5 w-5 mr-2" />
                    Sign In to Portal
                  </>
                )}
              </button>
            </div>

            {/* Registration Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                New to MESMTF?{' '}
                <Link 
                  to="/register" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition duration-200"
                >
                  Create patient account
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Secure Authentication</span>
          </div>
          <p className="text-xs text-blue-600">
            Your medical data is protected with government-grade security protocols
          </p>
        </div>

        {/* Role Information */}
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Available Portal Access</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {['Patients', 'Doctors', 'Nurses', 'Pharmacists', 'Reception', 'Admin'].map((role) => (
              <div key={role} className="bg-white px-3 py-2 rounded-lg border border-gray-200">
                <span className="font-medium text-gray-700">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;