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
  PhoneIcon
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
  
  const [riskFactors, setRiskFactors] = useState({
    recentTravel: false,
    endemicArea: false,
    previousHistory: false,
    contactWithSick: false,
  });

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: UserCircleIcon },
    { name: 'Symptom Checker', href: '/diagnosis', icon: HeartIcon, current: true },
    { name: 'Medical Records', href: '/medical-records', icon: DocumentTextIcon },
    { name: 'Appointments', href: '/appointments', icon: CalendarIcon },
  ];

  // Enhanced Expert System Rules with flexible matching
  const expertSystemRules = {
    malaria: {
      // Symptom weights based on importance
      symptomWeights: {
        'Abdominal pain': 4, 'Vomiting': 4, 'Sore throat': 4, // Very Strong
        'Headache': 3, 'Fatigue': 3, 'Cough': 3, 'Constipation': 3, 'Fever': 3, 'Chills': 3, // Strong
        'Chest pain': 2, 'Back pain': 2, 'Muscle Pain': 2, // Weak
        'Diarrhea': 1, 'Sweating': 1, 'Rash': 1, 'Loss of appetite': 1 // Very Weak
      },
      // Rules for diagnosis
      diagnosisThresholds: {
        high: 12,    // Requires multiple strong/very strong symptoms
        medium: 8,   // Requires combination of symptoms
        low: 4       // Basic symptom presence
      },
      drugs: {
        high: ["Artemether-Lumefantrine", "Quinine sulfate", "Chloroquine phosphate"],
        medium: ["Artemether-Lumefantrine", "Primaquine"],
        low: ["Paracetamol for symptom relief"]
      },
      messages: {
        high: "High probability of Malaria - Very strong signs detected. Immediate medical attention + Chest X-ray required.",
        medium: "Moderate probability of Malaria. Medical consultation recommended + Blood test required.",
        low: "Low probability of Malaria - Mild symptoms detected. Monitor symptoms and consult if condition worsens."
      }
    },
    typhoid: {
      symptomWeights: {
        'Abdominal pain': 4, 'Stomach issues': 4, 'Persistent high fever': 4, // Very Strong
        'Headache': 3, 'Weakness': 3, // Strong
        'Tiredness': 2, 'Muscle aches': 2, // Weak
        'Rash': 1, 'Loss of appetite': 1 // Very Weak
      },
      diagnosisThresholds: {
        high: 10,
        medium: 6,
        low: 3
      },
      drugs: {
        high: ["Ciprofloxacin", "Azithromycin", "Ceftriaxone"],
        medium: ["Ciprofloxacin", "Amoxicillin"],
        low: ["Antipyretics for fever management"]
      },
      messages: {
        high: "High probability of Typhoid Fever - Very strong signs detected. Urgent medical attention + Chest X-ray required.",
        medium: "Moderate probability of Typhoid Fever. Medical evaluation recommended.",
        low: "Low probability of Typhoid Fever - General symptoms detected. Rest and hydration recommended."
      }
    }
  };

  // Get all symptoms from both diseases
  const getAllSymptoms = () => {
    const allSymptoms = new Set();
    Object.values(expertSystemRules).forEach(disease => {
      Object.keys(disease.symptomWeights).forEach(symptom => {
        allSymptoms.add(symptom);
      });
    });
    return Array.from(allSymptoms).sort();
  };

  // Enhanced diagnosis function with dynamic scoring
  const diagnose = async () => {
    setIsLoading(true);
    
    try {
      const diseaseResults = [];
      
      // Calculate scores for each disease
      Object.entries(expertSystemRules).forEach(([disease, rules]) => {
        let totalScore = 0;
        const matchingSymptoms = [];
        
        // Calculate score based on selected symptoms and their weights
        selectedSymptoms.forEach(symptom => {
          if (rules.symptomWeights[symptom]) {
            let symptomWeight = rules.symptomWeights[symptom];
            
            // Adjust weight based on severity
            if (symptomSeverity[symptom] === 'severe') {
              symptomWeight *= 1.5;
            } else if (symptomSeverity[symptom] === 'mild') {
              symptomWeight *= 0.7;
            }
            
            // Adjust weight based on duration
            if (symptomDuration[symptom] === 'prolonged') {
              symptomWeight *= 1.3;
            } else if (symptomDuration[symptom] === 'recent') {
              symptomWeight *= 0.8;
            }
            
            totalScore += symptomWeight;
            matchingSymptoms.push(symptom);
          }
        });

        // Apply risk factor multipliers
        if (riskFactors.recentTravel || riskFactors.endemicArea) {
          totalScore *= 1.4;
        }
        if (riskFactors.previousHistory) {
          totalScore *= 1.3;
        }
        if (riskFactors.contactWithSick) {
          totalScore *= 1.2;
        }

        // Determine confidence level
        let confidenceLevel = 'low';
        let confidencePercentage = 0;
        
        if (totalScore >= rules.diagnosisThresholds.high) {
          confidenceLevel = 'high';
          confidencePercentage = Math.min(95, 60 + (totalScore - rules.diagnosisThresholds.high) * 5);
        } else if (totalScore >= rules.diagnosisThresholds.medium) {
          confidenceLevel = 'medium';
          confidencePercentage = Math.min(75, 40 + (totalScore - rules.diagnosisThresholds.medium) * 7);
        } else if (totalScore >= rules.diagnosisThresholds.low) {
          confidenceLevel = 'low';
          confidencePercentage = Math.min(40, 20 + (totalScore - rules.diagnosisThresholds.low) * 10);
        }

        // Only include if there's some probability
        if (confidencePercentage > 15) {
          const requiresChestXRay = matchingSymptoms.some(symptom => 
            ['Abdominal pain', 'Vomiting', 'Sore throat', 'Stomach issues', 'Persistent high fever']
            .includes(symptom) && symptomSeverity[symptom] === 'severe'
          );

          diseaseResults.push({
            disease: disease.charAt(0).toUpperCase() + disease.slice(1),
            confidence: Math.round(confidencePercentage),
            confidenceLevel: confidenceLevel,
            message: rules.messages[confidenceLevel],
            action: confidenceLevel === 'high' ? 'Urgent medical attention required' : 
                   confidenceLevel === 'medium' ? 'Medical consultation recommended' : 'Monitor symptoms',
            recommendedDrugs: rules.drugs[confidenceLevel],
            requiresChestXRay: requiresChestXRay,
            matchingSymptoms: matchingSymptoms,
            totalScore: Math.round(totalScore * 10) / 10,
            riskFactors: riskFactors
          });
        }
      });

      // Sort by confidence
      diseaseResults.sort((a, b) => b.confidence - a.confidence);

      // Save to database
      if (authUser && diseaseResults.length > 0) {
        await supabase
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
            requires_chest_xray: diseaseResults.some(result => result.requiresChestXRay),
            created_at: new Date().toISOString()
          });
      }

      setDiagnosisResult(diseaseResults);
      setCurrentStep(3);

    } catch (error) {
      console.error('Diagnosis error:', error);
      // Fallback to basic results if database fails
      const fallbackResults = selectedSymptoms.length > 0 ? [
        {
          disease: 'Malaria',
          confidence: Math.min(80, selectedSymptoms.length * 15),
          confidenceLevel: 'medium',
          message: 'Symptoms analysis completed. Please consult healthcare professional.',
          action: 'Further evaluation recommended',
          recommendedDrugs: ['Basic symptomatic treatment'],
          requiresChestXRay: false,
          matchingSymptoms: selectedSymptoms,
          totalScore: selectedSymptoms.length * 2
        }
      ] : [];
      
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
    });
  };

  const downloadReport = () => {
    const report = {
      patient: authUser?.email || 'Guest',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      system: "MESMTF - Medical Expert System for Malaria and Typhoid Fever",
      symptoms: selectedSymptoms.map(symptom => ({
        symptom,
        severity: symptomSeverity[symptom] || 'Not specified',
        duration: symptomDuration[symptom] || 'Not specified'
      })),
      riskFactors,
      diagnosisResults: diagnosisResult,
      expertSystemVersion: "1.0",
      disclaimer: "This report is generated by an expert system for preliminary assessment only. Always consult a healthcare professional for accurate diagnosis and treatment."
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesmtf-diagnosis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bookAppointment = (disease) => {
    navigate('/appointment', {
      state: {
        prefill: {
          reason: `MESMTF Preliminary Diagnosis: Possible ${disease}`,
          symptoms: selectedSymptoms,
          urgency: diagnosisResult[0]?.confidence >= 70 ? 'urgent' : 'standard',
          preferredSpecialty: disease.toLowerCase(),
          confidenceLevel: diagnosisResult[0]?.confidence
        }
      }
    });
  };

  const allSymptoms = getAllSymptoms();

  // Group symptoms by category for display
  const getSymptomsByCategory = () => {
    const categories = {
      veryStrong: [],
      strong: [],
      weak: [],
      veryWeak: []
    };

    allSymptoms.forEach(symptom => {
      const malariaWeight = expertSystemRules.malaria.symptomWeights[symptom];
      const typhoidWeight = expertSystemRules.typhoid.symptomWeights[symptom];
      const maxWeight = Math.max(malariaWeight || 0, typhoidWeight || 0);
      
      if (maxWeight === 4) categories.veryStrong.push(symptom);
      else if (maxWeight === 3) categories.strong.push(symptom);
      else if (maxWeight === 2) categories.weak.push(symptom);
      else if (maxWeight === 1) categories.veryWeak.push(symptom);
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
            >
              <PhoneIcon className="h-4 w-4 mr-2" />
              Emergency Help
            </button>
          </div>

          {/* Emergency Warning Banner */}
          <div className="bg-red-600 text-white p-4 rounded-lg mb-8">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 mr-3" />
              <div className="text-sm">
                <strong>EMERGENCY WARNING:</strong> If experiencing severe symptoms like difficulty breathing, chest pain, or confusion, seek immediate medical help!
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
                <h1 className={`text-3xl font-bold ${highContrast ? 'text-white' : 'text-gray-900'}`}>
                  Medical Expert System for Malaria and Typhoid Fever
                </h1>
                <p className={`text-lg ${highContrast ? 'text-gray-300' : 'text-gray-600'}`}>
                  Rule-Based Diagnosis System (MESMTF)
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    step === currentStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : highContrast ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 ${step < currentStep ? 'bg-green-500' : highContrast ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Symptom Selection */}
          {currentStep === 1 && (
            <div className={`rounded-2xl shadow-xl p-6 ${highContrast ? 'bg-gray-800 text-white' : 'bg-white'}`}>
              <h2 className="text-2xl font-bold mb-4">Symptom Selection</h2>
              
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                  <strong>Expert System Note:</strong> Very Strong signs require Chest X-ray in addition to drug administration.
                </p>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search symptoms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      highContrast ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Symptom Categories */}
              <div className="space-y-6">
                {Object.entries({
                  veryStrong: "Very Strong Signs (Require Chest X-ray)",
                  strong: "Strong Signs", 
                  weak: "Weak Signs",
                  veryWeak: "Very Weak Signs"
                }).map(([key, categoryName]) => (
                  <div key={key} className={`border rounded-lg p-4 ${highContrast ? 'border-gray-600' : 'border-gray-200'}`}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${
                        key === 'veryStrong' ? 'bg-red-500' :
                        key === 'strong' ? 'bg-orange-500' :
                        key === 'weak' ? 'bg-yellow-500' : 'bg-blue-500'
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
                            onToggle={() => toggleSymptom(symptom)}
                            onSeverityChange={(severity) => setSymptomSeverityLevel(symptom, severity)}
                            onDurationChange={(duration) => setSymptomDurationLevel(symptom, duration)}
                            highContrast={highContrast}
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={resetDiagnosis}
                  className={`px-6 py-3 font-medium rounded-lg flex items-center ${
                    highContrast ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Reset All
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={selectedSymptoms.length === 0}
                  className={`px-6 py-3 rounded-lg font-medium text-white ${
                    selectedSymptoms.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Continue to Risk Assessment ({selectedSymptoms.length} symptoms)
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Risk Assessment */}
          {currentStep === 2 && (
            <RiskAssessmentStep
              riskFactors={riskFactors}
              setRiskFactors={setRiskFactors}
              selectedSymptoms={selectedSymptoms}
              symptomSeverity={symptomSeverity}
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

// Symptom Card Component (keep this the same as before)
const SymptomCard = ({ symptom, isSelected, severity, duration, onToggle, onSeverityChange, onDurationChange, highContrast }) => (
  <div className={`p-3 rounded-lg border transition-all duration-200 ${
    isSelected
      ? highContrast ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-500'
      : highContrast ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <button
        onClick={onToggle}
        className="flex-1 text-left"
      >
        <span className={`font-medium ${isSelected ? 'text-blue-700' : ''}`}>
          {symptom}
        </span>
      </button>
      {isSelected && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
    </div>

    {isSelected && (
      <div className="space-y-2 mt-2">
        <div>
          <label className="text-sm font-medium">Severity:</label>
          <div className="flex space-x-2 mt-1">
            {['mild', 'moderate', 'severe'].map(level => (
              <button
                key={level}
                onClick={() => onSeverityChange(level)}
                className={`px-2 py-1 text-xs rounded capitalize ${
                  severity === level
                    ? 'bg-blue-600 text-white'
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

// Risk Assessment Step Component (keep this the same as before)
const RiskAssessmentStep = ({ riskFactors, setRiskFactors, selectedSymptoms, symptomSeverity, highContrast, onBack, onAnalyze, isLoading }) => (
  <div className={`rounded-2xl shadow-xl p-6 ${highContrast ? 'bg-gray-800 text-white' : 'bg-white'}`}>
    <h2 className="text-2xl font-bold mb-4">Risk Factors Assessment</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <h3 className="font-semibold mb-3">Travel & Medical History</h3>
        {[
          { key: 'recentTravel', label: 'Recent travel to malaria/typhoid endemic areas' },
          { key: 'endemicArea', label: 'Live in or recently visited endemic area' },
          { key: 'contactWithSick', label: 'Close contact with sick individuals' },
          { key: 'previousHistory', label: 'Previous history of malaria/typhoid' }
        ].map(factor => (
          <label key={factor.key} className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={riskFactors[factor.key]}
              onChange={(e) => setRiskFactors(prev => ({
                ...prev,
                [factor.key]: e.target.checked
              }))}
              className="mr-3"
            />
            {factor.label}
          </label>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-3">Selected Symptoms Summary</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {selectedSymptoms.map(symptom => (
            <div key={symptom} className={`flex justify-between items-center p-2 rounded ${
              highContrast ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <span>{symptom}</span>
              <span className="text-sm opacity-75 capitalize">
                {symptomSeverity[symptom] || 'Not rated'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="flex justify-between mt-8">
      <button
        onClick={onBack}
        className={`px-6 py-3 border rounded-lg font-medium ${
          highContrast 
            ? 'border-gray-600 text-gray-300 hover:border-gray-400' 
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        Back to Symptoms
      </button>
      <button
        onClick={onAnalyze}
        disabled={isLoading}
        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center disabled:bg-gray-400"
      >
        {isLoading ? (
          <>
            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <LightBulbIcon className="h-4 w-4 mr-2" />
            Analyze with Expert System
          </>
        )}
      </button>
    </div>
  </div>
);

// Results Step Component (keep this the same as before)
const ResultsStep = ({ results, riskFactors, highContrast, onBookAppointment, onNewDiagnosis, onDownloadReport }) => {
  const topResult = results[0];
  const requiresChestXRay = results.some(result => result.requiresChestXRay);

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${highContrast ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h2 className="text-2xl font-bold mb-4">Expert System Diagnosis Results</h2>
      
      {/* Overall Recommendation */}
      <div className={`mb-6 p-4 rounded-lg border ${
        topResult?.confidence >= 70 
          ? 'bg-red-50 border-red-200' 
          : topResult?.confidence >= 40 
          ? 'bg-yellow-50 border-yellow-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center">
          <ExclamationTriangleIcon className={`h-5 w-5 ${
            topResult?.confidence >= 70 ? 'text-red-500' :
            topResult?.confidence >= 40 ? 'text-yellow-500' : 'text-green-500'
          } mr-2`} />
          <div>
            <span className={`font-medium ${
              topResult?.confidence >= 70 ? 'text-red-800' :
              topResult?.confidence >= 40 ? 'text-yellow-800' : 'text-green-800'
            }`}>
              {topResult?.message || 'No significant diagnosis detected'}
            </span>
            {requiresChestXRay && (
              <div className="text-red-600 font-medium mt-1 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Chest X-ray recommended for Very Strong signs
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {results.map((result, index) => (
          <div key={result.disease} className={`border rounded-lg p-4 ${
            highContrast ? 'border-gray-600' : 'border-gray-200'
          }`}>
            <h3 className="font-semibold mb-3 text-lg">{result.disease}</h3>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold mb-2">{result.confidence}%</div>
              <div className={`w-full rounded-full h-3 mb-2 ${
                highContrast ? 'bg-gray-600' : 'bg-gray-200'
              }`}>
                <div 
                  className="h-3 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${result.confidence}%`,
                    backgroundColor: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#3b82f6'
                  }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div><strong>Action:</strong> {result.action}</div>
              {result.recommendedDrugs.length > 0 && (
                <div>
                  <strong>Recommended Drugs:</strong> {result.recommendedDrugs.join(', ')}
                </div>
              )}
              <div><strong>Matching Symptoms:</strong> {result.matchingSymptoms.length}</div>
              {result.requiresChestXRay && (
                <div className="text-red-600 font-medium">
                  ✓ Chest X-ray required
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between mt-8">
        <button
          onClick={onNewDiagnosis}
          className={`px-6 py-3 border rounded-lg font-medium ${
            highContrast 
              ? 'border-gray-600 text-gray-300 hover:border-gray-400' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ArrowPathIcon className="h-4 w-4 inline mr-2" />
          New Diagnosis
        </button>
        
        <button
          onClick={onDownloadReport}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <DocumentTextIcon className="h-4 w-4 inline mr-2" />
          Download Medical Report
        </button>
        
        {topResult && (
          <button
            onClick={() => onBookAppointment(topResult.disease)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Book Appointment with Specialist
          </button>
        )}
      </div>
    </div>
  );
};

export default SymptomChecker;
