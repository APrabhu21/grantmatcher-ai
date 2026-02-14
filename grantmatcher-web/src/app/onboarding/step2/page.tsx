'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/OnboardingLayout';

export default function OnboardingStep2() {
  const [missionStatement, setMissionStatement] = useState(() => {
    // Load from localStorage if available (only in browser)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding_mission_statement') || '';
    }
    return '';
  });
  const router = useRouter();

  const handleNext = () => {
    if (missionStatement.trim().length >= 50) {
      localStorage.setItem('onboarding_mission_statement', missionStatement.trim());
      router.push('/onboarding/step3');
    }
  };

  const handleBack = () => {
    router.push('/onboarding/step1');
  };

  const characterCount = missionStatement.length;
  const minCharacters = 50;
  const isValid = characterCount >= minCharacters;

  return (
    <OnboardingLayout
      currentStep={2}
      totalSteps={5}
      title="Tell us about your mission"
      subtitle="Describe what your organization does in 50-500 words. This helps us find the best grant matches."
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="mission" className="block text-sm font-medium text-gray-700 mb-2">
            Mission Statement
          </label>
          <textarea
            id="mission"
            value={missionStatement}
            onChange={(e) => setMissionStatement(e.target.value)}
            placeholder="Example: We provide comprehensive health education and preventive care services to underserved communities in rural areas. Our programs focus on nutrition education, chronic disease prevention, and community wellness initiatives that empower individuals to take control of their health..."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-900 placeholder-gray-500"
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <div className={`text-sm ${isValid ? 'text-green-600' : 'text-gray-500'}`}>
              {characterCount}/{minCharacters} characters minimum
            </div>
            <div className="text-sm text-gray-500">
              {1000 - characterCount} remaining
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for a great mission statement:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be specific about your target population and geographic area</li>
            <li>• Include your main programs and services</li>
            <li>• Mention your unique approach or methodology</li>
            <li>• Describe the impact you create</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!isValid}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </OnboardingLayout>
  );
}