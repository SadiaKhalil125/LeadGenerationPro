import React, { useState, useEffect, useRef } from "react";
import { Eye, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";

export default function EntityMappingScreen() {
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");

  const [entities, setEntities] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [entityData, setEntityData] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  useEffect(() => {
    setEntities(["Product", "User", "Review", "Order"]);
    setEntityData({
      Product: { enabled: true, fields: [{ attribute: "Name", selector: "", metadata: "" }, { attribute: "Price", selector: "", metadata: "" }] },
      User: { enabled: true, fields: [{ attribute: "Username", selector: "", metadata: "" }, { attribute: "Email", selector: "", metadata: "" }] },
      Review: { enabled: true, fields: [{ attribute: "Comment", selector: "", metadata: "" }, { attribute: "Rating", selector: "", metadata: "" }] },
      Order: { enabled: true, fields: [{ attribute: "OrderId", selector: "", metadata: "" }, { attribute: "Date", selector: "", metadata: "" }] },
    });
  }, []);

  // 👇 Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEntityToggle = (entity) => {
    if (selectedEntities.includes(entity)) {
      setSelectedEntities(selectedEntities.filter((e) => e !== entity));
    } else {
      setSelectedEntities([...selectedEntities, entity]);
    }
  };

  const toggleEntityStatus = (entity) => {
    setEntityData((prev) => ({
      ...prev,
      [entity]: { ...prev[entity], enabled: !prev[entity].enabled },
    }));
  };

  const handleFieldChange = (entity, index, field, value) => {
    const updatedFields = [...entityData[entity].fields];
    updatedFields[index][field] = value;
    setEntityData((prev) => ({
      ...prev,
      [entity]: { ...prev[entity], fields: updatedFields },
    }));
  };

  const handleReview = (entity) => {
    alert("Reviewing Entity: " + JSON.stringify(entityData[entity], null, 2));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f23] via-[#16213e] to-[#0f3460] p-8">
      <div className="w-full max-w-5xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-10">
        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Entity Mapping Configuration
        </h1>

        {/* Source + URL */}
        <div className="space-y-6 mb-8">
          <div>
            <label className="block mb-2 text-gray-200 font-semibold text-sm uppercase">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter source"
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block mb-2 text-gray-200 font-semibold text-sm uppercase">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL"
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Dropdown with click-away */}
        <div className="mb-8 relative" ref={dropdownRef}>
          <label className="block mb-4 text-gray-200 font-semibold text-sm uppercase">
            Select Entities
          </label>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex justify-between items-center w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white cursor-pointer"
          >
            <span>
              {selectedEntities.length > 0
                ? selectedEntities.join(", ")
                : "Choose entities..."}
            </span>
            <ChevronDown className="w-5 h-5 opacity-70" />
          </div>

          {dropdownOpen && (
            <div className="absolute mt-2 w-full bg-[#16213e] border border-white/20 rounded-xl shadow-lg z-20">
              {entities.map((entity, i) => (
                <label
                  key={i}
                  className="flex justify-between items-center px-4 py-3 hover:bg-[#1a1a2e] cursor-pointer text-gray-200"
                  onClick={() => handleEntityToggle(entity)}
                >
                  <span>{entity}</span>
                  <input
                    type="checkbox"
                    checked={selectedEntities.includes(entity)}
                    readOnly
                    className="form-radio h-5 w-5 text-teal-400 border-gray-400 rounded-full"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Expanded Entity Mapping Boxes */}
        <div className="space-y-6">
          {selectedEntities.map((entity) => (
            <div
              key={entity}
              className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">{entity}</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleEntityStatus(entity)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                  >
                    {entityData[entity]?.enabled ? (
                      <>
                        <ToggleRight size={16} /> Enabled
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={16} /> Disabled
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(entity)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    <Eye size={16} /> Review
                  </button>
                </div>
              </div>

              {/* Field Rows */}
              <div className="space-y-4">
                {entityData[entity]?.fields.map((field, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 items-center"
                  >
                    <input
                      type="text"
                      value={field.attribute}
                      disabled
                      className="p-3 rounded-xl bg-gray-600/40 border border-white/20 text-gray-300"
                    />
                    <input
                      type="text"
                      placeholder="Selector"
                      value={field.selector}
                      onChange={(e) =>
                        handleFieldChange(entity, index, "selector", e.target.value)
                      }
                      className="p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Metadata"
                      value={field.metadata}
                      onChange={(e) =>
                        handleFieldChange(entity, index, "metadata", e.target.value)
                      }
                      className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
