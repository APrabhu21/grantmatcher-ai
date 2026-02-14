'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GrantDetail {
  id: string;
  source: string;
  source_id: string;
  source_url?: string;
  title: string;
  description?: string;
  summary?: string;
  agency?: string;
  agency_code?: string;
  program_name?: string;
  amount_floor?: number;
  amount_ceiling?: number;
  open_date?: string;
  close_date?: string;
  is_rolling?: boolean;
  eligible_applicant_types?: string[];
  eligible_categories?: string[];
  cfda_numbers?: string[];
  focus_areas?: string[];
  geographic_scope?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface GrantApplication {
  id: string;
  status: string;
  applied_date?: string;
  submitted_date?: string;
  decision_date?: string;
  amount_requested?: number;
  amount_awarded?: number;
  notes?: string;
  internal_reference?: string;
  created_at?: string;
  updated_at?: string;
}

interface SavedGrant {
  id: string;
  grant: GrantDetail;
  notes?: string;
  remind_days_before: number;
  reminder_sent: boolean;
  created_at: string;
}

interface ApplicationFormData {
  status: string;
  applied_date?: string | null;
  submitted_date?: string | null;
  decision_date?: string | null;
  amount_requested?: number | null;
  amount_awarded?: number | null;
  notes?: string | null;
  internal_reference?: string | null;
}

export default function GrantDetailPage({ params }: { params: { id: string } }) {
  const [grant, setGrant] = useState<GrantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [application, setApplication] = useState<GrantApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchGrantDetail();
    }
  }, [status, router, params.id]);

  const fetchGrantDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/grants/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setGrant(data);
        await checkIfSaved();
        await fetchApplication();
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 404) {
        setError('Grant not found');
      } else {
        setError('Failed to load grant details');
      }
    } catch (err) {
      setError('Failed to load grant details');
      console.error('Error fetching grant detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/grants/${params.id}/application`);
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
      }
    } catch (err) {
      console.error('Error fetching application:', err);
    }
  };

  const checkIfSaved = async () => {
    try {
      const response = await fetch('/api/saved-grants');
      if (response.ok) {
        const data = await response.json();
        const saved = data.saved_grants.some((savedGrant: SavedGrant) => savedGrant.grant.id === params.id);
        setIsSaved(saved);
      }
    } catch (err) {
      console.error('Error checking if grant is saved:', err);
    }
  };

  const handleSaveToggle = async () => {
    if (!grant) return;

    setSaveLoading(true);
    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/grants/${params.id}/save`, {
        method,
      });

      if (response.ok) {
        setIsSaved(!isSaved);
      } else {
        console.error('Failed to toggle save status');
      }
    } catch (err) {
      console.error('Error toggling save status:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApplicationSubmit = async (applicationData: ApplicationFormData) => {
    setApplicationLoading(true);
    try {
      const method = application ? 'PUT' : 'POST';
      const response = await fetch(`/api/grants/${params.id}/application`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (response.ok) {
        const data = await response.json();
        setApplication(data.application);
        setShowApplicationForm(false);
      }
    } catch (err) {
      console.error('Error updating application:', err);
    } finally {
      setApplicationLoading(false);
    }
  };

  const formatAmount = (floor?: number, ceiling?: number) => {
    if (!floor && !ceiling) return 'Amount not specified';
    if (floor && ceiling) return `$${floor.toLocaleString()} - $${ceiling.toLocaleString()}`;
    if (floor) return `$${floor.toLocaleString()}+`;
    if (ceiling) return `Up to $${ceiling.toLocaleString()}`;
    return 'Amount not specified';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading grant details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!grant) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">GrantMatcherAI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {session?.user?.name || 'User'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Grant Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{grant.title}</h1>
                <p className="text-indigo-100 text-lg">{grant.agency}</p>
                {grant.program_name && (
                  <p className="text-indigo-200 mt-1">{grant.program_name}</p>
                )}
              </div>
              <div className="ml-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  grant.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {grant.status}
                </span>
              </div>
            </div>
          </div>

          {/* Grant Content */}
          <div className="px-6 py-8">
            {/* Key Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatAmount(grant.amount_floor, grant.amount_ceiling)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Open Date:</span>
                    <span className="font-medium">{formatDate(grant.open_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Close Date:</span>
                    <span className="font-medium">
                      {grant.is_rolling ? 'Rolling deadline' : formatDate(grant.close_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Geographic Scope:</span>
                    <span className="font-medium capitalize">{grant.geographic_scope || 'National'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <span className="font-medium capitalize">{grant.source}</span>
                  </div>
                  {grant.agency_code && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Agency Code:</span>
                      <span className="font-medium">{grant.agency_code}</span>
                    </div>
                  )}
                  {grant.cfda_numbers && grant.cfda_numbers.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">CFDA Numbers:</span>
                      <span className="font-medium">{grant.cfda_numbers.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium">{formatDate(grant.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {(grant.description || grant.summary) && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
                <div className="prose prose-gray max-w-none">
                  {grant.description && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{grant.description}</p>
                    </div>
                  )}
                  {grant.summary && grant.summary !== grant.description && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                      <p className="text-gray-700">{grant.summary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Eligibility */}
            {(grant.eligible_applicant_types || grant.eligible_categories || grant.focus_areas) && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Eligibility</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {grant.eligible_applicant_types && grant.eligible_applicant_types.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Eligible Applicant Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {grant.eligible_applicant_types.map((type, index) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {grant.eligible_categories && grant.eligible_categories.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Eligible Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {grant.eligible_categories.map((category, index) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {grant.focus_areas && grant.focus_areas.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {grant.focus_areas.map((area, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Application Tracking */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status</h3>
              {application ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        application.status === 'awarded' ? 'bg-green-100 text-green-800' :
                        application.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                        application.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        application.status === 'applied' ? 'bg-purple-100 text-purple-800' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {application.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowApplicationForm(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Update Status
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {application.applied_date && (
                      <div>
                        <span className="text-gray-600">Applied:</span>
                        <span className="ml-2 font-medium">{formatDate(application.applied_date)}</span>
                      </div>
                    )}
                    {application.submitted_date && (
                      <div>
                        <span className="text-gray-600">Submitted:</span>
                        <span className="ml-2 font-medium">{formatDate(application.submitted_date)}</span>
                      </div>
                    )}
                    {application.decision_date && (
                      <div>
                        <span className="text-gray-600">Decision:</span>
                        <span className="ml-2 font-medium">{formatDate(application.decision_date)}</span>
                      </div>
                    )}
                    {application.amount_requested && (
                      <div>
                        <span className="text-gray-600">Requested:</span>
                        <span className="ml-2 font-medium">${application.amount_requested.toLocaleString()}</span>
                      </div>
                    )}
                    {application.amount_awarded && (
                      <div>
                        <span className="text-gray-600">Awarded:</span>
                        <span className="ml-2 font-medium text-green-600">${application.amount_awarded.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {application.notes && (
                    <div className="mt-3">
                      <span className="text-gray-600 text-sm">Notes:</span>
                      <p className="text-sm text-gray-900 mt-1">{application.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-4">Track your application progress for this grant</p>
                  <button
                    onClick={() => setShowApplicationForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                  >
                    Start Tracking Application
                  </button>
                </div>
              )}
            </div>

            {/* Application Form Modal */}
            {showApplicationForm && (
              <ApplicationFormModal
                application={application}
                onSubmit={handleApplicationSubmit}
                onClose={() => setShowApplicationForm(false)}
                loading={applicationLoading}
              />
            )}

            {/* Actions */}
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {grant.source_url && (
                  <a
                    href={grant.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white text-center font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Apply for Grant
                  </a>
                )}
                <button
                  onClick={handleSaveToggle}
                  disabled={saveLoading}
                  className={`px-6 py-3 border font-medium rounded-lg transition-colors ${
                    isSaved
                      ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {saveLoading ? 'Saving...' : (isSaved ? '✓ Saved' : 'Save for Later')}
                </button>
                <button className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Share Grant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Application Form Modal Component
function ApplicationFormModal({
  application,
  onSubmit,
  onClose,
  loading
}: {
  application: GrantApplication | null;
  onSubmit: (data: ApplicationFormData) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    status: application?.status || 'interested',
    applied_date: application?.applied_date ? application.applied_date.split('T')[0] : '',
    submitted_date: application?.submitted_date ? application.submitted_date.split('T')[0] : '',
    decision_date: application?.decision_date ? application.decision_date.split('T')[0] : '',
    amount_requested: application?.amount_requested || '',
    amount_awarded: application?.amount_awarded || '',
    notes: application?.notes || '',
    internal_reference: application?.internal_reference || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      amount_requested: formData.amount_requested ? parseInt(formData.amount_requested as string) : null,
      amount_awarded: formData.amount_awarded ? parseInt(formData.amount_awarded as string) : null,
    };
    onSubmit(submitData);
  };

  const statusOptions = [
    { value: 'interested', label: 'Interested' },
    { value: 'applied', label: 'Applied' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'awarded', label: 'Awarded' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {application ? 'Update Application' : 'Track Application'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Reference
              </label>
              <input
                type="text"
                value={formData.internal_reference}
                onChange={(e) => setFormData({ ...formData, internal_reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your tracking number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Applied Date
              </label>
              <input
                type="date"
                value={formData.applied_date}
                onChange={(e) => setFormData({ ...formData, applied_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submitted Date
              </label>
              <input
                type="date"
                value={formData.submitted_date}
                onChange={(e) => setFormData({ ...formData, submitted_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Decision Date
              </label>
              <input
                type="date"
                value={formData.decision_date}
                onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Requested
              </label>
              <input
                type="number"
                value={formData.amount_requested}
                onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Awarded
              </label>
              <input
                type="number"
                value={formData.amount_awarded}
                onChange={(e) => setFormData({ ...formData, amount_awarded: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add any notes about your application..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (application ? 'Update' : 'Start Tracking')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}