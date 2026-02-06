import React, { useState, useEffect } from 'react';
import {
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  ArrowLeft,
  Database,
  Zap,
  Clock,
  FileText,
  Globe,
  Settings,
  Info
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

const ApiTaskExecutor = () => {
  const navigate = useNavigate();
  const [executing, setExecuting] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const queryClient = useQueryClient();

  // Fetch tasks - filter for API tasks (source_type = 'api')
  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['api-tasks'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/task/tasks`, {
        method: 'GET',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      // Filter for API tasks only
      return (data.tasks || []).filter(t => t.source_type === 'api' || t.api_source_id);
    },
  });

  // Fetch API sources for reference
  const { data: sourcesData } = useQuery({
    queryKey: ['api-sources'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api-sources/`, {
        method: 'GET',
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!res.ok) return [];
      const payload = await res.json();
      if (Array.isArray(payload)) return payload;
      return payload?.sources || [];
    },
  });

  const tasks = tasksData || [];
  const sources = sourcesData || [];

  const getSourceName = (sourceId) => {
    const source = sources.find(s => s.id === sourceId);
    return source?.name || `Source ${sourceId}`;
  };

  const executeTask = async (taskId, taskName) => {
    if (!confirm(`Execute task "${taskName}"? This will fetch data from the API and store in the database.`)) {
      return;
    }

    try {
      setExecuting(taskId);
      setError(null);
      setSuccess(null);
      setResult(null);

      const res = await fetch(`${API_BASE}/task/execute-task/${taskId}`, {
        method: 'POST',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to execute task');
      }

      setResult(data);
      setSuccess(`Task executed successfully! Extracted ${data.items_extracted} items.`);
      refetchTasks();
      
      setTimeout(() => {
        setSuccess(null);
        setResult(null);
      }, 5000);
    } catch (err) {
      setError('Execution failed: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setExecuting(null);
    }
  };

  if (isLoadingTasks) {
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
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading API Tasks...</h1>
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
              <Zap size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>API Task Executor</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Execute API-based tasks to fetch and store data</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <StyledButton 
              onClick={() => navigate('/dashboard')} 
              variant="outline"
              icon={<ArrowLeft size={18} />}
            >
              Dashboard
            </StyledButton>
            <StyledButton 
              onClick={() => navigate('/tasksmanagement')} 
              variant="primary"
              icon={<Plus size={18} />}
            >
              New Task
            </StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          
          {/* Alerts / Error Messages */}
          {error && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              color: '#00364A'
            }}>
              <AlertCircle size={20} style={{ color: '#EF4444' }} />
              <p style={{ fontWeight: '500', margin: 0, flex: 1 }}>{error}</p>
              <button 
                onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00364A', opacity: 0.5 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Result / Success Messages */}
          {(success || result) && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              backgroundColor: '#E0F2FE',
              border: '2px solid #49A3C4',
              color: '#00364A'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                <CheckCircle size={20} style={{ color: '#49A3C4', marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', margin: '0 0 5px 0' }}>{success || "Execution complete"}</p>
                  
                  {result && (
                     <div style={{
                      marginTop: '15px',
                      padding: '15px',
                      backgroundColor: 'rgba(255,255,255,0.6)',
                      borderRadius: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '15px'
                    }}>
                      <div>
                        <span style={{ fontSize: '12px', opacity: 0.7, display: 'block' }}>EXTRACTED</span>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: '#49A3C4' }}>{result.items_extracted || 0}</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', opacity: 0.7, display: 'block' }}>STORED</span>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>{result.items_upserted || 0}</span>
                      </div>
                      {result.items_failed > 0 && (
                        <div>
                          <span style={{ fontSize: '12px', opacity: 0.7, display: 'block' }}>FAILED</span>
                          <span style={{ fontSize: '20px', fontWeight: '800', color: '#EF4444' }}>{result.items_failed}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {result?.message && (
                     <p style={{ marginTop: '10px', fontSize: '13px', fontFamily: 'monospace' }}>{result.message}</p>
                  )}
                </div>
                <button 
                  onClick={() => { setSuccess(null); setResult(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00364A', opacity: 0.5 }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {tasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <Settings size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No API Tasks Found</h3>
              <p style={{ color: '#00364A', opacity: 0.6 }}>Create an API task in Task Management to get started.</p>
              <StyledButton
                onClick={() => navigate('/tasksmanagement')}
                style={{ marginTop: '20px', margin: '20px auto 0' }}
                variant="outline"
                icon={<Plus size={16} />}
              >
                Create API Task
              </StyledButton>
            </div>
          ) : (
            /* Task List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {tasks.map((task) => (
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
                      <div style={{ flex: '1 1 300px', minWidth: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                           <h3 style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#00364A',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {/* FIX: Checking both task_name and name */}
                            {task.task_name || task.name}
                          </h3>
                          <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              backgroundColor: '#E0EFFF',
                              color: '#49A3C4',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Zap size={12} /> API TASK
                          </span>
                        </div>
                        
                        <p style={{ color: '#00364A', opacity: 0.7, fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
                          {task.description || 'No description available for this task.'}
                        </p>

                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                            gap: '12px' 
                        }}>
                          <InfoItem icon={<Globe size={14} />} label="Source">{getSourceName(task.api_source_id)}</InfoItem>
                          <InfoItem icon={<Database size={14} />} label="Entity">{task.entity_name}</InfoItem>
                          {task.scheduled_time && (
                             <InfoItem icon={<Clock size={14} />} label="Scheduled">{new Date(task.scheduled_time).toLocaleString()}</InfoItem>
                          )}
                          <InfoItem icon={<RefreshCw size={14} />} label="Last Run">
                            {task.last_executed_at ? new Date(task.last_executed_at).toLocaleString() : 'Never'}
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
                        <div style={{ 
                            display: 'flex', 
                            gap: '10px',
                            flexWrap: 'nowrap'
                        }}>
                          <StyledButton
                            onClick={() => navigate('/task-logs/' + task.id)}
                            variant="outline"
                            icon={<FileText size={18} />}
                            style={{ height: '40px' }}
                          >
                            Logs
                          </StyledButton>
                          <StyledButton
                            // FIX: Checking both task_name and name for the confirmation alert
                            onClick={() => executeTask(task.id, task.task_name || task.name)}
                            disabled={executing === task.id}
                            variant="primary"
                            icon={executing === task.id ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                            style={{ padding: '8px 24px', height: '40px', whiteSpace: 'nowrap' }}
                          >
                            {executing === task.id ? 'Executing...' : 'Execute'}
                          </StyledButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// Helper Components (Styled to match reference)

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

export default ApiTaskExecutor;