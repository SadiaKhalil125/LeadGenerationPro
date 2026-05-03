import React, { useState, useEffect, useRef } from "react";
import {
  Eye, ArrowLeft, Search, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, X, Info, AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from '@tanstack/react-query';

import SmartWebsitePreview from "./ServerHtmlPreview";
import PreviewModal from "./components/PreviewModal";
import NotificationPanel from "./components/NotificationPanel";
import API_BASE from "./api_base";

// Constants
const METADATA_OPTIONS = ["text", "href", "src", "html", "datetime"];
const GOOGLE_MAPS_FIELDS = {
  name: "Business/Place Name",
  address: "Full Address",
  phone: "Phone Number",
  website: "Website URL",
  rating: "Average Rating",
  reviews_count: "Number of Reviews",
  category: "Business Category/Type",
  hours: "Opening Hours",
  description: "Business Description"
};

// Reusable Components
const MetadataInput = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        placeholder="Metadata"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      >
        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="px-4 py-2 hover:bg-teal-50 cursor-pointer text-sm"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SelectorInput = ({ value, onChange, placeholder, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  };

  const handleDoubleClick = async () => {
    if (value?.trim()) {
      await copyToClipboard(value);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(value?.toLowerCase() || "")
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onDoubleClick={handleDoubleClick}
            title="Double-click to copy selector"
            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400 font-mono text-sm"
            style={{ paddingRight: '35px' }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
        {copyFeedback && (
          <div style={{
            position: 'absolute',
            top: '-35px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#059669',
            color: 'white',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            animation: 'fadeInOut 1.5s ease',
            pointerEvents: 'none'
          }}>
            ✓ Copied!
          </div>
        )}
      </div>

      {isOpen && options.length > 0 && (
        <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              onDoubleClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await copyToClipboard(option);
              }}
              className="px-4 py-2 hover:bg-teal-50 cursor-pointer font-mono text-xs border-b border-gray-50 last:border-0"
              title="Click to select, Double-click to copy"
            >
              {option}
            </div>
          )) : (
            <div className="px-4 py-2 text-gray-400 text-xs italic">
              No matching selectors found in container
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Component
export default function EntityMappingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // State
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [existingSources, setExistingSources] = useState([]);
  const [sourcesDropdownOpen, setSourcesDropdownOpen] = useState(false);
  const sourcesDropdownRef = useRef(null);

  const [entities, setEntities] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [entityData, setEntityData] = useState({});
  const [entitiesDropdownOpen, setEntitiesDropdownOpen] = useState(false);
  const entitiesDropdownRef = useRef(null);

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewEntity, setPreviewEntity] = useState(null);
  const [previewCache, setPreviewCache] = useState({});
  const [isSubPreviewLoading, setIsSubPreviewLoading] = useState(false);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);

  // Feature state
  const [scanningSelectors, setScanningSelectors] = useState({});
  const [availableSelectors, setAvailableSelectors] = useState({});
  const [isGoogleMaps, setIsGoogleMaps] = useState(false);
  const [followLinksConfig, setFollowLinksConfig] = useState({});

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalMappingName, setOriginalMappingName] = useState(null);

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Refs for preventing multiple API calls
  const hasCheckedForMapping = useRef(false);

  // Effects
  useEffect(() => {
    const urlLower = url.toLowerCase();
    setIsGoogleMaps(urlLower.includes('google.com/maps') || urlLower.includes('maps.google.com'));
  }, [url]);

  // Fetch entities and create structure
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch(`${API_BASE}/entity/entities`, {
          method: "GET",
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        setEntities(data.entities.map((e) => e.name));

        // Create initial structure for all entities
        const initialStructure = {};
        data.entities.forEach((e) => {
          initialStructure[e.name] = {
            enabled: true,
            containerSelector: "",
            fields: e.columns
              .filter((col) => col !== "modified_at" && col !== "source" && col !== "id")
              .map((col) => ({
                attribute: col,
                selector: "",
                metadata: "text",
              })),
          };
        });

        // Only set initial data if no entity data exists yet
        setEntityData(prev => Object.keys(prev).length === 0 ? initialStructure : prev);
      } catch (err) {
        console.error("Error fetching entities:", err);
      }
    };
    fetchEntities();
  }, []);

  // Fetch existing sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch(`${API_BASE}/source/sources`, {
          method: "GET",
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        setExistingSources(data.sources || []);
      } catch (err) {
        console.error("Error fetching sources:", err);
      }
    };
    fetchSources();
  }, []);

  // Handle edit mode from navigation
  useEffect(() => {
    if (location.state?.editMode && location.state?.mappingData) {
      const mapping = location.state.mappingData;

      setIsEditMode(true);
      setOriginalMappingName(mapping.mapping_name);
      setSource(mapping.source_name);
      setUrl(mapping.url || "");
      setSelectedEntities([mapping.entity_name]);

      const fieldsArray = Object.entries(mapping.field_mappings || {}).map(([key, value]) => ({
        attribute: key,
        selector: value.selector || "",
        metadata: value.extract || "text"
      }));

      setEntityData(prev => ({
        ...prev,
        [mapping.entity_name]: {
          enabled: mapping.enabled ?? true,
          containerSelector: mapping.container_selector || "",
          fields: fieldsArray
        }
      }));

      if (mapping.follow_links?.length) {
        const followLinksData = mapping.follow_links.map(fl => ({
          name: fl.name,
          selectorField: fl.selector,
          fieldMappings: Object.entries(fl.field_mappings || {}).map(([key, value]) => ({
            attribute: key,
            selector: value.selector,
            extract: value.extract || "text"
          }))
        }));

        setFollowLinksConfig({
          [mapping.entity_name]: followLinksData
        });
      }
    }
  }, [location.state]);

  // Auto-load existing mapping when source and entity are selected
  useEffect(() => {
    const tryLoadExistingMapping = async () => {
      // Prevent multiple calls
      if (hasCheckedForMapping.current) return;
      if (!source || selectedEntities.length !== 1) return;

      const entity = selectedEntities[0];

      try {
        const res = await fetch(
          `${API_BASE}/mapping/get-mapping-by-source-entity?source_name=${encodeURIComponent(source)}&entity_name=${encodeURIComponent(entity)}`,
          { headers: { "ngrok-skip-browser-warning": "true" } }
        );

        if (res.status === 404) {
          hasCheckedForMapping.current = true;
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch mapping");

        const data = await res.json();
        const mapping = data.mapping;

        hasCheckedForMapping.current = true;

        setIsEditMode(true);
        setOriginalMappingName(mapping.mapping_name);
        setUrl(mapping.source_url || "");

        const fieldsArray = Object.entries(mapping.field_mappings || {}).map(
          ([key, value]) => ({
            attribute: key,
            selector: value.selector || "",
            metadata: value.extract || "text"
          })
        );

        setEntityData(prev => ({
          ...prev,
          [entity]: {
            enabled: mapping.enabled ?? true,
            containerSelector: mapping.container_selector || "",
            fields: fieldsArray
          }
        }));

        if (mapping.follow_links?.length) {
          setFollowLinksConfig({
            [entity]: mapping.follow_links.map(fl => ({
              name: fl.name,
              selectorField: fl.selector,
              fieldMappings: Object.entries(fl.field_mappings || {}).map(
                ([k, v]) => ({
                  attribute: k,
                  selector: v.selector,
                  extract: v.extract || "text"
                })
              )
            }))
          });
        }

        addNotification('info', 'Existing mapping found — loaded in edit mode.');
      } catch (err) {
        console.error("Auto-load mapping failed:", err);
        hasCheckedForMapping.current = true; // Mark as checked even on error
      }
    };

    tryLoadExistingMapping();
  }, [source, selectedEntities]);

  // Reset mapping check when source or entity changes
  useEffect(() => {
    hasCheckedForMapping.current = false;
  }, [source, selectedEntities]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sourcesDropdownRef.current && !sourcesDropdownRef.current.contains(e.target)) {
        setSourcesDropdownOpen(false);
      }
      if (entitiesDropdownRef.current && !entitiesDropdownRef.current.contains(e.target)) {
        setEntitiesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleReloadPreview = () => {
    setPreviewReloadKey(prev => prev + 1);
  };

  const handleEntityToggle = (entity) => {
    setSelectedEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  const handleFieldChange = (entity, attribute, key, value) => {
    setEntityData((prev) => {
      const cur = prev[entity];
      const updatedFields = cur.fields.map((f) =>
        f.attribute === attribute ? { ...f, [key]: value } : f
      );
      return { ...prev, [entity]: { ...cur, fields: updatedFields } };
    });
  };

  const handleSourceSelect = (selectedSource) => {
    setSource(selectedSource.name);
    setUrl(selectedSource.url);
    setSourcesDropdownOpen(false);
  };

  const isGoogleMapsSupported = (fieldName) => {
    const normalized = fieldName.toLowerCase().replace(/_/g, '');
    return Object.keys(GOOGLE_MAPS_FIELDS).some(key =>
      normalized.includes(key) || key.includes(normalized)
    );
  };

  const handleScanSelectors = async (entity) => {
    const container = entityData[entity]?.containerSelector;

    if (!url) {
      addNotification('error', 'Please enter a URL first.');
      return;
    }
    if (!container) {
      addNotification('error', 'Please enter a Container Selector first (e.g. li.product-item).');
      return;
    }

    setScanningSelectors(prev => ({ ...prev, [entity]: true }));

    try {
      const res = await fetch(`${API_BASE}/api/extract-selectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, container_selector: container })
      });

      const data = await res.json();

      if (data.success && data.selectors) {
        setAvailableSelectors(prev => ({
          ...prev,
          [entity]: data.selectors
        }));
      } else {
        addNotification('error', 'Failed to extract selectors.');
      }
    } catch (e) {
      console.error("Scanning failed", e);
      addNotification('error', 'Error connecting to selector extraction service.');
    } finally {
      setScanningSelectors(prev => ({ ...prev, [entity]: false }));
    }
  };

  // Follow Links Handlers
  const handleAddFollowLink = (entity) => {
    setFollowLinksConfig((prev) => {
      const entityLinks = prev[entity] || [];
      return {
        ...prev,
        [entity]: [
          ...entityLinks,
          { name: `detail_${entityLinks.length + 1}`, selectorField: "", fieldMappings: [] }
        ]
      };
    });
  };

  const handleRemoveFollowLink = (entity, index) => {
    setFollowLinksConfig((prev) => ({
      ...prev,
      [entity]: (prev[entity] || []).filter((_, i) => i !== index)
    }));
  };

  const handleFollowLinkChange = (entity, index, key, value) => {
    setFollowLinksConfig((prev) => {
      const updated = [...(prev[entity] || [])];
      updated[index] = { ...updated[index], [key]: value };
      return { ...prev, [entity]: updated };
    });
  };

  const handleUpdateFollowLinkField = (entity, linkIndex, fieldIndex, key, value) => {
    setFollowLinksConfig((prev) => {
      const updated = [...(prev[entity] || [])];
      const fieldMappings = [...(updated[linkIndex].fieldMappings || [])];
      const currentField = fieldMappings[fieldIndex] || {};

      if (key === 'attribute' && value) {
        const mainField = entityData[entity]?.fields.find(f => f.attribute === value);
        if (mainField) {
          fieldMappings[fieldIndex] = {
            attribute: value,
            selector: mainField.selector || "",
            extract: mainField.metadata || "text"
          };
        } else {
          fieldMappings[fieldIndex] = { ...currentField, [key]: value };
        }
      } else {
        fieldMappings[fieldIndex] = { ...currentField, [key]: value };
      }

      updated[linkIndex] = { ...updated[linkIndex], fieldMappings };
      return { ...prev, [entity]: updated };
    });
  };

  const handleRemoveFollowLinkField = (entity, linkIndex, fieldIndex) => {
    setFollowLinksConfig((prev) => {
      const updated = [...(prev[entity] || [])];
      updated[linkIndex] = {
        ...updated[linkIndex],
        fieldMappings: (updated[linkIndex].fieldMappings || []).filter((_, i) => i !== fieldIndex)
      };
      return { ...prev, [entity]: updated };
    });
  };

  // Preview Handlers
  const handlePreview = async (entity, step = 1) => {
    if (!source.trim() || !url.trim()) {
      addNotification('error', 'Source and URL are required!');
      return;
    }

    // Check cache first
    if (previewCache[entity]?.[step]) {
      setPreviewData(previewCache[entity][step]);
      setCurrentStep(step);
      return;
    }

    const entityInfo = entityData[entity];
    const field_mappings = {};
    let hasValidMappings = false;

    entityInfo.fields
      .filter((f) => f.attribute.toLowerCase() !== "id")
      .forEach((f) => {
        if (isGoogleMaps && isGoogleMapsSupported(f.attribute)) {
          field_mappings[f.attribute] = {
            selector: f.selector || "",
            extract: f.metadata || "text",
          };
          hasValidMappings = true;
        } else if (f.selector.trim()) {
          field_mappings[f.attribute] = {
            selector: f.selector,
            extract: f.metadata || "text",
          };
          hasValidMappings = true;
        }
      });

    if (!hasValidMappings) {
      addNotification('error', 'Add at least one field mapping!');
      return;
    }

    setPreviewLoading(true);
    setPreviewEntity(entity);

    try {
      const follow_links = (followLinksConfig[entity] || [])
        .filter((fl) => fl.name?.trim() && fl.selectorField?.trim())
        .map((fl) => ({
          name: fl.name.trim(),
          selector: fl.selectorField.trim(),
          field_mappings: (fl.fieldMappings || []).reduce((acc, fm) => {
            if (fm.attribute && fm.selector?.trim()) {
              acc[fm.attribute] = {
                selector: fm.selector.trim(),
                extract: fm.extract || "text"
              };
            }
            return acc;
          }, {})
        }))
        .filter((fl) => Object.keys(fl.field_mappings).length > 0);

      const res = await fetch(`${API_BASE}/task/preview-mapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          url,
          entity_name: entity,
          container_selector: entityInfo.containerSelector || null,
          field_mappings,
          follow_links,
          preview_step: step,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
        addNotification('error', `Preview failed (${res.status}): ${errorData.detail || errorData.message || res.statusText}`);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setPreviewCache(prev => ({
          ...prev,
          [entity]: { ...prev[entity], [step]: data }
        }));
        setPreviewData(data);
        setCurrentStep(step);
      } else {
        addNotification('error', `Preview failed: ${data.message}`);
      }
    } catch (err) {
      addNotification('error', `Preview error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleNextStep = async () => {
    setIsSubPreviewLoading(true);
    await handlePreview(previewEntity, currentStep + 1);
    setIsSubPreviewLoading(false);
  };

  const handlePreviousStep = async () => {
    setIsSubPreviewLoading(true);
    await handlePreview(previewEntity, currentStep - 1);
    setIsSubPreviewLoading(false);
  };

  const handleModalClose = () => {
    setPreviewCache({});
    setPreviewData(null);
    setCurrentStep(1);
  };

  // Save Handler
  const handleSave = async () => {
    if (!source.trim() || !url.trim()) {
      addNotification('error', 'Source and URL required!');
      return;
    }

    const entity_mappings = selectedEntities.map((entity) => {
      const container_selector = entityData[entity]?.containerSelector || null;
      const field_mappings = {};

      entityData[entity]?.fields
        .filter((f) => f.attribute.toLowerCase() !== "id")
        .forEach((f) => {
          if (isGoogleMaps && isGoogleMapsSupported(f.attribute)) {
            field_mappings[f.attribute] = {
              selector: f.selector || "",
              extract: f.metadata || "text",
            };
          } else if (f.selector) {
            field_mappings[f.attribute] = {
              selector: f.selector,
              extract: f.metadata || "text",
            };
          }
        });

      const follow_links = (followLinksConfig[entity] || [])
        .filter((fl) => fl.name?.trim() && fl.selectorField?.trim())
        .map((fl) => ({
          name: fl.name.trim(),
          selector: fl.selectorField.trim(),
          field_mappings: (fl.fieldMappings || []).reduce((acc, fm) => {
            if (fm.attribute && fm.selector?.trim()) {
              acc[fm.attribute] = {
                selector: fm.selector.trim(),
                extract: fm.extract || "text"
              };
            }
            return acc;
          }, {})
        }))
        .filter((fl) => Object.keys(fl.field_mappings).length > 0);

      return {
        entity_name: entity,
        container_selector,
        field_mappings,
        follow_links: follow_links.length > 0 ? follow_links : undefined,
        enabled: entityData[entity]?.enabled !== false,
      };
    });

    try {
      let res;

      if (isEditMode && originalMappingName) {
        const payload = {
          mapping_name: originalMappingName,
          source,
          url,
          entity_mappings
        };

        res = await fetch(`${API_BASE}/mapping/edit-mapping/${encodeURIComponent(originalMappingName)}`, {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/mapping/save-entity-mapping`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({ source, url, entity_mappings }),
        });
      }

      const data = await res.json();
      if (data.success) {
        addNotification('success', isEditMode ? 'Mapping updated successfully!' : data.message);
        queryClient.invalidateQueries({ queryKey: ['mappings'] });
        if (isEditMode) {
          navigate('/mappingmanager');
        }
      } else {
        throw new Error(data.detail || "Save failed");
      }
    } catch (err) {
      addNotification('error', `Failed: ${err.message}`);
    }
  };

  // Render
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#C7D8ED',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <NotificationPanel notifications={notifications} onRemove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />

      {/* Left Panel - Configuration */}
      <div style={{ width: '50%', height: '100%', overflowY: 'auto', padding: '20px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
          padding: '40px',
          borderTop: '8px solid #49A3C4'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                backgroundColor: 'white',
                color: '#00364A',
                borderRadius: '12px',
                border: '2px solid #00364A',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#00364A';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#00364A';
              }}
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={18} />
            </button>

            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              textAlign: 'center',
              color: '#00364A',
              marginBottom: '20px'
            }}>
              {isEditMode ? 'Edit Entity Mapping' : 'Entity Mapping Configuration'}
            </h1>
          </div>

          {/* Edit Mode Banner */}
          {isEditMode && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 20px',
              backgroundColor: '#FEF3C7',
              borderLeft: '4px solid #F59E0B',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <Info size={18} color="#D97706" />
              <div>
                <p style={{ fontWeight: '700', color: '#92400E', margin: 0, fontSize: '14px' }}>
                  Edit Mode: {originalMappingName}
                </p>
                <p style={{ fontSize: '13px', color: '#92400E', margin: '4px 0 0 0' }}>
                  Make your changes and save to update the mapping.
                </p>
              </div>
            </div>
          )}

          {/* Google Maps Banner */}
          {isGoogleMaps && (
            <div style={{
              marginBottom: '25px',
              padding: '15px 20px',
              backgroundColor: '#E0F2FE',
              borderLeft: '4px solid #49A3C4',
              borderRadius: '8px',
              display: 'flex',
              gap: '12px'
            }}>
              <Info size={20} color="#00364A" style={{ marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: '700', color: '#00364A', margin: '0 0 5px 0' }}>Google Maps Detected</p>
                <p style={{ fontSize: '14px', color: '#00364A', opacity: 0.8, margin: 0 }}>
                  For supported fields, you can leave selectors empty for auto-extraction.
                </p>
              </div>
            </div>
          )}

          {/* Source and URL Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '30px' }}>
            {/* Source Dropdown */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#00364A', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase' }}>
                Source
              </label>
              <div style={{ position: 'relative' }} ref={sourcesDropdownRef}>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  onFocus={() => setSourcesDropdownOpen(true)}
                  placeholder="Enter or select source"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'rgba(73, 163, 196, 0.15)',
                    color: '#00364A',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={() => setSourcesDropdownOpen(!sourcesDropdownOpen)}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#00364A',
                    cursor: 'pointer',
                    opacity: 0.5
                  }}
                >
                  {sourcesDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {sourcesDropdownOpen && existingSources.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    marginTop: '8px',
                    width: '100%',
                    backgroundColor: 'white',
                    border: '1px solid rgba(0, 54, 74, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 54, 74, 0.1)',
                    zIndex: 30,
                    maxHeight: '240px',
                    overflowY: 'auto'
                  }}>
                    {existingSources.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSourceSelect(s)}
                        style={{
                          padding: '12px 20px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          color: '#00364A',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* URL Input */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#00364A', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase' }}>
                URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL"
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'rgba(73, 163, 196, 0.15)',
                  color: '#00364A',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Entity Selection */}
          <div style={{ marginBottom: '30px', position: 'relative' }} ref={entitiesDropdownRef}>
            <label style={{ display: 'block', marginBottom: '16px', color: '#00364A', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase' }}>
              Select Entities
            </label>
            <div
              onClick={() => setEntitiesDropdownOpen(!entitiesDropdownOpen)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(73, 163, 196, 0.15)',
                border: 'none',
                cursor: 'pointer',
                color: '#00364A',
                fontWeight: '500',
                boxSizing: 'border-box'
              }}
            >
              <span>{selectedEntities.length > 0 ? selectedEntities.join(", ") : "Choose entities..."}</span>
              <ChevronDown size={20} />
            </div>

            {entitiesDropdownOpen && (
              <div style={{
                position: 'absolute',
                marginTop: '8px',
                width: '100%',
                backgroundColor: 'white',
                border: '1px solid rgba(0, 54, 74, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0, 54, 74, 0.1)',
                zIndex: 20
              }}>
                {entities.map((entity) => (
                  <label
                    key={entity}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      color: '#00364A'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEntityToggle(entity);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEntities.includes(entity)}
                      readOnly
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#49A3C4'
                      }}
                    />
                    <span>{entity}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Entity Configuration Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {selectedEntities.map((entity) => (
              <div
                key={entity}
                style={{
                  padding: '25px',
                  borderRadius: '20px',
                  border: `2px solid ${entityData[entity]?.enabled ? 'rgba(0, 54, 74, 0.1)' : 'rgba(0, 54, 74, 0.05)'}`,
                  backgroundColor: entityData[entity]?.enabled ? '#F8FBFF' : '#F3F4F6',
                  opacity: entityData[entity]?.enabled ? 1 : 0.75,
                  boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)'
                }}
              >
                {/* Entity Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', color: entityData[entity]?.enabled ? '#00364A' : '#6B7280', margin: 0 }}>
                    {entity}
                  </h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handlePreview(entity, 1)}
                      disabled={previewLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: '#49A3C4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '14px',
                        cursor: previewLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s'
                      }}
                    >
                      <Eye size={16} />
                      {previewLoading && previewEntity === entity ? 'Loading..' : 'Preview'}
                    </button>
                  </div>
                </div>

                {/* Container Selector (non-Google Maps) */}
                {!isGoogleMaps && (
                  <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#00364A', marginBottom: '8px', textTransform: 'uppercase' }}>
                      CONTAINER SELECTOR
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        placeholder=".class or #main"
                        value={entityData[entity]?.containerSelector || ""}
                        onChange={(e) =>
                          setEntityData((prev) => ({
                            ...prev,
                            [entity]: { ...prev[entity], containerSelector: e.target.value },
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1px solid rgba(0, 54, 74, 0.15)',
                          outline: 'none',
                          color: '#00364A'
                        }}
                      />
                      <button
                        onClick={() => handleScanSelectors(entity)}
                        disabled={scanningSelectors[entity]}
                        style={{
                          padding: '0 16px',
                          backgroundColor: '#E0F2FE',
                          color: '#00364A',
                          borderRadius: '12px',
                          border: '1px solid #49A3C4',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Scan for available elements inside this container"
                      >
                        {scanningSelectors[entity] ? (
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid #00364A',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        ) : (
                          <Search size={20} />
                        )}
                      </button>
                    </div>
                    {availableSelectors[entity] && (
                      <p style={{ fontSize: '12px', color: '#059669', marginTop: '8px', fontWeight: '600' }}>
                        ✓ Found {availableSelectors[entity].length} possible child elements
                      </p>
                    )}
                  </div>
                )}

                {/* Field Mappings */}
                {entityData[entity]?.fields
                  .filter((field) => field.attribute.toLowerCase() !== "id")
                  .map((field) => {
                    const isSupported = isGoogleMaps && isGoogleMapsSupported(field.attribute);
                    return (
                      <div key={`${entity}-${field.attribute}`} style={{ marginBottom: '15px' }}>
                        {isSupported && (
                          <div style={{ fontSize: '12px', color: '#059669', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                            <Info size={12} />
                            Google Maps auto-extract available
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                          <input
                            value={field.attribute}
                            disabled
                            style={{
                              padding: '12px 16px',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(0, 54, 74, 0.05)',
                              border: '1px solid rgba(0, 54, 74, 0.1)',
                              color: '#00364A',
                              fontSize: '14px',
                              fontWeight: '600'
                            }}
                          />

                          <SelectorInput
                            placeholder={isSupported ? "Auto (or custom CSS)" : "CSS Selector"}
                            value={field.selector}
                            onChange={(val) => handleFieldChange(entity, field.attribute, "selector", val)}
                            options={availableSelectors[entity] || []}
                          />

                          <MetadataInput
                            value={field.metadata}
                            onChange={(val) => handleFieldChange(entity, field.attribute, "metadata", val)}
                            options={METADATA_OPTIONS}
                          />
                        </div>
                      </div>
                    );
                  })}

                {/* Follow Links Section */}
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#F0F9FF', borderRadius: '12px', border: '2px solid #49A3C4' }}>
                  {/* Follow Links Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', margin: 0 }}>
                        Multi-Page Scraping
                      </h3>
                      <p style={{ fontSize: '12px', color: '#00364A', opacity: 0.7, marginTop: '4px' }}>
                        Extract data from detail pages linked from the listing page
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddFollowLink(entity)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#49A3C4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      + Add Detail Page
                    </button>
                  </div>

                  {/* Follow Links Instructions */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#E0F2FE',
                    borderRadius: '10px',
                    border: '1px solid #49A3C4',
                    borderLeft: '4px solid #49A3C4'
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <Info size={20} color="#00364A" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#00364A', margin: '0 0 8px 0' }}>
                          How to Configure Multi-Page Scraping:
                        </h4>
                        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#00364A', lineHeight: '1.8' }}>
                          <li style={{ marginBottom: '6px' }}>
                            <strong>Click "Add Detail Page"</strong> below to add a new detail page configuration.
                          </li>
                          <li style={{ marginBottom: '6px' }}>
                            <strong>Enter the Link CSS Selector:</strong> Enter the CSS selector for the link element.
                          </li>
                          <li style={{ marginBottom: '6px' }}>
                            <strong>Add fields to extract from detail pages:</strong> Select attributes and their selectors.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Follow Links List */}
                  {(followLinksConfig[entity] || []).map((fl, flIndex) => (
                    <div key={flIndex} style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #49A3C4' }}>
                      {/* Follow Link Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ flex: 1, marginRight: '15px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#00364A', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Link Name
                          </label>
                          <input
                            type="text"
                            value={fl.name}
                            onChange={(e) => handleFollowLinkChange(entity, flIndex, 'name', e.target.value)}
                            placeholder="e.g., profile, detail"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid rgba(0, 54, 74, 0.2)',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, marginRight: '15px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#00364A', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Link CSS Selector
                          </label>
                          <SelectorInput
                            placeholder="e.g., a.profile-link"
                            value={fl.selectorField || ""}
                            onChange={(val) => handleFollowLinkChange(entity, flIndex, 'selectorField', val)}
                            options={availableSelectors[entity] || []}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveFollowLink(entity, flIndex)}
                          style={{
                            padding: '10px',
                            backgroundColor: '#EF4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            alignSelf: 'flex-end'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Follow Link Fields */}
                      <div style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#00364A', marginBottom: '10px', textTransform: 'uppercase' }}>
                          Fields to Extract from Detail Page
                        </label>
                        {(fl.fieldMappings || []).map((fm, fmIndex) => (
                          <div key={fmIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <select
                              value={fm.attribute || ""}
                              onChange={(e) => handleUpdateFollowLinkField(entity, flIndex, fmIndex, 'attribute', e.target.value)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 54, 74, 0.2)',
                                fontSize: '13px'
                              }}
                            >
                              <option value="">Select attribute...</option>
                              {entityData[entity]?.fields
                                .filter((f) => f.attribute.toLowerCase() !== "id")
                                .map((f) => (
                                  <option key={f.attribute} value={f.attribute}>
                                    {f.attribute}{f.selector?.trim() ? ' ✓' : ''}
                                  </option>
                                ))}
                            </select>

                            <SelectorInput
                              placeholder="CSS Selector"
                              value={fm.selector || ""}
                              onChange={(val) => handleUpdateFollowLinkField(entity, flIndex, fmIndex, 'selector', val)}
                              options={availableSelectors[entity] || []}
                            />

                            <MetadataInput
                              value={fm.extract || "text"}
                              onChange={(val) => handleUpdateFollowLinkField(entity, flIndex, fmIndex, 'extract', val)}
                              options={METADATA_OPTIONS}
                            />

                            <button
                              onClick={() => handleRemoveFollowLinkField(entity, flIndex, fmIndex)}
                              style={{
                                padding: '8px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => {
                            const updated = [...(fl.fieldMappings || []), { attribute: "", selector: "", extract: "text" }];
                            handleFollowLinkChange(entity, flIndex, 'fieldMappings', updated);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#E0F2FE',
                            color: '#00364A',
                            border: '1px solid #49A3C4',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          + Add Field
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {(followLinksConfig[entity] || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280', fontSize: '14px' }}>
                      <AlertTriangle size={24} color="#F59E0B" style={{ marginBottom: '8px' }} />
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#374151' }}>No detail pages configured yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {selectedEntities.length > 0 && (
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '16px 40px',
                  backgroundColor: '#00364A',
                  color: 'white',
                  borderRadius: '15px',
                  boxShadow: '0 8px 20px rgba(0, 54, 74, 0.25)',
                  fontWeight: '800',
                  fontSize: '18px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                {isEditMode ? 'Update Mapping' : 'Save Configuration'}
              </button>
              <button
                onClick={() => navigate('/mappingmanager')}
                style={{
                  padding: '16px 40px',
                  backgroundColor: '#E0F2FE',
                  color: '#00364A',
                  borderRadius: '15px',
                  boxShadow: '0 8px 20px rgba(0, 54, 74, 0.1)',
                  fontWeight: '800',
                  fontSize: '18px',
                  border: '2px solid #49A3C4',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Go to Mappings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div style={{ width: '50%', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          backgroundColor: 'white',
          width: '100%',
          flexGrow: 1,
          borderRadius: '25px',
          boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
          borderTop: '8px solid #49A3C4',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <SmartWebsitePreview
            key={previewReloadKey}
            url={url}
            onSelectorSelected={() => { }} // Empty handler since we're not using it
          />
        </div>
      </div>

      {/* Preview Modal */}
      {previewData && (
        <PreviewModal
          data={previewData}
          onClose={handleModalClose}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
          currentStep={currentStep}
          isLoading={isSubPreviewLoading}
        />
      )}

      {/* Styles */}
      <style>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          20% { opacity: 1; transform: translate(-50%, 0); }
          80% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      `}</style>
    </div>
  );
}