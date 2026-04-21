import React, { useState } from "react";
import { Plus, Trash2, Save, List, Database, Columns, Sparkles, ArrowLeft, X, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import Layout from "./components/Layout"; // Import the Layout component
import NotificationPanel from "./components/NotificationPanel"; // Import the NotificationPanel component

const EntityForm = () => {
  const [entityName, setEntityName] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Validation rules
  const VALIDATION_RULES = {
    entityName: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      patternMessage: "Must start with a letter and contain only letters, numbers, and underscores",
      reservedKeywords: ['user', 'users', 'admin', 'system', 'config', 'migration'] // Add more as needed
    },
    attributeName: {
      required: true,
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      patternMessage: "Must start with a letter and contain only letters, numbers, and underscores",
      reservedKeywords: ['id', 'modified_at', 'source', 'created_at', 'updated_at']
    }
  };

  // Allowed data types (should match backend TYPE_MAP)
  const ALLOWED_DATA_TYPES = ['text', 'int', 'bool', 'float', 'date'];

  // Notification system
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

  // Validation functions
  const validateEntityName = (name) => {
    const errors = [];
    const trimmedName = name.trim();

    if (!trimmedName && VALIDATION_RULES.entityName.required) {
      errors.push("Entity name is required");
    } else if (trimmedName) {
      if (trimmedName.length < VALIDATION_RULES.entityName.minLength) {
        errors.push(`Entity name must be at least ${VALIDATION_RULES.entityName.minLength} characters`);
      }
      if (trimmedName.length > VALIDATION_RULES.entityName.maxLength) {
        errors.push(`Entity name must be less than ${VALIDATION_RULES.entityName.maxLength} characters`);
      }
      if (!VALIDATION_RULES.entityName.pattern.test(trimmedName)) {
        errors.push(VALIDATION_RULES.entityName.patternMessage);
      }
      if (VALIDATION_RULES.entityName.reservedKeywords.includes(trimmedName.toLowerCase())) {
        errors.push(`"${trimmedName}" is a reserved name and cannot be used`);
      }
    }

    return errors;
  };

  const validateAttributeName = (name, index, allAttributes) => {
    const errors = [];
    const trimmedName = name.trim();

    if (!trimmedName && VALIDATION_RULES.attributeName.required) {
      errors.push("Attribute name is required");
    } else if (trimmedName) {
      if (trimmedName.length < VALIDATION_RULES.attributeName.minLength) {
        errors.push(`Attribute name must be at least ${VALIDATION_RULES.attributeName.minLength} character`);
      }
      if (trimmedName.length > VALIDATION_RULES.attributeName.maxLength) {
        errors.push(`Attribute name must be less than ${VALIDATION_RULES.attributeName.maxLength} characters`);
      }
      if (!VALIDATION_RULES.attributeName.pattern.test(trimmedName)) {
        errors.push(VALIDATION_RULES.attributeName.patternMessage);
      }
      if (VALIDATION_RULES.attributeName.reservedKeywords.includes(trimmedName.toLowerCase())) {
        errors.push(`"${trimmedName}" is a reserved attribute name`);
      }

      // Check for duplicate attribute names (case-insensitive)
      const duplicateIndex = allAttributes.findIndex((attr, i) =>
        i !== index && attr.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicateIndex !== -1) {
        errors.push(`Duplicate attribute name: "${trimmedName}"`);
      }
    }

    return errors;
  };

  const validateDataType = (datatype) => {
    return ALLOWED_DATA_TYPES.includes(datatype) ? [] : [`Invalid data type: "${datatype}"`];
  };

  const validateAllAttributes = (attributes) => {
    const errors = {};

    attributes.forEach((attr, index) => {
      const attrErrors = {};

      const nameErrors = validateAttributeName(attr.name, index, attributes);
      if (nameErrors.length > 0) {
        attrErrors.name = nameErrors;
      }

      const datatypeErrors = validateDataType(attr.datatype);
      if (datatypeErrors.length > 0) {
        attrErrors.datatype = datatypeErrors;
      }

      if (Object.keys(attrErrors).length > 0) {
        errors[index] = attrErrors;
      }
    });

    return errors;
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate entity name
    const entityNameErrors = validateEntityName(entityName);
    if (entityNameErrors.length > 0) {
      newErrors.entityName = entityNameErrors;
    }

    // Validate attributes
    const attributeErrors = validateAllAttributes(attributes);
    if (Object.keys(attributeErrors).length > 0) {
      newErrors.attributes = attributeErrors;
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addAttribute = () => {
    setAttributes([...attributes, { name: "", datatype: "text", check_for_unique: false }]);
    // Clear validation errors for new attribute
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.attributes) {
        delete newErrors.attributes[attributes.length];
        if (Object.keys(newErrors.attributes).length === 0) {
          delete newErrors.attributes;
        }
      }
      return newErrors;
    });
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);

    // Clear validation error for this attribute when user starts typing
    if (validationErrors.attributes?.[index]?.[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.attributes?.[index]) {
          delete newErrors.attributes[index][field];
          if (Object.keys(newErrors.attributes[index]).length === 0) {
            delete newErrors.attributes[index];
          }
          if (Object.keys(newErrors.attributes).length === 0) {
            delete newErrors.attributes;
          }
        }
        return newErrors;
      });
    }
  };

  const deleteAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));

    // Clean up validation errors for deleted attribute
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.attributes) {
        delete newErrors.attributes[index];
        // Re-index remaining errors
        const reindexedErrors = {};
        Object.keys(newErrors.attributes).forEach(key => {
          const newKey = parseInt(key) > index ? parseInt(key) - 1 : parseInt(key);
          reindexedErrors[newKey] = newErrors.attributes[key];
        });
        newErrors.attributes = reindexedErrors;

        if (Object.keys(newErrors.attributes).length === 0) {
          delete newErrors.attributes;
        }
      }
      return newErrors;
    });

    addNotification('info', 'Attribute removed');
  };

  const submitEntity = async () => {
    // Clear previous notifications
    setNotifications([]);

    // Validate form before submission
    if (!validateForm()) {
      addNotification('error', "Please fix the validation errors before submitting");
      return;
    }

    // Additional checks
    if (!entityName.trim()) {
      addNotification('error', "Please enter entity name!");
      return;
    }

    if (attributes.length === 0) {
      addNotification('error', "Please add at least one attribute!");
      return;
    }

    // Check for empty attribute names
    const emptyAttribute = attributes.find(attr => !attr.name.trim());
    if (emptyAttribute) {
      addNotification('error', "All attributes must have a name!");
      return;
    }

    // Check for duplicate attribute names (case-insensitive)
    const attributeNames = attributes.map(attr => attr.name.trim().toLowerCase());
    const hasDuplicates = attributeNames.some((name, index) => attributeNames.indexOf(name) !== index);
    if (hasDuplicates) {
      addNotification('error', "Duplicate attribute names are not allowed!");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: entityName.trim(),
      attributes: attributes.map(attr => ({
        ...attr,
        name: attr.name.trim(),
        datatype: attr.datatype
      }))
    };

    console.log("Submitting:", payload);

    try {
      const response = await fetch(`${API_BASE}/entity/save-entity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success === true) {
        addNotification('success', "Entity saved successfully!");
        queryClient.invalidateQueries({ queryKey: ['entities'] });
        setEntityName("");
        setAttributes([]);
        setValidationErrors({});
      } else {
        // Handle backend validation errors
        const errorMessage = data.message || data.detail || "Failed to save entity!";
        addNotification('error', errorMessage);

        // If backend returns field-specific errors, you can parse them here
        if (data.errors) {
          // Parse and display backend validation errors
          console.error("Backend validation errors:", data.errors);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      addNotification('error', "Network error! Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render validation error component
  const ValidationErrors = ({ errors }) => {
    if (!errors || errors.length === 0) return null;

    return (
      <div style={{
        marginTop: '6px',
        fontSize: '12px',
        color: '#EF4444',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}>
        {errors.map((error, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        ))}
      </div>
    );
  };

  // Rest of your component remains the same until the input fields...

  return (
    <Layout pageTitle="Entity Creation Form">
      {/* Notification Panel (same as before) */}
      <NotificationPanel notifications={notifications} onRemove={removeNotification} />

      {/* Animation Styles (same as before) */}
      <style>{`
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

      <div style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '40px' }}>
          {/* Header with Title and Actions (same as before) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#00364A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#49A3C4',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Database size={20} />
              </div>
              Create Entity
            </h2>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'rgba(73, 163, 196, 0.1)',
                  color: '#00364A',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.2)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'}
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft size={16} />
                Dashboard
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: 'rgba(73, 163, 196, 0.1)',
                  color: '#00364A',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.2)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'}
                onClick={() => navigate('/entitylist')}
              >
                <List size={16} />
                View All
              </button>
            </div>
          </div>

          {/* Entity Name Input with Validation */}
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
              onChange={(e) => {
                setEntityName(e.target.value);
                // Clear entity name validation error when user types
                if (validationErrors.entityName) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.entityName;
                    return newErrors;
                  });
                }
              }}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '12px',
                border: validationErrors.entityName ? '2px solid #EF4444' : 'none',
                backgroundColor: validationErrors.entityName ? 'rgba(239, 68, 68, 0.05)' : 'rgba(73, 163, 196, 0.15)',
                color: '#00364A',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.25)';
                e.target.style.boxShadow = validationErrors.entityName ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : '0 0 0 3px rgba(73, 163, 196, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = validationErrors.entityName ? 'rgba(239, 68, 68, 0.05)' : 'rgba(73, 163, 196, 0.15)';
                e.target.style.boxShadow = 'none';
                // Validate on blur
                const errors = validateEntityName(e.target.value);
                if (errors.length > 0) {
                  setValidationErrors(prev => ({ ...prev, entityName: errors }));
                }
              }}
            />
            {validationErrors.entityName && (
              <ValidationErrors errors={validationErrors.entityName} />
            )}
          </div>

          {/* Attributes Section Header (same as before) */}
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

          {/* Attributes List with Validation */}
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
                    border: validationErrors.attributes?.[index]
                      ? '2px solid #EF4444'
                      : '2px solid rgba(0, 54, 74, 0.08)',
                    borderRadius: '20px',
                    boxShadow: validationErrors.attributes?.[index]
                      ? '0 4px 15px rgba(239, 68, 68, 0.1)'
                      : '0 4px 15px rgba(0, 54, 74, 0.05)',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
                    {/* Name with Validation */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#00364A', marginBottom: '8px' }}>
                        Name {validationErrors.attributes?.[index]?.name &&
                          <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                        }
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. name, email"
                        value={attr.name}
                        onChange={(e) => updateAttribute(index, "name", e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: validationErrors.attributes?.[index]?.name
                            ? '1px solid #EF4444'
                            : '1px solid rgba(0, 54, 74, 0.15)',
                          fontSize: '14px',
                          color: '#00364A',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = validationErrors.attributes?.[index]?.name ? '#EF4444' : '#49A3C4'}
                        onBlur={(e) => {
                          if (!validationErrors.attributes?.[index]?.name) {
                            e.target.style.borderColor = 'rgba(0, 54, 74, 0.15)';
                          }
                        }}
                      />
                      {validationErrors.attributes?.[index]?.name && (
                        <ValidationErrors errors={validationErrors.attributes[index].name} />
                      )}
                    </div>

                    {/* Datatype with Validation */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#00364A', marginBottom: '8px' }}>
                        Data Type {validationErrors.attributes?.[index]?.datatype &&
                          <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                        }
                      </label>
                      <select
                        value={attr.datatype}
                        onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: validationErrors.attributes?.[index]?.datatype
                            ? '1px solid #EF4444'
                            : '1px solid rgba(0, 54, 74, 0.15)',
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
                        {ALLOWED_DATA_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                      {validationErrors.attributes?.[index]?.datatype && (
                        <ValidationErrors errors={validationErrors.attributes[index].datatype} />
                      )}
                    </div>

                    {/* Checkbox (no validation needed) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '35px' }}>
                      <input
                        type="checkbox"
                        id={`unique-${index}`}
                        checked={attr.check_for_unique}
                        onChange={(e) => updateAttribute(index, "check_for_unique", e.target.checked)}
                        style={{
                          width: '18px',
                          height: '18px',
                          accentColor: '#49A3C4',
                          cursor: 'pointer'
                        }}
                      />
                      <label htmlFor={`unique-${index}`} style={{ fontSize: '14px', color: '#00364A', cursor: 'pointer' }}>Check Duplicate</label>
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
                      justifyContent: 'center',
                      flexShrink: 0
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

          {/* Add Attribute Button (same as before) */}
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

          {/* Submit Button with Loading State */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '30px',
            borderTop: '1px solid rgba(0, 54, 74, 0.1)'
          }}>
            <button
              type="button"
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 40px',
                backgroundColor: isSubmitting ? '#94A3B8' : '#00364A',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 15px rgba(0, 54, 74, 0.2)',
                opacity: isSubmitting ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 54, 74, 0.2)';
                }
              }}
              onClick={submitEntity}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTop: '3px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Entity
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add spin animation for loading state */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
};

export default EntityForm;