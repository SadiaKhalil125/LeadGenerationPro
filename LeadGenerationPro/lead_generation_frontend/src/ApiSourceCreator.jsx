import React, { useState, useEffect } from 'react';
import { Globe, Save, X, AlertTriangle, CheckCircle, Loader2, Plus, List, ArrowLeft, Trash2, Settings, Database, Info } from 'lucide-react';
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
      params: {}, // RESTORED: Query Params
      body: null,
      timeout: 30
    },
    response_structure: {
      data_path: '',
      sample_response: {}
    },
    field_mappings: [] 
  });

  const [newParam, setNewParam] = useState({ key: '', value: '' });
  const [newHeader, setNewHeader] = useState({ key: '', value: '' });

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE}/entity/entities`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await response.json();
        if (Array.isArray(data.entities)) {
          setEntities(data.entities);
        }
      } catch (err) {
        console.error('Failed to fetch entities:', err);
      }
    };
    fetchEntities();
  }, []);

  const handleEntityChange = (entityName) => {
    const selectedEntity = entities.find(e => e.name === entityName);
    setFormData(prev => ({
      ...prev,
      entity_name: entityName,
      field_mappings: selectedEntity 
        ? selectedEntity.columns
            .filter(col => !['id', 'source', 'modified_at', 'created_at'].includes(col))
            .map(col => ({
              api_field: '', 
              db_field: col, 
              transform: '' 
            }))
        : []
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleMappingUpdate = (index, field, value) => {
    const updatedMappings = [...formData.field_mappings];
    updatedMappings[index][field] = value;
    setFormData(prev => ({ ...prev, field_mappings: updatedMappings }));
  };

  // --- Header Management ---
  const addHeader = () => {
    if (!newHeader.key) return;
    setFormData(prev => ({
      ...prev,
      request_template: { ...prev.request_template, headers: { ...prev.request_template.headers, [newHeader.key]: newHeader.value } }
    }));
    setNewHeader({ key: '', value: '' });
  };

  const removeHeader = (key) => {
    const newHeaders = { ...formData.request_template.headers };
    delete newHeaders[key];
    setFormData(prev => ({ ...prev, request_template: { ...prev.request_template, headers: newHeaders } }));
  };

  // --- Parameter Management (RESTORED) ---
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeMappings = formData.field_mappings.filter(m => m.api_field.trim() !== '');

    if (!formData.name || !formData.api_url || !formData.entity_name) {
      setError('Basic Info is required');
      return;
    }
    if (activeMappings.length === 0) {
      setError('Please map at least one attribute to an API field');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api-sources/`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ ...formData, field_mappings: activeMappings })
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
    <div style={{ minHeight: '100vh', backgroundColor: '#C7D8ED', color: '#00364A', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'white', borderRadius: '25px', boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '40px 50px', borderBottom: '1px solid rgba(0, 54, 74, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: '#49A3C4', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Globe size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#00364A', margin: 0 }}>Add New API Source</h1>
              <p style={{ fontSize: '16px', color: '#00364A', opacity: 0.7, margin: '5px 0 0 0' }}>Configure automated endpoints and attribute mappings</p>
            </div>
          </div>
          <button onClick={() => navigate('/api-sources')} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid #ccc', background: 'white', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
        </div>

        <div style={{ padding: '50px' }}>
          {error && <div style={{ marginBottom: '20px', color: '#DC2626', padding: '15px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' }}>{error}</div>}
          {success && <div style={{ marginBottom: '20px', color: '#059669', padding: '15px', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #A7F3D0' }}>{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* Section 1: Basic Info */}
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={20} /> 1. Target Database Entity
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Select Database Entity *</label>
                  <StyledSelect value={formData.entity_name} onChange={(e) => handleEntityChange(e.target.value)} required>
                    <option value="">-- Choose Entity --</option>
                    {entities.map((e, i) => <option key={i} value={e.name}>{e.name}</option>)}
                  </StyledSelect>
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Source Display Name *</label>
                  <StyledInput value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., GitHub Python Leads" required />
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>API Endpoint URL *</label>
                <StyledInput type="url" value={formData.api_url} onChange={(e) => handleInputChange('api_url', e.target.value)} placeholder="https://api.github.com/search/users" required />
              </div>
            </section>

            {/* Section 2: Request Configuration */}
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px' }}>2. Request Configuration</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                  <div>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>HTTP Method</label>
                    <StyledSelect value={formData.request_template.method} onChange={(e) => handleNestedChange('request_template', 'method', e.target.value)}>
                      <option>GET</option><option>POST</option>
                    </StyledSelect>
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>API Key (if required)</label>
                    <StyledInput type="password" value={formData.api_key} onChange={(e) => handleInputChange('api_key', e.target.value)} placeholder="Key" />
                  </div>
              </div>

              {/* Headers UI */}
              <div style={{ backgroundColor: '#F8FBFE', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid rgba(0,54,74,0.05)' }}>
                 <label style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><Settings size={18} color="#49A3C4" /> Custom Headers (e.g., Accept, Version)</label>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                    <StyledInput placeholder="Key" value={newHeader.key} onChange={e => setNewHeader({...newHeader, key: e.target.value})} />
                    <StyledInput placeholder="Value" value={newHeader.value} onChange={e => setNewHeader({...newHeader, value: e.target.value})} />
                    <button type="button" onClick={addHeader} style={{ background: '#49A3C4', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', cursor: 'pointer' }}><Plus size={20} /></button>
                 </div>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                    {Object.entries(formData.request_template.headers || {}).map(([k, v]) => (
                      <div key={k} style={{ background: 'white', padding: '6px 14px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{k}:</strong> {v} <X size={14} style={{ cursor: 'pointer', color: '#EF4444' }} onClick={() => removeHeader(k)} />
                      </div>
                    ))}
                 </div>
              </div>

              {/* Query Params UI (RESTORED) */}
              <div style={{ backgroundColor: '#F8FBFE', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid rgba(0,54,74,0.05)' }}>
                 <label style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><Globe size={18} color="#49A3C4" /> Default Query Parameters (e.g., per_page=100)</label>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                    <StyledInput placeholder="Param Key" value={newParam.key} onChange={e => setNewParam({...newParam, key: e.target.value})} />
                    <StyledInput placeholder="Value" value={newParam.value} onChange={e => setNewParam({...newParam, value: e.target.value})} />
                    <button type="button" onClick={addParam} style={{ background: '#49A3C4', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', cursor: 'pointer' }}><Plus size={20} /></button>
                 </div>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                    {Object.entries(formData.request_template.params || {}).map(([k, v]) => (
                      <div key={k} style={{ background: 'white', padding: '6px 14px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{k}:</strong> {v} <X size={14} style={{ cursor: 'pointer', color: '#EF4444' }} onClick={() => removeParam(k)} />
                      </div>
                    ))}
                 </div>
              </div>
            </section>

            {/* Section 3: Response Structure */}
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px' }}>3. Data Handling</h2>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>JSONPath to Results Array *</label>
              <StyledInput value={formData.response_structure.data_path} onChange={(e) => handleNestedChange('response_structure', 'data_path', e.target.value)} placeholder="e.g., $ for root list, or $.items for nested list" required />
              <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#E0F2FE', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <Info size={18} color="#0369A1" />
                 <p style={{ fontSize: '13px', color: '#0369A1', margin: 0 }}>Use <b>$</b> if the API returns a list directly. Use <b>$.results</b> if it's nested.</p>
              </div>
            </section>

            {/* Section 4: Attribute Mapping (Auto-Attributes) */}
            <section>
              <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <List size={20} /> 4. Field Mapping
              </h2>
              
              {!formData.entity_name ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#F8FBFE', borderRadius: '15px', border: '2px dashed #CBD5E1' }}>
                  <Database size={32} color="#94A3B8" style={{ marginBottom: '10px' }} />
                  <p style={{ color: '#64748B' }}>Please select an <b>Entity</b> above to define mappings.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', padding: '0 10px', opacity: 0.6 }}>
                     <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Database Attribute</span>
                     <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>API JSON Field Name</span>
                     <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Transform (Optional)</span>
                  </div>

                  {formData.field_mappings.map((m, i) => (
                    <div key={m.db_field} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', background: '#F8FBFE', padding: '15px', borderRadius: '15px', border: '1px solid rgba(0,54,74,0.05)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#49A3C4' }}></div>
                        <span style={{ fontWeight: '700', color: '#00364A' }}>{m.db_field}</span>
                      </div>
                      <StyledInput 
                        placeholder={`Field name in API response`} 
                        value={m.api_field} 
                        onChange={(e) => handleMappingUpdate(i, 'api_field', e.target.value)} 
                        style={{ border: '1px solid #CBD5E1' }}
                      />
                      <StyledInput 
                        placeholder="e.g., lowercase" 
                        value={m.transform} 
                        onChange={(mVal) => handleMappingUpdate(i, 'transform', mVal.target.value)} 
                        style={{ border: '1px solid #CBD5E1' }}
                      />
                    </div>
                  ))}
                  <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginTop: '10px' }}>* Blank fields will be ignored.</p>
                </div>
              )}
            </section>

            <button type="submit" disabled={loading} style={{ 
              padding: '18px', 
              background: loading ? '#94A3B8' : '#00364A', 
              color: 'white', 
              border: 'none', 
              borderRadius: '15px', 
              fontSize: '18px', 
              fontWeight: '800', 
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
               {loading ? <Loader2 size={22} className="spin" /> : <Save size={22} />}
               {loading ? 'Saving Source...' : 'Save API Source'}
            </button>
          </form>
        </div>
      </div>
      <style>{`.spin { animation: rotate 1s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ApiSourceCreator;