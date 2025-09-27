import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { 
  HeartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  CalendarIcon,
  PhoneIcon,
  ChartBarIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';

const SymptomChecker = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomSeverity, setSymptomSeverity] = useState({});
  const [symptomDuration, setSymptomDuration] = useState({});
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [language, setLanguage] = useState('english');
  const [highContrast, setHighContrast] = useState(false);
  const [patientInfo, setPatientInfo] = useState(null);
  
  const [riskFactors, setRiskFactors] = useState({
    recentTravel: false,
    endemicArea: false,
    previousHistory: false,
    contactWithSick: false,
    poorSanitation: false,
    untreatedWater: false
  });

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const navigation = [
      { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
      { name: 'My Appointments', href: '/appointment', icon: CalendarIcon, current: true },
      { name: 'Medical Records', href: '/patient-medical-records', icon: EyeIcon },
      { name: 'Symptom Checker', href: '/diagnosis', icon: MagnifyingGlassIcon },
    ];
  // Enhanced Expert System Rules with improved medical accuracy
  const expertSystemRules = {
    malaria: {
      symptomWeights: {
        'Fever': 4, 'Chills': 4, 'Sweating': 4, 'Headache': 3,
        'Muscle Pain': 3, 'Fatigue': 3, 'Nausea': 3, 'Vomiting': 3,
        'Abdominal pain': 2, 'Diarrhea': 2, 'Loss of appetite': 2,
        'Cough': 1, 'Chest pain': 1, 'Back pain': 1
      },
      diagnosisThresholds: { high: 15, medium: 10, low: 6 },
      criticalSymptoms: ['Fever', 'Chills', 'Sweating'],
      drugs: {
        high: ["Artemether-Lumefantrine (Coartem)", "Quinine sulfate", "Chloroquine phosphate", "Primaquine"],
        medium: ["Artemether-Lumefantrine", "Doxycycline", "Clindamycin"],
        low: ["Paracetamol", "Ibuprofen", "Rest and hydration"]
      },
      messages: {
        high: "🔴 HIGH PROBABILITY OF MALARIA - Urgent medical attention required! Blood test and immediate treatment needed.",
        medium: "🟡 MODERATE PROBABILITY OF MALARIA - Medical consultation recommended within 24 hours.",
        low: "🟢 LOW PROBABILITY OF MALARIA - Monitor symptoms and consult if condition worsens."
      }
    },
    typhoid: {
      symptomWeights: {
        'Persistent high fever': 4, 'Abdominal pain': 4, 'Headache': 3,
        'Weakness': 3, 'Fatigue': 3, 'Muscle aches': 2, 'Sweating': 2,
        'Dry cough': 2, 'Loss of appetite': 2, 'Weight loss': 2,
        'Stomach issues': 3, 'Diarrhea': 2, 'Constipation': 2,
        'Rash': 1, 'Confusion': 3
      },
      diagnosisThresholds: { high: 14, medium: 9, low: 5 },
      criticalSymptoms: ['Persistent high fever', 'Abdominal pain', 'Confusion'],
      drugs: {
        high: ["Ciprofloxacin", "Azithromycin", "Ceftriaxone", "Ofloxacin"],
        medium: ["Ciprofloxacin", "Amoxicillin", "Trimethoprim-sulfamethoxazole"],
        low: ["Antipyretics", "Fluid replacement", "Rest"]
      },
      messages: {
        high: "🔴 HIGH PROBABILITY OF TYPHOID FEVER - Emergency medical care required! Blood culture and stool test needed.",
        medium: "🟡 MODERATE PROBABILITY OF TYPHOID FEVER - Urgent medical evaluation recommended.",
        low: "🟢 LOW PROBABILITY OF TYPHOID FEVER - Symptomatic treatment and monitoring advised."
      }
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchPatientInfo();
    }
  }, [authUser]);

  const fetchPatientInfo = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (userData) {
        setPatientInfo({
          name: `${userData.first_name} ${userData.last_name}`,
          age: userData.date_of_birth ? calculateAge(userData.date_of_birth) : null,
          gender: userData.gender || 'Not specified'
        });
      }
    } catch (error) {
      console.error('Error fetching patient info:', error);
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getAllSymptoms = () => {
    const allSymptoms = new Set();
    Object.values(expertSystemRules).forEach(disease => {
      Object.keys(disease.symptomWeights).forEach(symptom => {
        allSymptoms.add(symptom);
      });
    });
    return Array.from(allSymptoms).sort();
  };

  const diagnose = async () => {
    setIsLoading(true);
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const diseaseResults = [];
      let totalSymptomsScore = selectedSymptoms.length * 2;
      
      Object.entries(expertSystemRules).forEach(([disease, rules]) => {
        let totalScore = 0;
        const matchingSymptoms = [];
        let criticalSymptomsCount = 0;

        selectedSymptoms.forEach(symptom => {
          if (rules.symptomWeights[symptom]) {
            let symptomWeight = rules.symptomWeights[symptom];
            
            // Severity multiplier
            if (symptomSeverity[symptom] === 'severe') symptomWeight *= 2;
            else if (symptomSeverity[symptom] === 'moderate') symptomWeight *= 1.5;
            
            // Duration multiplier
            if (symptomDuration[symptom] === 'prolonged') symptomWeight *= 1.8;
            else if (symptomDuration[symptom] === 'days') symptomWeight *= 1.3;
            
            totalScore += symptomWeight;
            matchingSymptoms.push(symptom);
            
            if (rules.criticalSymptoms.includes(symptom)) {
              criticalSymptomsCount++;
            }
          }
        });

        // Risk factor multipliers
        let riskMultiplier = 1;
        if (riskFactors.recentTravel) riskMultiplier *= 1.6;
        if (riskFactors.endemicArea) riskMultiplier *= 1.5;
        if (riskFactors.previousHistory) riskMultiplier *= 1.4;
        if (riskFactors.contactWithSick) riskMultiplier *= 1.3;
        if (riskFactors.poorSanitation) riskMultiplier *= 1.2;
        if (riskFactors.untreatedWater) riskMultiplier *= 1.3;

        totalScore *= riskMultiplier;

        // Age factor (children and elderly are higher risk)
        if (patientInfo?.age) {
          if (patientInfo.age < 5 || patientInfo.age > 65) {
            totalScore *= 1.3;
          }
        }

        // Determine confidence level
        let confidenceLevel = 'low';
        let confidencePercentage = 0;
        
        if (totalScore >= rules.diagnosisThresholds.high || criticalSymptomsCount >= 2) {
          confidenceLevel = 'high';
          confidencePercentage = Math.min(95, 70 + (totalScore - rules.diagnosisThresholds.high));
        } else if (totalScore >= rules.diagnosisThresholds.medium || criticalSymptomsCount >= 1) {
          confidenceLevel = 'medium';
          confidencePercentage = Math.min(80, 50 + (totalScore - rules.diagnosisThresholds.medium) * 3);
        } else if (totalScore >= rules.diagnosisThresholds.low) {
          confidenceLevel = 'low';
          confidencePercentage = Math.min(50, 30 + (totalScore - rules.diagnosisThresholds.low) * 4);
        }

        if (confidencePercentage > 20) {
          const requiresLabTests = confidenceLevel === 'high' || criticalSymptomsCount > 0;
          
          diseaseResults.push({
            disease: disease.charAt(0).toUpperCase() + disease.slice(1),
            confidence: Math.round(confidencePercentage),
            confidenceLevel: confidenceLevel,
            message: rules.messages[confidenceLevel],
            action: confidenceLevel === 'high' ? '🚨 URGENT MEDICAL ATTENTION REQUIRED' : 
                   confidenceLevel === 'medium' ? '⚠️ MEDICAL CONSULTATION RECOMMENDED' : '📋 MONITOR AND CONSULT IF NEEDED',
            recommendedDrugs: rules.drugs[confidenceLevel],
            requiresLabTests: requiresLabTests,
            matchingSymptoms: matchingSymptoms,
            criticalSymptomsCount: criticalSymptomsCount,
            totalScore: Math.round(totalScore * 10) / 10,
            riskFactors: riskFactors
          });
        }
      });

      // Sort by confidence (highest first)
      diseaseResults.sort((a, b) => b.confidence - a.confidence);

      // Save to database
      if (authUser) {
        const { data: session } = await supabase
          .from('diagnosis_sessions')
          .insert({
            patient_id: authUser.id,
            symptoms: selectedSymptoms,
            symptom_severity: symptomSeverity,
            symptom_duration: symptomDuration,
            risk_factors: riskFactors,
            results: diseaseResults,
            top_diagnosis: diseaseResults[0]?.disease,
            confidence_level: diseaseResults[0]?.confidence,
            requires_lab_tests: diseaseResults.some(result => result.requiresLabTests),
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        // Link symptoms to diagnosis session
        if (session && selectedSymptoms.length > 0) {
          const symptomRecords = selectedSymptoms.map(symptomName => ({
            diagnosis_session_id: session.id,
            symptom_name: symptomName,
            severity: symptomSeverity[symptomName],
            duration: symptomDuration[symptomName],
            created_at: new Date().toISOString()
          }));

          await supabase.from('diagnosis_session_symptoms').insert(symptomRecords);
        }
      }

      setDiagnosisResult(diseaseResults);
      setCurrentStep(3);

    } catch (error) {
      console.error('Diagnosis error:', error);
      // Fallback results
      const fallbackResults = [
        {
          disease: 'Medical Evaluation Needed',
          confidence: 85,
          confidenceLevel: 'medium',
          message: 'Based on your symptoms, professional medical evaluation is strongly recommended.',
          action: 'Consult healthcare provider for accurate diagnosis',
          recommendedDrugs: ['Symptomatic treatment only until diagnosis'],
          requiresLabTests: true,
          matchingSymptoms: selectedSymptoms,
          totalScore: selectedSymptoms.length * 3
        }
      ];
      
      setDiagnosisResult(fallbackResults);
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const setSymptomSeverityLevel = (symptom, severity) => {
    setSymptomSeverity(prev => ({ ...prev, [symptom]: severity }));
  };

  const setSymptomDurationLevel = (symptom, duration) => {
    setSymptomDuration(prev => ({ ...prev, [symptom]: duration }));
  };

  const resetDiagnosis = () => {
    setSelectedSymptoms([]);
    setSymptomSeverity({});
    setSymptomDuration({});
    setDiagnosisResult(null);
    setCurrentStep(1);
    setRiskFactors({
      recentTravel: false,
      endemicArea: false,
      previousHistory: false,
      contactWithSick: false,
      poorSanitation: false,
      untreatedWater: false
    });
  };

  const downloadReport = () => {
    const report = {
      patient: patientInfo || { name: authUser?.email || 'Guest' },
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      system: "MESMTF AI Medical Expert System v2.0",
      symptoms: selectedSymptoms.map(symptom => ({
        symptom,
        severity: symptomSeverity[symptom] || 'Not specified',
        duration: symptomDuration[symptom] || 'Not specified'
      })),
      riskFactors,
      diagnosisResults: diagnosisResult,
      expertSystemRules: "Weighted scoring system with risk factor analysis",
      disclaimer: "⚠️ AI-PRELIMINARY ASSESSMENT ONLY - This report is generated by an expert system for initial evaluation. Always consult qualified healthcare professionals for accurate diagnosis and treatment."
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesmtf-diagnosis-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bookAppointment = (disease) => {
    navigate('/appointment', {
      state: {
        prefill: {
          reason: `MESMTF AI Diagnosis: Suspected ${disease} (${diagnosisResult[0]?.confidence}% confidence)`,
          symptoms: selectedSymptoms,
          urgency: diagnosisResult[0]?.confidenceLevel === 'high' ? 'urgent' : 'standard',
          preferredSpecialty: disease.toLowerCase().includes('malaria') ? 'Infectious Disease' : 'General Medicine',
          confidenceLevel: diagnosisResult[0]?.confidence
        }
      }
    });
  };

  const allSymptoms = getAllSymptoms();

  const getSymptomsByCategory = () => {
    const categories = { critical: [], high: [], medium: [], low: [] };

    allSymptoms.forEach(symptom => {
      const malariaWeight = expertSystemRules.malaria.symptomWeights[symptom];
      const typhoidWeight = expertSystemRules.typhoid.symptomWeights[symptom];
      const maxWeight = Math.max(malariaWeight || 0, typhoidWeight || 0);
      
      if (maxWeight === 4) categories.critical.push(symptom);
      else if (maxWeight === 3) categories.high.push(symptom);
      else if (maxWeight === 2) categories.medium.push(symptom);
      else if (maxWeight === 1) categories.low.push(symptom);
    });

    return categories;
  };

  const symptomsByCategory = getSymptomsByCategory();

  return (
    <DashboardLayout user={authUser} navigation={navigation}>
      <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${highContrast ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-cyan-100'}`}>
        <div className="max-w-6xl mx-auto">
          
          {/* Accessibility Controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`px-3 py-2 rounded-lg border ${highContrast ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
              </select>
              
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`px-3 py-2 rounded-lg border flex items-center ${highContrast ? 'bg-yellow-500 border-yellow-600 text-black' : 'bg-gray-200 border-gray-300 text-gray-700'}`}
              >
                {highContrast ? <EyeIcon className="h-4 w-4 mr-2" /> : <EyeSlashIcon className="h-4 w-4 mr-2" />}
                {highContrast ? 'Normal View' : 'High Contrast'}
              </button>
            </div>

            <button
              onClick={() => navigate('/emergency')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center font-semibold"
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              🚨 Emergency Help
            </button>
          </div>

          {/* Emergency Warning Banner */}
          <div className="bg-red-600 text-white p-4 rounded-lg mb-8 border-2 border-red-700">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-3" />
              <div className="text-sm">
                <strong>EMERGENCY WARNING:</strong> If experiencing severe symptoms like difficulty breathing, chest pain, confusion, or high fever (≥39°C), seek immediate medical help! Call emergency services.
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <HeartIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
                  AI Medical Expert System
                </h1>
                <p className={`text-lg ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                  Malaria & Typhoid Fever Diagnosis with Intelligent Risk Assessment
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold ${
                    step === currentStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : highContrast ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {step === 1 ? '🤒' : step === 2 ? '🔍' : '📊'}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 ${step < currentStep ? 'bg-green-500' : highContrast ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center text-sm text-gray-600 mb-8">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Symptom Selection</span>
            <span className={`mx-8 ${currentStep >= 2 ? 'text-blue-600 font-medium' : ''}`}>Risk Assessment</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>AI Diagnosis Results</span>
          </div>

          {/* Step 1: Symptom Selection */}
          {currentStep === 1 && (
            <SymptomSelectionStep
              symptomsByCategory={symptomsByCategory}
              selectedSymptoms={selectedSymptoms}
              symptomSeverity={symptomSeverity}
              symptomDuration={symptomDuration}
              searchTerm={searchTerm}
              highContrast={highContrast}
              onSearchChange={setSearchTerm}
              onSymptomToggle={toggleSymptom}
              onSeverityChange={setSymptomSeverityLevel}
              onDurationChange={setSymptomDurationLevel}
              onNext={() => setCurrentStep(2)}
              onReset={resetDiagnosis}
            />
          )}

          {/* Step 2: Risk Assessment */}
          {currentStep === 2 && (
            <RiskAssessmentStep
              riskFactors={riskFactors}
              setRiskFactors={setRiskFactors}
              selectedSymptoms={selectedSymptoms}
              symptomSeverity={symptomSeverity}
              patientInfo={patientInfo}
              highContrast={highContrast}
              onBack={() => setCurrentStep(1)}
              onAnalyze={diagnose}
              isLoading={isLoading}
            />
          )}

          {/* Step 3: Results */}
          {currentStep === 3 && diagnosisResult && (
            <ResultsStep
              results={diagnosisResult}
              riskFactors={riskFactors}
              patientInfo={patientInfo}
              highContrast={highContrast}
              onBookAppointment={bookAppointment}
              onNewDiagnosis={resetDiagnosis}
              onDownloadReport={downloadReport}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Enhanced Symptom Selection Step Component
const SymptomSelectionStep = ({ 
  symptomsByCategory, selectedSymptoms, symptomSeverity, symptomDuration, 
  searchTerm, highContrast, onSearchChange, onSymptomToggle, onSeverityChange, 
  onDurationChange, onNext, onReset 
}) => (
  <div className={`rounded-2xl shadow-xl p-6 ${highContrast ? 'bg-gray-800 text-white' : 'bg-white'}`}>
    <h2 className="text-2xl font-bold mb-4">Step 1: Select Your Symptoms</h2>
    
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-blue-800 text-sm">
        <InformationCircleIcon className="h-4 w-4 inline mr-1" />
        <strong>AI System Guidance:</strong> Select all symptoms you're experiencing. Rate severity and duration for more accurate diagnosis.
      </p>
    </div>

    {/* Search */}
    <div className="mb-6">
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="🔍 Search symptoms (fever, headache, pain...)"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            highContrast ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
          }`}
        />
      </div>
    </div>

    {/* Symptom Statistics */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className={`text-center p-3 rounded-lg ${highContrast ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="text-2xl font-bold text-blue-600">{selectedSymptoms.length}</div>
        <div className="text-sm">Symptoms Selected</div>
      </div>
      <div className={`text-center p-3 rounded-lg ${highContrast ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="text-2xl font-bold text-green-600">
          {Object.values(symptomSeverity).filter(s => s === 'severe').length}
        </div>
        <div className="text-sm">Severe Symptoms</div>
      </div>
      <div className={`text-center p-3 rounded-lg ${highContrast ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="text-2xl font-bold text-orange-600">
          {Object.values(symptomDuration).filter(d => d === 'prolonged').length}
        </div>
        <div className="text-sm">Prolonged</div>
      </div>
      <div className={`text-center p-3 rounded-lg ${highContrast ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="text-2xl font-bold text-purple-600">
          {symptomsByCategory.critical.filter(s => selectedSymptoms.includes(s)).length}
        </div>
        <div className="text-sm">Critical Signs</div>
      </div>
    </div>

    {/* Symptom Categories */}
    <div className="space-y-6">
      {Object.entries({
        critical: "🚨 Critical Signs (Require Immediate Attention)",
        high: "⚠️ Strong Indicators", 
        medium: "📋 Moderate Symptoms",
        low: "ℹ️ General Symptoms"
      }).map(([key, categoryName]) => (
        <div key={key} className={`border-2 rounded-lg p-4 ${
          highContrast ? 'border-gray-600' : 
          key === 'critical' ? 'border-red-300 bg-red-50' :
          key === 'high' ? 'border-orange-300 bg-orange-50' :
          key === 'medium' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50'
        }`}>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${
              key === 'critical' ? 'bg-red-500' :
              key === 'high' ? 'bg-orange-500' :
              key === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}></span>
            {categoryName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {symptomsByCategory[key]
              .filter(symptom => 
                symptom.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(symptom => (
                <SymptomCard
                  key={symptom}
                  symptom={symptom}
                  isSelected={selectedSymptoms.includes(symptom)}
                  severity={symptomSeverity[symptom]}
                  duration={symptomDuration[symptom]}
                  onToggle={() => onSymptomToggle(symptom)}
                  onSeverityChange={(severity) => onSeverityChange(symptom, severity)}
                  onDurationChange={(duration) => onDurationChange(symptom, duration)}
                  highContrast={highContrast}
                  category={key}
                />
              ))}
          </div>
        </div>
      ))}
    </div>

    <div className="flex justify-between mt-8">
      <button
        onClick={onReset}
        className={`px-6 py-3 font-medium rounded-lg flex items-center ${
          highContrast ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        <ArrowPathIcon className="h-4 w-4 mr-2" />
        Reset All
      </button>
      <button
        onClick={onNext}
        disabled={selectedSymptoms.length === 0}
        className={`px-6 py-3 rounded-lg font-medium text-white ${
          selectedSymptoms.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        Continue to Risk Assessment ({selectedSymptoms.length} symptoms selected)
      </button>
    </div>
  </div>
);

// Enhanced Symptom Card Component
const SymptomCard = ({ symptom, isSelected, severity, duration, onToggle, onSeverityChange, onDurationChange, highContrast, category }) => (
  <div className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
    isSelected
      ? highContrast ? 'bg-blue-900 border-blue-500' : 
        category === 'critical' ? 'bg-red-100 border-red-400' :
        category === 'high' ? 'bg-orange-100 border-orange-400' :
        category === 'medium' ? 'bg-yellow-100 border-yellow-400' : 'bg-blue-100 border-blue-400'
      : highContrast ? 'bg-gray-700 border-gray-600 hover:border-gray-400' : 'bg-white border-gray-200 hover:border-gray-300'
  }`} onClick={onToggle}>
    <div className="flex items-center justify-between mb-2">
      <span className={`font-medium ${isSelected ? 'text-blue-700 font-semibold' : ''}`}>
        {symptom}
      </span>
      {isSelected && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
    </div>

    {isSelected && (
      <div className="space-y-2 mt-2" onClick={e => e.stopPropagation()}>
        <div>
          <label className="text-sm font-medium">Severity:</label>
          <div className="flex space-x-1 mt-1">
            {['mild', 'moderate', 'severe'].map(level => (
              <button
                key={level}
                onClick={() => onSeverityChange(level)}
                className={`px-2 py-1 text-xs rounded capitalize flex-1 ${
                  severity === level
                    ? level === 'severe' ? 'bg-red-600 text-white' :
                      level === 'moderate' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                    : highContrast ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Duration:</label>
          <select
            value={duration || ''}
            onChange={(e) => onDurationChange(e.target.value)}
            className={`w-full mt-1 text-sm p-1 rounded border ${
              highContrast ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <option value="">Select duration</option>
            <option value="recent">Recent (hours)</option>
            <option value="days">Few days</option>
            <option value="prolonged">Prolonged (weeks+)</option>
          </select>
        </div>
      </div>
    )}
  </div>
);

// Enhanced Risk Assessment Step Component
const RiskAssessmentStep = ({ riskFactors, setRiskFactors, selectedSymptoms, symptomSeverity, patientInfo, highContrast, onBack, onAnalyze, isLoading }) => (
  <div className={`rounded-2xl shadow-xl p-6 ${highContrast ? 'bg-gray-800 text-white' : 'bg-white'}`}>
    <h2 className="text-2xl font-bold mb-4">Step 2: Risk Factors & Patient Profile</h2>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Patient Information */}
      <div className={`p-4 rounded-lg ${highContrast ? 'bg-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
        <h3 className="font-semibold mb-3 flex items-center">
          <UserCircleIcon className="h-5 w-5 mr-2" />
          Patient Profile
        </h3>
        {patientInfo ? (
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {patientInfo.name}</div>
            <div><strong>Age:</strong> {patientInfo.age || 'Not specified'}</div>
            <div><strong>Gender:</strong> {patientInfo.gender}</div>
          </div>
        ) : (
          <p className="text-sm opacity-75">Loading patient information...</p>
        )}
      </div>

      {/* Risk Factors */}
      <div className="lg:col-span-2">
        <h3 className="font-semibold mb-3">Risk Factors Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'recentTravel', label: '🛩️ Recent travel to endemic areas', description: 'Traveled to malaria/typhoid regions in past month' },
            { key: 'endemicArea', label: '🏠 Live in endemic area', description: 'Reside in or frequently visit high-risk regions' },
            { key: 'contactWithSick', label: '👥 Contact with sick individuals', description: 'Close contact with diagnosed patients' },
            { key: 'previousHistory', label: '📋 Previous disease history', description: 'Had malaria/typhoid before' },
            { key: 'poorSanitation', label: '🧼 Poor sanitation conditions', description: 'Limited access to clean facilities' },
            { key: 'untreatedWater', label: '💧 Untreated water source', description: 'Drink from unsafe water sources' }
          ].map(factor => (
            <label key={factor.key} className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors ${
              riskFactors[factor.key] 
                ? highContrast ? 'bg-blue-900' : 'bg-blue-100 border border-blue-300'
                : highContrast ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={riskFactors[factor.key]}
                onChange={(e) => setRiskFactors(prev => ({
                  ...prev,
                  [factor.key]: e.target.checked
                }))}
                className="mr-3 mt-1"
              />
              <div>
                <div className="font-medium">{factor.label}</div>
                <div className="text-xs opacity-75 mt-1">{factor.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>

    {/* Symptoms Summary */}
    <div className={`p-4 rounded-lg mb-6 ${highContrast ? 'bg-gray-700' : 'bg-gray-50 border'}`}>
      <h3 className="font-semibold mb-3">Selected Symptoms Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {selectedSymptoms.map(symptom => (
          <div key={symptom} className={`flex justify-between items-center p-2 rounded text-sm ${
            highContrast ? 'bg-gray-600' : 'bg-white border'
          }`}>
            <span>{symptom}</span>
            <span className={`px-2 py-1 rounded text-xs ${
              symptomSeverity[symptom] === 'severe' ? 'bg-red-100 text-red-800' :
              symptomSeverity[symptom] === 'moderate' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}>
              {symptomSeverity[symptom] || 'Not rated'}
            </span>
          </div>
        ))}
      </div>
    </div>

    <div className="flex justify-between mt-8">
      <button
        onClick={onBack}
        className={`px-6 py-3 border rounded-lg font-medium ${
          highContrast 
            ? 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white' 
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        ← Back to Symptoms
      </button>
      <button
        onClick={onAnalyze}
        disabled={isLoading}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[200px] justify-center"
      >
        {isLoading ? (
          <>
            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            AI Analyzing Symptoms...
          </>
        ) : (
          <>
            <LightBulbIcon className="h-4 w-4 mr-2" />
            🧠 Run AI Diagnosis
          </>
        )}
      </button>
    </div>
  </div>
);

// Enhanced Results Step Component
const ResultsStep = ({ results, riskFactors, patientInfo, highContrast, onBookAppointment, onNewDiagnosis, onDownloadReport }) => {
  const topResult = results[0];
  const requiresLabTests = results.some(result => result.requiresLabTests);
  const hasCriticalSymptoms = results.some(result => result.criticalSymptomsCount > 0);

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${highContrast ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h2 className="text-2xl font-bold mb-4">Step 3: AI Diagnosis Results</h2>
      
      {/* Overall Recommendation */}
      <div className={`mb-6 p-4 rounded-lg border-2 ${
        topResult?.confidenceLevel === 'high' 
          ? 'bg-red-50 border-red-300' 
          : topResult?.confidenceLevel === 'medium' 
          ? 'bg-yellow-50 border-yellow-300' 
          : 'bg-green-50 border-green-300'
      }`}>
        <div className="flex items-start">
          <ExclamationTriangleIcon className={`h-6 w-6 mt-1 mr-3 ${
            topResult?.confidenceLevel === 'high' ? 'text-red-500' :
            topResult?.confidenceLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
          }`} />
          <div>
            <h3 className={`font-bold text-lg ${
              topResult?.confidenceLevel === 'high' ? 'text-red-800' :
              topResult?.confidenceLevel === 'medium' ? 'text-yellow-800' : 'text-green-800'
            }`}>
              {topResult?.confidenceLevel === 'high' ? '🚨 URGENT ATTENTION REQUIRED' :
               topResult?.confidenceLevel === 'medium' ? '⚠️ MEDICAL CONSULTATION NEEDED' : '📋 MONITOR SYMPTOMS'}
            </h3>
            <p className={`mt-1 ${
              topResult?.confidenceLevel === 'high' ? 'text-red-700' :
              topResult?.confidenceLevel === 'medium' ? 'text-yellow-700' : 'text-green-700'
            }`}>
              {topResult?.message}
            </p>
            {requiresLabTests && (
              <div className="flex items-center mt-2 text-red-600 font-medium">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Laboratory tests (blood work) strongly recommended
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {results.map((result, index) => (
          <div key={result.disease} className={`border-2 rounded-lg p-4 ${
            highContrast ? 'border-gray-600' : 
            index === 0 ? 'border-red-200 bg-red-50' :
            index === 1 ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg">{result.disease}</h3>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                result.confidenceLevel === 'high' ? 'bg-red-100 text-red-800' :
                result.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                {result.confidenceLevel.toUpperCase()}
              </span>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-3xl font-bold mb-2">{result.confidence}%</div>
              <div className={`w-full rounded-full h-3 mb-2 ${highContrast ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <div 
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${result.confidence}%`,
                    backgroundColor: 
                      result.confidenceLevel === 'high' ? '#ef4444' :
                      result.confidenceLevel === 'medium' ? '#f59e0b' : '#10b981'
                  }}
                ></div>
              </div>
              <div className="text-sm opacity-75">Confidence Score: {result.totalScore}</div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <strong>🩺 Action Required:</strong> 
                <div className="mt-1 font-medium">{result.action}</div>
              </div>
              
              {result.recommendedDrugs.length > 0 && (
                <div>
                  <strong>💊 Recommended Treatment:</strong>
                  <ul className="mt-1 space-y-1">
                    {result.recommendedDrugs.map(drug => (
                      <li key={drug}>• {drug}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <strong>📋 Matching Symptoms:</strong> 
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.matchingSymptoms.map(symptom => (
                    <span key={symptom} className="px-2 py-1 bg-gray-200 rounded text-xs">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
              
              {result.criticalSymptomsCount > 0 && (
                <div className="text-red-600 font-medium">
                  ⚠️ {result.criticalSymptomsCount} critical symptom(s) detected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Risk Factors Summary */}
      {Object.values(riskFactors).some(factor => factor) && (
        <div className={`p-4 rounded-lg mb-6 ${highContrast ? 'bg-gray-700' : 'bg-yellow-50 border border-yellow-200'}`}>
          <h3 className="font-semibold mb-2">⚠️ Identified Risk Factors</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(riskFactors)
              .filter(([_, value]) => value)
              .map(([key]) => (
                <span key={key} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between mt-8">
        <button
          onClick={onNewDiagnosis}
          className={`px-6 py-3 border rounded-lg font-medium flex items-center ${
            highContrast 
              ? 'border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          New Diagnosis
        </button>
        
        <button
          onClick={onDownloadReport}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center"
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Download Medical Report
        </button>
        
        {topResult && (
          <button
            onClick={() => onBookAppointment(topResult.disease)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Book Specialist Appointment
          </button>
        )}
      </div>

      {/* Medical Disclaimer */}
      <div className={`mt-6 p-4 rounded-lg text-sm ${highContrast ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <strong>📋 Medical Disclaimer:</strong> This AI diagnosis is for preliminary assessment only. 
        Always consult qualified healthcare professionals for accurate diagnosis and treatment. 
        In emergency situations, seek immediate medical attention.
      </div>
    </div>
  );
};

export default SymptomChecker;