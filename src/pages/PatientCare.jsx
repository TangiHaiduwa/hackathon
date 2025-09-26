import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { UserGroupIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const PatientCare = () => {
  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon },
    { name: 'Patient Care', href: '/patient-care', icon: ClipboardDocumentListIcon },
  ];

  return (
    <DashboardLayout user={{ name: 'Nurse Sarah Johnson', role: 'nurse' }} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Care Management</h1>
        <p className="text-gray-600">Manage patient care and medical assistance</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Care Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Vital Signs Monitoring</h3>
            <p className="text-gray-600">Record and track patient vital signs</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Medication Administration</h3>
            <p className="text-gray-600">Administer prescribed medications</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Patient Notes</h3>
            <p className="text-gray-600">Document patient observations</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Care Plans</h3>
            <p className="text-gray-600">Manage patient care plans</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientCare;