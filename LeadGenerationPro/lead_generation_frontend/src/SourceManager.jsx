import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  ExternalLink, 
  Plus, 
  Save, 
  X,
  Database,
  RefreshCw,
  CheckCircle,
  Loader2,
  Map,
  List,
  Calendar
} from 'lucide-react';

const SourceManagement = () => {
  const [sources, setSources] = useState([]);
  const [expandedSource, setExpandedSource] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dependencies, setDependencies] = useState({});
  const [editForm, setEditForm] = useState({ name: '', url: '' });
  const [showNewSourceForm, setShowNewSourceForm] = useState(false);
  const [newSourceForm, setNewSourceForm] = useState({ name: '', url: '' });
  const [response, setResponse] = useState(null);

  const API_BASE = 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/source/sources`);
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const fetchDependencies = async (sourceId) => {
    try {
      // Fetch mappings that use this source
      const mappingsResponse = await fetch(`${API_BASE}/mapping/mappings`);
      if (mappingsResponse.ok) {
        const mappingsData = await mappingsResponse.json();
        const sourceMappings = mappingsData.mappings?.filter(m => m.source_id === sourceId) || [];
        
        // Fetch tasks that use this source
        const tasksResponse = await fetch(`${API_BASE}/task/tasks`);
        let sourceTasks = [];
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          sourceTasks = tasksData.tasks?.filter(t => t.source_id === sourceId) || [];
        }

        setDependencies(prev => ({
          ...prev,
          [sourceId]: {
            mappings: sourceMappings,
            tasks: sourceTasks
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dependencies:', err);
    }
  };

  const handleExpand = (sourceId) => {
    if (expandedSource === sourceId) {
      setExpandedSource(null);
    } else {
      setExpandedSource(sourceId);
      if (!dependencies[sourceId]) {
        fetchDependencies(sourceId);
      }
    }
  };

  const handleEdit = (source) => {
    setEditingSource(source.id);
    setEditForm({ name: source.name, url: source.url });
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/source/source/${editingSource}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update source');
      }

      const data = await response.json();
      setResponse({ type: 'success', message: data.message });
      await fetchSources();
      setEditingSource(null);
      setEditForm({ name: '', url: '' });
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sourceId, force = false) => {
    try {
      setLoading(true);
      const endpoint = force ? 
        `${API_BASE}/source/source/${sourceId}/force` : 
        `${API_BASE}/source/source/${sourceId}`;
      
      const response = await fetch(endpoint, { method: 'DELETE' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete source');
      }

      const data = await response.json();
      setResponse({ type: 'success', message: data.message });
      await fetchSources();
      setDeleteConfirm(null);
      setExpandedSource(null);
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleNewSource = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/source/save-source?name=${encodeURIComponent(newSourceForm.name)}&url=${encodeURIComponent(newSourceForm.url)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create source');
      }

      const data = await response.json();
      setResponse({ type: 'success', message: data.message });
      await fetchSources();
      setShowNewSourceForm(false);
      setNewSourceForm({ name: '', url: '' });
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalMappings = sources.reduce((acc, source) => {
    const deps = dependencies[source.id];
    return acc + (deps ? deps.mappings.length : 0);
  }, 0);

  const totalTasks = sources.reduce((acc, source) => {
    const deps = dependencies[source.id];
    return acc + (deps ? deps.tasks.length : 0);
  }, 0);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
          <h1 className="text-2xl font-bold text-gray-900">Loading Source Data...</h1>
          <p className="text-gray-600">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="bg-white/20 p-3 rounded-xl mr-4">
                  <Database size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Source Management</h1>
                  <p className="text-teal-100">Manage your web scraping sources and their dependencies</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchSources}
                  className="flex items-center px-4 py-2.5 bg-white/20 text-black rounded-xl hover:bg-white/30 transition-colors duration-200"
                >
                  <RefreshCw size={18} className="mr-2" /> Refresh
                </button>
                <button
                  onClick={() => setShowNewSourceForm(true)}
                  className="flex items-center px-4 py-2.5 bg-white text-teal-600 rounded-xl hover:bg-gray-100 transition-colors duration-200 font-medium"
                >
                  <Plus size={18} className="mr-2" />
                  Add Source
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <h4 className="text-sm font-semibold text-gray-500">Total Sources</h4>
                <p className="text-3xl font-bold text-gray-900 mt-1">{sources.length}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <h4 className="text-sm font-semibold text-blue-700">Entity Mappings</h4>
                <p className="text-3xl font-bold text-blue-600 mt-1">{totalMappings}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <h4 className="text-sm font-semibold text-green-700">Active Tasks</h4>
                <p className="text-3xl font-bold text-green-600 mt-1">{totalTasks}</p>
              </div>
            </div>

            {/* Response Messages */}
            {response && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${response.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                <span>{response.message}</span>
                <button 
                  onClick={() => setResponse(null)}
                  className="ml-auto text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* New Source Form */}
            {showNewSourceForm && (
              <div className="mb-6 p-5 bg-gray-50/70 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Source</h3>
                  <button
                    onClick={() => setShowNewSourceForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Database size={16} />Source Name *
                    </label>
                    <input
                      type="text"
                      value={newSourceForm.name}
                      onChange={(e) => setNewSourceForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter source name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <ExternalLink size={16} />URL *
                    </label>
                    <input
                      type="url"
                      value={newSourceForm.url}
                      onChange={(e) => setNewSourceForm(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="flex justify-end items-center gap-3 pt-2">
                    <button
                      onClick={handleNewSource}
                      disabled={loading || !newSourceForm.name || !newSourceForm.url}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-gradient-to-b from-teal-600 to-teal-700 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
                    >
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Save Source
                    </button>
                    <button
                      onClick={() => setShowNewSourceForm(false)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium bg-gradient-to-b text-gray-700 from-gray-200 to-gray-300 hover:bg-gradient-to-t rounded-lg transition-colors"
                    >
                      <X size={18} /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sources List */}
            {sources.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Database size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No Sources Found</h3>
                <p className="text-gray-500 mt-1">Add your first source to get started with web scraping.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div key={source.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                    {editingSource === source.id ? (
                      /* Edit Mode */
                      <div className="p-5 bg-gray-50/70">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Editing: <span className="text-teal-600">{source.name}</span>
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Database size={16} />Source Name *
                            </label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <ExternalLink size={16} />URL *
                            </label>
                            <input
                              type="url"
                              value={editForm.url}
                              onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                          <div className="flex justify-end items-center gap-3 pt-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={loading}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-gradient-to-b from-teal-600 to-teal-700 rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
                            >
                              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                              Update
                            </button>
                            <button
                              onClick={() => {
                                setEditingSource(null);
                                setEditForm({ name: '', url: '' });
                              }}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium bg-gradient-to-b text-gray-700 from-gray-200 to-gray-300 hover:bg-gradient-to-t rounded-lg transition-colors"
                            >
                              <X size={18} /> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="p-5">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <button
                                onClick={() => handleExpand(source.id)}
                                className="text-gray-400 hover:text-teal-600 transition-colors"
                              >
                                {expandedSource === source.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              </button>
                              <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 ml-8">
                              <div className="flex items-center gap-2">
                                <ExternalLink size={16} className="text-teal-500" />
                                <span className="font-medium text-gray-800">URL:</span>
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 truncate"
                                >
                                  {source.url}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Database size={16} className="text-teal-500" />
                                <span className="font-medium text-gray-800">ID:</span>
                                {source.id}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleEdit(source)}
                              disabled={loading}
                              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Edit source"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(source.id)}
                              disabled={loading}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Delete source"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedSource === source.id && (
                          <div className="mt-6 pt-6 border-t border-gray-200 bg-gray-50/50 -m-5 p-5 rounded-b-xl">
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <List size={18} className="text-teal-500" />
                              Dependencies
                            </h4>
                            {dependencies[source.id] ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Map size={16} className="text-blue-500" />
                                    <span className="font-medium text-gray-700">Entity Mappings</span>
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                      {dependencies[source.id].mappings.length}
                                    </span>
                                  </div>
                                  {dependencies[source.id].mappings.length > 0 && (
                                    <div className="space-y-1 pl-6">
                                      {dependencies[source.id].mappings.map(mapping => (
                                        <div key={mapping.id} className="text-sm text-gray-600 flex items-center gap-2">
                                          <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                          <span className="font-medium">{mapping.mapping_name}</span>
                                          <span className="text-gray-400">({mapping.entity_name})</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-green-500" />
                                    <span className="font-medium text-gray-700">Active Tasks</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                      {dependencies[source.id].tasks.length}
                                    </span>
                                  </div>
                                  {dependencies[source.id].tasks.length > 0 && (
                                    <div className="space-y-1 pl-6">
                                      {dependencies[source.id].tasks.map(task => (
                                        <div key={task.id} className="text-sm text-gray-600 flex items-center gap-2">
                                          <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                                          <span className="font-medium">{task.task_name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="animate-spin text-teal-600 mr-2" size={16} />
                                <span className="text-sm text-gray-500">Loading dependencies...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-red-100 p-3 rounded-xl">
                        <AlertTriangle className="text-red-600" size={24} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">Delete Source</h3>
                    </div>
                    
                    {(() => {
                      const source = sources.find(s => s.id === deleteConfirm);
                      const deps = dependencies[deleteConfirm];
                      return (
                        <>
                          <p className="text-gray-600 mb-4">
                            Are you sure you want to delete "<strong>{source?.name}</strong>"?
                          </p>

                          {deps && (deps.mappings.length > 0 || deps.tasks.length > 0) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                              <div className="text-yellow-800 text-sm">
                                <div className="font-semibold mb-2 flex items-center gap-2">
                                  <AlertTriangle size={16} />
                                  Warning: This will also delete:
                                </div>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                  {deps.mappings.length > 0 && (
                                    <li>{deps.mappings.length} entity mapping(s)</li>
                                  )}
                                  {deps.tasks.length > 0 && (
                                    <li>{deps.tasks.length} task(s)</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDelete(deleteConfirm, true)}
                              disabled={loading}
                              className="flex-1 bg-gradient-to-b from-red-600 to-red-700 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:bg-gray-400"
                            >
                              {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Delete Everything'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1 bg-gradient-to-b from-gray-200 to-gray-300 hover:bg-gradient-to-t text-gray-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceManagement;