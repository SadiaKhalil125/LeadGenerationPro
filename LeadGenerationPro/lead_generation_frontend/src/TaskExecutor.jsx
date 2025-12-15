import React, { useState, useEffect } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";

const TaskExecution = () => {
  const navigate = useNavigate();
  const [executingTask, setExecutingTask] = useState(null);
  const [response, setResponse] = useState(null);
  const [executionHistory, setExecutionHistory] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [taskExecutions, setTaskExecutions] = useState({});
  const [currentExecutions, setCurrentExecutions] = useState({});
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/task/tasks`,{
        method: 'GET',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      return data.tasks || [];
    },
  });

  // Only show loading on initial load, not on background refetches
  const pageLoading = isLoadingTasks && !tasksData;

  const tasks = tasksData || [];

  // Fetch task executions for all tasks
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      Promise.all(tasks.map(t => fetchTaskExecutions(t.id))).catch(e => {
        // ignore per-task failures
      });
    }
  }, [tasks]);

  const executeTask = async (taskId, taskName) => {
    if (!confirm(`Are you sure you want to execute task "${taskName}"? This will scrape data and store it in the database.`)) {
      return;
    }

    try {
      setExecutingTask(taskId);
      setResponse(null);

      const res = await fetch(`${API_BASE}/task/execute-task/${taskId}`, {
        method: 'POST',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
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
      console.error('Error executing task:', error);
      setResponse({ type: 'error', message: 'Network error occurred' });
    } finally {
      setExecutingTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (executionHistory[taskId]) {
        fetchExecutionHistory(taskId);
      }
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
      setExecutionHistory(prev => ({
        ...prev,
        [taskId]: { loading: true }
      }));

      const res = await fetch(`${API_BASE}/task/task-execution-history/${taskId}`,{
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const data = await res.json();

      setExecutionHistory(prev => ({
        ...prev,
        [taskId]: data
      }));
    } catch (error) {
      console.error('Error fetching execution history:', error);
      setExecutionHistory(prev => ({
        ...prev,
        [taskId]: { error: 'Failed to load history.' }
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
      if (activeCategory === 'current') {
        return currentTasks.sort((a, b) => {
          const aExec = (taskExecutions[a.id]?.executions || []).find(e => e.is_current);
          const bExec = (taskExecutions[b.id]?.executions || []).find(e => e.is_current);
          const aTime = aExec && aExec.start_time ? new Date(aExec.start_time) : new Date(a.scheduled_time);
          const bTime = bExec && bExec.start_time ? new Date(bExec.start_time) : new Date(b.scheduled_time);
          return bTime - aTime;
        });
      }
      if (activeCategory === 'previous') return previousTasks.sort((a, b) => {
        const aTime = a.last_executed_at ? new Date(a.last_executed_at) : new Date(a.scheduled_time);
        const bTime = b.last_executed_at ? new Date(b.last_executed_at) : new Date(b.scheduled_time);
        return bTime - aTime;
      });
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
        return data;
      }
    } catch (error) {
      console.error('Error fetching task executions:', error);
    }
  };
  
  const openTaskLogs = (taskId) => {
    navigate(`/task-logs/${taskId}`);
  };

  if (pageLoading) {
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
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Task Data...</h1>
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
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>Task Execution Center</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Execute tasks and view outcomes</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <StyledButton 
            onClick={()=>navigate('/dashboard')} 
            variant="outline"
            icon={<ArrowLeft size={18} />}
          >
            Dashboard
          </StyledButton>
          <StyledButton 
            onClick={()=>navigate('/taskscheduler')} 
            variant="outline"
            icon={<Plus size={18} />}
          >
            Create Task
          </StyledButton>
          <StyledButton 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })} 
            variant="outline"
            icon={<RefreshCw size={18} />}
          >
            Refresh
          </StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Stats Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <StatCard title="Total Tasks" value={tasks.length} color="#00364A" />
            <StatCard title="Ready to Execute" value={readyCount} color="#D97706" />
            <StatCard title="Scheduled" value={scheduledCount} color="#059669" />
          </div>

          {/* Category Filter */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            {['all', 'upcoming', 'current', 'previous'].map(cat => {
              const isActive = activeCategory === cat;
              const labels = {
                all: `All Tasks (${tasks.length})`,
                upcoming: `Upcoming (${upcomingTasks.length})`,
                current: `Current (${currentCount})`,
                previous: `Previous (${previousTasks.length})`
              };
              
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: isActive ? '#49A3C4' : 'transparent',
                    color: isActive ? 'white' : '#49A3C4',
                    border: isActive ? 'none' : '2px solid #49A3C4',
                    borderRadius: '25px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                       e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                       e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {labels[cat]}
                </button>
              );
            })}
          </div>

          {/* Response Messages */}
          {response && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '15px',
              backgroundColor: response.type === 'success' ? '#E0F2FE' : '#FEF2F2',
              border: `2px solid ${response.type === 'success' ? '#49A3C4' : '#EF4444'}`,
              color: '#00364A'
            }}>
              <div style={{
                color: response.type === 'success' ? '#49A3C4' : '#EF4444',
                marginTop: '2px'
              }}>
                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', margin: '0 0 5px 0' }}>{response.message}</p>
                {response.details && (
                  <div style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    padding: '10px',
                    borderRadius: '8px',
                    fontFamily: 'monospace'
                  }}>
                    <p style={{margin: '2px 0'}}><strong>Task ID:</strong> {response.details.task_id}</p>
                    {response.details.entity_name && <p style={{margin: '2px 0'}}><strong>Entity:</strong> {response.details.entity_name}</p>}
                    {response.details.items_scraped !== undefined && (
                      <p style={{margin: '2px 0'}}><strong>Items Scraped:</strong> {response.details.items_scraped}</p>
                    )}
                    {response.details.items_stored !== undefined && (
                      <p style={{margin: '2px 0'}}><strong>Items Stored:</strong> {response.details.items_stored}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Task List */}
          {getFilteredTasks().length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <ListChecks size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No Tasks Found</h3>
              <p style={{ color: '#00364A', opacity: 0.6 }}>Tasks created will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {getFilteredTasks().map((task) => (
                <div key={task.id} style={{
                  backgroundColor: 'white',
                  border: '2px solid rgba(0, 54, 74, 0.08)',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ padding: '25px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '20px',
                      flexWrap: 'wrap'
                    }}>
                      {/* Left Side: Task Details */}
                      <div style={{ 
                          flex: '1 1 300px', 
                          minWidth: '0' 
                      }}>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#00364A',
                          marginBottom: '20px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {task.task_name}
                        </h3>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '12px' 
                        }}>
                          <InfoItem icon={<Database size={14} />} label="Source">{task.source_name}</InfoItem>
                          <InfoItem icon={<Map size={14} />} label="Mapping">{task.mapping_name}</InfoItem>
                          <InfoItem icon={<List size={14} />} label="Entity">{task.entity_name}</InfoItem>
                          <InfoItem icon={<Calendar size={14} />} label="Scheduled">{formatDateTime(task.scheduled_time)}</InfoItem>
                          <InfoItem icon={<RotateCw size={14} />} label="Repeat">{task.repeat}</InfoItem>
                          <InfoItem icon={<Clock size={14} />} label="Last Run">
                            {task.last_executed_at ? formatDateTime(task.last_executed_at) : 'Never'}
                          </InfoItem>
                        </div>
                      </div>

                      {/* Right Side: Actions */}
                      <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end', 
                          gap: '15px',
                          flexShrink: 0, 
                          marginLeft: 'auto'
                      }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {currentExecutions[task.id] && (
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700',
                              backgroundColor: '#E0EFFF',
                              color: '#49A3C4',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap'
                            }}>
                              <Loader2 size={12} className="spin" /> RUNNING
                            </span>
                          )}
                          {getStatusBadge(task.scheduled_time)}
                        </div>
                        
                        <div style={{ 
                            display: 'flex', 
                            gap: '10px',
                            flexWrap: 'nowrap'
                        }}>
                          <IconButton 
                            onClick={() => fetchExecutionHistory(task.id)}
                            icon={executionHistory[task.id]?.loading ? <Loader2 size={16} className="spin" /> : <Info size={16} />} 
                            color="#00364A"
                            disabled={executingTask === task.id}
                            title={executionHistory[task.id] ? 'Hide Info' : 'View Info'}
                          />
                          <IconButton 
                            onClick={() => openTaskLogs(task.id)}
                            icon={<FileText size={16} />} 
                            color="#8B5CF6"
                            disabled={executingTask === task.id}
                            title="View Logs"
                          />
                          <StyledButton
                            onClick={() => executeTask(task.id, task.task_name)}
                            disabled={executingTask === task.id}
                            variant="primary"
                            icon={executingTask === task.id ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                            style={{ padding: '8px 20px', height: '40px', whiteSpace: 'nowrap' }}
                          >
                            {executingTask === task.id ? 'Executing...' : 'Execute'}
                          </StyledButton>
                        </div>
                      </div>
                    </div>

                    {/* Execution History Panel */}
                    {executionHistory[task.id] && (
                      <div style={{
                        marginTop: '25px',
                        paddingTop: '25px',
                        borderTop: '1px solid rgba(0, 54, 74, 0.1)',
                        animation: 'fadeIn 0.3s ease'
                      }}>
                        <h4 style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          color: '#00364A',
                          marginBottom: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Info size={16} color="#49A3C4" /> Task Information
                        </h4>

                        {executionHistory[task.id].loading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00364A', opacity: 0.6 }}>
                            <Loader2 size={16} className="spin" />
                            <span style={{ fontSize: '14px' }}>Loading info...</span>
                          </div>
                        ) : executionHistory[task.id].error ? (
                          <div style={{ color: '#EF4444', fontSize: '14px' }}>{executionHistory[task.id].error}</div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                            gap: '15px',
                            backgroundColor: '#F8FBFF',
                            padding: '15px',
                            borderRadius: '12px'
                          }}>
                            <InfoItem icon={<Database size={14} />} label="Table">
                              {executionHistory[task.id].entity_name} ({executionHistory[task.id].current_record_count || 0} records)
                            </InfoItem>
                            <InfoItem icon={<Clock size={14} />} label="Next Run">
                              {formatDateTime(executionHistory[task.id].scheduled_time)}
                            </InfoItem>
                            <InfoItem icon={<List size={14} />} label="Max Items">
                              {executionHistory[task.id].max_items}
                            </InfoItem>
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
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// Helper Components

const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled, style }) => {
  const [hover, setHover] = useState(false);
  
  const styles = {
    primary: {
      bg: '#00364A', color: 'white', border: '2px solid #00364A',
      hoverBg: 'white', hoverColor: '#00364A'
    },
    outline: {
      bg: 'white', color: '#00364A', border: '2px solid #00364A',
      hoverBg: '#00364A', hoverColor: 'white'
    }
  };

  const currentStyle = styles[variant];

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
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.3s',
        backgroundColor: hover && !disabled ? currentStyle.hoverBg : currentStyle.bg,
        color: hover && !disabled ? currentStyle.hoverColor : currentStyle.color,
        border: currentStyle.border,
        boxShadow: hover && !disabled ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
        transform: hover && !disabled ? 'translateY(-2px)' : 'none',
        ...style
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const StatCard = ({ title, value, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '25px',
    border: '2px solid rgba(0, 54, 74, 0.05)',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0, 54, 74, 0.03)'
  }}>
    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', opacity: 0.6, marginBottom: '5px' }}>{title}</h4>
    <p style={{ fontSize: '32px', fontWeight: '800', color: color, margin: 0 }}>{value}</p>
  </div>
);

const InfoItem = ({ icon, label, children }) => (
  <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      fontSize: '14px', 
      color: '#00364A',
      minWidth: 0 
  }}>
    <span style={{ color: '#49A3C4', flexShrink: 0 }}>{icon}</span>
    <span style={{ fontWeight: '600', opacity: 0.9, flexShrink: 0 }}>{label}:</span>
    <span style={{ 
        opacity: 0.8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    }}>{children}</span>
  </div>
);

const IconButton = ({ onClick, icon, color, disabled, title }) => {
  const [hover, setHover] = useState(false);
  
  // Use a hex code to ensure background opacity logic works
  const effectiveColor = disabled ? '#cccccc' : color;
  
  const getBgColor = () => {
    if (disabled) return '#f5f5f5';
    // If hovering, add transparency to hex color, or fallback to gray
    if (hover) {
        if (effectiveColor.startsWith('#')) return `${effectiveColor}15`; 
        return '#f0f0f0';
    }
    return '#F8FBFF';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '40px',
        minWidth: '40px',
        height: '40px',
        borderRadius: '10px',
        border: `1px solid ${disabled ? '#eee' : 'rgba(0,54,74,0.1)'}`,
        backgroundColor: getBgColor(),
        color: effectiveColor, // This text color is inherited by the Icon via currentColor
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
        padding: 0
      }}
    >
      {/* Icon renders here, inheriting text color */}
      {icon}
    </button>
  );
};

export default TaskExecution;