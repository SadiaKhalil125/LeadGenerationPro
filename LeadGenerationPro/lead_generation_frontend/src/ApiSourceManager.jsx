import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Save,
  X,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Zap,
  Settings,
  Globe,
  Database,
  RefreshCw,
  List,
  Code,
  Lock,
  Info
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

const ApiSourceManager = () => {
  const [expandedSource, setExpandedSource] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [testingSource, setTestingSource] = useState(null);
  const [testResult, setTestResult] = useState(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch API sources
  const { data: sourcesData, isLoading: isLoadingSources, refetch } = useQuery({
    queryKey: ['api-sources'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api-sources/`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!response.ok) throw new Error('Failed to fetch API sources');
      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.sources)) return payload.sources;
      return [];
    },
  });

  const pageLoading = isLoadingSources && !sourcesData;
  const sources = Array.isArray(sourcesData) ? sourcesData : [];

  const handleExpand = (sourceId) => {
    setExpandedSource(expandedSource === sourceId ? null : sourceId);
  };

  const handleEdit = (source) => {
    setEditingSource(source);
    setExpandedSource(null);
  };

  const handleTestConnection = async (sourceId) => {
    try {
      setTestingSource(sourceId);
      setTestResult(null);
      const response = await fetch(`${API_BASE}/api-sources/${sourceId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }
      });
      const data = await response.json();
      setTestResult({
        sourceId: sourceId,
        success: data.success !== false && response.ok,
        message: data.message || data.error || 'Test completed',
        data: data.sample_item || data.data
      });
    } catch (err) {
      setTestResult({ sourceId: sourceId, success: false, message: 'Failed: ' + err.message });
    } finally {
      setTestingSource(null);
    }
  };

  const handleDelete = async (sourceId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api-sources/${sourceId}`, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete');
      }
      setSuccess('API source deleted successfully');
      setDeleteConfirm(null);
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEdit = () => {
    setEditingSource(null);
    setTestResult(null);
  };

  if (pageLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#C7D8ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <Loader2 size={40} className="spin" style={{ color: '#49A3C4' }} />
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading API Sources...</h1>
      </div>
    );
  }

  if (editingSource) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#C7D8ED', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <button onClick={handleCloseEdit} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#49A3C4', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', marginBottom: '24px' }}>
            <ArrowLeft size={20} /> Back to API Sources
          </button>
          <ApiSourceForm source={editingSource} onClose={handleCloseEdit} onSuccess={() => { refetch(); handleCloseEdit(); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#C7D8ED', color: '#00364A', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: '1200px', backgroundColor: 'white', borderRadius: '25px', boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '40px 50px', borderBottom: '1px solid rgba(0, 54, 74, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#49A3C4', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Globe size={28} /></div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>API Source Management</h1>
              <p style={{ fontSize: '16px', opacity: 0.7, margin: '5px 0 0 0' }}>Manage automated API endpoints</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <StyledButton onClick={() => navigate('/dashboard')} variant="outline" icon={<ArrowLeft size={18} />}>Dashboard</StyledButton>
            <StyledButton onClick={() => navigate('/api-source-creator')} variant="primary" icon={<Plus size={18} />}>New API Source</StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <StatCard title="Total API Sources" value={sources.length} color="#00364A" />
            <StatCard title="Active Integrations" value={sources.length} color="#49A3C4" />
          </div>

          {(error || success) && (
            <div style={{ marginBottom: '30px', padding: '20px 25px', borderRadius: '15px', backgroundColor: error ? '#FEF2F2' : '#E0F2FE', border: `2px solid ${error ? '#EF4444' : '#49A3C4'}`, color: '#00364A' }}>
              {error || success}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sources.map((source) => (
              <div key={source.id} style={{ backgroundColor: 'white', border: '2px solid rgba(0, 54, 74, 0.08)', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '25px 30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <button onClick={() => handleExpand(source.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#49A3C4', padding: '5px', display: 'flex', alignItems: 'center' }}>
                          {expandedSource === source.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{source.name}</h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', paddingLeft: '40px', marginTop: '10px' }}>
                        <InfoItem icon={<Globe size={14} />} label="Endpoint"><span style={{ wordBreak: 'break-all' }}>{source.api_url}</span></InfoItem>
                        <InfoItem icon={<Database size={14} />} label="Entity">{source.entity_name}</InfoItem>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                      <IconButton onClick={() => handleEdit(source)} icon={<Edit size={18} />} color="#49A3C4" title="Edit" />
                      <IconButton onClick={() => setDeleteConfirm(source.id)} icon={<Trash2 size={18} />} color="#EF4444" title="Delete" />
                    </div>
                  </div>

                  {expandedSource === source.id && (
                    <div style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid #eee' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                        {/* Left Column - Field Mappings */}
                        <div>
                          <SectionTitle icon={<List size={16} />} title={`Field Mappings (${source.field_mappings?.length || 0})`} />
                          <div style={{ 
                            padding: '15px', 
                            background: '#F8FBFE', 
                            borderRadius: '15px', 
                            border: '1px solid #E2E8F0',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {source.field_mappings && source.field_mappings.length > 0 ? (
                              source.field_mappings.map((m, i) => (
                                <div key={i} style={{ 
                                  fontSize: '13px', 
                                  marginBottom: '8px',
                                  padding: '8px',
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontWeight: '600', color: '#49A3C4' }}>{m.api_field}</span>
                                  <span style={{ color: '#00364A', opacity: 0.5 }}>→</span>
                                  <span style={{ color: '#00364A' }}>{m.db_field}</span>
                                  {m.transform && <span style={{ fontSize: '11px', color: '#059669', marginLeft: 'auto' }}>({m.transform})</span>}
                                </div>
                              ))
                            ) : (
                              <div style={{ textAlign: 'center', color: '#00364A', opacity: 0.5, padding: '10px' }}>No mappings configured</div>
                            )}
                          </div>
                        </div>

                        {/* Right Column - Request Configuration */}
                        <div>
                          <SectionTitle icon={<Settings size={16} />} title="Request Configuration" />
                          <div style={{ 
                            padding: '15px', 
                            background: '#F8FBFE', 
                            borderRadius: '15px', 
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <InfoItem icon={<Zap size={14}/>} label="Method">{source.request_template?.method || 'GET'}</InfoItem>
                            <InfoItem icon={<Code size={14}/>} label="Data Path">{source.data_extraction_path || '$'}</InfoItem>
                            {source.request_template?.timeout && (
                              <InfoItem icon={<Info size={14}/>} label="Timeout">{source.request_template.timeout}s</InfoItem>
                            )}
                            {source.api_key_name && (
                              <InfoItem icon={<Lock size={14}/>} label="Auth Header">{source.api_key_name}</InfoItem>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Test Connection Button */}
                      <StyledButton 
                        onClick={() => handleTestConnection(source.id)} 
                        disabled={testingSource === source.id} 
                        variant="outline" 
                        icon={testingSource === source.id ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
                      >
                        Test Connection
                      </StyledButton>

                      {/* Test Result */}
                      {testResult && testResult.sourceId === source.id && (
                        <div style={{ 
                          marginTop: '15px', 
                          padding: '15px', 
                          background: testResult.success ? '#E0F2FE' : '#FEF2F2', 
                          borderRadius: '12px', 
                          border: `1px solid ${testResult.success ? '#49A3C4' : '#EF4444'}` 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            {testResult.success ? <CheckCircle size={18} color="#49A3C4" /> : <AlertTriangle size={18} color="#EF4444" />}
                            <b>{testResult.message}</b>
                          </div>
                          {testResult.data && <CodeBlock data={testResult.data} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- DELETE CONFIRMATION MODAL --- */}
        {deleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 54, 74, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '40px', width: '90%', maxWidth: '500px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '20px', color: '#00364A' }}>Delete API Source?</h3>
              <p style={{ opacity: 0.8 }}>Are you sure you want to delete <b>"{sources.find(s => s.id === deleteConfirm)?.name}"</b>? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                <StyledButton onClick={() => handleDelete(deleteConfirm)} variant="danger" disabled={loading} style={{ flex: 1 }}>{loading ? 'Deleting...' : 'Confirm Delete'}</StyledButton>
                <StyledButton onClick={() => setDeleteConfirm(null)} variant="secondary" style={{ flex: 1 }}>Cancel</StyledButton>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`.spin { animation: rotate 1s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// --- FORM COMPONENT (FULL EDIT CAPABILITY) ---

const ApiSourceForm = ({ source, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);
  
  const [formData, setFormData] = useState({
    ...source,
    api_key: '', 
    api_key_name: source.api_key_name || 'Authorization',
    request_template: source.request_template || { method: 'GET', headers: {}, params: {}, body: {}, timeout: 30 }
  });
  
  const [newMapping, setNewMapping] = useState({ api_field: '', db_field: '', transform: '' });
  const [newParam, setNewParam] = useState({ key: '', value: '' });
  const [newHeader, setNewHeader] = useState({ key: '', value: '' });

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE}/entity/entities`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const data = await response.json();
        if (Array.isArray(data.entities)) setEntities(data.entities.map(e => e.name || e));
      } catch (err) { console.error(err); }
    };
    fetchEntities();
  }, []);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleNestedChange = (parent, field, value) => setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api-sources/${source.id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(formData)
      });
      if (response.ok) onSuccess();
      else alert("Update failed");
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
      <SectionTitle icon={<Edit size={16} />} title="Edit API Source" />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormGroup label="Source Name" value={formData.name} onChange={v => handleInputChange('name', v)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7 }}>Entity Name</label>
            <select value={formData.entity_name} onChange={e => handleInputChange('entity_name', e.target.value)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f4f8', border: 'none' }}>
              <option value="">Select Entity</option>
              {entities.map((e, i) => <option key={i} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <FormGroup label="API URL" value={formData.api_url} onChange={v => handleInputChange('api_url', v)} />

        {/* Method & Body */}
        <section style={{ padding: '20px', backgroundColor: '#F8FBFE', borderRadius: '15px', border: '1px solid #49A3C4' }}>
          <SectionTitle icon={<Settings size={16} />} title="Request Configuration" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 15 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>HTTP Method</label>
              <select 
                value={formData.request_template.method} 
                onChange={e => handleNestedChange('request_template', 'method', e.target.value)}
                style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #49A3C4', backgroundColor: 'white' }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <FormGroup label="Timeout (sec)" type="number" value={formData.request_template.timeout} onChange={v => handleNestedChange('request_template', 'timeout', v)} />
          </div>

          {formData.request_template.method !== 'GET' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Request Body (JSON)</label>
              <textarea 
                value={typeof formData.request_template.body === 'object' ? JSON.stringify(formData.request_template.body, null, 2) : formData.request_template.body}
                onChange={e => { try { handleNestedChange('request_template', 'body', JSON.parse(e.target.value)); } catch(err) { handleNestedChange('request_template', 'body', e.target.value); } }}
                style={{ height: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                placeholder='{ "key": "value" }'
              />
            </div>
          )}
        </section>
        
        {/* Auth Configuration */}
        <section style={{ padding: '20px', backgroundColor: '#F8FBFE', borderRadius: '15px', border: '1px solid #E2E8F0' }}>
          <SectionTitle icon={<Lock size={16} />} title="Authentication" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormGroup label="Auth Header Name" value={formData.api_key_name} onChange={v => handleInputChange('api_key_name', v)} />
            <FormGroup label="API Key" type="password" value={formData.api_key} onChange={v => handleInputChange('api_key', v)} placeholder="Keep blank to keep current" />
          </div>
        </section>

        {/* Mappings */}
        <section>
          <SectionTitle icon={<List size={16} />} title="Mappings" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
             <FormSubGroup label="API Field" value={newMapping.api_field} onChange={v => setNewMapping({...newMapping, api_field: v})} />
             <FormSubGroup label="DB Field" value={newMapping.db_field} onChange={v => setNewMapping({...newMapping, db_field: v})} />
             <FormSubGroup label="Transform" value={newMapping.transform} onChange={v => setNewMapping({...newMapping, transform: v})} />
             <StyledButton onClick={() => { setFormData(p => ({...p, field_mappings: [...p.field_mappings, newMapping]})); setNewMapping({api_field:'', db_field:'', transform:''}); }} variant="outline" icon={<Plus size={16}/>} />
          </div>
          <div style={{ marginTop: '10px' }}>
            {formData.field_mappings.map((m, i) => (
              <div key={i} style={{ fontSize: '13px', background: '#f8fbfe', padding: '8px', marginBottom: '5px', borderRadius: '8px', display:'flex', justifyContent:'space-between', alignItems: 'center' }}>
                <span>{m.api_field} → {m.db_field}</span>
                <button 
                  type="button"
                  onClick={() => setFormData(p => ({...p, field_mappings: p.field_mappings.filter((_, idx)=>idx!==i)}))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                  <Trash2 size={14} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: '15px' }}>
          <StyledButton type="submit" disabled={loading} variant="primary" icon={loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}>Update Source</StyledButton>
          <StyledButton type="button" onClick={onClose} variant="secondary">Cancel</StyledButton>
        </div>
      </form>
    </div>
  );
};

// --- HELPER UI ---

const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled, style, type = "button" }) => {
  const [hover, setHover] = useState(false);
  const styles = {
    primary: { bg: '#00364A', col: 'white', brd: '#00364A', hoverBg: '#004e66' },
    outline: { bg: 'white', col: '#00364A', brd: '#00364A', hoverBg: '#F8FBFF' },
    secondary: { bg: 'white', col: '#00364A', brd: 'rgba(0, 54, 74, 0.2)', hoverBg: '#F3F4F6' },
    danger: { bg: '#EF4444', col: 'white', brd: '#EF4444', hoverBg: '#DC2626' }
  };
  const cur = styles[variant];
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px', 
        padding: '10px 20px', 
        borderRadius: '12px', 
        fontWeight: '600', 
        fontSize: '14px', 
        cursor: disabled ? 'not-allowed' : 'pointer', 
        backgroundColor: hover && !disabled ? cur.hoverBg : cur.bg, 
        color: cur.col, 
        border: `2px solid ${cur.brd}`,
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s',
        ...style 
      }}
    >
      {icon} {children}
    </button>
  );
};

const FormGroup = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7 }}>{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder}
      style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f0f4f8', color: '#00364A', outline: 'none', fontSize: '14px' }} 
    />
  </div>
);

const FormSubGroup = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '11px', fontWeight: '700', opacity: 0.5 }}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }} />
  </div>
);

const StatCard = ({ title, value, color }) => (
  <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '25px', border: '2px solid rgba(0, 54, 74, 0.05)', textAlign: 'center' }}>
    <h4 style={{ fontSize: '13px', fontWeight: '600', opacity: 0.6, marginBottom: '5px' }}>{title}</h4>
    <p style={{ fontSize: '28px', fontWeight: '800', color: color, margin: 0 }}>{value}</p>
  </div>
);

const IconButton = ({ onClick, icon, color, title, disabled }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ 
        width: '40px', 
        minWidth: '40px',
        height: '40px', 
        borderRadius: '10px', 
        border: `1.5px solid ${color}`, 
        cursor: disabled ? 'not-allowed' : 'pointer', 
        backgroundColor: hover && !disabled ? `${color}15` : 'white', 
        color: color, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        transition: 'all 0.2s',
        padding: 0,
        flexShrink: 0
      }}
    >
      {icon}
    </button>
  );
};

const InfoItem = ({ icon, label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#00364A' }}>
    <span style={{ color: '#49A3C4', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
    <span style={{ fontWeight: '600', flexShrink: 0 }}>{label}:</span>
    <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#00364A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ color: '#49A3C4', display: 'flex', alignItems: 'center' }}>{icon}</span> {title}
  </h4>
);

const CodeBlock = ({ data }) => (
  <pre style={{ backgroundColor: '#F8FBFE', borderRadius: '12px', padding: '15px', fontSize: '12px', border: '1px solid #eee', overflow: 'auto', maxHeight: '200px', fontFamily: 'monospace', margin: 0 }}>
    {JSON.stringify(data, null, 2)}
  </pre>
);

export default ApiSourceManager;