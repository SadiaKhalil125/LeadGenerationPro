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
    Globe,    // Added for API icon
    Monitor   // Added for Scraper icon
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import API_BASE from "./api_base";

const TaskScheduler = () => {
    // --- State for Task Type ---
    const [sourceType, setSourceType] = useState('scraper'); // 'scraper' or 'api'

    // --- State for Scraper Tasks ---
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [mappings, setMappings] = useState([]);
    const [selectedMappingId, setSelectedMappingId] = useState('');
    const [mappingSearch, setMappingSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // --- State for API Tasks ---
    const [selectedApiSourceId, setSelectedApiSourceId] = useState('');

    // --- Common State ---
    const [scheduledTime, setScheduledTime] = useState('');
    const [taskName, setTaskName] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [activeTab, setActiveTab] = useState('create');
    const [repeat, setRepeat] = useState('once');
    const [maxItems, setMaxItems] = useState(30);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 1. Fetch Scraper Sources
    const { data: sourcesData } = useQuery({
        queryKey: ['sources'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/source/sources`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            if (!res.ok) throw new Error('Failed to load sources');
            const data = await res.json();
            return data.sources || [];
        },
    });

    // 2. Fetch API Sources (NEW)
    const { data: apiSourcesData } = useQuery({
        queryKey: ['api-sources'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api-sources/`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            if (!res.ok) throw new Error('Failed to load API sources');
            const payload = await res.json();
            if (Array.isArray(payload)) return payload;
            if (payload && Array.isArray(payload.sources)) return payload.sources;
            return [];
        },
    });

    // 3. Fetch Scraper Mappings
    const { data: allMappingsData } = useQuery({
        queryKey: ['mappings'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/mapping/mappings`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            if (!res.ok) throw new Error('Failed to load mappings');
            const data = await res.json();
            return (data.mappings || []).filter(m => m.enabled);
        },
    });

    // 4. Fetch All Tasks
    const { data: tasksData, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/task/tasks`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" }
            });
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

    // --- Helpers for Scraper Logic ---
    const getMappingsForSource = (sourceId) => {
        if (!sourceId) {
            setMappings([]);
            return;
        }
        const filtered = allMappings.filter(m => m.source_id === parseInt(sourceId));
        setMappings(filtered);
    };

    const handleSourceChange = (sourceId) => {
        setSelectedSourceId(sourceId);
        setSelectedMappingId('');
        setMappingSearch('');
        getMappingsForSource(sourceId);
    };

    const handleMappingSelect = (mapping) => {
        setMappingSearch(mapping.mapping_name);
        setSelectedSourceId(mapping.source_id);
        getMappingsForSource(mapping.source_id);
        setSelectedMappingId(mapping.id);
        setIsSearchFocused(false);
    };

    const filteredMappings = useMemo(() => {
        if (!mappingSearch) return [];
        return allMappings.filter(m =>
            m.mapping_name.toLowerCase().includes(mappingSearch.toLowerCase())
        );
    }, [mappingSearch, allMappings]);


    // --- Create Task Handler ---
    const handleCreateTask = async (e) => {
        e.preventDefault();

        // Validation based on type
        if (sourceType === 'scraper') {
            if (!selectedSourceId || !selectedMappingId || !scheduledTime) {
                setResponse({ type: 'error', message: 'Please complete Source, Mapping, and Time fields.' });
                return;
            }
        } else {
            // API Type
            if (!selectedApiSourceId || !scheduledTime) {
                setResponse({ type: 'error', message: 'Please select an API Source and Time.' });
                return;
            }
        }

        setLoading(true);
        try {
            // Construct payload based on type
            let requestData = {
                scheduled_time: new Date(scheduledTime).toISOString(),
                repeat: repeat,
                task_name: taskName || undefined,
                max_items: maxItems ? parseInt(maxItems) : 30
            };

            if (sourceType === 'api') {
                // API Task Payload
                requestData.source_type = 'api';
                requestData.api_source_id = parseInt(selectedApiSourceId);
            } else {
                // Scraper Task Payload (Default or explicit)
                requestData.source_type = 'web'; 
                requestData.source_id = parseInt(selectedSourceId);
                requestData.mapping_id = parseInt(selectedMappingId);
            }

            const res = await fetch(`${API_BASE}/task/create-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify(requestData),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setResponse({ type: 'success', message: data.message });
                // Reset form
                setSelectedSourceId('');
                setSelectedMappingId('');
                setSelectedApiSourceId('');
                setScheduledTime('');
                setTaskName('');
                setMappingSearch('');
                setMappings([]);

                // Update cache
                if (data.task) {
                    queryClient.setQueryData(['tasks'], (oldTasks) => {
                        if (!oldTasks) return [data.task];
                        return [...oldTasks, data.task];
                    });
                    queryClient.invalidateQueries({ queryKey: ['tasks'] }, { refetchType: 'none' });
                } else {
                    queryClient.invalidateQueries({ queryKey: ['tasks'] });
                }

                setActiveTab('manage');
            } else {
                setResponse({ type: 'error', message: data.detail || 'Failed to create task.' });
            }
        } catch (error) {
            console.error(error);
            setResponse({ type: 'error', message: 'A network error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async (taskId, taskName) => {
        if (!confirm(`Are you sure you want to delete task "${taskName}"?`)) return;

        try {
            const res = await fetch(`${API_BASE}/task/delete-task/${taskId}`, {
                method: 'DELETE',
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setResponse({ type: 'success', message: data.message });

                queryClient.setQueryData(['tasks'], (oldTasks) => {
                    if (!oldTasks) return oldTasks;
                    return oldTasks.filter(task => task.id !== taskId);
                });
                queryClient.invalidateQueries({ queryKey: ['tasks'] }, { refetchType: 'none' });
            } else {
                setResponse({ type: 'error', message: data.detail || 'Failed to delete task.' });
            }
        } catch (error) {
            setResponse({ type: 'error', message: 'A network error occurred.' });
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
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
                {isFuture ? 'SCHEDULED' : 'OVERDUE'}
            </div>
        );
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
                <Loader2 size={40} style={{ color: '#49A3C4', animation: 'spin 1s linear infinite' }} />
                <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Scheduler...</h1>
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
                            <Clock size={28} />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '32px',
                                fontWeight: '800',
                                color: '#00364A',
                                margin: 0,
                                lineHeight: '1.2'
                            }}>Task Scheduler</h1>
                            <p style={{
                                fontSize: '16px',
                                color: '#00364A',
                                opacity: 0.7,
                                margin: '5px 0 0 0'
                            }}>Schedule and manage your data integration tasks</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <StyledButton
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                            icon={<ArrowLeft size={18} />}
                        >
                            Dashboard
                        </StyledButton>
                        <StyledButton
                            onClick={() => navigate('/taskexecutor')}
                            variant="outline"
                            icon={<Clock size={18} />}
                        >
                            Tasks Executor
                        </StyledButton>
                        <StyledButton
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
                            variant="outline"
                            icon={<RefreshCw size={18} />}
                        >
                            Refresh Tasks
                        </StyledButton>
                    </div>
                </div>

                <div style={{ padding: '50px' }}>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#F3F4F6',
                        padding: '4px',
                        borderRadius: '12px',
                        marginBottom: '40px',
                        gap: '4px'
                    }}>
                        <TabButton
                            active={activeTab === 'create'}
                            onClick={() => setActiveTab('create')}
                            icon={<Plus size={16} />}
                        >
                            Create Task
                        </TabButton>
                        <TabButton
                            active={activeTab === 'manage'}
                            onClick={() => setActiveTab('manage')}
                            icon={<List size={16} />}
                        >
                            Manage Tasks ({tasks.length})
                        </TabButton>
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

                    {activeTab === 'create' && (
                        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            
                            {/* Source Type Toggle */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A' }}>Task Source Type</label>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div 
                                        onClick={() => setSourceType('scraper')}
                                        style={{
                                            flex: 1,
                                            padding: '15px',
                                            borderRadius: '12px',
                                            border: `2px solid ${sourceType === 'scraper' ? '#49A3C4' : 'rgba(0,54,74,0.1)'}`,
                                            backgroundColor: sourceType === 'scraper' ? '#E0F2FE' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Monitor size={20} color={sourceType === 'scraper' ? '#00364A' : '#6B7280'} />
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#00364A' }}>Web Scraper</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Extract data using scraping mapping</div>
                                        </div>
                                        {sourceType === 'scraper' && <CheckCircle size={18} color="#49A3C4" style={{ marginLeft: 'auto' }} />}
                                    </div>

                                    <div 
                                        onClick={() => setSourceType('api')}
                                        style={{
                                            flex: 1,
                                            padding: '15px',
                                            borderRadius: '12px',
                                            border: `2px solid ${sourceType === 'api' ? '#49A3C4' : 'rgba(0,54,74,0.1)'}`,
                                            backgroundColor: sourceType === 'api' ? '#E0F2FE' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Globe size={20} color={sourceType === 'api' ? '#00364A' : '#6B7280'} />
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#00364A' }}>API Source</div>
                                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Extract data from external APIs</div>
                                        </div>
                                        {sourceType === 'api' && <CheckCircle size={18} color="#49A3C4" style={{ marginLeft: 'auto' }} />}
                                    </div>
                                </div>
                            </div>

                            <div style={{ height: '1px', backgroundColor: 'rgba(0,54,74,0.1)', margin: '5px 0' }} />

                            {/* Conditional Inputs based on Source Type */}
                            {sourceType === 'scraper' ? (
                                <>
                                    {/* Search Bar for Scraper Mappings */}
                                    <div style={{ position: 'relative' }}>
                                        <StyledInput
                                            label="Find Mapping (Web Scraper)"
                                            icon={<Search size={16} />}
                                            value={mappingSearch}
                                            onChange={(e) => setMappingSearch(e.target.value)}
                                            onFocus={() => setIsSearchFocused(true)}
                                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                            placeholder="Search all mappings by name..."
                                        />
                                        {isSearchFocused && filteredMappings.length > 0 && (
                                            <ul style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0,
                                                backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '12px',
                                                marginTop: '4px', maxHeight: '250px', overflowY: 'auto', zIndex: 50,
                                                padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', listStyle: 'none', margin: '5px 0 0 0'
                                            }}>
                                                {filteredMappings.map(m => (
                                                    <li
                                                        key={m.id}
                                                        onMouseDown={() => handleMappingSelect(m)}
                                                        style={{
                                                            padding: '12px', cursor: 'pointer', borderRadius: '8px',
                                                            fontSize: '14px', color: '#00364A', transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#E0F2FE'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    >
                                                        <strong>{m.mapping_name}</strong> <span style={{ opacity: 0.6 }}>({m.source_name})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Database size={16} color="#49A3C4" /> Select Web Source *
                                            </label>
                                            <StyledSelect
                                                value={selectedSourceId}
                                                onChange={(e) => handleSourceChange(e.target.value)}
                                                required
                                            >
                                                <option value="">Choose a source...</option>
                                                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </StyledSelect>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Map size={16} color="#49A3C4" /> Select Mapping *
                                            </label>
                                            <StyledSelect
                                                value={selectedMappingId}
                                                onChange={(e) => setSelectedMappingId(e.target.value)}
                                                required
                                                disabled={!selectedSourceId}
                                            >
                                                <option value="">{selectedSourceId ? 'Choose a mapping...' : 'Select a source first...'}</option>
                                                {mappings.map(m => <option key={m.id} value={m.id}>{m.mapping_name} ({m.entity_name})</option>)}
                                            </StyledSelect>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* API Source Inputs */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Globe size={16} color="#49A3C4" /> Select API Source *
                                    </label>
                                    <StyledSelect
                                        value={selectedApiSourceId}
                                        onChange={(e) => setSelectedApiSourceId(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose an API source...</option>
                                        {apiSources.map(api => <option key={api.id} value={api.id}>{api.name} ({api.entity_name})</option>)}
                                    </StyledSelect>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <StyledInput
                                    label="Task Name (Optional)"
                                    icon={<Type size={16} />}
                                    value={taskName}
                                    onChange={(e) => setTaskName(e.target.value)}
                                    placeholder="Auto-generated if empty"
                                />
                                <StyledInput
                                    label="Max Items"
                                    icon={<Maximize size={16} />}
                                    type="number"
                                    value={maxItems}
                                    onChange={(e) => setMaxItems(e.target.value)}
                                    min={1}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <StyledInput
                                    label="Scheduled Time *"
                                    icon={<Calendar size={16} />}
                                    type="datetime-local"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    required
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <RotateCw size={16} color="#49A3C4" /> Repeat *
                                    </label>
                                    <StyledSelect
                                        value={repeat}
                                        onChange={(e) => setRepeat(e.target.value)}
                                        required
                                    >
                                        <option value="once">Once</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </StyledSelect>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px' }}>
                                <StyledButton
                                    variant="primary"
                                    disabled={loading}
                                    icon={loading ? <Loader2 size={20} className="spin" /> : <Plus size={20} />}
                                    style={{ padding: '14px 30px', fontSize: '16px' }}
                                >
                                    {loading ? 'Creating...' : 'Create Task'}
                                </StyledButton>
                            </div>
                        </form>
                    )}

                    {activeTab === 'manage' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Stats Section */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '20px',
                                marginBottom: '20px'
                            }}>
                                <StatCard title="Total Scheduled" value={tasks.length} color="#00364A" />
                                <StatCard
                                    title="Upcoming"
                                    value={tasks.filter(t => t && t.scheduled_time && new Date(t.scheduled_time) > new Date()).length}
                                    color="#059669"
                                />
                            </div>

                            {tasks.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '60px',
                                    backgroundColor: '#F8FBFF',
                                    borderRadius: '20px',
                                    border: '2px dashed rgba(0, 54, 74, 0.1)'
                                }}>
                                    <Clock size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
                                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No Tasks Scheduled</h3>
                                    <p style={{ color: '#00364A', opacity: 0.6 }}>Use the "Create Task" tab to schedule your first task.</p>
                                </div>
                            ) : (
                                tasks.map((task) => {
                                    if (!task) return null;
                                    // Determine if it's an API task based on source_type or existence of api_source_id
                                    const isApiTask = task.source_type === 'api' || task.api_source_id;

                                    return (
                                        <div key={task.id} style={{
                                            backgroundColor: 'white',
                                            border: '2px solid rgba(0, 54, 74, 0.08)',
                                            borderRadius: '20px',
                                            boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                                            overflow: 'hidden',
                                            transition: 'all 0.3s'
                                        }}>
                                            <div style={{ padding: '30px' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: '20px',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <div style={{ flex: '1 1 300px', minWidth: '0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                            <h3 style={{
                                                                fontSize: '18px',
                                                                fontWeight: '700',
                                                                color: '#00364A',
                                                                margin: 0,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {task.task_name || task.name}
                                                            </h3>
                                                            {isApiTask ? (
                                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#E0F2FE', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Globe size={12} /> API
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#F3F4F6', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Monitor size={12} /> SCRAPER
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
                                                            {isApiTask ? (
                                                                <>
                                                                    <InfoItem icon={<Globe size={14} />} label="API Source">
                                                                        {task.api_source_name || (apiSources.find(a => a.id === task.api_source_id)?.name) || 'Unknown'}
                                                                    </InfoItem>
                                                                    <InfoItem icon={<List size={14} />} label="Entity">{task.entity_name}</InfoItem>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <InfoItem icon={<Database size={14} />} label="Source">{task.source_name}</InfoItem>
                                                                    <InfoItem icon={<Map size={14} />} label="Mapping">{task.mapping_name}</InfoItem>
                                                                    <InfoItem icon={<List size={14} />} label="Entity">{task.entity_name}</InfoItem>
                                                                </>
                                                            )}
                                                            
                                                            <InfoItem icon={<Calendar size={14} />} label="Scheduled">{formatDateTime(task.scheduled_time)}</InfoItem>
                                                            <InfoItem icon={<RotateCw size={14} />} label="Repeat">{task.repeat}</InfoItem>
                                                            <InfoItem icon={<Clock size={14} />} label="Last Run">
                                                                {task.last_executed_at ? formatDateTime(task.last_executed_at) : 'Never'}
                                                            </InfoItem>
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'flex-end',
                                                        gap: '15px',
                                                        flexShrink: 0,
                                                        marginLeft: 'auto'
                                                    }}>
                                                        {getStatusBadge(task.scheduled_time)}
                                                        <IconButton
                                                            onClick={() => handleDeleteTask(task.id, task.task_name || task.name)}
                                                            icon={<Trash2 size={16} />}
                                                            color="#EF4444"
                                                            title="Delete Task"
                                                            label="Delete"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
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

const TabButton = ({ active, onClick, icon, children }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s',
            backgroundColor: active ? 'white' : 'transparent',
            color: active ? '#49A3C4' : '#6B7280',
            boxShadow: active ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
        }}
    >
        {icon}
        {children}
    </button>
);

const StyledInput = ({ label, icon, value, onChange, placeholder, type = "text", onFocus, onBlur, min }) => (
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
            min={min}
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
                onFocus && onFocus(e);
                e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.25)';
                e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.2)';
            }}
            onBlur={(e) => {
                onBlur && onBlur(e);
                e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.15)';
                e.target.style.boxShadow = 'none';
            }}
        />
    </div>
);

const StyledSelect = ({ value, onChange, children, required, disabled }) => (
    <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        style={{
            padding: '14px 20px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'rgba(73, 163, 196, 0.15)',
            color: '#00364A',
            fontSize: '15px',
            outline: 'none',
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
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

const IconButton = ({ onClick, icon, color, title, label, disabled }) => {
    const [hover, setHover] = useState(false);

    // Use a hex code to ensure background opacity logic works
    const effectiveColor = disabled ? '#cccccc' : color;

    const getBgColor = () => {
        if (disabled) return '#f5f5f5';
        // If hovering, add transparency to hex color, or fallback to gray
        if (hover) {
            if (effectiveColor && effectiveColor.startsWith('#')) return `${effectiveColor}15`;
            return '#f0f0f0';
        }
        return '#FFF1F2'; // Specifically for Delete/Red tint
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: label ? '8px 16px' : '0',
                width: label ? 'auto' : '40px',
                minWidth: label ? 'auto' : '40px', // Prevent squash
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: getBgColor(),
                color: effectiveColor,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                fontSize: '13px',
                fontWeight: '600',
                flexShrink: 0
            }}
        >
            {icon}
            {label}
        </button>
    );
};

export default TaskScheduler;