import React, { useState, useEffect } from 'react';
import {
    ListChecks,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Loader2,
    Edit3,
    Trash2,
    Save,
    X,
    Calendar,
    Type,
    Database,
    Map,
    List
} from 'lucide-react';

const TasksManagement = () => {
    const [tasks, setTasks] = useState([]);
    const [editingTask, setEditingTask] = useState(null);
    const [editScheduledTime, setEditScheduledTime] = useState('');
    const [editTaskName, setEditTaskName] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [response, setResponse] = useState(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await fetch('http://127.0.0.1:8000/tasks');
            const data = await res.json();
            setTasks(data.tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setResponse({ type: 'error', message: 'Failed to fetch tasks' });
        } finally {
            setLoading(false);
            setPageLoading(false);
        }
    };

    const handleEditClick = (task) => {
        setEditingTask(task.id);
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const localDate = new Date(task.scheduled_time);
        const formattedDate = localDate.getFullYear() + '-' +
            ('0' + (localDate.getMonth() + 1)).slice(-2) + '-' +
            ('0' + localDate.getDate()).slice(-2) + 'T' +
            ('0' + localDate.getHours()).slice(-2) + ':' +
            ('0' + localDate.getMinutes()).slice(-2);
        setEditScheduledTime(formattedDate);
        setEditTaskName(task.task_name);
        setResponse(null);
    };

    const handleCancelEdit = () => {
        setEditingTask(null);
        setEditScheduledTime('');
        setEditTaskName('');
    };

    const handleUpdateTask = async (taskId) => {
        if (!editScheduledTime) {
            setResponse({ type: 'error', message: 'Please provide a scheduled time.' });
            return;
        }
        setLoading(true);
        try {
            const requestData = {
                scheduled_time: new Date(editScheduledTime).toISOString(),
                task_name: editTaskName || undefined
            };
            const res = await fetch(`http://127.0.0.1:8000/update-task/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setResponse({ type: 'success', message: data.message });
                setEditingTask(null);
                fetchTasks();
            } else {
                setResponse({ type: 'error', message: data.detail || 'Failed to update task.' });
            }
        } catch (error) {
            setResponse({ type: 'error', message: 'A network error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId, taskName) => {
        if (!confirm(`Are you sure you want to delete task "${taskName}"?`)) return;
        setLoading(true);
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
        } finally {
            setLoading(false);
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

    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    const scheduledCount = tasks.filter(task => new Date(task.scheduled_time) > new Date()).length;
    const overdueCount = tasks.length - scheduledCount;

    if (pageLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
                    <h1 className="text-2xl font-bold text-gray-900">Loading Task Data...</h1>
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
                                <div className="bg-white/20 p-3 rounded-xl mr-4"><ListChecks size={28} /></div>
                                <div>
                                    <h1 className="text-2xl font-bold">Tasks Management</h1>
                                    <p className="text-teal-100">Review, edit, and manage all scheduled tasks</p>
                                </div>
                            </div>
                            <button onClick={fetchTasks} className="flex items-center px-4 py-2.5 bg-white/20 text-black rounded-xl hover:bg-white/30 transition-colors duration-200">
                                <RefreshCw size={18} className="mr-2" /> Refresh
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Stats Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                <h4 className="text-sm font-semibold text-gray-500">Total Tasks</h4>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{tasks.length}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                <h4 className="text-sm font-semibold text-green-700">Scheduled</h4>
                                <p className="text-3xl font-bold text-green-600 mt-1">{scheduledCount}</p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                                <h4 className="text-sm font-semibold text-yellow-700">Overdue</h4>
                                <p className="text-3xl font-bold text-yellow-600 mt-1">{overdueCount}</p>
                            </div>
                        </div>

                        {response && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${response.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <span>{response.message}</span>
                            </div>
                        )}

                        {sortedTasks.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <ListChecks size={48} className="mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-700">No Tasks Found</h3>
                                <p className="text-gray-500 mt-1">When tasks are created, they will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedTasks.map((task) => (
                                    <div key={task.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                                        {editingTask === task.id ? (
                                            /* Edit Mode */
                                            <div className="p-5 bg-gray-50/70">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Editing: <span className="text-teal-600">{task.task_name}</span></h3>
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Type size={16} />Task Name</label>
                                                        <input type="text" value={editTaskName} onChange={(e) => setEditTaskName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Calendar size={16} />Scheduled Time *</label>
                                                        <input type="datetime-local" value={editScheduledTime} onChange={(e) => setEditScheduledTime(e.target.value)} required className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                                                    </div>
                                                    <div className="flex justify-end items-center gap-3 pt-2">
                                                        <button onClick={() => handleUpdateTask(task.id)} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-gradient-to-b from-teal-600 to-teal-700 rounded-lg hover:bg-teal-700 disabled:bg-gray-400">
                                                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Update
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium bg-gradient-to-b text-gray-700 from-gray-200 to-gray-300 hover:bg-gradient-to-t rounded-lg">
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
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{task.task_name}</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                                                            <div className="flex items-center gap-2"><Database size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Source:</span>{task.source_name}</div>
                                                            <div className="flex items-center gap-2"><Map size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Mapping:</span>{task.mapping_name}</div>
                                                            <div className="flex items-center gap-2"><List size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Entity:</span>{task.entity_name}</div>
                                                            <div className="flex items-center gap-2"><Calendar size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Scheduled:</span>{formatDateTime(task.scheduled_time)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex sm:flex-col items-end gap-3 self-end sm:self-auto shrink-0">
                                                        {getStatusBadge(task.scheduled_time)}
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleEditClick(task)} disabled={loading} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-md transition-colors"><Edit3 size={16} /></button>
                                                            <button onClick={() => handleDeleteTask(task.id, task.task_name)} disabled={loading} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TasksManagement;