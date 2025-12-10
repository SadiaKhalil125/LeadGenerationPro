import React, { useState, useEffect, useRef } from "react";
import { Eye, ArrowRight, ArrowRightCircle, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Info, AlertTriangle, Code } from "lucide-react";
import ServerHtmlPreview from "./ServerHtmlPreview";

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
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
    <div className="flex h-screen bg-gray-50">
      <div className="w-1/2 h-full overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl border-t-8 border-teal-400 p-10">
          <h1 className="text-3xl font-bold text-center text-gray-700 mb-8">
            Entity Mapping Configuration
          </h1>

          {isGoogleMaps && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg flex gap-3">
              <Info className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="font-semibold text-blue-800">Google Maps Detected</p>
                <p className="text-sm text-blue-700 mt-1">
                  For supported fields, you can leave selectors empty for auto-extraction.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div>
              <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">Source</label>
              <div className="relative" ref={sourcesDropdownRef}>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  onFocus={() => setSourcesDropdownOpen(true)}
                  placeholder="Enter or select source"
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
                />
                <button
                  onClick={() => setSourcesDropdownOpen(!sourcesDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {sourcesDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {sourcesDropdownOpen && existingSources.length > 0 && (
                  <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto">
                    {existingSources.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSourceSelect(s)}
                        className="px-4 py-3 hover:bg-teal-50 cursor-pointer"
                      >
                        <p className="font-semibold">{s.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL"
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div className="mb-8 relative" ref={entitiesDropdownRef}>
            <label className="block mb-4 text-gray-700 font-semibold text-sm uppercase">
              Select Entities
            </label>
            <div
              onClick={() => setEntitiesDropdownOpen(!entitiesDropdownOpen)}
              className="flex justify-between items-center w-full p-4 rounded-xl bg-gray-50 border border-gray-300 cursor-pointer"
            >
              <span>{selectedEntities.length > 0 ? selectedEntities.join(", ") : "Choose entities..."}</span>
              <ChevronDown className="w-5 h-5" />
            </div>

            {entitiesDropdownOpen && (
              <div className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg z-20">
                {entities.map((entity) => (
                  <label
                    key={entity}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEntityToggle(entity);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEntities.includes(entity)}
                      readOnly
                      className="h-5 w-5 accent-teal-500"
                    />
                    <span>{entity}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {selectedEntities.map((entity) => (
              <div 
                key={entity} 
                className={`p-6 rounded-2xl border shadow-md ${
                  entityData[entity]?.enabled 
                    ? 'border-gray-200 bg-gray-50' 
                    : 'border-gray-300 bg-gray-100 opacity-75'
                }`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-2xl font-bold ${entityData[entity]?.enabled ? 'text-gray-800' : 'text-gray-500'}`}>
                    {entity}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(entity, 1)}
                      className="flex items-center gap-2 px-4 py-2 font-bold bg-gradient-to-b from-cyan-600 to-cyan-600 text-white rounded-lg shadow-sm hover:from-cyan-500 hover:to-cyan-600"
                      disabled={previewLoading}
                      title="Fetch some items from source to test mappings"
                    >
                      <Eye size={16} />
                      {previewLoading && previewEntity === entity ? 'Loading..' : 'Preview'}
                    </button>
                    
                  </div>
                </div>

                {!isGoogleMaps && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      CONTAINER SELECTOR
                    </label>
                    <div className="flex gap-2">
                        <input
                        placeholder=".class or #main"
                        value={entityData[entity]?.containerSelector || ""}
                        onChange={(e) =>
                            setEntityData((prev) => ({
                            ...prev,
                            [entity]: { ...prev[entity], containerSelector: e.target.value },
                            }))
                        }
                        className="flex-grow p-3 rounded-xl bg-white border border-gray-300 focus:ring-2 focus:ring-teal-400"
                        />
                        <button
                            onClick={() => handleScanSelectors(entity)}
                            disabled={scanningSelectors[entity]}
                            className="px-4 bg-gradient-to-b from-sky-100 to-sky-100 text-teal-900 rounded-xl border border-teal-300 flex items-center justify-center transition-colors"
                            title="Scan for available elements inside this container"
                        >
                            {scanningSelectors[entity] ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-700"></div>
                            ) : (
                                <Search size={20} />
                            )}
                        </button>
                    </div>
                    {availableSelectors[entity] && (
                        <p className="text-xs text-green-600 mt-2">
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
                      <div key={`${entity}-${field.attribute}`} className="mb-4">
                        {isSupported && (
                          <div className="text-xs text-green-600 mb-1 flex items-center gap-1">
                            <Info size={12} />
                            Google Maps auto-extract available
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-4">
                          <input
                            value={field.attribute}
                            disabled
                            className="p-3 rounded-xl bg-gray-200 border border-gray-300 text-gray-600"
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
            <div className="mt-10 flex justify-center gap-6">
              <button
                onClick={handleSave}
                className="px-16 py-5 bg-gradient-to-b from-teal-500 to-teal-600 text-white rounded-2xl shadow-xl font-bold text-xl hover:scale-105 transition-all"
              >
                Save Configuration
              </button>
              <button
                onClick={() => window.location.href = "/mappingmanager"}
                className="px-16 py-5 bg-gradient-to-b from-gray-200 to-gray-300 text-teal-900 rounded-2xl shadow-xl font-extrabold text-xl hover:scale-105 transition-all"
              >
                Go to Mappings
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-1/2 h-full p-8 flex flex-col">
        <div className="bg-white w-full flex-grow rounded-2xl shadow-xl border-t-8 border-blue-400 overflow-hidden">
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
    </div>
  );
}