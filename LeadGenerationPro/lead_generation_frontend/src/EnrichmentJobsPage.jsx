import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock, Loader2, RefreshCw, Layers, Activity, Trash2, ArrowLeft, CheckCircle2, XCircle, Eye
} from 'lucide-react';
import API_BASE from './api_base';
import Header from './components/Header';

const T = {
  bg: '#C7D8ED',
  bgDeep: '#b0ccdf',
  navy: '#00364A',
  navyLight: '#005b7a',
  teal: '#49A3C4',
  tealLight: '#8ecde6',
  white: '#FFFFFF',
  border: '#E0EFFF',
  muted: '#668a99',
  success: '#10B981',
  error: '#EF4444',
  warn: '#F59E0B'
};

/* ── ui components ── */
function StatusBadge({ status }) {
  const styles = {
    queued: { bg: 'rgba(245,158,11,0.1)', color: T.warn, border: `1px solid rgba(245,158,11,0.2)` },
    running: { bg: 'rgba(73,163,196,0.1)', color: T.navy, border: `1px solid rgba(73,163,196,0.2)` },
    completed: { bg: 'rgba(16,185,129,0.1)', color: T.success, border: `1px solid rgba(16,185,129,0.2)` },
    failed: { bg: 'rgba(239,68,68,0.1)', color: T.error, border: `1px solid rgba(239,68,68,0.2)` },
  };
  const s = styles[status] || { bg: '#eee', color: '#555', border: '1px solid #ccc' };

  let icon = null;
  if (status === 'queued') icon = <Clock size={12} />;
  if (status === 'running') icon = <RefreshCw size={12} className="spin" />;
  if (status === 'completed') icon = <CheckCircle2 size={12} />;
  if (status === 'failed') icon = <XCircle size={12} />;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: s.bg, color: s.color, outline: s.border,
      padding: '4px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px'
    }}>
      {icon} {status}
    </span>
  );
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 8, background: 'rgba(0,54,74,0.1)' }}>
        <div style={{
          height: '100%', borderRadius: 8,
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${T.teal}, ${T.navyLight})`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: T.navy, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

export default function EnrichmentJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const pollRef = useRef(null);

  const fetchJobs = () => {
    setJobsLoading(true);
    fetch(`${API_BASE}/enrichment/jobs`)
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  };

  useEffect(() => {
    fetchJobs();

    // Auto-refresh jobs every 3 seconds to update progress visually
    pollRef.current = setInterval(() => {
      fetch(`${API_BASE}/enrichment/jobs`)
        .then(r => r.json())
        .then(d => setJobs(d.jobs || []))
        .catch(() => { });
    }, 110000);

    return () => clearInterval(pollRef.current);
  }, []);

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job history?")) return;
    try {
      const res = await fetch(`${API_BASE}/enrichment/jobs/${jobId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete job");
      }
      setJobs(prev => prev.filter(j => j.job_id !== jobId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: T.bg,
      color: T.text,
      fontFamily: "'Segoe UI', 'Poppins', sans-serif",
    }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .spin { animation: spin 1.2s linear infinite; }
      `}</style>

      {/* ── Header ── */}
      <Header activeTab="enrichment" />

      {/* ── Main content ── */}
      <main style={{ maxWidth: 1200, margin: '20px auto 60px', padding: '0 20px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
          <button
            onClick={() => navigate('/enrichment')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: T.white, border: `1px solid ${T.border}`,
              color: T.navy, padding: '10px 16px', borderRadius: 12,
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <h2 style={{ margin: 0, fontSize: 28, color: T.navy, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock color={T.teal} size={28} /> All Scheduled Jobs
          </h2>
        </div>

        <div style={{
          background: T.white,
          borderRadius: 20,
          padding: '30px 40px',
          boxShadow: '0 12px 36px rgba(0,54,74,0.08)',
          border: `1px solid rgba(255,255,255,0.6)`
        }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: T.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
              Global Enrichment Tasks
            </h3>
            <button
              onClick={() => fetchJobs()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: `1.5px solid ${T.border}`,
                background: T.white, color: T.navy,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {jobsLoading && jobs.length === 0
            ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: T.muted }}>
              <Loader2 size={32} className="spin" style={{ marginBottom: 15 }} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Loading job history…</p>
            </div>
            : jobs.length === 0
              ? <div style={{ textAlign: 'center', padding: '60px 0', border: `2px dashed ${T.border}`, borderRadius: 16 }}>
                <p style={{ margin: 0, fontSize: 16, color: T.muted }}>
                  No enrichment jobs have been scheduled across the system yet.
                </p>
              </div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                        {['Entity', 'Provider', 'Status', 'Progress', 'Total', 'Enriched', 'Failed', 'Started', 'Completed', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 12px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 13 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(j => (
                        <tr key={j.job_id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '14px 12px', fontWeight: 700, color: T.navy }}>{j.entity_name}</td>
                          <td style={{ padding: '14px 12px', fontWeight: 600, color: T.navy, textTransform: 'capitalize' }}>{j.provider}</td>
                          <td style={{ padding: '14px 12px' }}><StatusBadge status={j.status} /></td>
                          <td style={{ padding: '14px 12px', minWidth: 140 }}>
                            <ProgressBar value={j.enriched_rows || 0} max={j.total_rows || 0} />
                          </td>
                          <td style={{ padding: '14px 12px', color: T.muted, fontWeight: 500 }}>{j.total_rows}</td>
                          <td style={{ padding: '14px 12px', color: T.success, fontWeight: 700 }}>{j.enriched_rows}</td>
                          <td style={{ padding: '14px 12px', color: j.failed_rows > 0 ? T.error : T.muted, fontWeight: j.failed_rows > 0 ? 700 : 400 }}>{j.failed_rows}</td>
                          <td style={{ padding: '14px 12px', color: T.muted }}>
                            {j.started_at ? new Date(j.started_at).toLocaleString() : '—'}
                          </td>
                          <td style={{ padding: '14px 12px', color: T.muted }}>
                            {j.completed_at ? new Date(j.completed_at).toLocaleString() : '—'}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => navigate(`/entity-data?entity=${j.entity_name}`)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: T.teal, padding: '6px', opacity: 0.7, transition: 'all 0.2s',
                                borderRadius: '50%', marginRight: 4
                              }}
                              title="View Entity Data"
                              onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(73, 163, 196, 0.1)'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(j.job_id)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: T.error, padding: '6px', opacity: 0.7, transition: 'all 0.2s',
                                borderRadius: '50%'
                              }}
                              title="Delete Job"
                              onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
          }
        </div>
      </main>
    </div>
  );
}
