import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Preload } from '@react-three/drei';
import { 
  HeartIcon, 
  ClockIcon, 
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BuildingLibraryIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

// Simple 3D Model Component
const Model = ({ modelPath, scale = 1 }) => {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={scale} />;
};

// Loading component that uses Three.js compatible elements
const Loader = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#3b82f6" />
  </mesh>
);

// Microscope 3D Model with LARGER canvas and BETTER zoom
const MicroscopeModel = () => (
  <Canvas 
    shadows
    camera={{ position: [4, 3, 6], fov: 40 }}
    className="h-96 w-full"  // Increased from h-72 to h-96
  >
    <Suspense fallback={<Loader />}>
      <Model modelPath="/models/microscope.glb" scale={1.2} /> {/* Increased scale */}

      <OrbitControls 
        enableZoom
        enablePan
        enableRotate
        minDistance={0.5}    // Closer zoom
        maxDistance={20}     // Further zoom out
        enableDamping
        dampingFactor={0.05}
        zoomSpeed={2}        // Faster zoom
        panSpeed={1.5}       // Faster pan
        rotateSpeed={1}      // Smoother rotation
      />

      {/* Enhanced Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[8, 15, 8]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight 
        position={[-8, 12, -8]} 
        angle={0.4} 
        penumbra={0.6} 
        intensity={1.2} 
        castShadow 
      />
      <hemisphereLight 
        skyColor="#b1e1ff" 
        groundColor="#000000" 
        intensity={0.8} 
      />

      {/* Enhanced Shadows & Environment */}
      <ContactShadows 
        position={[0, -1.5, 0]} 
        opacity={0.8} 
        scale={15} 
        blur={3} 
        far={6} 
      />
      <Environment preset="studio" /> {/* Changed to studio for better medical lighting */}

      <Preload all />
    </Suspense>
  </Canvas>
);

// Operating Room 3D Model with LARGER canvas and BETTER zoom
const OperatingRoomModel = () => (
  <Canvas 
    shadows
    camera={{ position: [8, 6, 12], fov: 40 }}
    className="h-96 w-full"  // Increased from h-72 to h-96
  >
    <Suspense fallback={<Loader />}>
      <Model modelPath="/models/operating-room.glb" scale={0.9} /> {/* Increased scale */}

      <OrbitControls 
        enableZoom
        enablePan
        enableRotate
        minDistance={1}      // Closer zoom
        maxDistance={30}     // Further zoom out
        enableDamping
        dampingFactor={0.05}
        zoomSpeed={2}        // Faster zoom
        panSpeed={1.5}       // Faster pan
        rotateSpeed={1}      // Smoother rotation
      />

      {/* Enhanced Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[12, 20, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight 
        position={[-12, 18, -10]} 
        angle={0.4} 
        penumbra={0.6} 
        intensity={1.2} 
        castShadow 
      />
      <hemisphereLight 
        skyColor="#b1e1ff" 
        groundColor="#000000" 
        intensity={0.8} 
      />

      {/* Enhanced Shadows & Environment */}
      <ContactShadows 
        position={[0, -2, 0]} 
        opacity={0.8} 
        scale={20} 
        blur={3} 
        far={8} 
      />
      <Environment preset="studio" /> {/* Changed to studio for better medical lighting */}

      <Preload all />
    </Suspense>
  </Canvas>
);

// External loading indicator (outside Canvas)
const LoadingIndicator = () => (
  <div className="h-96 w-full flex items-center justify-center bg-gray-100 rounded-xl"> {/* Increased height */}
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-800 mx-auto mb-4"></div> {/* Larger spinner */}
      <p className="text-gray-600 text-lg">Loading 3D model...</p> {/* Larger text */}
    </div>
  </div>
);

const Home = () => {
  const [modelsLoaded, setModelsLoaded] = React.useState(false);

  React.useEffect(() => {
    // Simple timeout to show loading state
    const timer = setTimeout(() => {
      setModelsLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

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
              <a href="#technology" className="text-gray-700 hover:text-blue-800 font-medium transition duration-200">Technology</a>
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

      {/* Hero Section with Microscope - Increased container size */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8"> {/* Increased padding */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"> {/* Increased gap */}
            <div className="text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Official Government Healthcare Platform
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"> {/* Larger text */}
                Advanced Medical Expert System for
                <span className="text-blue-800 block">Malaria & Typhoid Detection</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed"> {/* Larger text */}
                A comprehensive e-Health solution featuring AI-powered diagnosis, 
                secure medical records, and integrated healthcare management.
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

            {/* Microscope 3D Model - Larger container */}
            <div className="bg-white rounded-2xl shadow-xl p-6"> {/* Increased padding and rounded */}
              {modelsLoaded ? <MicroscopeModel /> : <LoadingIndicator />}
              <p className="text-center text-gray-600 mt-4 text-sm">
                🔍 Drag to rotate • Scroll to zoom • Right-click to pan
                <br />
                <span className="text-blue-600 font-medium">Zoom in close to see fine details!</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Comprehensive Healthcare Solutions</h2> {/* Larger text */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto"> {/* Larger text */}
              Designed to meet the rigorous standards of government healthcare infrastructure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group bg-gradient-to-br from-white to-blue-50 p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                <div className="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6"> {/* Larger icon container */}
                  <feature.icon className="h-8 w-8 text-blue-800" /> {/* Larger icon */}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section with Operating Room - Larger container */}
      <section id="technology" className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"> {/* Increased gap */}
            {/* Operating Room 3D Model - Larger container */}
            <div className="bg-white rounded-2xl shadow-xl p-6"> {/* Increased padding and rounded */}
              {modelsLoaded ? <OperatingRoomModel /> : <LoadingIndicator />}
              <p className="text-center text-gray-600 mt-4 text-sm">
                🔍 Drag to rotate • Scroll to zoom • Right-click to pan
                <br />
                <span className="text-blue-600 font-medium">Explore every corner of the operating room!</span>
              </p>
            </div>

            <div className="text-left">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Modern Medical Facilities</h2> {/* Larger text */}
              <p className="text-xl text-gray-600 mb-6 leading-relaxed"> {/* Larger text */}
                Our system integrates advanced technology with healthcare infrastructure 
                to provide the best possible patient care and medical outcomes.
              </p>
              
              <div className="space-y-6"> {/* Increased spacing */}
                {technologyFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4"> {/* Increased spacing */}
                    <div className="bg-blue-100 p-3 rounded-lg"> {/* Larger icon container */}
                      <feature.icon className="h-6 w-6 text-blue-800" /> {/* Larger icon */}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{feature.title}</h4> {/* Larger text */}
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-blue-800 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <DocumentChartBarIcon className="h-20 w-20 mx-auto mb-6 text-blue-300" /> {/* Larger icon */}
          <h2 className="text-5xl font-bold mb-6">Ready to Access Healthcare Services?</h2> {/* Larger text */}
          <p className="text-2xl mb-8 leading-relaxed"> {/* Larger text */}
            Join thousands of citizens benefiting from our advanced medical expert system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-blue-800 px-10 py-5 rounded-lg hover:bg-gray-100 transition-all duration-200 font-semibold text-xl"> {/* Larger button */}
              Register as Patient
              <ArrowRightIcon className="h-6 w-6 ml-2 inline-block" /> {/* Larger icon */}
            </Link>
            <Link to="/login" className="border-2 border-white text-white px-10 py-5 rounded-lg hover:bg-white hover:text-blue-800 transition-all duration-200 font-semibold text-xl"> {/* Larger button */}
              Healthcare Staff Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16"> {/* Increased padding */}
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <BuildingLibraryIcon className="h-10 w-10 text-blue-400" /> {/* Larger icon */}
            <span className="text-3xl font-bold">MESMTF</span> {/* Larger text */}
            <span className="text-3xl font-light text-blue-400">Pro</span> {/* Larger text */}
          </div>
          <p className="text-gray-400 mb-4 text-lg"> {/* Larger text */}
            Ministry of Health and Social Services - Republic of Namibia
          </p>
          <p className="text-gray-500 text-base"> {/* Larger text */}
            © 2025 Medical Expert System for Malaria and Typhoid Fever. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: HeartIcon,
    title: 'AI-Powered Diagnosis',
    description: 'Rule-based expert system for accurate Malaria and Typhoid detection.'
  },
  {
    icon: DocumentChartBarIcon,
    title: 'Secure Medical Records',
    description: 'Government-grade security with role-based access control.'
  },
  {
    icon: ClockIcon,
    title: 'Appointment Management',
    description: 'Efficient scheduling with healthcare professionals.'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Multi-Platform Access',
    description: 'Accessible across all devices with optimized performance.'
  },
  {
    icon: UserGroupIcon,
    title: 'Role-Based System',
    description: 'Workflows for patients, doctors, nurses, and administrators.'
  },
  {
    icon: ChartBarIcon,
    title: 'Advanced Reporting',
    description: 'Real-time analytics for informed decision-making.'
  }
];

const technologyFeatures = [
  {
    icon: ShieldCheckIcon,
    title: 'Advanced Security',
    description: 'Protecting patient data with government-level security protocols'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Integrated Systems',
    description: 'Seamless connection with existing healthcare infrastructure'
  },
  {
    icon: ChartBarIcon,
    title: 'Real-time Analytics',
    description: 'Data-driven insights for better healthcare outcomes'
  }
];

export default Home;