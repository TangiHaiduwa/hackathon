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
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showAssignPatientModal, setShowAssignPatientModal] = useState(false);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [selectedPatientToAssign, setSelectedPatientToAssign] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon, current: true },
    { name: 'Patient Care', href: '/patient-care', icon: HeartIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
    { name: 'Medication', href: '/medication', icon: ClipboardDocumentListIcon },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon },
    { name: 'Patient Rounds', href: '/patient-rounds', icon: DocumentTextIcon },
  ];

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

  // Fetch today's patient assignments
  const fetchTodaysAssignments = async (nurseId) => {
    try {
      // First get the patient assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('nurse_patient_assignments')
        .select(`
          patient_id,
          patients!inner(
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
          recorded_at
        `)
        .in('patient_id', patientIds)
        .order('recorded_at', { ascending: false });

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const appointmentData = await fetchTodaysAppointments(nurseId, today);

      return assignments.map(assignment => {
        const patientId = assignment.patient_id;
        const patientDiagnoses = diagnosesData?.filter(d => d.patient_id === patientId) || [];
        const patientVitals = vitalsData?.filter(v => v.patient_id === patientId) || [];
        const patientAppointments = appointmentData.filter(apt => apt.patient_id === patientId);
        
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
          nextAppointment: patientAppointments[0]?.appointment_time || 'No appointment',
          priority: getPatientPriority(latestDiagnosis?.severity)
        };
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  };

  // Fetch today's appointments separately
  const fetchTodaysAppointments = async (nurseId, today) => {
    try {
      // First get patient IDs assigned to this nurse
      const { data: assignments } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', nurseId)
        .eq('is_active', true);

      if (!assignments || assignments.length === 0) {
        return [];
      }

      const patientIds = assignments.map(assignment => assignment.patient_id);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .in('patient_id', patientIds)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  };

  // Fetch medication administration schedule
  const fetchMedicationSchedule = async (nurseId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // First, get the patient IDs assigned to this nurse
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

      // Then fetch medication schedule for these patients
      const { data, error } = await supabase
        .from('medication_schedule')
        .select(`
          *,
          prescription_items!inner(
            dosage_instructions,
            drugs!inner(
              drug_name,
              dosage
            ),
            prescriptions!inner(
              patient_id
            )
          )
        `)
        .in('prescription_items.prescriptions.patient_id', patientIds)
        .gte('scheduled_time', `${today}T00:00:00`)
        .lte('scheduled_time', `${today}T23:59:59`)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      // Fetch patient names separately
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

          return {
            id: med.id,
            patient: patientData ? 
              `${patientData.users.first_name} ${patientData.users.last_name}` : 
              'Unknown Patient',
            medication: med.prescription_items.drugs.drug_name,
            dosage: med.prescription_items.drugs.dosage,
            instructions: med.prescription_items.dosage_instructions,
            scheduledTime: new Date(med.scheduled_time),
            status: med.status,
            isOverdue: med.status === 'scheduled' && new Date(med.scheduled_time) < now,
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

  // Fetch priority alerts
  const fetchPriorityAlerts = async (nurseId) => {
    try {
      // First get patient IDs assigned to this nurse
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
        type: alert.alert_types.type_name,
        severity: alert.alert_types.severity,
        message: alert.message,
        timestamp: new Date(alert.created_at),
        vitalSigns: alert.vital_signs?.[0] || {},
        isCritical: alert.alert_types.severity === 'critical'
      }));
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  };

  // Add new patient function
  const addNewPatient = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      // Step 1: Create Auth user with temporary password
      const tempPassword = generateTempPassword();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newPatient.email,
        password: tempPassword,
        options: {
          data: {
            first_name: newPatient.first_name,
            last_name: newPatient.last_name,
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

      if (!authData.user) throw new Error('Failed to create auth user');

      // Step 2: Get patient role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'patient')
        .single();

      if (roleError) throw roleError;

      // Step 3: Create user record
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newPatient.email,
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          role_id: roleData.id,
          phone_number: newPatient.phone_number,
          date_of_birth: newPatient.date_of_birth
        });

      if (userError) throw userError;

      // Step 4: Create patient record
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: authData.user.id,
          emergency_contact_name: newPatient.emergency_contact_name,
          emergency_contact_phone: newPatient.emergency_contact_phone
        });

      if (patientError) throw patientError;

      // Step 5: Assign patient to nurse
      const { error: assignmentError } = await supabase
        .from('nurse_patient_assignments')
        .insert({
          nurse_id: authUser.id,
          patient_id: authData.user.id,
          assigned_date: new Date().toISOString().split('T')[0],
          is_active: true,
          assignment_notes: 'Initial assignment from nurse dashboard'
        });

      if (assignmentError) throw assignmentError;

      setFormSuccess('Patient added successfully and assigned to your care!');
      
      // Reset form
      setNewPatient({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        date_of_birth: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });

      // Refresh assignments
      const updatedAssignments = await fetchTodaysAssignments(authUser.id);
      setTodaysAssignments(updatedAssignments);

      setTimeout(() => {
        setShowPatientForm(false);
        setFormSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Error adding patient:', error);
      setFormError(error.message || 'Failed to add patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign existing patient to nurse
  const assignPatientToNurse = async (patientId) => {
    try {
      const { error } = await supabase
        .from('nurse_patient_assignments')
        .insert({
          nurse_id: authUser.id,
          patient_id: patientId,
          assigned_date: new Date().toISOString().split('T')[0],
          is_active: true,
          assignment_notes: 'Assigned via nurse dashboard'
        });

      if (error) throw error;

      setFormSuccess('Patient assigned to your care successfully!');
      
      // Refresh assignments
      const updatedAssignments = await fetchTodaysAssignments(authUser.id);
      setTodaysAssignments(updatedAssignments);

      setTimeout(() => {
        setFormSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error assigning patient:', error);
      setFormError('Error assigning patient: ' + error.message);
    }
  };

  // Fetch patients not assigned to current nurse
  const fetchAvailablePatients = async () => {
    try {
      // Get all patients
      const { data: allPatients } = await supabase
        .from('patients')
        .select(`
          id,
          users!inner(
            first_name,
            last_name
          )
        `)
        .order('users(first_name)');

      // Get currently assigned patient IDs
      const { data: currentAssignments } = await supabase
        .from('nurse_patient_assignments')
        .select('patient_id')
        .eq('nurse_id', authUser.id)
        .eq('is_active', true);

      const assignedPatientIds = currentAssignments?.map(a => a.patient_id) || [];

      // Filter out already assigned patients
      const available = allPatients?.filter(patient => 
        !assignedPatientIds.includes(patient.id)
      ) || [];

      setAvailablePatients(available);
    } catch (error) {
      console.error('Error fetching available patients:', error);
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
    } catch (error) {
      console.error('Error marking medication administered:', error);
      alert('Error updating medication status');
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
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error resolving alert');
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

  const getPatientPriority = (severity) => {
    switch (severity) {
      case 'severe': return 'high';
      case 'moderate': return 'medium';
      default: return 'low';
    }
  };

  const generateTempPassword = () => {
    return 'TempPass123!';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({
      ...prev,
      [name]: value
    }));
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
      label: 'Patient Notes',
      description: 'Add clinical notes',
      color: 'blue',
      href: '/patient-care'
    },
    {
      icon: CalendarIcon,
      label: 'Schedule',
      description: 'View daily schedule',
      color: 'purple',
      href: '/schedule'
    },
    {
      icon: BellIcon,
      label: 'Alerts',
      description: 'Manage notifications',
      color: 'orange',
      href: '/alerts'
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
                {todaysAssignments.length} patients assigned today
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowAssignPatientModal(true);
                fetchAvailablePatients();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition duration-200"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Assign Patient</span>
            </button>
            <button
              onClick={() => setShowPatientForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition duration-200"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Add New Patient</span>
            </button>
          </div>
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
            <button className="text-red-700 hover:text-red-900 font-medium">
              View All
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Assignments */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Today's Patient Assignments</h2>
              <p className="text-gray-600">Patients under your care for today</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {todaysAssignments.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        patient.priority === 'high' ? 'bg-red-500' :
                        patient.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900">{patient.name}</h3>
                        <p className="text-sm text-gray-600">
                          {patient.age} years • {patient.condition} • Priority: {patient.priority}
                        </p>
                        <div className="flex space-x-4 mt-1 text-xs text-gray-500">
                          <span>HR: {patient.heartRate} bpm</span>
                          <span>Temp: {patient.temperature}°C</span>
                          <span>Last vitals: {patient.lastVitals}</span>
                        </div>
                      </div>
                    </div>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm transition duration-200">
                      View Details
                    </button>
                  </div>
                ))}
                {todaysAssignments.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No patient assignments for today</p>
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
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{med.patient}</h4>
                      <p className="text-sm text-gray-600">{med.medication} • {med.dosage}</p>
                      <p className="text-xs text-gray-500">{med.instructions}</p>
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
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full mt-2 text-sm py-1 rounded transition duration-200"
                    >
                      Mark Administered
                    </button>
                  )}
                  {med.isOverdue && (
                    <div className="flex justify-between items-center mt-2">
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
                <p className="text-gray-500 text-center py-4">No medications scheduled for today</p>
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
            <p className="text-gray-600">Critical notifications requiring attention</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {priorityAlerts.map(alert => (
                <div key={alert.id} className={`p-4 border rounded-lg ${
                  alert.isCritical ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{alert.patient}</h4>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      alert.isCritical ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="bg-gray-600 hover:bg-gray-700 text-white w-full mt-3 text-sm py-1 rounded transition duration-200"
                  >
                    Mark Resolved
                  </button>
                </div>
              ))}
              {priorityAlerts.length === 0 && (
                <p className="text-gray-500 text-center py-4">No priority alerts</p>
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

      {/* Add New Patient Modal */}
      {showPatientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add New Patient</h2>
              <button
                onClick={() => setShowPatientForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={addNewPatient} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  {formError}
                </div>
              )}
              
              {formSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={newPatient.first_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={newPatient.last_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={newPatient.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={newPatient.phone_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newPatient.date_of_birth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Emergency Contact Information */}
                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Emergency Contact</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={newPatient.emergency_contact_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    value={newPatient.emergency_contact_phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPatientForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-200"
                >
                  {isSubmitting ? 'Adding Patient...' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Existing Patient Modal */}
      {showAssignPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Assign Patient to Your Care</h2>
              <button onClick={() => setShowAssignPatientModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <select
                value={selectedPatientToAssign}
                onChange={(e) => setSelectedPatientToAssign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              >
                <option value="">Select a patient</option>
                {availablePatients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.users.first_name} {patient.users.last_name}
                  </option>
                ))}
              </select>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignPatientModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedPatientToAssign) {
                      assignPatientToNurse(selectedPatientToAssign);
                      setShowAssignPatientModal(false);
                      setSelectedPatientToAssign('');
                    }
                  }}
                  disabled={!selectedPatientToAssign}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Assign Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default NurseDashboard;