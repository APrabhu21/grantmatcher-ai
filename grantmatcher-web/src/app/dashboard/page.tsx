'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GrantCardSkeleton from '@/components/GrantCardSkeleton';

interface GrantMatch {
  id: string;
  title: string;
  description: string;
  agency: string;
  source: string;
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
      console.log('Checking profile completion...');
      const profileResponse = await fetch('/api/profile');

      if (profileResponse.status === 401) {
        console.log('User unauthorized, redirecting to login');
        router.push('/login');
        return;
      }

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log('Profile loaded:', profile.email);

        // If user doesn't have mission statement, redirect to onboarding
        if (!profile.mission_statement || profile.mission_statement.trim() === '') {
          console.log('Profile incomplete (missing mission), redirecting to onboarding');
          router.push('/onboarding/step1');
          return;
        }

        console.log('Profile complete, loading dashboard data');
      } else {
        console.error('Failed to fetch profile:', profileResponse.status);
        // If profile fetch fails but not 401, assume user needs onboarding
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
      <div className="min-h-screen bg-[#FDFCFB]">
        <div className="border-b border-gray-100 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="h-12 w-64 bg-slate-100 skeleton-pulse mx-auto mb-4"></div>
              <div className="h-4 w-48 bg-slate-50 skeleton-pulse mx-auto mb-10"></div>
              <div className="h-16 w-full bg-slate-100 skeleton-pulse rounded-sm"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-8 h-10 w-48 bg-slate-100 skeleton-pulse border-b border-slate-200 pb-4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <GrantCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4 font-inter">{error}</p>
          <button
            onClick={() => fetchMatches()}
            className="px-6 py-2 bg-[#1A1A1A] text-white rounded-sm hover:bg-black font-inter transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      {/* Search Header */}
      <div className="border-b border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-serif text-[#1A1A1A] mb-4 tracking-tight italic">Institutional Index</h1>
            <p className="text-[#666666] font-inter font-medium uppercase tracking-[0.25em] text-[10px] mb-10">Grant Resource Research Archive</p>

            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query entries by mission, keyword, or governing agency..."
                className="w-full px-6 py-4 bg-white border border-gray-200 rounded-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-[#1A1A1A] placeholder-gray-400 font-inter transition-all duration-300 group-hover:border-gray-300 outline-none shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-3">
                {isSearching && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-3 py-1.5 text-[10px] font-bold text-[#666666] hover:text-[#1A1A1A] uppercase tracking-widest font-inter"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-[#1A1A1A] text-white px-8 py-2 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-colors shadow-sm font-inter"
                >
                  Search Index
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-[#1A1A1A]">🎯</div>
            <h2 className="text-2xl font-serif italic text-[#1A1A1A] mb-2">No matches yet</h2>
            <p className="text-[#666666] mb-6 font-inter">
              Complete your profile to get personalized grant recommendations.
            </p>
            <button
              onClick={() => router.push('/onboarding/step1')}
              className="px-6 py-2 bg-[#1A1A1A] text-white rounded-sm font-medium hover:bg-black font-inter transition-colors"
            >
              Complete Profile
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-8 flex justify-between items-end border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-serif text-[#1A1A1A] italic">
                  {isSearching ? `Index Search: "${searchQuery}"` : 'Recommended Opportunities'}
                </h2>
                <p className="text-[#666666] font-inter text-sm mt-1">
                  {isSearching
                    ? `Displaying ${matches.length} entries from the archive`
                    : 'Curated based on institutional mission alignment'
                  }
                </p>
              </div>
              <div className="flex gap-4 items-center font-inter text-xs font-bold uppercase tracking-widest text-[#666666]">
                <span className="flex items-center gap-2">
                  <Link href="/saved-grants" className="hover:text-[#1A1A1A] transition-colors">Saved ({savedGrants.length})</Link>
                </span>
                <span className="w-px h-4 bg-gray-200"></span>
                <span className="flex items-center gap-2">
                  <Link href="/applications" className="hover:text-[#1A1A1A] transition-colors">Tracked ({applicationsCount})</Link>
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matches.map((match, i) => (
                <div
                  key={match.id}
                  className="catalogue-card group flex flex-col h-full bg-white animate-stagger-fade border border-transparent hover:border-gray-100 transition-all duration-300 shadow-sm hover:shadow-md rounded-sm"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="agency-icon bg-gray-50 text-[#1A1A1A] font-serif font-bold text-xl w-10 h-10 flex items-center justify-center rounded-sm border border-gray-100">
                        {match.agency.charAt(0)}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`score-badge px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${match.score >= 0.8 ? 'bg-[#1A1A1A] text-white' :
                          match.score >= 0.5 ? 'bg-gray-100 text-[#1A1A1A]' : 'bg-gray-50 text-gray-400'
                          }`}>
                          Match Score: {Math.round(match.score * 100)}%
                        </span>
                        <span className="text-[9px] font-inter font-bold uppercase tracking-tighter px-1.5 py-0.5 border border-gray-100 text-gray-400 bg-gray-50 rounded-sm">
                          {match.source}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-serif font-medium text-[#1A1A1A] mb-2 line-clamp-2 leading-tight min-h-[3.5rem] italic group-hover:text-indigo-900 transition-colors">
                      {match.title}
                    </h3>
                    <p className="text-xs font-inter font-bold uppercase tracking-widest text-[#666666] mb-4">
                      {match.agency}
                    </p>

                    <p className="text-[#666666] text-sm mb-6 line-clamp-3 leading-relaxed font-inter">
                      {match.description}
                    </p>

                    <div className="space-y-3 mb-6 pt-4 border-t border-gray-50 font-inter">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-gray-400">Appropriation:</span>
                        <span className="text-[#1A1A1A]">{formatAmount(match.amount_floor, match.amount_ceiling)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-gray-400">Document Deadline:</span>
                        <span className="text-[#1A1A1A]">{formatDate(match.close_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 mt-auto">
                    <div className="flex gap-3">
                      <Link
                        href={`/grants/${match.id}`}
                        className="flex-1 px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-[0.2em] text-center block hover:bg-black transition-colors rounded-sm font-inter"
                      >
                        Examine Entry
                      </Link>
                      <button
                        onClick={() => handleSaveToggle(match.id)}
                        className={`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 rounded-sm font-inter ${isGrantSaved(match.id)
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'border-gray-200 text-gray-500 hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
                          }`}
                      >
                        {isGrantSaved(match.id) ? 'Saved' : 'Save'}
                      </button>
                    </div>
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
