import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000"; // change if needed

function shortDate(ts) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function statusForMapping(m) {
  // Basic heuristic: if field_mappings exist -> Active, else Broken
  if (!m.field_mappings || Object.keys(m.field_mappings).length === 0) {
    return { label: "Broken", color: "bg-yellow-100 text-yellow-800" };
  }
  return { label: "Active", color: "bg-green-100 text-green-800" };
}

export default function MappingManager() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [editModal, setEditModal] = useState(null); // {originalName, mapping}
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  const fetchMappings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/mappings`);
      // response_model returns MappingsListResponse with mappings array
      const list = res.data?.mappings ?? [];
      setMappings(list);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch mappings:", err);
      setError("Failed to fetch mappings");
      setMappings([]);
    } finally {
      setLoading(false);
    }
  };

  const sources = useMemo(() => {
    const s = new Set(mappings.map((m) => m.source_name || "unknown"));
    return ["all", ...Array.from(s)];
  }, [mappings]);

  const stats = useMemo(() => {
    const total = mappings.length;
    const active = mappings.filter((m) => {
      return m.field_mappings && Object.keys(m.field_mappings).length > 0;
    }).length;
    const broken = total - active;
    return { total, active, broken };
  }, [mappings]);

  const filtered = useMemo(() => {
    return mappings.filter((m) => {
      const matchesSearch =
        !search ||
        (m.mapping_name && m.mapping_name.toLowerCase().includes(search.toLowerCase())) ||
        (m.entity_name && m.entity_name.toLowerCase().includes(search.toLowerCase())) ||
        (m.source_name && m.source_name.toLowerCase().includes(search.toLowerCase()));
      const matchesSource = filterSource === "all" || (m.source_name || "unknown") === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [mappings, search, filterSource]);

  const onDelete = async (mappingName) => {
    if (!window.confirm(`Delete mapping '${mappingName}'? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/delete-mapping/${encodeURIComponent(mappingName)}`);
      setMappings((prev) => prev.filter((m) => m.mapping_name !== mappingName));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete mapping — check console for details.");
    } finally {
      setDeleting(false);
    }
  };

  const onOpenEdit = (mapping) => {
    // keep original mapping name for PUT path (server expects mapping_name path param)
    setEditModal({
      originalName: mapping.mapping_name,
      mapping: {
        id: mapping.id,
        mapping_name: mapping.mapping_name,
        entity_name: mapping.entity_name,
        container_selector: mapping.container_selector ?? "",
        field_mappings: mapping.field_mappings ?? {},
        source_id: mapping.source_id,
        source_name: mapping.source_name,
      },
      jsonEditorText: JSON.stringify(mapping.field_mappings ?? {}, null, 2),
      jsonError: null,
    });
  };

  const onSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      // Build payload — only include editable fields
      const payload = {
        mapping_name: editModal.mapping.mapping_name,
        container_selector: editModal.mapping.container_selector,
        field_mappings: editModal.mapping.field_mappings,
        source_id: editModal.mapping.source_id,
      };

      await axios.put(
        `${API_BASE}/edit-mapping/${encodeURIComponent(editModal.originalName)}`,
        payload
      );

      // Update local list: replace matching mapping by mapping_name (use id if available)
      setMappings((prev) =>
        prev.map((m) =>
          m.mapping_name === editModal.originalName ? { ...m, ...editModal.mapping } : m
        )
      );

      setEditModal(null);
    } catch (err) {
      console.error("Save edit failed:", err);
      alert("Failed to save mapping. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Header */}
      <div className="rounded-lg overflow-hidden shadow">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Mapping Management</h1>
            <p className="text-sm opacity-90 mt-1">
              Review, edit, and manage all saved entity & source mappings
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchMappings}
              className="bg-black text-white px-3 py-2 rounded shadow hover:opacity-90 flex items-center space-x-2"
              title="Refresh"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 12a9 9 0 1 1-3-6.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 3v6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Refresh</span>
            </button>
            <a
              href="/entitymappingform"
              className="bg-green-500 text-white px-3 py-2 rounded shadow hover:opacity-90"
            >
              + Create Mapping
            </a>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white p-6">
          {/* Top stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Total Mappings</div>
              <div className="text-2xl font-bold mt-2">{stats.total}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Active</div>
              <div className="text-2xl font-bold text-green-600 mt-2">{stats.active}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-gray-500">Broken</div>
              <div className="text-2xl font-bold text-yellow-600 mt-2">{stats.broken}</div>
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 w-full sm:w-1/2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by mapping, entity or source..."
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="border rounded px-3 py-2"
              >
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Sources" : s}
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-500">
                {lastRefreshed ? `Last: ${shortDate(lastRefreshed)}` : ""}
              </div>
            </div>
          </div>

          {/* Error / empty states */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading mappings...</div>
          ) : error ? (
            <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700">
              ⚠️ {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 border rounded">
              <div className="text-lg font-semibold">No mappings found</div>
              <div className="mt-2">Create your first mapping to get started</div>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((m) => {
                const st = statusForMapping(m);
                return (
                  <div key={m.id} className="border rounded shadow-sm p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">{m.mapping_name}</h3>
                            <div className="text-sm text-gray-500">
                              {m.source_name} • {m.entity_name}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          <div>Container: <span className="font-medium">{m.container_selector || "-"}</span></div>
                          <div>Created: <span className="font-medium">{shortDate(m.created_at)}</span></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-sm ${st.color}`}>{st.label}</div>

                        <button
                          onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          {expandedId === m.id ? "Collapse" : "Details"}
                        </button>

                        <button
                          onClick={() => onOpenEdit(m)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => onDelete(m.mapping_name)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          disabled={deleting}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {expandedId === m.id && (
                      <div className="mt-4 bg-gray-50 p-3 rounded">
                        <div className="text-sm text-gray-700 mb-2 font-medium">Field mappings</div>
                        <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded border text-gray-800">
                          {JSON.stringify(m.field_mappings ?? {}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white w-full max-w-2xl rounded shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Mapping</h2>
              <button onClick={() => setEditModal(null)} className="text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Mapping Name</div>
                <input
                  value={editModal.mapping.mapping_name}
                  onChange={(e) => setEditModal({
                    ...editModal,
                    mapping: { ...editModal.mapping, mapping_name: e.target.value }
                  })}
                  className="w-full border p-2 rounded"
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-600 mb-1">Source</div>
                <input
                  value={editModal.mapping.source_name || ""}
                  readOnly
                  className="w-full border p-2 rounded bg-gray-50"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Container Selector</div>
                <input
                  value={editModal.mapping.container_selector}
                  onChange={(e) => setEditModal({
                    ...editModal,
                    mapping: { ...editModal.mapping, container_selector: e.target.value }
                  })}
                  className="w-full border p-2 rounded"
                />
              </label>

              <label className="block md:col-span-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 mb-1">Field mappings (JSON)</div>
                  <div className="text-xs text-gray-500">Edit JSON then click Save</div>
                </div>
                <textarea
                  value={editModal.jsonEditorText}
                  onChange={(e) => {
                    const text = e.target.value;
                    let parsed = null;
                    let jsonError = null;
                    try {
                      parsed = JSON.parse(text);
                    } catch (err) {
                      jsonError = err.message;
                    }
                    setEditModal({
                      ...editModal,
                      jsonEditorText: text,
                      jsonError,
                      mapping: { ...editModal.mapping, field_mappings: parsed ?? editModal.mapping.field_mappings }
                    });
                  }}
                  rows={10}
                  className="w-full border p-2 rounded font-mono text-sm"
                />
                {editModal.jsonError && (
                  <div className="text-red-600 text-sm mt-1">JSON error: {editModal.jsonError}</div>
                )}
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 border rounded"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                className="px-4 py-2 bg-green-600 text-white rounded"
                disabled={saving || !!editModal.jsonError}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}