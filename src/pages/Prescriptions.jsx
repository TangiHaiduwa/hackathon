import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { BuildingLibraryIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const Prescriptions = () => {
  const navigation = [
    { name: 'Dashboard', href: '/pharmacist-dashboard', icon: BuildingLibraryIcon },
    { name: 'Prescriptions', href: '/prescriptions', icon: ClipboardDocumentListIcon },
  ];

  return (
    <DashboardLayout user={{ name: 'Pharmacist Emily Davis', role: 'pharmacist' }} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prescription Management</h1>
        <p className="text-gray-600">Process and manage medication prescriptions</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Prescription Processing</h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Pending Prescriptions</h3>
            <p className="text-gray-600">12 prescriptions awaiting processing</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Today's Dispensed</h3>
            <p className="text-gray-600">8 prescriptions dispensed today</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Prescriptions;