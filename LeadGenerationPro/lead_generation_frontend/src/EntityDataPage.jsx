import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Database, ChevronLeft, ChevronRight, Loader2, AlertTriangle, List, ArrowLeft } from "lucide-react";
import API_BASE from "./api_base";
import { useNavigate } from "react-router-dom";
const EntityDataScreen = () => {
  const [searchParams] = useSearchParams();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageSize] = useState(10);  // or make it adjustable
  const navigate = useNavigate();
  // Get entity from query parameter if provided
  const entityFromParam = searchParams.get('entity');

  useEffect(() => {
    fetchEntities();
  }, []);

  // Auto-select entity from URL parameter when entities load
  useEffect(() => {
    if (entityFromParam && entities.length > 0 && !selectedEntity) {
      const matchingEntity = entities.find(e => e.name === entityFromParam);
      if (matchingEntity) {
        setSelectedEntity(entityFromParam);
      }
    }
  }, [entityFromParam, entities, selectedEntity]);

  useEffect(() => {
    if (selectedEntity) {
      fetchEntityData(selectedEntity, page);
    }
  }, [selectedEntity, page]);

  const fetchEntities = async () => {
    try {
      const res = await fetch(`${API_BASE}/entity/entities`,{
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const json = await res.json();
      setEntities(json.entities || []);
    } catch (err) {
      setError("Failed to load entities.");
    }
  };

  const fetchEntityData = async (entityName, pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/entity/entity-data/${entityName}?page=${pageNum}&page_size=${pageSize}`,
        {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        }
      );

      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

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
              <Database size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>Entity Data Viewer</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Browse and inspect your database entities</p>
            </div>
            
          </div>
           <div
          style={{
          padding: '10px 10px',
          display: 'flex',
          justifyContent: 'right',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <button
             style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#00364A',
              borderRadius: '12px',
              border: '2px solid #00364A',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#00364A';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#00364A';
            }}
            onClick={() => navigate('/dashboard')}
          >
          <ArrowLeft size={18} />
            Dashboard
            </button>
            </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Entity Selector */}
          <div style={{ marginBottom: '30px', maxWidth: '400px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#00364A',
              marginBottom: '8px',
              display: 'block'
            }}>Select Entity</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEntity || ""}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'rgba(73, 163, 196, 0.15)',
                  color: '#00364A',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300364A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 20px top 50%',
                  backgroundSize: '12px auto'
                }}
              >
                <option value="">-- Choose an entity --</option>
                {entities.map((ent, idx) => (
                  <option key={idx} value={ent.name}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
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
              <AlertTriangle size={20} color="#EF4444" />
              <span style={{ fontWeight: '500' }}>{error}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px 0',
              color: '#00364A'
            }}>
              <Loader2 size={32} className="spin" style={{ marginRight: '10px' }} />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>Loading data...</span>
            </div>
          )}

          {/* No Data */}
          {!loading && data && data.rows && data.rows.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <List size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No Data Found</h3>
              <p style={{ color: '#00364A', opacity: 0.6 }}>This table has no records to display.</p>
            </div>
          )}

          {/* Data Table */}
          {!loading && data && data.rows && data.rows.length > 0 && (
            <div style={{
              overflowX: 'auto',
              borderRadius: '15px',
              border: '1px solid rgba(0, 54, 74, 0.1)',
              boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead style={{ backgroundColor: '#F8FBFF' }}>
                  <tr>
                    {data.columns.map((col, idx) => (
                      <th key={idx} style={{
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#00364A',
                        borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, ridx) => (
                    <tr key={ridx} style={{ 
                      backgroundColor: ridx % 2 === 0 ? 'white' : '#FAFAFA',
                      transition: 'background-color 0.2s'
                    }}>
                      {row.map((cell, cidx) => {
                        const colName = data.columns[cidx];
                        const displayValue = colName === 'modified_at' && cell
                            ? new Date(cell).toLocaleString()
                            : cell;

                        return (
                          <td key={cidx} style={{
                            padding: '16px 20px',
                            fontSize: '14px',
                            color: '#00364A',
                            borderBottom: '1px solid rgba(0, 54, 74, 0.05)',
                            whiteSpace: 'nowrap'
                          }}>
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.rows && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(0, 54, 74, 0.1)'
            }}>
              <StyledButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                icon={<ChevronLeft size={18} />}
              >
                Previous
              </StyledButton>
              
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#00364A' }}>
                Page {page}
              </span>
              
              <StyledButton
                onClick={() => setPage((p) => p + 1)}
                disabled={data.rows.length < pageSize}
                icon={<ChevronRight size={18} />}
                iconPos="right"
              >
                Next
              </StyledButton>
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

// Helper Component for Buttons
const StyledButton = ({ onClick, disabled, icon, children, iconPos = "left" }) => {
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
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: hover && !disabled ? '#E0EFFF' : 'white',
        color: disabled ? '#A0AEC0' : '#00364A',
        border: `2px solid ${disabled ? '#E2E8F0' : '#00364A'}`,
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        flexDirection: iconPos === 'right' ? 'row-reverse' : 'row'
      }}
    >
      {icon}
      {children}
    </button>
  );
};

export default EntityDataScreen;