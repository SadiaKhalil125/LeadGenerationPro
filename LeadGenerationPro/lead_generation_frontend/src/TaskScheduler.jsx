import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Database,
    Map,
    X,
    List,
    CheckCircle,
    AlertCircle,
    Type,
    RefreshCw,
    Loader2,
    Search,
    Maximize,
    RotateCw,
    Edit3,
    Check,
    ArrowLeft,
    Globe,
    Monitor,
    Settings,
    Play
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import API_BASE from "./api_base";

const TaskScheduler = () => {
    // --- State for Task Type ---
    const [sourceType, setSourceType] = useState('scraper');

    // --- State for Scraper Tasks ---
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [mappings, setMappings] = useState([]);
    const [selectedMappingId, setSelectedMappingId] = useState('');
    const [mappingSearch, setMappingSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // --- State for API Tasks ---
    const [selectedApiSourceId, setSelectedApiSourceId] = useState('');
    const [apiParams, setApiParams] = useState({});
    const [newApiParam, setNewApiParam] = useState({ key: '', value: '' });

    // --- Common State ---
    const [scheduledTime, setScheduledTime] = useState('');
    const [taskName, setTaskName] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState('create');
    const [repeat, setRepeat] = useState('once');
    const [maxItems, setMaxItems] = useState(30);
    const [runNow, setRunNow] = useState(false);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Adds '+00:00' suffix if the string has no timezone designator — ensures
    // the browser treats a UTC timestamp from the backend as UTC, not local time.
    const addNotification = (type, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    // Converts a datetime-local input value (e.g. "2026-03-01T09:02") to an
    // ISO-8601 string with the user's LOCAL timezone offset, so the backend
    // receives the correct wall-clock time regardless of the server's timezone.
    const localDateTimeToISO = (datetimeLocalStr) => {
        if (!datetimeLocalStr) return null;
        const d = new Date(datetimeLocalStr);
        const tzOffsetMin = -d.getTimezoneOffset(); // e.g. +300 for UTC+5
        const sign = tzOffsetMin >= 0 ? '+' : '-';
        const absMin = Math.abs(tzOffsetMin);
        const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
        const mm = String(absMin % 60).padStart(2, '0');
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
            `T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${hh}:${mm}`;
    };

    // 1. Fetch Scraper Sources
    const { data: sourcesData } = useQuery({
        queryKey: ['sources'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/source/sources`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) throw new Error('Failed to load sources');
            const data = await res.json();
            return data.sources || [];
        },
    });

    // 2. Fetch API Sources
    const { data: apiSourcesData } = useQuery({
        queryKey: ['api-sources'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api-sources/`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) return []; // Return empty array on 500 error instead of crashing
            const payload = await res.json();
            return Array.isArray(payload) ? payload : (payload.sources || []);
        },
    });

    // 3. Fetch Scraper Mappings
    const { data: allMappingsData } = useQuery({
        queryKey: ['mappings'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/mapping/mappings`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) throw new Error('Failed to load mappings');
            const data = await res.json();
            return (data.mappings || []).filter(m => m.enabled);
        },
    });

    // 4. Fetch All Tasks
    const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/task/tasks`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) throw new Error('Failed to load tasks');
            const data = await res.json();
            return data.tasks || [];
        },
    });

    const pageLoading = isLoadingTasks && !tasksData;

    const sources = sourcesData || [];
    const apiSources = apiSourcesData || [];
    const allMappings = allMappingsData || [];
    const tasks = tasksData || [];

    // --- API Parameter Logic ---
    const addApiParam = () => {
        if (!newApiParam.key) return;
        setApiParams(prev => ({ ...prev, [newApiParam.key]: newApiParam.value }));
        setNewApiParam({ key: '', value: '' });
    };

    const removeApiParam = (key) => {
        const updated = { ...apiParams };
        delete updated[key];
        setApiParams(updated);
    };

    // --- Scraper Logic ---
    const handleSourceChange = (sourceId) => {
        setSelectedSourceId(sourceId);
        setSelectedMappingId('');
        setMappingSearch('');
        const filtered = allMappings.filter(m => m.source_id === parseInt(sourceId));
        setMappings(filtered);
    };

    const handleMappingSelect = (mapping) => {
        setMappingSearch(mapping.mapping_name);
        setSelectedSourceId(mapping.source_id);
        const filtered = allMappings.filter(m => m.source_id === mapping.source_id);
        setMappings(filtered);
        setSelectedMappingId(mapping.id);
        setIsSearchFocused(false);
    };

    const filteredMappings = useMemo(() => {
        if (!selectedSourceId) return [];
        const sourceMappings = allMappings.filter(m => m.source_id === parseInt(selectedSourceId));
        if (!mappingSearch) return sourceMappings;
        return sourceMappings.filter(m =>
            m.mapping_name.toLowerCase().includes(mappingSearch.toLowerCase())
        );
    }, [mappingSearch, allMappings, selectedSourceId]);

    const handleCreateTask = async (e) => {
        e.preventDefault();

        // ── Field-level validation BEFORE setLoading (clean sync check) ───
        if (sourceType === 'web') {
            if (!selectedSourceId) {
                addNotification('error', 'Please select a Web Source before creating a task.');
                return;
            }
            if (!selectedMappingId) {
                addNotification('error', 'Please select a Mapping for the chosen source.');
                return;
            }
        } else if (sourceType === 'api') {
            if (!selectedApiSourceId) {
                addNotification('error', 'Please select an API Source before creating a task.');
                return;
            }
        }
        if (!runNow && !scheduledTime) {
            addNotification('error', 'Please select a scheduled time or choose "Run Now".');
            return;
        }
        if (!runNow && new Date(scheduledTime) < new Date()) {
            addNotification('error', 'Scheduled time is in the past. Please pick a future time.');
            return;
        }

        setLoading(true);
        try {

            // Calculate scheduled time (already validated above)
            let finalScheduledTime;
            if (runNow) {
                const now = new Date();
                now.setMinutes(now.getMinutes() + 1);
                now.setSeconds(0);
                now.setMilliseconds(0);
                finalScheduledTime = now.toISOString();
            } else {
                finalScheduledTime = localDateTimeToISO(scheduledTime);
            }

            let requestData = {
                scheduled_time: finalScheduledTime,
                repeat: repeat,
                task_name: taskName || undefined,
                max_items: maxItems ? parseInt(maxItems) : 30
            };

            if (sourceType === 'api') {
                requestData.source_type = 'api';
                requestData.api_source_id = parseInt(selectedApiSourceId);
                requestData.api_request_config = { params: apiParams };
            } else {
                requestData.source_type = 'web';
                requestData.source_id = parseInt(selectedSourceId);
                requestData.mapping_id = parseInt(selectedMappingId);
            }

            const res = await fetch(`${API_BASE}/task/create-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
                body: JSON.stringify(requestData),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                addNotification('success', runNow ? 'Task is going to run next minute!' : data.message);
                queryClient.invalidateQueries({ queryKey: ['tasks'] });

                // Reset form
                setTaskName('');
                setScheduledTime('');
                setRunNow(false);
                setMaxItems(30);
            } else {
                // FastAPI returns { detail: "..." } for HTTPException, { message: "..." } for others
                const errMsg = data.detail || data.message || 'Failed to create task.';
                addNotification('error', errMsg);
            }
        } catch (error) {
            addNotification('error', 'A network error occurred. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId, tName) => {
        if (!confirm(`Delete task "${tName}"?`)) return;
        try {
            await fetch(`${API_BASE}/task/delete-task/${taskId}`, { method: 'DELETE', headers: { "ngrok-skip-browser-warning": "true" } });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        } catch (err) { console.error(err); }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString([], {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // --- Loading View ---
    if (pageLoading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#C7D8ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
                <Loader2 size={40} className="spin" style={{ color: '#49A3C4' }} />
                <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Scheduler...</h1>
                <style>{`.spin { animation: rotate 1s linear infinite; } @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#C7D8ED', color: '#00364A', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            {/* Floating Notification Panel */}
            <NotificationPanel notifications={notifications} onRemove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
            <div style={{ width: '100%', maxWidth: '1200px', backgroundColor: 'white', borderRadius: '25px', boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '40px 50px', borderBottom: '1px solid rgba(0, 54, 74, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '56px', height: '56px', backgroundColor: '#49A3C4', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Clock size={28} /></div>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>Task Scheduler</h1>
                            <p style={{ fontSize: '16px', opacity: 0.7 }}>Schedule automated scraping or API pulls</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <StyledButton onClick={() => navigate('/dashboard')} variant="outline" icon={<ArrowLeft size={18} />}>Dashboard</StyledButton>
                        <StyledButton onClick={() => navigate('/tasksmanagement')} variant="outline" icon={<List size={18} />}>View Tasks</StyledButton>
                    </div>
                </div>

                <div style={{ padding: '50px' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '12px', marginBottom: '40px' }}>
                        <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')} icon={<Plus size={16} />}>Create Task</TabButton>
                    </div>

                    {/* Response Messages - REMOVED: now using NotificationPanel */}


                    {activeTab === 'create' && (
                        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                            {/* Type Toggle */}
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div onClick={() => setSourceType('scraper')} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${sourceType === 'scraper' ? '#49A3C4' : 'rgba(0,54,74,0.1)'}`, backgroundColor: sourceType === 'scraper' ? '#E0F2FE' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Monitor size={20} color={sourceType === 'scraper' ? '#00364A' : '#6B7280'} />
                                    <div><b>Web Scraper</b><div style={{ fontSize: '12px' }}>Use existing mappings</div></div>
                                </div>
                                <div onClick={() => setSourceType('api')} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${sourceType === 'api' ? '#49A3C4' : 'rgba(0,54,74,0.1)'}`, backgroundColor: sourceType === 'api' ? '#E0F2FE' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Globe size={20} color={sourceType === 'api' ? '#00364A' : '#6B7280'} />
                                    <div><b>API Source</b><div style={{ fontSize: '12px' }}>Direct API integration</div></div>
                                </div>
                            </div>

                            {/* Task Name First */}
                            <StyledInput label="Task Name" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="Optional - Auto-generated if empty" icon={<Type size={16} />} />

                            {sourceType === 'scraper' ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <StyledSelect label="Source" value={selectedSourceId} onChange={(e) => handleSourceChange(e.target.value)} icon={<Database size={16} />}>
                                            <option value="">Choose source...</option>
                                            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </StyledSelect>

                                        {/* Combined Search + Select Mapping */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, position: 'relative' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Map size={16} /> Mapping
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    value={mappingSearch}
                                                    onChange={(e) => {
                                                        setMappingSearch(e.target.value);
                                                        setSelectedMappingId('');
                                                    }}
                                                    onFocus={() => setIsSearchFocused(true)}
                                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                                    placeholder="Type to search or select..."
                                                    disabled={!selectedSourceId}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        backgroundColor: selectedSourceId ? '#f0f4f8' : '#e5e7eb',
                                                        color: '#00364A',
                                                        outline: 'none',
                                                        width: '100%',
                                                        cursor: selectedSourceId ? 'text' : 'not-allowed'
                                                    }}
                                                />
                                                {isSearchFocused && selectedSourceId && filteredMappings.length > 0 && (
                                                    <ul style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        backgroundColor: 'white',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '12px',
                                                        zIndex: 50,
                                                        padding: '8px',
                                                        listStyle: 'none',
                                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                                                        maxHeight: '200px',
                                                        overflowY: 'auto',
                                                        margin: '4px 0 0 0'
                                                    }}>
                                                        {filteredMappings.map(m => (
                                                            <li
                                                                key={m.id}
                                                                onMouseDown={() => handleMappingSelect(m)}
                                                                style={{
                                                                    padding: '10px',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '8px',
                                                                    transition: 'background 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#E0F2FE'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                            >
                                                                {m.mapping_name}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <StyledSelect label="API Source" value={selectedApiSourceId} onChange={(e) => setSelectedApiSourceId(e.target.value)} icon={<Globe size={16} />}>
                                        <option value="">Choose API...</option>
                                        {apiSources.map(api => <option key={api.id} value={api.id}>{api.name}</option>)}
                                    </StyledSelect>

                                    {selectedApiSourceId && (
                                        <div style={{ padding: '20px', backgroundColor: '#F8FBFE', borderRadius: '15px', border: '1px dashed #49A3C4' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                                <Settings size={16} color="#49A3C4" /> Add Params (e.g. q for GitHub)
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '15px' }}>
                                                <StyledInput placeholder="Key" value={newApiParam.key} onChange={e => setNewApiParam({ ...newApiParam, key: e.target.value })} />
                                                <StyledInput placeholder="Value" value={newApiParam.value} onChange={e => setNewApiParam({ ...newApiParam, value: e.target.value })} />
                                                <button type="button" onClick={addApiParam} style={{ backgroundColor: '#49A3C4', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', cursor: 'pointer' }}><Plus /></button>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {Object.entries(apiParams).map(([k, v]) => (
                                                    <div key={k} style={{ background: 'white', border: '1px solid #ddd', padding: '5px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <b>{k}:</b> {v} <X size={14} style={{ cursor: 'pointer', color: 'red' }} onClick={() => removeApiParam(k)} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <StyledInput label="Max Items" type="number" value={maxItems} onChange={e => setMaxItems(e.target.value)} icon={<Maximize size={16} />} />

                            {/* Run Now Toggle */}
                            <div style={{
                                padding: '15px 20px',
                                backgroundColor: runNow ? '#E0F2FE' : '#F3F4F6',
                                borderRadius: '12px',
                                border: `2px solid ${runNow ? '#49A3C4' : 'rgba(0,54,74,0.1)'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                transition: 'all 0.3s'
                            }}
                                onClick={() => setRunNow(!runNow)}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    border: `2px solid ${runNow ? '#49A3C4' : '#6B7280'}`,
                                    backgroundColor: runNow ? '#49A3C4' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s',
                                    marginTop: '2px',
                                    flexShrink: 0
                                }}>
                                    {runNow && <Check size={14} color="white" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Play size={16} color={runNow ? '#49A3C4' : '#6B7280'} />
                                        Run Now
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                        Task will be scheduled to run in the next minute
                                    </div>
                                </div>
                            </div>

                            {!runNow && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <StyledInput label="Start Time" type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} icon={<Calendar size={16} />} required={!runNow} />
                                    <StyledSelect label="Repeat" value={repeat} onChange={e => setRepeat(e.target.value)} icon={<RotateCw size={16} />}>
                                        <option value="once">Once</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                    </StyledSelect>
                                </div>
                            )}

                            <StyledButton variant="primary" disabled={loading} icon={loading ? <Loader2 className="spin" /> : (runNow ? <Play /> : <Plus />)}>
                                {loading ? 'Creating...' : (runNow ? 'Run Now' : 'Schedule Task')}
                            </StyledButton>
                        </form>
                    )}
                </div>
            </div>
            <style>{`
                .spin { animation: rotate 1s linear infinite; } 
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// --- Sub-components ---
const StyledButton = ({ onClick, variant, icon, children, disabled, style }) => {
    const isPrimary = variant === 'primary';
    return (
        <button
            type={onClick ? 'button' : 'submit'}
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                backgroundColor: isPrimary ? '#00364A' : 'white',
                color: isPrimary ? 'white' : '#00364A',
                border: '2px solid #00364A',
                opacity: disabled ? 0.6 : 1,
                ...style
            }}
        >
            {icon} {children}
        </button>
    );
};

const TabButton = ({ active, onClick, icon, children }) => (
    <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', backgroundColor: active ? 'white' : 'transparent', color: active ? '#49A3C4' : '#6B7280' }}>
        {icon} {children}
    </button>
);

const StyledInput = ({ label, value, onChange, placeholder, type = "text", icon, onFocus, onBlur, required }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {label && <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {label}</label>}
        <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f0f4f8', color: '#00364A', outline: 'none' }}
        />
    </div>
);

const StyledSelect = ({ label, value, onChange, children, disabled, icon }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {label && <label style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {label}</label>}
        <select value={value} onChange={onChange} disabled={disabled} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f0f4f8', color: '#00364A', outline: 'none', cursor: 'pointer' }}>
            {children}
        </select>
    </div>
);

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
                    <button onClick={() => onRemove(notif.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px', flexShrink: 0 }}
                        onMouseEnter={e => e.target.style.opacity = '1'} onMouseLeave={e => e.target.style.opacity = '0.8'}>
                        <X size={16} />
                    </button>
                </div>
            ))}
            <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
    );
};

export default TaskScheduler;