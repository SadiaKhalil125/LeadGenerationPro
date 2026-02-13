import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Save, 
  X, 
  AlertTriangle, 
  Loader2, 
  Plus, 
  List, 
  ArrowLeft, 
  Settings, 
  Database, 
  Lock,
  ExternalLink,
  Layers,
  CheckCircle,
  Info,
  Shield
} from 'lucide-react';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

const SourceCreator = () => {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState('web'); // 'web' or 'api'
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  // Web Source State
  const [webName, setWebName] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [paginationType, setPaginationType] = useState("");
  const [paginationConfig, setPaginationConfig] = useState({});
  const [isCaptchaProtected, setIsCaptchaProtected] = useState(false);
  const [isAuthProtected, setIsAuthProtected] = useState(false);
  const [captchaParams, setCaptchaParams] = useState({
    api_key: "",
    site_url: "",
    captcha_type: "",
    site_key: ""
  });
  const [authConfig, setAuthConfig] = useState({
    login_url: "",
    username: "",
    password: "",
    auth_type: "form",
    username_selector: "",
    password_selector: "",
    submit_selector: "",
    success_indicator: ""
  });

  // API Source State
  const [entities, setEntities] = useState([]);
  const [apiFormData, setApiFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    api_key_name: 'Authorization',
    entity_name: '',
    request_template: {
      method: 'GET',
      headers: {},
      params: {}, 
      body: {},
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

  const paginationTypes = [
    "query_param",
    "offset",
    "path",
    "button_click",
    "scroll",
    "ajax_click",
  ];

  useEffect(() => {
    if (sourceType === 'api') {
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
    }
  }, [sourceType]);

  // Web Source Handlers
  const handlePaginationChange = (field, value) => {
    setPaginationConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleCaptchaChange = (field, value) => {
    setCaptchaParams((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthChange = (field, value) => {
    setAuthConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleWebSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    const paginationPayload = paginationType
      ? { type: paginationType, ...paginationConfig }
      : null;

    const captchaPayload = isCaptchaProtected ? captchaParams : null;
    const authPayload = isAuthProtected ? authConfig : null;

    const targetUrl =
      `${API_BASE}/source/save-source?` +
      `name=${encodeURIComponent(webName)}` +
      `&url=${encodeURIComponent(webUrl)}` +
      `&is_captcha_protected=${isCaptchaProtected}` +
      `&is_auth_protected=${isAuthProtected}`;

    const body = {
      pagination_config: paginationPayload,
      captcha_params: captchaPayload,
      auth_config: authPayload
    };

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResponse({ type: "success", message: data.message });
      resetWebForm();
    } catch (err) {
      setResponse({ type: "error", message: "Failed to save source." });
    } finally {
      setLoading(false);
    }
  };

  const resetWebForm = () => {
    setWebName("");
    setWebUrl("");
    setPaginationType("");
    setPaginationConfig({});
    setIsCaptchaProtected(false);
    setIsAuthProtected(false);
    setCaptchaParams({ api_key: "", site_url: "", captcha_type: "", site_key: "" });
    setAuthConfig({
      login_url: "",
      username: "",
      password: "",
      auth_type: "form",
      username_selector: "",
      password_selector: "",
      submit_selector: "",
      success_indicator: ""
    });
  };

  // API Source Handlers
  const handleEntityChange = (entityName) => {
    const selectedEntity = entities.find(e => e.name === entityName);
    setApiFormData(prev => ({
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

  const handleApiInputChange = (field, value) => {
    setApiFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setApiFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleMappingUpdate = (index, field, value) => {
    const updatedMappings = [...apiFormData.field_mappings];
    updatedMappings[index][field] = value;
    setApiFormData(prev => ({ ...prev, field_mappings: updatedMappings }));
  };

  const addHeader = () => {
    if (!newHeader.key) return;
    setApiFormData(prev => ({
      ...prev,
      request_template: { ...prev.request_template, headers: { ...prev.request_template.headers, [newHeader.key]: newHeader.value } }
    }));
    setNewHeader({ key: '', value: '' });
  };

  const removeHeader = (key) => {
    const newHeaders = { ...apiFormData.request_template.headers };
    delete newHeaders[key];
    setApiFormData(prev => ({ ...prev, request_template: { ...prev.request_template, headers: newHeaders } }));
  };

  const addParam = () => {
    if (!newParam.key) return;
    setApiFormData(prev => ({
      ...prev,
      request_template: { ...prev.request_template, params: { ...prev.request_template.params, [newParam.key]: newParam.value } }
    }));
    setNewParam({ key: '', value: '' });
  };

  const removeParam = (key) => {
    const newParams = { ...apiFormData.request_template.params };
    delete newParams[key];
    setApiFormData(prev => ({ ...prev, request_template: { ...prev.request_template, params: newParams } }));
  };

  const handleApiSubmit = async (e) => {
    e.preventDefault();
    const activeMappings = apiFormData.field_mappings.filter(m => m.api_field.trim() !== '');

    if (!apiFormData.name || !apiFormData.api_url || !apiFormData.entity_name) {
      setResponse({ type: 'error', message: 'Basic Info is required' });
      return;
    }
    if (activeMappings.length === 0) {
      setResponse({ type: 'error', message: 'Please map at least one attribute to an API field' });
      return;
    }

    try {
      setLoading(true);
      setResponse(null);
      const apiResponse = await fetch(`${API_BASE}/api-sources/`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ ...apiFormData, field_mappings: activeMappings })
      });
      const data = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(data.detail || 'Failed to create API source');

      setResponse({ type: 'success', message: 'API source created successfully!' });
      setTimeout(() => navigate('/sourcemanagement'), 1500);
    } catch (err) {
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetApiForm = () => {
    setApiFormData({
      name: '',
      api_url: '',
      api_key: '',
      api_key_name: 'Authorization',
      entity_name: '',
      request_template: {
        method: 'GET',
        headers: {},
        params: {}, 
        body: {},
        timeout: 30
      },
      response_structure: {
        data_path: '',
        sample_response: {}
      },
      field_mappings: [] 
    });
    setNewParam({ key: '', value: '' });
    setNewHeader({ key: '', value: '' });
  };

  const resetForm = () => {
    if (sourceType === 'web') {
      resetWebForm();
    } else {
      resetApiForm();
    }
    setResponse(null);
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
              {sourceType === 'web' ? <Database size={28} /> : <Globe size={28} />}
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>
                Add New {sourceType === 'web' ? 'Web' : 'API'} Source
              </h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>
                {sourceType === 'web' 
                  ? 'Define the source URL and configuration'
                  : 'Configure automated endpoints and attribute mappings'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#00364A',
                border: '2px solid rgba(0, 54, 74, 0.2)',
                borderRadius: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#00364A';
                e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(0, 54, 74, 0.2)';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <ArrowLeft size={15} />
            </button>
            <button
              onClick={() => navigate('/sourcemanagement')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#00364A',
                border: '2px solid rgba(0, 54, 74, 0.2)',
                borderRadius: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#00364A';
                e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(0, 54, 74, 0.2)';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <List size={15} />
              View All
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#00364A',
                border: '2px solid rgba(0, 54, 74, 0.2)',
                borderRadius: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#00364A';
                e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'rgba(0, 54, 74, 0.2)';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <X size={15} />
              Reset Form
            </button>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Source Type Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px',
            backgroundColor: '#F8FBFF',
            borderRadius: '15px',
            padding: '8px',
            width: 'fit-content',
            margin: '0 auto 40px auto',
            boxShadow: '0 2px 8px rgba(0, 54, 74, 0.08)'
          }}>
            <button
              onClick={() => {
                setSourceType('web');
                setResponse(null);
              }}
              style={{
                padding: '12px 30px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sourceType === 'web' ? '#00364A' : 'transparent',
                color: sourceType === 'web' ? 'white' : '#00364A',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Database size={18} />
              Web Scraping
            </button>
            <button
              onClick={() => {
                setSourceType('api');
                setResponse(null);
              }}
              style={{
                padding: '12px 30px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sourceType === 'api' ? '#00364A' : 'transparent',
                color: sourceType === 'api' ? 'white' : '#00364A',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Globe size={18} />
              API Integration
            </button>
          </div>

          {/* Response Messages */}
          {response && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              backgroundColor: response.type === 'success' ? '#E0F2FE' : '#FEF2F2',
              border: `2px solid ${response.type === 'success' ? '#49A3C4' : '#EF4444'}`,
              color: '#00364A'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: response.type === 'success' ? '#49A3C4' : '#EF4444'
              }}>
                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
              <span style={{ fontWeight: '500', flex: 1 }}>{response.message}</span>
              <button 
                onClick={() => setResponse(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#00364A',
                  opacity: 0.5
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Web Source Form */}
          {sourceType === 'web' ? (
            <form onSubmit={handleWebSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#00364A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Database size={18} color="#49A3C4" />
                  Source Name *
                </label>
                <StyledInput
                  type="text"
                  value={webName}
                  onChange={(e) => setWebName(e.target.value)}
                  placeholder="Enter source name"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#00364A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <ExternalLink size={18} color="#49A3C4" />
                  Source URL *
                </label>
                <StyledInput
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#00364A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Layers size={18} color="#49A3C4" />
                  Pagination Type
                </label>
                <StyledSelect
                  value={paginationType}
                  onChange={(e) => {
                    setPaginationType(e.target.value);
                    setPaginationConfig({});
                  }}
                >
                  <option value="">Select pagination type</option>
                  {paginationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </StyledSelect>
              </div>

              {paginationType && (
                <div style={{
                  backgroundColor: '#E0EFFF',
                  padding: '30px',
                  borderRadius: '20px',
                  border: '2px solid rgba(73, 163, 196, 0.3)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#00364A',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Layers size={20} color="#49A3C4" />
                    Pagination Configuration
                  </h3>
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {paginationType === "query_param" && (
                      <>
                        <DynamicField
                          label="Param Name"
                          placeholder="page"
                          onChange={(v) => handlePaginationChange("param_name", v)}
                        />
                        <DynamicField
                          label="Start Page"
                          placeholder="1"
                          type="number"
                          onChange={(v) => handlePaginationChange("start_page", Number(v))}
                        />
                      </>
                    )}

                    {paginationType === "offset" && (
                      <>
                        <DynamicField
                          label="Param Name"
                          placeholder="e.g. offset"
                          onChange={(v) => handlePaginationChange("param_name", v)}
                        />
                        <DynamicField
                          label="Start Page"
                          placeholder="1"
                          type="number"
                          onChange={(v) => handlePaginationChange("start_page", Number(v))}
                        />
                        <DynamicField
                          label="Page Size"
                          placeholder="10"
                          type="number"
                          onChange={(v) => handlePaginationChange("page_size", Number(v))}
                        />
                        <DynamicField
                          label="Max Pages"
                          placeholder="Optional"
                          type="number"
                          onChange={(v) => handlePaginationChange("max_pages", Number(v))}
                        />
                      </>
                    )}

                    {paginationType === "path" && (
                      <DynamicField
                        label="Path Pattern (to be appended to base URL)"
                        placeholder="e.g. /page/{page}"
                        onChange={(v) => handlePaginationChange("path_pattern", v)}
                      />
                    )}

                    {(paginationType === "button_click" || paginationType === "ajax_click") && (
                      <>
                        <DynamicField
                          label="Button Selector"
                          placeholder=".next-button"
                          onChange={(v) => handlePaginationChange("button_selector", v)}
                        />
                        <DynamicField
                          label="Wait Selector"
                          placeholder=".results-loaded"
                          onChange={(v) => handlePaginationChange("wait_selector", v)}
                        />
                      </>
                    )}

                    {paginationType === "scroll" && (
                      <DynamicField
                        label="Scroll Steps"
                        placeholder="5"
                        type="number"
                        onChange={(v) => handlePaginationChange("scroll_steps", Number(v))}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Authentication Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '20px',
                backgroundColor: 'white',
                border: '2px solid rgba(0, 54, 74, 0.1)',
                borderRadius: '15px'
              }}>
                <input
                  type="checkbox"
                  checked={isAuthProtected}
                  onChange={(e) => setIsAuthProtected(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: '#49A3C4',
                    cursor: 'pointer'
                  }}
                />
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#00364A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => setIsAuthProtected(!isAuthProtected)}>
                  <Shield size={18} color="#49A3C4" />
                  Requires Login / Authentication?
                </label>
              </div>

              {/* Authentication Configuration */}
              {isAuthProtected && (
                <div style={{
                  backgroundColor: '#E0EFFF',
                  padding: '30px',
                  borderRadius: '20px',
                  border: '2px solid rgba(73, 163, 196, 0.3)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#00364A',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Shield size={20} color="#49A3C4" />
                    Authentication Configuration
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <DynamicField
                      label="Login Page URL *"
                      placeholder="https://example.com/login"
                      onChange={(v) => handleAuthChange("login_url", v)}
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#00364A',
                        opacity: 0.8
                      }}>Authentication Type</label>
                      <StyledSelect
                        value={authConfig.auth_type}
                        onChange={(e) => handleAuthChange("auth_type", e.target.value)}
                        style={{ backgroundColor: 'white' }}
                      >
                        <option value="form">Form Login (Username/Password)</option>
                        <option value="basic">HTTP Basic Auth</option>
                      </StyledSelect>
                    </div>

                    <DynamicField
                      label="Username *"
                      placeholder="your_username"
                      onChange={(v) => handleAuthChange("username", v)}
                    />
                    
                    <DynamicField
                      label="Password *"
                      type="password"
                      placeholder="••••••••"
                      onChange={(v) => handleAuthChange("password", v)}
                    />

                    {authConfig.auth_type === "form" && (
                      <div style={{
                        marginTop: '10px',
                        padding: '15px',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: '12px'
                      }}>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#00364A',
                          marginBottom: '15px'
                        }}>
                          Advanced CSS Selectors (Optional - auto-detected if left empty)
                        </p>
                        
                        <DynamicField
                          label="Username Field Selector"
                          placeholder='input[name="username"]'
                          onChange={(v) => handleAuthChange("username_selector", v)}
                        />
                        
                        <DynamicField
                          label="Password Field Selector"
                          placeholder='input[type="password"]'
                          onChange={(v) => handleAuthChange("password_selector", v)}
                        />
                        
                        <DynamicField
                          label="Submit Button Selector"
                          placeholder='button[type="submit"]'
                          onChange={(v) => handleAuthChange("submit_selector", v)}
                        />
                        
                        <DynamicField
                          label="Success Indicator"
                          placeholder=".dashboard, .welcome-message"
                          onChange={(v) => handleAuthChange("success_indicator", v)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CAPTCHA Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '20px',
                backgroundColor: 'white',
                border: '2px solid rgba(0, 54, 74, 0.1)',
                borderRadius: '15px'
              }}>
                <input
                  type="checkbox"
                  checked={isCaptchaProtected}
                  onChange={(e) => setIsCaptchaProtected(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: '#49A3C4',
                    cursor: 'pointer'
                  }}
                />
                <label style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#00364A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={() => setIsCaptchaProtected(!isCaptchaProtected)}>
                  <Lock size={18} color="#49A3C4" />
                  Is Captcha Protected?
                </label>
              </div>

              {isCaptchaProtected && (
                <div style={{
                  backgroundColor: '#E0EFFF',
                  padding: '30px',
                  borderRadius: '20px',
                  border: '2px solid rgba(73, 163, 196, 0.3)'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#00364A',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Lock size={20} color="#49A3C4" />
                    Captcha Parameters
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <DynamicField
                      label="API Key"
                      placeholder="Your CapSolver API key"
                      onChange={(v) => handleCaptchaChange("api_key", v)}
                    />
                    <DynamicField
                      label="Site URL"
                      placeholder="URL where captcha appears"
                      onChange={(v) => handleCaptchaChange("site_url", v)}
                    />
                    <DynamicField
                      label="Site Key"
                      placeholder="Captcha site key"
                      onChange={(v) => handleCaptchaChange("site_key", v)}
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#00364A',
                        opacity: 0.8
                      }}>Captcha Type</label>
                      <StyledSelect
                        value={captchaParams.captcha_type}
                        onChange={(e) => handleCaptchaChange("captcha_type", e.target.value)}
                        style={{ backgroundColor: 'white' }}
                      >
                        <option value="">Select Captcha Type</option>
                        <option value="recaptcha_v2">reCAPTCHA v2</option>
                        <option value="recaptcha_v3">reCAPTCHA v3</option>
                        <option value="turnstile">Turnstile</option>
                        <option value="cloudflare_challenge">Cloudflare Challenge</option>
                        <option value="aws_waf">AWS WAF</option>
                      </StyledSelect>
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '15px',
                marginTop: '20px',
                paddingTop: '30px',
                borderTop: '1px solid rgba(0, 54, 74, 0.1)'
              }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '16px 36px',
                    backgroundColor: 'white',
                    color: '#00364A',
                    border: '2px solid #00364A',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white';
                  }}
                >
                  <X size={18} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || !webName || !webUrl || (isAuthProtected && (!authConfig.login_url || !authConfig.username || !authConfig.password))}
                  style={{
                    padding: '16px 36px',
                    backgroundColor: '#00364A',
                    color: 'white',
                    border: '2px solid #00364A',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: loading || !webName || !webUrl || (isAuthProtected && (!authConfig.login_url || !authConfig.username || !authConfig.password)) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    opacity: loading || !webName || !webUrl || (isAuthProtected && (!authConfig.login_url || !authConfig.username || !authConfig.password)) ? 0.7 : 1,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && webName && webUrl && (!isAuthProtected || (authConfig.login_url && authConfig.username && authConfig.password))) {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.color = '#00364A';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && webName && webUrl && (!isAuthProtected || (authConfig.login_url && authConfig.username && authConfig.password))) {
                      e.target.style.backgroundColor = '#00364A';
                      e.target.style.color = 'white';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {loading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Source
                </button>
              </div>
            </form>
          ) : (
            /* API Source Form */
            <form onSubmit={handleApiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              {/* Section 1: Target Entity */}
              <section>
                <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={20} /> 1. Target Database Entity
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Select Database Entity *</label>
                    <ApiStyledSelect value={apiFormData.entity_name} onChange={(e) => handleEntityChange(e.target.value)} required>
                      <option value="">-- Choose Entity --</option>
                      {entities.map((e, i) => <option key={i} value={e.name}>{e.name}</option>)}
                    </ApiStyledSelect>
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Source Display Name *</label>
                    <ApiStyledInput value={apiFormData.name} onChange={(e) => handleApiInputChange('name', e.target.value)} placeholder="e.g., GitHub Python Leads" required />
                  </div>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>API Endpoint URL *</label>
                  <ApiStyledInput type="url" value={apiFormData.api_url} onChange={(e) => handleApiInputChange('api_url', e.target.value)} placeholder="https://api.github.com/search/users" required />
                </div>
              </section>

              {/* Section 2: Request Config */}
              <section>
                <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={20} /> 2. Request Configuration
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>HTTP Method</label>
                      <ApiStyledSelect value={apiFormData.request_template.method} onChange={(e) => handleNestedChange('request_template', 'method', e.target.value)}>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </ApiStyledSelect>
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Request Timeout (sec)</label>
                      <ApiStyledInput type="number" value={apiFormData.request_template.timeout} onChange={(e) => handleNestedChange('request_template', 'timeout', e.target.value)} />
                    </div>
                </div>

                {apiFormData.request_template.method !== 'GET' && (
                  <div style={{ marginBottom: '25px' }}>
                     <label style={{ fontSize: '13px', fontWeight: '700', color: '#00364A', marginBottom: '8px', display: 'block' }}>Request JSON Body (Required for Apollo)</label>
                     <textarea 
                      style={{ width: '100%', height: '100px', borderRadius: '12px', border: '2px solid rgba(0, 54, 74, 0.15)', padding: '15px', fontFamily: 'monospace', color: '#00364A', outline: 'none' }}
                      placeholder='{ "key": "value" }'
                      onChange={(e) => {
                        try { handleNestedChange('request_template', 'body', JSON.parse(e.target.value)); }
                        catch(err) { /* silent fail on parsing during typing */ }
                      }}
                     />
                  </div>
                )}

                <div style={{ backgroundColor: '#F8FBFE', padding: '25px', borderRadius: '15px', marginBottom: '25px', border: '1px solid #49A3C4' }}>
                  <label style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><Lock size={18} color="#49A3C4" /> Authentication Configuration</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '5px', display: 'block' }}>Auth Header/Param Name</label>
                      <ApiStyledInput value={apiFormData.api_key_name} onChange={(e) => handleApiInputChange('api_key_name', e.target.value)} placeholder="e.g., x-api-key or Authorization" />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '5px', display: 'block' }}>API Key Value</label>
                      <ApiStyledInput type="password" value={apiFormData.api_key} onChange={(e) => handleApiInputChange('api_key', e.target.value)} placeholder="Enter API Key" />
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FBFE', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid rgba(0,54,74,0.05)' }}>
                   <label style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><Settings size={18} color="#49A3C4" /> Additional Static Headers</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                      <ApiStyledInput placeholder="Key" value={newHeader.key} onChange={e => setNewHeader({...newHeader, key: e.target.value})} />
                      <ApiStyledInput placeholder="Value" value={newHeader.value} onChange={e => setNewHeader({...newHeader, value: e.target.value})} />
                      <button type="button" onClick={addHeader} style={{ background: '#49A3C4', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', cursor: 'pointer' }}><Plus size={20} /></button>
                   </div>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                      {Object.entries(apiFormData.request_template.headers || {}).map(([k, v]) => (
                        <div key={k} style={{ background: 'white', padding: '6px 14px', borderRadius: '20px', border: '1px solid #ddd', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong>{k}:</strong> {v} <X size={14} style={{ cursor: 'pointer', color: '#EF4444' }} onClick={() => removeHeader(k)} />
                        </div>
                      ))}
                   </div>
                </div>

                <div style={{ backgroundColor: '#F8FBFE', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '1px solid rgba(0,54,74,0.05)' }}>
                   <label style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><Globe size={18} color="#49A3C4" /> Default Query Parameters</label>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                      <ApiStyledInput placeholder="Param Key" value={newParam.key} onChange={e => setNewParam({...newParam, key: e.target.value})} />
                      <ApiStyledInput placeholder="Value" value={newParam.value} onChange={e => setNewParam({...newParam, value: e.target.value})} />
                      <button type="button" onClick={addParam} style={{ background: '#49A3C4', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', cursor: 'pointer' }}><Plus size={20} /></button>
                   </div>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                      {Object.entries(apiFormData.request_template.params || {}).map(([k, v]) => (
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
                <ApiStyledInput value={apiFormData.response_structure.data_path} onChange={(e) => handleNestedChange('response_structure', 'data_path', e.target.value)} placeholder="e.g., $ or $.items" required />
              </section>

              {/* Section 4: Attribute Mapping */}
              <section>
                <h2 style={{ fontSize: '20px', fontWeight: '700', borderBottom: '3px solid #49A3C4', paddingBottom: '10px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <List size={20} /> 4. Field Mapping
                </h2>
                
                {apiFormData.field_mappings.length > 0 ? (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', padding: '0 10px', opacity: 0.6 }}>
                       <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Database Attribute</span>
                       <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>API JSON Field Name</span>
                       <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Transform</span>
                    </div>

                    {apiFormData.field_mappings.map((m, i) => (
                      <div key={m.db_field} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', background: '#F8FBFE', padding: '15px', borderRadius: '15px', border: '1px solid rgba(0,54,74,0.05)', alignItems: 'center' }}>
                        <div style={{ fontWeight: '700', color: '#00364A' }}>{m.db_field}</div>
                        <ApiStyledInput placeholder={`e.g., user.id`} value={m.api_field} onChange={(e) => handleMappingUpdate(i, 'api_field', e.target.value)} style={{ border: '1px solid #CBD5E1' }} />
                        <ApiStyledInput placeholder="Optional" value={m.transform} onChange={(mVal) => handleMappingUpdate(i, 'transform', mVal.target.value)} style={{ border: '1px solid #CBD5E1' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', opacity: 0.5 }}>Select an Entity to see attributes.</p>
                )}
              </section>

              <button type="submit" disabled={loading} style={{ 
                padding: '18px', background: '#00364A', color: 'white', border: 'none', borderRadius: '15px', 
                fontSize: '18px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' 
              }}>
                 {loading ? <Loader2 size={22} className="spin" /> : <Save size={22} />}
                 Save API Source
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// Helper Components
function StyledInput({ type = "text", value, onChange, placeholder, required, style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%',
        padding: '16px 24px',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        backgroundColor: 'rgba(73, 163, 196, 0.15)',
        color: '#00364A',
        outline: 'none',
        transition: 'all 0.3s',
        boxSizing: 'border-box',
        ...style
      }}
      onFocus={(e) => {
        e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.25)';
        e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.2)';
      }}
      onBlur={(e) => {
        e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.15)';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
}

function StyledSelect({ value, onChange, children, style }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        padding: '16px 24px',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        backgroundColor: 'rgba(73, 163, 196, 0.15)',
        color: '#00364A',
        outline: 'none',
        transition: 'all 0.3s',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300364A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 20px top 50%',
        backgroundSize: '12px auto',
        boxSizing: 'border-box',
        ...style
      }}
      onFocus={(e) => {
        e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.25)';
        e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.2)';
      }}
      onBlur={(e) => {
        e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.15)';
        e.target.style.boxShadow = 'none';
      }}
    >
      {children}
    </select>
  );
}

function DynamicField({ label, placeholder, type = "text", onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#00364A',
        opacity: 0.8
      }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '14px 20px',
          border: '1px solid transparent',
          borderRadius: '10px',
          fontSize: '15px',
          backgroundColor: 'white',
          color: '#00364A',
          outline: 'none',
          transition: 'all 0.3s',
          boxSizing: 'border-box'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#49A3C4';
          e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'transparent';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

// API Form styled components
const ApiStyledInput = (props) => (
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

const ApiStyledSelect = (props) => (
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

export default SourceCreator;