import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Globe, 
  Database, 
  Eye, 
  Play, 
  Download, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Code,
  Layers,
  Settings,
  Plus,
  Trash2,
  ArrowRightCircle,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { FaPaperPlane } from "react-icons/fa";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ServerHtmlPreview from "./ServerHtmlPreview";
import API_BASE from "./api_base";
import Header from "./components/Header";

// Point this to your Python API URL
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

/* --- Helper Components Styled --- */

const PreviewModal = ({ data, onClose, onNext, onPrevious, currentStep, isLoading = false }) => {
  if (!data) return null;
  
  // Dynamically get all headers from all rows (not just the first row)
  // This ensures we capture all columns even when following links or pagination changes columns
  const getAllHeaders = () => {
    if (!data.data || data.data.length === 0) return [];
    const headerSet = new Set();
    data.data.forEach(row => {
      Object.keys(row).forEach(key => headerSet.add(key));
    });
    return Array.from(headerSet);
  };
  
  const headers = getAllHeaders();
  const isFirstStep = currentStep <= 1;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-[#00364A]/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Keeps QuickExtract styling */}
        <div className="flex justify-between items-center px-6 py-3 border-b border-gray-100">
          <div className="flex justify-between horizontal gap-4 items-center">
            <h2 className="text-2xl font-bold text-[#00364A]">Data Preview</h2>
            <span className="text-xs bg-[#49A3C4]/10 text-[#49A3C4] px-2 py-1 rounded-full">
                Step {currentStep}
            </span>
         
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`p-2 rounded-full transition-colors ${isLoading ? 'cursor-not-allowed' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
          >
            <X size={20} className={isLoading ? 'text-gray-300' : ''} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-3 overflow-y-auto bg-gray-50/50 flex-grow">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#49A3C4]"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading next preview data...</p>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep+1}</p>
            </div>
          ) : (
            <>
              {/* Success Message - QuickExtract styling */}
              <div className="mb-3 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <CheckCircle className="text-[#49A3C4] mt-1 shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-[#00364A]">{data.message}</p>
                  <p className="text-sm text-[#49A3C4]">
                    Showing {data.data?.length || 0} of {data.total_items} total items found.
                    
                  </p>
                </div>
              </div>

              {/* Table - Keeps QuickExtract styling */}
              {data.data && data.data.length > 0 ? (
                <div className="overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="bg-[#00364A] text-white text-xs uppercase tracking-wider">
                        <tr>
                          {headers.map(header => (
                            <th key={header} className="px-6 py-4 font-medium whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.data.map((item, index) => (
                          <tr key={index} className="text-gray-900 hover:bg-blue-50/50 transition-colors">
                            {headers.map(header => (
                              <td key={`${index}-${header}`} className="px-6 py-4 whitespace-nowrap">
                                {String(item[header])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <Database className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No data returned for this preview.</p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer - Added Next/Previous buttons with QuickExtract styling */}
        <div className="flex justify-between items-center px-7 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
          <div>
            {currentStep > 1 && (
              <span className="text-sm text-gray-600">Page {currentStep}</span>
            )}
          </div>
          
          <div className="flex gap-3">
            {/* Previous Button */}
            {onPrevious && (
              <button
                onClick={onPrevious}
                disabled={isFirstStep || isLoading}
                className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  isFirstStep || isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-[#00364A]/20'
                }`}
              >
                <ChevronLeft size={18} />
                Prev
              </button>
            )}
            
           
            {/* Next Button */}
            {onNext && (
              <button
                onClick={onNext}
                disabled={isLoading}
                className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-[#00364A]/90'
                }`}
              >
                Next
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetadataInput = ({ value, onChange, options, className = "" }) => {
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

  // Determine padding based on className prop or default
  const paddingClass = className.includes("p-") ? "" : "p-2.5";
  const finalClassName = className || paddingClass;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        className="relative group cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`w-full ${finalClassName} bg-white border rounded-lg text-sm flex items-center justify-between transition-all duration-200 ${isOpen ? 'border-[#49A3C4] ring-2 ring-[#49A3C4]/20' : 'border-gray-200 hover:border-gray-300'}`}>
          <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>
            {value || "Select Type"}
          </span>
          {isOpen ? <ChevronUp size={14} className="text-[#49A3C4] flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
        </div>
      </div>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1">
            {options.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${value === option ? 'bg-blue-50 text-[#00364A] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- NEW COMPONENT: CSS Selector Input with Autocomplete ---
const SelectorInput = ({ value, onChange, placeholder, options = [], className }) => {
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

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(value?.toLowerCase() || "")
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className={className} 
      />
      {options.length > 0 && (
         <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#49A3C4]"
         >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
         </button>
      )}

      {isOpen && options.length > 0 && (
        <div className="absolute mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
           {filteredOptions.length > 0 ? (
             <div className="p-1">
               {filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer font-mono text-xs text-gray-700 rounded-lg border-b border-gray-50 last:border-0"
                >
                  {option}
                </div>
               ))}
             </div>
           ) : (
             <div className="px-4 py-3 text-gray-400 text-xs italic text-center">No matching selectors found in container</div>
          )}
        </div>
      )}
    </div>
  );
};


/* --- Main Component --- */

export default function QuickExtract() {
  const location = useLocation();
  // --- STATE ---
  const [url, setUrl] = useState("");
  const [fields, setFields] = useState([]); // Dynamic field list
  const [containerSelector, setContainerSelector] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [previewCache, setPreviewCache] = useState({}); // Cache by step
  const [currentPreviewStep, setCurrentPreviewStep] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSubPreviewLoading, setIsSubPreviewLoading] = useState(false);
  const [extractingAsTask, setExtractingAsTask] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [taskExecutionId, setTaskExecutionId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isGoogleMaps, setIsGoogleMaps] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxItems, setMaxItems] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [paginationType, setPaginationType] = useState("");
  const [paginationConfig, setPaginationConfig] = useState({});
  const [storeInDatabase, setStoreInDatabase] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [createNewEntity, setCreateNewEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [availableEntities, setAvailableEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // --- NEW STATE for Selectors ---
  const [scanningSelectors, setScanningSelectors] = useState(false);
  const [availableSelectors, setAvailableSelectors] = useState([]);
  
  // --- STATE for Multi-Page Scraping (follow_links) ---
  const [followLinksConfig, setFollowLinksConfig] = useState([]); // [{ name, selectorField, fieldMappings: [{attribute, selector, extract}] }]
  
  // --- REF to prevent multiple task submissions ---
  const isSubmittingTask = useRef(false);

  // --- EFFECTS ---
  useEffect(() => {
    const urlLower = url.toLowerCase();
    setIsGoogleMaps(urlLower.includes('google.com/maps') || urlLower.includes('maps.google.com'));
  }, [url]);

  // Load initial URL if passed from homepage
  useEffect(() => {
    if (location.state && location.state.initialUrl) {
      setUrl(location.state.initialUrl);
    }
  }, [location.state]);

  useEffect(() => {
    if (fields.length === 0) {
      setFields([{ id: Date.now(), attribute: "", selector: "", metadata: "text" }]);
    }
  }, []);

  useEffect(() => {
    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        const res = await fetch(`${API_BASE}/entity/entities`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        console.log("Fetched entities data:", data);
        if (data.entities && Array.isArray(data.entities)) {
          const entityNames = data.entities.map(e => e.name || e);
          console.log("Entity names:", entityNames);
          setAvailableEntities(entityNames);
        } else {
          console.warn("No entities found or invalid format:", data);
          setAvailableEntities([]);
        }
      } catch (err) {
        console.error("Error fetching entities:", err);
        setAvailableEntities([]);
      } finally {
        setLoadingEntities(false);
      }
    };
    fetchEntities();
  }, []);

  useEffect(() => {
    const fetchEntityColumns = async () => {
      if (selectedEntity && !createNewEntity && storeInDatabase) {
        try {
          const res = await fetch(`${API_BASE}/entity/entity-info/${selectedEntity}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
          });
          const data = await res.json();
          if (data.success && data.columns) {
            const entityColumns = data.columns
              .filter((col) => {
                const colName = typeof col === 'string' ? col : col.name;
                return colName !== 'id' && colName !== 'modified_at' && colName !== 'source';
              })
              .map((col, idx) => {
                const colName = typeof col === 'string' ? col : col.name;
                return {
                  id: Date.now() + idx,
                  attribute: colName,
                  selector: "",
                  metadata: "text"
                };
              });
            
            if (entityColumns.length > 0) {
              setFields(entityColumns);
            }
          }
        } catch (err) {
          console.error("Error fetching entity columns:", err);
        }
      }
    };
    
    fetchEntityColumns();
  }, [selectedEntity, createNewEntity, storeInDatabase]);

  // --- LOGIC ---
// In your QuickExtract component:


  const handlePreview = async (step = 1) => {
    // Convert step to number to be safe
    const stepNumber = Number(step) || 1;

    console.log("Previewing at step:", stepNumber);

    if (!url.trim()) {
      alert("URL is required!");
      return;
    }

    // Check cache for this step
    if (previewCache[stepNumber]) {
      console.log("Using cached preview data for step", stepNumber);
      setPreviewData(previewCache[stepNumber]);
      setCurrentPreviewStep(stepNumber);
      return;
    }

    const field_mappings = {};
    let hasValidMappings = false;

    fields.forEach((f) => {
      if (!f.attribute.trim()) return;
      if (isGoogleMaps && isGoogleMapsSupported(f.attribute)) {
        field_mappings[f.attribute] = { 
          selector: f.selector || "", 
          extract: f.metadata || "text" 
        };
        hasValidMappings = true;
      } else if (f.selector.trim()) {
        field_mappings[f.attribute] = { 
          selector: f.selector, 
          extract: f.metadata || "text" 
        };
        hasValidMappings = true;
      }
    });

    if (!hasValidMappings) {
      alert("Add at least one field mapping with attribute name and selector!");
      return;
    }

    // If step > 1 but no pagination config, show alert
    if (stepNumber > 1 && !paginationType) {
      alert("Pagination configuration is required for Preview Next. Please configure pagination in Advanced Options.");
      return;
    }

    setPreviewLoading(true);

    try {
      // CRITICAL FIX: Build pagination config for ALL steps >= 2, not just based on paginationType
      let paginationPayload = null;
      if (stepNumber > 1 && paginationType) {
        paginationPayload = {
          type: paginationType,
          ...paginationConfig
        };
        console.log("Using pagination config for step", stepNumber, ":", paginationPayload);
      }

      // Build follow_links from configuration
      const follow_links = followLinksConfig
        .filter((fl) => fl.name && fl.name.trim() && fl.selectorField && fl.selectorField.trim())
        .map((fl) => ({
          name: fl.name.trim(),
          selector: fl.selectorField.trim(),
          field_mappings: (fl.fieldMappings || []).reduce((acc, fm) => {
            if (fm.attribute && fm.selector && fm.selector.trim()) {
              acc[fm.attribute] = {
                selector: fm.selector.trim(),
                extract: fm.extract || "text"
              };
            }
            return acc;
          }, {})
        }))
        .filter((fl) => Object.keys(fl.field_mappings).length > 0);

      // Build the request body
      const requestBody = {
        url,
        container_selector: containerSelector || null,
        field_mappings,
        follow_links: follow_links.length > 0 ? follow_links : [],
        timeout: 15
      };

      // Add pagination config only if it exists
      if (paginationPayload) {
        requestBody.pagination_config = paginationPayload;
      }

      console.log("Sending request for step:", stepNumber);
      console.log("Request body:", requestBody);

      const res = await fetch(`${API_BASE}/quick-extract/paginated-preview?preview_step=${stepNumber}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "ngrok-skip-browser-warning": "true" 
        },
        body: JSON.stringify(requestBody),
      });

      // Check if response is OK
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server error:", errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log("Response data:", data);

      if (data.success) {
        // Cache the result with step info
        const cachedData = { 
          ...data, 
          entity_name: "Quick Extract",
          preview_step: stepNumber,
          current_step: stepNumber
        };

        console.log("Caching preview data for step", stepNumber);
        setPreviewCache(prev => ({
          ...prev,
          [stepNumber]: cachedData
        }));
        setPreviewData(cachedData);
        setCurrentPreviewStep(stepNumber);
      } else {
        alert(`Preview failed: ${data.message}`);
      }
    } catch (err) {
      console.error("Preview error:", err);
      alert(`Preview error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };
  // Next/Previous handlers
  const handleNextPreviewStep = async () => {
    setIsSubPreviewLoading(true);
    await handlePreview(currentPreviewStep + 1);
    setIsSubPreviewLoading(false);
  };

  const handlePreviousPreviewStep = async () => {
    setIsSubPreviewLoading(true);
    await handlePreview(currentPreviewStep - 1);
    setIsSubPreviewLoading(false);
  };

  // Clear cache when modal closes
  const handleModalClose = () => {
    setPreviewCache({});
    setPreviewData(null);
    setCurrentPreviewStep(1);
  };
  // --- NEW FUNCTION: Fetch Child Selectors ---
  const handleScanSelectors = async () => {
    if (!url) {
        alert("Please go back and enter a URL first.");
        return;
    }
    if (!containerSelector) {
        alert("Please enter a Container Selector first (e.g. div.business-card).");
        return;
    }

    setScanningSelectors(true);

    try {
        const res = await fetch(`${PYTHON_API_URL}/api/extract-selectors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: url,
                container_selector: containerSelector
            })
        });
        
        const data = await res.json();
        
        if (data.success && data.selectors) {
            setAvailableSelectors(data.selectors);
        } else {
            alert("Failed to extract selectors. Check if the container exists.");
        }

    } catch (e) {
        console.error("Scanning failed", e);
        alert("Error connecting to selector extraction service.");
    } finally {
        setScanningSelectors(false);
    }
  };

  const addField = () => {
    setFields([...fields, { id: Date.now(), attribute: "", selector: "", metadata: "text" }]);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id, key, value) => {
    setFields(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };
  
  // Add follow link configuration
  const handleAddFollowLink = () => {
    setFollowLinksConfig((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `detail_${prev.length + 1}`,
        selectorField: "",
        fieldMappings: []
      }
    ]);
  };
  
  // Remove follow link configuration
  const handleRemoveFollowLink = (id) => {
    setFollowLinksConfig((prev) => prev.filter((fl) => fl.id !== id));
  };
  
  // Update follow link configuration
  const handleFollowLinkChange = (id, key, value) => {
    setFollowLinksConfig((prev) =>
      prev.map((fl) => (fl.id === id ? { ...fl, [key]: value } : fl))
    );
  };
  
  // Update follow link field mapping
  const handleUpdateFollowLinkField = (linkId, fieldIndex, key, value) => {
    setFollowLinksConfig((prev) => {
      const updated = prev.map((fl) => {
        if (fl.id === linkId) {
          const fieldMappings = [...(fl.fieldMappings || [])];
          const currentField = fieldMappings[fieldIndex] || {};
          
          // If attribute is being changed, auto-fill selector and extract from main field mappings
          if (key === 'attribute' && value) {
            const mainField = fields.find(f => f.attribute === value);
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
          
          return { ...fl, fieldMappings };
        }
        return fl;
      });
      return updated;
    });
  };
  
  // Remove field mapping from follow link
  const handleRemoveFollowLinkField = (linkId, fieldIndex) => {
    setFollowLinksConfig((prev) =>
      prev.map((fl) =>
        fl.id === linkId
          ? {
              ...fl,
              fieldMappings: (fl.fieldMappings || []).filter((_, i) => i !== fieldIndex)
            }
          : fl
      )
    );
  };

  const isGoogleMapsSupported = (fieldName) => {
    const normalized = fieldName.toLowerCase().replace(/_/g, '');
    return Object.keys(GOOGLE_MAPS_FIELDS).some(key => 
      normalized.includes(key) || key.includes(normalized)
    );
  };

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

  const buildPaginationPayload = () => {
    if (!paginationType) return null;
    return { type: paginationType, ...paginationConfig };
  };

  const handleExtractAsTask = async () => {
    // Prevent multiple submissions
    if (isSubmittingTask.current || extractingAsTask) {
      console.log("Task submission already in progress, ignoring duplicate request");
      return;
    }
    
    if (!url.trim()) {
      alert("URL is required!");
      return;
    }
    
    const field_mappings = {};
    let hasValidMappings = false;
    
    fields.forEach((f) => {
      if (!f.attribute.trim()) return;
      if (isGoogleMaps && isGoogleMapsSupported(f.attribute)) {
        field_mappings[f.attribute] = { selector: f.selector || "", extract: f.metadata || "text" };
        hasValidMappings = true;
      } else if (f.selector.trim()) {
        field_mappings[f.attribute] = { selector: f.selector, extract: f.metadata || "text" };
        hasValidMappings = true;
      }
    });
    
    if (!hasValidMappings) {
      alert("Add at least one field mapping with attribute name and selector!");
      return;
    }
    
    // Set flags immediately to prevent duplicate submissions
    isSubmittingTask.current = true;
    setExtractingAsTask(true);
    
    let finalEntityName = null;
    if (storeInDatabase) {
      if (createNewEntity && newEntityName.trim()) {
        try {
          const createRes = await fetch(`${API_BASE}/entity/create-entity-from-fields`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
            body: JSON.stringify({
              entity_name: newEntityName.trim(),
              field_mappings: field_mappings
            }),
          });
          const createData = await createRes.json();
          if (createData.success) {
            finalEntityName = createData.entity_name;
            const entitiesRes = await fetch(`${API_BASE}/entity/entities`, {
              headers: { "ngrok-skip-browser-warning": "true" }
            });
            const entitiesData = await entitiesRes.json();
            if (entitiesData.entities) {
              setAvailableEntities(entitiesData.entities.map(e => e.name));
              setSelectedEntity(finalEntityName);
              setCreateNewEntity(false);
            }
          } else {
            alert(`Failed to create entity: ${createData.detail || createData.message}`);
            setExtractingAsTask(false);
            isSubmittingTask.current = false;
            return;
          }
        } catch (err) {
          alert(`Error creating entity: ${err.message}`);
          setExtractingAsTask(false);
          isSubmittingTask.current = false;
          return;
        }
      } else if (selectedEntity) {
        finalEntityName = selectedEntity;
      } else {
        alert("Please select an existing entity or create a new one to store data in database.");
        setExtractingAsTask(false);
        isSubmittingTask.current = false;
        return;
      }
    }
    
    setTaskExecutionId(null);
    setTaskStatus(null);
    setExtractedData(null);
    
    try {
      const maxItemsValue = maxItems.trim() ? parseInt(maxItems, 10) : null;
      const paginationPayload = buildPaginationPayload();
      // Build follow_links from configuration
      const follow_links = followLinksConfig
        .filter((fl) => fl.name && fl.name.trim() && fl.selectorField && fl.selectorField.trim())
        .map((fl) => ({
          name: fl.name.trim(),
          selector: fl.selectorField.trim(),
          field_mappings: (fl.fieldMappings || []).reduce((acc, fm) => {
            if (fm.attribute && fm.selector && fm.selector.trim()) {
              acc[fm.attribute] = {
                selector: fm.selector.trim(),
                extract: fm.extract || "text"
              };
            }
            return acc;
          }, {})
        }))
        .filter((fl) => Object.keys(fl.field_mappings).length > 0);
      
      const scrapeRequest = {
        url: url,
        container_selector: containerSelector || null,
        field_mappings: field_mappings,
        follow_links: follow_links.length > 0 ? follow_links : [],
        max_items: maxItemsValue,
        timeout: 15,
        pagination_config: paginationPayload,
        entity_name: finalEntityName || null,
        create_entity: false,
        source_name: "Quick Extract"
      };
      
      const res = await fetch(`${API_BASE}/quick-extract/execute-as-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(scrapeRequest),
      });
      
      const data = await res.json();
      if (data.success && data.execution_id) {
        setTaskExecutionId(data.execution_id);
        setTaskStatus({ status: "queued", message: data.message });
        await fetchTaskLogs(data.execution_id);
        pollTaskStatus(data.execution_id);
        // Keep isSubmittingTask.current = true until task completes or fails
        // It will be reset in pollTaskStatus when status is "completed" or "failed"
      } else {
        alert(`Failed to queue task: ${data.detail || data.message || 'Unknown error'}`);
        setExtractingAsTask(false);
        isSubmittingTask.current = false;
      }
    } catch (err) {
      alert(`Error queuing task: ${err.message}`);
      setExtractingAsTask(false);
      isSubmittingTask.current = false;
    }
  };

  const fetchTaskLogs = async (executionId) => {
    try {
      const res = await fetch(`${API_BASE}/quick-extract/task-logs/${executionId}`, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      if (data.logs && Array.isArray(data.logs)) {
        // Only update if logs actually changed to prevent flickering
        setTaskLogs((prevLogs) => {
          const prevLogsStr = JSON.stringify(prevLogs);
          const newLogsStr = JSON.stringify(data.logs);
          if (prevLogsStr !== newLogsStr) {
            return data.logs;
          }
          return prevLogs;
        });
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const pollTaskStatus = async (executionId) => {
    const maxAttempts = 300; 
    let attempts = 0;
    let lastStatus = null;
    let lastLogFetch = 0;
    
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/quick-extract/task-status/${executionId}`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        
        // Always update status (React will handle re-renders efficiently)
        setTaskStatus(data);
        
        // Only fetch logs if status changed or every 3 seconds (to reduce flickering)
        const now = Date.now();
        if (data.status !== lastStatus || (now - lastLogFetch) > 3000) {
          await fetchTaskLogs(executionId);
          lastStatus = data.status;
          lastLogFetch = now;
        }
        
        if (data.status === "completed" && data.success === true) {
          // Set extracted data from the response
          const extractedDataToSet = { 
            ...data, 
            entity_name: "Quick Extract",
            data: data.data || [],
            total_items: data.total_items || (data.data ? data.data.length : 0),
            success: true,
            message: data.message || "Extraction completed successfully"
          };
          setExtractedData(extractedDataToSet);
          setExtractingAsTask(false);
          setShowLogs(true);
          isSubmittingTask.current = false; // Reset flag on completion
          // Stop polling after completion
          return;
        } else if (data.status === "failed") {
          setExtractingAsTask(false);
          isSubmittingTask.current = false; // Reset flag on failure
          // Stop polling on failure
          return;
        } else if (data.status === "processing" || data.status === "pending" || data.status === "queued") {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            alert("Task execution timed out");
            setExtractingAsTask(false);
            isSubmittingTask.current = false; // Reset flag on timeout
          }
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            alert("Task execution timed out");
            setExtractingAsTask(false);
            isSubmittingTask.current = false; // Reset flag on timeout
          }
        }
      } catch (err) {
        console.error("Error polling task status:", err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          alert("Error checking task status");
          setExtractingAsTask(false);
          isSubmittingTask.current = false; // Reset flag on error
        }
      }
    };
    
    setTimeout(poll, 1000);
  };

  // Helper function to get all unique headers from all data rows
  const getAllDataHeaders = (data) => {
    if (!data || data.length === 0) return [];
    const headerSet = new Set();
    data.forEach(row => {
      Object.keys(row).forEach(key => headerSet.add(key));
    });
    return Array.from(headerSet);
  };

  const exportToCSV = () => {
    if (!extractedData || !extractedData.data || extractedData.data.length === 0) { alert("No data to export!"); return; }
    const headers = getAllDataHeaders(extractedData.data);
    const csvRows = [headers.join(','), ...extractedData.data.map(row => headers.map(header => {
      const value = row[header] || '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) { return `"${value.replace(/"/g, '""')}"`; }
      return value;
    }).join(','))];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `quick_extract_${new Date().getTime()}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    if (!extractedData || !extractedData.data || extractedData.data.length === 0) { alert("No data to export!"); return; }
    try {
      const headers = getAllDataHeaders(extractedData.data);
      let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="Sheet1"><Table>';
      xml += '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('') + '</Row>';
      extractedData.data.forEach(row => {
        xml += '<Row>' + headers.map(h => {
          const v = row[h] || ''; const t = isNaN(v) ? 'String' : 'Number'; return `<Cell><Data ss:Type="${t}">${escapeXml(String(v))}</Data></Cell>`;
        }).join('') + '</Row>';
      });
      xml += '</Table></Worksheet></Workbook>';
      const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `quick_extract_${new Date().getTime()}.xls`;
      link.click();
    } catch (err) { console.error(err); alert("Excel export failed."); }
  };

  const escapeXml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
// In QuickExtract component, add this function before the return statement:

  const startOutreach = () => {
    if (!extractedData?.data || extractedData.data.length === 0) {
      alert("No data to export to outreach!");
      return;
    }
  
    // Transform scraped data to Outreach contact format
    const outreachContacts = extractedData.data.map(record => ({
      name: record.name || record.business_name || record.title || record.company || "",
      email: record.email || record.business_email || "",
      company: record.company || record.business_name || record.name || "",
      company_website: record.website || record.url || "",
      industry: record.category || record.industry || "",
      phone: record.phone || "",
      address: record.address || "",
      source_name: "Quick Extract",
      // Preserve original data as fallback
      ...record
    }));
  
    // Save to localStorage
    localStorage.setItem('outreach_pending_contacts', JSON.stringify({
      contacts: outreachContacts,
      timestamp: Date.now(),
      source: 'quick_extract'
    }));
  
    // Navigate to outreach page
    window.location.href = '/outreach';
  };  
  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#49A3C4] selection:text-white">
      <Header activeTab="more" />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-extrabold text-[#00364A] mb-8">
          Quick <span className="text-[#49A3C4]">Extract</span>
        </h1>
        
        {/* Progress Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative max-w-4xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-[#49A3C4] -z-10 transition-all duration-500 rounded-full"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>

            {[
              { num: 1, label: "Target URL", icon: Globe },
              { num: 2, label: "Field Mapping", icon: Layers },
              { num: 3, label: "Results", icon: FileSpreadsheet }
            ].map((step) => {
              const isActive = currentStep >= step.num;
              const isCurrent = currentStep === step.num;
              const Icon = step.icon;
              
              return (
                <div key={step.num} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-lg ${
                      isActive 
                        ? 'bg-[#00364A] border-[#00364A] text-white scale-110' 
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}
                  >
                    {isActive ? <Icon size={20} /> : <span className="text-lg font-bold">{step.num}</span>}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wide transition-colors duration-300 ${
                    isCurrent ? 'text-[#00364A]' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Workspace Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden min-h-[600px] flex flex-col relative">
          
          {/* Step 1: URL Entry */}
          {currentStep === 1 && (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full max-w-2xl space-y-8">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-[#00364A]">Where should we extract data from?</h2>
                  <p className="text-gray-500 text-lg">Enter the full URL of the target page to begin analysis.</p>
                </div>
                
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Globe className={`w-6 h-6 transition-colors ${url ? 'text-[#49A3C4]' : 'text-gray-400'}`} />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.example.com/listing"
                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-gray-50 border-2 border-gray-100 text-lg shadow-sm focus:border-[#49A3C4] focus:ring-4 focus:ring-[#49A3C4]/10 outline-none transition-all placeholder:text-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && url.trim() && setCurrentStep(2)}
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => url.trim() && setCurrentStep(2)}
                    disabled={!url.trim()}
                    className="group relative px-10 py-4 bg-gradient-to-b from-[#005f7f] to-[#00364A] text-white text-lg font-bold rounded-full shadow-lg hover:bg-[#004e6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[#49A3C4]/30 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                  >
                    <span className="flex items-center gap-3">
                      Continue to Field Mapping
                      <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping Configuration */}
          {currentStep === 2 && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="border-b border-gray-100 p-6 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentStep(1)} className="p-2 hover:bg-white hover:shadow-md rounded-lg text-gray-500 transition-all">
                    <ArrowRight className="rotate-180" size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-[#00364A]">Map Fields</h2>
                    <p className="text-sm text-gray-500">Define field attributes and CSS selectors</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                   {/* Actions Toolbar */}
                  <button
                    onClick={() => handlePreview(1)}
                    disabled={previewLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-cyan-500 to-cyan-600 text-white rounded-lg shadow-sm hover:from-cyan-500 hover:to-cyan-500 transition-all disabled:opacity-50 font-medium"
                  >
                    {previewLoading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
                    Preview
                  </button>
                  
                  <button
                    onClick={handleExtractAsTask}
                    disabled={extractingAsTask}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-b from-[#005f7f] to-[#00364A] text-white rounded-lg shadow-md hover:bg-[#49A3C4] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                    title="Execute extraction as task through scheduler (does not store in database)"
                  >
                    {extractingAsTask ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                    Extract Data
                  </button>
                </div>
              </div>

              <div className="flex-grow flex overflow-hidden">
                {/* Left Panel: Configuration */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-gray-100">
                  
                  {isGoogleMaps && (
                    <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-xl flex gap-4 shadow-sm">
                      <div className="p-2 bg-white rounded-lg shadow-sm h-fit text-[#49A3C4]">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#00364A]">Google Maps Detected</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Standard fields like Name, Address, and Rating are auto-mapped. 
                          Leave selectors empty to use auto-extraction.
                        </p>
                      </div>
                    </div>
                  )}

                  {taskStatus && (extractingAsTask || taskStatus.status === "completed" || taskStatus.status === "failed") && (
                    <div className="mb-8 space-y-4">
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-xl flex gap-4 shadow-sm">
                        <div className="p-2 bg-white rounded-lg shadow-sm h-fit text-purple-600">
                          {taskStatus.status === "processing" || taskStatus.status === "pending" || taskStatus.status === "queued" ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : taskStatus.status === "completed" ? (
                            <CheckCircle size={20} />
                          ) : (
                            <AlertCircle size={20} />
                          )}
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-bold text-[#00364A]">
                            {taskStatus.status === "processing" ? "Task Executing..." : 
                             taskStatus.status === "pending" || taskStatus.status === "queued" ? "Task Queued..." :
                             taskStatus.status === "completed" ? "Task Completed Successfully!" : "Task Failed"}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {taskStatus.message || "Processing..."}
                          </p>
                          {taskStatus.execution_duration_ms && (
                            <p className="text-xs text-gray-500 mt-1">
                              Duration: {(taskStatus.execution_duration_ms / 1000).toFixed(2)}s
                            </p>
                          )}
                          {taskStatus.status === "completed" && taskStatus.items_scraped !== undefined && (
                            <p className="text-xs text-green-600 mt-1 font-semibold">
                              {taskStatus.items_scraped} items scraped successfully
                            </p>
                          )}
                          {taskStatus.status === "completed" && taskStatus.success && (extractedData || taskStatus.data) && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                              <p className="text-sm font-semibold text-[#00364A] mb-2">
                                ✓ Extraction completed! View your data and export options below.
                              </p>
                              <p className="text-xs text-gray-600">
                                Click <strong>"Show Data & Export"</strong> button to view results and download in CSV or Excel format.
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {taskStatus.status === "completed" && taskStatus.success && (extractedData || taskStatus.data) && (
                            <button
                              onClick={() => {
                                // Ensure extractedData is set if not already
                                if (!extractedData && taskStatus.data) {
                                  setExtractedData({
                                    ...taskStatus,
                                    entity_name: "Quick Extract",
                                    data: taskStatus.data || [],
                                    total_items: taskStatus.total_items || (taskStatus.data ? taskStatus.data.length : 0)
                                  });
                                }
                                setCurrentStep(3);
                              }}
                              className="px-5 py-2.5 text-sm bg-gradient-to-b from-green-500 to-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                            >
                              <ArrowRight size={16} />
                              Show Data & Export
                            </button>
                          )}
                          <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="px-4 py-2 text-sm bg-white border border-purple-200 rounded-lg hover:bg-purple-50 text-purple-600 font-medium"
                          >
                            {showLogs ? "Hide" : "Show"} Logs
                          </button>
                        </div>
                      </div>
                      
                      {showLogs && taskLogs.length > 0 && (
                        <div className="p-4 bg-white rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
                          <div className="space-y-4">
                            {taskLogs.map((log, index) => {
                              const formatDateTime = (dateString) => {
                                if (!dateString) return 'No timestamp';
                                try {
                                  return new Date(dateString).toLocaleString([], {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  });
                                } catch {
                                  return dateString;
                                }
                              };
                              
                              return (
                                <div
                                  key={log.id || index}
                                  className={`p-5 rounded-lg border-l-4 transition-all ${
                                    log.log_level === 'error' ? 'bg-red-50 border-red-500 shadow-sm' :
                                    log.log_level === 'warning' ? 'bg-yellow-50 border-yellow-500 shadow-sm' :
                                    log.status === 'completed' ? 'bg-green-50 border-green-500 shadow-sm' :
                                    'bg-gray-50 border-gray-300 shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                                          log.log_level === 'error' ? 'bg-red-200 text-red-800' :
                                          log.log_level === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                                          log.log_level === 'debug' ? 'bg-blue-200 text-blue-800' :
                                          'bg-gray-200 text-gray-800'
                                        }`}>
                                          {log.log_level?.toUpperCase() || 'INFO'}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                                          log.status === 'completed' ? 'bg-green-200 text-green-800' :
                                          log.status === 'failed' ? 'bg-red-200 text-red-800' :
                                          log.status === 'processing' ? 'bg-blue-200 text-blue-800' :
                                          'bg-gray-200 text-gray-800'
                                        }`}>
                                          {log.status || 'unknown'}
                                        </span>
                                        {log.execution_duration_ms && (
                                          <span className="text-xs text-gray-600 font-mono">
                                            {log.execution_duration_ms}ms
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm font-medium text-gray-900 mb-2">{log.message}</p>
                                      {log.created_at && (
                                        <p className="text-xs text-gray-500 mb-3">
                                          {formatDateTime(log.created_at)}
                                        </p>
                                      )}

                                      {/* Extract info from message text */}
                                      {(() => {
                                        const messageInfo = [];
                                        const msg = log.message || '';
                                        
                                        // Extract page numbers from message (various patterns)
                                        const pageMatch = msg.match(/(?:page|Page|PAGE)\s*[#:]?\s*(\d+)|(\d+)\s*(?:page|Page)/i);
                                        if (pageMatch) {
                                          messageInfo.push({ label: 'Page', value: pageMatch[1] || pageMatch[2] });
                                        }
                                        
                                        // Extract row/item counts from message (various patterns)
                                        const rowsMatch = msg.match(/(\d+)\s*(?:rows?|items?|records?|entries?)\s*(?:scraped|extracted|found|collected|processed|saved)/i) ||
                                                         msg.match(/(?:scraped|extracted|found|collected|processed|saved)\s*(\d+)\s*(?:rows?|items?|records?|entries?)/i);
                                        if (rowsMatch) {
                                          messageInfo.push({ label: 'Rows Scraped', value: rowsMatch[1] });
                                        }
                                        
                                        // Extract total counts
                                        const totalMatch = msg.match(/(?:total|Total|TOTAL)\s*(?:of\s*)?(\d+)\s*(?:rows?|items?|records?|entries?)/i);
                                        if (totalMatch) {
                                          messageInfo.push({ label: 'Total Items', value: totalMatch[1] });
                                        }
                                        
                                        // Extract "done" or "completed" status
                                        if (msg.match(/(?:done|completed|finished|success)/i)) {
                                          messageInfo.push({ label: 'Status', value: 'Done' });
                                        }
                                        
                                        // Extract URL if present
                                        const urlMatch = msg.match(/(https?:\/\/[^\s]+)/i);
                                        if (urlMatch && urlMatch[1].length < 80) {
                                          messageInfo.push({ label: 'URL', value: urlMatch[1] });
                                        }
                                        
                                        return messageInfo.length > 0 ? (
                                          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
                                            <div className="flex flex-wrap gap-4">
                                              {messageInfo.map((info, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-md border border-green-100">
                                                  <span className="text-xs font-bold text-green-900 uppercase tracking-wide">{info.label}:</span>
                                                  <span className="text-sm font-semibold text-green-700">{String(info.value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null;
                                      })()}

                                      {/* Key Details - Prominently Displayed */}
                                      {log.details && Object.keys(log.details).length > 0 && (() => {
                                        const details = log.details;
                                        const keyInfo = [];
                                        
                                        // Extract important information - check multiple possible field names
                                        const getValue = (...keys) => {
                                          for (const key of keys) {
                                            if (details[key] !== undefined && details[key] !== null) {
                                              return details[key];
                                            }
                                          }
                                          return null;
                                        };
                                        
                                        // Page information
                                        const page = getValue('page', 'page_number', 'current_page', 'page_num');
                                        if (page !== null) {
                                          keyInfo.push({ label: 'Page', value: page });
                                        }
                                        
                                        // Rows/Items scraped
                                        const rows = getValue('rows_scraped', 'items_scraped', 'items_count', 'rows_count', 'scraped_count', 'count');
                                        if (rows !== null) {
                                          keyInfo.push({ label: 'Rows Scraped', value: rows });
                                        }
                                        
                                        // Total pages
                                        const totalPages = getValue('total_pages', 'max_pages', 'pages_total');
                                        if (totalPages !== null) {
                                          keyInfo.push({ label: 'Total Pages', value: totalPages });
                                        }
                                        
                                        // Total items
                                        const totalItems = getValue('total_items', 'total_rows', 'total_count', 'expected_items');
                                        if (totalItems !== null) {
                                          keyInfo.push({ label: 'Total Items', value: totalItems });
                                        }
                                        
                                        // Progress
                                        const progress = getValue('progress', 'progress_percent', 'progress_pct', 'completion');
                                        if (progress !== null) {
                                          keyInfo.push({ label: 'Progress', value: typeof progress === 'number' ? `${progress}%` : progress });
                                        }
                                        
                                        // URL
                                        const url = getValue('url', 'page_url', 'current_url');
                                        if (url !== null && typeof url === 'string' && url.length < 100) {
                                          keyInfo.push({ label: 'URL', value: url });
                                        }
                                        
                                        // Status message
                                        const statusMsg = getValue('status_message', 'message', 'status_msg', 'note');
                                        if (statusMsg !== null && statusMsg !== log.message) {
                                          keyInfo.push({ label: 'Status', value: statusMsg });
                                        }
                                        
                                        // Execution ID (if present and not too long)
                                        const execId = getValue('execution_id', 'exec_id', 'task_id');
                                        if (execId !== null && String(execId).length < 50) {
                                          keyInfo.push({ label: 'Execution ID', value: String(execId) });
                                        }
                                        
                                        return keyInfo.length > 0 ? (
                                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                                            <div className="flex flex-wrap gap-4">
                                              {keyInfo.map((info, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-md border border-blue-100">
                                                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">{info.label}:</span>
                                                  <span className="text-sm font-semibold text-blue-700">{String(info.value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null;
                                      })()}

                                      {/* Details Table - Always show if details exist, or show message if no details */}
                                      {log.details && Object.keys(log.details).length > 0 ? (
                                        <details className="mt-3 group">
                                          <summary className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-700 select-none">
                                            <span>View All Details ({Object.keys(log.details).length} {Object.keys(log.details).length === 1 ? 'field' : 'fields'})</span>
                                            <span className="group-open:rotate-180 transition-transform">▼</span>
                                          </summary>
                                          
                                          <div className="mt-3 overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
                                            <table className="w-full text-xs bg-white">
                                              <thead className="bg-gradient-to-r from-purple-50 to-purple-100 border-b-2 border-purple-300">
                                                <tr>
                                                  <th className="px-4 py-3 text-left font-semibold text-purple-900 border-r border-purple-200 w-1/3">
                                                    Key
                                                  </th>
                                                  <th className="px-4 py-3 text-left font-semibold text-purple-900">
                                                    Value
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-200">
                                                {Object.entries(log.details).map(([key, value], idx) => (
                                                  <tr key={key} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-purple-50' : 'bg-gray-50 hover:bg-purple-50'}`}>
                                                    <td className="px-4 py-3 font-semibold text-gray-900 border-r border-gray-200 break-words max-w-xs">
                                                      {key}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700 break-words">
                                                      {typeof value === 'object' && value !== null 
                                                        ? <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-800">{JSON.stringify(value, null, 2)}</code>
                                                        : String(value)}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </details>
                                      ) : (
                                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 italic">
                                          No additional details available for this log entry.
                                        </div>
                                      )}

                                      {/* Error Traceback - Collapsible */}
                                      {log.error_traceback && (
                                        <details className="mt-3 group">
                                          <summary className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 transition-colors text-xs font-medium text-red-800 select-none">
                                            <span>View Error Traceback</span>
                                            <span className="group-open:rotate-180 transition-transform">▼</span>
                                          </summary>
                                          <pre className="mt-3 p-4 bg-gray-900 text-red-200 rounded-lg text-xs overflow-x-auto font-mono border border-red-300 shadow-sm">
                                            {log.error_traceback}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-8 space-y-6">
                    {/* Entity Selection */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                        Store Data in Entity (Optional)
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-1">
                          <input
                            type="checkbox"
                            id="storeInEntity"
                            checked={storeInDatabase}
                            onChange={(e) => {
                              setStoreInDatabase(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedEntity("");
                                setCreateNewEntity(false);
                                setNewEntityName("");
                              }
                            }}
                            className="w-4 h-4 text-[#49A3C4] border-gray-300 rounded focus:ring-[#49A3C4] cursor-pointer"
                          />
                          <label htmlFor="storeInEntity" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Store extracted data in database entity table
                          </label>
                        </div>
                        
                        {storeInDatabase && (
                          <div className="pl-7 space-y-3 border-l-2 border-[#49A3C4]">
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                id="selectExisting"
                                name="entityOption"
                                checked={!createNewEntity}
                                onChange={() => {
                                  setCreateNewEntity(false);
                                  setNewEntityName("");
                                }}
                                className="w-4 h-4 text-[#49A3C4] border-gray-300 focus:ring-[#49A3C4]"
                              />
                              <label htmlFor="selectExisting" className="text-sm text-gray-700">
                                Select existing entity
                              </label>
                            </div>
                            
                            {!createNewEntity && (
                              <div className="pl-7 space-y-2">
                                <select
                                  value={selectedEntity}
                                  onChange={(e) => setSelectedEntity(e.target.value)}
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none transition-all text-sm text-[#00364A]"
                                  disabled={loadingEntities}
                                >
                                  <option value="">-- Select Entity --</option>
                                  {availableEntities.map((entity) => (
                                    <option key={entity} value={entity}>
                                      {entity}
                                    </option>
                                  ))}
                                </select>
                                {loadingEntities && (
                                  <p className="text-xs text-gray-400 mt-1">Loading entities...</p>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                id="createNew"
                                name="entityOption"
                                checked={createNewEntity}
                                onChange={() => setCreateNewEntity(true)}
                                className="w-4 h-4 text-[#49A3C4] border-gray-300 focus:ring-[#49A3C4]"
                              />
                              <label htmlFor="createNew" className="text-sm text-gray-700">
                                Create new entity from field mappings
                              </label>
                            </div>
                            
                            {createNewEntity && (
                              <div className="pl-7 space-y-2">
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                                    Entity Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter entity name (e.g., business_listings)"
                                    value={newEntityName}
                                    onChange={(e) => setNewEntityName(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none transition-all text-sm text-[#00364A]"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* CONTAINER SELECTOR with SCAN BUTTON */}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Container Selector
                      </label>
                      <div className="flex gap-2">
                        <input
                          placeholder="e.g. div.business-card"
                          value={containerSelector || ""}
                          onChange={(e) => setContainerSelector(e.target.value)}
                          className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none transition-all font-mono text-sm text-[#00364A]"
                        />
                        <button
                          onClick={handleScanSelectors}
                          disabled={scanningSelectors}
                          className="px-4 bg-[#e0f2f7] hover:bg-[#ccebf4] text-[#00364A] rounded-xl border border-[#b3dce9] flex items-center justify-center transition-colors shadow-sm"
                          title="Scan for available elements inside this container"
                        >
                           {scanningSelectors ? (
                              <Loader2 size={20} className="animate-spin text-[#49A3C4]" />
                           ) : (
                              <Search size={20} />
                           )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        The CSS selector that wraps each individual item. Click search to auto-find child elements.
                      </p>
                      {availableSelectors.length > 0 && (
                          <p className="text-xs text-green-600 mt-1 font-medium">
                              ✓ Found {availableSelectors.length} possible child elements. Use dropdowns in fields below.
                          </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Max Items (Optional)
                      </label>
                      <input
                        type="number"
                        placeholder="Leave empty for no limit (default: 40)"
                        value={maxItems}
                        onChange={(e) => setMaxItems(e.target.value)}
                        min="1"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none transition-all text-sm text-[#00364A]"
                      />
                    </div>
                  </div>

                  {/* Advanced Options - Pagination */}
                  <div className="mb-8">
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl hover:border-[#49A3C4] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Settings size={18} className="text-[#49A3C4]" />
                        <span className="font-semibold text-[#00364A]">Advanced Options</span>
                        {paginationType && (
                          <span className="text-xs bg-[#49A3C4] text-white px-2 py-1 rounded-full">
                            Configured
                          </span>
                        )}
                      </div>
                      {showAdvancedOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showAdvancedOptions && (
                      <div className="mt-4 p-5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Layers size={18} className="text-blue-500" />
                          Pagination Configuration
                        </h3>
                        
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Pagination Type</label>
                          <select
                            value={paginationType}
                            onChange={(e) => {
                              setPaginationType(e.target.value);
                              setPaginationConfig({});
                            }}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                          >
                            <option value="">Select pagination type</option>
                            {paginationTypes.map((type) => (
                              <option key={type} value={type}>
                                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </div>

                        {paginationType && (
                          <div className="space-y-4 pt-2">
                            {paginationType === "query_param" && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Param Name</label>
                                  <input
                                    type="text"
                                    placeholder="page"
                                    value={paginationConfig.param_name || ""}
                                    onChange={(e) => handlePaginationChange("param_name", e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Start Page</label>
                                  <input
                                    type="number"
                                    placeholder="1"
                                    value={paginationConfig.start_page || ""}
                                    onChange={(e) => handlePaginationChange("start_page", Number(e.target.value))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                              </>
                            )}

                            {paginationType === "offset" && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Param Name</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. offset"
                                    value={paginationConfig.param_name || ""}
                                    onChange={(e) => handlePaginationChange("param_name", e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Start Page</label>
                                  <input
                                    type="number"
                                    placeholder="1"
                                    value={paginationConfig.start_page || ""}
                                    onChange={(e) => handlePaginationChange("start_page", Number(e.target.value))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Page Size</label>
                                  <input
                                    type="number"
                                    placeholder="10"
                                    value={paginationConfig.page_size || ""}
                                    onChange={(e) => handlePaginationChange("page_size", Number(e.target.value))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Max Pages (Optional)</label>
                                  <input
                                    type="number"
                                    placeholder="Optional"
                                    value={paginationConfig.max_pages || ""}
                                    onChange={(e) => handlePaginationChange("max_pages", Number(e.target.value))}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                              </>
                            )}

                            {paginationType === "path" && (
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Path Pattern (to be appended to base URL)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. /page/{page}"
                                  value={paginationConfig.path_pattern || ""}
                                  onChange={(e) => handlePaginationChange("path_pattern", e.target.value)}
                                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                />
                              </div>
                            )}

                            {(paginationType === "button_click" || paginationType === "ajax_click") && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Button Selector</label>
                                  <input
                                    type="text"
                                    placeholder=".next-button"
                                    value={paginationConfig.button_selector || ""}
                                    onChange={(e) => handlePaginationChange("button_selector", e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">Wait Selector</label>
                                  <input
                                    type="text"
                                    placeholder=".results-loaded"
                                    value={paginationConfig.wait_selector || ""}
                                    onChange={(e) => handlePaginationChange("wait_selector", e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                  />
                                </div>
                              </>
                            )}

                            {paginationType === "scroll" && (
                              <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Scroll Steps</label>
                                <input
                                  type="number"
                                  placeholder="5"
                                  value={paginationConfig.scroll_steps || ""}
                                  onChange={(e) => handlePaginationChange("scroll_steps", Number(e.target.value))}
                                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49A3C4] focus:border-[#49A3C4] bg-white"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#00364A]">Field Mappings</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{fields.length} Fields</span>
                        <button
                          onClick={addField}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-b from-[#005f7f] to-[#00364A] text-white rounded-lg hover:bg-[#49A3C4] transition-colors text-xs font-bold"
                        >
                          <Plus size={14} /> Add Field
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {fields.map((field) => {
                        const isSupported = isGoogleMaps && isGoogleMapsSupported(field.attribute);
                        return (
                          <div key={field.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#49A3C4]/30 transition-all group">
                            <div className="flex justify-between items-center mb-3">
                              <input
                                type="text"
                                placeholder="Enter Field Name (e.g. title, price)"
                                value={field.attribute}
                                onChange={(e) => handleFieldChange(field.id, "attribute", e.target.value)}
                                className="font-mono text-sm font-semibold text-[#00364A] bg-transparent border-b-2 border-transparent focus:border-[#49A3C4] outline-none px-1"
                              />
                              <div className="flex items-center gap-2">
                                {isSupported && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#49A3C4] bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    <CheckCircle size={10} /> Auto-Map
                                  </span>
                                )}
                                {fields.length > 1 && (
                                  <button
                                    onClick={() => removeField(field.id)}
                                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                    title="Remove field"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                              <div className="col-span-3">
                                <SelectorInput
                                  placeholder={isSupported ? "Auto-extract active" : "CSS Selector"}
                                  value={field.selector}
                                  onChange={(val) => handleFieldChange(field.id, "selector", val)}
                                  options={availableSelectors} // Pass scanned selectors
                                  className={`w-full p-2.5 text-sm rounded-lg border outline-none transition-all ${isSupported && !field.selector ? 'bg-blue-50/50 border-blue-100 text-[#49A3C4] placeholder:text-[#49A3C4]/70' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#49A3C4]'}`}
                                />
                              </div>
                              <div className="col-span-2">
                                <MetadataInput
                                  value={field.metadata}
                                  onChange={(val) => handleFieldChange(field.id, "metadata", val)}
                                  options={METADATA_OPTIONS}
                                  className="p-2.5"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Multi-Page Scraping Configuration */}
                  <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-[#49A3C4] rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#00364A]">Multi-Page Scraping</h3>
                        <p className="text-sm text-gray-600 mt-1">Extract data from detail pages linked from the listing page</p>
                      </div>
                      <button
                        onClick={handleAddFollowLink}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-[#005f7f] to-[#00364A] text-white rounded-lg hover:bg-[#49A3C4] transition-colors text-sm font-bold"
                      >
                        <Plus size={16} /> Add Detail Page
                      </button>
                    </div>
                    
                    {/* Instructions Box */}
                    <div className="mb-6 p-4 bg-white rounded-lg border border-[#49A3C4] border-l-4">
                      <div className="flex gap-3 items-start">
                        <Info size={18} color="#00364A" className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-sm text-[#00364A]">
                          <h4 className="font-bold mb-2">How to Configure Multi-Page Scraping:</h4>
                          <ol className="list-decimal list-inside space-y-1 text-xs">
                            <li>Click <strong>"Add Detail Page"</strong> to add a new detail page configuration.</li>
                            <li>Enter the <strong>Link CSS Selector</strong> (e.g., "a.profile-link"). The system will automatically extract the href attribute.</li>
                            <li>Add fields to extract from detail pages. Selectors will be auto-filled if the same attribute exists in the main mapping above.</li>
                          </ol>
                          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                            <strong>💡 How it works:</strong> The system will extract the URL from your CSS selector, visit each detail page, scrape the additional fields you configure, and merge everything into a single record.
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {followLinksConfig.map((fl, flIndex) => (
                      <div key={fl.id} className="mb-4 p-4 bg-white rounded-lg border border-[#49A3C4]">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Link Name</label>
                              <input
                                type="text"
                                value={fl.name}
                                onChange={(e) => handleFollowLinkChange(fl.id, 'name', e.target.value)}
                                placeholder="e.g., profile, detail"
                                className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Link CSS Selector</label>
                              <SelectorInput
                                placeholder="e.g., a.profile-link"
                                value={fl.selectorField || ""}
                                onChange={(val) => handleFollowLinkChange(fl.id, 'selectorField', val)}
                                options={availableSelectors}
                                className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none font-mono"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFollowLink(fl.id)}
                            className="ml-3 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <X  className="text-black"size={16} />
                          </button>
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Fields to Extract from Detail Page</label>
                          {(fl.fieldMappings || []).map((fm, fmIndex) => (
                            <div key={fmIndex} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex justify-end mb-2">
                                <button
                                  onClick={() => handleRemoveFollowLinkField(fl.id, fmIndex)}
                                  className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                                  title="Remove field"
                                >
                                  <X className="text-black" size={14} />
                                </button>
                              </div>
                              <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-3">
                                  <label className="text-xs text-gray-600 mb-1 block">Attribute</label>
                                  <select
                                    value={fm.attribute || ""}
                                    onChange={(e) => handleUpdateFollowLinkField(fl.id, fmIndex, 'attribute', e.target.value)}
                                    className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none bg-white"
                                  >
                                    <option value="">Select attribute...</option>
                                    {fields
                                      .filter((f) => f.attribute && f.attribute.trim())
                                      .map((f) => (
                                        <option key={f.id} value={f.attribute}>
                                          {f.attribute}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div className="col-span-6">
                                  <label className="text-xs text-gray-600 mb-1 block">CSS Selector</label>
                                  <SelectorInput
                                    placeholder={fm.attribute && fields.find(f => f.attribute === fm.attribute)?.selector 
                                      ? `Auto-filled: ${fields.find(f => f.attribute === fm.attribute).selector}` 
                                      : "CSS Selector"}
                                    value={fm.selector || ""}
                                    onChange={(val) => handleUpdateFollowLinkField(fl.id, fmIndex, 'selector', val)}
                                    options={availableSelectors}
                                    className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:border-[#49A3C4] focus:ring-2 focus:ring-[#49A3C4]/20 outline-none font-mono bg-white"
                                  />
                                </div>
                                <div className="col-span-3">
                                  <label className="text-xs text-gray-600 mb-1 block">Extract Type</label>
                                  <div className="relative">
                                    <MetadataInput
                                      value={fm.extract || "text"}
                                      onChange={(val) => handleUpdateFollowLinkField(fl.id, fmIndex, 'extract', val)}
                                      options={METADATA_OPTIONS}
                                      className="p-2.5"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const updated = [...(fl.fieldMappings || []), { attribute: "", selector: "", extract: "text" }];
                              handleFollowLinkChange(fl.id, 'fieldMappings', updated);
                            }}
                            className="mt-2 px-3 py-1.5 bg-blue-50 text-[#00364A] border border-[#49A3C4] rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                          >
                            + Add Field
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {followLinksConfig.length === 0 && (
                      <div className="text-center py-6 text-gray-500 text-sm">
                        <p className="mb-2">No detail pages configured yet.</p>
                        <p className="text-xs">Click "Add Detail Page" to enable multi-page scraping.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Source Code View */}
                <div className="w-1/2 bg-[#1e1e1e] border-l border-gray-200 p-0 flex flex-col">
                  <div className="flex-grow overflow-hidden ">
                     <ServerHtmlPreview url={url} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {currentStep === 3 && extractedData && (
            <div className="flex-grow flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
               <div className="p-8 border-b border-gray-100 bg-white flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-sm font-bold text-green-600 uppercase tracking-wide">Extraction Complete</span>
                    </div>
                    <p className="ps-2 text-xl text-left font-bold text-[#00364A]">{extractedData.total_items || extractedData.data?.length || 0} Records Found</p>
                    <p className="text-gray-500">Data extracted from {url}</p>
                  </div>
                  
                {/* In Step 3 results section, add this button alongside CSV/Excel buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="flex items-centser gap-2 px-6 py-3 bg-white text-[#00364A] border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-[#49A3C4] transition-all"
                  >
                    <Download size={20} /> CSV
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-[#00364A] border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-[#49A3C4] transition-all"
                  >
                    <FileSpreadsheet size={20} /> Excel
                  </button>

                  {/* NEW BUTTON - Start Outreach */}
                  <button
                    onClick={startOutreach}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#49A3C4] to-[#00364A] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <FaPaperPlane size={18} /> Start Outreach
                  </button>
                </div>
                </div>

                <div className="flex-grow bg-gray-50 p-6 overflow-hidden">
                  {extractedData.data && extractedData.data.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                      <div className="overflow-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-gray-600">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200 sticky top-0">
                            <tr>
                              {getAllDataHeaders(extractedData.data).map((header) => (
                                <th key={header} className="px-6 py-4 whitespace-nowrap bg-gray-50">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {extractedData.data.map((item, index) => (
                              <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                {getAllDataHeaders(extractedData.data).map((header) => (
                                  <td key={`${index}-${header}`} className="px-6 py-4 whitespace-nowrap">
                                    {String(item[header] || '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="bg-white p-8 rounded-full shadow-sm mb-4">
                        <Database size={48} className="text-gray-300" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-700">No Data Extracted</h3>
                      <p className="text-gray-500 mt-2">Check your selectors and try again.</p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
                   <button
                    onClick={() => {
                      setCurrentStep(1);
                      setExtractedData(null);
                      setUrl("");
                      setFields([{ id: Date.now(), attribute: "", selector: "", metadata: "text" }]);
                      setContainerSelector("");
                      setMaxItems("");
                      setPaginationType("");
                      setPaginationConfig({});
                      setShowAdvancedOptions(false);
                      setTaskExecutionId(null);
                      setTaskStatus(null);
                      setTaskLogs([]);
                      setShowLogs(false);
                      setExtractingAsTask(false);
                      setAvailableSelectors([]);
                      setFollowLinksConfig([]);
                      isSubmittingTask.current = false; // Reset submission flag
                    }}
                    className="text-gray-500 font-semibold hover:text-[#00364A] px-6 py-2 transition-colors"
                  >
                    Start New Extraction
                  </button>
                </div>
            </div>
          )}

        </div>
      </div>

      {previewData && <PreviewModal
        data={previewData}
        onClose={handleModalClose}
        onNext={handleNextPreviewStep}
        onPrevious={handlePreviousPreviewStep}
        currentStep={currentPreviewStep}
        isLoading={previewLoading || isSubPreviewLoading}
      />}
    </div>
  );
}