'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/OnboardingLayout';

const organizationTypes = [
  {
    id: 'nonprofit',
    name: 'Nonprofit Organization',
    description: '501(c)(3) nonprofit, charity, or community organization',
    icon: '🏢'
  },
  {
    id: 'academic',
    name: 'Academic Institution',
    description: 'University, college, research institute, or academic department',
    icon: '🎓'
  },
  {
    id: 'startup',
    name: 'Social Impact Startup',
    description: 'For-profit company focused on social or environmental impact',
    icon: '🚀'
  },
  {
    id: 'individual',
    name: 'Individual Researcher',
    description: 'Independent researcher, consultant, or individual applicant',
    icon: '👤'
  }
];

export default function OnboardingStep1() {
  const [selectedType, setSelectedType] = useState('');
  const router = useRouter();

  const handleNext = () => {
    if (selectedType) {
      // Store in localStorage for now (in production, you'd use a state management solution)
      localStorage.setItem('onboarding_organization_type', selectedType);
      router.push('/onboarding/step2');
    }
  };

  return (
    <OnboardingLayout
      currentStep={1}
      totalSteps={5}
      title="What type of organization are you?"
      subtitle="This helps us match you with the most relevant funding opportunities."
    >
      <div className="space-y-4">
        {organizationTypes.map((type) => (
          <div
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              selectedType === type.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div className="text-3xl mr-4">{type.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                <p className="text-gray-600">{type.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!selectedType}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </OnboardingLayout>
  );
}