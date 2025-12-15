import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  FileText,
  Database,
  Info,
  ChevronUp
} from 'lucide-react';
import API_BASE from './api_base';

const TaskLogs = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedExecutionId, setSelectedExecutionId] = useState(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const pageVisibilityRef = useRef(true);

  // Track page visibility to stop polling when page is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      pageVisibilityRef.current = isVisible;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch task info from tasks list
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/task/tasks`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return data.tasks || [];
    },
  });

  const taskInfo = tasksData?.find(t => t.id === parseInt(taskId));

  // Fetch task executions
  const { data: taskExecutions, isLoading: isLoadingExecutions } = useQuery({
    queryKey: ['taskExecutionSummary', taskId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/task/task-execution-summary/${taskId}`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!res.ok) throw new Error('Failed to fetch executions');
      const data = await res.json();
      return data;
    },
  });

  // Check if there's a current execution for polling
  const hasCurrentExecution = taskExecutions?.executions?.some(exec => exec.is_current);
  
  // Determine if we should poll (page visible and has current execution)
  const shouldPoll = isPageVisible && hasCurrentExecution;

  // Fetch task logs
  const { data: taskLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['taskLogs', taskId, selectedExecutionId],
    queryFn: async () => {
      const url = selectedExecutionId
        ? `${API_BASE}/task/task-execution-logs/${taskId}?execution_id=${selectedExecutionId}`
        : `${API_BASE}/task/task-execution-logs/${taskId}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      return data;
    },
    // Only poll if page is visible, has current execution, and no specific execution selected
    refetchInterval: (shouldPoll && !selectedExecutionId) ? 2000 : false,
  });

  // Update executions polling when shouldPoll changes
  useEffect(() => {
    if (shouldPoll) {
      const interval = setInterval(() => {
        queryClient.refetchQueries({ queryKey: ['taskExecutionSummary', taskId] });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [shouldPoll, taskId, queryClient]);

  const loading = (isLoadingExecutions && !taskExecutions) || (isLoadingLogs && !taskLogs);
  const error = null; // React Query handles errors internally

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString([], {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filterByExecution = (executionId) => {
    setSelectedExecutionId(executionId);
    // React Query will automatically refetch when selectedExecutionId changes
  };

  const hasCompletedExecution = taskExecutions?.executions?.some(exec => exec.final_status === 'completed');
  
  const getEntityDataPageUrl = () => {
    if (taskInfo?.entity_name) {
      return `/entity-data?entity=${encodeURIComponent(taskInfo.entity_name)}`;
    }
    return '/entity-data';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#C7D8ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
           width: '40px',
           height: '40px',
           border: '4px solid #49A3C4',
           borderTop: '4px solid transparent',
           borderRadius: '50%',
           animation: 'spin 1s linear infinite'
        }} />
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Task Logs...</h1>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header Section */}
        <div style={{
          padding: '40px 50px',
          borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#49A3C4',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileText size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#00364A', margin: 0 }}>Task Execution Logs</h1>
              <p style={{ fontSize: '18px', color: '#49A3C4', fontWeight: '600', margin: '5px 0' }}>
                {taskInfo?.task_name || `Task #${taskId}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/taskexecutor')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#00364A',
              border: '2px solid #00364A',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s'
            }}
          >
            <ArrowLeft size={18} /> Back to Tasks
          </button>
        </div>

        {/* Task Summary Info */}
        {taskInfo && (
          <div style={{
            padding: '20px 50px',
            backgroundColor: '#F8FBFF',
            display: 'flex',
            gap: '40px',
            borderBottom: '1px solid rgba(0, 54, 74, 0.05)'
          }}>
            <SummaryItem label="Source" value={taskInfo.source_name} />
            <SummaryItem label="Entity" value={taskInfo.entity_name} />
            <SummaryItem label="Mapping" value={taskInfo.mapping_name} />
          </div>
        )}

        <div style={{ padding: '50px' }}>
          {/* Error State */}
          {error && (
            <div style={{
              padding: '25px',
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              borderRadius: '15px',
              display: 'flex',
              gap: '15px',
              color: '#991B1B'
            }}>
              <AlertCircle size={24} />
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontWeight: '700' }}>Error Loading Logs</h3>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            </div>
          )}

          {/* Execution History Cards */}
          <div style={{ marginBottom: '50px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={24} color="#49A3C4" /> Execution History
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {taskExecutions?.executions?.sort((a,b) => (b.start_time || "").localeCompare(a.start_time || "")).map((exec) => (
                <button
                  key={exec.execution_id}
                  onClick={() => filterByExecution(exec.execution_id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '20px 25px',
                    borderRadius: '15px',
                    border: '2px solid',
                    borderColor: selectedExecutionId === exec.execution_id ? '#49A3C4' : 'rgba(0, 54, 74, 0.08)',
                    backgroundColor: selectedExecutionId === exec.execution_id ? '#F0F9FF' : 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                      padding: '10px',
                      backgroundColor: 'rgba(73, 163, 196, 0.1)',
                      borderRadius: '10px',
                      color: '#49A3C4'
                    }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: '700', color: '#00364A', margin: 0 }}>
                        {exec.start_time ? formatDateTime(exec.start_time) : 'Unknown time'}
                      </p>
                      <div style={{ display: 'flex', gap: '15px', marginTop: '5px', fontSize: '13px', color: '#00364A', opacity: 0.6 }}>
                        {exec.is_current && <span style={{ color: '#49A3C4', fontWeight: '800' }}>● LATEST</span>}
                        <span>{exec.log_count} logs</span>
                        <span>{exec.error_count} errors</span>
                        {exec.duration_ms && <span>{(exec.duration_ms / 1000).toFixed(2)}s duration</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <StatusBadge status={exec.final_status} />
                    {selectedExecutionId === exec.execution_id ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Logs Terminal Section */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Execution Logs</h2>
                {hasCurrentExecution && (
                  <div style={{
                    padding: '6px 15px',
                    backgroundColor: '#E0EFFF',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#49A3C4'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#49A3C4',
                      borderRadius: '50%',
                      animation: 'blink 1s infinite'
                    }} />
                    LIVE POLLING
                  </div>
                )}
              </div>
              {selectedExecutionId && (
                <button 
                  onClick={() => filterByExecution(null)}
                  style={{ color: '#49A3C4', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {taskLogs?.logs?.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                backgroundColor: '#F8FBFF',
                borderRadius: '20px',
                border: '2px dashed rgba(0, 54, 74, 0.1)'
              }}>
                <AlertCircle size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
                <p style={{ fontSize: '18px', color: '#00364A', fontWeight: '600' }}>No logs available for this task.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {taskLogs?.logs?.map((log) => (
                  <LogCard key={log.id} log={log} formatDateTime={formatDateTime} />
                ))}
              </div>
            )}
          </div>

          {/* Success CTA */}
          {hasCompletedExecution && taskInfo && (
            <div style={{
              marginTop: '50px',
              padding: '40px',
              backgroundColor: '#00364A',
              borderRadius: '25px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 20px 40px rgba(0, 54, 74, 0.3)'
            }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px 0' }}>Task Completed Successfully!</h3>
                <p style={{ fontSize: '16px', opacity: 0.8, margin: 0 }}>
                  Data has been stored in <strong>{taskInfo.entity_name}</strong>. You can view the scraped results now.
                </p>
              </div>
              <button
                onClick={() => navigate(getEntityDataPageUrl())}
                style={{
                  padding: '16px 32px',
                  backgroundColor: '#49A3C4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s'
                }}
              >
                <Database size={20} /> View Entity Data
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <div>
    <p style={{ fontSize: '12px', fontWeight: '800', color: '#49A3C4', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
    <p style={{ fontSize: '15px', fontWeight: '700', color: '#00364A', margin: 0 }}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const getColors = () => {
    switch(status) {
      case 'completed': return { bg: '#E0F2FE', text: '#0369A1' };
      case 'failed': return { bg: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };
  const colors = getColors();
  return (
    <span style={{
      padding: '8px 16px',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: '800',
      textTransform: 'uppercase',
      backgroundColor: colors.bg,
      color: colors.text
    }}>
      {status || 'pending'}
    </span>
  );
};

const LogCard = ({ log, formatDateTime }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isError = log.log_level === 'error';

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '15px',
      border: `2px solid ${isError ? '#FECACA' : 'rgba(0, 54, 74, 0.08)'}`,
      padding: '25px',
      boxShadow: '0 4px 15px rgba(0, 54, 74, 0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: isError ? '#FEF2F2' : '#F8FBFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isError ? '#EF4444' : '#49A3C4'
        }}>
          {isError ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '900',
              padding: '2px 8px',
              borderRadius: '5px',
              backgroundColor: isError ? '#EF4444' : '#00364A',
              color: 'white'
            }}>{log.log_level.toUpperCase()}</span>
            <span style={{ fontSize: '12px', color: '#00364A', opacity: 0.5 }}>{formatDateTime(log.created_at)}</span>
          </div>
          
          <p style={{ fontSize: '15px', fontWeight: '600', color: '#00364A', margin: '0 0 15px 0' }}>{log.message}</p>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            {log.details && Object.keys(log.details).length > 0 && (
              <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#49A3C4',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 
                {isOpen ? 'Hide Details' : 'View Data Results'}
              </button>
            )}
          </div>

          {isOpen && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#F8FBFF',
              borderRadius: '12px',
              border: '1px solid rgba(0, 54, 74, 0.05)'
            }}>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(log.details).map(([key, value]) => (
                    <tr key={key}>
                      <td style={{ padding: '8px 0', fontWeight: '700', color: '#00364A', width: '30%', verticalAlign: 'top' }}>{key}</td>
                      <td style={{ padding: '8px 0', color: '#00364A', opacity: 0.8 }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {log.error_traceback && (
            <pre style={{
              marginTop: '15px',
              padding: '15px',
              backgroundColor: '#1E293B',
              color: '#FCA5A5',
              borderRadius: '10px',
              fontSize: '12px',
              overflowX: 'auto',
              fontFamily: 'monospace'
            }}>
              {log.error_traceback}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskLogs;