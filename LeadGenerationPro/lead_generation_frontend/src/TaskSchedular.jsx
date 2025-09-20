import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Database,
    Map,
    List,
    CheckCircle,
    AlertCircle,
    Type,
    RefreshCw,
    Loader2
} from 'lucide-react';

const TaskScheduler = () => {
    const [sources, setSources] = useState([]);
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [mappings, setMappings] = useState([]);
    const [selectedMappingId, setSelectedMappingId] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [taskName, setTaskName] = useState('');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [activeTab, setActiveTab] = useState('create');

    // Fetch initial data
    useEffect(() => {
        fetchSources();
        fetchTasks();
    }, []);

    const fetchSources = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/sources');
            const data = await res.json();
            setSources(data.sources || []);
        } catch (error) {
            console.error('Error fetching sources:', error);
            setResponse({ type: 'error', message: 'Failed to load sources.' });
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/tasks');
            const data = await res.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setResponse({ type: 'error', message: 'Failed to load tasks.' });
        }
    };

    const fetchMappings = async (sourceId) => {
        if (!sourceId) {
            setMappings([]);
            setSelectedMappingId('');
            return;
        }
        try {
            const res = await fetch(`http://127.0.0.1:8000/mappings-by-source/${sourceId}`);
            const data = await res.json();
            if (data.success) {
                setMappings(data.mappings || []);
                setSelectedMappingId('');
            } else {
                setMappings([]);
                setResponse({ type: 'error', message: data.message || 'No mappings found.' });
            }
        } catch (error) {
            setMappings([]);
            setResponse({ type: 'error', message: 'Failed to fetch mappings.' });
        }
    };

    const handleSourceChange = (sourceId) => {
        setSelectedSourceId(sourceId);
        fetchMappings(sourceId);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!selectedSourceId || !selectedMappingId || !scheduledTime) {
            setResponse({ type: 'error', message: 'Please complete all required fields.' });
            return;
        }
        setLoading(true);
        try {
            const requestData = {
                source_id: parseInt(selectedSourceId),
                mapping_id: parseInt(selectedMappingId),
                scheduled_time: new Date(scheduledTime).toISOString(),
                task_name: taskName || undefined
            };
            const res = await fetch('http://127.0.0.1:8000/create-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setResponse({ type: 'success', message: data.message });
                setSelectedSourceId('');
                setSelectedMappingId('');
                setScheduledTime('');
                setTaskName('');
                setMappings([]);
                fetchTasks();
                setActiveTab('manage');
            } else {
                setResponse({ type: 'error', message: data.detail || 'Failed to create task.' });
            }
        } catch (error) {
            setResponse({ type: 'error', message: 'A network error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId, taskName) => {
        if (!confirm(`Are you sure you want to delete task "${taskName}"?`)) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/delete-task/${taskId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok && data.success) {
                setResponse({ type: 'success', message: data.message });
                fetchTasks();
            } else {
                setResponse({ type: 'error', message: data.detail || 'Failed to delete task.' });
            }
        } catch (error) {
            setResponse({ type: 'error', message: 'A network error occurred.' });
        }
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString([], {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusBadge = (scheduledTime) => {
        const isFuture = new Date(scheduledTime) > new Date();
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isFuture ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {isFuture ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {isFuture ? 'Scheduled' : 'Overdue'}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center mb-4 md:mb-0">
                                <div className="bg-white/20 p-3 rounded-xl mr-4">
                                    <Clock size={28} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold">Task Scheduler</h1>
                                    <p className="text-teal-100">Schedule and manage your data integration tasks</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchTasks}
                                className="flex items-center px-4 py-2.5 text-black bg-white/20 rounded-xl hover:bg-white/30 transition-colors duration-200 backdrop-blur-sm"
                            >
                                <RefreshCw size={18} className="mr-2" />
                                Refresh Tasks
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Tab Navigation */}
                        <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${activeTab === 'create' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:bg-white/80'}`}
                            >
                                <Plus size={16} /> Create Task
                            </button>
                            <button
                                onClick={() => setActiveTab('manage')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md font-medium text-sm transition-all duration-200 ${activeTab === 'manage' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:bg-white/80'}`}
                            >
                                <List size={16} /> Manage Tasks ({tasks.length})
                            </button>
                        </div>

                        {response && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${response.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <span>{response.message}</span>
                            </div>
                        )}

                        {activeTab === 'create' && (
                            <form onSubmit={handleCreateTask} className="space-y-6">
                                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Database size={16} className="text-teal-500" />Select Source *</label>
                                    <select value={selectedSourceId} onChange={(e) => handleSourceChange(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                                        <option value="">Choose a source...</option>
                                        {sources.map(s => <option key={s.id} value={s.id}>{s.name} - {s.url}</option>)}
                                    </select>
                                </div>
                                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Map size={16} className="text-teal-500" />Select Mapping *</label>
                                    <select value={selectedMappingId} onChange={(e) => setSelectedMappingId(e.target.value)} required disabled={!selectedSourceId} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <option value="">Choose a mapping...</option>
                                        {mappings.map(m => <option key={m.id} value={m.id}>{m.mapping_name} ({m.entity_name})</option>)}
                                    </select>
                                </div>
                                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Type size={16} className="text-teal-500" />Task Name (Optional)</label>
                                    <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Auto-generated if empty" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                                </div>
                                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><Calendar size={16} className="text-teal-500" />Scheduled Time *</label>
                                    <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-6 py-3 font-medium text-white bg-gradient-to-b from-teal-600 to-teal-400 rounded-lg shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                                        {loading ? 'Creating...' : 'Create Task'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'manage' && (
                            <div className="space-y-4">
                                {tasks.length === 0 ? (
                                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700">No Tasks Scheduled</h3>
                                        <p className="text-gray-500 mt-1">Use the "Create Task" tab to schedule your first task.</p>
                                    </div>
                                ) : (
                                    tasks.map((task) => (
                                        <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{task.task_name}</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2"><Database size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Source:</span>{task.source_name}</div>
                                                        <div className="flex items-center gap-2"><Map size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Mapping:</span>{task.mapping_name}</div>
                                                        <div className="flex items-center gap-2"><List size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Entity:</span>{task.entity_name}</div>
                                                        <div className="flex items-center gap-2"><Calendar size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Scheduled:</span>{formatDateTime(task.scheduled_time)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex sm:flex-col items-end gap-3 self-end sm:self-auto">
                                                    {getStatusBadge(task.scheduled_time)}
                                                    <button onClick={() => handleDeleteTask(task.id, task.task_name)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskScheduler;