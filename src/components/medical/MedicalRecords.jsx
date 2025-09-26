import React, { useState } from 'react';
import { 
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  CalendarIcon,
  UserCircleIcon,
  HeartIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const MedicalRecords = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Sample patient data
  const patients = [
    {
      id: 1,
      name: 'John Patient',
      age: 45,
      gender: 'Male',
      bloodType: 'A+',
      phone: '+264 81 123 4567',
      email: 'john.patient@email.com',
      lastVisit: '2025-03-10',
      status: 'Active',
      conditions: ['Malaria', 'Hypertension'],
      allergies: ['Penicillin', 'Shellfish']
    },
    {
      id: 2,
      name: 'Mary Johnson',
      age: 32,
      gender: 'Female',
      bloodType: 'O-',
      phone: '+264 81 234 5678',
      email: 'mary.johnson@email.com',
      lastVisit: '2025-03-12',
      status: 'Active',
      conditions: ['Typhoid Fever'],
      allergies: ['Aspirin']
    },
    {
      id: 3,
      name: 'Robert Brown',
      age: 68,
      gender: 'Male',
      bloodType: 'B+',
      phone: '+264 81 345 6789',
      email: 'robert.brown@email.com',
      lastVisit: '2025-03-08',
      status: 'Inactive',
      conditions: ['Diabetes', 'Malaria', 'Hypertension'],
      allergies: ['Latex', 'Peanuts']
    }
  ];

  // Sample medical records
  const medicalRecords = [
    {
      id: 1,
      patientId: 1,
      patientName: 'John Patient',
      date: '2025-03-10',
      doctor: 'Dr. Sarah Smith',
      type: 'Diagnosis',
      condition: 'Malaria',
      symptoms: ['Fever', 'Headache', 'Fatigue'],
      treatment: 'Chloroquine Phosphate 500mg daily for 7 days',
      notes: 'Patient responded well to treatment. Follow-up in 2 weeks.',
      status: 'Completed'
    },
    {
      id: 2,
      patientId: 2,
      patientName: 'Mary Johnson',
      date: '2025-03-12',
      doctor: 'Dr. Michael Brown',
      type: 'Diagnosis',
      condition: 'Typhoid Fever',
      symptoms: ['Abdominal Pain', 'Persistent Fever', 'Weakness'],
      treatment: 'Ciprofloxacin 500mg twice daily for 14 days',
      notes: 'Patient advised to maintain hydration and rest.',
      status: 'Ongoing'
    },
    {
      id: 3,
      patientId: 1,
      patientName: 'John Patient',
      date: '2025-02-28',
      doctor: 'Dr. Sarah Smith',
      type: 'Check-up',
      condition: 'Hypertension',
      symptoms: ['Routine Check-up'],
      treatment: 'Continue current medication, monitor BP weekly',
      notes: 'Blood pressure well controlled with current medication.',
      status: 'Completed'
    }
  ];

  const statuses = ['all', 'Active', 'Inactive'];

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPatientRecords = (patientId) => {
    return medicalRecords.filter(record => record.patientId === patientId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-purple-600 p-3 rounded-xl">
              <DocumentTextIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Medical Records System</h1>
              <p className="text-lg text-gray-600">Comprehensive patient health information management</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-8 px-6">
            {['patients', 'records', 'history', 'documents'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'patients' ? 'Patient Directory' :
                 tab === 'records' ? 'Medical Records' :
                 tab === 'history' ? 'Treatment History' : 'Documents'}
              </button>
            ))}
          </nav>
        </div>

        {/* Patients Directory */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Patient Directory</h2>
              <div className="flex space-x-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>
                        {status === 'all' ? 'All Status' : status}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Patient
                </button>
              </div>
            </div>

            {/* Patients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map(patient => (
                <div key={patient.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <UserCircleIcon className="h-12 w-12 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{patient.name}</h3>
                      <p className="text-sm text-gray-600">Age: {patient.age} • {patient.gender}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-3">
                    <div className="flex justify-between">
                      <span>Blood Type:</span>
                      <span className="font-medium">{patient.bloodType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Visit:</span>
                      <span className="font-medium">{patient.lastVisit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${
                        patient.status === 'Active' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {patient.status}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">Conditions:</h4>
                    <div className="flex flex-wrap gap-1">
                      {patient.conditions.map((condition, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setSelectedPatient(patient)}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      View Records
                    </button>
                    <div className="flex space-x-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-green-600">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No patients found matching your criteria.
              </div>
            )}
          </div>
        )}

        {/* Medical Records */}
        {activeTab === 'records' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Medical Records</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {medicalRecords.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.patientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 inline mr-1" />
                        {record.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.doctor}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {record.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{record.treatment}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button 
                          onClick={() => setSelectedRecord(record)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-900">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Patient Detail Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Patient Medical Records</h3>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <TrashIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Patient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Personal Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Full Name:</span>
                        <span className="font-medium">{selectedPatient.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Age/Gender:</span>
                        <span className="font-medium">{selectedPatient.age} years, {selectedPatient.gender}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Blood Type:</span>
                        <span className="font-medium">{selectedPatient.bloodType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contact:</span>
                        <span className="font-medium">{selectedPatient.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Medical Overview</h4>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Current Conditions</h5>
                        <div className="flex flex-wrap gap-1">
                          {selectedPatient.conditions.map((condition, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Allergies</h5>
                        <div className="flex flex-wrap gap-1">
                          {selectedPatient.allergies.map((allergy, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medical Records */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 bg-gray-50 border-b">
                    <h4 className="font-semibold text-gray-900">Treatment History</h4>
                  </div>
                  <div className="p-4">
                    {getPatientRecords(selectedPatient.id).map(record => (
                      <div key={record.id} className="border-b border-gray-200 last:border-0 py-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{record.condition}</h5>
                            <p className="text-sm text-gray-600">{record.doctor} • {record.date}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{record.treatment}</p>
                        <p className="text-sm text-gray-600">{record.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <ArrowDownTrayIcon className="h-4 w-4 inline mr-2" />
                    Export Records
                  </button>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <ShareIcon className="h-4 w-4 inline mr-2" />
                    Share with Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecords;