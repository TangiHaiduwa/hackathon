import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PrinterIcon,
  ChartPieIcon,
  UserGroupIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Simple chart components for visualization
const BarChart = ({ data, title, color = 'blue' }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <span className="w-32 text-sm text-gray-600 truncate">{item.label}</span>
            <div className="flex-1 ml-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{item.value}</span>
                <span>{maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${colorClasses[color]}`}
                  style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4'];

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
      <div className="flex flex-wrap items-center">
        <div className="w-32 h-32 relative">
          {/* Simple pie chart visualization */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {data.reduce((acc, item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = acc;
              const endAngle = startAngle + percentage * 3.6;
              
              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArc = percentage > 50 ? 1 : 0;
              
              return [
                ...acc,
                <path
                  key={index}
                  d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="1"
                />
              ];
            }, [])}
          </svg>
        </div>
        <div className="ml-4 flex-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center mb-2">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-sm text-gray-600 flex-1">{item.label}</span>
              <span className="text-sm font-medium">{Math.round((item.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LineChart = ({ data, title, color = 'blue' }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const range = maxValue - minValue;
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range > 0 ? 100 - ((item.value - minValue) / range) * 100 : 50;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    blue: 'stroke-blue-500 text-blue-500',
    green: 'stroke-green-500 text-green-500',
    red: 'stroke-red-500 text-red-500'
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h4 className="font-medium text-gray-900 mb-4">{title}</h4>
      <div className="h-40 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y, i) => (
            <line key={i} x1="0" y1={y} x2="100" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
          ))}
          {/* Data line */}
          <polyline
            fill="none"
            strokeWidth="2"
            className={colorClasses[color]}
            points={points}
          />
          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = range > 0 ? 100 - ((item.value - minValue) / range) * 100 : 50;
            return (
              <circle key={index} cx={x} cy={y} r="2" className="fill-current" />
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
          {data.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const PharmacyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [reportType, setReportType] = useState('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState({});
  const [chartData, setChartData] = useState({});
  const [generating, setGenerating] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/pharmacist-dashboard', icon: BuildingLibraryIcon },
    { name: 'Prescriptions', href: '/pharmacy/prescriptions', icon: ClipboardDocumentListIcon },
    { name: 'Dispensing Workflow', href: '/pharmacy/dispensing-workflow', icon: ClipboardDocumentListIcon },
    { name: 'Inventory', href: '/pharmacy/inventory', icon: TruckIcon },
    { name: 'Dispensing', href: '/pharmacy/dispensing', icon: CheckCircleIcon },
    { name: 'Drug Administration', href: '/pharmacy/administration', icon: UserGroupIcon },
    { name: 'Reports', href: '/pharmacy/reports', icon: ChartBarIcon },
  ];

  const dateRanges = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const reportTypes = [
    { value: 'overview', label: 'Overview Dashboard', icon: ChartBarIcon },
    { value: 'prescriptions', label: 'Prescription Analytics', icon: DocumentArrowDownIcon },
    { value: 'inventory', label: 'Inventory Reports', icon: TruckIcon },
    { value: 'dispensing', label: 'Dispensing Analysis', icon: ClockIcon },
    { value: 'compliance', label: 'Compliance Monitoring', icon: UserGroupIcon },
    { value: 'financial', label: 'Financial Reports', icon: ArrowTrendingUpIcon }
  ];

  useEffect(() => {
    // Set default date range
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    
    fetchReportsData();
  }, [user]);

  useEffect(() => {
    if (startDate && endDate) {
      generateAnalytics();
    }
  }, [dateRange, startDate, endDate, reportType]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent generated reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          report_types(type_name),
          users!generated_by(first_name, last_name)
        `)
        .order('generated_at', { ascending: false })
        .limit(10);

      setReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = async () => {
    try {
      setGenerating(true);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Fetch data based on report type
      let analyticsData = {};
      let chartData = {};

      switch (reportType) {
        case 'overview':
          analyticsData = await generateOverviewAnalytics(start, end);
          chartData = await generateOverviewCharts(start, end);
          break;
        case 'prescriptions':
          analyticsData = await generatePrescriptionAnalytics(start, end);
          chartData = await generatePrescriptionCharts(start, end);
          break;
        case 'inventory':
          analyticsData = await generateInventoryAnalytics(start, end);
          chartData = await generateInventoryCharts(start, end);
          break;
        case 'dispensing':
          analyticsData = await generateDispensingAnalytics(start, end);
          chartData = await generateDispensingCharts(start, end);
          break;
        case 'compliance':
          analyticsData = await generateComplianceAnalytics(start, end);
          chartData = await generateComplianceCharts(start, end);
          break;
        case 'financial':
          analyticsData = await generateFinancialAnalytics(start, end);
          chartData = await generateFinancialCharts(start, end);
          break;
      }

      setAnalytics(analyticsData);
      setChartData(chartData);
    } catch (error) {
      console.error('Error generating analytics:', error);
    } finally {
      setGenerating(false);
    }
  };

  const generateOverviewAnalytics = async (start, end) => {
    // Prescription stats
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('id, prescription_date, status_id')
      .gte('prescription_date', start.toISOString())
      .lte('prescription_date', end.toISOString());

    // Dispensing stats
    const { data: dispensing } = await supabase
      .from('drug_dispensing')
      .select('quantity_dispensed, drug_inventory(unit_price)')
      .gte('dispensed_at', start.toISOString())
      .lte('dispensed_at', end.toISOString());

    // Inventory stats
    const { data: inventory } = await supabase
      .from('drug_inventory')
      .select('quantity, reorder_level, expiry_date');

    // Administration stats
    const { data: administrations } = await supabase
      .from('drug_administration')
      .select('status, scheduled_time')
      .gte('scheduled_time', start.toISOString())
      .lte('scheduled_time', end.toISOString());

    const totalRevenue = dispensing?.reduce((sum, item) => 
      sum + (item.quantity_dispensed * (item.drug_inventory?.unit_price || 0)), 0) || 0;

    const lowStockItems = inventory?.filter(item => item.quantity <= item.reorder_level).length || 0;
    const expiredItems = inventory?.filter(item => new Date(item.expiry_date) < new Date()).length || 0;

    const complianceRate = administrations?.length > 0 ? 
      (administrations.filter(a => a.status === 'administered').length / administrations.length) * 100 : 0;

    return {
      totalPrescriptions: prescriptions?.length || 0,
      totalDispensed: dispensing?.length || 0,
      totalRevenue,
      lowStockItems,
      expiredItems,
      complianceRate: Math.round(complianceRate),
      totalAdministrations: administrations?.length || 0
    };
  };

  const generateOverviewCharts = async (start, end) => {
    // Daily prescription trend
    const dailyData = [];
    const current = new Date(start);
    while (current <= end) {
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const { data: dailyPrescriptions } = await supabase
        .from('prescriptions')
        .select('id')
        .gte('prescription_date', current.toISOString())
        .lt('prescription_date', nextDay.toISOString());

      dailyData.push({
        label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: dailyPrescriptions?.length || 0
      });
      
      current.setDate(current.getDate() + 1);
    }

    // Medication category distribution
    const { data: categoryData } = await supabase
      .from('prescription_items')
      .select(`
        drugs!inner(
          drug_categories!inner(category_name)
        )
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    const categoryCount = {};
    categoryData?.forEach(item => {
      const category = item.drugs.drug_categories?.category_name || 'Uncategorized';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const categoryChart = Object.entries(categoryCount).map(([label, value]) => ({
      label,
      value
    }));

    return {
      dailyTrend: dailyData,
      categoryDistribution: categoryChart
    };
  };

  const generatePrescriptionAnalytics = async (start, end) => {
    // Detailed prescription analytics
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select(`
        id,
        prescription_date,
        status_id,
        prescription_statuses(status_name),
        patients!inner(
          users!inner(gender_id, genders(gender_code))
        ),
        medical_staff!inner(
          users!inner(first_name, last_name)
        ),
        prescription_items(
          drugs!inner(
            drug_name,
            drug_categories(category_name)
          )
        )
      `)
      .gte('prescription_date', start.toISOString())
      .lte('prescription_date', end.toISOString());

    return { prescriptions: prescriptions || [] };
  };

  const generatePrescriptionCharts = async (start, end) => {
    // Status distribution
    const { data: statusData } = await supabase
      .from('prescriptions')
      .select('status_id, prescription_statuses(status_name)')
      .gte('prescription_date', start.toISOString())
      .lte('prescription_date', end.toISOString());

    const statusCount = {};
    statusData?.forEach(item => {
      const status = item.prescription_statuses?.status_name || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const statusChart = Object.entries(statusCount).map(([label, value]) => ({
      label,
      value
    }));

    // Doctor prescription volume
    const { data: doctorData } = await supabase
      .from('prescriptions')
      .select('medical_staff!inner(users!inner(first_name, last_name))')
      .gte('prescription_date', start.toISOString())
      .lte('prescription_date', end.toISOString());

    const doctorCount = {};
    doctorData?.forEach(item => {
      const doctor = `${item.medical_staff.users.first_name} ${item.medical_staff.users.last_name}`;
      doctorCount[doctor] = (doctorCount[doctor] || 0) + 1;
    });

    const doctorChart = Object.entries(doctorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));

    return {
      statusDistribution: statusChart,
      topDoctors: doctorChart
    };
  };

  // Similar functions for other report types...
  const generateInventoryAnalytics = async (start, end) => {
    const { data: inventory } = await supabase
      .from('drug_inventory')
      .select(`
        *,
        drugs!inner(
          drug_name,
          drug_categories(category_name)
        )
      `);

    return { inventory: inventory || [] };
  };

  const generateDispensingAnalytics = async (start, end) => {
    const { data: dispensing } = await supabase
      .from('drug_dispensing')
      .select(`
        *,
        prescription_items!inner(
          drugs!inner(drug_name),
          prescriptions!inner(
            patients!inner(users!inner(first_name, last_name))
          )
        ),
        drug_inventory(unit_price)
      `)
      .gte('dispensed_at', start.toISOString())
      .lte('dispensed_at', end.toISOString());

    return { dispensing: dispensing || [] };
  };

  const generateComplianceAnalytics = async (start, end) => {
    const { data: compliance } = await supabase
      .from('treatment_compliance')
      .select(`
        *,
        patients!inner(users!inner(first_name, last_name))
      `)
      .gte('calculation_date', start.toISOString())
      .lte('calculation_date', end.toISOString());

    return { compliance: compliance || [] };
  };

  const generateFinancialAnalytics = async (start, end) => {
    const { data: financial } = await supabase
      .from('drug_dispensing')
      .select(`
        quantity_dispensed,
        dispensed_at,
        drug_inventory!inner(unit_price),
        prescription_items!inner(
          drugs!inner(drug_name)
        )
      `)
      .gte('dispensed_at', start.toISOString())
      .lte('dispensed_at', end.toISOString());

    return { financial: financial || [] };
  };

  const generateInventoryCharts = async (start, end) => {
    // Implement inventory charts
    return {};
  };

  const generateDispensingCharts = async (start, end) => {
    // Implement dispensing charts
    return {};
  };

  const generateComplianceCharts = async (start, end) => {
    // Implement compliance charts
    return {};
  };

  const generateFinancialCharts = async (start, end) => {
    // Implement financial charts
    return {};
  };

  const exportReport = (format = 'csv') => {
    const timestamp = new Date().toISOString().split('T')[0];
    let content = '';
    let filename = '';

    switch (format) {
      case 'csv':
        // Generate CSV content based on report type
        content = generateCSVContent();
        filename = `pharmacy_report_${reportType}_${timestamp}.csv`;
        break;
      case 'pdf':
        // For PDF, we would typically generate on server-side
        // This is a simplified version
        alert('PDF export would be generated server-side');
        return;
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVContent = () => {
    // Generate CSV content based on current analytics data
    const headers = ['Metric', 'Value', 'Date Range'];
    const data = [
      ['Total Prescriptions', analytics.totalPrescriptions, `${startDate} to ${endDate}`],
      ['Total Revenue', `N$${analytics.totalRevenue?.toFixed(2)}`, `${startDate} to ${endDate}`],
      ['Compliance Rate', `${analytics.complianceRate}%`, `${startDate} to ${endDate}`],
      ['Low Stock Items', analytics.lowStockItems, `As of ${new Date().toLocaleDateString()}`],
      ['Expired Items', analytics.expiredItems, `As of ${new Date().toLocaleDateString()}`]
    ];

    return [headers, ...data]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };

  const generateCustomReport = async () => {
    try {
      setGenerating(true);
      
      // Create a new report record
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          report_type_id: (await supabase.from('report_types').select('id').eq('type_code', 'custom').single()).data?.id,
          title: `${reportType.replace('_', ' ')} Report - ${new Date().toLocaleDateString()}`,
          generated_by: user.id,
          report_data: analytics,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          activity_type_id: (await supabase.from('activity_types').select('id').eq('activity_code', 'report_generated').single()).data?.id,
          table_name: 'reports',
          record_id: report.id,
          notes: `Generated ${reportType} report for ${startDate} to ${endDate}`
        });

      alert('Custom report generated successfully!');
      fetchReportsData();
    } catch (error) {
      console.error('Error generating custom report:', error);
      alert('Error generating report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navigation={navigation}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const currentReportType = reportTypes.find(rt => rt.value === reportType);

  return (
    <DashboardLayout user={user} navigation={navigation}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Pharmacy Analytics</h1>
            <p className="text-gray-600">Comprehensive reporting and business intelligence</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => exportReport('csv')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200 flex items-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export CSV
            </button>
            <button
              onClick={generateCustomReport}
              disabled={generating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center disabled:opacity-50"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Report Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          {dateRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* End Date */}
          {dateRange === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      {reportType === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <DocumentArrowDownIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Prescriptions</p>
                  <p className="text-2xl font-bold text-blue-900">{analytics.totalPrescriptions}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Revenue</p>
                  <p className="text-2xl font-bold text-green-900">N${analytics.totalRevenue?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Compliance</p>
                  <p className="text-2xl font-bold text-purple-900">{analytics.complianceRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-600">Low Stock</p>
                  <p className="text-2xl font-bold text-orange-900">{analytics.lowStockItems}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {chartData.dailyTrend && <LineChart data={chartData.dailyTrend} title="Daily Prescription Trend" />}
            {chartData.categoryDistribution && <PieChart data={chartData.categoryDistribution} title="Medication Categories" />}
          </div>
        </>
      )}

      {/* Prescription Analytics */}
      {reportType === 'prescriptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {chartData.statusDistribution && <BarChart data={chartData.statusDistribution} title="Prescription Status" color="blue" />}
          {chartData.topDoctors && <BarChart data={chartData.topDoctors} title="Top Prescribing Doctors" color="green" />}
        </div>
      )}

      {/* Recent Generated Reports */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recently Generated Reports</h3>
        </div>
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No reports generated yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition duration-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{report.title}</h4>
                    <p className="text-sm text-gray-600">
                      {report.report_types?.type_name} • Generated by {report.users?.first_name} on{' '}
                      {new Date(report.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 flex items-center">
                    <EyeIcon className="h-5 w-5 mr-1" />
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Summary */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">Report Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Report Type:</strong> {currentReportType?.label}
          </div>
          <div>
            <strong>Date Range:</strong> {startDate} to {endDate}
          </div>
          <div>
            <strong>Generated:</strong> {new Date().toLocaleString()}
          </div>
        </div>
        <div className="mt-4 text-sm text-blue-700">
          This report contains comprehensive analytics and insights for the selected period. 
          Use the export features to download data for further analysis.
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyReports;