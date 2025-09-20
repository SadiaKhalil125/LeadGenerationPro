import React, { useState } from "react";
import { Plus, Trash2, Save, List, Database, Columns, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EntityForm = () => {
  const [entityName, setEntityName] = useState("");
  const [attributes, setAttributes] = useState([]);
  const navigate = useNavigate();

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
      const response = await fetch("http://127.0.0.1:8000/save-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success === true) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
            <div className="flex items-center">
              <div className="bg-teal-50 p-3 rounded-xl mr-4">
                <Database className="text-teal-600" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Entity</h1>
                <p className="text-sm text-gray-500 mt-1">Define your data structure</p>
              </div>
            </div>
            <button 
              className="flex items-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              onClick={() => navigate('/entitylist')}
            >
              <List size={18} className="mr-2" />
              View All
            </button>
          </div>

          {/* Entity Name Input */}
          <div className="mb-8">
            <label htmlFor="entityName" className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Sparkles size={16} className="mr-2 text-teal-500" />
              Entity Name
            </label>
            <input
              type="text"
              id="entityName"
              placeholder="e.g., users, products, orders"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            />
          </div>
         
          {/* Attributes Section Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="bg-teal-50 p-2 rounded-lg mr-3">
                <Columns className="text-teal-600" size={18} />
              </div>
              Attributes
            </h2>
            <span className="text-sm font-medium text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full">
              {attributes.length} attribute{attributes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Attributes List */}
          <div className="space-y-4 mb-8">
            {attributes.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Columns className="mx-auto text-gray-300 mb-3" size={32} />
                <p className="text-gray-500">No attributes added yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Attribute" to get started</p>
              </div>
            ) : (
              attributes.map((attr, index) => (
                <div key={index} className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        placeholder="e.g., email, price, created_at"
                        value={attr.name}
                        onChange={(e) => updateAttribute(index, "name", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Type</label>
                      <select
                        value={attr.datatype}
                        onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white"
                      >
                        <option value="text">String</option>
                        <option value="int">Integer</option>
                        <option value="bool">Boolean</option>
                        <option value="Float">Float</option>
                        <option value="Date">Date</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-8 p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                    onClick={() => deleteAttribute(index)}
                    title="Delete attribute"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Attribute Button */}
          <div className="mb-8">
            <button 
              type="button" 
              className="flex items-center px-5 py-3 bg-gradient-to-r from-teal-500 to-teal-400 text-white rounded-xl hover:bg-teal-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              onClick={addAttribute}
            >
              <Plus size={18} className="mr-2" />
              Add Attribute
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4 border-t border-gray-100">
            <button 
              type="button" 
              className="flex items-center px-8 py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              onClick={submitEntity}
            >
              <Save size={18} className="mr-2" />
              Save Entity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityForm;