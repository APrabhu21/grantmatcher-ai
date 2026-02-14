'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/OnboardingLayout';

const amountRanges = [
  { id: 'small', label: 'Small Grants', range: '$0 - $25,000', value: '0-25000' },
  { id: 'medium', label: 'Medium Grants', range: '$25,000 - $100,000', value: '25000-100000' },
  { id: 'large', label: 'Large Grants', range: '$100,000 - $500,000', value: '100000-500000' },
  { id: 'major', label: 'Major Grants', range: '$500,000+', value: '500000+' }
];

const deadlinePreferences = [
  { id: 'any', label: 'Any Deadline', description: 'Show all opportunities' },
  { id: '3months', label: 'Within 3 Months', description: 'Opportunities due in the next 90 days' },
  { id: '6months', label: 'Within 6 Months', description: 'Opportunities due in the next 180 days' },
  { id: '1year', label: 'Within 1 Year', description: 'Opportunities due in the next 365 days' }
];

export default function OnboardingStep5() {
  const [selectedAmounts, setSelectedAmounts] = useState<string[]>(() => {
    // Load from localStorage if available (only in browser)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onboarding_funding_amounts');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [selectedDeadline, setSelectedDeadline] = useState(() => {
    // Load from localStorage if available (only in browser)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding_funding_deadline') || '';
    }
    return '';
  });
  const router = useRouter();

  const toggleAmount = (amountId: string) => {
    setSelectedAmounts(prev =>
      prev.includes(amountId)
        ? prev.filter(id => id !== amountId)
        : [...prev, amountId]
    );
  };

  const handleComplete = async () => {
    // Save preferences
    localStorage.setItem('onboarding_funding_amounts', JSON.stringify(selectedAmounts));
    localStorage.setItem('onboarding_funding_deadline', selectedDeadline);

    // Collect all onboarding data
    const profileData = {
      organization_type: localStorage.getItem('onboarding_organization_type'),
      mission_statement: localStorage.getItem('onboarding_mission_statement'),
      focus_areas: JSON.parse(localStorage.getItem('onboarding_focus_areas') || '[]'),
      eligibility_attributes: JSON.parse(localStorage.getItem('onboarding_eligibility_attributes') || '[]'),
      funding_preferences: {
        amount_ranges: selectedAmounts,
        deadline_preference: selectedDeadline
      }
    };

    try {
      // Send to backend
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        // Clear onboarding data and redirect to dashboard
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('onboarding_')) {
            localStorage.removeItem(key);
          }
        });
        router.push('/dashboard');
      } else {
        console.error('Failed to save profile');
        // Still redirect for now
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      // Still redirect for now
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    router.push('/onboarding/step4');
  };

  return (
    <OnboardingLayout
      currentStep={5}
      totalSteps={5}
      title="Funding Preferences"
      subtitle="Tell us about the types of grants you're interested in."
    >
      <div className="space-y-8">
        {/* Amount Ranges */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What grant amounts are you interested in?
          </h3>
          <p className="text-gray-600 mb-4">Select all that apply. You can change this later.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {amountRanges.map((range) => (
              <label
                key={range.id}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAmounts.includes(range.value)}
                  onChange={() => toggleAmount(range.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{range.label}</div>
                  <div className="text-sm text-gray-500">{range.range}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Deadline Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            When would you like to see grant deadlines?
          </h3>
          <div className="space-y-3">
            {deadlinePreferences.map((deadline) => (
              <label
                key={deadline.id}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer"
              >
                <input
                  type="radio"
                  name="deadline"
                  value={deadline.id}
                  checked={selectedDeadline === deadline.id}
                  onChange={(e) => setSelectedDeadline(e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{deadline.label}</div>
                  <div className="text-sm text-gray-500">{deadline.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">🎯 You&apos;re almost done!</h4>
          <p className="text-sm text-blue-800">
            Based on your answers, we&apos;ll show you personalized grant matches ranked by relevance.
            You can always update your preferences later.
          </p>
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
          onClick={handleComplete}
          disabled={selectedAmounts.length === 0 || !selectedDeadline}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Complete Setup
        </button>
      </div>
    </OnboardingLayout>
  );
}