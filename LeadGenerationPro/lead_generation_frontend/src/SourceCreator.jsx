import React, { useState } from "react";
import { Database, ExternalLink, Layers, Save, X, Plus, AlertTriangle } from "lucide-react";
import API_BASE from "./api_base";

export default function SourceCreator() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [paginationType, setPaginationType] = useState("");
  const [paginationConfig, setPaginationConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    const paginationPayload = paginationType ? { type: paginationType, ...paginationConfig } : null;
    const targetUrl = `${API_BASE}/source/save-source?name=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`;
    
    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(paginationPayload)
      });

      const data = await res.json();
      setResponse({ type: 'success', message: data.message });
      setName("");
      setUrl("");
      setPaginationType("");
      setPaginationConfig({});
    } catch (err) {
      setResponse({ type: 'error', message: "Failed to save source." });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setPaginationType("");
    setPaginationConfig({});
    setResponse(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="bg-white/20 p-3 rounded-xl mr-4">
                  <Database size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Add New Source</h1>
                  <p className="text-teal-100">Define the source URL and its pagination configuration</p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="flex items-center px-4 py-2.5 bg-white/20 text-black rounded-xl hover:bg-white/30 transition-colors duration-200 font-medium"
              >
                <X size={18} className="mr-2" />
                Reset Form
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Response Messages */}
            {response && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${response.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {response.type === 'success' ? 
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Save size={16} className="text-green-600" />
                  </div> : 
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertTriangle size={16} className="text-red-600" />
                  </div>
                }
                <span>{response.message}</span>
                <button 
                  onClick={() => setResponse(null)}
                  className="ml-auto text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source Name */}
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Database size={16} className="text-teal-500" />
                    Source Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter source name"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* URL */}
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <ExternalLink size={16} className="text-teal-500" />
                    Source URL *
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Pagination Type */}
              <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Layers size={16} className="text-teal-500" />
                    Pagination Type
                  </label>
                  <select
                    value={paginationType}
                    onChange={(e) => {
                      setPaginationType(e.target.value);
                      setPaginationConfig({});
                    }}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    <option value="">Select pagination type</option>
                    {paginationTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic fields */}
              {paginationType && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Layers size={18} className="text-blue-500" />
                    Pagination Configuration
                  </h3>
                  <div className="space-y-4">
                    {paginationType === "query_param" && (
                      <>
                        <DynamicField
                          label="Param Name"
                          placeholder="page"
                          onChange={(v) => handlePaginationChange("param_name", v)}
                        />
                        <DynamicField
                          label="Start Page"
                          placeholder="1"
                          type="number"
                          onChange={(v) => handlePaginationChange("start_page", Number(v))}
                        />
                      </>
                    )}

                    {paginationType === "offset" && (
                      <>
                        <DynamicField
                          label="Param Name"
                          placeholder="e.g. offset"
                          onChange={(v) => handlePaginationChange("param_name", v)}
                        />
                        <DynamicField
                          label="Start Page"
                          placeholder="1"
                          type="number"
                          onChange={(v) => handlePaginationChange("start_page", Number(v))}
                        />
                        <DynamicField
                          label="Page Size"
                          placeholder="10"
                          type="number"
                          onChange={(v) => handlePaginationChange("page_size", Number(v))}
                        />
                        <DynamicField
                          label="Max Pages"
                          placeholder="Optional"
                          type="number"
                          onChange={(v) => handlePaginationChange("max_pages", Number(v))}
                        />
                      </>
                    )}

                    {paginationType === "path" && (
                      <DynamicField
                        label="Path Pattern"
                        placeholder="e.g. /page/{page_num}"
                        onChange={(v) => handlePaginationChange("path_pattern", v)}
                      />
                    )}

                    {(paginationType === "button_click" ||
                      paginationType === "ajax_click") && (
                      <>
                        <DynamicField
                          label="Button Selector"
                          placeholder=".next-button"
                          onChange={(v) => handlePaginationChange("button_selector", v)}
                        />
                        <DynamicField
                          label="Wait Selector"
                          placeholder=".results-loaded"
                          onChange={(v) => handlePaginationChange("wait_selector", v)}
                        />
                      </>
                    )}

                    {paginationType === "scroll" && (
                      <DynamicField
                        label="Scroll Steps"
                        placeholder="5"
                        type="number"
                        onChange={(v) =>
                          handlePaginationChange("scroll_steps", Number(v))
                        }
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || !name || !url}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 font-medium text-white bg-gradient-to-b from-teal-600 to-teal-700 rounded-xl hover:from-teal-700 hover:to-teal-800 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  Save Source
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 font-medium text-gray-700 bg-gradient-to-b from-gray-200 to-gray-300 rounded-xl hover:from-gray-300 hover:to-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helper component for repeated input fields */
function DynamicField({ label, placeholder, type = "text", onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
      />
    </div>
  );
}