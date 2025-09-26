import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

const Medication = () => {
  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon },
    { name: 'Medication', href: '/medication', icon: ClockIcon },
  ];

  return (
    <DashboardLayout user={{ name: 'Nurse Sarah Johnson', role: 'nurse' }} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medication Administration</h1>
        <p className="text-gray-600">Manage and administer patient medications</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Medication Schedule</h2>
        <p>Medication administration interface would go here...</p>
      </div>
    </DashboardLayout>
  );
};

export default Medication;