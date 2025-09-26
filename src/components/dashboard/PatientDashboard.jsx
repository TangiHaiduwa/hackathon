import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  HomeIcon,
  UserCircleIcon,
  CalendarIcon,
  HeartIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const PatientDashboard = () => {
  const [user, setUser] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentDiagnoses, setRecentDiagnoses] = useState([]);
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    activeDiagnoses: 0,
    pendingResults: 0
  });
  const [loading, setLoading] = useState(true);
  const { user: authUser, signOut } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Medical Records', href: '/patient-medical-records', icon: UserCircleIcon },
    { name: 'Book Appointment', href: '/appointment', icon: CalendarIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: HeartIcon },
    // { name: 'Pharmacy', href: '/pharmacy', icon: BuildingLibraryIcon },
    // { name: 'Reports', href: '/reporting', icon: ChartBarIcon },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        
        // Fetch user profile from database - FIXED
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone_number,
            date_of_birth,
            address,
            created_at,
            roles (role_name)
          `)
          .eq('id', authUser.id)
          .single();

        if (userError) throw userError;

        setUser({
          ...userData,
          role: userData.roles?.role_name || 'patient'
        });

        // Fetch upcoming appointments - FIXED
        const { data: appointments } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status_id,
            medical_staff (
              users (first_name, last_name)
            )
          `)
          .eq('patient_id', authUser.id)
          .gte('appointment_date', new Date().toISOString().split('T')[0])
          .order('appointment_date', { ascending: true })
          .limit(3);

        setUpcomingAppointments(appointments || []);

        // Fetch recent diagnoses
        const { data: diagnoses } = await supabase
          .from('medical_diagnoses')
          .select(`
            id,
            diagnosis_date,
            severity,
            status_id,
            diseases (disease_name)
          `)
          .eq('patient_id', authUser.id)
          .order('diagnosis_date', { ascending: false })
          .limit(3);

        setRecentDiagnoses(diagnoses || []);

        // Calculate stats
        setStats({
          upcomingAppointments: appointments?.length || 0,
          activeDiagnoses: diagnoses?.filter(d => d.status_id !== 'treated')?.length || 0,
          pendingResults: 0 // You can add logic for pending results
        });

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  // Format appointment data for display - FIXED
  const formatAppointments = (appointments) => {
    return appointments.map(apt => ({
      id: apt.id,
      doctor: apt.medical_staff?.users ? 
        `${apt.medical_staff.users.first_name} ${apt.medical_staff.users.last_name}` : 'Doctor',
      date: new Date(apt.appointment_date).toLocaleDateString(),
      time: apt.appointment_time,
      type: 'Consultation'
    }));
  };

  // Format diagnoses data for display
  const formatDiagnoses = (diagnoses) => {
    return diagnoses.map(diag => ({
      id: diag.id,
      condition: diag.diseases?.disease_name || 'Medical Condition',
      date: new Date(diag.diagnosis_date).toLocaleDateString(),
      status: diag.status_id === 'treated' ? 'Treated' : 'Confirmed',
      severity: diag.severity || 'Moderate'
    }));
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load user data.</p>
          <button
            onClick={signOut}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Sign Out
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Success Message from Login */}
      {location.state?.message && (
        <div className={`mb-6 p-4 rounded-lg ${
          location.state.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          location.state.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {location.state.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Patient'}! Here's your health overview.
        </p>
        <div className="mt-2 text-sm text-gray-500">
          Member since {new Date(user.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.upcomingAppointments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HeartIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Diagnoses</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeDiagnoses}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Results</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingResults}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/appointment" 
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Book Appointment
          </Link>
          <Link 
            to="/diagnosis" 
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition duration-200 flex items-center justify-center"
          >
            <HeartIcon className="h-5 w-5 mr-2" />
            Symptom Checker
          </Link>
          <Link 
            to="/medical-records" 
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center"
          >
            <UserCircleIcon className="h-5 w-5 mr-2" />
            Medical Records
          </Link>
          <Link 
            to="/pharmacy" 
            className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition duration-200 flex items-center justify-center"
          >
            <BuildingLibraryIcon className="h-5 w-5 mr-2" />
            Pharmacy
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
            <Link to="/appointment" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
              View All <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="p-6">
            {upcomingAppointments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {formatAppointments(upcomingAppointments).map((appointment) => (
                  <li key={appointment.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{appointment.doctor}</p>
                        <p className="text-sm text-gray-500">{appointment.date} at {appointment.time}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {appointment.type}
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Reschedule
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming appointments</p>
                <Link to="/appointment" className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                  Book your first appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Diagnoses */}
        <div className="bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Recent Diagnoses</h3>
            <Link to="/medical-records" className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
              View All <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="p-6">
            {recentDiagnoses.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {formatDiagnoses(recentDiagnoses).map((diagnosis) => (
                  <li key={diagnosis.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{diagnosis.condition}</p>
                        <p className="text-sm text-gray-500">Diagnosed on {diagnosis.date}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            diagnosis.status === 'Confirmed' ? 'bg-red-100 text-red-800' :
                            diagnosis.status === 'Treated' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {diagnosis.status}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {diagnosis.severity}
                          </span>
                        </div>
                      </div>
                      {diagnosis.status === 'Confirmed' && (
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <HeartIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent diagnoses</p>
                <Link to="/diagnosis" className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block">
                  Start symptom checker
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Tips */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Health Tip of the Day</h3>
        <p className="text-blue-800">
          Remember to stay hydrated and maintain a balanced diet to support your immune system. 
          If you experience persistent symptoms like fever, headache, or abdominal pain, 
          use our symptom checker or consult with your healthcare provider.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;