import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListChecks,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Info,
  Calendar,
  Database,
  Map,
  List,
  FileText,
  Clock,
  RotateCw,
  Plus,
  ArrowLeft,
  Globe,
  Monitor
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import Layout from './components/Layout';

const TaskExecution = () => {
  const navigate = useNavigate();
  const [executingTask, setExecutingTask] = useState(null);
  const [response, setResponse] = useState(null);
  const [executionHistory, setExecutionHistory] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [taskExecutions, setTaskExecutions] = useState({});
  const [currentExecutions, setCurrentExecutions] = useState({});
  const queryClient = useQueryClient();

  // NOTE: execution summaries (used only for RUNNING badge + "current" filter)
  // are NOT fetched automatically — only when the user clicks Refresh.
  // This prevents continuous background calls to task-execution-summary.

  // Fetch tasks — uses global defaults (staleTime 5min, no refetchOnWindowFocus)
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
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

  const pageLoading = isLoadingTasks && !tasksData;
  const tasks = tasksData || [];

  // Called by the Refresh button — refreshes tasks list AND execution summaries
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    // Fetch fresh summaries for all tasks so RUNNING badges are up-to-date
    const currentTasks = queryClient.getQueryData(['tasks']) || tasks;
    if (currentTasks.length > 0) {
      Promise.all(currentTasks.map(t => fetchTaskExecutions(t.id))).catch(() => { });
    }
  };


  const executeTask = async (taskId, taskName) => {
    if (!confirm(`Are you sure you want to execute task "${taskName}"?`)) {
      return;
    }

    try {
      setExecutingTask(taskId);
      setResponse(null);

      const res = await fetch(`${API_BASE}/task/execute-task/${taskId}`, {
        method: 'POST',
        headers: { "ngrok-skip-browser-warning": "true" }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.queued) {
          setResponse({
            type: 'success',
            message: `Task "${taskName}" has been queued for execution.`,
            details: data
          });
        } else {
          setResponse({
            type: 'success',
            message: `Task executed successfully! Scraped ${data.items_scraped || 0} items.`,
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
      setResponse({ type: 'error', message: 'Network error occurred' });
    } finally {
      setExecutingTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (executionHistory[taskId]) fetchExecutionHistory(taskId);
      // Refresh summary for just this task so RUNNING badge updates after execution
      fetchTaskExecutions(taskId);
    }
  };

  const fetchExecutionHistory = async (taskId) => {
    if (executionHistory[taskId]) {
      setExecutionHistory(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
      return;
    }

    try {
      setExecutionHistory(prev => ({ ...prev, [taskId]: { loading: true } }));
      const res = await fetch(`${API_BASE}/task/task-execution-history/${taskId}`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();
      setExecutionHistory(prev => ({ ...prev, [taskId]: data }));
    } catch (error) {
      setExecutionHistory(prev => ({ ...prev, [taskId]: { error: 'Failed to load history.' } }));
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
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '700',
        backgroundColor: isFuture ? '#E0F2FE' : '#FEF3C7',
        color: isFuture ? '#00364A' : '#92400E',
        whiteSpace: 'nowrap'
      }}>
        {isFuture ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
        {isFuture ? 'SCHEDULED' : 'READY'}
      </div>
    );
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
  const readyCount = tasks.filter(task => new Date(task.scheduled_time) <= new Date()).length;
  const scheduledCount = tasks.length - readyCount;
  const currentTasks = tasks.filter(task => !!currentExecutions[task.id]);
  const currentCount = currentTasks.length;

  const now = new Date();
  const upcomingTasks = tasks.filter(task => new Date(task.scheduled_time) > now);
  const previousTasks = tasks.filter(task => new Date(task.scheduled_time) <= now || task.last_executed_at);

  const getFilteredTasks = () => {
    if (activeCategory === 'upcoming') return upcomingTasks.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    if (activeCategory === 'current') return currentTasks;
    if (activeCategory === 'previous') return previousTasks.sort((a, b) => new Date(b.last_executed_at || b.scheduled_time) - new Date(a.last_executed_at || a.scheduled_time));
    return sortedTasks;
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
        const isCurrent = (data.executions || []).some(e => e.is_current);
        setCurrentExecutions(prev => ({ ...prev, [taskId]: !!isCurrent }));
      }
    } catch (error) { }
  };

  if (pageLoading) {
    return (
      <Layout pageTitle="Task Executor">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px', minHeight: '400px' }}>
          <Loader2 size={40} style={{ color: '#49A3C4' }} className="spin" />
          <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Task Data...</h1>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Task Executor">
      <div style={{
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden',
        color: '#00364A',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
      }}>
        {/* Header */}
        <div style={{
          padding: '40px 50px',
          borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
              <ListChecks size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#00364A', margin: 0, lineHeight: '1.2' }}>Task Execution Center</h1>
              <p style={{ fontSize: '16px', color: '#00364A', opacity: 0.7, margin: '5px 0 0 0' }}>Execute Web & API extraction tasks</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <StyledButton onClick={() => navigate('/dashboard')} variant="outline" icon={<ArrowLeft size={18} />}>Dashboard</StyledButton>
            <StyledButton onClick={() => navigate('/taskscheduler')} variant="outline" icon={<Plus size={18} />}>Create Task</StyledButton>
            <StyledButton onClick={handleRefresh} variant="outline" icon={<RefreshCw size={18} />}>Refresh</StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <StatCard title="Total Tasks" value={tasks.length} color="#00364A" />
            <StatCard title="Ready to Execute" value={readyCount} color="#D97706" />
            <StatCard title="Scheduled" value={scheduledCount} color="#059669" />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', flexWrap: 'wrap' }}>
            {['all', 'upcoming', 'current', 'previous'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: activeCategory === cat ? '#49A3C4' : 'transparent',
                  color: activeCategory === cat ? 'white' : '#49A3C4',
                  border: activeCategory === cat ? 'none' : '2px solid #49A3C4',
                  borderRadius: '25px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {cat.toUpperCase()} ({cat === 'all' ? tasks.length : cat === 'upcoming' ? upcomingTasks.length : cat === 'current' ? currentCount : previousTasks.length})
              </button>
            ))}
          </div>

          {/* Response Alert */}
          {response && (
            <div style={{ marginBottom: '30px', padding: '20px 25px', borderRadius: '15px', display: 'flex', gap: '15px', backgroundColor: response.type === 'success' ? '#E0F2FE' : '#FEF2F2', border: `2px solid ${response.type === 'success' ? '#49A3C4' : '#EF4444'}` }}>
              <div style={{ color: response.type === 'success' ? '#49A3C4' : '#EF4444', display: 'flex', alignItems: 'center' }}>
                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', margin: '0' }}>{response.message}</p>
              </div>
            </div>
          )}

          {/* Task List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {getFilteredTasks().map((task) => {
              const isApi = task.source_type === 'api' || !!task.api_source_id;

              return (
                <div key={task.id} style={{
                  backgroundColor: 'white',
                  border: '2px solid rgba(0, 54, 74, 0.08)',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 300px', minWidth: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', margin: 0 }}>
                            {task.task_name}
                          </h3>
                          {/* DYNAMIC SOURCE BADGE */}
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: isApi ? '#E0F2FE' : '#F3E8FF',
                            color: isApi ? '#0369A1' : '#7E22CE',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: `1px solid ${isApi ? '#BAE6FD' : '#E9D5FF'}`
                          }}>
                            {isApi ? <Globe size={12} /> : <Monitor size={12} />}
                            {isApi ? 'API BASED' : 'WEB BASED'}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                          <InfoItem icon={isApi ? <Globe size={14} /> : <Database size={14} />} label={isApi ? "API Source" : "Source"}>
                            {task.source_name}
                          </InfoItem>
                          <InfoItem icon={<Map size={14} />} label="Mapping">
                            {isApi ? "API Direct" : task.mapping_name}
                          </InfoItem>
                          <InfoItem icon={<List size={14} />} label="Entity">{task.entity_name}</InfoItem>
                          <InfoItem icon={<Calendar size={14} />} label="Scheduled">{formatDateTime(task.scheduled_time)}</InfoItem>
                          <InfoItem icon={<RotateCw size={14} />} label="Repeat">{task.repeat}</InfoItem>
                          <InfoItem icon={<Clock size={14} />} label="Last Run">
                            {task.last_executed_at ? formatDateTime(task.last_executed_at) : 'Never'}
                          </InfoItem>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '15px', marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {currentExecutions[task.id] && (
                            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', backgroundColor: '#E0EFFF', color: '#49A3C4', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <Loader2 size={12} className="spin" /> RUNNING
                            </span>
                          )}
                          {getStatusBadge(task.scheduled_time)}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <IconButton
                            onClick={() => fetchExecutionHistory(task.id)}
                            icon={executionHistory[task.id]?.loading ? <Loader2 size={16} className="spin" /> : <Info size={16} />}
                            color="#00364A"
                            disabled={executingTask === task.id}
                          />
                          <IconButton onClick={() => navigate(`/task-logs/${task.id}`)} icon={<FileText size={16} />} color="#8B5CF6" />
                          <StyledButton
                            onClick={() => executeTask(task.id, task.task_name)}
                            disabled={executingTask === task.id}
                            variant="primary"
                            icon={executingTask === task.id ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                            style={{ padding: '8px 20px', height: '40px' }}
                          >
                            {executingTask === task.id ? 'Executing...' : 'Execute'}
                          </StyledButton>
                        </div>
                      </div>
                    </div>

                    {/* History Panel */}
                    {executionHistory[task.id] && !executionHistory[task.id].loading && (
                      <div style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid rgba(0, 54, 74, 0.1)', animation: 'fadeIn 0.3s ease' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#00364A', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Info size={16} color="#49A3C4" /> Task Information
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', backgroundColor: '#F8FBFF', padding: '15px', borderRadius: '12px' }}>
                          <InfoItem icon={<Database size={14} />} label="Table">{executionHistory[task.id].entity_name}</InfoItem>
                          <InfoItem icon={<List size={14} />} label="Record Count">{executionHistory[task.id].current_record_count || 0}</InfoItem>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`.spin { animation: rotate 1s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .fadeIn { animation: fadeIn 0.3s ease; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </Layout>
  );
};

// Helper Components
const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled, style }) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '15px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        backgroundColor: variant === 'primary' ? (hover && !disabled ? '#004e66' : '#00364A') : (hover && !disabled ? '#00364A' : 'white'),
        color: variant === 'primary' ? 'white' : (hover && !disabled ? 'white' : '#00364A'),
        border: '2px solid #00364A',
        opacity: disabled ? 0.7 : 1,
        ...style
      }}
    >
      {icon} {children}
    </button>
  );
};

const StatCard = ({ title, value, color }) => (
  <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '25px', border: '2px solid rgba(0, 54, 74, 0.05)', textAlign: 'center' }}>
    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', opacity: 0.6, marginBottom: '5px' }}>{title}</h4>
    <p style={{ fontSize: '32px', fontWeight: '800', color, margin: 0 }}>{value}</p>
  </div>
);

const InfoItem = ({ icon, label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#00364A', minWidth: 0 }}>
    <span style={{ color: '#49A3C4', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
    <span style={{ fontWeight: '600', opacity: 0.9, flexShrink: 0 }}>{label}:</span>
    <span style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
  </div>
);

const IconButton = ({ onClick, icon, color, disabled }) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '40px',
        minWidth: '40px',
        height: '40px',
        borderRadius: '10px',
        border: '1px solid rgba(0,54,74,0.1)',
        backgroundColor: hover && !disabled ? `${color}15` : '#F8FBFF',
        color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        padding: 0,
        flexShrink: 0
      }}
    >
      {icon}
    </button>
  );
};

export default TaskExecution;