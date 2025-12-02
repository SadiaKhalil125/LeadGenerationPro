import React, { useState, useEffect, useRef } from "react";
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
  ArrowRightCircle,
  Code
} from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import API_BASE from "./api_base";

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
          <h2 className="text-2xl font-bold" style={{ color: '#00364A' }}>
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
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#E6F0F7', borderColor: '#49A3C4', borderWidth: '1px', borderStyle: 'solid' }}>
            <p className="font-semibold" style={{ color: '#00364A' }}>{data.message}</p>
            <p className="text-sm mt-1" style={{ color: '#49A3C4' }}>
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
            className="px-6 py-2 text-white font-bold rounded-lg"
            style={{ backgroundColor: '#00364A' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#49A3C4'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#00364A'}
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
        onFocus={(e) => {
          setIsOpen(true);
          e.target.style.borderColor = '#49A3C4';
        }}
        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300"
        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
              className="px-4 py-2 cursor-pointer"
              onMouseEnter={(e) => e.target.style.backgroundColor = '#E6F0F7'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
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
      const res = await fetch(`${API_BASE}/fetchcontent`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({ url: urlToFetch }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch content from the server.');
      }
      
      setHtmlContent(data.content);
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
          <div className="animate-spin" style={{ color: '#49A3C4' }}><Code size={48} /></div>
          <p className="mt-4 font-semibold">Fetching HTML Source...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="flex-grow flex flex-col items-center justify-center text-red-400 p-4">
          <AlertCircle size={48} className="mb-4 text-red-500" />
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

export default function QuickExtract() {
  const [url, setUrl] = useState("");
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [entityData, setEntityData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewNextLoading, setPreviewNextLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isGoogleMaps, setIsGoogleMaps] = useState(false);
  const [entitiesDropdownOpen, setEntitiesDropdownOpen] = useState(false);
  const entitiesDropdownRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: URL, 2: Entity, 3: Mappings, 4: Results

  useEffect(() => {
    const urlLower = url.toLowerCase();
    setIsGoogleMaps(urlLower.includes('google.com/maps') || urlLower.includes('maps.google.com'));
  }, [url]);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch(`${API_BASE}/entity/entities`, {
          method: "GET",
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        const data = await res.json();
        setEntities(data.entities || []);
      } catch (err) {
        console.error("Error fetching entities:", err);
      }
    };
    fetchEntities();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (entitiesDropdownRef.current && !entitiesDropdownRef.current.contains(e.target)) {
        setEntitiesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      fetchEntityInfo(selectedEntity);
      setCurrentStep(3);
    }
  }, [selectedEntity]);

  const fetchEntityInfo = async (entityName) => {
    try {
      const res = await fetch(`${API_BASE}/entity/entity-info/${entityName}`, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      if (data.success) {
        const fields = data.columns
          .filter((col) => col.name !== "id" && col.name !== "modified_at" && col.name !== "source")
          .map((col) => ({
            attribute: col.name,
            selector: "",
            metadata: "text",
          }));
        setEntityData({
          containerSelector: "",
          fields: fields,
        });
      }
    } catch (err) {
      console.error("Error fetching entity info:", err);
    }
  };

  const handleFieldChange = (attribute, key, value) => {
    setEntityData((prev) => {
      const updatedFields = prev.fields.map((f) =>
        f.attribute === attribute ? { ...f, [key]: value } : f
      );
      return { ...prev, fields: updatedFields };
    });
  };

  const isGoogleMapsSupported = (fieldName) => {
    const normalized = fieldName.toLowerCase().replace(/_/g, '');
    return Object.keys(GOOGLE_MAPS_FIELDS).some(key => 
      normalized.includes(key) || key.includes(normalized)
    );
  };

  const handlePreview = async () => {
    if (!url.trim() || !selectedEntity) {
      alert("URL and Entity are required!");
      return;
    }

    const field_mappings = {};
    let hasValidMappings = false;

    entityData.fields.forEach((f) => {
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

    try {
      const res = await fetch(`${API_BASE}/task/preview-mapping`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          url,
          entity_name: selectedEntity,
          container_selector: entityData.containerSelector || null,
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

  const handleNextPreview = async () => {
    if (!url.trim() || !selectedEntity) {
      alert("URL and Entity are required!");
      return;
    }

    const field_mappings = {};
    let hasValidMappings = false;

    entityData.fields.forEach((f) => {
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

    setPreviewNextLoading(true);

    try {
      const res = await fetch(`${API_BASE}/task/preview-next-mapping`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          url,
          entity_name: selectedEntity,
          container_selector: entityData.containerSelector || null,
          field_mappings,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        alert(`Preview Next failed: ${data.message}`);
      }
    } catch (err) {
      alert(`Preview Next error: ${err.message}`);
    } finally {
      setPreviewNextLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!url.trim() || !selectedEntity) {
      alert("URL and Entity are required!");
      return;
    }

    const field_mappings = {};
    let hasValidMappings = false;

    entityData.fields.forEach((f) => {
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

    setExtracting(true);
    setExtractedData(null);

    try {
      const scrapeRequest = {
        entity_name: selectedEntity,
        url: url,
        container_selector: entityData.containerSelector || null,
        field_mappings: field_mappings,
        max_items: null,
        timeout: 15
      };

      const res = await fetch(`${API_BASE}/scrapedynamic`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify(scrapeRequest),
      });

      const data = await res.json();
      if (data.success) {
        setExtractedData(data);
        setCurrentStep(4);
      } else {
        alert(`Extraction failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Extraction error: ${err.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const exportToCSV = () => {
    if (!extractedData || !extractedData.data || extractedData.data.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = Object.keys(extractedData.data[0]);
    const csvRows = [
      headers.join(','),
      ...extractedData.data.map(row =>
        headers.map(header => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEntity}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (!extractedData || !extractedData.data || extractedData.data.length === 0) {
      alert("No data to export!");
      return;
    }

    try {
      const headers = Object.keys(extractedData.data[0]);
      
      // Create Excel XML format
      let xml = '<?xml version="1.0"?>\n';
      xml += '<?mso-application progid="Excel.Sheet"?>\n';
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
      xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
      xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
      xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
      xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
      xml += '<Worksheet ss:Name="Sheet1">\n';
      xml += '<Table>\n';

      // Add header row
      xml += '<Row>\n';
      headers.forEach(header => {
        xml += `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>\n`;
      });
      xml += '</Row>\n';

      // Add data rows
      extractedData.data.forEach(row => {
        xml += '<Row>\n';
        headers.forEach(header => {
          const value = row[header] || '';
          const type = isNaN(value) ? 'String' : 'Number';
          xml += `<Cell><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>\n`;
        });
        xml += '</Row>\n';
      });

      xml += '</Table>\n';
      xml += '</Worksheet>\n';
      xml += '</Workbook>';

      // Create blob and download
      const blob = new Blob([xml], { 
        type: 'application/vnd.ms-excel' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedEntity}_${new Date().getTime()}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Excel export failed. Please try CSV export instead.");
    }
  };

  const escapeXml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 60px',
        position: 'relative',
        zIndex: 50
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '12px 40px',
          boxShadow: '0 4px 20px rgba(0, 54, 74, 0.1)',
          width: '100%',
          maxWidth: '1400px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#00364A'
          }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            QUICK EXTRACT
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl mb-6" style={{ overflow: 'visible', position: 'relative' }}>
          {/* Progress Steps */}
          <div className="text-white p-6" style={{ background: 'linear-gradient(to right, #00364A, #49A3C4)', overflow: 'visible' }}>
            <h1 className="text-3xl font-bold mb-4">Quick Data Extraction</h1>
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center gap-2 ${currentStep >= step ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= step ? 'bg-white' : 'bg-white/30 text-white'}`} style={currentStep >= step ? { color: '#00364A' } : {}}>
                      {step}
                    </div>
                    <span className="text-sm font-medium">
                      {step === 1 && 'URL'}
                      {step === 2 && 'Entity'}
                      {step === 3 && 'Mappings'}
                      {step === 4 && 'Results'}
                    </span>
                  </div>
                  {step < 4 && <ArrowRight className="w-5 h-5 opacity-50" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="p-8" style={{ overflow: 'visible', position: 'relative' }}>
            {/* Step 1: URL Input */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Enter URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-300 text-lg"
                    onFocus={(e) => e.target.style.borderColor = '#49A3C4'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => url.trim() && setCurrentStep(2)}
                    disabled={!url.trim()}
                    className="px-8 py-3 text-white rounded-xl shadow-lg font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: url.trim() ? '#00364A' : '#ccc',
                    }}
                    onMouseEnter={(e) => url.trim() && (e.target.style.backgroundColor = '#49A3C4')}
                    onMouseLeave={(e) => url.trim() && (e.target.style.backgroundColor = '#00364A')}
                  >
                    Next: Select Entity <ArrowRight className="w-5 h-5 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Entity Selection */}
            {currentStep === 2 && (
              <div className="space-y-6" style={{ overflow: 'visible', position: 'relative' }}>
                <div className="relative" ref={entitiesDropdownRef} style={{ zIndex: 1000, overflow: 'visible' }}>
                  <label className="block mb-4 text-gray-700 font-semibold text-sm uppercase">
                    <Database className="w-4 h-4 inline mr-2" />
                    Select Entity
                  </label>
                  <div
                    onClick={() => setEntitiesDropdownOpen(!entitiesDropdownOpen)}
                    className="flex justify-between items-center w-full p-4 rounded-xl bg-gray-50 border border-gray-300 cursor-pointer"
                  >
                    <span>{selectedEntity || "Choose entity..."}</span>
                    <ChevronDown className="w-5 h-5" />
                  </div>

                  {entitiesDropdownOpen && (
                    <div 
                      className="absolute mt-2 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto" 
                      style={{ 
                        zIndex: 9999,
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0
                      }}
                    >
                      {entities.map((entity) => (
                        <div
                          key={entity.name}
                          onClick={() => {
                            setSelectedEntity(entity.name);
                            setEntitiesDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer"
                        >
                          <p className="font-semibold">{entity.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl shadow-lg font-bold text-lg hover:bg-gray-300 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => selectedEntity && setCurrentStep(3)}
                    disabled={!selectedEntity}
                    className="px-8 py-3 text-white rounded-xl shadow-lg font-bold text-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: selectedEntity ? '#00364A' : '#ccc',
                    }}
                    onMouseEnter={(e) => selectedEntity && (e.target.style.backgroundColor = '#49A3C4')}
                    onMouseLeave={(e) => selectedEntity && (e.target.style.backgroundColor = '#00364A')}
                  >
                    Next: Configure Mappings <ArrowRight className="w-5 h-5 inline ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Mappings */}
            {currentStep === 3 && entityData && (
              <div className="space-y-6">
                {isGoogleMaps && (
                  <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg flex gap-3">
                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-blue-800">Google Maps Detected</p>
                      <p className="text-sm text-blue-700 mt-1">
                        For supported fields, you can leave selectors empty for auto-extraction.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    CONTAINER SELECTOR
                  </label>
                  <input
                    placeholder=".class or #main"
                    value={entityData.containerSelector || ""}
                    onChange={(e) =>
                      setEntityData((prev) => ({
                        ...prev,
                        containerSelector: e.target.value,
                      }))
                    }
                            className="w-full p-3 rounded-xl bg-white border border-gray-300"
                            onFocus={(e) => e.target.style.borderColor = '#49A3C4'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <h3 className="text-lg font-bold text-gray-800">Field Mappings</h3>
                  {entityData.fields.map((field) => {
                    const isSupported = isGoogleMaps && isGoogleMapsSupported(field.attribute);
                    return (
                      <div key={field.attribute} className="p-4 bg-gray-50 rounded-xl border">
                        {isSupported && (
                          <div className="text-xs mb-2 flex items-center gap-1" style={{ color: '#49A3C4' }}>
                            <CheckCircle size={12} />
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
                            onChange={(e) => handleFieldChange(field.attribute, "selector", e.target.value)}
                            className="p-3 rounded-xl bg-white border border-gray-300"
                            onFocus={(e) => e.target.style.borderColor = '#49A3C4'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                          <MetadataInput
                            value={field.metadata}
                            onChange={(val) => handleFieldChange(field.attribute, "metadata", val)}
                            options={METADATA_OPTIONS}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl shadow-lg font-bold text-lg hover:bg-gray-300 transition-all"
                  >
                    ← Back
                  </button>
                  <div className="flex gap-4">
                    <button
                      onClick={handlePreview}
                      disabled={previewLoading}
                      className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: '#49A3C4' }}
                      onMouseEnter={(e) => !previewLoading && (e.target.style.backgroundColor = '#00364A')}
                      onMouseLeave={(e) => !previewLoading && (e.target.style.backgroundColor = '#49A3C4')}
                    >
                      {previewLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                      Preview
                    </button>
                    <button
                      onClick={handleNextPreview}
                      disabled={previewNextLoading}
                      className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: '#49A3C4' }}
                      onMouseEnter={(e) => !previewNextLoading && (e.target.style.backgroundColor = '#00364A')}
                      onMouseLeave={(e) => !previewNextLoading && (e.target.style.backgroundColor = '#49A3C4')}
                    >
                      {previewNextLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRightCircle className="w-5 h-5" />
                      )}
                      Next Preview
                    </button>
                    <button
                      onClick={handleExtract}
                      disabled={extracting}
                      className="flex items-center gap-2 px-8 py-3 text-white rounded-xl shadow-lg disabled:opacity-50 font-bold text-lg"
                      style={{ backgroundColor: '#00364A' }}
                      onMouseEnter={(e) => !extracting && (e.target.style.backgroundColor = '#49A3C4')}
                      onMouseLeave={(e) => !extracting && (e.target.style.backgroundColor = '#00364A')}
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Extract Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {currentStep === 4 && extractedData && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Extracted Data</h2>
                    <p className="text-gray-600 mt-1">
                      {extractedData.total_items || extractedData.data?.length || 0} items extracted
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow-lg font-bold"
                      style={{ backgroundColor: '#49A3C4' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#00364A'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#49A3C4'}
                    >
                      <Download className="w-5 h-5" />
                      Export CSV
                    </button>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow-lg font-bold"
                      style={{ backgroundColor: '#00364A' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#49A3C4'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#00364A'}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                      Export Excel
                    </button>
                  </div>
                </div>

                {extractedData.data && extractedData.data.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-700 bg-white">
                      <thead className="bg-gray-100 text-xs text-gray-800 uppercase">
                        <tr>
                          {Object.keys(extractedData.data[0]).map((header) => (
                            <th key={header} className="px-6 py-3 font-semibold">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.data.map((item, index) => (
                          <tr key={index} className="bg-white border-b hover:bg-gray-50">
                            {Object.keys(extractedData.data[0]).map((header) => (
                              <td key={`${index}-${header}`} className="px-6 py-4">
                                {String(item[header] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Database size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No Data Extracted</h3>
                    <p className="text-gray-500 mt-1">The extraction returned no results.</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      setExtractedData(null);
                      setUrl("");
                      setSelectedEntity("");
                      setEntityData(null);
                    }}
                    className="px-8 py-3 text-white rounded-xl shadow-lg font-bold text-lg"
                    style={{ backgroundColor: '#00364A' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#49A3C4'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#00364A'}
                  >
                    Start New Extraction
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewData && <PreviewModal data={previewData} onClose={() => setPreviewData(null)} />}
    </div>
  );
}
