'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Grant {
  id: string;
  title: string;
  description: string;
  agency: string;
  amount_floor?: number;
  amount_ceiling?: number;
  close_date?: string;
  focus_areas: string[];
  geographic_scope: string;
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchGrants();
    }
  }, [status, router]);

  const fetchGrants = async (query?: string) => {
    try {
      setLoading(true);
      setError('');

      let url = '/api/grants';
      if (query && query.trim()) {
        url += `?q=${encodeURIComponent(query.trim())}`;
        setIsSearching(true);
      } else {
        setIsSearching(false);
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setGrants(data.grants || []);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load grants');
      }
    } catch (err) {
      setError('Failed to load grants');
      console.error('Error fetching grants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrants(searchQuery);
  };

  const formatAmount = (floor?: number, ceiling?: number) => {
    if (!floor && !ceiling) return 'Amount not specified';
    if (floor && ceiling) {
      return `$${floor.toLocaleString()} - $${ceiling.toLocaleString()}`;
    }
    if (floor) return `$${floor.toLocaleString()}+`;
    if (ceiling) return `Up to $${ceiling.toLocaleString()}`;
    return 'Amount not specified';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading grants...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Browse Grants</h1>
              <p className="text-sm text-gray-600">Explore all available funding opportunities</p>
            </div>
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search grants by title, description, or agency..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {isSearching ? 'Searching grants...' : 'Loading grants...'}
            </p>
          </div>
        )}

        {/* Grants Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {grant.title}
                  </h3>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {grant.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Agency:</span>
                    <span className="text-gray-600">{grant.agency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Amount:</span>
                    <span className="text-gray-600">{formatAmount(grant.amount_floor, grant.amount_ceiling)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Deadline:</span>
                    <span className="text-gray-600">{formatDate(grant.close_date)}</span>
                  </div>
                </div>

                {grant.focus_areas && grant.focus_areas.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {grant.focus_areas.slice(0, 3).map((area, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full"
                        >
                          {area}
                        </span>
                      ))}
                      {grant.focus_areas.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{grant.focus_areas.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <Link
                  href={`/grants/${grant.id}`}
                  className="w-full block text-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && !error && grants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isSearching ? 'No grants found' : 'No grants available'}
            </h3>
            <p className="text-gray-600">
              {isSearching
                ? 'Try adjusting your search terms or browse all grants.'
                : 'Check back later for new funding opportunities.'
              }
            </p>
            {isSearching && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchGrants();
                }}
                className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}