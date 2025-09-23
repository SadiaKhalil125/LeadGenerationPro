import React, { useState, useEffect } from 'react';
import {
  ListChecks, // For overall header
  RefreshCw, // For refresh button
  CheckCircle, // For success response, scheduled task status
  AlertCircle, // For error response, ready/overdue task status
  Loader2, // For loading states
  Play, // For execute button
  Info, // For view info button
  Calendar, // For scheduled time detail
  Database, // For source detail
  Map, // For mapping detail
  List // For entity detail
} from 'lucide-react';

const TaskExecution = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // Added for initial page load state
  const [executingTask, setExecutingTask] = useState(null);
  const [response, setResponse] = useState(null);
  const [executionHistory, setExecutionHistory] = useState({}); // Stores history for specific task IDs

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/task/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setResponse({ type: 'error', message: 'Failed to fetch tasks' });
    } finally {
      setLoading(false);
      setPageLoading(false); // Set to false after initial fetch
    }
  };

  const executeTask = async (taskId, taskName) => {
    if (!confirm(`Are you sure you want to execute task "${taskName}"? This will scrape data and store it in the database.`)) {
      return;
    }

    try {
      setExecutingTask(taskId);
      setResponse(null); // Clear previous response

      const res = await fetch(`http://127.0.0.1:8000/task/execute-task/${taskId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResponse({
          type: 'success',
          message: `Task executed successfully! Scraped ${data.items_scraped} items, stored ${data.items_stored} records in ${data.entity_name} table.`,
          details: data
        });
      } else {
        setResponse({
          type: 'error',
          message: data.message || 'Task execution failed',
          details: data
        });
      }
    } catch (error) {
      console.error('Error executing task:', error);
      setResponse({ type: 'error', message: 'Network error occurred' });
    } finally {
      setExecutingTask(null);
      // Refresh history for this task after execution if it was already open
      if (executionHistory[taskId]) {
        fetchExecutionHistory(taskId);
      }
    }
  };

  const fetchExecutionHistory = async (taskId) => {
    // Toggle visibility: if already open, close it; otherwise, fetch and open
    if (executionHistory[taskId]) {
      setExecutionHistory(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
      return;
    }

    try {
      // Set loading state for this specific task's history
      setExecutionHistory(prev => ({
        ...prev,
        [taskId]: { loading: true } // Mark as loading
      }));

      const res = await fetch(`http://127.0.0.1:8000/task/task-execution-history/${taskId}`);
      const data = await res.json();

      setExecutionHistory(prev => ({
        ...prev,
        [taskId]: data // Store fetched data
      }));
    } catch (error) {
      console.error('Error fetching execution history:', error);
      setExecutionHistory(prev => ({
        ...prev,
        [taskId]: { error: 'Failed to load history.' } // Store error
      }));
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
        {isFuture ? 'Scheduled' : 'Ready'}
      </span>
    );
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
  const readyCount = tasks.filter(task => new Date(task.scheduled_time) <= new Date()).length;
  const scheduledCount = tasks.length - readyCount;

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
                  <h1 className="text-2xl font-bold">Task Execution Center</h1>
                  <p className="text-teal-100">Execute tasks and view their outcomes</p>
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <h4 className="text-sm font-semibold text-yellow-700">Ready to Execute</h4>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{readyCount}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <h4 className="text-sm font-semibold text-green-700">Scheduled for Later</h4>
                <p className="text-3xl font-bold text-green-600 mt-1">{scheduledCount}</p>
              </div>
            </div>

            {response && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${response.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {response.type === 'success' ? <CheckCircle size={20} className="mt-0.5 shrink-0" /> : <AlertCircle size={20} className="mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium">{response.message}</p>
                  {response.details && (
                    <div className="mt-2 text-sm font-mono bg-white/50 rounded-lg p-2 max-w-lg overflow-x-auto">
                      <p><strong>Task ID:</strong> {response.details.task_id}</p>
                      {response.details.entity_name && <p><strong>Entity:</strong> {response.details.entity_name}</p>}
                      {response.details.items_scraped !== undefined && (
                        <p><strong>Items Scraped:</strong> {response.details.items_scraped}</p>
                      )}
                      {response.details.items_stored !== undefined && (
                        <p><strong>Items Stored:</strong> {response.details.items_stored}</p>
                      )}
                    </div>
                  )}
                </div>
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
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">{task.task_name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2"><Database size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Source:</span> {task.source_name}</div>
                            <div className="flex items-center gap-2"><Map size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Mapping:</span> {task.mapping_name}</div>
                            <div className="flex items-center gap-2"><List size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Entity:</span> {task.entity_name}</div>
                            <div className="flex items-center gap-2"><Calendar size={16} className="text-teal-500" /><span className="font-medium text-gray-800">Scheduled:</span> {formatDateTime(task.scheduled_time)}</div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-end gap-3 self-end sm:self-auto shrink-0">
                          {getStatusBadge(task.scheduled_time)}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchExecutionHistory(task.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={executingTask === task.id}
                              title={executionHistory[task.id] ? 'Hide Info' : 'View Info'}
                            >
                              {executionHistory[task.id]?.loading ? <Loader2 size={16} className="animate-spin" /> : <Info size={16} />}
                            </button>
                            <button
                              onClick={() => executeTask(task.id, task.task_name)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 font-medium text-white bg-gradient-to-b from-teal-600 to-teal-700 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              disabled={executingTask === task.id}
                            >
                              {executingTask === task.id ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                              {executingTask === task.id ? 'Executing...' : 'Execute'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Execution History/Info */}
                      {executionHistory[task.id] && (
                        <div className="mt-5 pt-4 border-t border-gray-100">
                          <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Info size={18} className="text-blue-500" /> Task Information
                          </h4>
                          {executionHistory[task.id].loading ? (
                            <div className="flex items-center justify-center py-4 text-gray-600">
                              <Loader2 size={20} className="animate-spin mr-2" /> Loading info...
                            </div>
                          ) : executionHistory[task.id].error ? (
                            <div className="text-red-600 py-4">{executionHistory[task.id].error}</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Entity Table:</span>
                                {executionHistory[task.id].entity_name} ({executionHistory[task.id].current_record_count || 0} records)
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Source:</span>
                                {executionHistory[task.id].source_name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Scheduled Time:</span>
                                {formatDateTime(executionHistory[task.id].scheduled_time)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">Status:</span>
                                {new Date(executionHistory[task.id].scheduled_time) <= new Date() ?
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle size={14} /> Ready</span> :
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={14} /> Waiting</span>
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

export default TaskExecution;