'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
    id: string;
    email: string;
    display_name: string;
    organization_name?: string;
    organization_type?: string;
    mission_statement?: string;
    focus_areas?: string[];
    annual_budget?: string;
    employee_count?: string;
    geographic_focus?: Record<string, any>;
    eligibility_attributes?: string[];
    funding_preferences?: Record<string, any>;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch('/api/profile');
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            } else if (response.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile data.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                // Refresh matches in background by navigating or just showing success
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile.' });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => prev ? { ...prev, [name]: value } : null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCFB]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFCFB] min-h-screen pt-12 pb-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-12 border-b border-gray-200 pb-8">
                    <h1 className="text-4xl font-serif text-[#1A1A1A] mb-2 italic">Institutional Profile</h1>
                    <p className="text-[#4A4A4A] font-inter">Manage your organization's mission and matching criteria.</p>
                </div>

                {message.text && (
                    <div className={`mb-8 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-12 divide-y divide-gray-200">
                    {/* Section 1: Identity */}
                    <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h2 className="text-xl font-serif text-[#1A1A1A] mb-2 italic underline decoration-indigo-200 underline-offset-4">Organization Identity</h2>
                            <p className="text-sm text-[#666666]">Basic information about your entity.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1 italic">Contact Person / Administrator</label>
                                    <input
                                        type="text"
                                        id="display_name"
                                        name="display_name"
                                        value={profile?.display_name || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter"
                                        placeholder="e.g. Director of Development"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="organization_name" className="block text-sm font-medium text-gray-700 mb-1 italic">Official Organization Name</label>
                                    <input
                                        type="text"
                                        id="organization_name"
                                        name="organization_name"
                                        value={profile?.organization_name || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="organization_type" className="block text-sm font-medium text-gray-700 mb-1 italic">Organization Type</label>
                                    <select
                                        id="organization_type"
                                        name="organization_type"
                                        value={profile?.organization_type || 'nonprofit_501c3'}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter"
                                    >
                                        <option value="nonprofit_501c3">Nonprofit (501c3)</option>
                                        <option value="academic">Academic Institution</option>
                                        <option value="social_startup">Social Impact Startup</option>
                                        <option value="individual">Individual Researcher</option>
                                        <option value="government">Government Agency</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Mission & AI Matching */}
                    <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h2 className="text-xl font-serif text-[#1A1A1A] mb-2 italic underline decoration-indigo-200 underline-offset-4">Grant Matching Mission</h2>
                            <p className="text-sm text-[#666666]">This data is used by our AI model to rank relevant grants.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <label htmlFor="mission_statement" className="block text-sm font-medium text-gray-700 mb-1 italic">Official Mission Statement</label>
                                <textarea
                                    id="mission_statement"
                                    name="mission_statement"
                                    rows={6}
                                    value={profile?.mission_statement || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter text-sm leading-relaxed"
                                    placeholder="Paste your organization's formal mission statement here. This is the primary input for semantic matching."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 italic">Focus Areas (Comma separated)</label>
                                <input
                                    type="text"
                                    value={profile?.focus_areas?.join(', ') || ''}
                                    onChange={(e) => {
                                        const areas = e.target.value.split(',').map(a => a.trim()).filter(a => a !== '');
                                        setProfile(prev => prev ? { ...prev, focus_areas: areas } : null);
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter"
                                    placeholder="e.g. Education, Sustainability, Public Health"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Financials & Scale */}
                    <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h2 className="text-xl font-serif text-[#1A1A1A] mb-2 italic underline decoration-indigo-200 underline-offset-4">Capacity & Scale</h2>
                            <p className="text-sm text-[#666666]">Helpful for filtering grants by eligibility and budget size.</p>
                        </div>
                        <div className="md:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="annual_budget" className="block text-sm font-medium text-gray-700 mb-1 italic">Annual Budget</label>
                                    <select
                                        id="annual_budget"
                                        name="annual_budget"
                                        value={profile?.annual_budget || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter"
                                    >
                                        <option value="">Select Range</option>
                                        <option value="under_50k">Under $50k</option>
                                        <option value="50k_250k">$50k - $250k</option>
                                        <option value="250k_1m">$250k - $1M</option>
                                        <option value="1m_5m">$1M - $5M</option>
                                        <option value="over_5m">Over $5M</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="employee_count" className="block text-sm font-medium text-gray-700 mb-1 italic">Employee Count</label>
                                    <select
                                        id="employee_count"
                                        name="employee_count"
                                        value={profile?.employee_count || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-[#1A1A1A] font-inter"
                                    >
                                        <option value="">Select Range</option>
                                        <option value="1_5">1 - 5</option>
                                        <option value="6_20">6 - 20</option>
                                        <option value="21_100">21 - 100</option>
                                        <option value="over_100">Over 100</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-12 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-2 border border-gray-300 rounded-sm text-sm font-medium text-gray-700 hover:bg-gray-50 font-inter transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-2 bg-[#1A1A1A] text-white rounded-sm text-sm font-medium hover:bg-black font-inter transition-all shadow-sm flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                                    Saving...
                                </>
                            ) : 'Update Institutional Records'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
