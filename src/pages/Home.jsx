import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BuildingLibraryIcon,
  DocumentChartBarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Header */}
      <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-800 p-3 rounded-xl">
                <BuildingLibraryIcon className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-gray-900">MESMTF</span>
                  <span className="text-lg font-light text-blue-700 ml-2">Pro</span>
                </div>
                <p className="text-sm text-gray-600">Ministry of Health & Social Services</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200">Features</a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200">Benefits</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200">Contact</a>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 px-4 py-2 rounded-lg border border-gray-300 hover:border-blue-800">
                Login
              </Link>
              <Link to="/register" className="bg-blue-800 text-white px-6 py-2.5 rounded-lg hover:bg-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg">
                Register as Patient
                <ArrowRightIcon className="h-4 w-4 inline-block ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Official Government Healthcare Platform
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Advanced Medical Expert System for
                <span className="text-blue-800 block">Malaria & Typhoid Detection</span>
              </h1>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                A comprehensive e-Health solution featuring AI-powered diagnosis, 
                secure medical records, and integrated healthcare management for the Ministry of Health and Social Services.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/register" className="group bg-blue-800 text-white px-8 py-4 rounded-lg hover:bg-blue-900 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl inline-flex items-center justify-center">
                  Patient Registration
                  <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                
                <Link to="/login" className="group border-2 border-blue-800 text-blue-800 px-8 py-4 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold text-lg inline-flex items-center justify-center">
                  Healthcare Professional Access
                </Link>
              </div>
            </div>

            {/* Medical Illustration Placeholder */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white text-center">
              <div className="bg-white/20 rounded-xl p-6 mb-6">
                <HeartIcon className="h-20 w-20 mx-auto text-white/90" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI-Powered Healthcare</h3>
              <p className="text-blue-100">
                Advanced expert system technology for accurate diagnosis and treatment recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Comprehensive Healthcare Solutions</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Designed to meet the rigorous standards of government healthcare infrastructure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="group bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-7 w-7 text-blue-800" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Benefits</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Transforming healthcare delivery through technology and innovation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">99%</div>
              <div className="text-blue-200">Diagnosis Accuracy</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-200">System Availability</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-200">Healthcare Partners</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">50K+</div>
              <div className="text-blue-200">Patients Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-8 md:p-12 shadow-lg">
            <DocumentChartBarIcon className="h-16 w-16 mx-auto mb-6 text-blue-600" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to Transform Healthcare Experience?
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Join our nationwide network of healthcare providers and patients benefiting from advanced medical technology.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">For Patients</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Easy registration, quick diagnosis, and seamless appointment booking
                </p>
                <Link to="/register" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium inline-block">
                  Get Started
                </Link>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold text-lg mb-2">For Healthcare Staff</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Advanced tools for diagnosis, treatment, and patient management
                </p>
                <Link to="/login" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-200 font-medium inline-block">
                  Staff Login
                </Link>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Need Assistance?</h4>
              <p className="text-blue-600 text-sm">
                Contact our support team at <strong>+264 61 207 2052</strong> or email <strong>tfse@nust.na</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <BuildingLibraryIcon className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold">MESMTF</span>
                <span className="text-xl font-light text-blue-400">Pro</span>
              </div>
              <p className="text-gray-400 text-sm">
                Advanced Medical Expert System for Malaria and Typhoid Fever
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition duration-200">Features</a></li>
                <li><a href="#benefits" className="hover:text-white transition duration-200">Benefits</a></li>
                <li><Link to="/login" className="hover:text-white transition duration-200">Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition duration-200">Register</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-gray-400 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4" />
                  <span>13 Jackson Kaijieua Street, Windbrook, Namibia</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="h-4 w-4" />
                  <span>+264 61 207 2052</span>
                </div>
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="h-4 w-4" />
                  <span>tfse@nust.na</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Ministry</h4>
              <p className="text-gray-400 text-sm">
                Ministry of Health and Social Services<br />
                Republic of Namibia
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Medical Expert System for Malaria and Typhoid Fever. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: HeartIcon,
    title: 'AI-Powered Diagnosis',
    description: 'Rule-based expert system for accurate Malaria and Typhoid detection with comprehensive symptom analysis.'
  },
  {
    icon: DocumentChartBarIcon,
    title: 'Secure Medical Records',
    description: 'Government-grade security with role-based access control and encrypted data storage.'
  },
  {
    icon: ClockIcon,
    title: 'Appointment Management',
    description: 'Efficient scheduling system with automated reminders and healthcare professional matching.'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Multi-Platform Access',
    description: 'Fully responsive design accessible across all devices with optimized performance.'
  },
  {
    icon: UserGroupIcon,
    title: 'Role-Based System',
    description: 'Customized workflows for patients, doctors, nurses, pharmacists, and administrators.'
  },
  {
    icon: ChartBarIcon,
    title: 'Advanced Reporting',
    description: 'Real-time analytics and comprehensive reporting for informed decision-making.'
  }
];

const benefits = [
  {
    icon: ShieldCheckIcon,
    title: 'Enhanced Security',
    description: 'Military-grade encryption protecting sensitive patient data'
  },
  {
    icon: ClockIcon,
    title: 'Time Efficiency',
    description: 'Reduce diagnosis time by up to 70% with AI assistance'
  },
  {
    icon: ChartBarIcon,
    title: 'Data Insights',
    description: 'Real-time analytics for public health monitoring'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Accessibility',
    description: 'Available online and offline for remote areas'
  }
];

export default Home;