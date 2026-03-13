// components/ContactsViewer.jsx
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { BsEye } from "react-icons/bs";

export default function ContactsViewer({ contacts, onClose, onUpdateContacts }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [addingContact, setAddingContact] = useState(false);
  const [newContactData, setNewContactData] = useState({});

  if (!contacts.length) return null;

  const filteredContacts = contacts.filter(contact =>
    Object.values(contact).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const headers = Object.keys(contacts[0] || []);

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setEditFormData({ ...contact });
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = () => {
    const updatedContacts = contacts.map(contact =>
      contact === editingContact ? editFormData : contact
    );
    onUpdateContacts(updatedContacts);
    setEditingContact(null);
    setEditFormData({});
  };

  const handleDeleteClick = (contact) => {
    setDeleteConfirm(contact);
  };

  const handleConfirmDelete = () => {
    const updatedContacts = contacts.filter(contact => contact !== deleteConfirm);
    onUpdateContacts(updatedContacts);
    setDeleteConfirm(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleCancelEdit = () => {
    setEditingContact(null);
    setEditFormData({});
  };

  const handleAddClick = () => {
    const emptyContact = {};
    headers.forEach(header => {
      emptyContact[header] = '';
    });
    setNewContactData(emptyContact);
    setAddingContact(true);
  };

  const handleNewContactChange = (field, value) => {
    setNewContactData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveNewContact = () => {
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
          autoComplete="new-password"
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

      {/* Add Contact Modal */}
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
}