import React, { useState } from "react";
import { Plus, Trash2, Save, List, Database, Columns, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE from "./api_base";

const EntityForm = () => {
  const [entityName, setEntityName] = useState("");
  const [attributes, setAttributes] = useState([]);
  const navigate = useNavigate();
  
  const addAttribute = () => {
    setAttributes([...attributes, { name: "", datatype: "text", check_for_unique: false }]);
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const deleteAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const submitEntity = async () => {
    if (!entityName.trim()) {
      alert("Please enter entity name!");
      return;
    }
    if (attributes.length === 0) {
      alert("Please add at least one attribute!");
      return;
    }

    const payload = {
      name: entityName,
      attributes: attributes
    };

    console.log("Submitting:", payload);

    try {
      const response = await fetch(`${API_BASE}/entity/save-entity`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
                  "ngrok-skip-browser-warning": "true"
         },

        body: JSON.stringify(payload),
      });
      const data = await response.json();
      
      if (data.success === true) {
        alert("Entity saved successfully!");
        setEntityName("");
        setAttributes([]);
      } else {
        alert("Failed to save entity!");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong!");
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
        maxWidth: '800px',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '50px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
            paddingBottom: '20px'
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
                }}>Create Entity</h1>
                <p style={{
                  fontSize: '16px',
                  color: '#00364A',
                  opacity: 0.7,
                  margin: '5px 0 0 0'
                }}>Define your data structure</p>
              </div>
            </div>
           <div
                    style={{
                    padding: '10px 10px',
                    display: 'flex',
                    justifyContent: 'right',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <button
                        style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'rgba(73, 163, 196, 0.1)',
                color: '#00364A',
                borderRadius: '12px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.2)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'}
                      onClick={() => navigate('/dashboard')}
                    >
                    <ArrowLeft size={18} />
                      Dashboard
                      </button>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'rgba(73, 163, 196, 0.1)',
                color: '#00364A',
                borderRadius: '12px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.2)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'}
              onClick={() => navigate('/entitylist')}
            >
              <List size={18} />
              View All
            </button>
          </div>
          </div>
            
          {/* Entity Name Input */}
          <div style={{ marginBottom: '40px' }}>
            <label htmlFor="entityName" style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#00364A',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                padding: '6px',
                backgroundColor: 'rgba(73, 163, 196, 0.1)',
                borderRadius: '8px',
                display: 'flex'
              }}>
                <Sparkles size={18} color="#49A3C4" />
              </div>
              Entity Name
            </label>
            <input
              type="text"
              id="entityName"
              placeholder="e.g. user, product, company"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'rgba(73, 163, 196, 0.15)',
                color: '#00364A',
                fontSize: '16px',
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
          </div>
         
          {/* Attributes Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                padding: '6px',
                backgroundColor: 'rgba(73, 163, 196, 0.1)',
                borderRadius: '8px',
                display: 'flex'
              }}>
                <Columns size={18} color="#49A3C4" />
              </div>
              Attributes
            </h2>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#00364A',
              backgroundColor: 'rgba(73, 163, 196, 0.1)',
              padding: '6px 16px',
              borderRadius: '20px'
            }}>
              {attributes.length} attribute{attributes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Attributes List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
            {attributes.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                backgroundColor: '#F8FBFF',
                borderRadius: '20px',
                border: '2px dashed rgba(0, 54, 74, 0.1)'
              }}>
                <Columns size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', color: '#00364A', fontWeight: '500', marginBottom: '5px' }}>No attributes added yet</p>
                <p style={{ fontSize: '14px', color: '#00364A', opacity: 0.6 }}>Click "Add Attribute" to get started</p>
              </div>
            ) : (
                attributes.map((attr, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '20px',
                      padding: '25px',
                      backgroundColor: 'white',
                      border: '2px solid rgba(0, 54, 74, 0.08)',
                      borderRadius: '20px',
                      boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                      transition: 'all 0.3s'
                    }}
                  >

                    {/* Left side grid (Name + Datatype + Checkbox) */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>

                      {/* Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#00364A', marginBottom: '8px' }}>Name</label>
                        <input
                          type="text"
                          placeholder="e.g. name, email"
                          value={attr.name}
                          onChange={(e) => updateAttribute(index, "name", e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(0, 54, 74, 0.15)',
                            fontSize: '14px',
                            color: '#00364A',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#49A3C4'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(0, 54, 74, 0.15)'}
                        />
                      </div>

                      {/* Datatype */}
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#00364A', marginBottom: '8px' }}>Data Type</label>
                        <select
                          value={attr.datatype}
                          onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(0, 54, 74, 0.15)',
                            fontSize: '14px',
                            color: '#00364A',
                            backgroundColor: 'white',
                            outline: 'none',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300364A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 16px top 50%',
                            backgroundSize: '10px auto'
                          }}
                        >
                          <option value="text">String</option>
                          <option value="int">Integer</option>
                          <option value="bool">Boolean</option>
                          <option value="Float">Float</option>
                          <option value="Date">Date</option>
                        </select>
                      </div>

                      {/* NEW — Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '35px' }}>
                        <input
                          type="checkbox"
                          checked={attr.check_for_unique}
                          onChange={(e) => updateAttribute(index, "check_for_unique", e.target.checked)}
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: '#49A3C4',
                            cursor: 'pointer'
                          }}
                        />
                        <label style={{ fontSize: '14px', color: '#00364A', cursor: 'pointer' }}>Check Duplicate</label>
                      </div>

                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      style={{
                        marginTop: '28px',
                        padding: '10px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#FEF2F2',
                        color: '#EF4444',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#FEE2E2'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#FEF2F2'}
                      onClick={() => deleteAttribute(index)}
                      title="Delete attribute"
                    >
                      <Trash2 size={18} />
                    </button>

                  </div>
              ))
            )}
          </div>

          {/* Add Attribute Button */}
          <div style={{ marginBottom: '40px' }}>
            <button 
              type="button" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 28px',
                backgroundColor: 'white',
                color: '#49A3C4',
                border: '2px solid #49A3C4',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#49A3C4';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#49A3C4';
              }}
              onClick={addAttribute}
            >
              <Plus size={20} />
              Add Attribute
            </button>
          </div>

          {/* Submit Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '30px',
            borderTop: '1px solid rgba(0, 54, 74, 0.1)'
          }}>
            <button 
              type="button" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 40px',
                backgroundColor: '#00364A',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(0, 54, 74, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 54, 74, 0.2)';
              }}
              onClick={submitEntity}
            >
              <Save size={20} />
              Save Entity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityForm;