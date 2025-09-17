import React, { useState } from "react";
import "./AddSchema.css";

function AddSchema() {
  const [entityName, setEntityName] = useState("");
  const [fields, setFields] = useState([{ name: "", type: "String" }]);

  // handle field name
  const handleFieldChange = (index, value) => {
    const updatedFields = [...fields];
    updatedFields[index].name = value;
    setFields(updatedFields);
  };

  // handle type selection
  const handleTypeChange = (index, value) => {
    const updatedFields = [...fields];
    updatedFields[index].type = value;
    setFields(updatedFields);
  };

  // delete row
  const handleDelete = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // add row
  const handleAddField = () => {
    setFields([...fields, { name: "", type: "String" }]);
  };

  // save schema
  const handleSaveSchema = () => {
    alert("Schema saved successfully!");
    console.log("Entity Name:", entityName);
    console.log("Fields:", fields);
  };

  return (
    <div className="schema-wrapper">
      <div className="schema-card">
        {/* Top Heading */}
        <h1 className="schema-heading">Add Schema</h1>

        {/* Entity Name */}
        {/* <div className="input-group">
          <label>Enter Entity Name</label>
          <input
            type="text"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            placeholder="Entity name..."
          />
        </div> */}
        <div className="input-group">
          <label style={{ textAlign: "left" }}>Enter Entity Name</label>
          <input
          type="text"
          className="entity-input"
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
          placeholder="Entity name..."
          />
        </div>


        {/* Fields */}
        {fields.map((field, index) => (
          <div key={index} className="field-row">
            <input
              type="text"
              placeholder="Company Name"
              value={field.name}
              onChange={(e) => handleFieldChange(index, e.target.value)}
            />
            <select
              value={field.type}
              onChange={(e) => handleTypeChange(index, e.target.value)}
              className="field-type-select"
            >
              <option value="String">String</option>
              <option value="Integer">Integer</option>
              <option value="Boolean">Boolean</option>
              <option value="Float">Float</option>
              <option value="Date">Date</option>
            </select>
            <button className="btn edit-btn">Edit</button>
            <button
              className="btn delete-btn"
              onClick={() => handleDelete(index)}
            >
              Delete
            </button>
          </div>
        ))}

        {/* Add More */}
        <div className="center-btn">
          <button className="btn add-btn" onClick={handleAddField}>
            Add More
          </button>
        </div>

        {/* Save */}
        <div className="center-btn">
          <button className="btn save-btn" onClick={handleSaveSchema}>
            Save Schema
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="bottom-actions">
          <button className="btn secondary-btn">Edit</button>
          <button className="btn secondary-btn">Remove</button>
          <button className="btn go-btn">Go to Task Page →</button>
        </div>
      </div>
    </div>
  );
}

export default AddSchema;