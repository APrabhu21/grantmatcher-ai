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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A1A1A] mx-auto"></div>
          <p className="mt-4 text-[#666666] font-inter">Loading grants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      {/* Header */}
      <div className="border-b border-gray-100 bg-[#FDFCFB] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif italic text-[#1A1A1A]">Browse Grants</h1>
              <p className="text-sm text-[#666666] font-inter mt-1">Explore all available funding opportunities from the archive.</p>
            </div>
            <Link
              href="/dashboard"
              className="text-[#666666] hover:text-[#1A1A1A] font-medium font-inter text-sm uppercase tracking-wider"
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
                className="w-full p-3 border border-gray-200 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-[#1A1A1A] placeholder-gray-400 bg-white font-inter outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-3 bg-[#1A1A1A] text-white rounded-sm font-bold uppercase tracking-widest hover:bg-black font-inter transition-colors text-xs"
            >
              Search
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-sm">
            <p className="text-red-800 font-inter">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A1A1A] mx-auto"></div>
            <p className="mt-4 text-[#666666] font-inter">
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
                className="bg-white rounded-sm border border-gray-100 p-6 hover:border-gray-300 transition-all duration-300 group hover:shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-serif font-medium text-[#1A1A1A] line-clamp-2 italic group-hover:text-indigo-900 transition-colors">
                    {grant.title}
                  </h3>
                </div>

                <p className="text-sm text-[#666666] mb-6 line-clamp-3 font-inter leading-relaxed">
                  {grant.description}
                </p>

                <div className="space-y-3 mb-6 pt-4 border-t border-gray-50 font-inter">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-gray-400">Agency</span>
                    <span className="text-[#1A1A1A] font-semibold text-right pl-4">{grant.agency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-gray-400">Amount</span>
                    <span className="text-[#1A1A1A] font-semibold">{formatAmount(grant.amount_floor, grant.amount_ceiling)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-gray-400">Deadline</span>
                    <span className="text-[#1A1A1A] font-semibold">{formatDate(grant.close_date)}</span>
                  </div>
                </div>

                {grant.focus_areas && grant.focus_areas.length > 0 && (
                  <div className="mb-6">
                    <div className="flex flex-wrap gap-1">
                      {grant.focus_areas.slice(0, 3).map((area, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 rounded-sm border border-gray-100"
                        >
                          {area}
                        </span>
                      ))}
                      {grant.focus_areas.length > 3 && (
                        <span className="text-[10px] text-gray-400 pt-1 pl-1">
                          +{grant.focus_areas.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <Link
                  href={`/grants/${grant.id}`}
                  className="w-full block text-center px-4 py-2 bg-[#1A1A1A] text-white rounded-sm text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors font-inter"
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
            <div className="text-[#1A1A1A] mb-4 text-4xl">
              ⚖️
            </div>
            <h3 className="text-xl font-serif italic text-[#1A1A1A] mb-2">
              {isSearching ? 'No grants found' : 'No grants available'}
            </h3>
            <p className="text-[#666666] font-inter">
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
                className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium font-inter underline decoration-indigo-200 underline-offset-4"
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
