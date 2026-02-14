'use client';

import { useState, useEffect, use as useReact } from 'react';
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

export default function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = useReact(params);
  const id = resolvedParams.id;

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
  }, [status, router, id]);

  const fetchGrantDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/grants/${id}`);

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
      const response = await fetch(`/api/grants/${id}/application`);
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
        const saved = data.saved_grants.some((savedGrant: SavedGrant) => savedGrant.grant.id === id);
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
      const response = await fetch(`/api/grants/${id}/save`, {
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
      const response = await fetch(`/api/grants/${id}/application`, {
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
    <div className="min-h-screen bg-transparent">
      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
        <Link href="/dashboard" className="text-secondary hover:text-primary transition-colors flex items-center gap-2">
          ← Return to Catalogue
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-border overflow-hidden p-8 md:p-16 shadow-lg relative">
          {/* Watermark/Seal */}
          <div className="absolute top-8 right-8 w-24 h-24 border-4 border-slate-50 rounded-full flex items-center justify-center opacity-40 pointer-events-none">
            <span className="text-[10px] font-serif font-bold text-slate-300 text-center uppercase tracking-widest leading-tight">Institutional<br />Archive</span>
          </div>

          {/* Document Header */}
          <div className="border-b-2 border-primary pb-12 mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] text-accent px-3 py-1 border border-accent/20">
                    Official Record
                  </span>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] text-secondary">
                    Indexing Source: {grant.source}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6 leading-tight">
                  {grant.title}
                </h1>
                <div className="space-y-1">
                  <p className="text-xl font-serif italic text-secondary">{grant.agency}</p>
                  {grant.program_name && (
                    <p className="text-sm font-sans font-semibold uppercase tracking-wider text-slate-500">{grant.program_name}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 font-sans">
                <span className={`inline-flex items-center px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${grant.status === 'active'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-600'
                  }`}>
                  Status: {grant.status}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Archive ID: {grant.source_id}
                </span>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2 space-y-12">
              {/* DescriptionSection */}
              {(grant.description || grant.summary) && (
                <section>
                  <h3 className="text-lg font-sans font-bold uppercase tracking-widest text-primary border-b border-slate-100 pb-2 mb-6">
                    Abstract & Specification
                  </h3>
                  <div className="prose prose-slate max-w-none font-serif text-lg leading-relaxed text-slate-700">
                    {grant.description && (
                      <div className="mb-8 first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
                        <p>{grant.description}</p>
                      </div>
                    )}
                    {grant.summary && grant.summary !== grant.description && (
                      <div className="bg-slate-50 p-8 border-l-4 border-primary italic">
                        <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-secondary mb-4 not-italic">Summary Brief</h4>
                        <p className="text-slate-600 leading-relaxed">{grant.summary}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* EligibilitySection */}
              {(grant.eligible_applicant_types || grant.eligible_categories || grant.focus_areas) && (
                <section>
                  <h3 className="text-lg font-sans font-bold uppercase tracking-widest text-primary border-b border-slate-100 pb-2 mb-6">
                    Institutional Criteria
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {grant.eligible_applicant_types && grant.eligible_applicant_types.length > 0 && (
                      <div>
                        <h4 className="font-sans font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-4">Eligible Entities</h4>
                        <ul className="space-y-2">
                          {grant.eligible_applicant_types.map((type, index) => (
                            <li key={index} className="flex items-center gap-3 text-sm text-slate-700 font-sans">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                              {type}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {grant.eligible_categories && grant.eligible_categories.length > 0 && (
                      <div>
                        <h4 className="font-sans font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-4">Funding Categories</h4>
                        <ul className="space-y-2">
                          {grant.eligible_categories.map((category, index) => (
                            <li key={index} className="flex items-center gap-3 text-sm text-slate-700 font-sans">
                              <span className="w-1.5 h-1.5 border border-primary rounded-full"></span>
                              {category}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Metadata */}
            <div className="space-y-12">
              <section>
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-6">
                  Fiscal Details
                </h3>
                <div className="space-y-6 font-sans">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Appropriation Range</p>
                    <p className="text-xl font-serif font-bold text-primary">{formatAmount(grant.amount_floor, grant.amount_ceiling)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Publication</p>
                      <p className="text-sm font-semibold text-primary">{formatDate(grant.open_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Filing Deadline</p>
                      <p className="text-sm font-semibold text-accent">
                        {grant.is_rolling ? 'Rolling' : formatDate(grant.close_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2 mb-6">
                  Reference Info
                </h3>
                <div className="space-y-4 font-sans text-sm">
                  {grant.agency_code && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Agency Code</span>
                      <span className="font-semibold text-primary">{grant.agency_code}</span>
                    </div>
                  )}
                  {grant.cfda_numbers && grant.cfda_numbers.length > 0 && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">CFDA Index</p>
                      <p className="font-semibold text-primary">{grant.cfda_numbers.join(', ')}</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Archive Updated</span>
                    <span className="font-semibold text-primary">{formatDate(grant.updated_at)}</span>
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 pt-8">
                {grant.source_url && (
                  <a
                    href={grant.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary text-primary-foreground text-center py-4 text-xs font-bold uppercase tracking-[0.3em] hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    Initiate Application
                  </a>
                )}
                <button
                  onClick={handleSaveToggle}
                  disabled={saveLoading}
                  className={`py-4 border text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-300 ${isSaved
                    ? 'bg-slate-100 text-primary border-slate-200'
                    : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                >
                  {saveLoading ? 'Processing...' : (isSaved ? 'Marked in Archive' : 'Save Reference')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showApplicationForm && (
        <ApplicationFormModal
          application={application}
          onSubmit={handleApplicationSubmit}
          onClose={() => setShowApplicationForm(false)}
          loading={applicationLoading}
        />
      )}
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
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-white rounded-none border border-slate-300 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl p-8">
        <div className="border-b-2 border-primary pb-6 mb-8 flex justify-between items-center">
          <h3 className="text-2xl font-serif font-bold text-primary">
            {application ? 'Registry Update' : 'Initialize Registry Tracking'}
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-primary p-2">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="form-label">Classification</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="form-label">Internal Reference</label>
              <input
                type="text"
                value={formData.internal_reference}
                onChange={(e) => setFormData({ ...formData, internal_reference: e.target.value })}
                className="form-input"
                placeholder="PROJ-2026-X"
              />
            </div>

            <div className="space-y-4">
              <label className="form-label">Funds Requested (USD)</label>
              <input
                type="number"
                value={formData.amount_requested}
                onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="space-y-4">
              <label className="form-label">Decision Deadline (Anticipated)</label>
              <input
                type="date"
                value={formData.decision_date}
                onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="form-label">Researcher Notes & Context</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input min-h-[120px]"
              placeholder="Detailed justification or strategy notes..."
            />
          </div>

          <div className="pt-8 border-t border-slate-100 flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-opacity-90 transition-opacity"
            >
              {loading ? 'Archiving...' : 'Synchronize Registry'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 border border-slate-200 text-secondary text-[10px] font-bold uppercase tracking-widest hover:border-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}