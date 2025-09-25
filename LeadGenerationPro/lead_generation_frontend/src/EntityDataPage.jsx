import React, { useState, useEffect } from "react";
import { Database, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";

const EntityDataScreen = () => {
  const API_BASE = "http://127.0.0.1:8000";
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageSize] = useState(10);  // or make it adjustable


  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      fetchEntityData(selectedEntity, page);
    }
  }, [selectedEntity, page]);

  const fetchEntities = async () => {
    try {
      const res = await fetch(`${API_BASE}/entity/entities`);
      const json = await res.json();
      setEntities(json.entities || []);
    } catch (err) {
      setError("Failed to load entities.");
    }
  };

  const fetchEntityData = async (entityName, pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/entity/entity-data/${entityName}?page=${pageNum}&page_size=${pageSize}`
      );

      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6 flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Database size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Entity Data Viewer</h1>
              <p className="text-teal-100">Browse and inspect your database entities</p>
            </div>
          </div>

          <div className="p-6">
            {/* Entity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Entity</label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500"
                value={selectedEntity || ""}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">-- Choose an entity --</option>
                {entities.map((ent, idx) => (
                  <option key={idx} value={ent.name}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-teal-600 mr-2" size={24} />
                <span className="text-gray-600">Loading data...</span>
              </div>
            )}

            {/* No Data */}
            {!loading && data && data.rows && data.rows.length === 0 && (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Database size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No Data Found</h3>
                <p className="text-gray-500 mt-1">This table has no records to display.</p>
              </div>
            )}

            {/* Data Table */}
            {!loading && data && data.rows && data.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      {data.columns.map((col, idx) => (
                        <th key={idx} className="px-4 py-2 text-left text-sm font-semibold border-b border-gray-200">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.rows.map((row, ridx) => (
                      <tr key={ridx} className="hover:bg-gray-50">
                        {row.map((cell, cidx) => (
                          <td key={cidx} className="px-4 py-2 text-sm text-gray-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.rows && (
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  <ChevronLeft size={18} className="mr-1" /> Previous
                </button>
                <span className="text-gray-600 text-sm">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.rows.length < pageSize}
                  className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  Next <ChevronRight size={18} className="ml-1" />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityDataScreen;
