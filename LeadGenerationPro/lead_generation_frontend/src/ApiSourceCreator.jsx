import React, { useState, useEffect } from 'react';
import { Globe, Save, X, AlertTriangle, CheckCircle, Loader2, Plus, List, ArrowLeft, Trash2 } from 'lucide-react';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

// Styling Components
const StyledInput = (props) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '12px 16px',
      border: '2px solid rgba(0, 54, 74, 0.15)',
      borderRadius: '12px',
      fontSize: '15px',
      color: '#00364A',
      backgroundColor: '#ffffff',
      transition: 'all 0.3s',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      boxSizing: 'border-box',
      ...props.style
    }}
    onFocus={(e) => {
      e.target.style.borderColor = '#49A3C4';
      e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
    }}
    onBlur={(e) => {
      e.target.style.borderColor = 'rgba(0, 54, 74, 0.15)';
      e.target.style.boxShadow = 'none';
    }}
  />
);

const StyledSelect = (props) => (
  <select
    {...props}
    style={{
      width: '100%',
      padding: '12px 16px',
      border: '2px solid rgba(0, 54, 74, 0.15)',
      borderRadius: '12px',
      fontSize: '15px',
      color: '#00364A',
      backgroundColor: '#ffffff',
      transition: 'all 0.3s',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      cursor: 'pointer',
      boxSizing: 'border-box',
      ...props.style
    }}
    onFocus={(e) => {
      e.target.style.borderColor = '#49A3C4';
      e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
    }}
    onBlur={(e) => {
      e.target.style.borderColor = 'rgba(0, 54, 74, 0.15)';
      e.target.style.boxShadow = 'none';
    }}
  />
);

const ApiSourceCreator = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [entities, setEntities] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    entity_name: '',
    request_template: {
      method: 'GET',
      headers: {},
      params: {}, // Default Params
      body: null,
      timeout: 30
    },
    response_structure: {
      data_path: '',
      sample_response: {}
    },
    field_mappings: []
  });

  const [newMapping, setNewMapping] = useState({ api_field: '', db_field: '', transform: '' });
  const [newParam, setNewParam] = useState({ key: '', value: '' });

  // Fetch Entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE}/entity/entities`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await response.json();
        if (Array.isArray(data.entities)) {
          setEntities(data.entities.map(e => e.name || e));
        } else if (data.entities) {
          setEntities(Object.keys(data.entities));
        }
      } catch (err) {
        console.error('Failed to fetch entities:', err);
      }
    };
    fetchEntities();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  // --- Parameter Management (For General Sources) ---
  const addParam = () => {
    if (!newParam.key) return;
    setFormData(prev => ({
      ...prev,
      request_template: {
        ...prev.request_template,
        params: {
          ...prev.request_template.params,
          [newParam.key]: newParam.value
        }
      }
    }));
    setNewParam({ key: '', value: '' });
  };

  const removeParam = (key) => {
    const newParams = { ...formData.request_template.params };
    delete newParams[key];
    setFormData(prev => ({
      ...prev,
      request_template: {
        ...prev.request_template,
        params: newParams
      }
    }));
  };

  // --- Mapping Management ---
  const addFieldMapping = () => {
    if (!newMapping.api_field || !newMapping.db_field) {
      setError('API field and DB field are required for mapping');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setFormData(prev => ({
      ...prev,
      field_mappings: [...(prev.field_mappings || []), newMapping]
    }));
    setNewMapping({ api_field: '', db_field: '', transform: '' });
    setError(null);
  };

  const removeFieldMapping = (idx) => {
    setFormData(prev => ({
      ...prev,
      field_mappings: prev.field_mappings.filter((_, i) => i !== idx)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      api_url: '',
      api_key: '',
      entity_name: '',
      request_template: { method: 'GET', headers: {}, params: {}, body: null, timeout: 30 },
      response_structure: { data_path: '.', sample_response: {} },
      field_mappings: []
    });
    setNewMapping({ api_field: '', db_field: '', transform: '' });
    setNewParam({ key: '', value: '' });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.api_url || !formData.entity_name) {
      setError('Name, API URL, and entity name are required');
      return;
    }
    if (formData.field_mappings.length === 0) {
      setError('Please add at least one field mapping');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api-sources/`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to create API source');

      setSuccess('API source created successfully!');
      setTimeout(() => navigate('/api-sources'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: '1000px',
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
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#00364A', margin: 0 }}>Add New API Source</h1>
              <p style={{ fontSize: '16px', color: '#00364A', opacity: 0.7, margin: '5px 0 0 0' }}>Configure generic API endpoint</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button onClick={() => navigate('/api-sources')} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Cancel</button>
             <button onClick={resetForm} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Reset</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '50px' }}>
          {error && <div style={{ marginBottom: '20px', color: 'red', padding: '10px', backgroundColor: '#FEF2F2', borderRadius: '8px' }}>{error}</div>}
          {success && <div style={{ marginBottom: '20px', color: 'green', padding: '10px', backgroundColor: '#E0F2FE', borderRadius: '8px' }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Section 1: Basic Info */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '2px solid #49A3C4', paddingBottom: '10px' }}>Basic Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                <div>
                  <label style={{ fontWeight: '600' }}>API Source Name *</label>
                  <StyledInput value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., CoinGecko Generic" required />
                </div>
                <div>
                  <label style={{ fontWeight: '600' }}>Entity Name *</label>
                  <StyledSelect value={formData.entity_name} onChange={(e) => handleInputChange('entity_name', e.target.value)} required>
                    <option value="">-- Select --</option>
                    {entities.map((e, i) => <option key={i} value={e}>{e}</option>)}
                  </StyledSelect>
                </div>
                <div>
                  <label style={{ fontWeight: '600' }}>API Endpoint URL *</label>
                  <StyledInput type="url" value={formData.api_url} onChange={(e) => handleInputChange('api_url', e.target.value)} placeholder="https://api.example.com/data" required />
                </div>
              </div>
            </div>

            {/* Section 2: Request Config */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '2px solid #49A3C4', paddingBottom: '10px' }}>Request Configuration</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: '600' }}>Method</label>
                    <StyledSelect value={formData.request_template.method} onChange={(e) => handleNestedChange('request_template', 'method', e.target.value)}>
                      <option>GET</option><option>POST</option>
                    </StyledSelect>
                  </div>
                  <div>
                    <label style={{ fontWeight: '600' }}>API Key (Optional)</label>
                    <StyledInput type="password" value={formData.api_key} onChange={(e) => handleInputChange('api_key', e.target.value)} placeholder="API Key" />
                  </div>
                </div>

                {/* Default Params */}
                <div style={{ backgroundColor: '#F8FBFE', padding: '20px', borderRadius: '12px' }}>
                   <label style={{ fontWeight: '600', display: 'block', marginBottom: '10px' }}>Default Query Parameters (Optional)</label>
                   <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Parameters added here apply to ALL tasks using this source (e.g., format=json). Task-specific params (e.g., symbol=BTC) are added when scheduling the task.</p>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                      <StyledInput placeholder="Key (e.g. vs_currency)" value={newParam.key} onChange={e => setNewParam({...newParam, key: e.target.value})} />
                      <StyledInput placeholder="Value (e.g. usd)" value={newParam.value} onChange={e => setNewParam({...newParam, value: e.target.value})} />
                      <button type="button" onClick={addParam} style={{ background: '#49A3C4', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', cursor: 'pointer' }}><Plus size={18} /></button>
                   </div>

                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {Object.entries(formData.request_template.params).map(([key, val]) => (
                        <div key={key} style={{ background: 'white', border: '1px solid #ddd', borderRadius: '20px', padding: '5px 15px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span><strong>{key}:</strong> {val}</span>
                           <X size={14} style={{ cursor: 'pointer', color: 'red' }} onClick={() => removeParam(key)} />
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>

            {/* Section 3: Response Structure */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '2px solid #49A3C4', paddingBottom: '10px' }}>Response Structure</h2>
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontWeight: '600' }}>Data Path (JSONPath) *</label>
                <StyledInput value={formData.response_structure.data_path} onChange={(e) => handleNestedChange('response_structure', 'data_path', e.target.value)} placeholder="$.data or $.results" required />
              </div>
            </div>

            {/* Section 4: Mappings */}
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '2px solid #49A3C4', paddingBottom: '10px' }}>Field Mappings</h2>
              <div style={{ backgroundColor: '#F8FBFE', padding: '20px', borderRadius: '12px', marginTop: '20px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                    <StyledInput placeholder="API Field (e.g. current_price)" value={newMapping.api_field} onChange={e => setNewMapping({...newMapping, api_field: e.target.value})} />
                    <StyledInput placeholder="DB Column (e.g. price)" value={newMapping.db_field} onChange={e => setNewMapping({...newMapping, db_field: e.target.value})} />
                    <StyledInput placeholder="Transform (Optional)" value={newMapping.transform} onChange={e => setNewMapping({...newMapping, transform: e.target.value})} />
                 </div>
                 <button type="button" onClick={addFieldMapping} style={{ width: '100%', padding: '10px', background: '#49A3C4', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Add Mapping</button>

                 <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.field_mappings.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'white', border: '1px solid #eee', borderRadius: '8px' }}>
                        <span>{m.api_field} → {m.db_field}</span>
                        <Trash2 size={16} color="red" style={{ cursor: 'pointer' }} onClick={() => removeFieldMapping(i)} />
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ padding: '15px', background: loading ? '#ccc' : '#49A3C4', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
               {loading ? 'Creating...' : 'Create API Source'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiSourceCreator;