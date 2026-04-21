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
    Maximize,
    ArrowLeft,
    Plus,
    Menu,
    ChevronDown as ChevronDownIcon,
    ChevronRight as ChevronRightIcon,
    LayoutGrid,
    ClipboardPlus,
    CalendarCheck,
    Settings
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

const TasksManagement = () => {
    const [editingTask, setEditingTask] = useState(null);
    const [editScheduledTime, setEditScheduledTime] = useState('');
    const [editTaskName, setEditTaskName] = useState('');
    const [editRepeat, setEditRepeat] = useState('');
    const [editMaxItems, setEditMaxItems] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [openMenu, setOpenMenu] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const toggleMenu = (menu) => {
        setOpenMenu(openMenu === menu ? null : menu);
    };

    const menuContent = {
        entity: {
            label: "Entities",
            icon: <LayoutGrid size={20} />,
            items: [
                { label: "Entity List", path: "/entitylist" },
                { label: "Create Entity", path: "/entityform" },
                { label: "Entity Data Table", path: "/entity-data" },
            ],
        },
        manager: {
            label: "Sources",
            icon: <Settings size={20} />,
            items: [
                { label: "Source Manager", path: "/sourcemanagement" },
                { label: "Add Source", path: "/addsource" },
            ],
        },
        mapping: {
            label: "Mappings",
            icon: <ClipboardPlus size={20} />,
            items: [
                { label: "Entity Mapping List", path: "/mappingmanager" },
                { label: "Create Entity Mapping", path: "/entitymappingform" },
            ],
        },
        task: {
            label: "Tasks",
            icon: <CalendarCheck size={20} />,
            items: [
                { label: "Schedule a Task", path: "/taskscheduler" },
                { label: "Task List", path: "/tasksmanagement" },
                { label: "Task Executor", path: "/taskexecutor" },
            ],
        },
    };

    const sidebarStyles = {
            container: {
            minHeight: "100vh",
            display: "flex",
            backgroundColor: "#C7D8ED", // background
            color: "#00364A",
            fontFamily: "'Inter', sans-serif",
        },

        sidebar: {
            position: "fixed",
            top: 0,
            left: 0,
            height: "100%",
            backgroundColor: "#00364A", // primary
            color: "#FFFFFF",
            boxShadow: "0 0 20px rgba(0, 54, 74, 0.15)", // shadowLight
            zIndex: 40,
            transition: "all 0.3s ease-in-out",
            width: sidebarOpen ? "280px" : "80px",
            overflow: "hidden",
        },

        sidebarInner: {
            padding: "24px 16px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
        },

        sidebarHeader: {
            fontSize: "36px",
            fontWeight: "900",
            textAlign: "center",
            marginBottom: "40px",
            opacity: sidebarOpen ? 1 : 0,
            transition: "opacity 0.3s ease",
            letterSpacing: "4px",
            fontFamily: "'Montserrat', 'Arial Black', sans-serif",
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #ffffff 0%, #49A3C4 100%)", // accent
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            cursor: "pointer",
        },

        menuButton: (isActive) => ({
            width: "100%",
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backgroundColor: isActive
            ? "rgba(73, 163, 196, 0.25)" // accent active
            : "transparent",
            color: "#FFFFFF",
            marginBottom: "8px",
            justifyContent: sidebarOpen ? "flex-start" : "center",
        }),

        menuButtonHover: {
            backgroundColor: "rgba(73, 163, 196, 0.15)", // accent hover
        },

        menuLabel: {
            marginLeft: "16px",
            flex: 1,
            textAlign: "left",
            display: sidebarOpen ? "block" : "none",
        },

        submenuContainer: (isOpen) => ({
            maxHeight: isOpen ? "500px" : "0",
            overflow: "hidden",
            transition: "max-height 0.3s ease",
            marginLeft: sidebarOpen ? "20px" : "0",
            marginTop: "4px",
        }),

        submenuItem: {
            width: "100%",
            padding: "12px 16px",
            backgroundColor: "transparent",
            border: "none",
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: "500",
            textAlign: "left",
            cursor: "pointer",
            borderRadius: "8px",
            transition: "all 0.2s ease",
            marginBottom: "4px",
            display: sidebarOpen ? "block" : "none",
        },

        mainContent: {
            flex: 1,
            transition: "all 0.3s ease-in-out",
            marginLeft: sidebarOpen ? "280px" : "80px",
            minHeight: "100vh",
            backgroundColor: "#C7D8ED", // background
            display: "flex",
            flexDirection: "column",
        },

        header: {
            width: "100%",
            background: "#00364A", // primary
            color: "#FFFFFF",
            padding: "20px 32px",
            boxShadow: "0 4px 12px rgba(0, 54, 74, 0.15)", // shadowLight
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
        },

        headerLeft: {
            display: "flex",
            alignItems: "center",
            gap: "16px",
        },

        menuToggle: {
            padding: "10px",
            backgroundColor: "rgba(73, 163, 196, 0.2)", // accent
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            transition: "all 0.2s ease",
        },

        headerTitle: {
            fontSize: "28px",
            fontWeight: "700",
            color: "#FFFFFF",
            letterSpacing: "0.5px",
        },

        main: {
            padding: "40px",
            flex: 1,
            width: "100%",
        },
    };

    const addNotification = (type, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    // Converts a datetime-local input value to ISO with local offset,
    // so the backend receives the user's intended wall-clock time.
    const localDateTimeToISO = (datetimeLocalStr) => {
        if (!datetimeLocalStr) return null;
        const d = new Date(datetimeLocalStr);
        const tzOffsetMin = -d.getTimezoneOffset();
        const sign = tzOffsetMin >= 0 ? '+' : '-';
        const absMin = Math.abs(tzOffsetMin);
        const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
        const mm = String(absMin % 60).padStart(2, '0');
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
            `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
    };

    // The backend stores TIMESTAMP (no timezone). Python serialises it without
    // a 'Z', so browsers would treat it as LOCAL time instead of UTC. Append
    // 'Z' if there is no offset in the string to force UTC interpretation.
    const ensureUTC = (dateStr) => {
        if (!dateStr) return dateStr;
        return /[Z+\-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z';
    };

    // Fetch tasks
    const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/task/tasks`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            return data.tasks || [];
        },
    });

    // Only show loading on initial load, not on background refetches
    const pageLoading = isLoadingTasks && !tasksData;

    const tasks = tasksData || [];

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
        // notifications clear automatically — no action needed
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
            addNotification('error', 'Please provide a scheduled time.');
            return;
        }
        setLoading(true);
        try {
            const requestData = {
                scheduled_time: localDateTimeToISO(editScheduledTime),
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
                addNotification('success', data.message);
                setEditingTask(null);

                // Update cache directly
                queryClient.setQueryData(['tasks'], (oldTasks) => {
                    if (!oldTasks) return oldTasks;
                    return oldTasks.map(task =>
                        task.id === taskId ? { ...task, ...requestData } : task
                    );
                });

                // Mark as stale but don't refetch immediately
                queryClient.invalidateQueries({ queryKey: ['tasks'] }, { refetchType: 'none' });
            } else {
                addNotification('error', data.detail || 'Failed to update task.');
            }
        } catch (error) {
            addNotification('error', 'A network error occurred.');
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
                addNotification('success', data.message);

                // Update cache directly - remove deleted task
                queryClient.setQueryData(['tasks'], (oldTasks) => {
                    if (!oldTasks) return oldTasks;
                    return oldTasks.filter(task => task.id !== taskId);
                });

                // Mark as stale but don't refetch immediately
                queryClient.invalidateQueries({ queryKey: ['tasks'] }, { refetchType: 'none' });
            } else {
                addNotification('error', data.detail || 'Failed to delete task.');
            }
        } catch (error) {
            addNotification('error', 'A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString) => {
        return new Date(ensureUTC(dateString)).toLocaleString([], {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusBadge = (scheduledTime) => {
        const isUpcoming = new Date(ensureUTC(scheduledTime)) > new Date();
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

    const sortedTasks = [...tasks].sort((a, b) => new Date(ensureUTC(a.scheduled_time)) - new Date(ensureUTC(b.scheduled_time)));
    const upcomingCount = tasks.filter(task => new Date(ensureUTC(task.scheduled_time)) > new Date()).length;

    if (pageLoading) {
        return (
            <div style={sidebarStyles.container}>
                <aside style={sidebarStyles.sidebar}>
                    <div style={sidebarStyles.sidebarInner}>
                        <h2 
                            style={sidebarStyles.sidebarHeader}
                            onClick={() => navigate('/dashboard')}
                            title="Go to Dashboard"
                        >
                            SCOUT
                        </h2>
                        
                        {Object.entries(menuContent).map(([key, { label, icon }]) => (
                            <div key={key}>
                                <button
                                    onClick={() => toggleMenu(key)}
                                    style={sidebarStyles.menuButton(openMenu === key)}
                                >
                                    {icon}
                                    {sidebarOpen && <span style={sidebarStyles.menuLabel}>{label}</span>}
                                    {sidebarOpen &&
                                        (openMenu === key ? (
                                            <ChevronDownIcon size={20} />
                                        ) : (
                                            <ChevronRightIcon size={20} />
                                        ))}
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>
                <div style={sidebarStyles.mainContent}>
                    <header style={sidebarStyles.header}>
                        <div style={sidebarStyles.headerLeft}>
                            <button
                                onClick={() => {
                                    setSidebarOpen(!sidebarOpen);
                                    if (sidebarOpen) {
                                        setOpenMenu(null);
                                    }
                                }}
                                style={sidebarStyles.menuToggle}
                            >
                                <Menu size={24} />
                            </button>
                            <h1 style={sidebarStyles.headerTitle}>Tasks Management</h1>
                        </div>
                    </header>
                    <main style={sidebarStyles.main}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '20px',
                            height: '50vh'
                        }}>
                            <Loader2 size={48} className="spin" style={{ color: '#00364A' }} />
                            <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Task Data...</h1>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div style={sidebarStyles.container}>
            {/* Sidebar */}
            <aside style={sidebarStyles.sidebar}>
                <div style={sidebarStyles.sidebarInner}>
                    <h2 style={sidebarStyles.sidebarHeader}>SCOUT</h2>

                    {Object.entries(menuContent).map(([key, { label, icon }]) => (
                        <div key={key}>
                            <button
                                onClick={() => toggleMenu(key)}
                                style={sidebarStyles.menuButton(openMenu === key)}
                                onMouseEnter={(e) => {
                                    if (openMenu !== key) {
                                        e.currentTarget.style.backgroundColor =
                                            sidebarStyles.menuButtonHover.backgroundColor;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (openMenu !== key) {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                }}
                            >
                                {icon}
                                {sidebarOpen && <span style={sidebarStyles.menuLabel}>{label}</span>}
                                {sidebarOpen &&
                                    (openMenu === key ? (
                                        <ChevronDownIcon size={20} />
                                    ) : (
                                        <ChevronRightIcon size={20} />
                                    ))}
                            </button>

                            <div style={sidebarStyles.submenuContainer(openMenu === key)}>
                                {menuContent[key].items.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(item.path)}
                                        style={sidebarStyles.submenuItem}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "rgba(255, 255, 255, 0.1)";
                                            e.currentTarget.style.paddingLeft = "20px";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                            e.currentTarget.style.paddingLeft = "16px";
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <div style={sidebarStyles.mainContent}>
                {/* Header */}
                <header style={sidebarStyles.header}>
                    <div style={sidebarStyles.headerLeft}>
                        <button
                            onClick={() => {
                                setSidebarOpen(!sidebarOpen);
                                if (sidebarOpen) {
                                    setOpenMenu(null);
                                }
                            }}
                            style={sidebarStyles.menuToggle}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    "rgba(255, 255, 255, 0.25)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                    "rgba(255, 255, 255, 0.15)";
                            }}
                        >
                            <Menu size={24} />
                        </button>
                        <h1 style={sidebarStyles.headerTitle}>Tasks Management</h1>
                    </div>
                </header>

                {/* Floating Notification Panel */}
                <NotificationPanel notifications={notifications} onRemove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />

                {/* Content Area */}
                <main style={sidebarStyles.main}>
                    <div style={{
                        width: '100%',
                        backgroundColor: 'white',
                        borderRadius: '25px',
                        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '40px 50px' }}>
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

                            {/* Action Buttons */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                gap: '15px', 
                                marginBottom: '30px' 
                            }}>
                                <StyledButton
                                    onClick={() => navigate('/taskscheduler')}
                                    variant="primary"
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
                                                            flexShrink: 0,
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
                </main>
            </div>
            <style>{`
                @keyframes spin { 
                    0% { transform: rotate(0deg); } 
                    100% { transform: rotate(360deg); } 
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes slideIn { 
                    from { transform: translateX(100%); opacity: 0; } 
                    to { transform: translateX(0); opacity: 1; } 
                }
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
            hoverBg: '#004e6b', hoverColor: 'white'
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

    const effectiveColor = disabled ? '#cccccc' : color;

    const getBgColor = () => {
        if (disabled) return '#f5f5f5';
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
                color: effectiveColor,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0,
                padding: 0
            }}
        >
            {icon}
        </button>
    );
};

// Floating toast notification panel
const NotificationPanel = ({ notifications, onRemove }) => {
    if (!notifications.length) return null;
    return (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            {notifications.map(notif => (
                <div key={notif.id} style={{
                    backgroundColor: notif.type === 'success' ? '#10B981' : '#EF4444',
                    color: 'white', padding: '16px 20px', borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    animation: 'slideIn 0.3s ease', border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        {notif.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>{notif.message}</div>
                    <button onClick={() => onRemove(notif.id)} style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'white', 
                        cursor: 'pointer', 
                        opacity: 0.8, 
                        padding: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        borderRadius: '4px', 
                        flexShrink: 0 
                    }}
                        onMouseEnter={e => e.target.style.opacity = '1'} 
                        onMouseLeave={e => e.target.style.opacity = '0.8'}>
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default TasksManagement;