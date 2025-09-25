import React, { useState, useEffect, useRef } from "react";
import { Eye, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- 1. Define reusable metadata options ---
const METADATA_OPTIONS = ["text", "href", "src", "html", "datetime"];

// --- 2. Create a new component for the Metadata Input with Dropdown ---
const MetadataInput = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Effect to close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onChange(option); // Update the parent state
    setIsOpen(false); // Close the dropdown
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        placeholder="Metadata (e.g., text, href)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)} // Open dropdown on focus
        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
      />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
        aria-label="Toggle metadata options"
      >
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => handleSelect(option)}
              className="px-4 py-2 hover:bg-teal-50 cursor-pointer text-gray-700"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default function EntityMappingScreen() {
  const navigate = useNavigate();
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

  // Fetch available entities and columns
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/entity/entities");
        if (!res.ok) throw new Error(`Failed to fetch entities: ${res.status}`);
        const data = await res.json();

        setEntities(data.entities.map((e) => e.name));
        const initialData = {};
        data.entities.forEach((e) => {
          initialData[e.name] = {
            enabled: true,
            containerSelector: "",
            fields: e.columns.filter((col) => col !== "modified_at").map((col) => ({
              attribute: col,
              selector: "",
              metadata: "", // Default to empty
            })),
          };
        });
        setEntityData(initialData);
      } catch (err) {
        console.error("Error fetching entities:", err);
        alert("Failed to load entities.");
      }
    };
    fetchEntities();
  }, []);

  // Fetch existing sources
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/source/sources");
        if (!res.ok) throw new Error(`Failed to fetch sources: ${res.status}`);
        const data = await res.json();
        setExistingSources(data.sources || []);
      } catch (err) {
        console.error("Error fetching sources:", err);
      }
    };
    fetchSources();
  }, []);

  // Close dropdowns on outside click
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
    setEntityData((prev) => {
      const cur = prev[entity] || { fields: [] };
      return {
        ...prev,
        [entity]: { ...cur, enabled: !cur.enabled, fields: [...cur.fields] },
      };
    });
  };

  const handleFieldChange = (entity, attribute, key, value) => {
    setEntityData((prev) => {
      const cur = prev[entity];
      if (!cur) return prev;
      const updatedFields = cur.fields.map((f) =>
        f.attribute === attribute ? { ...f, [key]: value } : f
      );
      return {
        ...prev,
        [entity]: { ...cur, fields: updatedFields },
      };
    });
  };

  const handleSourceSelect = (selectedSource) => {
    setSource(selectedSource.name);
    setUrl(selectedSource.url);
    setSourcesDropdownOpen(false);
  };

  const handleReview = (entity) => {
    alert(`Reviewing ${entity}:\n${JSON.stringify(entityData[entity], null, 2)}`);
  };

  const handleSave = async () => {
    if (!source.trim() || !url.trim()) {
      alert("Source and URL are required!");
      return;
    }

    const entity_mappings = selectedEntities.map((entity) => {
      const container_selector = entityData[entity]?.containerSelector || null;
      const field_mappings = {};

      (entityData[entity]?.fields || [])
        .filter((f) => f.attribute.toLowerCase() !== "id")
        .forEach((f) => {
          field_mappings[f.attribute] = {
            selector: f.selector,
            // Fallback to 'text' if metadata is empty
            extract: f.metadata || "text",
          };
        });

      return { entity_name: entity, container_selector, field_mappings };
    });

    const payload = { source, url, entity_mappings };

    try {
      const res = await fetch("http://127.0.0.1:8000/mapping/save-entity-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Save failed");
      alert(`✅ ${data.message}`);
    } catch (err) {
      console.error(err);
      alert(`❌ Failed to save mappings: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl border-t-8 border-teal-400 p-10">
        <h1 className="text-3xl font-bold text-center text-teal-600 mb-8">
          Entity Mapping Configuration
        </h1>

        {/* Source + URL with Dropdown */}
        <div className="space-y-6 mb-8">
          <div>
            <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">Source</label>
            <div className="relative" ref={sourcesDropdownRef}>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                onFocus={() => setSourcesDropdownOpen(true)}
                placeholder="Enter or select a source"
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={() => setSourcesDropdownOpen(!sourcesDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
              >
                {sourcesDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {sourcesDropdownOpen && existingSources.length > 0 && (
                <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto">
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

        {/* Entity Selector Dropdown */}
        <div className="mb-8 relative" ref={entitiesDropdownRef}>
          <label className="block mb-4 text-gray-700 font-semibold text-sm uppercase">
            Select Entities
          </label>
          <div
            onClick={() => setEntitiesDropdownOpen(!entitiesDropdownOpen)}
            className="flex justify-between items-center w-full p-4 rounded-xl bg-gray-50 border border-gray-300 cursor-pointer"
          >
            <span>{selectedEntities.length > 0 ? selectedEntities.join(", ") : "Choose entities..."}</span>
            <ChevronDown className="w-5 h-5 opacity-70" />
          </div>

          {entitiesDropdownOpen && (
            <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20">
              {entities.map((entity) => (
                <label
                  key={entity}
                  className="flex justify-between items-center px-4 py-3 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEntityToggle(entity);
                  }}
                >
                  <span>{entity}</span>
                  <input
                    type="checkbox"
                    checked={selectedEntities.includes(entity)}
                    readOnly
                    className="h-5 w-5 text-teal-500 border-gray-400 accent-teal-500"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Mapping Boxes */}
        <div className="space-y-6">
          {selectedEntities.map((entity) => (
            <div key={entity} className="p-6 rounded-2xl border border-gray-200 bg-gray-50 shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{entity}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleEntityStatus(entity)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-white shadow-md"
                    style={{
                      backgroundColor: entityData[entity]?.enabled ? "#10b981" : "#6b7280",
                    }}
                  >
                    {entityData[entity]?.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    <span className="ml-2">{entityData[entity]?.enabled ? "Enabled" : "Disabled"}</span>
                  </button>

                  <button
                    onClick={() => handleReview(entity)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-white shadow-md"
                    style={{ backgroundColor: "#14b8a6" }}
                  >
                    <Eye size={16} /> Review
                  </button>
                </div>
              </div>

              {/* Container selector field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2 text-left">
                  CONTAINER SELECTOR (optional)
                </label>
                <input
                  placeholder=".class or #main"
                  value={entityData[entity]?.containerSelector || ""}
                  onChange={(e) =>
                    setEntityData((prev) => {
                      const cur = prev[entity] || { fields: [] };
                      return {
                        ...prev,
                        [entity]: {
                          ...cur,
                          containerSelector: e.target.value,
                          fields: [...cur.fields],
                        },
                      };
                    })
                  }
                  className="w-full p-3 rounded-xl bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
              </div>

              {/* Field rows */}
              {(entityData[entity]?.fields || [])
                .filter((field) => field.attribute.toLowerCase() !== "id")
                .map((field) => (
                  <div key={`${entity}-${field.attribute}`} className="grid grid-cols-3 gap-4 mb-4">
                    <input
                      value={field.attribute}
                      disabled
                      className="p-3 rounded-xl bg-gray-200 border border-gray-300 text-gray-600"
                    />
                    <input
                      placeholder="Selector"
                      value={field.selector}
                      onChange={(e) => handleFieldChange(entity, field.attribute, "selector", e.target.value)}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
                    />
                    {/* --- 3. Replace the old input with the new MetadataInput component --- */}
                    <MetadataInput
                      value={field.metadata}
                      onChange={(newValue) => handleFieldChange(entity, field.attribute, "metadata", newValue)}
                      options={METADATA_OPTIONS}
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>

        {selectedEntities.length > 0 && (
          <div className="mt-10 flex justify-center gap-6">
            <button
              onClick={handleSave}
              className="px-16 py-5 rounded-2xl shadow-xl font-bold text-xl tracking-wide transition-all hover:scale-105"
              style={{ backgroundColor: "#14b8a6", color: "white" }}
            >
              Save Configuration
            </button>
            <button
              onClick={() => navigate("/mappingmanager")}
              className="px-8 py-5 rounded-2xl shadow-xl font-bold text-xl tracking-wide text-white transition-all hover:scale-105"
              style={{ backgroundColor: "#1495b8ff", color: "white" }}
            >
              Go to Mappings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}