import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const Vitals = () => {
  const navigation = [
    { name: 'Dashboard', href: '/nurse-dashboard', icon: UserGroupIcon },
    { name: 'Vital Signs', href: '/vitals', icon: ChartBarIcon },
  ];

  return (
    <DashboardLayout user={{ name: 'Nurse Sarah Johnson', role: 'nurse' }} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vital Signs Monitoring</h1>
        <p className="text-gray-600">Record and track patient vital signs</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Vital Signs Management</h2>
        <p>Vital signs recording interface would go here...</p>
      </div>
    </DashboardLayout>
  );
};

export default Vitals;