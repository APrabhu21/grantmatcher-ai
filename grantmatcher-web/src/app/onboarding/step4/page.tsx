'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/OnboardingLayout';

const eligibilityOptions = [
  {
    category: 'Organization Type',
    options: [
      { id: '501c3', label: '501(c)(3) Nonprofit' },
      { id: 'faith_based', label: 'Faith-based Organization' },
      { id: 'tribal', label: 'Tribal Organization' },
      { id: 'minority_serving', label: 'Minority-Serving Organization' },
      { id: 'community_based', label: 'Community-Based Organization' }
    ]
  },
  {
    category: 'Organization Size',
    options: [
      { id: 'small', label: 'Small Organization (<$1M budget)' },
      { id: 'medium', label: 'Medium Organization ($1M-$5M budget)' },
      { id: 'large', label: 'Large Organization (>$5M budget)' },
      { id: 'startup', label: 'Startup/Pre-revenue Organization' }
    ]
  },
  {
    category: 'Geographic Focus',
    options: [
      { id: 'local', label: 'Local/City Level' },
      { id: 'regional', label: 'Regional/State Level' },
      { id: 'national', label: 'National Level' },
      { id: 'international', label: 'International Focus' }
    ]
  },
  {
    category: 'Special Status',
    options: [
      { id: 'veteran_owned', label: 'Veteran-Owned' },
      { id: 'woman_owned', label: 'Woman-Owned' },
      { id: 'minority_owned', label: 'Minority-Owned' },
      { id: 'disadvantaged', label: 'Economically Disadvantaged' }
    ]
  }
];

export default function OnboardingStep4() {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('onboarding_eligibility_attributes');
    return saved ? JSON.parse(saved) : [];
  });
  const router = useRouter();

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributes(prev =>
      prev.includes(attributeId)
        ? prev.filter(id => id !== attributeId)
        : [...prev, attributeId]
    );
  };

  const handleNext = () => {
    localStorage.setItem('onboarding_eligibility_attributes', JSON.stringify(selectedAttributes));
    router.push('/onboarding/step5');
  };

  const handleBack = () => {
    router.push('/onboarding/step3');
  };

  return (
    <OnboardingLayout
      currentStep={4}
      totalSteps={5}
      title="Eligibility & Organization Details"
      subtitle="Select all that apply to help us find grants you&apos;re eligible for."
    >
      <div className="space-y-8">
        {eligibilityOptions.map((category) => (
          <div key={category.category}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{category.category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {category.options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAttributes.includes(option.id)}
                    onChange={() => toggleAttribute(option.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">💡 Why this matters:</h4>
          <p className="text-sm text-green-800">
            Many grants have specific eligibility requirements. By knowing your organization&apos;s characteristics,
            we can filter out ineligible opportunities and highlight those you&apos;re most likely to qualify for.
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
          onClick={handleNext}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          Next Step
        </button>
      </div>
    </OnboardingLayout>
  );
}