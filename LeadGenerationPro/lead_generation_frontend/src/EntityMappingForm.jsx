import React, { useState, useEffect, useRef} from "react";
import { Eye, ArrowRight, ArrowLeft, ArrowRightCircle, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Info, AlertTriangle, Code, RefreshCw } from "lucide-react";
import ServerHtmlPreview from "./ServerHtmlPreview";
import { useNavigate } from "react-router-dom";
import API_BASE from "./api_base";

// Point this to your new Python API URL
const PYTHON_API_URL = "http://localhost:8000"; 

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

const PreviewModal = ({ data, onClose, onNext, onPrevious, currentStep, isLoading = false }) => {
  if (!data) return null;
  const headers = data.data && data.data.length > 0 ? Object.keys(data.data[0]) : [];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section (Title and Close 'X' button) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-teal-700">
              Preview: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{data.entity_name}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`p-2 rounded-full transition-colors ${isLoading ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
          >
            <X size={24} className={`${isLoading ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Content Body (Message and Table) */}
        <div className="px-6 py-3 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading next preview data...</p>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep+1}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="font-semibold text-teal-800">{data.message}</p>
                <p className="text-sm text-teal-600 mt-1">
                  Showing {data.data?.length || 0} items of {data.total_items} total.
                </p>
              </div>

              {data.data && data.data.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-xs text-gray-800 uppercase">
                      <tr>
                        {headers.map(header => (
                          <th key={header} className="px-6 py-3 font-semibold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((item, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                          {headers.map(header => (
                            <td key={`${index}-${header}`} className="px-6 py-4">
                              {String(item[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500">No data returned.</p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer - Buttons grouped and aligned to the Far Right */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-2">
            {/* Previous Button */}
            <button
              onClick={onPrevious}
              disabled={currentStep <= 1 || isLoading}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                currentStep <= 1 || isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-black'
              }`}
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            
            {/* Next Button */}
            <button
              onClick={onNext}
              disabled={isLoading}
              className={`px-4 py-2 text-black font-medium rounded-lg flex items-center gap-2 transition-colors ${
                isLoading
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-black'
              }`}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Input with Dropdown for Metadata
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

// New Component: CSS Selector Input with Autocomplete from Backend
const SelectorInput = ({ value, onChange, placeholder, options = [] }) => {
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

  // Filter options based on what user is typing (optional, but nice)
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value?.toLowerCase() || "")
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
      >
        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {isOpen && options.length > 0 && (
        <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
           {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <div
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="px-4 py-2 hover:bg-teal-50 cursor-pointer font-mono text-xs border-b border-gray-50 last:border-0"
            >
              {option}
            </div>
          )) : (
             <div className="px-4 py-2 text-gray-400 text-xs italic">No matching selectors found in container</div>
          )}
        </div>
      )}
    </div>
  );
};


export default function EntityMappingScreen() {
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
  
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Track current preview step
  const [previewEntity, setPreviewEntity] = useState(null);
  const [previewCache, setPreviewCache] = useState({}); // entity_name: {step1: data, step2: data, ...}
  const [isSubPreviewLoading, setIsSubPreviewLoading] = useState(false);
  const navigate = useNavigate();
  // New State for Selectors Scanning
  const [scanningSelectors, setScanningSelectors] = useState({}); // { entityName: boolean }
  const [availableSelectors, setAvailableSelectors] = useState({}); // { entityName: string[] }

  const [isGoogleMaps, setIsGoogleMaps] = useState(false);

  useEffect(() => {
    const urlLower = url.toLowerCase();
    setIsGoogleMaps(urlLower.includes('google.com/maps') || urlLower.includes('maps.google.com'));
  }, [url]);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch(`${API_BASE}/entity/entities`,{
          method: "GET",
          headers: {"ngrok-skip-browser-warning": "true"}
        });
        const data = await res.json();
        setEntities(data.entities.map((e) => e.name));
        
        const initialData = {};
        data.entities.forEach((e) => {
          initialData[e.name] = {
            enabled: true,
            containerSelector: "",
            fields: e.columns.filter((col) => col !== "modified_at" && col !== "source").map((col) => ({
              attribute: col,
              selector: "",
              metadata: "text",
            })),
          };
        });
        setEntityData(initialData);
      } catch (err) {
        console.error("Error fetching entities:", err);
      }
    };
    fetchEntities();
  }, []);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch(`${API_BASE}/source/sources`, {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        });
        const data = await res.json();
        setExistingSources(data.sources || []);
      } catch (err) {
        console.error("Error fetching sources:", err);
      }
    };
    fetchSources();
  }, []);

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

  // --- NEW FUNCTION: Fetch Child Selectors ---
  const handleScanSelectors = async (entity) => {
    const container = entityData[entity]?.containerSelector;
    
    if (!url) {
        alert("Please enter a URL first.");
        return;
    }
    if (!container) {
        alert("Please enter a Container Selector first (e.g. li.product-item).");
        return;
    }

    setScanningSelectors(prev => ({ ...prev, [entity]: true }));

    try {
        const res = await fetch(`${PYTHON_API_URL}/api/extract-selectors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: url,
                container_selector: container
            })
        });
        
        const data = await res.json();
        
        if (data.success && data.selectors) {
            setAvailableSelectors(prev => ({
                ...prev,
                [entity]: data.selectors
            }));
            // alert(`Found ${data.selectors.length} unique elements inside the container.`);
        } else {
            alert("Failed to extract selectors.");
        }

    } catch (e) {
        console.error("Scanning failed", e);
        alert("Error connecting to selector extraction service.");
    } finally {
        setScanningSelectors(prev => ({ ...prev, [entity]: false }));
    }
  };

  const handlePreview = async (entity, step = 1) => {
    if (!source.trim() || !url.trim()) {
      alert("Source and URL are required!");
      return;
    }
    console.log("Previewing entity:", entity, "at step:", step);
    if (previewCache[entity]?.[step]) {
      console.log("Using cached preview data for", entity, "step", step);
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
      alert("Add at least one field mapping!");
      return;
    }

    setPreviewLoading(true);
    setPreviewEntity(entity);

    try {
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
          preview_step: step, // Send the step parameter
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Cache the result
        console.log("Caching preview data for", entity, "step", step);
        setPreviewCache(prev => ({
          ...prev,
          [entity]: {
            ...prev[entity],
            [step]: data
          }
        }));
        setPreviewData(data);
        setCurrentStep(step); // Update current step
      } else {
        alert(`Preview failed: ${data.message}`);
      }
    } catch (err) {
      alert(`Preview error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // Update handleNextStep and handlePreviousStep
  const handleNextStep = async () => {
    setIsSubPreviewLoading(true);
    await handlePreview(previewEntity, currentStep + 1); // Your existing onNext function
    setIsSubPreviewLoading(false);
  };

  const handlePreviousStep = async () => {
    setIsSubPreviewLoading(true);
    await handlePreview(previewEntity, currentStep - 1); // Your existing onPrevious function
    setIsSubPreviewLoading(false);
  };

  // Update your modal onClose handler
  const handleModalClose = () => {
    setPreviewCache({}); // Clear all cached preview data
    setPreviewData(null);
    setCurrentStep(1);
  };
  const handleSave = async () => {
    if (!source.trim() || !url.trim()) {
      alert("Source and URL required!");
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

      return {
        entity_name: entity,
        container_selector,
        field_mappings,
        enabled: entityData[entity]?.enabled !== false,
      };
    });

    try {
      const res = await fetch(`${API_BASE}/mapping/save-entity-mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "ngrok-skip-browser-warning": "true"
         },
        body: JSON.stringify({ source, url, entity_mappings }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
      } else {
        throw new Error(data.detail || "Save failed");
      }
    } catch (err) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#C7D8ED',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Left Panel - Configuration */}
      <div style={{
        width: '50%',
        height: '100%',
        overflowY: 'auto',
        padding: '30px'
      }}>
        
        <div style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
          padding: '40px',
          borderTop: '8px solid #49A3C4'
        }}>
          <div
          style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
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
            Entity Mapping Configuration
          </h1>
          </div>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#00364A', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase' }}>Source</label>
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

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#00364A', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase' }}>URL</label>
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
                          border: 'none',
                          backgroundColor: 'white',
                          border: '1px solid rgba(0, 54, 74, 0.15)',
                          outline: 'none',
                          color: '#00364A'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#49A3C4'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(0, 54, 74, 0.15)'}
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
                                }}></div>
                            ) : (
                                <Search size={20} />
                            )}
                        </button>
                    </div>
                    {availableSelectors[entity] && (
                        <p style={{ fontSize: '12px', color: '#059669', marginTop: '8px', fontWeight: '600' }}>
                            ✓ Found {availableSelectors[entity].length} possible child elements. Use dropdowns below.
                        </p>
                    )}
                  </div>
                )}

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
                          
                          {/* Use the new SelectorInput here */}
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
              </div>
            ))}
          </div>

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
                Save Configuration
              </button>
              <button
                onClick={() => window.location.href = "/mappingmanager"}
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
      <div style={{
        width: '50%',
        height: '100%',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          backgroundColor: 'white',
          width: '100%',
          flexGrow: 1,
          borderRadius: '25px',
          boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
          borderTop: '8px solid #49A3C4',
          overflow: 'hidden'
        }}>
          <ServerHtmlPreview url={url} />
        </div>
      </div>
      
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
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}