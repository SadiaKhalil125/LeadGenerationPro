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
      Product: {
        enabled: true,
        fields: [
          { attribute: "Name", selector: "", metadata: "" },
          { attribute: "Price", selector: "", metadata: "" },
        ],
      },
      User: {
        enabled: true,
        fields: [
          { attribute: "Username", selector: "", metadata: "" },
          { attribute: "Email", selector: "", metadata: "" },
        ],
      },
      Review: {
        enabled: true,
        fields: [
          { attribute: "Comment", selector: "", metadata: "" },
          { attribute: "Rating", selector: "", metadata: "" },
        ],
      },
      Order: {
        enabled: true,
        fields: [
          { attribute: "OrderId", selector: "", metadata: "" },
          { attribute: "Date", selector: "", metadata: "" },
        ],
      },
    });
  }, []);

  // Close dropdown on outside click
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

  const handleSave = () => {
    alert(
      "Saving Configuration:\n" +
        JSON.stringify({ source, url, entities: entityData }, null, 2)
    );
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
            <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">
              Source
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Enter source"
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block mb-2 text-gray-700 font-semibold text-sm uppercase">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL"
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>

        {/* Dropdown with click-away */}
        <div className="mb-8 relative" ref={dropdownRef}>
          <label className="block mb-4 text-gray-700 font-semibold text-sm uppercase">
            Select Entities
          </label>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex justify-between items-center w-full p-4 rounded-xl bg-gray-50 border border-gray-300 text-gray-700 cursor-pointer focus:ring-2 focus:ring-teal-400"
          >
            <span>
              {selectedEntities.length > 0
                ? selectedEntities.join(", ")
                : "Choose entities..."}
            </span>
            <ChevronDown className="w-5 h-5 opacity-70" />
          </div>

          {dropdownOpen && (
            <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20">
              {entities.map((entity, i) => (
                <label
                  key={i}
                  className="flex justify-between items-center px-4 py-3 hover:bg-gray-100 cursor-pointer text-gray-700"
                  onClick={() => handleEntityToggle(entity)}
                >
                  <span>{entity}</span>
                  <input
                    type="checkbox"
                    checked={selectedEntities.includes(entity)}
                    readOnly
                    className="form-checkbox h-5 w-5 text-teal-500 border-gray-400 focus:ring-teal-500 accent-teal-500"
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
              className="p-6 rounded-2xl border border-gray-200 bg-gray-50 shadow-md"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{entity}</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleEntityStatus(entity)}
                    style={{
                      backgroundColor: entityData[entity]?.enabled
                        ? "#10b981"
                        : "#6b7280",
                      color: "white",
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all hover:opacity-90"
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
                    style={{
                      backgroundColor: "#14b8a6",
                      color: "white",
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg font-semibold text-sm shadow-md transition-all hover:opacity-90"
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
                      className="p-3 rounded-xl bg-gray-200 border border-gray-300 text-gray-600"
                    />
                    <input
                      type="text"
                      placeholder="Selector"
                      value={field.selector}
                      onChange={(e) =>
                        handleFieldChange(
                          entity,
                          index,
                          "selector",
                          e.target.value
                        )
                      }
                      className="p-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                      type="text"
                      placeholder="Metadata"
                      value={field.metadata}
                      onChange={(e) =>
                        handleFieldChange(
                          entity,
                          index,
                          "metadata",
                          e.target.value
                        )
                      }
                      className="flex-1 p-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button (only visible if entities are selected) */}
        {selectedEntities.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={handleSave}
              style={{
                backgroundColor: "#14b8a6",
                color: "white",
              }}
              className="px-16 py-5 rounded-2xl shadow-xl font-bold text-xl tracking-wide transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:opacity-90"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
