import React, { useState, useEffect, useRef } from "react";
import { Eye, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, X, Info, Globe, AlertTriangle, Code } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


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

const PreviewModal = ({ data, onClose }) => {
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
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-teal-700">
            Preview: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{data.entity_name}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="font-semibold text-teal-800">{data.message}</p>
            <p className="text-sm text-teal-600 mt-1">
              Showing {data.data?.length || 0} of {data.total_items} total items.
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
        </div>
        
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

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
        placeholder="Metadata (text, href, src)"
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
              className="px-4 py-2 hover:bg-teal-50 cursor-pointer"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ServerHtmlPreview = ({ url }) => {
  const [status, setStatus] = useState('idle');
  const [htmlContent, setHtmlContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        fetchContent(url);
      } else {
        setStatus('idle');
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [url]);

  const fetchContent = async (urlToFetch) => {
    setStatus('loading');
    setHtmlContent('');
    setErrorMessage('');
    try {
      const res = await fetch("http://127.0.0.1:8000/utils/fetch-url-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToFetch }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch content from the server.');
      }
      
      setHtmlContent(data.content); // We use the raw content directly
      setStatus('success');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-800">
      {status === 'idle' && (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <Code size={48} className="mb-4 text-gray-500" />
          <h3 className="text-lg font-semibold">HTML Source View</h3>
          <p>Enter a URL to see the raw HTML source code.</p>
        </div>
      )}
      {status === 'loading' && (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-400">
          <div className="animate-spin text-teal-500"><Code size={48} /></div>
          <p className="mt-4 font-semibold">Fetching HTML Source...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="flex-grow flex flex-col items-center justify-center text-red-400 p-4">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h3 className="text-lg font-bold">Fetch Failed</h3>
          <p className="text-center mt-2 bg-red-900 bg-opacity-30 p-3 rounded-md">{errorMessage}</p>
        </div>
      )}
      {status === 'success' && (
        <div className="w-full h-full overflow-auto">
          <SyntaxHighlighter
            language="html"
            style={vscDarkPlus}
            showLineNumbers={true}
            wrapLines={true}
            customStyle={{ 
              margin: 0,
              height: '100%',
              width: '100%',
              padding: '1rem'
            }}
            codeTagProps={{
              style: {
                fontFamily: '"Fira Code", "Dank Mono", monospace',
                fontSize: '14px',
              }
            }}
          >
            {htmlContent}
          </SyntaxHighlighter>
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
  const [previewEntity, setPreviewEntity] = useState(null);

  const [isGoogleMaps, setIsGoogleMaps] = useState(false);

  useEffect(() => {
    const urlLower = url.toLowerCase();
    setIsGoogleMaps(urlLower.includes('google.com/maps') || urlLower.includes('maps.google.com'));
  }, [url]);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/entity/entities");
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
        const res = await fetch("http://127.0.0.1:8000/source/sources");
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

  const toggleEntityStatus = (entity) => {
    setEntityData((prev) => ({
      ...prev,
      [entity]: { ...prev[entity], enabled: !prev[entity].enabled },
    }));
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

  const handlePreview = async (entity) => {
    if (!source.trim() || !url.trim()) {
      alert("Source and URL are required!");
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
      const res = await fetch("http://127.0.0.1:8000/task/preview-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          entity_name: entity,
          container_selector: entityInfo.containerSelector || null,
          field_mappings,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        alert(`Preview failed: ${data.message}`);
      }
    } catch (err) {
      alert(`Preview error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
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
      const res = await fetch("http://127.0.0.1:8000/mapping/save-entity-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          <h1 className="text-3xl font-bold text-center text-teal-600 mb-8">
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
                        <p className="text-sm text-gray-500">{s.url}</p>
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
                      onClick={() => toggleEntityStatus(entity)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-md"
                      style={{ backgroundColor: entityData[entity]?.enabled ? "#10b981" : "#6b7280" }}
                    >
                      {entityData[entity]?.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {entityData[entity]?.enabled ? "Enabled" : "Disabled"}
                    </button>

                    <button
                      onClick={() => handlePreview(entity)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-teal-500 to-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700"
                      disabled={previewLoading}
                    >
                      <Eye size={16} />
                      {previewLoading && previewEntity === entity ? 'Loading...' : 'Preview'}
                    </button>
                  </div>
                </div>

                {!entityData[entity]?.enabled && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm font-medium">
                      ⚠️ Disabled - won't be processed during scraping
                    </p>
                  </div>
                )}

                {!isGoogleMaps && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      CONTAINER SELECTOR (optional)
                    </label>
                    <input
                      placeholder=".class or #main"
                      value={entityData[entity]?.containerSelector || ""}
                      onChange={(e) =>
                        setEntityData((prev) => ({
                          ...prev,
                          [entity]: { ...prev[entity], containerSelector: e.target.value },
                        }))
                      }
                      className="w-full p-3 rounded-xl bg-white border border-gray-300 focus:ring-2 focus:ring-teal-400"
                    />
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
                          <input
                            placeholder={isSupported ? "Auto (or custom CSS)" : "CSS Selector"}
                            value={field.selector}
                            onChange={(e) => handleFieldChange(entity, field.attribute, "selector", e.target.value)}
                            className="p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
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
                className="px-8 py-5 bg-gradient-to-b from-blue-500 to-blue-600 text-white rounded-2xl shadow-xl font-bold text-xl hover:scale-105 transition-all"
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
      
      {previewData && <PreviewModal data={previewData} onClose={() => setPreviewData(null)} />}
    </div>
  );
}