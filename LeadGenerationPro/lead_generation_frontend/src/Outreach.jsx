import { useState } from "react";
import { Link } from "react-router-dom";
import { FaSpinner, FaUpload, FaEnvelope, FaRobot, FaEye, FaPaperPlane, FaCog, FaFileAlt } from "react-icons/fa";
import { FiFilter, FiMail, FiUsers, FiSettings, FiActivity, FiLayers } from "react-icons/fi";
import { BsSend, BsStars, BsFileText, BsEye, BsPersonLinesFill } from "react-icons/bs";
import { Layers, Activity, ChevronDown, ChevronUp } from "lucide-react";
import ProviderSelector from "./components/ProviderSelector";
import EmailPreview from "./components/EmailPreview";
import CampaignResults from "./components/CampaignResults";
import API_BASE from "./api_base";

const BASE = API_BASE + "/outreach";

export default function Outreach() {
  const [contacts, setContacts] = useState([]);
  const [provider, setProvider] = useState("sendgrid");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState("");
  const [results, setResults] = useState(null);
  const [action, setAction] = useState(null);
  const [config, setConfig] = useState({
    // sendgrid fields
    api_key: "",
    // common fields used by both providers
    from_email: "",
    from_name: "",
    // smtp-specific optional values (username is usually the email)
    smtp_username: "",
    smtp_password: ""
  });
  
  // New state for UI enhancements
  const [showContacts, setShowContacts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactsView, setContactsView] = useState('list'); // 'list' or 'table'

  // Notification system
  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Update the CSVUploader component - remove auto-show on upload
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
        addNotification('success', `✅ Successfully loaded ${data.count} contacts`);
        // REMOVED: setShowContacts(true); // Don't auto-show modal
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

  // ADD THIS NEW FUNCTION to sync contacts display in campaign settings
  // Add this after the CSVUploader component definition

  // Contacts Status Component - Shows in campaign settings when contacts are loaded
  const ContactsStatus = ({ contacts, onViewContacts }) => {
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
              Ready for campaign
            </div>
          </div>
        </div>
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
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#10B981';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'white';
            e.target.style.color = '#10B981';
          }}
        >
          <BsEye size={14} />
          View Contacts
        </button>
      </div>
    );
  };
  // Update the ContactsViewer component with edit, delete, and add functionality
  const ContactsViewer = ({ contacts, onClose, onUpdateContacts }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingContact, setEditingContact] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    // ADD THIS - State for adding new contact
    const [addingContact, setAddingContact] = useState(false);
    const [newContactData, setNewContactData] = useState({});
  
    if (!contacts.length) return null;
  
    const filteredContacts = contacts.filter(contact =>
      Object.values(contact).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  
    const headers = Object.keys(contacts[0] || []);
  
    // Handle edit button click
    const handleEdit = (contact) => {
      setEditingContact(contact);
      setEditFormData({ ...contact });
    };
  
    // Handle edit form change
    const handleEditChange = (field, value) => {
      setEditFormData(prev => ({
        ...prev,
        [field]: value
      }));
    };
  
    // Save edited contact
    const handleSaveEdit = () => {
      const updatedContacts = contacts.map(contact =>
        contact === editingContact ? editFormData : contact
      );
      onUpdateContacts(updatedContacts);
      setEditingContact(null);
      setEditFormData({});
    };
  
    // Handle delete confirmation
    const handleDeleteClick = (contact) => {
      setDeleteConfirm(contact);
    };
  
    // Confirm delete
    const handleConfirmDelete = () => {
      const updatedContacts = contacts.filter(contact => contact !== deleteConfirm);
      onUpdateContacts(updatedContacts);
      setDeleteConfirm(null);
    };
  
    // Cancel delete
    const handleCancelDelete = () => {
      setDeleteConfirm(null);
    };
  
    // Cancel edit
    const handleCancelEdit = () => {
      setEditingContact(null);
      setEditFormData({});
    };
  
    // ADD THESE - New contact functions
    
    // Initialize new contact form with empty fields based on headers
    const handleAddClick = () => {
      const emptyContact = {};
      headers.forEach(header => {
        emptyContact[header] = '';
      });
      setNewContactData(emptyContact);
      setAddingContact(true);
    };
  
    // Handle new contact form change
    const handleNewContactChange = (field, value) => {
      setNewContactData(prev => ({
        ...prev,
        [field]: value
      }));
    };
  
    // Save new contact
    const handleSaveNewContact = () => {
      // Check if at least email is provided (optional validation)
      const emailField = headers.find(h => h.toLowerCase().includes('email'));
      if (emailField && !newContactData[emailField]) {
        alert('Please fill in the email field');
        return;
      }
    
      const updatedContacts = [...contacts, newContactData];
      onUpdateContacts(updatedContacts);
      setAddingContact(false);
      setNewContactData({});
    };
  
    // Cancel adding new contact
    const handleCancelAdd = () => {
      setAddingContact(false);
      setNewContactData({});
    };
  
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#00364A' }}>
            Contacts ({contacts.length})
          </h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* ADD THIS - Add Contact Button */}
            <button
              onClick={handleAddClick}
              style={{
                background: '#10B981',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#10B981';
              }}
            >
              + Add Contact
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#9CA3AF',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F3F4F6';
                e.target.style.color = '#00364A';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#9CA3AF';
              }}
            >
              ×
            </button>
          </div>
        </div>
            
        {/* Search Bar */}
        <div style={{ padding: '20px' }}>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 15px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#49A3C4';
              e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
          
        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            width: '400px',
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#00364A', marginBottom: '15px' }}>
              Confirm Remove
            </h4>
            <p style={{ color: '#00364A', opacity: 0.8, marginBottom: '20px' }}>
              Are you sure you want to remove this contact?
            </p>
            <div style={{
              backgroundColor: '#F3F4F6',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              {Object.entries(deleteConfirm).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '5px', fontSize: '14px' }}>
                  <strong style={{ color: '#00364A' }}>{key}:</strong>{' '}
                  <span style={{ color: '#00364A', opacity: 0.7 }}>{String(value)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#EF4444';
                }}
              >
                Remove
              </button>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#E5E7EB',
                  color: '#00364A',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#E5E7EB';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
  
        {/* Edit Contact Modal */}
        {editingContact && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            width: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#00364A', marginBottom: '20px' }}>
              Edit Contact
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {Object.keys(editFormData).map(field => (
                <div key={field}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#00364A',
                    textTransform: 'capitalize'
                  }}>
                    {field}
                  </label>
                  <input
                    type={field.toLowerCase().includes('email') ? 'email' : 'text'}
                    value={editFormData[field] || ''}
                    onChange={(e) => handleEditChange(field, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#49A3C4';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E5E7EB';
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px' }}>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#10B981';
                }}
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#E5E7EB',
                  color: '#00364A',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#E5E7EB';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
  
        {/* ADD THIS - Add Contact Modal */}
        {addingContact && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            width: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#00364A', marginBottom: '20px' }}>
              Add New Contact
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {headers.map(field => (
                <div key={field}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#00364A',
                    textTransform: 'capitalize'
                  }}>
                    {field} {field.toLowerCase().includes('email') && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <input
                    type={field.toLowerCase().includes('email') ? 'email' : 'text'}
                    value={newContactData[field] || ''}
                    onChange={(e) => handleNewContactChange(field, e.target.value)}
                    placeholder={`Enter ${field}`}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#49A3C4';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#E5E7EB';
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px' }}>
              <button
                onClick={handleSaveNewContact}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#10B981';
                }}
              >
                Add Contact
              </button>
              <button
                onClick={handleCancelAdd}
                style={{
                  padding: '10px 25px',
                  backgroundColor: '#E5E7EB',
                  color: '#00364A',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#E5E7EB';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
  
        {/* Contacts Table */}
        <div style={{
          overflow: 'auto',
          flex: 1,
          padding: '0 20px 20px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                {headers.map(header => (
                  <th key={header} style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#00364A',
                    borderBottom: '2px solid #E5E7EB',
                    textTransform: 'capitalize'
                  }}>
                    {header}
                  </th>
                ))}
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#00364A',
                  borderBottom: '2px solid #E5E7EB',
                  width: '120px'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: 'white',
                    transition: 'background-color 0.2s',
                    borderBottom: '1px solid #E5E7EB'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  {headers.map(header => (
                    <td key={header} style={{
                      padding: '12px',
                      color: '#00364A'
                    }}>
                      {contact[header]}
                    </td>
                  ))}
                  <td style={{
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(contact)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#49A3C4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#3d8ba8';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#49A3C4';
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(contact)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#EF4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#DC2626';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#EF4444';
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            
        {/* Footer with count */}
        <div style={{
          padding: '15px 20px',
          borderTop: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: '#00364A'
        }}>
          <span>Showing {filteredContacts.length} of {contacts.length} contacts</span>
          <span style={{ opacity: 0.7 }}>Add, edit or remove contacts from campaign list</span>
        </div>
      </div>
    );
  };
  // Notification Panel
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

  const generatePreview = async () => {
    if (!contacts.length) {
      addNotification('error', "Please upload contacts first");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template: message,
          contact: contacts[0],
        }),
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

  const generateAI = async () => {
    try {
      setAction("ai");

      const res = await fetch(`${BASE}/generate-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Write a professional cold outreach email for a SaaS demo. Keep it concise and engaging."
        }),
      });

      const data = await res.json();
      setMessage(data.generated);
      addNotification('success', "AI-generated email created");
    } catch (err) {
      console.error(err);
      addNotification('error', "AI generation failed");
    } finally {
      setAction(null);
    }
  };

  const sendCampaign = async () => {
    if (!contacts.length) {
      addNotification('error', "Please upload contacts first");
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

      // config and fallback logic removed entirely
      const requestBody = {
        provider,
        subject,
        message,
        contacts
      };

      const res = await fetch(`${BASE}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      {/* Notification Panel */}
      <NotificationPanel notifications={notifications} onRemove={removeNotification} />

      {/* Contacts Viewer Modal - UPDATE THIS SECTION */}
      {showContacts && contacts.length > 0 && (
        <ContactsViewer
          contacts={contacts}
          onClose={() => setShowContacts(false)}
          onUpdateContacts={setContacts}  
        />
      )}

      {/* Overlay when modal is open */}
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
      `}</style>

      {/* Header - Keep existing header */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 60px',
        position: 'relative',
        zIndex: 50
      }}>
        {/* ... existing header content ... */}
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
          {/* Logo - Left */}
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
          
          {/* Navigation */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px'
          }}>
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
            <a href="#" style={{
              fontWeight: '500',
              color: '#00364A',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px',
              backgroundColor: '#00364A',
              color: 'white'
            }}>
              Email Outreach
            </a>
          </nav>
          
          {/* User Info */}
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

      {/* Main Content */}
      <main style={{
        maxWidth: '1450px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        {/* Hero Section - Campaign Builder */}
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
            {/* Left Content - Campaign Info */}
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

              {/* Stats */}
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

            {/* Right Content - Campaign Overview with Quick Action */}
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

              {/* Quick Action Button - Upload CSV */}
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

              {/* Campaign Status */}
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

                {/* UPDATE THIS BUTTON to match the style of the campaign settings one */}
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

        {/* Main Campaign Builder Section */}
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
            marginBottom: '30px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              backgroundColor: '#E0EFFF',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaCog size={24} color="#00364A" />
            </div>
            <div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#00364A',
                marginBottom: '5px'
              }}>
                Compose Your Campaign
              </h2>
              <p style={{ color: '#00364A', opacity: 0.7 }}>
                Write your email template and configure settings
              </p>
            </div>
          </div>

          {/* Two Column Layout for Settings */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            marginBottom: '20px'
          }}>
            {/* Left Column - Contacts & Provider */}
            <div>
              {/* CSV Uploader with custom styling */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#00364A',
                  fontSize: '15px'
                }}>
                  <FiUsers style={{ marginRight: '8px', display: 'inline' }} />
                  Upload Contacts (CSV)
                </label>
                <div id="csv-upload-trigger">
                  <CSVUploader setContacts={setContacts} />
                </div>

                {/* ADD THIS - Contacts status shows here when contacts are loaded */}
                <ContactsStatus
                  contacts={contacts}
                  onViewContacts={() => setShowContacts(true)}
                />
              </div>

              {/* Provider Selector */}
              <div style={{ marginBottom: '25px' }}>
                {/* <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#00364A',
                  fontSize: '15px'
                }}>
                  <FiMail style={{ marginRight: '8px', display: 'inline' }} />
                  Email Provider
                </label> */}
                <ProviderSelector value={provider} onChange={setProvider} />
              </div>

              {/* SendGrid Config (only shown when sendgrid is selected) */}
              {provider === "sendgrid" && (
                <div style={{
                  backgroundColor: '#F8FBFF',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(73, 163, 196, 0.2)'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#00364A',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FiSettings size={16} />
                    SendGrid Configuration (Optional)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                      type="password"
                      placeholder="API Key"
                      value={config.api_key}
                      onChange={(e) => setConfig({...config, api_key: e.target.value})}
                      style={{
                        padding: '12px 15px',
                        border: '2px solid rgba(0, 54, 74, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#49A3C4';
                        e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <input
                      type="email"
                      placeholder="From Email"
                      value={config.from_email}
                      onChange={(e) => setConfig({...config, from_email: e.target.value})}
                      style={{
                        padding: '12px 15px',
                        border: '2px solid rgba(0, 54, 74, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#49A3C4';
                        e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <input
                      type="text"
                      placeholder="From Name (optional)"
                      value={config.from_name}
                      onChange={(e) => setConfig({...config, from_name: e.target.value})}
                      style={{
                        padding: '12px 15px',
                        border: '2px solid rgba(0, 54, 74, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#49A3C4';
                        e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SMTP config section, minimal fields */}
              {provider === "smtp" && (
                <div style={{
                  backgroundColor: '#F8FBFF',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(73, 163, 196, 0.2)'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#00364A',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FiSettings size={16} />
                    SMTP Configuration (optional)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                      type="email"
                      placeholder="Username / Email"
                      value={config.smtp_username}
                      onChange={(e) => setConfig({...config, smtp_username: e.target.value})}
                      style={{
                        padding: '12px 15px',
                        border: '2px solid rgba(0, 54, 74, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={config.smtp_password}
                      onChange={(e) => setConfig({...config, smtp_password: e.target.value})}
                      style={{
                        padding: '12px 15px',
                        border: '2px solid rgba(0, 54, 74, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="From Name (optional)"
                      value={config.from_name}
                      onChange={(e) => setConfig({...config, from_name: e.target.value})}
                      style={{
                        padding: '12px 15px',
                        border: '2px solid rgba(0, 54, 74, 0.1)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Email Content */}
            <div>
              {/* Subject Line */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#00364A',
                  fontSize: '15px'
                }}>
                  <FaEnvelope style={{ marginRight: '8px', display: 'inline' }} />
                  Email Subject
                </label>
                <input
                  placeholder="e.g. Check out our new SaaS product!"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid rgba(0, 54, 74, 0.1)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.3s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#49A3C4';
                    e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Email Content */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#00364A',
                  fontSize: '15px'
                }}>
                  <FaFileAlt style={{ marginRight: '8px', display: 'inline' }} />
                  Email Template
                </label>
                <textarea
                  placeholder="Hi {{name}},\n\nI am excited to introduce you to our new SaaS product that can help with {{company}}'s needs. Let me know if you're interested in a quick demo!\n\nBest,\nHannia"
                  rows="13"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid rgba(0, 54, 74, 0.1)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all 0.3s',
                    minHeight: '200px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#49A3C4';
                    e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons - MOVED HERE (below email content) */}
          <div style={{
            marginTop: '10px',
            display: 'flex',
            gap: '15px',
            justifyContent: 'flex-end',
            borderTop: '1px solid rgba(0, 54, 74, 0.1)',
            paddingTop: '20px'
          }}>
            <button
              onClick={generateAI}
              disabled={action === "ai"}
              style={{
                padding: '14px 28px',
                backgroundColor: action === "ai" ? '#ccc' : '#00364A',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: action === "ai" ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                opacity: action === "ai" ? 0.7 : 1
              }}
            >
              {action === "ai" ? <FaSpinner className="spin" /> : <BsStars />}
              AI Generate
            </button>
            
            <button
              onClick={generatePreview}
              disabled={action === "preview" || !contacts.length}
              style={{
                padding: '14px 28px',
                backgroundColor: action === "preview" ? '#ccc' : '#49A3C4',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: (action === "preview" || !contacts.length) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                opacity: (action === "preview" || !contacts.length) ? 0.7 : 1
              }}
            >
              {action === "preview" ? <FaSpinner className="spin" /> : <FaEye />}
              Preview
            </button>
            
            <button
              onClick={sendCampaign}
              disabled={action === "send" || !contacts.length || !subject || !message}
              style={{
                padding: '14px 28px',
                backgroundColor: action === "send" ? '#ccc' : '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: (action === "send" || !contacts.length || !subject || !message) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                opacity: (action === "send" || !contacts.length || !subject || !message) ? 0.7 : 1
              }}
            >
              {action === "send" ? <FaSpinner className="spin" /> : <FaPaperPlane />}
              Send Campaign
            </button>
          </div>

          {/* Template Variables Help */}
          <div style={{
            backgroundColor: '#F8FBFF',
            padding: '15px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(73, 163, 196, 0.2)',
            marginTop: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <BsFileText color="#49A3C4" />
              <span style={{ fontWeight: '600', color: '#00364A' }}>Template Variables</span>
            </div>
            <p style={{ fontSize: '14px', color: '#00364A', opacity: 0.8 }}>
              Use {'{{name}}'}, {'{{email}}'}, {'{{company}}'}, etc. to personalize your emails.
              Variables will be replaced with contact data from your CSV.
            </p>
          </div>
        </section>

        {/* Preview Section */}
        {preview && (
          <section style={{
            backgroundColor: 'white',
            borderRadius: '25px',
            padding: '30px',
            boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
            marginBottom: '40px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#E0EFFF',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaEye size={18} color="#00364A" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#00364A'
              }}>
                Email Preview (using first contact)
              </h3>
            </div>
            <EmailPreview content={preview} />
          </section>
        )}

        {/* Results Section */}
        {results && (
          <section style={{
            backgroundColor: 'white',
            borderRadius: '25px',
            padding: '30px',
            boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
            marginBottom: '40px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#E0EFFF',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaPaperPlane size={18} color="#00364A" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#00364A'
              }}>
                Campaign Results
              </h3>
            </div>
            <CampaignResults results={results} />
          </section>
        )}

        {/* Features Section (when no campaign started) */}
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
              description="Generate professional outreach emails using AI. Save time and improve response rates."
              color="#49A3C4"
            />
            <FeatureCard 
              icon="📊"
              title="Campaign Analytics"
              description="Monitor your campaign performance with detailed analytics and delivery reports."
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

// Quick Action Button Component (simplified)
function QuickActionButton({ icon, label, onClick, loading, disabled, color }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '20px 15px',
        backgroundColor: disabled ? '#E5E7EB' : (isHovered ? color : 'white'),
        color: disabled ? '#9CA3AF' : (isHovered ? 'white' : color),
        border: disabled ? 'none' : `2px solid ${color}`,
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        opacity: disabled ? 0.5 : 1,
        transform: isHovered && !disabled ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered && !disabled ? `0 8px 15px ${color}40` : 'none'
      }}
    >
      <span style={{ fontSize: '20px' }}>
        {loading ? <FaSpinner className="spin" /> : icon}
      </span>
      <span>{loading ? 'Processing...' : label}</span>
    </button>
  );
}

// Feature Card Component
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