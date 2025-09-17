import React, { useState } from "react";
import "./EntityForm.css";

const EntityForm = () => {
  const [entityName, setEntityName] = useState("");
  const [attributes, setAttributes] = useState([]);

  const addAttribute = () => {
    setAttributes([...attributes, { name: "", datatype: "text" }]);
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const deleteAttribute = (index) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const submitEntity = async () => {
    if (!entityName.trim()) {
      alert("Please enter entity name!");
      return;
    }
    if (attributes.length === 0) {
      alert("Please add at least one attribute!");
      return;
    }

    const payload = {
      name: entityName,
      attributes: attributes
    };

    console.log("Submitting:", payload);

    try {
      const response = await fetch("http://127.0.0.1:8000/save-entity", {  // write target url of backend for saving entity , /api/save-entity from vite.config.js
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Entity saved successfully!");
        setEntityName("");
        setAttributes([]);
      } else {
        alert("Failed to save entity!");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong!");
    }
  };

  return (
    <div className="schema-wrapper">
      <div className="schema-card">
        <h1 className="schema-heading">Create Entity</h1>

        <div className="input-group">
          <label htmlFor="entityName">Entity Name</label>
          <input
            type="text"
            id="entityName"
            placeholder="Enter table name"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
          />
        </div>

        {/* Attributes */}
        <div id="attributesContainer">
          {attributes.map((attr, index) => (
            <div className="field-row" key={index}>
              <input
                type="text"
                placeholder="Attribute name"
                className="attr-name"
                value={attr.name}
                onChange={(e) => updateAttribute(index, "name", e.target.value)}
              />
              <select
                className="field-type-select attr-type"
                value={attr.datatype}
                onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
              >
                <option value="text">String</option>
                <option value="int">Integer</option>
                <option value="bool">Boolean</option>
                <option value="Float">Float</option>
                <option value="Date">Date</option>
              </select>
              <button
                type="button"
                className="btn delete-btn"
                onClick={() => deleteAttribute(index)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* Add attribute */}
        <div className="center-btn">
          <button type="button" className="btn add-btn" onClick={addAttribute}>
            + Add Attribute
          </button>
        </div>

        {/* Submit */}
        <div className="center-btn">
          <button type="button" className="btn save-btn" onClick={submitEntity}>
            Save Entity
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityForm;