import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaSpinner, FaUpload, FaEnvelope, FaEye, FaPaperPlane, FaCog, FaFileAlt, FaDatabase } from "react-icons/fa";
import { FiMail, FiUsers, FiSettings } from "react-icons/fi";
import { BsStars, BsFileText, BsPersonLinesFill, BsCloudDownload } from "react-icons/bs";
import { Layers, Activity } from "lucide-react";
import ProviderSelector from "./components/ProviderSelector";
import EmailPreview from "./components/EmailPreview";
import CampaignResults from "./components/CampaignResults";
import ContactsViewer from "./components/ContactsViewer";
import API_BASE from "./api_base";
import Header from "./components/Header";

const BASE = API_BASE + "/outreach";

// Style constants for consistency
const inputStyle = {
  width: '100%',
  padding: '14px 18px',
  backgroundColor: 'white',
  border: '1px solid #E0E7EC',
  borderRadius: '14px',
  fontSize: '14px',
  color: '#1E2A36',
  outline: 'none',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
};

const buttonStyle = {
  padding: '14px 28px',
  color: 'white',
  border: 'none',
  borderRadius: '14px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)'
};

export default function Outreach() {
  const [contacts, setContacts] = useState([]);
  const [provider, setProvider] = useState("sendgrid");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [results, setResults] = useState(null);
  const [action, setAction] = useState(null);
  const [config, setConfig] = useState({
    api_key: "",
    from_email: "",
    from_name: "",
    smtp_username: "",
    smtp_password: ""
  });

  const [showContacts, setShowContacts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [campaignDetails, setCampaignDetails] = useState({
    productService: "",
    targetAudience: "",
    goal: ""
  });
  const [enriching, setEnriching] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);

  // New state for source selection
  const [sources, setSources] = useState([]);
  // Change state to store source name instead of ID
  const [selectedSourceName, setSelectedSourceName] = useState("");
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [contactSource, setContactSource] = useState("csv"); // "csv" or "source"
  const [useExistingConfig, setUseExistingConfig] = useState(false);

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  // In Outreach component, add this with other useEffects:

  // Check for pending contacts from Quick Extract
  useEffect(() => {
    const pendingData = localStorage.getItem('outreach_pending_contacts');

    if (pendingData) {
      try {
        const { contacts, timestamp, source } = JSON.parse(pendingData);

        // Optional: Check if data is fresh (within last 5 minutes)
        const isFresh = (Date.now() - timestamp) < 5 * 60 * 1000;

        if (contacts && contacts.length > 0 && isFresh) {
          setContacts(contacts);
          addNotification('success', `✅ Loaded ${contacts.length} contacts from ${source || 'Quick Extract'}`);

          // Clear localStorage after loading
          localStorage.removeItem('outreach_pending_contacts');
        } else if (!isFresh) {
          // Clear stale data
          localStorage.removeItem('outreach_pending_contacts');
        }
      } catch (err) {
        console.error("Error loading pending contacts:", err);
        localStorage.removeItem('outreach_pending_contacts');
      }
    }
  }, []); // Empty dependency array - runs once on mount
  // Fetch sources on component mount
  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const response = await fetch(`${API_BASE}/source/scraped-sources`);
      const data = await response.json();

      if (response.ok && data.sources) {
        setSources(data.sources);
      } else {
        console.error("Failed to fetch sources");
      }
    } catch (err) {
      console.error("Error fetching sources:", err);
      addNotification('error', "Failed to load sources");
    } finally {
      setLoadingSources(false);
    }
  };

  // Modified fetchLeadsFromSource function to use source name
  const fetchLeadsFromSource = async () => {
    if (!selectedSourceName) {
      addNotification('error', "Please select a source");
      return;
    }

    setLoadingLeads(true);
    try {
      // Use source name in the URL instead of ID
      const response = await fetch(`${API_BASE}/leads/by-source/${encodeURIComponent(selectedSourceName)}`);
      const data = await response.json();

      if (response.ok && data.leads) {
        // Transform leads to contacts format
        const transformedContacts = data.leads.map(lead => ({
          name: lead.name || "",
          email: lead.email || "",
          company: lead.company_name || lead.name || "",
          company_website: lead.website || "",
          industry: lead.category || "",
          phone: lead.phone || "",
          address: lead.address || "",
          source_name: data.source_name,
          source_id: data.source_id
        }));

        setContacts(transformedContacts);
        addNotification('success', `✅ Loaded ${transformedContacts.length} leads from "${data.source_name}"`);
      } else {
        throw new Error(data.detail || "Failed to load leads");
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
      addNotification('error', "Failed to load leads from source: " + err.message);
    } finally {
      setLoadingLeads(false);
    }
  };

  const CSVUploader = ({ setContacts }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${BASE}/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Upload failed');
        }

        setContacts(data.contacts);
        setRemovedCount(data.removed_count || 0);

        let successMsg = `✅ Successfully loaded ${data.count} contacts`;
        if (data.removed_count > 0) {
          successMsg += `Can't outreach to ${data.removed_count} contacts due to unavailability of contact info.`;
        }
        addNotification('success', successMsg);
      } catch (err) {
        console.error('Upload error:', err);
        setError(err.message);
        addNotification('error', '❌ Failed to upload CSV: ' + err.message);
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    };

    return (
      <div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ display: 'none' }}
          id="csv-file-input"
        />
        <label
          htmlFor="csv-file-input"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            backgroundColor: uploading ? '#ccc' : '#49A3C4',
            color: 'white',
            borderRadius: '8px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {uploading ? (
            <>
              <FaSpinner className="spin" />
              Uploading...
            </>
          ) : (
            <>
              <FaUpload />
              Choose CSV File
            </>
          )}
        </label>
        {error && (
          <div style={{ color: '#ef4444', marginTop: '8px', fontSize: '13px' }}>
            {error}
          </div>
        )}
      </div>
    );
  };

  // Modified SourceSelector component (now using source name)
  const SourceSelector = ({ sources, selectedSourceName, onSourceChange, onLoadLeads, loadingLeads, loadingSources }) => {
    return (
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#5A6F7D'
          }}>
            <FaDatabase size={14} />
            Select Source
          </label>
          <select
            value={selectedSourceName}
            onChange={(e) => onSourceChange(e.target.value)}
            disabled={loadingSources || sources.length === 0}
            style={{
              ...inputStyle,
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Select a source --</option>
            {sources.map(source => (
              <option key={source.id} value={source.name}>
                {source.name}
              </option>
            ))}
          </select>
          {sources.length === 0 && !loadingSources && (
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '5px' }}>
              No sources available. Please create a source first in the Leads section.
            </p>
          )}
        </div>

        <button
          onClick={onLoadLeads}
          disabled={!selectedSourceName || loadingLeads}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: (!selectedSourceName || loadingLeads) ? '#ccc' : '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: (!selectedSourceName || loadingLeads) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s'
          }}
        >
          {loadingLeads ? (
            <>
              <FaSpinner className="spin" />
              Loading Leads...
            </>
          ) : (
            <>
              <BsCloudDownload />
              Load Leads from Source
            </>
          )}
        </button>
      </div>
    );
  };

  const ContactsStatus = ({ contacts, removedCount, onViewContacts, onEnrich, enriching }) => {
    if (!contacts.length) return null;

    return (
      <div style={{
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#10B98110',
        border: '1px solid #10B981',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#10B98120',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            fontSize: '16px'
          }}>
            ✓
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#00364A' }}>
              {contacts.length} Contact{contacts.length !== 1 ? 's' : ''} Loaded
            </div>
            <div style={{ fontSize: '12px', color: '#00364A', opacity: 0.6 }}>
              {removedCount > 0 && <span style={{ color: '#EF4444', fontWeight: '600' }}>({removedCount} skipped) </span>}
              {contacts[0]?.source_name && `Source: ${contacts[0].source_name}`}
              {!contacts[0]?.source_name && 'Ready for campaign'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onEnrich}
            disabled={enriching}
            style={{
              padding: '8px 16px',
              backgroundColor: enriching ? '#ccc' : '#54b0d2',
              border: '1px solid #49A3C4',
              borderRadius: '6px',
              color: 'white',
              fontWeight: '500',
              fontSize: '13px',
              cursor: enriching ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {enriching ? <FaSpinner className="spin" /> : <BsStars />}
            {enriching ? 'Enriching...' : 'Enrich'}
          </button>

          <button
            onClick={onViewContacts}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '1px solid #10B981',
              borderRadius: '6px',
              color: '#10B981',
              fontWeight: '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <BsPersonLinesFill size={14} />
            View
          </button>
        </div>
      </div>
    );
  };

  const NotificationPanel = ({ notifications, onRemove }) => {
    if (!notifications.length) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '100px',
        right: '20px',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '350px'
      }}>
        {notifications.map(notif => (
          <div
            key={notif.id}
            style={{
              backgroundColor: notif.type === 'success' ? '#10B981' : '#EF4444',
              color: 'white',
              padding: '15px 20px',
              borderRadius: '10px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'slideIn 0.3s ease'
            }}
          >
            <span>{notif.message}</span>
            <button
              onClick={() => onRemove(notif.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                opacity: 0.8,
                marginLeft: '10px'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const enrichContacts = async () => {
    if (!contacts.length) {
      addNotification('error', "No contacts to enrich");
      return;
    }

    try {
      setEnriching(true);
      const response = await fetch(`${BASE}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Enrichment failed');
      }

      setContacts(data.contacts);
      addNotification('success', `✅ ${data.enriched_count} contacts enriched successfully`);
    } catch (err) {
      console.error(err);
      addNotification('error', "Enrichment failed: " + err.message);
    } finally {
      setEnriching(false);
    }
  };

  const generatePreview = async () => {
    if (!contacts.length) {
      addNotification('error', "Please upload contacts or load leads from a source first");
      return;
    }
    if (!message) {
      addNotification('error', "Please enter an email message");
      return;
    }

    try {
      setAction("preview");
      const res = await fetch(`${BASE}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: message, contact: contacts[0] }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Preview failed');
      }

      setPreview(data.preview);
      addNotification('success', "Preview generated successfully");
    } catch (err) {
      console.error(err);
      addNotification('error', "Preview failed: " + err.message);
    } finally {
      setAction(null);
    }
  };

  const generateAIEmail = async () => {
    try {
      setAction("ai");
      const prompt = `Write a professional cold outreach email for:
        Product/Service: ${campaignDetails.productService}
        Target Audience: ${campaignDetails.targetAudience}
        Goal: ${campaignDetails.goal}
        
        The email should be personalized and include placeholders like {{name}}, {{company}} where appropriate. Keep it concise and engaging.`;

      const res = await fetch(`${BASE}/generate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setMessage(data.generated);
      addNotification('success', "AI-generated email created based on your campaign settings");
    } catch (err) {
      console.error(err);
      addNotification('error', "AI generation failed");
    } finally {
      setAction(null);
    }
  };

  const sendCampaign = async () => {
    if (!contacts.length) {
      addNotification('error', "Please upload contacts or load leads from a source first");
      return;
    }
    if (!subject) {
      addNotification('error', "Please enter an email subject");
      return;
    }
    if (!message) {
      addNotification('error', "Please enter an email message");
      return;
    }

    try {
      setAction("send");
      const requestBody = { provider, subject, message, contacts };
      const res = await fetch(`${BASE}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Campaign failed to send');
      }

      setResults(data);
      addNotification('success', `✅ Campaign completed: ${data.success} emails sent successfully`);
    } catch (err) {
      console.error(err);
      addNotification('error', "Campaign failed: " + err.message);
    } finally {
      setAction(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px'
    }}>
      <NotificationPanel notifications={notifications} onRemove={removeNotification} />

      {showContacts && contacts.length > 0 && (
        <ContactsViewer
          contacts={contacts}
          onClose={() => setShowContacts(false)}
          onUpdateContacts={setContacts}
        />
      )}

      {showContacts && (
        <div
          onClick={() => setShowContacts(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        input:hover, textarea:hover {
          border-color: #49A3C4 !important;
        }
        input:focus, textarea:focus {
          border-color: #49A3C4 !important;
          box-shadow: 0 0 0 3px rgba(73, 163, 196, 0.1) !important;
        }
      `}</style>

      <Header activeTab="outreach" />

      {/* Main Content */}
      <main style={{
        maxWidth: '1450px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        {/* Hero Section */}
        <section style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          padding: '50px',
          marginBottom: '40px',
          boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{
                fontSize: '48px',
                fontWeight: '800',
                lineHeight: '1.2',
                marginBottom: '20px',
                color: '#00364A'
              }}>
                Launch Your Email Campaign
              </h1>
              <p style={{
                fontSize: '18px',
                lineHeight: '1.6',
                color: '#00364A',
                opacity: 0.8,
                marginBottom: '30px'
              }}>
                Reach your prospects with personalized emails at scale.
                Our AI-powered outreach tool helps you craft and send engaging campaigns effortlessly.
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                gap: '30px',
                marginTop: '40px'
              }}>
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#49A3C4',
                    marginBottom: '5px'
                  }}>95%</div>
                  <div style={{ color: '#00364A', opacity: 0.7 }}>Delivery Rate</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#49A3C4',
                    marginBottom: '5px'
                  }}>45%</div>
                  <div style={{ color: '#00364A', opacity: 0.7 }}>Avg. Open Rate</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#49A3C4',
                    marginBottom: '5px'
                  }}>10k+</div>
                  <div style={{ color: '#00364A', opacity: 0.7 }}>Emails/Day</div>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              padding: '40px',
              border: '2px solid rgba(73, 163, 196, 0.2)',
              boxShadow: '0 10px 30px rgba(0, 54, 74, 0.08)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '30px',
                color: '#00364A',
                textAlign: 'center'
              }}>
                Campaign Overview
              </h2>

              <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                <button
                  onClick={() => document.getElementById('csv-file-input')?.click()}
                  style={{
                    padding: '15px 30px',
                    backgroundColor: '#49A3C4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 6px rgba(73, 163, 196, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3d8ba8';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 12px rgba(73, 163, 196, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#49A3C4';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px rgba(73, 163, 196, 0.2)';
                  }}
                >
                  <FaUpload />
                  Upload CSV File
                </button>
                <p style={{
                  fontSize: '13px',
                  color: '#00364A',
                  opacity: 0.6,
                  marginTop: '8px'
                }}>
                  Start by uploading your contacts
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(0, 54, 74, 0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <span style={{ fontWeight: '600', color: '#00364A' }}>Contacts Loaded</span>
                  <span style={{ color: '#49A3C4', fontWeight: '600', fontSize: '18px' }}>
                    {contacts.length}
                  </span>
                </div>

                {contacts.length > 0 && (
                  <button
                    onClick={() => setShowContacts(true)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#49A3C4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '15px',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#3d8ba8';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#49A3C4';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <BsPersonLinesFill />
                    View {contacts.length} Contact{contacts.length !== 1 ? 's' : ''}
                  </button>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', color: '#00364A', opacity: 0.7 }}>Campaign Progress</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#49A3C4' }}>
                      {subject && message ? 'Ready' : 'Incomplete'}
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    backgroundColor: '#E0EFFF',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${[
                        contacts.length ? 33 : 0,
                        subject ? 33 : 0,
                        message ? 34 : 0
                      ].reduce((a, b) => a + b, 0)}%`,
                      height: '100%',
                      backgroundColor: '#49A3C4',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Campaign Builder Section - REFINED */}
        <section style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          padding: '40px',
          boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
          marginBottom: '40px'
        }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #EFF3F6'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(135deg, #49A3C4 0%, #7DBBE0 100%)',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 15px rgba(73, 163, 196, 0.2)'
            }}>
              <FaCog size={24} color="white" />
            </div>
            <div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#00364A',
                marginBottom: '5px',
                letterSpacing: '-0.5px'
              }}>
                Compose Your Campaign
              </h2>
              <p style={{ color: '#5A6F7D', fontSize: '15px' }}>
                Configure your settings, craft your message, and launch with confidence
              </p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '30px'
          }}>
            {/* LEFT COLUMN - Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {/* Contacts Card - Updated with source selection */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '20px',
                padding: '25px',
                border: '1px solid #E9EDF2',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FiUsers size={20} color="#49A3C4" />
                  Contacts
                </h3>

                {/* Source selection tabs */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginBottom: '20px',
                  borderBottom: '2px solid #E9EDF2',
                  paddingBottom: '10px'
                }}>
                  <button
                    onClick={() => setContactSource("csv")}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: contactSource === "csv" ? '#49A3C4' : 'transparent',
                      color: contactSource === "csv" ? 'white' : '#5A6F7D',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaUpload style={{ marginRight: '8px' }} />
                    From CSV
                  </button>
                  <button
                    onClick={() => setContactSource("source")}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: contactSource === "source" ? '#49A3C4' : 'transparent',
                      color: contactSource === "source" ? 'white' : '#5A6F7D',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FaDatabase style={{ marginRight: '8px' }} />
                    From Scraped Source
                  </button>
                </div>

                {contactSource === "csv" ? (
                  <div>
                    <CSVUploader setContacts={setContacts} />
                    <p style={{
                      fontSize: '12px',
                      color: '#5A6F7D',
                      marginTop: '10px',
                      textAlign: 'center'
                    }}>
                      CSV should contain columns: name, email, company (optional)
                    </p>
                  </div>
                ) : (
                  <SourceSelector
                    sources={sources}
                    selectedSourceName={selectedSourceName}  // Changed prop name
                    onSourceChange={setSelectedSourceName}   // Changed to use name setter
                    onLoadLeads={fetchLeadsFromSource}
                    loadingLeads={loadingLeads}
                    loadingSources={loadingSources}
                  />
                )}

                <ContactsStatus
                  contacts={contacts}
                  onViewContacts={() => setShowContacts(true)}
                  onEnrich={enrichContacts}
                  enriching={enriching}
                />
              </div>


              {/* Provider Card */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '20px',
                padding: '25px',
                border: '1px solid #E9EDF2',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FiMail size={20} color="#49A3C4" />
                  Email Provider
                </h3>
                <ProviderSelector value={provider} onChange={setProvider} />

                {/* Use Existing Config Toggle */}
                <div style={{
                  marginTop: '20px',
                  marginBottom: '15px',
                  padding: '12px 16px',
                  backgroundColor: useExistingConfig ? '#E8F5E9' : '#F5F5F5',
                  borderRadius: '12px',
                  border: useExistingConfig ? '1px solid #4CAF50' : '1px solid #E0E0E0',
                  transition: 'all 0.2s ease'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={useExistingConfig}
                      onChange={(e) => setUseExistingConfig(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#49A3C4'
                      }}
                    />
                    <span style={{
                      fontWeight: '600',
                      color: useExistingConfig ? '#2E7D32' : '#00364A',
                      fontSize: '14px'
                    }}>
                      Use Existing Config
                    </span>
                    {useExistingConfig && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '12px',
                        color: '#4CAF50',
                        backgroundColor: '#E8F5E9',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        ✓ Active
                      </span>
                    )}
                  </label>
                  {useExistingConfig && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      backgroundColor: '#E8F5E9',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#2E7D32',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      Applied provider configurations from user settings
                    </div>
                  )}
                </div>

                {!useExistingConfig && provider === "sendgrid" && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #E9EDF2'
                    }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#00364A',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiSettings size={16} color="#7DBBE0" />
                        SendGrid Settings
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                          type="password"
                          placeholder="API Key"
                          value={config.api_key}
                          onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                          autoComplete="new-password"
                          style={inputStyle}
                        />
                        <input
                          type="email"
                          placeholder="From Email"
                          value={config.from_email}
                          onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          placeholder="Your Name (for signature)"
                          value={config.from_name}
                          onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!useExistingConfig && provider === "smtp" && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '1px solid #E9EDF2'
                    }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#00364A',
                        marginBottom: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FiSettings size={16} color="#7DBBE0" />
                        SMTP Settings
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                          type="email"
                          placeholder="Username / Email"
                          value={config.smtp_username}
                          onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
                          autoComplete="new-password"
                          style={inputStyle}
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={config.smtp_password}
                          onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                          autoComplete="new-password"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          placeholder="Your Name (for signature)"
                          value={config.from_name}
                          onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* RIGHT COLUMN - Content Creation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {/* AI Campaign Settings Card */}
              <div style={{
                background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
                borderRadius: '20px',
                padding: '25px',
                border: '1px solid #a0c6d3',
                boxShadow: '0 1px 8px rgba(124, 167, 183, 0.27)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <BsStars size={20} color="#49A3C4" />
                  AI Campaign Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input
                    type="text"
                    placeholder="Your Product/Service"
                    value={campaignDetails.productService}
                    onChange={(e) => setCampaignDetails({ ...campaignDetails, productService: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Target Audience"
                    value={campaignDetails.targetAudience}
                    onChange={(e) => setCampaignDetails({ ...campaignDetails, targetAudience: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Goal (e.g. book a demo)"
                    value={campaignDetails.goal}
                    onChange={(e) => setCampaignDetails({ ...campaignDetails, goal: e.target.value })}
                    style={inputStyle}
                  />
                  <button
                    onClick={generateAIEmail}
                    disabled={!campaignDetails.productService || !campaignDetails.targetAudience || !campaignDetails.goal || action === "ai"}
                    style={{
                      ...buttonStyle,
                      backgroundColor: (!campaignDetails.productService || !campaignDetails.targetAudience || !campaignDetails.goal || action === "ai") ? '#A0C0D0' : '#49A3C4',
                      marginTop: '5px',
                      justifyContent: 'center'
                    }}
                  >
                    {action === "ai" ? <FaSpinner className="spin" /> : <BsStars />}
                    Generate AI Email Template
                  </button>
                </div>
              </div>

              {/* Email Content Card */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '20px',
                padding: '25px',
                border: '1px solid #E9EDF2',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FaFileAlt size={18} color="#49A3C4" />
                  Email Content
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#5A6F7D'
                  }}>
                    Subject Line
                  </label>
                  <input
                    placeholder="e.g., Quick question about {{company}}"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#5A6F7D'
                  }}>
                    Email Template
                  </label>
                  <textarea
                    placeholder="Hi {{name}},\n\nI'm reaching out from {{company}} to discuss..."
                    rows="10"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    style={{
                      ...inputStyle,
                      minHeight: '220px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: '1.6'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Template Variables Help - Moved below columns */}
          <div style={{
            backgroundColor: '#F0F9FF',
            padding: '20px 25px',
            borderRadius: '16px',
            border: '1px solid rgba(73, 163, 196, 0.3)',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <BsFileText size={18} color="#49A3C4" />
              <span style={{ fontWeight: '600', color: '#00364A' }}>Available Variables:</span>
              {['{{name}}', '{{email}}', '{{company}}', '{{sender_name}}', '{{industry}}', '{{company_website}}'].map((variable, index) => (
                <span key={index} style={{
                  backgroundColor: 'white',
                  padding: '4px 12px',
                  borderRadius: '30px',
                  fontSize: '13px',
                  color: '#49A3C4',
                  border: '1px solid rgba(73, 163, 196, 0.3)',
                  fontWeight: '500'
                }}>
                  {variable}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'flex-end',
            borderTop: '2px solid #EFF3F6',
            paddingTop: '30px'
          }}>
            <button
              onClick={generatePreview}
              disabled={action === "preview" || !contacts.length}
              style={{
                ...buttonStyle,
                backgroundColor: (action === "preview" || !contacts.length) ? '#A0C0D0' : '#6B8C9C',
              }}
            >
              {action === "preview" ? <FaSpinner className="spin" /> : <FaEye />}
              Preview
            </button>

            <button
              onClick={sendCampaign}
              disabled={action === "send" || !contacts.length || !subject || !message}
              style={{
                ...buttonStyle,
                backgroundColor: (action === "send" || !contacts.length || !subject || !message) ? '#A0C0D0' : '#10B981',
              }}
            >
              {action === "send" ? <FaSpinner className="spin" /> : <FaPaperPlane />}
              Send Campaign
            </button>
          </div>
        </section>

        {/* Preview Section */}
        {preview && (
          <section style={{
            backgroundColor: 'white',
            borderRadius: '25px',
            boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
            marginBottom: '40px'
          }}>
            <EmailPreview content={preview} />
          </section>
        )}

        {/* Results Section */}
        {results && (
          <section style={{
            backgroundColor: 'white',
            borderRadius: '25px',
            boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
            marginBottom: '40px'
          }}>

            <CampaignResults results={results} />
          </section>
        )}

        {/* Features Section */}
        {!results && !preview && contacts.length === 0 && (
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '30px',
            marginTop: '40px'
          }}>
            <FeatureCard
              icon="🚀"
              title="Bulk Email Sending"
              description="Send personalized emails to thousands of contacts with a single click. Track delivery and engagement."
              color="#00364A"
            />
            <FeatureCard
              icon="🤖"
              title="AI-Powered Content"
              description="Generate professional outreach emails using AI based on your campaign goals. Save time and improve response rates."
              color="#49A3C4"
            />
            <FeatureCard
              icon="📊"
              title="Lead Enrichment"
              description="Automatically enrich your contacts with company data, industry info, and personalized insights using AI."
              color="#7DBBE0"
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#00364A',
        opacity: 0.7,
        fontSize: '14px',
        marginTop: '60px'
      }}>
        <p>© 2025 SCOUT Email Outreach. All rights reserved.</p>
        <p style={{ marginTop: '10px', fontSize: '13px' }}>
          Powered by SendGrid • AI-generated content • Real-time campaign tracking
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '30px',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered
          ? `0 15px 40px rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.15)`
          : '0 8px 25px rgba(0, 54, 74, 0.08)',
        cursor: 'pointer',
        border: `2px solid rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`
      }}
    >
      <div style={{
        width: '60px',
        height: '60px',
        backgroundColor: `${color}20`,
        borderRadius: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '28px',
        color: color,
        transition: 'all 0.3s',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)'
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#00364A',
        marginBottom: '12px'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '15px',
        lineHeight: '1.6',
        color: '#00364A',
        opacity: 0.75,
        margin: 0
      }}>
        {description}
      </p>
    </div>
  );
}