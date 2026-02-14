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
    <div className="min-h-screen bg-transparent">
      {/* Search Header */}
      <div className="bg-white border-b border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 tracking-tight">Institutional Index</h1>
            <p className="text-secondary font-sans font-medium uppercase tracking-[0.25em] text-[10px] mb-10">Grant Resource Research Archive</p>

            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query entries by mission, keyword, or governing agency..."
                className="w-full px-6 py-5 bg-white border border-slate-300 rounded-sm focus:ring-1 focus:ring-primary focus:border-primary text-primary placeholder-slate-400 font-sans transition-all duration-300 group-hover:border-slate-400 outline-none shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-3">
                {isSearching && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-3 py-1.5 text-[10px] font-bold text-secondary hover:text-primary uppercase tracking-widest"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-8 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-colors shadow-sm"
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
            <div className="mb-8 flex justify-between items-end border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-serif font-bold text-primary">
                  {isSearching ? `Index Search: "${searchQuery}"` : 'Recommended Opportunities'}
                </h2>
                <p className="text-secondary font-sans text-sm mt-1">
                  {isSearching
                    ? `Displaying ${matches.length} entries from the archive`
                    : 'Curated based on institutional mission alignment'
                  }
                </p>
              </div>
              <div className="flex gap-4 items-center font-sans text-xs font-bold uppercase tracking-widest text-secondary">
                <span className="flex items-center gap-2">
                  <Link href="/saved-grants" className="hover:text-primary transition-colors">Saved ({savedGrants.length})</Link>
                </span>
                <span className="w-px h-4 bg-slate-300"></span>
                <span className="flex items-center gap-2">
                  <Link href="/applications" className="hover:text-primary transition-colors">Tracked ({applicationsCount})</Link>
                </span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => (
                <div key={match.id} className="catalogue-card group flex flex-col h-full bg-white">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 border border-slate-200 flex items-center justify-center font-serif text-slate-400 group-hover:border-primary group-hover:text-primary transition-colors">
                        {match.agency.charAt(0)}
                      </div>
                      <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 border border-slate-100 px-2 py-0.5 whitespace-nowrap">
                        Match Score: {Math.round(match.score * 100)}%
                      </span>
                    </div>

                    <h3 className="text-xl font-serif font-bold text-primary mb-2 line-clamp-2 leading-tight min-h-[3.5rem]">
                      {match.title}
                    </h3>
                    <p className="text-xs font-sans font-bold uppercase tracking-widest text-accent mb-4">
                      {match.agency}
                    </p>

                    <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed font-sans italic">
                      {match.description}
                    </p>

                    <div className="space-y-3 mb-6 pt-4 border-t border-slate-50 font-sans">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-slate-400">Appropriation:</span>
                        <span className="text-primary">{formatAmount(match.amount_floor, match.amount_ceiling)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-slate-400">Document Deadline:</span>
                        <span className="text-primary">{formatDate(match.close_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-auto">
                    <div className="flex gap-3">
                      <Link
                        href={`/grants/${match.id}`}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-[0.2em] text-center block hover:bg-slate-800 transition-colors"
                      >
                        Examine Entry
                      </Link>
                      <button
                        onClick={() => handleSaveToggle(match.id)}
                        className={`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${isGrantSaved(match.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-primary'
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