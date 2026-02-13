'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SavedGrant {
  tracked_id: string;
  grant: {
    id: string;
    title: string;
    description: string;
    agency: string;
    amount_floor?: number;
    amount_ceiling?: number;
    close_date?: string;
    status: string;
  };
  saved_at: string;
  notes?: string;
  remind_days_before?: number;
}

export default function SavedGrantsPage() {
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSavedGrants();
    }
  }, [status, router]);

  const fetchSavedGrants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/saved-grants');

      if (response.ok) {
        const data = await response.json();
        setSavedGrants(data.saved_grants || []);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load saved grants');
      }
    } catch (err) {
      setError('Failed to load saved grants');
      console.error('Error fetching saved grants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (grantId: string) => {
    try {
      const response = await fetch(`/api/grants/${grantId}/save`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setSavedGrants(prev => prev.filter(saved => saved.grant.id !== grantId));
      }
    } catch (err) {
      console.error('Error unsaving grant:', err);
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
    if (!dateString) return 'No deadline';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your saved grants...</p>
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
            onClick={fetchSavedGrants}
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
              <p className="text-sm text-gray-600">Your saved grants</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {session?.user?.name || 'User'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedGrants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No saved grants yet</h2>
            <p className="text-gray-600 mb-6">
              Save grants from your dashboard or grant details to track them here.
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
              <h2 className="text-xl font-semibold text-gray-900">Your Saved Grants</h2>
              <p className="text-gray-600">Grants you've bookmarked for later</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedGrants.map((savedGrant) => (
                <div key={savedGrant.tracked_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {savedGrant.grant.title}
                      </h3>
                      <p className="text-sm text-indigo-600 font-medium">{savedGrant.grant.agency}</p>
                    </div>
                    <button
                      onClick={() => handleUnsave(savedGrant.grant.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {savedGrant.grant.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-medium">{formatAmount(savedGrant.grant.amount_floor, savedGrant.grant.amount_ceiling)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Deadline:</span>
                      <span className="font-medium">{formatDate(savedGrant.grant.close_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Saved:</span>
                      <span className="font-medium">{formatDate(savedGrant.saved_at)}</span>
                    </div>
                  </div>

                  <Link
                    href={`/grants/${savedGrant.grant.id}`}
                    className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 text-center block"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}