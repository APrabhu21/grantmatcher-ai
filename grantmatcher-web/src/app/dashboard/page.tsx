'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GrantMatch {
  id: string;
  title: string;
  description: string;
  agency: string;
  amount_floor?: number;
  amount_ceiling?: number;
  close_date?: string;
  score: number;
  explanation: string;
}

interface SavedGrant {
  grant: {
    id: string;
  };
}

export default function Dashboard() {
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedGrants, setSavedGrants] = useState<SavedGrant[]>([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      checkProfileCompletion();
    }
  }, [status, router]);

  const checkProfileCompletion = async () => {
    try {
      const profileResponse = await fetch('/api/profile');
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        // If user doesn't have mission statement, redirect to onboarding
        if (!profile.mission_statement || profile.mission_statement.trim() === '') {
          router.push('/onboarding/step1');
          return;
        }
      } else {
        // If profile fetch fails, assume user needs onboarding
        router.push('/onboarding/step1');
        return;
      }

      // Profile is complete, load dashboard data
      fetchMatches();
      fetchSavedGrants();
      fetchApplicationsCount();
    } catch (error) {
      console.error('Error checking profile:', error);
      // On error, redirect to onboarding to be safe
      router.push('/onboarding/step1');
    }
  };

  const fetchMatches = async (query?: string) => {
    try {
      setLoading(true);
      setError('');

      let url = '/api/matches';
      if (query && query.trim()) {
        url += `?q=${encodeURIComponent(query.trim())}`;
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load matches');
      }
    } catch (err) {
      setError('Failed to load matches');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedGrants = async () => {
    try {
      const response = await fetch('/api/saved-grants');
      if (response.ok) {
        const data = await response.json();
        setSavedGrants(data.saved_grants || []);
      }
    } catch (err) {
      console.error('Error fetching saved grants:', err);
    }
  };

  const fetchApplicationsCount = async () => {
    try {
      const response = await fetch('/api/applications');
      if (response.ok) {
        const data = await response.json();
        setApplicationsCount(data.applications?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching applications count:', err);
    }
  };

  const isGrantSaved = (grantId: string) => {
    return savedGrants.some(saved => saved.grant.id === grantId);
  };

  const handleSaveToggle = async (grantId: string) => {
    try {
      const isSaved = isGrantSaved(grantId);
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/grants/${grantId}/save`, {
        method,
      });

      if (response.ok) {
        // Refresh saved grants
        await fetchSavedGrants();
      }
    } catch (err) {
      console.error('Error toggling save status:', err);
    }
  };

  const handleFeedback = async (grantId: string, feedbackType: 'dismissed' | 'saved' | 'applied') => {
    try {
      const response = await fetch('/api/matches/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_id: grantId,
          feedback_type: feedbackType,
        }),
      });

      if (response.ok) {
        // Remove the grant from matches if dismissed
        if (feedbackType === 'dismissed') {
          setMatches(prev => prev.filter(match => match.id !== grantId));
        }
      } else {
        console.error('Error submitting feedback:', await response.text());
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMatches(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    fetchMatches();
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
          <p className="mt-4 text-gray-600">Loading your grant matches...</p>
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
            onClick={() => fetchMatches()}
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
              <h1 className="text-2xl font-bold text-gray-900">GrantMatcherAI</h1>
              <p className="text-sm text-gray-600">Your personalized grant matches</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/saved-grants"
                className="text-sm text-gray-600 hover:text-indigo-600"
              >
                Saved Grants ({savedGrants.length})
              </Link>
              <Link
                href="/applications"
                className="text-sm text-gray-600 hover:text-indigo-600"
              >
                Applications ({applicationsCount})
              </Link>
              <span className="text-sm text-gray-600">Welcome, {session?.user?.name || 'User'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for grants (e.g., 'climate change', 'education', 'nonprofit')"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Search
            </button>
            {isSearching && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No matches yet</h2>
            <p className="text-gray-600 mb-6">
              Complete your profile to get personalized grant recommendations.
            </p>
            <button
              onClick={() => router.push('/onboarding/step1')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Complete Profile
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isSearching ? `Search Results for "${searchQuery}"` : 'Your Top Grant Matches'}
              </h2>
              <p className="text-gray-600">
                {isSearching
                  ? `Found ${matches.length} grants matching your search`
                  : 'Based on your organization\'s mission and focus areas'
                }
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => (
                <div key={match.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {match.title}
                      </h3>
                      <p className="text-sm text-indigo-600 font-medium">{match.agency}</p>
                    </div>
                    <div className="ml-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {Math.round(match.score * 100)}% match
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {match.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-medium">{formatAmount(match.amount_floor, match.amount_ceiling)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Deadline:</span>
                      <span className="font-medium">{formatDate(match.close_date)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 italic">
                    {match.explanation}
                  </p>

                  <div className="flex gap-2 mb-4">
                    <Link
                      href={`/grants/${match.id}`}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 text-center block"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleSaveToggle(match.id)}
                      className={`px-4 py-2 border text-sm font-medium rounded-lg transition-colors ${
                        isGrantSaved(match.id)
                          ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isGrantSaved(match.id) ? '✓ Saved' : 'Save'}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFeedback(match.id, 'dismissed')}
                      className="flex-1 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100"
                    >
                      Not Relevant
                    </button>
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