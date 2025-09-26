// src/pages/MedicalRecords.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  UserGroupIcon,
  CalendarIcon,
  PhoneIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserCircleIcon,
  IdentificationIcon,
  PhoneIcon as PhoneSolid,
  EnvelopeIcon,
  MapPinIcon,
  CakeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const MedicalRecords1 = () => {
  const [user, setUser] = useState({
    name: 'Receptionist Lisa Brown',
    email: 'reception@demo.com',
    role: 'receptionist',
    department: 'Front Desk'
  });

  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigation = [
      { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon, current: true },
      { name: 'Appointments', href: '/receptionist/receptionist-appointments', icon: CalendarIcon, current: false },
      { name: 'Patient Registration', href: '/receptionist/patient-registration', icon: PlusIcon, current: false },
      { name: 'Scheduling', href: '/receptionist/scheduling', icon: ClockIcon, current: false },
      { name: 'Medical Records', href: '/reception/medical-records1', icon: ClockIcon, current: false },
  
  
    ];

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    // Medical Information
    bloodType: '',
    insuranceProvider: '',
    insuranceNumber: '',
    medicalHistory: '',
    knownAllergies: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          blood_type_id,
          emergency_contact_name,
          emergency_contact_phone,
          insurance_provider,
          insurance_number,
          users:users!inner(
            first_name,
            last_name,
            email,
            phone_number,
            date_of_birth,
            gender_id,
            address,
            created_at
          ),
          blood_types:blood_type_id(
            blood_type_code,
            description
          ),
          genders:users!inner(gender_id(
            gender_code,
            gender_name
          ))
        `)
        .order('created_at', { foreignTable: 'users', ascending: false });

      if (error) throw error;

      const formattedPatients = (data || []).map(patient => ({
        id: patient.id,
        firstName: patient.users.first_name,
        lastName: patient.users.last_name,
        email: patient.users.email,
        phone: patient.users.phone_number,
        dateOfBirth: patient.users.date_of_birth,
        gender: patient.genders?.gender_name || 'Not specified',
        address: patient.users.address,
        emergencyContactName: patient.emergency_contact_name,
        emergencyContactPhone: patient.emergency_contact_phone,
        bloodType: patient.blood_types?.blood_type_code || 'Not specified',
        insuranceProvider: patient.insurance_provider,
        insuranceNumber: patient.insurance_number,
        medicalHistory: '', // Would come from separate table
        knownAllergies: '', // Would come from separate table
        createdAt: patient.users.created_at
      }));

      setPatients(formattedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = patients.filter(patient =>
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      patient.email.toLowerCase().includes(searchLower) ||
      patient.phone.toLowerCase().includes(searchLower) ||
      patient.insuranceNumber.toLowerCase().includes(searchLower)
    );
    
    setFilteredPatients(filtered);
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender.toLowerCase(),
      address: patient.address,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      bloodType: patient.bloodType,
      insuranceProvider: patient.insuranceProvider,
      insuranceNumber: patient.insuranceNumber,
      medicalHistory: patient.medicalHistory,
      knownAllergies: patient.knownAllergies
    });
    setShowPatientModal(true);
  };

  const handleViewPatient = (patient) => {
    setEditingPatient(patient);
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      bloodType: patient.bloodType,
      insuranceProvider: patient.insuranceProvider,
      insuranceNumber: patient.insuranceNumber,
      medicalHistory: patient.medicalHistory,
      knownAllergies: patient.knownAllergies
    });
    setShowPatientModal(true);
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to delete this patient record? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      
      // First delete from patients table
      const { error: patientError } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (patientError) throw patientError;

      // Then delete from users table (this will cascade due to foreign key)
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', patientId);

      if (userError) throw userError;

      setSuccess('Patient record deleted successfully');
      fetchPatients();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError('Failed to delete patient record: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingPatient) {
        // Update existing patient
        await updatePatient(editingPatient.id);
      } else {
        // This would be for creating new patients, but we have separate registration page
        setError('Use the Patient Registration page for new patients');
        return;
      }
    } catch (error) {
      console.error('Error saving patient:', error);
      setError('Failed to save patient record: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePatient = async (patientId) => {
    // Get gender ID
    let genderId = null;
    if (formData.gender) {
      const { data: genderData } = await supabase
        .from('genders')
        .select('id')
        .eq('gender_code', formData.gender)
        .single();
      genderId = genderData?.id;
    }

    // Get blood type ID
    let bloodTypeId = null;
    if (formData.bloodType && formData.bloodType !== 'Not specified') {
      const { data: bloodTypeData } = await supabase
        .from('blood_types')
        .select('id')
        .eq('blood_type_code', formData.bloodType)
        .single();
      bloodTypeId = bloodTypeData?.id;
    }

    // Update users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone,
        date_of_birth: formData.dateOfBirth,
        gender_id: genderId,
        address: formData.address,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId);

    if (userError) throw userError;

    // Update patients table
    const { error: patientError } = await supabase
      .from('patients')
      .update({
        blood_type_id: bloodTypeId,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        insurance_provider: formData.insuranceProvider,
        insurance_number: formData.insuranceNumber
      })
      .eq('id', patientId);

    if (patientError) throw patientError;

    setSuccess('Patient record updated successfully');
    setShowPatientModal(false);
    setEditingPatient(null);
    fetchPatients();
    
    setTimeout(() => setSuccess(''), 5000);
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
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      bloodType: '',
      insuranceProvider: '',
      insuranceNumber: '',
      medicalHistory: '',
      knownAllergies: ''
    });
    setEditingPatient(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && patients.length === 0) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading medical records...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navigation={navigation}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-gray-600">Manage and view patient medical records</p>
        </div>

        {/* Notifications */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-800">{success}</span>
            <button 
              onClick={() => setSuccess('')}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, email, phone, or insurance number..."
                  className="input-medical pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = '/receptionist/register'}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                New Patient
              </button>
            </div>
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Patient Records ({filteredPatients.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medical Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <IdentificationIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No patients found matching your search' : 'No patient records found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            DOB: {formatDate(patient.dateOfBirth)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.email}</div>
                        <div className="text-sm text-gray-500">{patient.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Blood Type: <span className="font-medium">{patient.bloodType}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Insurance: {patient.insuranceProvider || 'None'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(patient.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewPatient(patient)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditPatient(patient)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Edit Patient"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Delete Patient"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Modal */}
        {showPatientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingPatient ? 'Patient Details' : 'New Patient'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowPatientModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        className="input-medical"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        readOnly={!editingPatient}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        className="input-medical"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        readOnly={!editingPatient}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        className="input-medical"
                        value={formData.email}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        className="input-medical"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        readOnly={!editingPatient}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {editingPatient && (
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPatientModal(false);
                          resetForm();
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Update Patient'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MedicalRecords1;