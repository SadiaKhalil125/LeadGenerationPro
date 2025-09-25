import React, { useEffect, useState } from "react";

// Note (for teammates): still in work this page is ignore for now ty

export default function EntityDataPage() {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  const BASE_URL = "http://127.0.0.1:8000"; // Backend URL

  // Fetch all entities
  useEffect(() => {
    fetch(`${BASE_URL}/entity/entities`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success !== false) setEntities(data.entities);
      })
      .catch((err) => console.error("Failed to fetch entities:", err));
  }, []);

  // Fetch entity data whenever selectedEntity or page changes
 useEffect(() => {
  if (!selectedEntity) return;

  setLoading(true);
  fetch(
    `${BASE_URL}/entity/entity-data/${selectedEntity}?page=${page}&page_size=${pageSize}`
  )
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const cols = data.columns.map((col) => col.name);
        setColumns(cols);

        // Use same 'cols' array to map row objects
        const mappedRows =
          data.rows?.map((row, idx) =>
            cols.map((col) => row[col] ?? "")
          ) || [];
        setRows(mappedRows);

        setTotalRows(data.row_count || 0);
      } else {
        setColumns([]);
        setRows([]);
        setTotalRows(0);
      }
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to fetch entity data:", err);
      setLoading(false);
    });
}, [selectedEntity, page]);


  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <div className="p-6 font-sans text-gray-900">
      <h1 className="text-2xl font-bold mb-4">View Entity Data</h1>

      {/* Entity Dropdown */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Select Entity:</label>
        <select
          value={selectedEntity}
          onChange={(e) => {
            setSelectedEntity(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-2 w-full max-w-xs"
        >
          <option value="">-- Select an entity --</option>
          {entities.map((entity) => (
            <option key={entity.name} value={entity.name}>
              {entity.name}
            </option>
          ))}
        </select>
      </div>

      {/* Data Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        selectedEntity &&
        rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded">
                              <thead className="bg-gray-100">
                                  <tr>
                                      {columns.map((col, idx) => (
                                          <th key={`${col}-${idx}`} className="border px-4 py-2 text-left">
                                              {col}
                                          </th>
                                      ))}
                                  </tr>
                              </thead>

                              <tbody>
                                  {rows.map((row, rowIdx) => (
                                      <tr key={`row-${rowIdx}`} className="hover:bg-gray-50">
                                          {row.map((cell, colIdx) => (
                                              <td key={`cell-${rowIdx}-${colIdx}`} className="border px-4 py-2">
                                                  {cell}
                                              </td>
                                          ))}
                                      </tr>
                                  ))}
</tbody>


            </table>
          </div>
        )
      )}

      {/* Pagination */}
      {selectedEntity && rows.length > 0 && (
        <div className="mt-4 flex gap-2 items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* No Data */}
      {selectedEntity && !loading && rows.length === 0 && (
        <p className="mt-4 text-gray-500">No data found for this entity.</p>
      )}
    </div>
  );
}
