// import React, { useState, useEffect } from "react";
// import "./TaskForm.css";

// const TaskForm = () => {
//   const [entities, setEntities] = useState([]);
//   const [selectedEntity, setSelectedEntity] = useState("");
//   const [url, setUrl] = useState("");
//   const [containerSelector, setContainerSelector] = useState("");
//   const [columns, setColumns] = useState([]);
//   const [fieldMappings, setFieldMappings] = useState([]);

//   // Fetch entities
//   useEffect(() => {
//     const fetchEntities = async () => {
//       try {
//         const res = await fetch("http://localhost:8000/entities");
//         if (!res.ok) throw new Error("Failed to fetch entities");
//         const data = await res.json();
//         setEntities(data);
//       } catch (err) {
//         console.error("Error fetching entities:", err);
//       }
//     };
//     fetchEntities();
//   }, []);

//   // Fetch columns when entity changes
//   useEffect(() => {
//     const fetchColumns = async () => {
//       if (!selectedEntity) return;
//       try {
//         const res = await fetch(
//           `http://localhost:8000/entities/${selectedEntity}/columns`
//         );
//         if (!res.ok) throw new Error("Failed to fetch columns");
//         const data = await res.json();
//         setColumns(data);
//         setFieldMappings(
//           data.map((col) => ({
//             column: col,
//             selector: "",
//             extract: "text",
//           }))
//         );
//       } catch (err) {
//         console.error("Error fetching columns:", err);
//       }
//     };
//     fetchColumns();
//   }, [selectedEntity]);

//   // Update mapping
//   const handleMappingChange = (index, field, value) => {
//     const updated = [...fieldMappings];
//     updated[index][field] = value;
//     setFieldMappings(updated);
//   };

//   // Save Task
//   const handleSave = async () => {
//     const payload = {
//       entity: selectedEntity,
//       url,
//       containerSelector,
//       mappings: fieldMappings.filter((f) => f.selector.trim() !== ""),
//     };

//     try {
//       const response = await fetch("http://localhost:8000/save-mapping", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!response.ok) throw new Error("Failed to save mapping");

//       alert("Task saved successfully!");
//     } catch (error) {
//       console.error("Error saving mapping:", error);
//       alert("Error while saving task.");
//     }
//   };

//   return (
//     <div className="form-container">
//       <h2>Create Task</h2>

//       <div className="form-group">
//         <label>Choose Entity</label>
//         <select
//           value={selectedEntity}
//           onChange={(e) => setSelectedEntity(e.target.value)}
//         >
//           <option value="">-- Select an entity --</option>
//           {entities.map((entity, idx) => (
//             <option key={idx} value={entity.name}>
//               {entity.name}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="form-group">
//         <label>Website URL</label>
//         <input
//           type="text"
//           placeholder="https://example.com"
//           value={url}
//           onChange={(e) => setUrl(e.target.value)}
//         />
//       </div>

//       <div className="form-group">
//         <label>Container Selector</label>
//         <input
//           type="text"
//           placeholder="div.company-card"
//           value={containerSelector}
//           onChange={(e) => setContainerSelector(e.target.value)}
//         />
//       </div>

//       <h3>Field Mappings</h3>
//       {fieldMappings.length > 0 ? (
//         fieldMappings.map((field, index) => (
//           <div key={index} className="mapping-row">
//             <span className="field-name">{field.column}</span>
//             <input
//               type="text"
//               placeholder="CSS selector e.g. h2.title"
//               value={field.selector}
//               onChange={(e) =>
//                 handleMappingChange(index, "selector", e.target.value)
//               }
//             />
//             <select
//               value={field.extract}
//               onChange={(e) =>
//                 handleMappingChange(index, "extract", e.target.value)
//               }
//             >
//               <option value="text">Text</option>
//               <option value="href">Href</option>
//               <option value="src">Src</option>
//               <option value="attribute">Attribute</option>
//             </select>
//           </div>
//         ))
//       ) : (
//         <p className="no-fields">Select an entity to load its fields</p>
//       )}

//       <button className="btn-save" onClick={handleSave}>
//         Save Task
//       </button>
//     </div>
//   );
// };

// export default TaskForm;
import React, { useState, useEffect } from "react";
import "./TaskForm.css";

const TaskForm = () => {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [url, setUrl] = useState("");
  const [containerSelector, setContainerSelector] = useState("");
  const [columns, setColumns] = useState([]);
  const [fieldMappings, setFieldMappings] = useState([]);

  // Fetch entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await fetch("http://localhost:8000/entities");
        if (!res.ok) throw new Error("Failed to fetch entities");
        const data = await res.json();
        setEntities(data);
      } catch (err) {
        console.error("Error fetching entities:", err);
      }
    };
    fetchEntities();
  }, []);

  // Fetch columns when entity changes
  useEffect(() => {
    const fetchColumns = async () => {
      if (!selectedEntity) return;
      try {
        const res = await fetch(
          `http://localhost:8000/entities/${selectedEntity}/columns`
        );
        if (!res.ok) throw new Error("Failed to fetch columns");
        const data = await res.json();
        setColumns(data);
        setFieldMappings(
          data.map((col) => ({
            column: col,
            selector: "",
            extract: "text",
          }))
        );
      } catch (err) {
        console.error("Error fetching columns:", err);
      }
    };
    fetchColumns();
  }, [selectedEntity]);

  // Update mapping
  const handleMappingChange = (index, field, value) => {
    const updated = [...fieldMappings];
    updated[index][field] = value;
    setFieldMappings(updated);
  };

  // Save mapping
  const handleSave = async () => {
    const payload = {
      entity: selectedEntity,
      url,
      containerSelector,
      mappings: fieldMappings.filter((f) => f.selector.trim() !== ""),
    };

    try {
      const response = await fetch("http://localhost:8000/save-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save mapping");

      alert("Task saved successfully!");
    } catch (error) {
      console.error("Error saving mapping:", error);
      alert("Error while saving task.");
    }
  };

  return (
    <div className="schema-wrapper">
      <div className="schema-card">
        <h2 className="schema-heading">Create Task</h2>

        {/* Entity Selector */}
        <div className="input-group">
          <label>Choose Entity</label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
          >
            <option value="">-- Select an entity --</option>
            {entities.map((entity, idx) => (
              <option key={idx} value={entity.name}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>

        {/* Website URL */}
        <div className="input-group">
          <label>Website URL</label>
          <input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {/* Container Selector */}
        <div className="input-group">
          <label>Container Selector</label>
          <input
            type="text"
            placeholder="div.company-card"
            value={containerSelector}
            onChange={(e) => setContainerSelector(e.target.value)}
          />
        </div>

        {/* Field Mappings */}
        <h3 className="schema-heading" style={{ fontSize: "1.8rem" }}>
          Field Mappings
        </h3>

        {fieldMappings.length > 0 ? (
          fieldMappings.map((field, index) => (
            <div key={index} className="field-row">
              <span style={{ color: "#fff", fontWeight: "600" }}>
                {field.column}
              </span>
              <input
                type="text"
                placeholder="CSS selector e.g. h2.title"
                value={field.selector}
                onChange={(e) =>
                  handleMappingChange(index, "selector", e.target.value)
                }
              />
              <select
                className="field-type-select"
                value={field.extract}
                onChange={(e) =>
                  handleMappingChange(index, "extract", e.target.value)
                }
              >
                <option value="text">Text</option>
                <option value="href">Href</option>
                <option value="src">Src</option>
                <option value="attribute">Attribute</option>
              </select>
            </div>
          ))
        ) : (
          <p style={{ color: "#bbb", fontStyle: "italic" }}>
            Select an entity to load its fields
          </p>
        )}

        {/* Save Button */}
        <button className="btn save-btn" onClick={handleSave}>
          Save Task
        </button>
      </div>
    </div>
  );
};

export default TaskForm;
