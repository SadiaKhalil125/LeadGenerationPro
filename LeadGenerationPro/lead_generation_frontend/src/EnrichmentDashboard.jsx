import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, ChevronDown, ChevronUp, Database, Zap, Search,
  CheckCircle2, XCircle, Clock, Loader2, RefreshCw, ArrowLeft,
  Key, Globe, Phone, Mail, Info, AlertTriangle, Layers, Activity, Trash2, Eye
} from 'lucide-react';
import API_BASE from './api_base';

/* ─────────────────────────── theme colours (matches SCOUT palette) ─── */
const T = {
  bg: '#C7D8ED',
  bgDeep: '#b0ccdf',
  navy: '#00364A',
  navyLight: '#004d69',
  teal: '#49A3C4',
  tealLight: '#7DBBE0',
  white: '#ffffff',
  card: 'rgba(255,255,255,0.92)',
  cardHover: 'rgba(255,255,255,1)',
  border: 'rgba(0,54,74,0.13)',
  shadow: '0 4px 24px rgba(0,54,74,0.10)',
  shadowHover: '0 8px 40px rgba(0,54,74,0.18)',
  text: '#00364A',
  muted: '#4a7a94',
  success: '#22a94f',
  error: '#e03434',
  warn: '#d18a00',
  running: '#49A3C4',
};

const pill = (bg, txt) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 10px', borderRadius: 20,
  fontSize: 12, fontWeight: 600,
  backgroundColor: bg, color: txt,
});

/* ─────────────────────────── sub-components ─────────────────────────── */

function StatusBadge({ status }) {
  const map = {
    queued: { bg: 'rgba(209,138,0,0.12)', txt: '#8a5a00', icon: <Clock size={12} />, label: 'Queued' },
    running: { bg: 'rgba(73,163,196,0.15)', txt: '#005f80', icon: <Loader2 size={12} className="spin" />, label: 'Running' },
    completed: { bg: 'rgba(34,169,79,0.13)', txt: '#12663a', icon: <CheckCircle2 size={12} />, label: 'Completed' },
    failed: { bg: 'rgba(224,52,52,0.12)', txt: '#8b1a1a', icon: <XCircle size={12} />, label: 'Failed' },
  };
  const s = map[status] || map.queued;
  return <span style={pill(s.bg, s.txt)}>{s.icon}&nbsp;{s.label}</span>;
}

function SectionCard({ children, style }) {
  return (
    <div style={{
      backgroundColor: T.card,
      borderRadius: 18,
      padding: '28px 32px',
      boxShadow: T.shadow,
      border: `1px solid ${T.border}`,
      ...style
    }}>
      {children}
    </div>
  );
}

function ProviderButton({ id, label, icon, description, selected, onSelect }) {
  const active = selected === id;
  return (
    <button
      onClick={() => onSelect(id)}
      style={{
        flex: 1,
        padding: '18px 20px',
        borderRadius: 14,
        border: active ? `2px solid ${T.teal}` : `2px solid ${T.border}`,
        backgroundColor: active ? `rgba(73,163,196,0.10)` : T.white,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.22s',
        transform: active ? 'translateY(-2px)' : 'none',
        boxShadow: active ? `0 6px 24px rgba(73,163,196,0.22)` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: active ? T.teal : T.bgDeep,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? T.white : T.navy,
          transition: 'background 0.22s',
        }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: T.navy }}>{label}</span>
        {active && <CheckCircle2 size={16} color={T.teal} style={{ marginLeft: 'auto' }} />}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{description}</p>
    </button>
  );
}

function InputGroup({ label, id, type = 'text', value, onChange, placeholder, required, helpText }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>
        {label}{required && <span style={{ color: T.error }}> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          padding: '11px 14px',
          borderRadius: 10,
          border: `1.5px solid ${focused ? T.teal : T.border}`,
          fontSize: 14,
          color: T.text,
          backgroundColor: focused ? 'rgba(73,163,196,0.05)' : T.white,
          outline: 'none',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {helpText && (
        <span style={{ fontSize: 12, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Info size={11} />{helpText}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── progress bar ─────────────────────────── */
function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
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

/* ─────────────────────────── main page ─────────────────────────── */
export default function EnrichmentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // entities from DB
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(location.state?.selectedEntity || '');
  const [entityOpen, setEntityOpen] = useState(false);

  // provider
  const [provider, setProvider] = useState('');

  // apollo config
  const [apolloKey, setApolloKey] = useState('');

  // hunter config
  const [hunterKey, setHunterKey] = useState('');

  // scheduling
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);   // {type,text}

  // jobs
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [pollingJobId, setPollingJobId] = useState(null);
  const pollRef = useRef(null);

  /* ── derived: does selected entity have a 'website' column? ── */
  const selectedEntityObj = entities.find(e => e.name === selectedEntity);
  const hasWebsiteCol = selectedEntityObj
    ? (selectedEntityObj.columns || []).some(
      c => (typeof c === 'string' ? c : c.name || '').toLowerCase() === 'website'
    )
    : false;

  /* ── fetch entities once ── */
  useEffect(() => {
    fetch(`${API_BASE}/entity/entities`)
      .then(r => r.json())
      .then(d => setEntities(d.entities || []))
      .catch(() => { });
  }, []);

  /* ── fetch jobs for selected entity ── */
  const fetchJobs = (entity) => {
    if (!entity) return;
    setJobsLoading(true);
    fetch(`${API_BASE}/enrichment/jobs?entity_name=${encodeURIComponent(entity)}`)
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  };

  useEffect(() => { fetchJobs(selectedEntity); }, [selectedEntity]);

  /* ── polling active job ── */
  useEffect(() => {
    if (!pollingJobId) return;
    const poll = () => {
      fetch(`${API_BASE}/enrichment/jobs/${pollingJobId}`)
        .then(r => r.json())
        .then(d => {
          if (!d.job) return;
          setJobs(prev => prev.map(j => j.job_id === pollingJobId ? d.job : j));
          if (['completed', 'failed'].includes(d.job.status)) {
            clearInterval(pollRef.current);
            setPollingJobId(null);
          }
        })
        .catch(() => { });
    };
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [pollingJobId]);

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!selectedEntity) { setSubmitMsg({ type: 'error', text: 'Please select an entity.' }); return; }
    if (!provider) { setSubmitMsg({ type: 'error', text: 'Please choose a provider.' }); return; }
    if (provider === 'apollo' && !apolloKey) { setSubmitMsg({ type: 'error', text: 'Apollo API key is required.' }); return; }
    if (provider === 'hunter' && !hunterKey) { setSubmitMsg({ type: 'error', text: 'Hunter API key is required.' }); return; }

    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const res = await fetch(`${API_BASE}/enrichment/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_name: selectedEntity,
          provider,
          config: {
            api_key: provider === 'apollo' ? apolloKey : (provider === 'hunter' ? hunterKey : ''),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Unknown error');

      setSubmitMsg({ type: 'success', text: data.message });
      setPollingJobId(data.job_id);
      // Prepend new job placeholder
      setJobs(prev => [{
        job_id: data.job_id,
        entity_name: selectedEntity,
        provider,
        status: 'queued',
        total_rows: 0, enriched_rows: 0, failed_rows: 0,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── handle delete job ── */
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

  /* ── entity dropdown ── */
  const entityDropdown = (
    <div style={{ position: 'relative' }}>
      <button
        id="entity-select-btn"
        onClick={() => setEntityOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px',
          borderRadius: 12,
          border: `1.5px solid ${entityOpen ? T.teal : T.border}`,
          backgroundColor: T.white,
          color: selectedEntity ? T.navy : T.muted,
          fontSize: 15, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <span>{selectedEntity || 'Select an entity…'}</span>
        {entityOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {entityOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          backgroundColor: T.white, borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,54,74,0.18)',
          border: `1px solid ${T.border}`,
          maxHeight: 260, overflowY: 'auto',
        }}>
          {entities.length === 0
            ? <p style={{ padding: '16px', margin: 0, color: T.muted, fontSize: 14 }}>No entities found</p>
            : entities.map(e => (
              <button
                key={e.name}
                onClick={() => { setSelectedEntity(e.name); setEntityOpen(false); }}
                style={{
                  width: '100%', padding: '11px 16px',
                  background: selectedEntity === e.name ? `rgba(73,163,196,0.10)` : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 14, color: T.navy, fontWeight: selectedEntity === e.name ? 700 : 500,
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                  borderBottom: `1px solid ${T.border}`,
                }}
                onMouseEnter={ev => { if (selectedEntity !== e.name) ev.currentTarget.style.background = 'rgba(73,163,196,0.06)'; }}
                onMouseLeave={ev => { if (selectedEntity !== e.name) ev.currentTarget.style.background = 'transparent'; }}
              >
                <Database size={13} style={{ marginRight: 8, opacity: 0.6 }} />
                {e.name}
                <span style={{ fontSize: 11, color: T.muted, marginLeft: 8 }}>
                  ({e.columns?.length || 0} cols)
                </span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  );

  /* ── provider config panel ── */
  const configPanel = (provider === 'apollo' || provider === 'hunter') && (
    <div style={{
      marginTop: 20, padding: '22px 24px',
      borderRadius: 14, border: `1.5px solid ${T.teal}`,
      background: 'rgba(73,163,196,0.04)',
      animation: 'fadeSlide 0.25s ease',
    }}>
      <h4 style={{ margin: '0 0 18px', fontSize: 15, color: T.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Key size={15} color={T.teal} /> {provider === 'apollo' ? 'Apollo.io' : 'Hunter.io'} Configuration
      </h4>

      {provider === 'apollo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InputGroup
            id="apollo-key"
            label="Apollo API Key"
            type="password"
            value={apolloKey}
            onChange={setApolloKey}
            placeholder="Enter your Apollo API key"
            required
            helpText="Found in Apollo → Settings → API Keys. Used via X-Api-Key header."
          />
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(73,163,196,0.08)',
            fontSize: 12, color: T.muted, lineHeight: 1.6,
          }}>
            <strong style={{ color: T.navy }}>What Apollo enriches:</strong><br />
            📧 Email &nbsp;|&nbsp; 📞 Phone &nbsp;|&nbsp; 💼 Title &nbsp;|&nbsp; 🔗 LinkedIn URL &nbsp;|&nbsp; 📍 Location<br />
            <span style={{ color: T.warn }}>⚡ Consumes Apollo credits per match. Enable reveal_phone_number in your plan.</span>
          </div>
        </div>
      )}

      {provider === 'hunter' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InputGroup
            id="hunter-key"
            label="Hunter.io API Key"
            type="password"
            value={hunterKey}
            onChange={setHunterKey}
            placeholder="Enter your Hunter.io API key"
            required
            helpText="Found in Hunter → Dashboard → API. Requires first_name, last_name & domain in entity."
          />
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(209,138,0,0.07)',
            fontSize: 12, color: T.muted, lineHeight: 1.6,
          }}>
            <strong style={{ color: T.navy }}>What Hunter enriches:</strong><br />
            📧 Email (confidence scored)<br />
            <span style={{ color: T.warn }}>
              ⚠️ Hunter does <u>not</u> return phone numbers. Your entity must have
              <code style={{ background: 'rgba(0,54,74,0.08)', padding: '1px 5px', borderRadius: 4 }}>domain</code>,
              <code style={{ background: 'rgba(0,54,74,0.08)', padding: '1px 5px', borderRadius: 4 }}>first_name</code>, and
              <code style={{ background: 'rgba(0,54,74,0.08)', padding: '1px 5px', borderRadius: 4 }}>last_name</code> columns.
            </span>
          </div>
        </div>
      )}
    </div>
  );

  /* ── jobs table ── */
  const jobsPanel = selectedEntity && (
    <SectionCard style={{ marginTop: 28, marginBottom: 50 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 17, color: T.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color={T.teal} /> Enrichment Jobs — <em style={{ fontWeight: 400 }}>{selectedEntity}</em>
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/enrichment-jobs')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: `1.5px solid ${T.teal}`,
              background: 'rgba(73, 163, 196, 0.1)', color: T.navy,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(73, 163, 196, 0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(73, 163, 196, 0.1)'; }}
          >
            View All Jobs
          </button>
          <button
            onClick={() => fetchJobs(selectedEntity)}
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
      </div>

      {jobsLoading
        ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0', color: T.muted }}>
          <Loader2 size={24} className="spin" style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Loading jobs…</p>
        </div>
        : jobs.length === 0
          ? <p style={{ margin: 0, fontSize: 14, color: T.muted, textAlign: 'center', padding: '20px 0' }}>
            No enrichment jobs yet. Schedule one above.
          </p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                    {['Provider', 'Status', 'Progress', 'Total', 'Enriched', 'Failed', 'Started', 'Completed', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.job_id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: T.navy, textTransform: 'capitalize' }}>{j.provider}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={j.status} /></td>
                      <td style={{ padding: '10px 12px', minWidth: 120 }}>
                        <ProgressBar value={j.enriched_rows || 0} max={j.total_rows || 0} />
                      </td>
                      <td style={{ padding: '10px 12px', color: T.muted }}>{j.total_rows}</td>
                      <td style={{ padding: '10px 12px', color: T.success, fontWeight: 600 }}>{j.enriched_rows}</td>
                      <td style={{ padding: '10px 12px', color: j.failed_rows > 0 ? T.error : T.muted }}>{j.failed_rows}</td>
                      <td style={{ padding: '10px 12px', color: T.muted }}>
                        {j.started_at ? new Date(j.started_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: T.muted }}>
                        {j.completed_at ? new Date(j.completed_at).toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => navigate(`/entity-data?entity=${j.entity_name}`)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: T.teal, padding: '4px', opacity: 0.7, transition: 'opacity 0.2s', marginRight: 4
                          }}
                          title="View Entity Data"
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(j.job_id)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: T.error, padding: '4px', opacity: 0.7, transition: 'opacity 0.2s'
                          }}
                          title="Delete Job"
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </SectionCard>
  );

  /* ─────────────────────────────────────────────────── RENDER ── */
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: T.bg,
      color: T.text,
      fontFamily: "'Segoe UI', 'Poppins', sans-serif",
    }}>
      {/* ── keyframe injection ── */}
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeSlide {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .spin { animation: spin 1.2s linear infinite; }
      `}</style>

      {/* ── Header (Matches Main App Style) ── */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 60px',
        position: 'relative',
        zIndex: 50
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '12px 40px',
          boxShadow: '0 4px 20px rgba(0, 54, 74, 0.1)',
          width: '100%',
          maxWidth: '1600px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#00364A'
          }}>
            <div style={{ position: 'relative', width: '40px', height: '24px' }}>
              <Layers size={50} strokeWidth={2} style={{ position: 'absolute', top: -14, left: -5 }} />
              <Activity size={30} strokeWidth={2} style={{ position: 'absolute', top: -2, left: 6 }} />
            </div>
            SCOUT
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <Link to="/chatbot" style={{
              fontWeight: '500',
              color: '#00364A',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px'
            }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
              Chatbot
            </Link>
            <Link to="/leads" style={{
              fontWeight: '500',
              color: '#00364A',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px'
            }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
              Find Leads
            </Link>
            <Link to="/outreach" style={{
              fontWeight: '500',
              color: '#00364A',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px'
            }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
              Email Outreach
            </Link>
            <span style={{
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px',
              backgroundColor: '#00364A',
              color: 'white'
            }}>
              Enrichment
            </span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>John Doe</div>
              <div style={{ fontSize: '13px', color: '#49A3C4' }}>Premium Plan</div>
            </div>
            <div style={{
              width: '45px',
              height: '45px',
              backgroundColor: '#49A3C4',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '18px'
            }}>
              JD
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{
        maxWidth: '1450px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        {/* Page Hero */}
        <section style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          padding: '40px 50px',
          marginBottom: '30px',
          boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '18px',
              background: `linear-gradient(135deg, ${T.teal}, ${T.navyLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={32} color='#fff' />
            </div>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '36px', fontWeight: 800, color: T.navy }}>
                Data Enrichment Dashboard
              </h1>
              <p style={{ margin: 0, fontSize: '16px', color: T.muted, opacity: 0.9 }}>
                Enrich your entity records with verified emails & phone numbers via Apollo or Hunter
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/enrichment-jobs')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: `1.5px solid ${T.teal}`,
              background: 'rgba(73, 163, 196, 0.1)',
              color: T.navy,
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(73, 163, 196, 0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(73, 163, 196, 0.1)'; }}
          >
            <Clock size={16} color={T.teal} /> View All Scheduled Jobs
          </button>
        </section>

        <div style={{ display: 'grid', gap: '30px', gridTemplateColumns: '1fr', maxWidth: 900, margin: '0 auto' }}>

          {/* ── Step 1 – Entity ── */}
          <SectionCard>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, color: T.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color={T.teal} /> Step 1 — Select Entity
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: T.muted }}>
              Choose the database table whose records you want to enrich.
            </p>
            {entityDropdown}
          </SectionCard>

          {/* ── Step 2 – Provider (slides open when entity selected) ── */}
          {selectedEntity && (
            <SectionCard style={{ marginTop: 22, animation: 'fadeSlide 0.25s ease' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, color: T.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color={T.teal} /> Step 2 — Choose Enrichment Provider
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: T.muted }}>
                Select how you want to enrich <strong>{selectedEntity}</strong>.
              </p>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <ProviderButton
                  id="apollo"
                  label="Apollo.io"
                  icon={<Search size={18} />}
                  description="Full person enrichment — email, phone, title, LinkedIn & more. Best for comprehensive contact data."
                  selected={provider}
                  onSelect={setProvider}
                />
                <ProviderButton
                  id="hunter"
                  label="Hunter.io"
                  icon={<Mail size={18} />}
                  description="Professional email discovery. Requires first_name, last_name and domain in your entity."
                  selected={provider}
                  onSelect={setProvider}
                />
                <ProviderButton
                  id="website"
                  label="Website Parse"
                  icon={<Globe size={18} />}
                  description="Manually parse company websites to extract contact info. Requires a 'website' column in the entity."
                  selected={provider}
                  onSelect={setProvider}
                />
              </div>

              {/* provider == website → not-applicable or coming-soon notice */}
              {provider === 'website' && !hasWebsiteCol && (
                <div style={{
                  marginTop: 16, padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(224,52,52,0.08)',
                  border: '1.5px solid rgba(224,52,52,0.20)',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  fontSize: 13, color: T.error,
                  animation: 'fadeSlide 0.2s ease',
                }}>
                  <XCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>Not Applicable</strong>
                    The selected entity <code style={{
                      background: 'rgba(224,52,52,0.10)', padding: '1px 6px',
                      borderRadius: 4, fontFamily: 'monospace'
                    }}>{selectedEntity}</code> does not have a{' '}
                    <code style={{
                      background: 'rgba(224,52,52,0.10)', padding: '1px 6px',
                      borderRadius: 4, fontFamily: 'monospace'
                    }}>website</code>{' '}column.
                    Website parsing requires a <code style={{
                      background: 'rgba(224,52,52,0.10)', padding: '1px 6px',
                      borderRadius: 4, fontFamily: 'monospace'
                    }}>website</code> column containing company URLs. Please choose Apollo or Hunter instead.
                  </div>
                </div>
              )}

              {/* provider config */}
              {configPanel}

              {/* submit */}
              {((provider === 'apollo' || provider === 'hunter') || (provider === 'website' && hasWebsiteCol)) && (
                <div style={{ marginTop: 24 }}>
                  {submitMsg && (
                    <div style={{
                      padding: '11px 16px', borderRadius: 10, marginBottom: 14,
                      background: submitMsg.type === 'success' ? 'rgba(34,169,79,0.12)' : 'rgba(224,52,52,0.10)',
                      color: submitMsg.type === 'success' ? T.success : T.error,
                      fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      {submitMsg.type === 'success'
                        ? <CheckCircle2 size={15} />
                        : <XCircle size={15} />
                      }
                      {submitMsg.text}
                    </div>
                  )}

                  <button
                    id="start-enrichment-btn"
                    disabled={submitting}
                    onClick={handleSubmit}
                    style={{
                      padding: '13px 30px',
                      borderRadius: 12,
                      background: submitting
                        ? `rgba(73,163,196,0.4)`
                        : `linear-gradient(135deg, ${T.teal}, ${T.navyLight})`,
                      color: '#fff', border: 'none',
                      fontWeight: 700, fontSize: 15,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.22s',
                      boxShadow: submitting ? 'none' : '0 4px 18px rgba(73,163,196,0.35)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                  >
                    {submitting
                      ? <><Loader2 size={16} className="spin" /> Scheduling Job…</>
                      : <><Sparkles size={16} /> Start Enrichment Job</>
                    }
                  </button>
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Jobs table ── */}
          {jobsPanel}

        </div>
      </main>
    </div>
  );
}
