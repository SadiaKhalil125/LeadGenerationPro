import React, { useState } from "react";
import { Database, ExternalLink, Layers, Save, X, AlertTriangle, Lock, List, ArrowLeft, Shield } from "lucide-react";
import API_BASE from "./api_base";
import { useNavigate } from "react-router-dom";

export default function SourceCreator() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [paginationType, setPaginationType] = useState("");
  const [paginationConfig, setPaginationConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [isCaptchaProtected, setIsCaptchaProtected] = useState(false);
  const [isAuthProtected, setIsAuthProtected] = useState(false);
  const navigate = useNavigate();
  
  const [captchaParams, setCaptchaParams] = useState({
    api_key: "",
    site_url: "",
    captcha_type: "",
    site_key: ""
  });

  // NEW: Auth configuration state
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

  const paginationTypes = [
    "query_param",
    "offset",
    "path",
    "button_click",
    "scroll",
    "ajax_click",
  ];

  const handlePaginationChange = (field, value) => {
    setPaginationConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleCaptchaChange = (field, value) => {
    setCaptchaParams((prev) => ({ ...prev, [field]: value }));
  };

  // NEW: Handle auth config changes
  const handleAuthChange = (field, value) => {
    setAuthConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    // pagination (sent in body)
    const paginationPayload = paginationType
      ? { type: paginationType, ...paginationConfig }
      : null;

    // captcha params (sent in body)
    const captchaPayload = isCaptchaProtected ? captchaParams : null;

    // NEW: auth params (sent in body)
    const authPayload = isAuthProtected ? authConfig : null;

    // query params
    const targetUrl =
      `${API_BASE}/source/save-source?` +
      `name=${encodeURIComponent(name)}` +
      `&url=${encodeURIComponent(url)}` +
      `&is_captcha_protected=${isCaptchaProtected}` +
      `&is_auth_protected=${isAuthProtected}`;  // Add this

    // build final request body
    const body = {
      pagination_config: paginationPayload,
      captcha_params: captchaPayload,
      auth_config: authPayload  // NEW: Add auth config to body
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
      resetForm();
    } catch (err) {
      setResponse({ type: "error", message: "Failed to save source." });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setUrl("");
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
        maxWidth: '900px',
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
              <Database size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>Add New Source</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Define the source URL and configuration</p>
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
                {response.type === 'success' ? <Save size={20} /> : <AlertTriangle size={20} />}
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Source Name */}
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter source name"
                required
              />
            </div>

            {/* URL */}
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
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
            {/* Pagination Type */}
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

            {/* Dynamic Pagination Fields */}
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

                  {(paginationType === "button_click" ||
                    paginationType === "ajax_click") && (
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
                      onChange={(v) =>
                        handlePaginationChange("scroll_steps", Number(v))
                      }
                    />
                  )}
                </div>
              </div>
            )}

            {/* NEW: Authentication Checkbox */}
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

            {/* NEW: Authentication Configuration */}
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
                  {/* Login URL */}
                  <DynamicField
                    label="Login Page URL *"
                    placeholder="https://example.com/login"
                    onChange={(v) => handleAuthChange("login_url", v)}
                  />
                  
                  {/* Auth Type Selector */}
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

                  {/* Credentials */}
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

                  {/* Advanced Selectors - Only show for form auth */}
                  {authConfig.auth_type === "form" && (
                    <>
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
                    </>
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

            {/* CAPTCHA Params */}
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

            {/* Action Buttons */}
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
                disabled={loading || !name || !url || (isAuthProtected && (!authConfig.login_url || !authConfig.username || !authConfig.password))}
                style={{
                  padding: '16px 36px',
                  backgroundColor: '#00364A',
                  color: 'white',
                  border: '2px solid #00364A',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: loading || !name || !url || (isAuthProtected && (!authConfig.login_url || !authConfig.username || !authConfig.password)) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: loading || !name || !url || (isAuthProtected && (!authConfig.login_url || !authConfig.username || !authConfig.password)) ? 0.7 : 1,
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (!loading && name && url && (!isAuthProtected || (authConfig.login_url && authConfig.username && authConfig.password))) {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.color = '#00364A';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && name && url && (!isAuthProtected || (authConfig.login_url && authConfig.username && authConfig.password))) {
                    e.target.style.backgroundColor = '#00364A';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {loading ? (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                ) : (
                  <Save size={18} />
                )}
                Save Source
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ... keep all your existing StyledInput, StyledSelect, and DynamicField components exactly as they are ...

function StyledInput({ type = "text", value, onChange, placeholder, required }) {
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
        boxSizing: 'border-box'
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