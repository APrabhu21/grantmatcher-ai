'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingLayout from '@/components/OnboardingLayout';

const predefinedFocusAreas = [
  'Health & Wellness',
  'Education',
  'Environment & Climate',
  'Poverty & Hunger',
  'Housing & Homelessness',
  'Arts & Culture',
  'Youth Development',
  'Senior Services',
  'Disability Services',
  'Animal Welfare',
  'Community Development',
  'Economic Development',
  'Criminal Justice',
  'Immigration & Refugees',
  'LGBTQ+ Rights',
  'Racial Equity',
  'Women\'s Rights',
  'Veterans Services',
  'STEM Education',
  'Mental Health',
  'Substance Abuse',
  'Domestic Violence',
  'Food Security',
  'Clean Water',
  'Renewable Energy',
  'Conservation',
  'Disaster Relief',
  'International Aid'
];

export default function OnboardingStep3() {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(() => {
    // Load from localStorage if available (only in browser)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onboarding_focus_areas');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [customArea, setCustomArea] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredAreas = predefinedFocusAreas.filter(area =>
    area.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedAreas.includes(area)
  );

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area)
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const addCustomArea = () => {
    if (customArea.trim() && !selectedAreas.includes(customArea.trim())) {
      setSelectedAreas(prev => [...prev, customArea.trim()]);
      setCustomArea('');
    }
  };

  const removeArea = (area: string) => {
    setSelectedAreas(prev => prev.filter(a => a !== area));
  };

  const handleNext = () => {
    if (selectedAreas.length > 0) {
      localStorage.setItem('onboarding_focus_areas', JSON.stringify(selectedAreas));
      router.push('/onboarding/step4');
    }
  };

  const handleBack = () => {
    router.push('/onboarding/step2');
  };

  return (
    <OnboardingLayout
      currentStep={3}
      totalSteps={5}
      title="What areas do you focus on?"
      subtitle="Select all areas that match your organization's work. You can add custom areas too."
    >
      <div className="space-y-6">
        {/* Selected Areas */}
        {selectedAreas.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Focus Areas:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedAreas.map(area => (
                <span
                  key={area}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                >
                  {area}
                  <button
                    onClick={() => removeArea(area)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search focus areas
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
          />
        </div>

        {/* Available Areas */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">
            Available Focus Areas {filteredAreas.length > 0 && `(${filteredAreas.length})`}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {filteredAreas.map(area => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                {area}
              </button>
            ))}
          </div>
          {filteredAreas.length === 0 && searchTerm && (
            <p className="text-gray-500 text-center py-4">No areas found matching &quot;{searchTerm}&quot;</p>
          )}
        </div>

        {/* Custom Area */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Add Custom Focus Area</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomArea()}
              placeholder="Enter a custom focus area..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
            />
            <button
              onClick={addCustomArea}
              disabled={!customArea.trim()}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
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
          disabled={selectedAreas.length === 0}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </OnboardingLayout>
  );
}