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
    List,
    Clock,
    Check,
    RotateCw,
    Maximize
} from 'lucide-react';
import API_BASE from "./api_base";

const TasksManagement = () => {
    const [tasks, setTasks] = useState([]);
    const [editingTask, setEditingTask] = useState(null);
    const [editScheduledTime, setEditScheduledTime] = useState('');
    const [editTaskName, setEditTaskName] = useState('');
    const [editRepeat, setEditRepeat] = useState('');
    const [editMaxItems, setEditMaxItems] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [response, setResponse] = useState(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/task/tasks`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
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
        const localDate = new Date(task.scheduled_time);
        const formattedDate = localDate.getFullYear() + '-' +
            ('0' + (localDate.getMonth() + 1)).slice(-2) + '-' +
            ('0' + localDate.getDate()).slice(-2) + 'T' +
            ('0' + localDate.getHours()).slice(-2) + ':' +
            ('0' + localDate.getMinutes()).slice(-2);
        setEditScheduledTime(formattedDate);
        setEditTaskName(task.task_name);
        setEditRepeat(task.repeat || 'once');
        setEditMaxItems(task.max_items || '');
        setResponse(null);
    };

    const handleCancelEdit = () => {
        setEditingTask(null);
        setEditScheduledTime('');
        setEditTaskName('');
        setEditRepeat('');
        setEditMaxItems('');
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
                task_name: editTaskName || undefined,
                repeat: editRepeat || undefined,
                max_items: editMaxItems !== '' ? Number(editMaxItems) : 0
            };
            const res = await fetch(`${API_BASE}/task/update-task/${taskId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true"
                },
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
            const res = await fetch(`${API_BASE}/task/delete-task/${taskId}`, { 
                method: 'DELETE',
                headers: { "ngrok-skip-browser-warning": "true" }
            });
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
        const isUpcoming = new Date(scheduledTime) > new Date();
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: isUpcoming ? '#E0F2FE' : '#F3F4F6',
                color: isUpcoming ? '#00364A' : '#4B5563',
                whiteSpace: 'nowrap'
            }}>
                {isUpcoming ? <Clock size={14} /> : <Check size={14} />}
                {isUpcoming ? 'UPCOMING' : 'PASSED'}
            </div>
        );
    };

    const sortedTasks = [...tasks].sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
    const upcomingCount = tasks.filter(task => new Date(task.scheduled_time) > new Date()).length;

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
                            }}>Tasks Management</h1>
                            <p style={{
                                fontSize: '16px',
                                color: '#00364A',
                                opacity: 0.7,
                                margin: '5px 0 0 0'
                            }}>Review, edit, and manage all scheduled tasks</p>
                        </div>
                    </div>
                    <StyledButton 
                        onClick={fetchTasks} 
                        variant="outline"
                        icon={<RefreshCw size={18} />}
                    >
                        Refresh
                    </StyledButton>
                </div>

                <div style={{ padding: '50px' }}>
                    {/* Stats Section */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        marginBottom: '40px'
                    }}>
                        <StatCard title="Total Scheduled" value={tasks.length} color="#00364A" />
                        <StatCard title="Upcoming" value={upcomingCount} color="#059669" />
                    </div>

                    {/* Response Messages */}
                    {response && (
                        <div style={{
                            marginBottom: '30px',
                            padding: '20px 25px',
                            borderRadius: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            backgroundColor: response.type === 'success' ? '#E0F2FE' : '#FEF2F2',
                            border: `2px solid ${response.type === 'success' ? '#49A3C4' : '#EF4444'}`,
                            color: '#00364A'
                        }}>
                            <div style={{
                                color: response.type === 'success' ? '#49A3C4' : '#EF4444'
                            }}>
                                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <span style={{ fontWeight: '500', flex: 1 }}>{response.message}</span>
                            <button 
                                onClick={() => setResponse(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#00364A',
                                    opacity: 0.5
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    {/* Task List */}
                    {sortedTasks.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px',
                            backgroundColor: '#F8FBFF',
                            borderRadius: '20px',
                            border: '2px dashed rgba(0, 54, 74, 0.1)'
                        }}>
                            <ListChecks size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No Tasks Found</h3>
                            <p style={{ color: '#00364A', opacity: 0.6 }}>When tasks are created, they will appear here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {sortedTasks.map((task) => (
                                <div key={task.id} style={{
                                    backgroundColor: 'white',
                                    border: '2px solid rgba(0, 54, 74, 0.08)',
                                    borderRadius: '20px',
                                    boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s'
                                }}>
                                    {editingTask === task.id ? (
                                        /* Edit Mode */
                                        <div style={{ padding: '30px', backgroundColor: '#F8FBFF' }}>
                                            <h3 style={{
                                                fontSize: '18px',
                                                fontWeight: '700',
                                                color: '#00364A',
                                                marginBottom: '20px'
                                            }}>
                                                Editing: <span style={{ color: '#49A3C4' }}>{task.task_name}</span>
                                            </h3>
                                            
                                            <div style={{ display: 'grid', gap: '20px' }}>
                                                <StyledInput
                                                    label="Task Name"
                                                    icon={<Type size={16} />}
                                                    value={editTaskName}
                                                    onChange={(e) => setEditTaskName(e.target.value)}
                                                />
                                                
                                                <StyledInput
                                                    label="Max Items"
                                                    icon={<Maximize size={16} />}
                                                    type="number"
                                                    value={editMaxItems}
                                                    onChange={(e) => setEditMaxItems(e.target.value)}
                                                />

                                                <StyledInput
                                                    label="Scheduled Time *"
                                                    icon={<Calendar size={16} />}
                                                    type="datetime-local"
                                                    value={editScheduledTime}
                                                    onChange={(e) => setEditScheduledTime(e.target.value)}
                                                />

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <RotateCw size={16} color="#49A3C4" /> Repeat
                                                    </label>
                                                    <StyledSelect
                                                        value={editRepeat}
                                                        onChange={(e) => setEditRepeat(e.target.value)}
                                                    >
                                                        <option value="once">Once</option>
                                                        <option value="daily">Daily</option>
                                                        <option value="weekly">Weekly</option>
                                                        <option value="monthly">Monthly</option>
                                                        <option value="yearly">Yearly</option>
                                                    </StyledSelect>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px' }}>
                                                    <StyledButton 
                                                        onClick={handleCancelEdit} 
                                                        variant="secondary"
                                                        icon={<X size={18} />}
                                                    >
                                                        Cancel
                                                    </StyledButton>
                                                    <StyledButton 
                                                        onClick={() => handleUpdateTask(task.id)} 
                                                        variant="primary"
                                                        disabled={loading}
                                                        icon={loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                                                    >
                                                        Update
                                                    </StyledButton>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <div style={{ padding: '30px' }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: '20px',
                                                flexWrap: 'wrap'
                                            }}>
                                                {/* Left Side: Task Info */}
                                                <div style={{ 
                                                    flex: '1 1 300px', 
                                                    minWidth: '0' /* Crucial for text truncation in flex/grid */
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
                                                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                                                        gap: '15px' 
                                                    }}>
                                                        <InfoItem icon={<Database size={14} />} label="Source">{task.source_name}</InfoItem>
                                                        <InfoItem icon={<Map size={14} />} label="Mapping">{task.mapping_name}</InfoItem>
                                                        <InfoItem icon={<List size={14} />} label="Entity">{task.entity_name}</InfoItem>
                                                        <InfoItem icon={<Calendar size={14} />} label="Scheduled">{formatDateTime(task.scheduled_time)}</InfoItem>
                                                        <InfoItem icon={<RotateCw size={14} />} label="Repeat">{task.repeat || 'once'}</InfoItem>
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
                                                    flexShrink: 0, /* Prevents actions from being pushed or wrapping strangely */
                                                    marginLeft: 'auto'
                                                }}>
                                                    {getStatusBadge(task.scheduled_time)}
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <IconButton 
                                                            onClick={() => handleEditClick(task)} 
                                                            icon={<Edit3 size={16} />} 
                                                            color="#49A3C4"
                                                            disabled={loading}
                                                            title="Edit Task"
                                                        />
                                                        <IconButton 
                                                            onClick={() => handleDeleteTask(task.id, task.task_name)} 
                                                            icon={<Trash2 size={16} />} 
                                                            color="#EF4444"
                                                            disabled={loading}
                                                            title="Delete Task"
                                                        />
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
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
    },
    secondary: {
      bg: 'white', color: '#00364A', border: '2px solid rgba(0, 54, 74, 0.2)',
      hoverBg: '#F3F4F6', hoverColor: '#00364A'
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

const StyledInput = ({ label, icon, value, onChange, placeholder, type = "text" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {label && (
      <label style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#00364A',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {icon && React.cloneElement(icon, { color: '#49A3C4' })}
        {label}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        padding: '14px 20px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: 'rgba(73, 163, 196, 0.15)',
        color: '#00364A',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.3s',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onFocus={(e) => {
        e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.25)';
        e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.2)';
      }}
      onBlur={(e) => {
        e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.15)';
        e.target.style.boxShadow = 'none';
      }}
    />
  </div>
);

const StyledSelect = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      padding: '14px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: 'rgba(73, 163, 196, 0.15)',
      color: '#00364A',
      fontSize: '15px',
      outline: 'none',
      width: '100%',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300364A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 20px top 50%',
      backgroundSize: '12px auto'
    }}
  >
    {children}
  </select>
);

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
      minWidth: 0 /* Allows flex child to shrink below content size if needed */
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
        minWidth: '40px', // FIX: Prevents button from being squashed
        height: '40px',
        borderRadius: '10px',
        border: `1px solid ${disabled ? '#eee' : 'rgba(0,54,74,0.1)'}`,
        backgroundColor: getBgColor(),
        color: effectiveColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0, // FIX: Prevents flexbox from shrinking the button
        padding: 0
      }}
    >
      {/* 
         Icons automatically inherit the text color of the button.
         No need for cloneElement if the parent button has the correct 'color' style.
      */}
      {icon}
    </button>
  );
};

export default TasksManagement;