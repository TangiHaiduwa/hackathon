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
  MapPinIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Header */}
      <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-blue-800 p-2 sm:p-3 rounded-xl">
                <BuildingLibraryIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-baseline">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">MESMTF</span>
                  <span className="text-base sm:text-lg font-light text-blue-700 ml-1 sm:ml-2">Pro</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Ministry of Health & Social Services</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 text-sm lg:text-base">
                Features
              </a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 text-sm lg:text-base">
                Benefits
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 text-sm lg:text-base">
                Contact
              </a>
            </div>
            
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg border border-gray-300 hover:border-blue-800 text-sm lg:text-base">
                Login
              </Link>
              <Link to="/register" className="bg-blue-800 text-white px-4 py-1.5 lg:px-6 lg:py-2.5 rounded-lg hover:bg-blue-900 transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm lg:text-base flex items-center">
                Register
                <ArrowRightIcon className="h-3 w-3 lg:h-4 lg:w-4 inline-block ml-1 lg:ml-2" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-700 hover:text-blue-800 hover:bg-gray-100 transition duration-200"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-4">
                <a 
                  href="#features" 
                  className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#benefits" 
                  className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Benefits
                </a>
                <a 
                  href="#contact" 
                  className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <div className="flex flex-col space-y-3 pt-2 border-t border-gray-200">
                  <Link 
                    to="/login" 
                    className="text-gray-700 hover:text-blue-800 font-medium transition duration-200 py-2 text-center border border-gray-300 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-all duration-200 font-medium text-center flex items-center justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register as Patient
                    <ArrowRightIcon className="h-4 w-4 inline-block ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="text-left order-2 lg:order-1">
              <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <ShieldCheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Official Government Healthcare Platform
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Advanced Medical Expert System for
                <span className="text-blue-800 block mt-1 sm:mt-2">Malaria & Typhoid Detection</span>
              </h1>
              
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                A comprehensive e-Health solution featuring AI-powered diagnosis, 
                secure medical records, and integrated healthcare management for the Ministry of Health and Social Services.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                <Link to="/register" className="group bg-blue-800 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg hover:bg-blue-900 transition-all duration-200 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl inline-flex items-center justify-center">
                  Patient Registration
                  <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                
                <Link to="/login" className="group border-2 border-blue-800 text-blue-800 px-6 py-3 sm:px-8 sm:py-4 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold text-base sm:text-lg inline-flex items-center justify-center">
                  Healthcare Professional
                </Link>
              </div>
            </div>

            {/* Medical Illustration Placeholder */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 sm:p-8 text-white text-center order-1 lg:order-2">
              <div className="bg-white/20 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <HeartIcon className="h-16 w-16 sm:h-20 sm:w-20 mx-auto text-white/90" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">AI-Powered Healthcare</h3>
              <p className="text-blue-100 text-sm sm:text-base">
                Advanced expert system technology for accurate diagnosis and treatment recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Comprehensive Healthcare Solutions</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">
              Designed to meet the rigorous standards of government healthcare infrastructure
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <div key={index} className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="bg-blue-100 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-800" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-12 sm:py-16 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Key Benefits</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">
              Transforming healthcare delivery through technology and innovation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg text-center">
                <div className="bg-green-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <benefit.icon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">99%</div>
              <div className="text-blue-200 text-xs sm:text-sm">Diagnosis Accuracy</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">24/7</div>
              <div className="text-blue-200 text-xs sm:text-sm">System Availability</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">500+</div>
              <div className="text-blue-200 text-xs sm:text-sm">Healthcare Partners</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">50K+</div>
              <div className="text-blue-200 text-xs sm:text-sm">Patients Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-6 sm:p-8 lg:p-12 shadow-lg">
            <DocumentChartBarIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 sm:mb-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 text-center">
              Ready to Transform Healthcare Experience?
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 max-w-2xl mx-auto text-center">
              Join our nationwide network of healthcare providers and patients benefiting from advanced medical technology.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <UserGroupIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-blue-600" />
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-center">For Patients</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 text-center">
                  Easy registration, quick diagnosis, and seamless appointment booking
                </p>
                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-medium inline-block w-full text-center text-sm sm:text-base">
                  Get Started
                </Link>
              </div>
              
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <ShieldCheckIcon className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-green-600" />
                <h3 className="font-semibold text-base sm:text-lg mb-2 text-center">For Healthcare Staff</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 text-center">
                  Advanced tools for diagnosis, treatment, and patient management
                </p>
                <Link to="/login" className="bg-green-600 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-lg hover:bg-green-700 transition duration-200 font-medium inline-block w-full text-center text-sm sm:text-base">
                  Staff Login
                </Link>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2 text-center text-sm sm:text-base">Need Assistance?</h4>
              <p className="text-blue-600 text-xs sm:text-sm text-center">
                Contact our support team at <strong>+264 61 207 2052</strong> or email <strong>tfse@nust.na</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <BuildingLibraryIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                <span className="text-xl sm:text-2xl font-bold">MESMTF</span>
                <span className="text-lg sm:text-xl font-light text-blue-400">Pro</span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                Advanced Medical Expert System for Malaria and Typhoid Fever
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Quick Links</h4>
              <ul className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-white transition duration-200">Features</a></li>
                <li><a href="#benefits" className="hover:text-white transition duration-200">Benefits</a></li>
                <li><Link to="/login" className="hover:text-white transition duration-200">Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition duration-200">Register</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Contact Info</h4>
              <div className="space-y-1 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <div className="flex items-start space-x-2">
                  <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                  <span>13 Jackson Kaijieua Street, Windbrook, Namibia</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>+264 61 207 2052</span>
                </div>
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>tfse@nust.na</span>
                </div>
              </div>
            </div>
            
            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Ministry</h4>
              <p className="text-gray-400 text-xs sm:text-sm">
                Ministry of Health and Social Services<br />
                Republic of Namibia
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-gray-500 text-xs sm:text-sm">
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