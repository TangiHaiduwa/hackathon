// import React, { useState, useEffect } from 'react';
// import DashboardLayout from '../../components/layout/DashboardLayout';
// import { useAuth } from '../../contexts/AuthContext';
// import { supabase } from '../../lib/supabase';
// import { 
//   UserGroupIcon,
//   ClipboardDocumentListIcon,
//   BellIcon,
//   ChartBarIcon,
//   HeartIcon,
//   DocumentTextIcon,
//   CalendarIcon,
//   UserPlusIcon,
//   ExclamationTriangleIcon,
//   XMarkIcon
// } from '@heroicons/react/24/outline';

// const NurseDashboard = () => {
//   const { user: authUser } = useAuth();
//   const [user, setUser] = useState(null);
//   const [todaysAssignments, setTodaysAssignments] = useState([]);
//   const [medicationSchedule, setMedicationSchedule] = useState([]);
//   const [priorityAlerts, setPriorityAlerts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showPatientForm, setShowPatientForm] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [formSuccess, setFormSuccess] = useState('');
//   const [formError, setFormError] = useState('');
  
// const [newPatient, setNewPatient] = useState({
//   first_name: '',
//   last_name: '',
//   email: '',
//   phone_number: '',
//   date_of_birth: '', // Goes to users table
//   emergency_contact_name: '', // Goes to patients table
//   emergency_contact_phone: '' // Goes to patients table
// });

//   const navigation = [
//     { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
//     { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
//     { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
//     { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
//     { name: 'Medical Records', href: '/medical-records1', icon: DocumentTextIcon },
//     { name: 'Patient Rounds', href: '/patient-rounds-page', icon: DocumentTextIcon },
//   ];

//   // Fetch nurse data and dashboard information
//   useEffect(() => {
//     const fetchNurseData = async () => {
//       if (!authUser) return;

//       try {
//         setLoading(true);
        
//         // Get nurse profile
//         const { data: nurseData, error: nurseError } = await supabase
//           .from('users')
//           .select(`
//             *,
//             medical_staff!inner(
//               *,
//               departments(*)
//             ),
//             roles(*)
//           `)
//           .eq('id', authUser.id)
//           .single();

//         if (nurseError) throw nurseError;
//         setUser(nurseData);

//         // Fetch all dashboard data
//         const assignments = await fetchTodaysAssignments(authUser.id);
//         const medications = await fetchMedicationSchedule(authUser.id);
//         const alerts = await fetchPriorityAlerts(authUser.id);

//         setTodaysAssignments(assignments);
//         setMedicationSchedule(medications);
//         setPriorityAlerts(alerts);

//       } catch (error) {
//         console.error('Error fetching nurse data:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchNurseData();

//     // Set up real-time subscription for alerts
//     const subscription = supabase
//       .channel('nurse-dashboard')
//       .on('postgres_changes', 
//         { event: '*', schema: 'public', table: 'patient_alerts' },
//         () => {
//           fetchPriorityAlerts(authUser.id).then(setPriorityAlerts);
//         }
//       )
//       .subscribe();

//     return () => {
//       subscription.unsubscribe();
//     };
//   }, [authUser]);

//   // Fetch today's patient assignments
//   const fetchTodaysAssignments = async (nurseId) => {
//     try {
//       const { data: assignments, error: assignmentsError } = await supabase
//         .from('nurse_patient_assignments')
//         .select(`
//           patient_id,
//           patients!inner(
//             users!inner(
//               first_name,
//               last_name,
//               phone_number,
//               date_of_birth
//             ),
//             emergency_contact_name,
//             emergency_contact_phone
//           )
//         `)
//         .eq('nurse_id', nurseId)
//         .eq('is_active', true);

//       if (assignmentsError) throw assignmentsError;

//       if (!assignments || assignments.length === 0) {
//         return [];
//       }

//       const patientIds = assignments.map(assignment => assignment.patient_id);

//       // Fetch medical diagnoses for these patients
//       const { data: diagnosesData } = await supabase
//         .from('medical_diagnoses')
//         .select(`
//           patient_id,
//           severity,
//           diagnosis_date,
//           diseases(disease_name)
//         `)
//         .in('patient_id', patientIds)
//         .order('diagnosis_date', { ascending: false });

//       // Fetch latest vital signs for these patients
//       const { data: vitalsData } = await supabase
//         .from('vital_signs')
//         .select(`
//           patient_id,
//           heart_rate,
//           temperature,
//           recorded_at
//         `)
//         .in('patient_id', patientIds)
//         .order('recorded_at', { ascending: false });

//       // Fetch today's appointments
//       const today = new Date().toISOString().split('T')[0];
//       const appointmentData = await fetchTodaysAppointments(nurseId, today);

//       return assignments.map(assignment => {
//         const patientId = assignment.patient_id;
//         const patientDiagnoses = diagnosesData?.filter(d => d.patient_id === patientId) || [];
//         const patientVitals = vitalsData?.filter(v => v.patient_id === patientId) || [];
//         const patientAppointments = appointmentData.filter(apt => apt.patient_id === patientId);
        
//         const latestDiagnosis = patientDiagnoses[0];
//         const latestVitals = patientVitals[0];

//         return {
//           id: patientId,
//           name: `${assignment.patients.users.first_name} ${assignment.patients.users.last_name}`,
//           age: calculateAge(assignment.patients.users.date_of_birth),
//           condition: latestDiagnosis?.diseases?.disease_name || 'General care',
//           severity: latestDiagnosis?.severity || 'stable',
//           lastVitals: latestVitals?.recorded_at 
//             ? new Date(latestVitals.recorded_at).toLocaleTimeString() 
//             : 'No vitals',
//           heartRate: latestVitals?.heart_rate || '--',
//           temperature: latestVitals?.temperature || '--',
//           nextAppointment: patientAppointments[0]?.appointment_time || 'No appointment',
//           priority: getPatientPriority(latestDiagnosis?.severity)
//         };
//       });
//     } catch (error) {
//       console.error('Error fetching assignments:', error);
//       return [];
//     }
//   };

//   // Fetch today's appointments separately
//   const fetchTodaysAppointments = async (nurseId, today) => {
//     try {
//       const { data: assignments } = await supabase
//         .from('nurse_patient_assignments')
//         .select('patient_id')
//         .eq('nurse_id', nurseId)
//         .eq('is_active', true);

//       if (!assignments || assignments.length === 0) {
//         return [];
//       }

//       const patientIds = assignments.map(assignment => assignment.patient_id);

//       const { data, error } = await supabase
//         .from('appointments')
//         .select('*')
//         .in('patient_id', patientIds)
//         .eq('appointment_date', today)
//         .order('appointment_time', { ascending: true });

//       if (error) throw error;
//       return data || [];
//     } catch (error) {
//       console.error('Error fetching appointments:', error);
//       return [];
//     }
//   };

//   // Fetch medication administration schedule
//   const fetchMedicationSchedule = async (nurseId) => {
//     try {
//       const today = new Date().toISOString().split('T')[0];
//       const now = new Date();
      
//       const { data: assignments, error: assignmentsError } = await supabase
//         .from('nurse_patient_assignments')
//         .select('patient_id')
//         .eq('nurse_id', nurseId)
//         .eq('is_active', true);

//       if (assignmentsError) throw assignmentsError;

//       if (!assignments || assignments.length === 0) {
//         return [];
//       }

//       const patientIds = assignments.map(assignment => assignment.patient_id);

//       const { data, error } = await supabase
//         .from('medication_schedule')
//         .select(`
//           *,
//           prescription_items!inner(
//             dosage_instructions,
//             drugs!inner(
//               drug_name,
//               dosage
//             ),
//             prescriptions!inner(
//               patient_id
//             )
//           )
//         `)
//         .in('prescription_items.prescriptions.patient_id', patientIds)
//         .gte('scheduled_time', `${today}T00:00:00`)
//         .lte('scheduled_time', `${today}T23:59:59`)
//         .order('scheduled_time', { ascending: true });

//       if (error) throw error;

//       const medicationWithPatients = await Promise.all(
//         (data || []).map(async (med) => {
//           const { data: patientData } = await supabase
//             .from('patients')
//             .select(`
//               users!inner(
//                 first_name,
//                 last_name
//               )
//             `)
//             .eq('id', med.prescription_items.prescriptions.patient_id)
//             .single();

//           return {
//             id: med.id,
//             patient: patientData ? 
//               `${patientData.users.first_name} ${patientData.users.last_name}` : 
//               'Unknown Patient',
//             medication: med.prescription_items.drugs.drug_name,
//             dosage: med.prescription_items.drugs.dosage,
//             instructions: med.prescription_items.dosage_instructions,
//             scheduledTime: new Date(med.scheduled_time),
//             status: med.status,
//             isOverdue: med.status === 'scheduled' && new Date(med.scheduled_time) < now,
//             isCritical: med.prescription_items.drugs.dosage.includes('high') || 
//                        med.prescription_items.drugs.drug_name.toLowerCase().includes('critical')
//           };
//         })
//       );

//       return medicationWithPatients;
//     } catch (error) {
//       console.error('Error fetching medication schedule:', error);
//       return [];
//     }
//   };

//   // Fetch priority alerts
//   const fetchPriorityAlerts = async (nurseId) => {
//     try {
//       const { data: assignments, error: assignmentsError } = await supabase
//         .from('nurse_patient_assignments')
//         .select('patient_id')
//         .eq('nurse_id', nurseId)
//         .eq('is_active', true);

//       if (assignmentsError) throw assignmentsError;

//       if (!assignments || assignments.length === 0) {
//         return [];
//       }

//       const patientIds = assignments.map(assignment => assignment.patient_id);

//       const { data, error } = await supabase
//         .from('patient_alerts')
//         .select(`
//           *,
//           alert_types(*),
//           patients!inner(
//             users!inner(
//               first_name,
//               last_name
//             )
//           ),
//           vital_signs(
//             heart_rate,
//             temperature,
//             blood_pressure_systolic
//           )
//         `)
//         .in('patient_id', patientIds)
//         .eq('is_resolved', false)
//         .order('created_at', { ascending: false })
//         .limit(10);

//       if (error) throw error;

//       return (data || []).map(alert => ({
//         id: alert.id,
//         patient: `${alert.patients.users.first_name} ${alert.patients.users.last_name}`,
//         type: alert.alert_types.type_name,
//         severity: alert.alert_types.severity,
//         message: alert.message,
//         timestamp: new Date(alert.created_at),
//         vitalSigns: alert.vital_signs?.[0] || {},
//         isCritical: alert.alert_types.severity === 'critical'
//       }));
//     } catch (error) {
//       console.error('Error fetching alerts:', error);
//       return [];
//     }
//   };
// const addNewPatient = async (e) => {
//   e.preventDefault();
//   setIsSubmitting(true);
//   setFormError('');
//   setFormSuccess('');

//   try {
//     // Step 1: First check if email already exists in users table
//     const { data: existingUser } = await supabase
//       .from('users')
//       .select('id')
//       .eq('email', newPatient.email)
//       .single();

//     if (existingUser) {
//       throw new Error('A patient with this email already exists in the system.');
//     }

//     // Step 2: Create Auth user
//     const tempPassword = 'TempPass123!';
    
//     const { data: authData, error: authError } = await supabase.auth.signUp({
//       email: newPatient.email,
//       password: tempPassword,
//       options: {
//         data: {
//           first_name: newPatient.first_name,
//           last_name: newPatient.last_name
//         }
//       }
//     });

//     if (authError) {
//       if (authError.message.includes('already registered')) {
//         throw new Error('This email is already registered. Please use a different email.');
//       }
//       throw authError;
//     }

//     if (!authData.user) throw new Error('Failed to create user account');

//     // Small delay to ensure Auth user is fully created
//     await new Promise(resolve => setTimeout(resolve, 1000));

//     // Step 3: Get patient role ID
//     let roleId;
//     const { data: roleData } = await supabase
//       .from('roles')
//       .select('id')
//       .eq('role_name', 'patient')
//       .single();

//     if (!roleData) {
//       // Fallback if role not found
//       roleId = 'some-default-role-id';
//     } else {
//       roleId = roleData.id;
//     }

//     // Step 4: Create user record - use upsert to avoid duplicates
//     const { error: userError } = await supabase
//       .from('users')
//       .upsert({
//         id: authData.user.id,
//         email: newPatient.email,
//         first_name: newPatient.first_name,
//         last_name: newPatient.last_name,
//         role_id: roleId,
//         phone_number: newPatient.phone_number,
//         date_of_birth: newPatient.date_of_birth
//       }, {
//         onConflict: 'id',
//         ignoreDuplicates: false
//       });

//     if (userError) {
//       console.error('User creation error:', userError);
//       throw new Error('Failed to create user record. Please try again.');
//     }

//     // Step 5: Create patient record - use upsert
//     const { error: patientError } = await supabase
//       .from('patients')
//       .upsert({
//         id: authData.user.id,
//         emergency_contact_name: newPatient.emergency_contact_name,
//         emergency_contact_phone: newPatient.emergency_contact_phone
//       }, {
//         onConflict: 'id',
//         ignoreDuplicates: false
//       });

//     if (patientError) {
//       console.error('Patient creation error:', patientError);
//       throw new Error('Failed to create patient record. Please try again.');
//     }

//     setFormSuccess('Patient added successfully!');
    
//     // Reset form
//     setNewPatient({
//       first_name: '',
//       last_name: '',
//       email: '',
//       phone_number: '',
//       date_of_birth: '',
//       emergency_contact_name: '',
//       emergency_contact_phone: ''
//     });

//     // Refresh assignments
//     const updatedAssignments = await fetchTodaysAssignments(authUser.id);
//     setTodaysAssignments(updatedAssignments);

//     setTimeout(() => {
//       setShowPatientForm(false);
//       setFormSuccess('');
//     }, 2000);

//   } catch (error) {
//     console.error('Error adding patient:', error);
//     setFormError(error.message || 'Failed to add patient. Please try again.');
//   } finally {
//     setIsSubmitting(false);
//   }
// };

//   // Update form field handler
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setNewPatient(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   // Mark medication as administered
//   const markMedicationAdministered = async (medicationId) => {
//     try {
//       const { error } = await supabase
//         .from('medication_schedule')
//         .update({
//           status: 'administered',
//           administered_time: new Date().toISOString(),
//           administered_by: authUser.id
//         })
//         .eq('id', medicationId);

//       if (error) throw error;

//       const updatedSchedule = await fetchMedicationSchedule(authUser.id);
//       setMedicationSchedule(updatedSchedule);
//     } catch (error) {
//       console.error('Error marking medication administered:', error);
//       alert('Error updating medication status');
//     }
//   };

//   // Resolve alert
//   const resolveAlert = async (alertId) => {
//     try {
//       const { error } = await supabase
//         .from('patient_alerts')
//         .update({
//           is_resolved: true,
//           resolved_by: authUser.id,
//           resolved_at: new Date().toISOString()
//         })
//         .eq('id', alertId);

//       if (error) throw error;

//       const updatedAlerts = await fetchPriorityAlerts(authUser.id);
//       setPriorityAlerts(updatedAlerts);
//     } catch (error) {
//       console.error('Error resolving alert:', error);
//       alert('Error resolving alert');
//     }
//   };

//   const calculateAge = (dateOfBirth) => {
//     if (!dateOfBirth) return 'Unknown';
//     const today = new Date();
//     const birthDate = new Date(dateOfBirth);
//     let age = today.getFullYear() - birthDate.getFullYear();
//     const monthDiff = today.getMonth() - birthDate.getMonth();
    
//     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
//       age--;
//     }
    
//     return age;
//   };

//   const getPatientPriority = (severity) => {
//     switch (severity) {
//       case 'severe': return 'high';
//       case 'moderate': return 'medium';
//       default: return 'low';
//     }
//   };

//   const quickActions = [
//     {
//       icon: ClipboardDocumentListIcon,
//       label: 'Record Vitals',
//       description: 'Take patient vital signs',
//       color: 'green',
//       href: '/vitals'
//     },
//     {
//       icon: DocumentTextIcon,
//       label: 'Patient Notes',
//       description: 'Add clinical notes',
//       color: 'blue',
//       href: '/patient-care'
//     },
//     {
//       icon: CalendarIcon,
//       label: 'Schedule',
//       description: 'View daily schedule',
//       color: 'purple',
//       href: '/schedule'
//     },
//     {
//       icon: BellIcon,
//       label: 'Alerts',
//       description: 'Manage notifications',
//       color: 'orange',
//       href: '/alerts'
//     }
//   ];

//   if (loading) {
//     return (
//       <DashboardLayout user={{ name: 'Loading...', role: 'nurse' }} navigation={navigation}>
//         <div className="flex justify-center items-center h-64">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout user={user} navigation={navigation}>
//       {/* Header */}
//       <div className="mb-8">
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">Nurse Dashboard</h1>
//             <p className="text-gray-600">Good morning, {user?.first_name}. Here's your overview for today.</p>
//             <div className="flex items-center space-x-4 mt-2">
//               <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
//                 {user?.medical_staff?.departments?.department_name || 'General Ward'}
//               </span>
//               <span className="text-sm text-gray-500">
//                 {todaysAssignments.length} patients assigned today
//               </span>
//             </div>
//           </div>
//           <div className="flex space-x-3">
//             <button
//               onClick={() => setShowPatientForm(true)}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition duration-200"
//             >
//               <UserPlusIcon className="h-5 w-5" />
//               <span>Add New Patient</span>
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Priority Alerts Banner */}
//       {priorityAlerts.filter(alert => alert.isCritical).length > 0 && (
//         <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-2">
//               <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
//               <h3 className="text-lg font-medium text-red-800">Critical Alerts</h3>
//               <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm">
//                 {priorityAlerts.filter(alert => alert.isCritical).length}
//               </span>
//             </div>
//             <button className="text-red-700 hover:text-red-900 font-medium">
//               View All
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Main Dashboard Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         {/* Today's Assignments */}
//         <div className="lg:col-span-2">
//           <div className="bg-white shadow rounded-lg">
//             <div className="px-6 py-4 border-b border-gray-200">
//               <h2 className="text-xl font-semibold text-gray-900">Today's Patient Assignments</h2>
//               <p className="text-gray-600">Patients under your care for today</p>
//             </div>
//             <div className="p-6">
//               <div className="space-y-4">
//                 {todaysAssignments.map(patient => (
//                   <div key={patient.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200">
//                     <div className="flex items-center space-x-4">
//                       <div className={`w-3 h-3 rounded-full ${
//                         patient.priority === 'high' ? 'bg-red-500' :
//                         patient.priority === 'medium' ? 'bg-yellow-500' :
//                         'bg-green-500'
//                       }`}></div>
//                       <div>
//                         <h3 className="font-medium text-gray-900">{patient.name}</h3>
//                         <p className="text-sm text-gray-600">
//                           {patient.age} years • {patient.condition} • Priority: {patient.priority}
//                         </p>
//                         <div className="flex space-x-4 mt-1 text-xs text-gray-500">
//                           <span>HR: {patient.heartRate} bpm</span>
//                           <span>Temp: {patient.temperature}°C</span>
//                           <span>Last vitals: {patient.lastVitals}</span>
//                         </div>
//                       </div>
//                     </div>
//                     <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm transition duration-200">
//                       View Details
//                     </button>
//                   </div>
//                 ))}
//                 {todaysAssignments.length === 0 && (
//                   <p className="text-gray-500 text-center py-8">No patient assignments for today</p>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Medication Schedule */}
//         <div className="bg-white shadow rounded-lg">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h2 className="text-xl font-semibold text-gray-900">Medication Schedule</h2>
//             <p className="text-gray-600">Today's medication administration</p>
//           </div>
//           <div className="p-6">
//             <div className="space-y-3">
//               {medicationSchedule.map(med => (
//                 <div key={med.id} className={`p-3 border rounded-lg ${
//                   med.isOverdue ? 'border-red-200 bg-red-50' :
//                   med.status === 'administered' ? 'border-green-200 bg-green-50' :
//                   'border-gray-200'
//                 }`}>
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <h4 className="font-medium text-gray-900">{med.patient}</h4>
//                       <p className="text-sm text-gray-600">{med.medication} • {med.dosage}</p>
//                       <p className="text-xs text-gray-500">{med.instructions}</p>
//                     </div>
//                     <span className={`text-xs px-2 py-1 rounded ${
//                       med.isOverdue ? 'bg-red-100 text-red-800' :
//                       med.status === 'administered' ? 'bg-green-100 text-green-800' :
//                       'bg-blue-100 text-blue-800'
//                     }`}>
//                       {med.scheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
//                     </span>
//                   </div>
//                   {med.status === 'scheduled' && !med.isOverdue && (
//                     <button
//                       onClick={() => markMedicationAdministered(med.id)}
//                       className="bg-blue-600 hover:bg-blue-700 text-white w-full mt-2 text-sm py-1 rounded transition duration-200"
//                     >
//                       Mark Administered
//                     </button>
//                   )}
//                   {med.isOverdue && (
//                     <div className="flex justify-between items-center mt-2">
//                       <span className="text-red-600 text-sm font-medium">OVERDUE</span>
//                       <button
//                         onClick={() => markMedicationAdministered(med.id)}
//                         className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition duration-200"
//                       >
//                         Administer Now
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               ))}
//               {medicationSchedule.length === 0 && (
//                 <p className="text-gray-500 text-center py-4">No medications scheduled for today</p>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Bottom Section - Alerts and Quick Actions */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Priority Alerts */}
//         <div className="bg-white shadow rounded-lg">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h2 className="text-xl font-semibold text-gray-900">Priority Alerts</h2>
//             <p className="text-gray-600">Critical notifications requiring attention</p>
//           </div>
//           <div className="p-6">
//             <div className="space-y-4">
//               {priorityAlerts.map(alert => (
//                 <div key={alert.id} className={`p-4 border rounded-lg ${
//                   alert.isCritical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
//                 }`}>
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <h4 className="font-medium text-gray-900">{alert.patient}</h4>
//                       <p className="text-sm text-gray-700">{alert.message}</p>
//                       <p className="text-xs text-gray-600 mt-1">
//                         {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
//                       </p>
//                     </div>
//                     <span className={`text-xs px-2 py-1 rounded ${
//                       alert.isCritical ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
//                     }`}>
//                       {alert.severity}
//                     </span>
//                   </div>
//                   <button
//                     onClick={() => resolveAlert(alert.id)}
//                     className="bg-gray-600 hover:bg-gray-700 text-white w-full mt-3 text-sm py-1 rounded transition duration-200"
//                   >
//                     Mark Resolved
//                   </button>
//                 </div>
//               ))}
//               {priorityAlerts.length === 0 && (
//                 <p className="text-gray-500 text-center py-4">No priority alerts</p>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Quick Actions */}
//         <div className="bg-white shadow rounded-lg">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
//             <p className="text-gray-600">Frequently used functions</p>
//           </div>
//           <div className="p-6">
//             <div className="grid grid-cols-2 gap-4">
//               {quickActions.map((action, index) => (
//                 <a
//                   key={index}
//                   href={action.href}
//                   className={`p-4 border rounded-lg text-center transition duration-200 hover:shadow-md ${
//                     action.color === 'green' ? 'border-green-200 hover:bg-green-50' :
//                     action.color === 'blue' ? 'border-blue-200 hover:bg-blue-50' :
//                     action.color === 'purple' ? 'border-purple-200 hover:bg-purple-50' :
//                     'border-orange-200 hover:bg-orange-50'
//                   }`}
//                 >
//                   <action.icon className={`h-8 w-8 mx-auto mb-2 ${
//                     action.color === 'green' ? 'text-green-600' :
//                     action.color === 'blue' ? 'text-blue-600' :
//                     action.color === 'purple' ? 'text-purple-600' :
//                     'text-orange-600'
//                   }`} />
//                   <h3 className="font-medium text-gray-900">{action.label}</h3>
//                   <p className="text-xs text-gray-600 mt-1">{action.description}</p>
//                 </a>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Add Patient Modal */}
// {showPatientForm && (
//   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//     <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//       <div className="flex justify-between items-center p-6 border-b">
//         <h2 className="text-xl font-semibold text-gray-900">Add New Patient</h2>
//         <button
//           onClick={() => setShowPatientForm(false)}
//           className="text-gray-400 hover:text-gray-600"
//         >
//           <XMarkIcon className="h-6 w-6" />
//         </button>
//       </div>
      
//       <form onSubmit={addNewPatient} className="p-6">
//         {formError && (
//           <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
//             {formError}
//           </div>
//         )}
        
//         {formSuccess && (
//           <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
//             {formSuccess}
//           </div>
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//           {/* Personal Information */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
//             <input
//               type="text"
//               name="first_name"
//               value={newPatient.first_name}
//               onChange={handleInputChange}
//               required
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
//             <input
//               type="text"
//               name="last_name"
//               value={newPatient.last_name}
//               onChange={handleInputChange}
//               required
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
//             <input
//               type="email"
//               name="email"
//               value={newPatient.email}
//               onChange={handleInputChange}
//               required
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
//             <input
//               type="tel"
//               name="phone_number"
//               value={newPatient.phone_number}
//               onChange={handleInputChange}
//               required
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
//             <input
//               type="date"
//               name="date_of_birth"
//               value={newPatient.date_of_birth}
//               onChange={handleInputChange}
//               required
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
          
//           {/* Emergency Contact Information */}
//           <div className="md:col-span-2 border-t pt-4 mt-2">
//             <h3 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h3>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
//             <input
//               type="text"
//               name="emergency_contact_name"
//               value={newPatient.emergency_contact_name}
//               onChange={handleInputChange}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
//             <input
//               type="tel"
//               name="emergency_contact_phone"
//               value={newPatient.emergency_contact_phone}
//               onChange={handleInputChange}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//         </div>

//         <div className="flex justify-end space-x-3">
//           <button
//             type="button"
//             onClick={() => setShowPatientForm(false)}
//             className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition duration-200"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={isSubmitting}
//             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-200"
//           >
//             {isSubmitting ? 'Adding Patient...' : 'Add Patient'}
//           </button>
//         </div>
//       </form>
//     </div>
//   </div>
// )}
//     </DashboardLayout>
//   );
// };

// export default NurseDashboard;



import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  UserGroupIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  ChartBarIcon,
  HeartIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const NurseDashboard = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [todaysAssignments, setTodaysAssignments] = useState([]);
  const [medicationSchedule, setMedicationSchedule] = useState([]);
  const [priorityAlerts, setPriorityAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  
  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon },
    { name: 'Patient Rounds', href: '/patient-rounds', icon: DocumentTextIcon },
  ];

  // MESMTF Competition Features
  const malariaTyphoidStats = {
    malariaCases: 0,
    typhoidCases: 0,
    coInfections: 0,
    chestXraysRequired: 0
  };

  // Fetch nurse data and dashboard information
  useEffect(() => {
    const fetchNurseData = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        
        // Get nurse profile
        const { data: nurseData, error: nurseError } = await supabase
          .from('users')
          .select(`
            *,
            medical_staff!inner(
              *,
              departments(*)
            ),
            roles(*)
          `)
          .eq('id', authUser.id)
          .single();

        if (nurseError) throw nurseError;
        setUser(nurseData);

        // Fetch all dashboard data
        const assignments = await fetchTodaysAssignments(authUser.id);
        const medications = await fetchMedicationSchedule(authUser.id);
        const alerts = await fetchPriorityAlerts(authUser.id);

        setTodaysAssignments(assignments);
        setMedicationSchedule(medications);
        setPriorityAlerts(alerts);

        // Calculate MESMTF statistics
        calculateMESMTFStats(assignments);

      } catch (error) {
        console.error('Error fetching nurse data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNurseData();

    // Set up real-time subscription for alerts
    const subscription = supabase
      .channel('nurse-dashboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'patient_alerts' },
        () => {
          fetchPriorityAlerts(authUser.id).then(setPriorityAlerts);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [authUser]);

  // Calculate MESMTF statistics
  const calculateMESMTFStats = (assignments) => {
    assignments.forEach(patient => {
      if (patient.condition?.toLowerCase().includes('malaria')) {
        malariaTyphoidStats.malariaCases++;
      }
      if (patient.condition?.toLowerCase().includes('typhoid')) {
        malariaTyphoidStats.typhoidCases++;
      }
      if (patient.condition?.toLowerCase().includes('co-infection')) {
        malariaTyphoidStats.coInfections++;
      }
      if (patient.requiresChestXray) {
        malariaTyphoidStats.chestXraysRequired++;
      }
    });
  };

  // Fetch today's patient assignments (patients already assigned to this nurse)
  const fetchTodaysAssignments = async (nurseId) => {
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select(`
          patient_id,
          patients!inner(
            id,
            users!inner(
              first_name,
              last_name,
              phone_number,
              date_of_birth
            ),
            emergency_contact_name,
            emergency_contact_phone
          )
        `)
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      // Fetch medical diagnoses for these patients
      const { data: diagnosesData } = await supabase
        .from('medical_diagnoses')
        .select(`
          patient_id,
          severity,
          diagnosis_date,
          diseases(disease_name)
        `)
        .in('patient_id', patientIds)
        .order('diagnosis_date', { ascending: false });

      // Fetch latest vital signs for these patients
      const { data: vitalsData } = await supabase
        .from('vital_signs')
        .select(`
          patient_id,
          heart_rate,
          temperature,
          blood_pressure_systolic,
          blood_pressure_diastolic,
          oxygen_saturation,
          recorded_at
        `)
        .in('patient_id', patientIds)
        .order('recorded_at', { ascending: false });

      // Fetch expert system data for MESMTF integration
      const { data: expertSystemData } = await supabase
        .from('diagnosis_sessions')
        .select(`
          patient_id,
          malaria_probability,
          typhoid_probability,
          requires_chest_xray
        `)
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false });

      return assignments.map(assignment => {
        const patientId = assignment.patient_id;
        const patientDiagnoses = diagnosesData?.filter(d => d.patient_id === patientId) || [];
        const patientVitals = vitalsData?.filter(v => v.patient_id === patientId) || [];
        const patientExpertData = expertSystemData?.filter(e => e.patient_id === patientId)[0] || {};
        
        const latestDiagnosis = patientDiagnoses[0];
        const latestVitals = patientVitals[0];

        return {
          id: patientId,
          name: `${assignment.patients.users.first_name} ${assignment.patients.users.last_name}`,
          age: calculateAge(assignment.patients.users.date_of_birth),
          condition: latestDiagnosis?.diseases?.disease_name || 'General care',
          severity: latestDiagnosis?.severity || 'stable',
          lastVitals: latestVitals?.recorded_at 
            ? new Date(latestVitals.recorded_at).toLocaleTimeString() 
            : 'No vitals',
          heartRate: latestVitals?.heart_rate || '--',
          temperature: latestVitals?.temperature || '--',
          bloodPressure: latestVitals ? 
            `${latestVitals.blood_pressure_systolic || '--'}/${latestVitals.blood_pressure_diastolic || '--'}` : 
            '--/--',
          oxygenSaturation: latestVitals?.oxygen_saturation || '--',
          malariaProbability: patientExpertData.malaria_probability || 0,
          typhoidProbability: patientExpertData.typhoid_probability || 0,
          requiresChestXray: patientExpertData.requires_chest_xray || false,
          priority: getPatientPriority(latestDiagnosis?.severity, patientExpertData)
        };
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  };

  // Fetch medication administration schedule for assigned patients
  const fetchMedicationSchedule = async (nurseId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Get the patient IDs assigned to this nurse
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      // Fetch medication schedule for these patients
      const { data, error } = await supabase
        .from('medication_schedule')
        .select(`
          *,
          prescription_items!inner(
            dosage_instructions,
            duration_days,
            drugs!inner(
              drug_name,
              dosage,
              generic_name
            ),
            prescriptions!inner(
              patient_id,
              medical_diagnoses!inner(
                diseases!inner(
                  disease_name
                )
              )
            )
          )
        `)
        .in('prescription_items.prescriptions.patient_id', patientIds)
        .gte('scheduled_time', `${today}T00:00:00`)
        .lte('scheduled_time', `${today}T23:59:59`)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      // Fetch patient names and disease information
      const medicationWithPatients = await Promise.all(
        (data || []).map(async (med) => {
          const { data: patientData } = await supabase
            .from('patients')
            .select(`
              users!inner(
                first_name,
                last_name
              )
            `)
            .eq('id', med.prescription_items.prescriptions.patient_id)
            .single();

          const disease = med.prescription_items.prescriptions.medical_diagnoses?.[0]?.diseases?.disease_name || 'General';
          const isMalariaMed = disease.toLowerCase().includes('malaria');
          const isTyphoidMed = disease.toLowerCase().includes('typhoid');

          return {
            id: med.id,
            patient: patientData ? 
              `${patientData.users.first_name} ${patientData.users.last_name}` : 
              'Unknown Patient',
            medication: med.prescription_items.drugs.drug_name,
            genericName: med.prescription_items.drugs.generic_name,
            dosage: med.prescription_items.drugs.dosage,
            instructions: med.prescription_items.dosage_instructions,
            duration: med.prescription_items.duration_days,
            disease: disease,
            scheduledTime: new Date(med.scheduled_time),
            status: med.status,
            isOverdue: med.status === 'scheduled' && new Date(med.scheduled_time) < now,
            isMalariaTreatment: isMalariaMed,
            isTyphoidTreatment: isTyphoidMed,
            isCritical: med.prescription_items.drugs.dosage.includes('high') || 
                       med.prescription_items.drugs.drug_name.toLowerCase().includes('critical')
          };
        })
      );

      return medicationWithPatients;
    } catch (error) {
      console.error('Error fetching medication schedule:', error);
      return [];
    }
  };

  // Fetch priority alerts for assigned patients
  const fetchPriorityAlerts = async (nurseId) => {
    try {
      // Get patient IDs assigned to this nurse
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      const { data, error } = await supabase
        .from('patient_alerts')
        .select(`
          *,
          alert_types(*),
          patients!inner(
            users!inner(
              first_name,
              last_name
            )
          ),
          vital_signs(
            heart_rate,
            temperature,
            blood_pressure_systolic
          )
        `)
        .in('patient_id', patientIds)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(alert => ({
        id: alert.id,
        patient: `${alert.patients.users.first_name} ${alert.patients.users.last_name}`,
        type: alert.alert_types?.type_name || 'Alert',
        severity: alert.alert_types?.severity || 'medium',
        message: alert.message,
        timestamp: new Date(alert.created_at),
        vitalSigns: alert.vital_signs?.[0] || {},
        isCritical: alert.alert_types?.severity === 'critical',
        isMESMTFRelated: alert.message?.toLowerCase().includes('malaria') || 
                        alert.message?.toLowerCase().includes('typhoid') ||
                        alert.alert_types?.type_name?.toLowerCase().includes('fever')
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  };

  // Mark medication as administered
  const markMedicationAdministered = async (medicationId) => {
    try {
      const { error } = await supabase
        .from('medication_schedule')
        .update({
          status: 'administered',
          administered_time: new Date().toISOString(),
          administered_by: authUser.id
        })
        .eq('id', medicationId);

      if (error) throw error;

      // Refresh medication schedule
      const updatedSchedule = await fetchMedicationSchedule(authUser.id);
      setMedicationSchedule(updatedSchedule);

      setFormSuccess('Medication marked as administered successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Error marking medication administered:', error);
      setFormError('Error updating medication status');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('patient_alerts')
        .update({
          is_resolved: true,
          resolved_by: authUser.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Refresh alerts
      const updatedAlerts = await fetchPriorityAlerts(authUser.id);
      setPriorityAlerts(updatedAlerts);

      setFormSuccess('Alert resolved successfully!');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Error resolving alert:', error);
      setFormError('Error resolving alert');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getPatientPriority = (severity, expertData) => {
    // Priority based on severity and MESMTF factors
    if (expertData?.malaria_probability > 80 || expertData?.typhoid_probability > 80) {
      return 'critical';
    }
    if (expertData?.requires_chest_xray) {
      return 'high';
    }
    switch (severity) {
      case 'severe': return 'high';
      case 'moderate': return 'medium';
      default: return 'low';
    }
  };

  const getDiseaseColor = (condition) => {
    if (!condition) return 'gray';
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('malaria')) return 'red';
    if (lowerCondition.includes('typhoid')) return 'orange';
    if (lowerCondition.includes('co-infection')) return 'purple';
    return 'blue';
  };

  const quickActions = [
    {
      icon: ClipboardDocumentListIcon,
      label: 'Record Vitals',
      description: 'Take patient vital signs',
      color: 'green',
      href: '/vitals'
    },
    {
      icon: DocumentTextIcon,
      label: 'Patient Care',
      description: 'Clinical notes & assessments',
      color: 'blue',
      href: '/patient-care'
    },
    {
      icon: HeartIcon,
      label: 'Medication',
      description: 'Administer medications',
      color: 'purple',
      href: '/medication'
    },
    {
      icon: ChartBarIcon,
      label: 'Medical Records',
      description: 'View patient records',
      color: 'orange',
      href: '/medical-records'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout user={{ name: 'Loading...', role: 'nurse' }} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Nurse Dashboard</h1>
            <p className="text-gray-600">Good morning, {user?.first_name}. Here's your overview for today.</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {user?.medical_staff?.departments?.department_name || 'General Ward'}
              </span>
              <span className="text-sm text-gray-500">
                {todaysAssignments.length} patients under your care
              </span>
            </div>
          </div>
          {/* Removed assignment buttons since nurses can't assign themselves */}
        </div>
      </div>

      {/* Success/Error Messages */}
      {formSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <span className="text-green-800">{formSuccess}</span>
          <button 
            onClick={() => setFormSuccess('')}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {formError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <span className="text-red-800">{formError}</span>
          <button 
            onClick={() => setFormError('')}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* MESMTF Statistics Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{malariaTyphoidStats.malariaCases}</div>
            <div className="text-sm text-gray-600">Malaria Cases</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{malariaTyphoidStats.typhoidCases}</div>
            <div className="text-sm text-gray-600">Typhoid Cases</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{malariaTyphoidStats.coInfections}</div>
            <div className="text-sm text-gray-600">Co-infections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{malariaTyphoidStats.chestXraysRequired}</div>
            <div className="text-sm text-gray-600">Chest X-rays Required</div>
          </div>
        </div>
      </div>

      {/* Priority Alerts Banner */}
      {priorityAlerts.filter(alert => alert.isCritical).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-medium text-red-800">Critical Alerts</h3>
              <span className="bg-red-600 text-white px-2 py-1 rounded-full text-sm">
                {priorityAlerts.filter(alert => alert.isCritical).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Assignments */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Patients Under Your Care</h2>
              <p className="text-gray-600">Patients assigned to you for care</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {todaysAssignments.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-3 h-3 rounded-full ${
                        patient.priority === 'critical' ? 'bg-red-500' :
                        patient.priority === 'high' ? 'bg-orange-500' :
                        patient.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{patient.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${getDiseaseColor(patient.condition)}-100 text-${getDiseaseColor(patient.condition)}-800`}>
                            {patient.condition}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {patient.age} years • Priority: {patient.priority}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-gray-500">
                          <span>HR: {patient.heartRate} bpm</span>
                          <span>Temp: {patient.temperature}°C</span>
                          <span>BP: {patient.bloodPressure}</span>
                          <span>O2: {patient.oxygenSaturation}%</span>
                        </div>
                        {/* MESMTF Expert System Data */}
                        {(patient.malariaProbability > 0 || patient.typhoidProbability > 0) && (
                          <div className="flex space-x-2 mt-1">
                            {patient.malariaProbability > 0 && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                Malaria: {patient.malariaProbability}%
                              </span>
                            )}
                            {patient.typhoidProbability > 0 && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                                Typhoid: {patient.typhoidProbability}%
                              </span>
                            )}
                            {patient.requiresChestXray && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                Chest X-ray Required
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <a 
                      href={`/patient-care?patient=${patient.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition duration-200 whitespace-nowrap"
                    >
                      View Care
                    </a>
                  </div>
                ))}
                {todaysAssignments.length === 0 && (
                  <div className="text-center py-8">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No patients assigned to your care</p>
                    <p className="text-sm text-gray-400 mt-1">Patients will be assigned to you by nursing administration</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Medication Schedule */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Medication Schedule</h2>
            <p className="text-gray-600">Today's medication administration</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {medicationSchedule.map(med => (
                <div key={med.id} className={`p-3 border rounded-lg ${
                  med.isOverdue ? 'border-red-200 bg-red-50' :
                  med.status === 'administered' ? 'border-green-200 bg-green-50' :
                  'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{med.patient}</h4>
                        {med.isMalariaTreatment && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                            Malaria
                          </span>
                        )}
                        {med.isTyphoidTreatment && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                            Typhoid
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{med.medication}</p>
                      <p className="text-xs text-gray-500">{med.dosage} • {med.instructions}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      med.isOverdue ? 'bg-red-100 text-red-800' :
                      med.status === 'administered' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {med.scheduledTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  {med.status === 'scheduled' && !med.isOverdue && (
                    <button
                      onClick={() => markMedicationAdministered(med.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full text-sm py-1 rounded transition duration-200"
                    >
                      Mark Administered
                    </button>
                  )}
                  {med.isOverdue && (
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 text-sm font-medium">OVERDUE</span>
                      <button
                        onClick={() => markMedicationAdministered(med.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition duration-200"
                      >
                        Administer Now
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {medicationSchedule.length === 0 && (
                <div className="text-center py-4">
                  <ClipboardDocumentListIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">No medications scheduled for today</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Priority Alerts</h2>
            <p className="text-gray-600">Notifications requiring attention</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {priorityAlerts.map(alert => (
                <div key={alert.id} className={`p-4 border rounded-lg ${
                  alert.isCritical ? 'border-red-200 bg-red-50' : 
                  alert.isMESMTFRelated ? 'border-orange-200 bg-orange-50' : 
                  'border-yellow-200 bg-yellow-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{alert.patient}</h4>
                        {alert.isMESMTFRelated && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                            MESMTF
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      alert.isCritical ? 'bg-red-100 text-red-800' : 
                      alert.isMESMTFRelated ? 'bg-orange-100 text-orange-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="bg-gray-600 hover:bg-gray-700 text-white w-full text-sm py-1 rounded transition duration-200"
                  >
                    Mark Resolved
                  </button>
                </div>
              ))}
              {priorityAlerts.length === 0 && (
                <div className="text-center py-4">
                  <BellIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">No priority alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-gray-600">Frequently used functions</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <a
                  key={index}
                  href={action.href}
                  className={`p-4 border rounded-lg text-center transition duration-200 hover:shadow-md ${
                    action.color === 'green' ? 'border-green-200 hover:bg-green-50' :
                    action.color === 'blue' ? 'border-blue-200 hover:bg-blue-50' :
                    action.color === 'purple' ? 'border-purple-200 hover:bg-purple-50' :
                    'border-orange-200 hover:bg-orange-50'
                  }`}
                >
                  <action.icon className={`h-8 w-8 mx-auto mb-2 ${
                    action.color === 'green' ? 'text-green-600' :
                    action.color === 'blue' ? 'text-blue-600' :
                    action.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                  <h3 className="font-medium text-gray-900">{action.label}</h3>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NurseDashboard;