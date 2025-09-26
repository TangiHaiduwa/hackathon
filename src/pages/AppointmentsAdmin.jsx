import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { UserGroupIcon, CalendarIcon } from '@heroicons/react/24/outline';

const AppointmentsAdmin = () => {
  const navigation = [
    { name: 'Dashboard', href: '/reception-dashboard', icon: UserGroupIcon },
    { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  ];

  return (
    <DashboardLayout user={{ name: 'Receptionist Lisa Brown', role: 'receptionist' }} navigation={navigation}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
        <p className="text-gray-600">Schedule and manage patient appointments</p>
      </div>
      
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Appointment Schedule</h2>
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Today's Appointments</h3>
            <p className="text-gray-600">24 appointments scheduled for today</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Waiting Patients</h3>
            <p className="text-gray-600">8 patients currently waiting</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AppointmentsAdmin;