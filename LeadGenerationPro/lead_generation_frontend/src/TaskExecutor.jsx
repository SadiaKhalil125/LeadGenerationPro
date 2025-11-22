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
  List, // For entity detail
  FileText, // For logs button
  X, // For close button
  Clock, // For time icon
  ChevronRight, // For expand icon
  ChevronDown // For collapse icon
} from 'lucide-react';

import API_BASE from "./api_base";

const TaskExecution = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // Added for initial page load state
  const [executingTask, setExecutingTask] = useState(null);
  const [response, setResponse] = useState(null);
  const [executionHistory, setExecutionHistory] = useState({}); // Stores history for specific task IDs
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'upcoming', 'previous'
  const [selectedTaskLogs, setSelectedTaskLogs] = useState(null); // Selected task for detailed logs
  const [taskLogs, setTaskLogs] = useState({}); // Stores logs for tasks
  const [taskExecutions, setTaskExecutions] = useState({}); // Stores execution summaries
  const [selectedExecutionId, setSelectedExecutionId] = useState(null); // Selected execution for filtering

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/task/tasks`,{
        method: 'GET',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
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

      const res = await fetch(`${API_BASE}/task/execute-task/${taskId}`, {
        method: 'POST',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Check if task was queued or executed directly
        if (data.queued) {
          setResponse({
            type: 'success',
            message: `Task "${taskName}" has been queued for execution in Kafka. It will be processed by the worker shortly.`,
            details: data
          });
        } else {
          setResponse({
            type: 'success',
            message: `Task executed successfully! Scraped ${data.items_scraped || 0} items, stored ${data.items_stored || 0} records in ${data.entity_name} table.`,
            details: data
          });
        }
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

      const res = await fetch(`${API_BASE}/task/task-execution-history/${taskId}`,{
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
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
  
  // Categorize tasks
  const now = new Date();
  const upcomingTasks = tasks.filter(task => new Date(task.scheduled_time) > now);
  const previousTasks = tasks.filter(task => new Date(task.scheduled_time) <= now || task.last_executed_at);
  
  const getFilteredTasks = () => {
    if (activeCategory === 'upcoming') return upcomingTasks.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    if (activeCategory === 'previous') return previousTasks.sort((a, b) => {
      const aTime = a.last_executed_at ? new Date(a.last_executed_at) : new Date(a.scheduled_time);
      const bTime = b.last_executed_at ? new Date(b.last_executed_at) : new Date(b.scheduled_time);
      return bTime - aTime; // Most recent first
    });
    return sortedTasks;
  };
  
  const fetchTaskLogs = async (taskId, executionId = null) => {
    try {
      const url = executionId 
        ? `${API_BASE}/task/task-execution-logs/${taskId}?execution_id=${executionId}`
        : `${API_BASE}/task/task-execution-logs/${taskId}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      
      if (res.ok) {
        setTaskLogs(prev => ({ ...prev, [taskId]: data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching task logs:', error);
    }
  };
  
  const fetchTaskExecutions = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE}/task/task-execution-summary/${taskId}`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      
      if (res.ok) {
        setTaskExecutions(prev => ({ ...prev, [taskId]: data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching task executions:', error);
    }
  };
  
  const openTaskLogs = async (taskId) => {
    setSelectedTaskLogs(taskId);
    setSelectedExecutionId(null);
    await Promise.all([
      fetchTaskLogs(taskId),
      fetchTaskExecutions(taskId)
    ]);
  };
  
  const closeTaskLogs = () => {
    setSelectedTaskLogs(null);
    setSelectedExecutionId(null);
  };
  
  const filterByExecution = async (taskId, executionId) => {
    setSelectedExecutionId(executionId);
    await fetchTaskLogs(taskId, executionId);
  };

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

            {/* Category Filter */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setActiveCategory('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeCategory === 'upcoming'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Upcoming ({upcomingTasks.length})
              </button>
              <button
                onClick={() => setActiveCategory('previous')}
                className={`px-4 py-2  rounded-lg  font-medium transition-colors ${
                  activeCategory === 'previous'
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous ({previousTasks.length})
              </button>
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

            {getFilteredTasks().length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <ListChecks size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No Tasks Found</h3>
                <p className="text-gray-500 mt-1">When tasks are created, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredTasks().map((task) => (
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
                            <div className="flex items-center gap-2">
                              <RefreshCw size={16} className="text-teal-500" />
                              <span className="font-medium text-gray-800">Repeat:</span> {task.repeat}
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle size={16} className="text-teal-500" />
                              <span className="font-medium text-gray-800">Last Executed:</span>
                              {task.last_executed_at ? formatDateTime(task.last_executed_at) : 'Never'}
                            </div>
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
                              onClick={() => openTaskLogs(task.id)}
                              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="View Detailed Logs"
                            >
                              <FileText size={16} />
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
                                  <span className="font-medium text-gray-900">Max Items:</span>
                                  {executionHistory[task.id].max_items}
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

      {/* Detailed Logs Modal */}
      {selectedTaskLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Task Execution Logs</h2>
                <p className="text-teal-100 mt-1">
                  {tasks.find(t => t.id === selectedTaskLogs)?.task_name || `Task #${selectedTaskLogs}`}
                </p>
              </div>
              <button
                onClick={closeTaskLogs}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-black"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {taskExecutions[selectedTaskLogs] && taskExecutions[selectedTaskLogs].executions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Execution History</h3>
                  <div className="space-y-2">
                    {taskExecutions[selectedTaskLogs].executions.map((exec) => (
                      <button
                        key={exec.execution_id}
                        onClick={() => filterByExecution(selectedTaskLogs, exec.execution_id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedExecutionId === exec.execution_id
                            ? 'bg-teal-50 border-teal-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock size={16} className="text-gray-500" />
                            <div>
                              <p className="font-medium text-sm">
                                {exec.start_time ? formatDateTime(exec.start_time) : 'Unknown time'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {exec.log_count} logs • {exec.error_count} errors
                                {exec.duration_ms && ` • ${(exec.duration_ms / 1000).toFixed(2)}s`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              exec.final_status === 'completed' ? 'bg-green-100 text-green-800' :
                              exec.final_status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {exec.final_status || 'unknown'}
                            </span>
                            {selectedExecutionId === exec.execution_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {taskLogs[selectedTaskLogs] && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      Execution Logs
                      {selectedExecutionId && taskLogs[selectedTaskLogs]?.logs && (
                        <span> ({taskLogs[selectedTaskLogs].logs.length} entries)</span>
                      )}
                    </h3>
                    {selectedExecutionId && (
                      <button
                        onClick={() => filterByExecution(selectedTaskLogs, null)}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        Show All Logs
                      </button>
                    )}
                  </div>

                  {taskLogs[selectedTaskLogs].logs && taskLogs[selectedTaskLogs].logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No logs available for this task yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {taskLogs[selectedTaskLogs].logs && taskLogs[selectedTaskLogs].logs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border-l-4 ${
                            log.log_level === 'error' ? 'bg-red-50 border-red-500' :
                            log.log_level === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                            log.status === 'completed' ? 'bg-green-50 border-green-500' :
                            'bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  log.log_level === 'error' ? 'bg-red-200 text-red-800' :
                                  log.log_level === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                                  log.log_level === 'debug' ? 'bg-blue-200 text-blue-800' :
                                  'bg-gray-200 text-gray-800'
                                }`}>
                                  {log.log_level.toUpperCase()}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  log.status === 'completed' ? 'bg-green-200 text-green-800' :
                                  log.status === 'failed' ? 'bg-red-200 text-red-800' :
                                  log.status === 'processing' ? 'bg-blue-200 text-blue-800' :
                                  'bg-gray-200 text-gray-800'
                                }`}>
                                  {log.status}
                                </span>
                                {log.execution_duration_ms && (
                                  <span className="text-xs text-gray-500">
                                    {log.execution_duration_ms}ms
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 mb-1">{log.message}</p>
                              {log.created_at && (
                                <p className="text-xs text-gray-500">
                                  {formatDateTime(log.created_at)}
                                </p>
                              )}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                                    View Details
                                  </summary>
                                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {log.error_traceback && (
                                <details className="mt-2">
                                  <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                                    View Error Traceback
                                  </summary>
                                  <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-x-auto text-red-900">
                                    {log.error_traceback}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskExecution;