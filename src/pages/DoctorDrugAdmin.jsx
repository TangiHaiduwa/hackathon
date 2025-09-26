// DoctorDrugAdmin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import supabase from '../lib/supabase';
import {
  TruckIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  EyeIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  LightBulbIcon,
  AcademicCapIcon
  
} from '@heroicons/react/24/outline';

const DoctorDrugAdmin = () => {
  const [patients, setPatients] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [administrationRecords, setAdministrationRecords] = useState([]);
  const [sideEffects, setSideEffects] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newAdministration, setNewAdministration] = useState({
    prescription_item_id: '',
    scheduled_time: '',
    actual_time: new Date().toISOString().slice(0, 16),
    dosage_administered: '',
    administration_route: 'oral',
    status: 'administered',
    notes: ''
  });
  const [newSideEffect, setNewSideEffect] = useState({
    drug_administration_id: '',
    side_effect_id: '',
    onset_time: new Date().toISOString().slice(0, 16),
    severity: 'mild',
    action_taken: '',
    resolution_time: '',
    notes: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Navigation for sidebar
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

  // Administration status colors
  const statusColors = {
    'scheduled': 'bg-blue-100 text-blue-800',
    'administered': 'bg-green-100 text-green-800',
    'missed': 'bg-red-100 text-red-800',
    'refused': 'bg-orange-100 text-orange-800'
  };

  // Severity colors
  const severityColors = {
    'mild': 'bg-green-100 text-green-800',
    'moderate': 'bg-yellow-100 text-yellow-800',
    'severe': 'bg-orange-100 text-orange-800',
    'life_threatening': 'bg-red-100 text-red-800'
  };

  useEffect(() => {
  fetchDoctorData();
}, []);

  useEffect(() => {
  if (user) {
    fetchPatients();
    if (selectedPatient) {
      fetchPatientData();
      fetchSideEffects();
    }
  }
}, [user, selectedPatient]);

//   useEffect(() => {
//     if (selectedPatient) {
//       fetchPatientData();
//     }
//   }, [selectedPatient]);

  const fetchDoctorData = async () => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/login');
      return;
    }

    const { data: doctorProfile } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, email,
        role_id (role_name),
        medical_staff (specialization_id (specialization_name))
      `)
      .eq('id', authUser.id)
      .single();

    setUser({
      id: doctorProfile.id,
      name: `${doctorProfile.first_name} ${doctorProfile.last_name}`,
      email: doctorProfile.email,
      role: doctorProfile.role_id.role_name,
      specialization: doctorProfile.medical_staff?.[0]?.specialization_id?.specialization_name
    });
  } catch (error) {
    console.error('Error fetching doctor data:', error);
  }
};


  const fetchPatients = async () => {
  if (!user) return;
  try {
    setLoading(true);
    console.log('Fetching patients for doctor:', user.id); // Debug
    const { data: presData, error: presError } = await supabase
      .from('prescriptions')
      .select('id, patient_id, doctor_id, prescription_date, status_id (status_name)')
      .eq('doctor_id', user.id)
      .not('patient_id', 'is', null) // CORRECTED SYNTAX
      .order('prescription_date', { ascending: false })
      .limit(50);

    if (presError) {
      console.error('Prescription error:', presError);
      throw presError;
    }
    console.log('Prescriptions fetched:', presData); // Debug

    if (!presData || presData.length === 0) {
      setPatients([]);
      return;
    }

    const patientIds = [...new Set(presData.map(p => p.patient_id))];
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, date_of_birth, phone_number, email, address')
      .in('id', patientIds);

    if (userError) {
      console.error('User error:', userError);
      throw userError;
    }
    console.log('Users fetched:', userData); // Debug

    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('id, blood_type_id, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_number')
      .in('id', patientIds);

    if (patientError) {
      console.error('Patient error:', patientError);
      throw patientError;
    }
    console.log('Patients fetched:', patientData); // Debug

    const userMap = new Map(userData.map(u => [u.id, u]));
    const patientMap = new Map(patientData.map(p => [p.id, p]));
    const uniquePatients = patientIds.map(id => {
      const userInfo = userMap.get(id);
      const patientInfo = patientMap.get(id);
      return userInfo ? { ...userInfo, ...patientInfo } : null;
    }).filter(p => p);

    setPatients(uniquePatients);
  } catch (error) {
    console.error('Error fetching patients:', error.message);
  } finally {
    setLoading(false);
  }
};

  const fetchPatientData = async () => {
  if (!selectedPatient || !user) return;
  try {
    setLoading(true);
    console.log('Fetching data for patient:', selectedPatient.id); // Debug
    const { data: presData, error: presError } = await supabase
      .from('prescriptions')
      .select('id, patient_id, doctor_id, prescription_date, status_id (status_name), notes')
      .eq('patient_id', selectedPatient.id)
      .eq('doctor_id', user.id)
      .order('prescription_date', { ascending: false });

    if (presError) throw presError;
    setActivePrescriptions(presData || []);

    const { data: adminData, error: adminError } = await supabase
      .from('drug_administration')
      .select(`
        id, prescription_item_id, scheduled_time, actual_time, dosage_administered,
        administration_route, status, notes,
        prescription_items (drug_id (drug_name))
      `)
      .eq('patient_id', selectedPatient.id)
      .order('scheduled_time', { ascending: false });

    if (adminError) throw adminError;
    setAdministrationRecords(adminData || []);

    const { data: complianceData, error: complianceError } = await supabase
      .from('drug_administration')
      .select('id, scheduled_time, actual_time, status')
      .eq('patient_id', selectedPatient.id)
      .order('scheduled_time', { ascending: false });

    if (complianceError) throw complianceError;
    setComplianceData(complianceData || []);
  } catch (error) {
    console.error('Error fetching patient data:', error.message);
  } finally {
    setLoading(false);
  }
};

const fetchSideEffects = async () => {
  if (!selectedPatient || !user) return;
  try {
    setLoading(true);
    console.log('Fetching side effects for patient:', selectedPatient.id); // Debug
    const { data, error } = await supabase
      .from('drug_side_effects')
      .select(`
        id, drug_administration_id, side_effect_id (side_effect_name), onset_time,
        severity, action_taken, resolution_time, notes
      `)
      .eq('patient_id', selectedPatient.id)
      .order('onset_time', { ascending: false });

    if (error) {
      console.error('Side effects error:', error);
      throw error;
    }
    console.log('Side effects fetched:', data); // Debug
    setSideEffects(data || []);
  } catch (error) {
    console.error('Error fetching side effects:', error.message);
  } finally {
    setLoading(false);
  }
};

  const fetchActivePrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_date,
          notes,
          prescription_items (
            id,
            drug_id (drug_name, dosage, form_id (form_name)),
            dosage_instructions,
            duration_days,
            quantity
          )
        `)
        .eq('patient_id', selectedPatient.id)
        .eq('status_id.status_code', 'active')
        .order('prescription_date', { ascending: false });

      if (error) throw error;

      // Flatten prescription items with prescription info
      const items = (data || []).flatMap(prescription => 
        (prescription.prescription_items || []).map(item => ({
          ...item,
          prescription_id: prescription.id,
          prescription_date: prescription.prescription_date,
          prescription_notes: prescription.notes
        }))
      );

      setActivePrescriptions(items);
    } catch (error) {
      console.error('Error fetching active prescriptions:', error);
    }
  };

  const fetchAdministrationRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('drug_administration')
        .select(`
          id,
          scheduled_time,
          actual_time,
          dosage_administered,
          administration_route,
          status,
          notes,
          administered_by (first_name, last_name),
          verified_by (first_name, last_name),
          prescription_item_id (
            drug_id (drug_name, dosage),
            dosage_instructions
          ),
          patient_side_effects (
            side_effect_id (side_effect_name),
            severity,
            action_taken,
            onset_time,
            resolution_time,
            notes
          )
        `)
        .eq('patient_id', selectedPatient.id)
        .order('scheduled_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAdministrationRecords(data || []);
    } catch (error) {
      console.error('Error fetching administration records:', error);
    }
  };

  const fetchComplianceData = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_compliance')
        .select(`
          calculation_date,
          compliance_percentage,
          doses_scheduled,
          doses_taken,
          prescription_id (prescription_date)
        `)
        .eq('patient_id', selectedPatient.id)
        .order('calculation_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setComplianceData(data || []);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    }
  };

  const recordAdministration = async () => {
    if (!selectedPatient || !newAdministration.prescription_item_id) {
      alert('Please select a patient and prescription item');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('drug_administration')
        .insert({
          prescription_item_id: newAdministration.prescription_item_id,
          patient_id: selectedPatient.id,
          administered_by: user.id,
          scheduled_time: newAdministration.scheduled_time,
          actual_time: newAdministration.actual_time,
          dosage_administered: newAdministration.dosage_administered,
          administration_route: newAdministration.administration_route,
          status: newAdministration.status,
          notes: newAdministration.notes
        });

      if (error) throw error;

      // Update compliance data
      await updateComplianceData();

      alert('Drug administration recorded successfully!');
      
      // Reset form
      setNewAdministration({
        prescription_item_id: '',
        scheduled_time: '',
        actual_time: new Date().toISOString().slice(0, 16),
        dosage_administered: '',
        administration_route: 'oral',
        status: 'administered',
        notes: ''
      });

      await fetchAdministrationRecords();
      await fetchComplianceData();

    } catch (error) {
      console.error('Error recording administration:', error);
      alert('Error recording drug administration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reportSideEffect = async () => {
    if (!newSideEffect.drug_administration_id || !newSideEffect.side_effect_id) {
      alert('Please select an administration record and side effect');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('patient_side_effects')
        .insert({
          drug_administration_id: newSideEffect.drug_administration_id,
          side_effect_id: newSideEffect.side_effect_id,
          patient_id: selectedPatient.id,
          onset_time: newSideEffect.onset_time,
          severity: newSideEffect.severity,
          action_taken: newSideEffect.action_taken,
          resolution_time: newSideEffect.resolution_time || null,
          notes: newSideEffect.notes
        });

      if (error) throw error;

      alert('Side effect reported successfully!');
      
      // Reset form
      setNewSideEffect({
        drug_administration_id: '',
        side_effect_id: '',
        onset_time: new Date().toISOString().slice(0, 16),
        severity: 'mild',
        action_taken: '',
        resolution_time: '',
        notes: ''
      });

      await fetchAdministrationRecords();

    } catch (error) {
      console.error('Error reporting side effect:', error);
      alert('Error reporting side effect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateComplianceData = async () => {
    try {
      // Calculate compliance for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentAdministrations } = await supabase
        .from('drug_administration')
        .select('*')
        .eq('patient_id', selectedPatient.id)
        .gte('scheduled_time', sevenDaysAgo.toISOString());

      // Simplified compliance calculation
      const scheduled = recentAdministrations?.length || 0;
      const taken = recentAdministrations?.filter(a => a.status === 'administered').length || 0;
      const compliance = scheduled > 0 ? (taken / scheduled) * 100 : 100;

      // Save compliance data
      await supabase
        .from('treatment_compliance')
        .insert({
          patient_id: selectedPatient.id,
          calculation_date: new Date().toISOString().split('T')[0],
          compliance_percentage: compliance,
          doses_scheduled: scheduled,
          doses_taken: taken,
          notes: 'Auto-calculated compliance'
        });

    } catch (error) {
      console.error('Error updating compliance data:', error);
    }
  };

  const calculateOverallCompliance = () => {
    if (complianceData.length === 0) return 0;
    
    const totalCompliance = complianceData.reduce((sum, record) => 
      sum + record.compliance_percentage, 0
    );
    return Math.round(totalCompliance / complianceData.length);
  };

  const renderPatientSelection = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Select Patient</h3>
        <p className="text-sm text-gray-600">Choose a patient to view drug administration records</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(patient => (
            <div
              key={patient.id}
              className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-25 transition-all"
              onClick={() => setSelectedPatient(patient)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{patient.first_name} {patient.last_name}</h4>
                  <p className="text-sm text-gray-600">
                    Age: {patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'N/A'}
                  </p>
                </div>
                <EyeIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
        {patients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No patients with active prescriptions found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Compliance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-medical text-center">
          <div className="p-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{calculateOverallCompliance()}%</div>
            <div className="text-sm text-gray-600">Overall Compliance</div>
          </div>
        </div>

        <div className="card-medical text-center">
          <div className="p-6">
            <ClockIcon className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{activePrescriptions.length}</div>
            <div className="text-sm text-gray-600">Active Medications</div>
          </div>
        </div>

        <div className="card-medical text-center">
          <div className="p-6">
            <TruckIcon className="h-12 w-12 text-orange-600 mx-auto mb-3" />
            <div className="text-2xl font-bold text-gray-900">{administrationRecords.length}</div>
            <div className="text-sm text-gray-600">Administration Records</div>
          </div>
        </div>
      </div>

      {/* Recent Administrations */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Administrations</h3>
        </div>
        <div className="p-6">
          {administrationRecords.slice(0, 5).map(record => (
            <div key={record.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div>
                <span className="font-medium text-gray-900">
                  {record.prescription_item_id.drug_id.drug_name}
                </span>
                <span className="text-sm text-gray-600 ml-2">{record.dosage_administered}</span>
                <div className="text-sm text-gray-500">
                  {new Date(record.actual_time).toLocaleDateString()} at {new Date(record.actual_time).toLocaleTimeString()}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${statusColors[record.status]}`}>
                {record.status}
              </span>
            </div>
          ))}
          {administrationRecords.length === 0 && (
            <p className="text-gray-500 text-center py-4">No administration records found</p>
          )}
        </div>
      </div>

      {/* Compliance Trend */}
      <div className="card-medical">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Compliance Trend</h3>
        </div>
        <div className="p-6">
          {complianceData.slice(0, 7).map((record, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">
                {new Date(record.calculation_date).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${record.compliance_percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-12">
                  {Math.round(record.compliance_percentage)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdministrationRecords = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Administration Records</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {administrationRecords.map(record => (
            <div key={record.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {record.prescription_item_id.drug_id.drug_name}
                  </h4>
                  <p className="text-sm text-gray-600">{record.prescription_item_id.drug_id.dosage}</p>
                  <p className="text-sm text-gray-500">{record.prescription_item_id.dosage_instructions}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${statusColors[record.status]}`}>
                  {record.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Scheduled:</span>
                  <p>{new Date(record.scheduled_time).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Actual:</span>
                  <p>{new Date(record.actual_time).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Administered by:</span>
                  <p>{record.administered_by.first_name} {record.administered_by.last_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Route:</span>
                  <p>{record.administration_route}</p>
                </div>
              </div>

              {record.notes && (
                <div className="mt-3">
                  <span className="text-sm text-gray-500">Notes:</span>
                  <p className="text-sm">{record.notes}</p>
                </div>
              )}

              {record.patient_side_effects && record.patient_side_effects.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm font-medium text-red-600">Reported Side Effects:</span>
                  {record.patient_side_effects.map((se, index) => (
                    <div key={index} className="text-sm text-red-700 ml-2">
                      • {se.side_effect_id.side_effect_name} ({se.severity})
                      {se.action_taken && ` - Action: ${se.action_taken}`}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setNewSideEffect(prev => ({ ...prev, drug_administration_id: record.id }));
                  setActiveTab('sideEffects');
                }}
                className="mt-3 text-red-600 hover:text-red-800 text-sm flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Report Side Effect
              </button>
            </div>
          ))}
        </div>

        {administrationRecords.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TruckIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No administration records found</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRecordAdministration = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Record Drug Administration</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prescription Item</label>
            <select
              value={newAdministration.prescription_item_id}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, prescription_item_id: e.target.value }))}
              className="input-medical"
            >
              <option value="">Select medication</option>
              {activePrescriptions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.drug_id.drug_name} - {item.drug_id.dosage}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time</label>
            <input
              type="datetime-local"
              value={newAdministration.scheduled_time}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, scheduled_time: e.target.value }))}
              className="input-medical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actual Time</label>
            <input
              type="datetime-local"
              value={newAdministration.actual_time}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, actual_time: e.target.value }))}
              className="input-medical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dosage Administered</label>
            <input
              type="text"
              value={newAdministration.dosage_administered}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, dosage_administered: e.target.value }))}
              className="input-medical"
              placeholder="e.g., 1 tablet, 500mg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Administration Route</label>
            <select
              value={newAdministration.administration_route}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, administration_route: e.target.value }))}
              className="input-medical"
            >
              <option value="oral">Oral</option>
              <option value="iv">IV</option>
              <option value="im">IM</option>
              <option value="topical">Topical</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={newAdministration.status}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, status: e.target.value }))}
              className="input-medical"
            >
              <option value="administered">Administered</option>
              <option value="missed">Missed</option>
              <option value="refused">Refused</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              rows="3"
              value={newAdministration.notes}
              onChange={(e) => setNewAdministration(prev => ({ ...prev, notes: e.target.value }))}
              className="input-medical"
              placeholder="Any additional notes or observations..."
            />
          </div>
        </div>

        <button
          onClick={recordAdministration}
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? 'Recording...' : 'Record Administration'}
        </button>
      </div>
    </div>
  );

  const renderSideEffects = () => (
    <div className="card-medical">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Report Side Effect</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Administration Record</label>
            <select
              value={newSideEffect.drug_administration_id}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, drug_administration_id: e.target.value }))}
              className="input-medical"
            >
              <option value="">Select administration record</option>
              {administrationRecords.map(record => (
                <option key={record.id} value={record.id}>
                  {record.prescription_item_id.drug_id.drug_name} - {new Date(record.actual_time).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Side Effect</label>
            <select
              value={newSideEffect.side_effect_id}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, side_effect_id: e.target.value }))}
              className="input-medical"
            >
              <option value="">Select side effect</option>
              {sideEffects.map(effect => (
                <option key={effect.id} value={effect.id}>
                  {effect.side_effect_name} ({effect.severity_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Onset Time</label>
            <input
              type="datetime-local"
              value={newSideEffect.onset_time}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, onset_time: e.target.value }))}
              className="input-medical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={newSideEffect.severity}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, severity: e.target.value }))}
              className="input-medical"
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="life_threatening">Life Threatening</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action Taken</label>
            <input
              type="text"
              value={newSideEffect.action_taken}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, action_taken: e.target.value }))}
              className="input-medical"
              placeholder="e.g., Dose reduced, Medication changed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Time (if resolved)</label>
            <input
              type="datetime-local"
              value={newSideEffect.resolution_time}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, resolution_time: e.target.value }))}
              className="input-medical"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              rows="3"
              value={newSideEffect.notes}
              onChange={(e) => setNewSideEffect(prev => ({ ...prev, notes: e.target.value }))}
              className="input-medical"
              placeholder="Describe the side effect in detail..."
            />
          </div>
        </div>

        <button
          onClick={reportSideEffect}
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? 'Reporting...' : 'Report Side Effect'}
        </button>
      </div>
    </div>
  );

  if (!selectedPatient) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        {renderPatientSelection()}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Drug Administration Tracking</h1>
            <p className="text-gray-600">
              for {selectedPatient.first_name} {selectedPatient.last_name}
            </p>
          </div>
          <button
            onClick={() => setSelectedPatient(null)}
            className="btn-secondary"
          >
            Change Patient
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'records', 'recordAdmin', 'sideEffects'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'records' && 'Administration Records'}
              {tab === 'recordAdmin' && 'Record Administration'}
              {tab === 'sideEffects' && 'Side Effects'}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading drug administration data...</div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'records' && renderAdministrationRecords()}
          {activeTab === 'recordAdmin' && renderRecordAdministration()}
          {activeTab === 'sideEffects' && renderSideEffects()}
        </>
      )}
    </DashboardLayout>
  );
};

export default DoctorDrugAdmin;