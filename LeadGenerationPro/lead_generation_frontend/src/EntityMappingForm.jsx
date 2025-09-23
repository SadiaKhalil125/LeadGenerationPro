import React, { useState, useEffect, useRef } from "react";
import { Eye, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EntityMappingScreen() {
  const navigate = useNavigate();
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");

  const [entities, setEntities] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [entityData, setEntityData] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch available entities and columns (runs once)
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/entity/entities");
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();

        // Build entities list and initial entityData (with containerSelector + fields)
        setEntities(data.entities.map((e) => e.name));
        const initialData = {};
        data.entities.forEach((e) => {
          initialData[e.name] = {
            enabled: true,
            containerSelector: "",
            fields: e.columns.map((col) => ({
              attribute: col,
              selector: "",
              metadata: "",
            })),
          };
        });
        setEntityData(initialData);
      } catch (err) {
        console.error(err);
        alert("Failed to load entities.");
      }
    };
    fetchEntities();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
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

  // Toggle enabled — preserve fields immutably
  const toggleEntityStatus = (entity) => {
    setEntityData((prev) => {
      const cur = prev[entity] || { fields: [] };
      return {
        ...prev,
        [entity]: { ...cur, enabled: !cur.enabled, fields: [...cur.fields] },
      };
    });
  };

  // --- FIXED: update by attribute (stable id) instead of index ---
  const handleFieldChange = (entity, attribute, key, value) => {
    // important: use functional setState to avoid stale closures
    setEntityData((prev) => {
      const cur = prev[entity];
      if (!cur) return prev; // defensive
      const updatedFields = cur.fields.map((f) =>
        f.attribute === attribute ? { ...f, [key]: value } : f
      );
      return {
        ...prev,
        [entity]: { ...cur, fields: updatedFields },
      };
    });
  };

  const handleReview = (entity) => {
    alert(`Reviewing ${entity}:\n${JSON.stringify(entityData[entity], null, 2)}`);
  };

  const handleSave = async () => {
    if (!source.trim() || !url.trim()) {
      alert("Source and URL are required!");
      return;
    }

    // Build entity_mappings array for backend — exclude 'id'
    const entity_mappings = selectedEntities.map((entity) => {
      const container_selector = entityData[entity]?.containerSelector || null;
      const field_mappings = {};

      (entityData[entity]?.fields || [])
        .filter((f) => f.attribute.toLowerCase() !== "id")
        .forEach((f) => {
          field_mappings[f.attribute] = {
            selector: f.selector,
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

        {/* Source + URL */}
        <div className="space-y-6 mb-8">
          <div>
            <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter source"
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
            />
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

        {/* Dropdown */}
        <div className="mb-8 relative" ref={dropdownRef}>
          <label className="block mb-4 text-gray-700 font-semibold text-sm uppercase">
            Select Entities
          </label>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex justify-between items-center w-full p-4 rounded-xl bg-gray-50 border border-gray-300 cursor-pointer"
          >
            <span>{selectedEntities.length > 0 ? selectedEntities.join(", ") : "Choose entities..."}</span>
            <ChevronDown className="w-5 h-5 opacity-70" />
          </div>

          {dropdownOpen && (
            <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20">
              {entities.map((entity) => (
                <label
                  key={entity}
                  className="flex justify-between items-center px-4 py-3 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleEntityToggle(entity)}
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
                          fields: [...cur.fields], // preserve fields array immutably
                        },
                      };
                    })
                  }
                  className="w-full p-3 rounded-xl bg-white border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                />
              </div>

              {/* Field rows (exclude 'id'), stable keys, update by attribute */}
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
                    <input
                      placeholder="Metadata (extract type)"
                      value={field.metadata}
                      onChange={(e) => handleFieldChange(entity, field.attribute, "metadata", e.target.value)}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-300 focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>

        {selectedEntities.length > 0 && (
          <div className="mt-10 flex justify-center gap-6">
            {/* Save Button */}
            <button
              onClick={handleSave}
              className="px-16 py-5 rounded-2xl shadow-xl font-bold text-xl tracking-wide transition-all hover:scale-105"
              style={{ backgroundColor: "#14b8a6", color: "white" }}
            >
              Save Configuration
            </button>

            {/* Go to Mappings */}
            <button
              onClick={() => navigate("/mappingmanager")}
              className="px-8 py-5 rounded-2xl shadow-xl font-bold text-xl tracking-wide text-white bg-gradient-to-b from-blue-600 to-blue-400 hover:bg-blue-700 transition-all hover:scale-105"
            >
              Go to Mappings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
