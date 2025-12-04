import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  FileText,
  Database
} from 'lucide-react';
import API_BASE from './api_base';

const TaskLogs = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [taskInfo, setTaskInfo] = useState(null);
  const [taskLogs, setTaskLogs] = useState(null);
  const [taskExecutions, setTaskExecutions] = useState(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Polling effect: Poll logs and executions when there's a current execution
  useEffect(() => {
    if (!taskExecutions) return;

    // Check if there's any current/running execution
    const hasCurrentExecution = taskExecutions.executions?.some(exec => exec.is_current);

    if (hasCurrentExecution) {
      // Poll every 2 seconds when task is running
      const interval = setInterval(() => {
        // Only refresh logs and executions, not task info (which doesn't change)
        fetchTaskLogs(selectedExecutionId);
        fetchTaskExecutions();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [taskExecutions, selectedExecutionId, taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch task info
      const tasksRes = await fetch(`${API_BASE}/task/tasks`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const tasksData = await tasksRes.json();
      const task = tasksData.tasks?.find(t => t.id === parseInt(taskId));
      
      if (task) {
        setTaskInfo(task);
      }

      // Fetch execution logs and summary in parallel
      await Promise.all([
        fetchTaskLogs(),
        fetchTaskExecutions()
      ]);
    } catch (err) {
      setError(`Failed to fetch task details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskLogs = async (executionId = null) => {
    try {
      const url = executionId
        ? `${API_BASE}/task/task-execution-logs/${taskId}?execution_id=${executionId}`
        : `${API_BASE}/task/task-execution-logs/${taskId}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      setTaskLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchTaskExecutions = async () => {
    try {
      const res = await fetch(`${API_BASE}/task/task-execution-summary/${taskId}`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      setTaskExecutions(data);
    } catch (err) {
      console.error('Error fetching executions:', err);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString([], {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filterByExecution = async (executionId) => {
    setSelectedExecutionId(executionId);
    await fetchTaskLogs(executionId);
  };

  // Check if there's any completed execution
  const hasCompletedExecution = taskExecutions?.executions?.some(exec => exec.final_status === 'completed');
  
  // Check if there's a current/running execution (for polling indicator)
  const hasCurrentExecution = taskExecutions?.executions?.some(exec => exec.is_current);
  
  const getEntityDataPageUrl = () => {
    if (taskInfo?.entity_name) {
      return `/entity-data?entity=${encodeURIComponent(taskInfo.entity_name)}`;
    }
    return '/entity-data';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
          <h1 className="text-2xl font-bold text-gray-900">Loading Task Logs...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/taskexecutor')}
            className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:text-teal-700 font-medium mb-6"
          >
            <ArrowLeft size={20} /> Back to Tasks
          </button>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-start gap-4 text-red-600">
              <AlertCircle size={24} className="mt-1 shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-2">Error Loading Logs</h2>
                <p className="text-gray-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/taskexecutor')}
            className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:text-teal-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Tasks
          </button>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <FileText size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Task Execution Logs</h1>
                  <p className="text-teal-100 mt-2">
                    {taskInfo?.task_name || `Task #${taskId}`}
                  </p>
                  {taskInfo && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-teal-100">Source</p>
                        <p className="font-medium">{taskInfo.source_name}</p>
                      </div>
                      <div>
                        <p className="text-teal-100">Entity</p>
                        <p className="font-medium">{taskInfo.entity_name}</p>
                      </div>
                      <div>
                        <p className="text-teal-100">Mapping</p>
                        <p className="font-medium">{taskInfo.mapping_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6">
            {/* Execution History */}
            {taskExecutions && taskExecutions.executions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Execution History</h2>
                <div className="space-y-2">
                  {(() => {
                    const execs = taskExecutions.executions.slice();
                    execs.sort((a, b) => {
                      if (a.is_current && !b.is_current) return -1;
                      if (!a.is_current && b.is_current) return 1;
                      const aTime = a.start_time ? new Date(a.start_time) : 0;
                      const bTime = b.start_time ? new Date(b.start_time) : 0;
                      return bTime - aTime;
                    });
                    return execs.map((exec) => (
                      <button
                        key={exec.execution_id}
                        onClick={() => filterByExecution(exec.execution_id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedExecutionId === exec.execution_id
                            ? 'bg-teal-50 border-teal-400 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-teal-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Clock size={18} className="text-gray-500 shrink-0" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                {exec.start_time ? formatDateTime(exec.start_time) : 'Unknown time'}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                                {exec.is_current && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                    CURRENT
                                  </span>
                                )}
                                <span>{exec.log_count} logs</span>
                                <span>•</span>
                                <span>{exec.error_count} errors</span>
                                {exec.duration_ms && (
                                  <>
                                    <span>•</span>
                                    <span>{(exec.duration_ms / 1000).toFixed(2)}s</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              exec.final_status === 'completed' ? 'bg-green-100 text-green-800' :
                              exec.final_status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {exec.final_status || 'unknown'}
                            </span>
                            {selectedExecutionId === exec.execution_id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </div>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Logs */}
            {taskLogs && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Execution Logs
                      {selectedExecutionId && taskLogs?.logs && (
                        <span className="text-lg font-normal text-gray-600 ml-2">({taskLogs.logs.length} entries)</span>
                      )}
                    </h2>
                    {hasCurrentExecution && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-xs font-semibold text-blue-700">Live</span>
                      </div>
                    )}
                  </div>
                  {selectedExecutionId && (
                    <button
                      onClick={() => filterByExecution(null)}
                      className="text-sm px-3 py-1.5 bg-teal-100 text-teal-700 hover:bg-teal-200 rounded-lg font-medium transition-colors"
                    >
                      Show All Logs
                    </button>
                  )}
                </div>

                {taskLogs.logs && taskLogs.logs.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">No logs available for this task yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {taskLogs.logs && taskLogs.logs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-5 rounded-lg border-l-4 transition-all ${
                          log.log_level === 'error' ? 'bg-red-50 border-red-500 shadow-sm' :
                          log.log_level === 'warning' ? 'bg-yellow-50 border-yellow-500 shadow-sm' :
                          log.status === 'completed' ? 'bg-green-50 border-green-500 shadow-sm' :
                          'bg-gray-50 border-gray-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                                log.log_level === 'error' ? 'bg-red-200 text-red-800' :
                                log.log_level === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                                log.log_level === 'debug' ? 'bg-blue-200 text-blue-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {log.log_level.toUpperCase()}
                              </span>
                              <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                                log.status === 'completed' ? 'bg-green-200 text-green-800' :
                                log.status === 'failed' ? 'bg-red-200 text-red-800' :
                                log.status === 'processing' ? 'bg-blue-200 text-blue-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {log.status}
                              </span>
                              {log.execution_duration_ms && (
                                <span className="text-xs text-gray-600 font-mono">
                                  {log.execution_duration_ms}ms
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-2">{log.message}</p>
                            {log.created_at && (
                              <p className="text-xs text-gray-500 mb-3">
                                {formatDateTime(log.created_at)}
                              </p>
                            )}

                            {/* Details Table */}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <details className="mt-3 group">
                                <summary className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors text-xs font-medium text-gray-700 select-none">
                                  <span>View Details</span>
                                  <span className="group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                
                                <div className="mt-3 overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
                                  <table className="w-full text-xs bg-white">
                                    <thead className="bg-gradient-to-r from-teal-50 to-teal-100 border-b-2 border-teal-300">
                                      <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-teal-900 border-r border-teal-200 w-1/3">
                                          Key
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-teal-900">
                                          Value
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {Object.entries(log.details).map(([key, value], idx) => (
                                        <tr key={key} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-teal-50' : 'bg-gray-50 hover:bg-teal-50'}`}>
                                          <td className="px-4 py-3 font-semibold text-gray-900 border-r border-gray-200 break-words max-w-xs">
                                            {key}
                                          </td>
                                          <td className="px-4 py-3 text-gray-700 break-words">
                                            {typeof value === 'object' && value !== null 
                                              ? <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-800">{JSON.stringify(value)}</code>
                                              : String(value)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            )}

                            {/* Error Traceback */}
                            {log.error_traceback && (
                              <details className="mt-3 group">
                                <summary className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-100 hover:bg-red-200 transition-colors text-xs font-medium text-red-800 select-none">
                                  <span>View Error Traceback</span>
                                  <span className="group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <pre className="mt-3 p-4 bg-gray-900 text-red-200 rounded-lg text-xs overflow-x-auto font-mono border border-red-300 shadow-sm">
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

            {/* Success Banner with Entity Data Link */}
            {hasCompletedExecution && taskInfo && (
              <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">Task Completed Successfully!</h3>
                    <p className="text-green-800 mb-4">The data has been scraped and stored in the <strong>{taskInfo.entity_name}</strong> table.</p>
                    <a
                      href={getEntityDataPageUrl()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 !text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg no-underline"
                    >
                      <Database size={18} />
                      View Entity Data
                    </a>
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

export default TaskLogs;
