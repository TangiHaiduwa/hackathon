import React, { useState } from 'react';
import { 
  ChartBarIcon,
  DocumentChartBarIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const ReportingModule = () => {
  const [activeReport, setActiveReport] = useState('overview');
  const [dateRange, setDateRange] = useState('last30days');
  const [selectedReport, setSelectedReport] = useState(null);

  // Sample report data
  const reports = [
    {
      id: 1,
      title: 'Monthly Disease Statistics',
      type: 'Statistical',
      date: '2025-03-15',
      generatedBy: 'System Admin',
      description: 'Comprehensive analysis of disease prevalence and trends',
      data: {
        malariaCases: 124,
        typhoidCases: 87,
        combinedCases: 23,
        recoveryRate: 94.5
      }
    },
    {
      id: 2,
      title: 'Prescription Analysis Report',
      type: 'Pharmacy',
      date: '2025-03-14',
      generatedBy: 'Pharmacy Manager',
      description: 'Analysis of drug prescriptions and inventory usage',
      data: {
        totalPrescriptions: 256,
        mostPrescribed: 'Chloroquine Phosphate',
        inventoryTurnover: 78.2
      }
    },
    {
      id: 3,
      title: 'Patient Demographics Report',
      type: 'Demographic',
      date: '2025-03-10',
      generatedBy: 'Medical Director',
      description: 'Patient demographic analysis and distribution',
      data: {
        totalPatients: 1247,
        averageAge: 42.3,
        genderDistribution: { male: 54, female: 46 }
      }
    }
  ];

  // Sample analytics data
  const analyticsData = {
    diseaseTrends: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      malaria: [45, 52, 48, 61, 55, 58],
      typhoid: [32, 38, 41, 36, 44, 39]
    },
    patientStats: {
      newPatients: 89,
      returningPatients: 156,
      appointmentRate: 78.5
    },
    pharmacyStats: {
      prescriptionsFilled: 234,
      revenue: 12560.75,
      popularDrugs: ['Chloroquine', 'Ciprofloxacin', 'Paracetamol']
    }
  };

  const generateReport = (reportType) => {
    // Simulate report generation
    setTimeout(() => {
      setSelectedReport({
        type: reportType,
        timestamp: new Date().toISOString(),
        content: `Generated ${reportType} report for ${dateRange}`
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-orange-600 p-3 rounded-xl">
              <ChartBarIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Reporting & Analytics</h1>
              <p className="text-lg text-gray-600">Comprehensive insights and reporting system</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Report Type Selection */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setActiveReport('overview')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeReport === 'overview'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dashboard Overview
                </button>
                <button
                  onClick={() => setActiveReport('disease')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeReport === 'disease'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Disease Reports
                </button>
                <button
                  onClick={() => setActiveReport('pharmacy')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeReport === 'pharmacy'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pharmacy Reports
                </button>
                <button
                  onClick={() => setActiveReport('patient')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeReport === 'patient'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Patient Reports
                </button>
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center space-x-4 mt-4">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="last90days">Last 90 Days</option>
                  <option value="ytd">Year to Date</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Analytics Dashboard */}
            {activeReport === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Total Patients</h3>
                  <div className="text-3xl font-bold text-blue-600">1,247</div>
                  <p className="text-sm text-green-600">↑ 12% from last month</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Malaria Cases</h3>
                  <div className="text-3xl font-bold text-red-600">124</div>
                  <p className="text-sm text-green-600">↓ 8% from last month</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Recovery Rate</h3>
                  <div className="text-3xl font-bold text-green-600">94.5%</div>
                  <p className="text-sm text-green-600">↑ 2.3% from last month</p>
                </div>
              </div>
            )}

            {/* Generated Reports */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Generated Reports</h2>
              
              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{report.title}</h3>
                        <p className="text-sm text-gray-600">{report.description}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {report.type}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>Generated on {report.date} by {report.generatedBy}</span>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                        <PrinterIcon className="h-4 w-4 mr-1" />
                        Print
                      </button>
                      <button className="flex items-center px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => generateReport('Diagnosis Summary')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  <div className="font-medium text-gray-900">Diagnosis Summary</div>
                  <div className="text-sm text-gray-600">Current month statistics</div>
                </button>
                
                <button 
                  onClick={() => generateReport('Prescription Report')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  <div className="font-medium text-gray-900">Prescription Report</div>
                  <div className="text-sm text-gray-600">Pharmacy activity</div>
                </button>
                
                <button 
                  onClick={() => generateReport('Patient Demographics')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  <div className="font-medium text-gray-900">Patient Demographics</div>
                  <div className="text-sm text-gray-600">Age, gender, location</div>
                </button>
                
                <button 
                  onClick={() => generateReport('Revenue Report')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  <div className="font-medium text-gray-900">Revenue Report</div>
                  <div className="text-sm text-gray-600">Financial overview</div>
                </button>
              </div>

              {/* Report Status */}
              {selectedReport && (
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <DocumentChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 font-medium">Report Generated</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">{selectedReport.content}</p>
                  <div className="flex space-x-2 mt-2">
                    <button className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                      View
                    </button>
                    <button className="text-xs border border-green-600 text-green-600 px-2 py-1 rounded hover:bg-green-50">
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingModule;