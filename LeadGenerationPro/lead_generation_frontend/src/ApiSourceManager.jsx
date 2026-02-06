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
  Code
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
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        }
      });
      
      const data = await response.json();
      setTestResult({
        sourceId: sourceId,
        success: data.success !== false && response.ok,
        message: data.message || data.error || 'Test completed',
        data: data.sample_item || data.data
      });
    } catch (err) {
      setTestResult({
        sourceId: sourceId,
        success: false,
        message: 'Failed to test connection: ' + err.message
      });
    } finally {
      setTestingSource(null);
    }
  };

  const handleDelete = async (sourceId) => {
    if (!deleteConfirm) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api-sources/${sourceId}`, {
        method: "DELETE",
        headers: { "ngrok-skip-browser-warning": "true" }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete API source');
      }
      
      setSuccess('API source deleted successfully');
      setDeleteConfirm(null);
      refetch();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete API source: ' + err.message);
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
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#C7D8ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
           width: '40px',
           height: '40px',
           border: '4px solid #49A3C4',
           borderTop: '4px solid transparent',
           borderRadius: '50%',
           animation: 'spin 1s linear infinite'
        }} />
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading API Sources...</h1>
      </div>
    );
  }

  if (editingSource) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#C7D8ED',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        <div style={{ width: '100%', maxWidth: '1000px' }}>
          <button
            onClick={handleCloseEdit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#49A3C4',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '24px'
            }}
          >
            <ArrowLeft size={20} />
            Back to API Sources
          </button>
          <ApiSourceForm 
            source={editingSource} 
            onClose={handleCloseEdit} 
            onSuccess={() => {
              refetch();
              handleCloseEdit();
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '40px 50px',
          borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#49A3C4',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Globe size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>API Source Management</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Manage automated API endpoints and data structures</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <StyledButton onClick={()=>navigate('/dashboard')} variant="outline" icon={<ArrowLeft size={18} />}>
              Dashboard
            </StyledButton>
            <StyledButton onClick={() => refetch()} variant="outline" icon={<RefreshCw size={18} />}>
              Refresh
            </StyledButton>
            <StyledButton onClick={() => navigate('/api-source-creator')} variant="primary" icon={<Plus size={18} />}>
              New API Source
            </StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Stats Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <StatCard title="Total API Sources" value={sources.length} color="#00364A" />
            <StatCard title="Response Paths" value={sources.filter(s => s.response_structure?.data_path).length} color="#49A3C4" />
            <StatCard title="Active Integrations" value={sources.length} color="#00364A" />
          </div>

          {/* List */}
          {sources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
               <Globe size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
               <h3 style={{ fontSize: '20px', fontWeight: '700' }}>No API Sources Found</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sources.map((source) => (
                <div key={source.id} style={{
                  backgroundColor: 'white',
                  border: '2px solid rgba(0, 54, 74, 0.08)',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '25px 30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                          <button onClick={() => handleExpand(source.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            {expandedSource === source.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </button>
                          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{source.name}</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', paddingLeft: '40px' }}>
                           <InfoItem icon={<Zap size={14} />} label="Endpoint">{source.api_url}</InfoItem>
                           <InfoItem icon={<Database size={14} />} label="Entity">{source.entity_name}</InfoItem>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <IconButton onClick={() => handleEdit(source)} icon={<Edit size={16} />} color="#49A3C4" />
                        <IconButton onClick={() => setDeleteConfirm(source.id)} icon={<Trash2 size={16} />} color="#EF4444" />
                      </div>
                    </div>

                    {expandedSource === source.id && (
                      <div style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid #eee' }}>
                         <SectionTitle icon={<List />} title="Mappings" />
                         <CodeBlock data={source.field_mappings} />
                         <StyledButton 
                           onClick={() => handleTestConnection(source.id)} 
                           disabled={testingSource === source.id}
                           variant="outline"
                           style={{ marginTop: '15px' }}
                           icon={testingSource === source.id ? <Loader2 className="spin" /> : <RefreshCw />}
                         >Test Connection</StyledButton>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Form Components ---

const ApiSourceForm = ({ source, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [entities, setEntities] = useState([]);
  
  const [formData, setFormData] = useState({
    name: source.name || '',
    api_url: source.api_url || '', 
    entity_name: source.entity_name || '',
    request_template: source.request_template || { method: 'GET', headers: {}, params: {}, body: null, timeout: 30 },
    response_structure: source.response_structure || { data_path: '.', sample_response: {} },
    field_mappings: source.field_mappings || [],
    api_key: ''
  });
  
  const [newMapping, setNewMapping] = useState({ api_field: '', db_field: '', transform: '' });
  const [newParam, setNewParam] = useState({ key: '', value: '' });

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE}/entity/entities`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const data = await response.json();
        if (Array.isArray(data.entities)) setEntities(data.entities.map(e => e.name || e));
      } catch (err) { console.error('Failed to fetch entities:', err); }
    };
    fetchEntities();
  }, []);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleNestedChange = (parent, field, value) => setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

  // Params Logic
  const addParam = () => {
    if (!newParam.key) return;
    setFormData(prev => ({
      ...prev,
      request_template: { ...prev.request_template, params: { ...prev.request_template.params, [newParam.key]: newParam.value } }
    }));
    setNewParam({ key: '', value: '' });
  };

  const removeParam = (key) => {
    const newParams = { ...formData.request_template.params };
    delete newParams[key];
    setFormData(prev => ({ ...prev, request_template: { ...prev.request_template, params: newParams } }));
  };

  // Mappings Logic
  const addMapping = () => {
    if (!newMapping.api_field || !newMapping.db_field) return;
    setFormData(prev => ({ ...prev, field_mappings: [...prev.field_mappings, newMapping] }));
    setNewMapping({ api_field: '', db_field: '', transform: '' });
  };

  const removeMapping = (idx) => setFormData(prev => ({ ...prev, field_mappings: prev.field_mappings.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api-sources/${source.id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to update source');
      setSuccess('Update successful!');
      setTimeout(onSuccess, 1500);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
      <SectionTitle icon={<Edit />} title="Edit API Source" />
      
      {(error || success) && <div style={{ marginBottom: '20px', color: error ? 'red' : 'green' }}>{error || success}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* Basic Info */}
        <section>
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
        </section>

        {/* Config / Params section */}
        <section>
          <SectionTitle icon={<Settings />} title="Default Parameters (Config)" />
          <div style={{ padding: '20px', backgroundColor: '#f8fbfe', borderRadius: '15px', display: 'grid', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
               <FormSubGroup label="Key" value={newParam.key} onChange={v => setNewParam({...newParam, key: v})} />
               <FormSubGroup label="Value" value={newParam.value} onChange={v => setNewParam({...newParam, value: v})} />
               <StyledButton onClick={addParam} variant="outline" style={{ height: '40px', marginTop: '18px' }}><Plus size={16} /></StyledButton>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
               {Object.entries(formData.request_template.params).map(([k, v]) => (
                 <div key={k} style={{ background: 'white', padding: '5px 12px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <strong>{k}:</strong> {v} <X size={14} style={{ cursor: 'pointer', color: 'red' }} onClick={() => removeParam(k)} />
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Mappings section */}
        <section>
          <SectionTitle icon={<List />} title="Field Mappings" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {formData.field_mappings.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f8fbfe', borderRadius: '10px' }}>
                <span>{m.api_field} → {m.db_field}</span>
                <Trash2 size={16} color="red" onClick={() => removeMapping(i)} style={{ cursor: 'pointer' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
             <FormSubGroup label="API Field" value={newMapping.api_field} onChange={v => setNewMapping({...newMapping, api_field: v})} />
             <FormSubGroup label="DB Field" value={newMapping.db_field} onChange={v => setNewMapping({...newMapping, db_field: v})} />
             <FormSubGroup label="Transform" value={newMapping.transform} onChange={v => setNewMapping({...newMapping, transform: v})} />
             <StyledButton onClick={addMapping} variant="outline" style={{ height: '40px' }}><Plus size={16} /></StyledButton>
          </div>
        </section>

        <div style={{ display: 'flex', gap: '15px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <StyledButton type="submit" disabled={loading} variant="primary" icon={loading ? <Loader2 className="spin" /> : <Save />}>Save Updates</StyledButton>
          <StyledButton onClick={onClose} variant="secondary">Cancel</StyledButton>
        </div>
      </form>
    </div>
  );
};

// --- Helper UI Components ---
const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled, style, type = "button" }) => {
  const styles = {
    primary: { bg: '#00364A', color: 'white', border: '2px solid #00364A' },
    outline: { bg: 'white', color: '#00364A', border: '2px solid #00364A' },
    secondary: { bg: 'white', color: '#00364A', border: '2px solid rgba(0, 54, 74, 0.2)' },
    danger: { bg: '#EF4444', color: 'white', border: '2px solid #EF4444' }
  };
  const cur = styles[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', backgroundColor: cur.bg, color: cur.color, border: cur.border, ...style }}>
      {icon} {children}
    </button>
  );
};

const FormGroup = ({ label, value, onChange, type = "text" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7 }}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f0f4f8', color: '#00364A', outline: 'none', fontSize: '14px' }} />
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

const IconButton = ({ onClick, icon, color }) => (
  <button onClick={onClick} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {React.cloneElement(icon, { size: 16 })}
  </button>
);

const InfoItem = ({ icon, label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#00364A' }}>
    <span style={{ color: '#49A3C4' }}>{icon}</span>
    <span style={{ fontWeight: '600' }}>{label}:</span>
    <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#00364A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    {React.cloneElement(icon, { size: 14, color: '#49A3C4' })} {title}
  </h4>
);

const CodeBlock = ({ data }) => (
  <pre style={{ backgroundColor: '#F8FBFE', borderRadius: '12px', padding: '15px', fontSize: '12px', border: '1px solid #eee', overflow: 'auto', maxHeight: '200px', fontFamily: 'monospace' }}>
    {JSON.stringify(data, null, 2)}
  </pre>
);

export default ApiSourceManager;