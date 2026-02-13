'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApplicationWithGrant {
  application: {
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
  };
  grant: {
    id: string;
    title: string;
    agency: string;
    amount_floor?: number;
    amount_ceiling?: number;
    close_date?: string;
    status: string;
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchApplications();
    }
  }, [status, router]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/applications');

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load applications');
      }
    } catch (err) {
      setError('Failed to load applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return 'Not set';
    return `$${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awarded': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'applied': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchApplications}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">GrantMatcherAI</h1>
              <p className="text-sm text-gray-600">Your grant applications</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {session?.user?.name || 'User'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No applications yet</h2>
            <p className="text-gray-600 mb-6">
              Start tracking your grant applications to keep organized.
            </p>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Browse Grants
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Grant Applications</h2>
              <p className="text-gray-600">Track the status of your grant applications</p>
            </div>

            <div className="space-y-6">
              {applications.map((item) => (
                <div key={item.application.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/grants/${item.grant.id}`}
                        className="text-xl font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {item.grant.title}
                      </Link>
                      <p className="text-gray-600 mt-1">{item.grant.agency}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.application.status)}`}>
                      {item.application.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Applied</span>
                      <p className="font-medium">{formatDate(item.application.applied_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Submitted</span>
                      <p className="font-medium">{formatDate(item.application.submitted_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Decision</span>
                      <p className="font-medium">{formatDate(item.application.decision_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Grant Amount</span>
                      <p className="font-medium">
                        {item.grant.amount_floor && item.grant.amount_ceiling
                          ? `$${item.grant.amount_floor.toLocaleString()} - $${item.grant.amount_ceiling.toLocaleString()}`
                          : 'Not specified'
                        }
                      </p>
                    </div>
                  </div>

                  {(item.application.amount_requested || item.application.amount_awarded) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {item.application.amount_requested && (
                        <div>
                          <span className="text-sm text-gray-500">Amount Requested</span>
                          <p className="font-medium">{formatAmount(item.application.amount_requested)}</p>
                        </div>
                      )}
                      {item.application.amount_awarded && (
                        <div>
                          <span className="text-sm text-gray-500">Amount Awarded</span>
                          <p className="font-medium text-green-600">{formatAmount(item.application.amount_awarded)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {item.application.internal_reference && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500">Reference</span>
                      <p className="font-medium">{item.application.internal_reference}</p>
                    </div>
                  )}

                  {item.application.notes && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500">Notes</span>
                      <p className="text-gray-900 mt-1">{item.application.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-sm text-gray-500">
                      Last updated: {formatDate(item.application.updated_at)}
                    </span>
                    <Link
                      href={`/grants/${item.grant.id}`}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                    >
                      Update Status
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}