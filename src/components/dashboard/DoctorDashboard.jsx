// DoctorDashboard.jsx (Updated for your schema and layout)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import supabase from '../../lib/supabase';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BeakerIcon,
  TruckIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  LightBulbIcon,
  AcademicCapIcon,
  BellIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const DoctorDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    todaysAppointments: 0,
    activePatients: 0,
    pendingDiagnoses: 0,
    urgentCases: 0,
    prescriptionsPending: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [urgentCases, setUrgentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Doctor sidebar navigation
  const navigation = [
    { name: 'Dashboard', href: '/doctor-dashboard', icon: HomeIcon },
    { name: 'My Appointments', href: '/doctor-appointments', icon: CalendarIcon },
    { name: 'Patient Diagnosis', href: '/doctor-diagnosis', icon: UserGroupIcon },
    { name: 'Medical Records', href: '/doctor-medical-records', icon: ClipboardDocumentListIcon },
    { name: 'Treatment & Prescriptions', href: '/doctor-prescriptions', icon: DocumentTextIcon },
    { name: 'Pharmacy Orders', href: '/doctor-pharmacy', icon: BeakerIcon },
    { name: 'Drug Administration', href: '/doctor-drug-admin', icon: TruckIcon },
    { name: 'Reporting', href: '/doctor-reporting', icon: ChartBarIcon },
    { name: 'Search', href: '/doctor-search', icon: MagnifyingGlassIcon },
    { name: 'Decision Support', href: '/doctor-decision-support', icon: LightBulbIcon },
    { name: 'Resources', href: '/doctor-resources', icon: AcademicCapIcon },
  ];

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      setError('Authentication required');
      navigate('/login');
      return;
    }

    // Fetch doctor profile with role information
    const { data: doctorProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        first_name, 
        last_name, 
        phone_number,
        role_id (
          role_name
        )
      `)
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw profileError;
    }

    // Fetch medical staff details separately
    const { data: medicalStaff, error: staffError } = await supabase
      .from('medical_staff')
      .select(`
        specialization_id (specialization_name),
        department_id (department_name),
        license_number
      `)
      .eq('id', authUser.id)
      .single();

    if (staffError) {
      console.error('Medical staff error:', staffError);
    }

    setUser({
      id: doctorProfile.id,
      name: `${doctorProfile.first_name} ${doctorProfile.last_name}`,
      email: doctorProfile.email,
      phone: doctorProfile.phone_number,
      role: doctorProfile.role_id?.role_name || 'doctor',
      specialization: medicalStaff?.specialization_id?.specialization_name || 'General Practitioner',
      licenseNumber: medicalStaff?.license_number || 'N/A',
      department: medicalStaff?.department_id?.department_name || 'General Medicine'
    });

    // Fetch all dashboard data
    await Promise.all([
      fetchDashboardStats(doctorProfile.id),
      fetchTodaysAppointments(doctorProfile.id),
      fetchRecentPatients(doctorProfile.id),
      fetchUrgentCases(doctorProfile.id)
    ]);

  } catch (err) {
    console.error('Error fetching doctor data:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  const fetchDashboardStats = async (doctorId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Today's appointments count (count all appointments for today, not just confirmed)
    const { count: appointmentsCount, error: apptError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('appointment_date', today);

    if (apptError) console.error('Appointment count error:', apptError);

    // Active patients (patients with appointments or diagnoses in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get unique patient IDs from recent appointments and diagnoses
    const { data: recentAppointments } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', thirtyDaysAgo);

    const { data: recentDiagnoses } = await supabase
      .from('medical_diagnoses')
      .select('patient_id')
      .eq('doctor_id', doctorId)
      .gte('diagnosis_date', thirtyDaysAgo);

    // Combine and get unique patient IDs
    const allPatientIds = [
      ...(recentAppointments?.map(apt => apt.patient_id) || []),
      ...(recentDiagnoses?.map(diag => diag.patient_id) || [])
    ];
    const uniquePatientIds = [...new Set(allPatientIds)];
    const activePatientsCount = uniquePatientIds.length;

    // Pending diagnoses (count diagnoses without specific status filter)
    const { count: pendingDiagnosesCount, error: diagError } = await supabase
      .from('medical_diagnoses')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doctorId);

    if (diagError) console.error('Diagnosis count error:', diagError);

    // Urgent cases (high severity)
    const { count: urgentCasesCount, error: urgentError } = await supabase
      .from('medical_diagnoses')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('severity', 'severe');

    if (urgentError) console.error('Urgent cases error:', urgentError);

    // Pending prescriptions (count all prescriptions for this doctor)
    const { count: prescriptionsPendingCount, error: presError } = await supabase
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', doctorId);

    if (presError) console.error('Prescription count error:', presError);

    setStats({
      todaysAppointments: appointmentsCount || 0,
      activePatients: activePatientsCount || 0,
      pendingDiagnoses: pendingDiagnosesCount || 0,
      urgentCases: urgentCasesCount || 0,
      prescriptionsPending: prescriptionsPendingCount || 0
    });

  } catch (err) {
    console.error('Error fetching stats:', err);
  }
};

  const fetchTodaysAppointments = async (doctorId) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // First get appointments
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status_id (status_name),
        reason,
        patient_id
      `)
      .eq('doctor_id', doctorId)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true })
      .limit(5);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      setTodayAppointments([]);
      return;
    }

    // Get patient IDs
    const patientIds = appointments.map(apt => apt.patient_id);
    
    // Fetch patient names from users table
    const { data: patients, error: patientsError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', patientIds);

    if (patientsError) throw patientsError;

    // Combine the data
    const appointmentsWithPatientNames = appointments.map(apt => {
      const patient = patients.find(p => p.id === apt.patient_id);
      return {
        id: apt.id,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        time: apt.appointment_time?.substring(0, 5) || 'N/A',
        status: apt.status_id?.status_name || 'Scheduled',
        reason: apt.reason || 'General Consultation'
      };
    });

    setTodayAppointments(appointmentsWithPatientNames);
  } catch (err) {
    console.error('Error fetching appointments:', err);
  }
};

  const fetchRecentPatients = async (doctorId) => {
  try {
    // Get recent diagnoses
    const { data: diagnoses, error } = await supabase
      .from('medical_diagnoses')
      .select(`
        patient_id,
        diagnosis_date,
        disease_id (disease_name),
        status_id (status_name),
        severity
      `)
      .eq('doctor_id', doctorId)
      .order('diagnosis_date', { ascending: false })
      .limit(4);

    if (error) throw error;

    if (!diagnoses || diagnoses.length === 0) {
      setRecentPatients([]);
      return;
    }

    // Get patient IDs
    const patientIds = diagnoses.map(diag => diag.patient_id);
    
    // Fetch patient details from users table
    const { data: patients, error: patientsError } = await supabase
      .from('users')
      .select('id, first_name, last_name, date_of_birth')
      .in('id', patientIds);

    if (patientsError) throw patientsError;

    // Combine the data
    const recentPatientsData = diagnoses.map(diag => {
      const patient = patients.find(p => p.id === diag.patient_id);
      return {
        id: diag.patient_id,
        name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        age: patient?.date_of_birth 
          ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
          : 'Unknown',
        lastVisit: new Date(diag.diagnosis_date).toLocaleDateString(),
        condition: diag.disease_id?.disease_name || 'Unknown Condition',
        status: diag.status_id?.status_name || 'Unknown Status',
        severity: diag.severity || 'mild'
      };
    });

    setRecentPatients(recentPatientsData);
  } catch (err) {
    console.error('Error fetching recent patients:', err);
  }
};

  const fetchUrgentCases = async (doctorId) => {
  try {
    // Get urgent cases
    const { data: diagnoses, error } = await supabase
      .from('medical_diagnoses')
      .select(`
        patient_id,
        disease_id (disease_name),
        severity,
        diagnosis_date,
        notes
      `)
      .eq('doctor_id', doctorId)
      .eq('severity', 'severe')
      .order('diagnosis_date', { ascending: false })
      .limit(3);

    if (error) throw error;

    if (!diagnoses || diagnoses.length === 0) {
      setUrgentCases([]);
      return;
    }

    // Get patient IDs
    const patientIds = diagnoses.map(diag => diag.patient_id);
    
    // Fetch patient names from users table
    const { data: patients, error: patientsError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', patientIds);

    if (patientsError) throw patientsError;

    // Combine the data
    const urgentCasesData = diagnoses.map(caseItem => {
      const patient = patients.find(p => p.id === caseItem.patient_id);
      return {
        id: caseItem.patient_id,
        patientName: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient',
        condition: caseItem.disease_id?.disease_name || 'Severe Condition',
        severity: caseItem.severity,
        date: new Date(caseItem.diagnosis_date).toLocaleDateString(),
        notes: caseItem.notes || 'Urgent attention required'
      };
    });

    setUrgentCases(urgentCasesData);
  } catch (err) {
    console.error('Error fetching urgent cases:', err);
  }
};

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading Doctor Dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-600 text-lg">Error: {error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="ml-4 btn-primary"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome, Dr. {user?.name}</h1>
            <p className="text-gray-600 mt-2">
              {user?.specialization} • {user?.department}
            </p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                License: {user?.licenseNumber}
              </span>
              <span className="text-sm text-gray-500">{user?.email}</span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => navigate('/doctor-appointments')}
              className="btn-primary flex items-center"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              View Schedule
            </button>
            <button 
              onClick={() => navigate('/doctor-diagnosis')}
              className="btn-secondary flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Diagnosis
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="card-medical">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todaysAppointments}</p>
            </div>
          </div>
        </div>

        <div className="card-medical">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activePatients}</p>
            </div>
          </div>
        </div>

        <div className="card-medical">
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Diagnoses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingDiagnoses}</p>
            </div>
          </div>
        </div>

        <div className="card-medical">
          <div className="flex items-center">
            <BellIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Urgent Cases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.urgentCases}</p>
            </div>
          </div>
        </div>

        <div className="card-medical">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Prescriptions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.prescriptionsPending}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Today's Appointments</h3>
            </div>
            <div className="p-6">
              {todayAppointments.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition duration-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{appointment.patientName}</p>
                        <p className="text-sm text-gray-600">Time: {appointment.time}</p>
                        {appointment.reason && (
                          <p className="text-sm text-gray-500">Reason: {appointment.reason}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        appointment.status.toLowerCase().includes('confirm') 
                          ? 'bg-green-100 text-green-800' 
                          : appointment.status.toLowerCase().includes('pending')
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments scheduled for today</p>
                  <button 
                    onClick={() => navigate('/doctor-appointments')}
                    className="btn-primary mt-4"
                  >
                    Schedule Appointments
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Patients */}
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Patients</h3>
            </div>
            <div className="p-6">
              {recentPatients.length > 0 ? (
                <div className="space-y-4">
                  {recentPatients.map((patient) => (
                    <div 
                      key={patient.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition duration-200 cursor-pointer"
                      onClick={() => navigate(`/doctor-medical-records?patient=${patient.id}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-600">
                          Age: {patient.age} • Last Visit: {patient.lastVisit}
                        </p>
                        <p className="text-sm text-gray-500">Condition: {patient.condition}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.severity === 'severe' 
                          ? 'bg-red-100 text-red-800' 
                          : patient.severity === 'moderate'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {patient.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent patients</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Urgent Cases and Quick Actions */}
        <div className="space-y-8">
          {/* Urgent Cases */}
          <div className="card-medical border-red-200">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-semibold text-red-900 flex items-center">
                <BellIcon className="h-5 w-5 mr-2" />
                Urgent Cases
              </h3>
            </div>
            <div className="p-6">
              {urgentCases.length > 0 ? (
                <div className="space-y-4">
                  {urgentCases.map((urgentCase) => (
                    <div key={urgentCase.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <p className="font-medium text-red-900">{urgentCase.patientName}</p>
                      <p className="text-sm text-red-700">{urgentCase.condition}</p>
                      <p className="text-xs text-red-600 mt-1">Diagnosed: {urgentCase.date}</p>
                      {urgentCase.notes && (
                        <p className="text-xs text-red-500 mt-1 truncate">Notes: {urgentCase.notes}</p>
                      )}
                      <button 
                        onClick={() => navigate(`/doctor-medical-records?patient=${urgentCase.id}`)}
                        className="w-full mt-2 bg-red-600 text-white py-2 rounded text-sm hover:bg-red-700 transition duration-200"
                      >
                        Review Case
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
                    <BellIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-green-600 font-medium">No urgent cases</p>
                  <p className="text-green-500 text-sm">All patients are stable</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-medical">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <button 
                onClick={() => navigate('/doctor-diagnosis')}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-200 text-left flex items-center"
              >
                <UserGroupIcon className="h-5 w-5 mr-3" />
                Start New Diagnosis
              </button>
              <button 
                onClick={() => navigate('/doctor-prescriptions')}
                className="w-full border border-blue-600 text-blue-600 p-3 rounded-lg hover:bg-blue-50 transition duration-200 text-left flex items-center"
              >
                <DocumentTextIcon className="h-5 w-5 mr-3" />
                Write Prescription
              </button>
              <button 
                onClick={() => navigate('/doctor-medical-records')}
                className="w-full border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition duration-200 text-left flex items-center"
              >
                <ClipboardDocumentListIcon className="h-5 w-5 mr-3" />
                View Medical Records
              </button>
              <button 
                onClick={() => navigate('/doctor-reporting')}
                className="w-full border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition duration-200 text-left flex items-center"
              >
                <ChartBarIcon className="h-5 w-5 mr-3" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;