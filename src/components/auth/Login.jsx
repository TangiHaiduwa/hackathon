import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ShieldCheckIcon,
  EnvelopeIcon,
  LockClosedIcon
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

  // Demo login function (for testing without real accounts)
  const handleDemoLogin = async (demoEmail, demoPassword, role) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Try demo credentials first
      if (demoPassword === 'demo123') {
        console.log('Using demo account:', demoEmail);
        
        // For demo purposes, we'll simulate a successful login
        const demoUser = {
          id: `demo-${role}-id`,
          email: demoEmail,
          user_metadata: { full_name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}` }
        };
        
        // Store demo user in localStorage for session management
        localStorage.setItem('demoUser', JSON.stringify({
          ...demoUser,
          role: role
        }));
        
        const dashboardPath = getRoleDashboard(role);
        navigate(dashboardPath, { 
          state: { 
            message: `Demo mode: Welcome ${demoUser.user_metadata.full_name}!`,
            type: 'info',
            isDemo: true
          }
        });
        return;
      }
      
      // If not demo password, try real authentication
      const result = await signIn(demoEmail, demoPassword);
      
      if (result.success) {
        // Real authentication successful
        const { data: userData } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            roles (role_name)
          `)
          .eq('id', result.data.user.id)
          .single();

        const userRole = userData?.roles?.role_name || 'patient';
        const dashboardPath = getRoleDashboard(userRole);
        
        navigate(dashboardPath, { 
          state: { 
            message: `Welcome back, ${userData?.first_name || userData?.last_name || 'User'}!`,
            type: 'success'
          }
        });
      } else {
        setError('Invalid credentials for demo account.');
      }
      
    } catch (error) {
      console.error('Demo login error:', error);
      setError('Demo login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add debug function to check database structure
  const debugDatabaseStructure = async () => {
    try {
      console.log('=== DEBUG: Checking database structure ===');
      
      // Check users table structure
      const { data: usersSample, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      console.log('Users table sample:', usersSample);
      console.log('Users table error:', usersError);
      
      // Check roles table structure
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*');
      
      console.log('Roles table:', roles);
      console.log('Roles table error:', rolesError);
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  // Uncomment the line below to debug database structure when component mounts
  // useEffect(() => { debugDatabaseStructure(); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-3xl font-bold text-gray-900">MESMTF</span>
              <span className="text-3xl font-light text-blue-600">Pro</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your medical account
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Enter your email address"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )
                }
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
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'transform hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in to your account'
              )}
            </button>
          </div>

          {/* Registration Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Register as a patient
              </Link>
            </p>
          </div>

          {/* Demo Accounts Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">Demo Accounts (For Testing)</h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { role: 'patient', email: 'patient@demo.com' },
                { role: 'doctor', email: 'doctor@demo.com' },
                { role: 'nurse', email: 'nurse@demo.com' },
                { role: 'pharmacist', email: 'pharmacist@demo.com' },
                { role: 'receptionist', email: 'reception@demo.com' },
                { role: 'admin', email: 'admin@demo.com' }
              ].map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => handleDemoLogin(account.email, 'demo123', account.role)}
                  disabled={isLoading}
                  className="flex justify-between items-center p-2 bg-white rounded hover:bg-gray-100 transition duration-200 disabled:opacity-50"
                >
                  <span className="font-medium capitalize">{account.role}:</span>
                  <span>{account.email} / demo123</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Click any demo account to login instantly
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;