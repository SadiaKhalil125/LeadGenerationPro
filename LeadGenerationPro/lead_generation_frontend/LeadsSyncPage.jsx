// Save as: LeadSyncTest.jsx
import React, { useState } from "react";
import API_BASE from "./src/api_base";

const LeadSyncTest = () => {
  const [tables, setTables] = useState("");
  const [batchSize, setBatchSize] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  

  const handleSync = async () => {
    if (!tables.trim()) {
      alert("Please enter table names!");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Parse comma-separated table names
    const tableList = tables
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const response = await fetch(`${API_BASE}/leads/sync`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" 
        },
        body: JSON.stringify({
          entity_tables: tableList,
          batch_size: batchSize
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Sync failed");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#C7D8ED",
      color: "#00364A",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: "40px 20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "800px",
        backgroundColor: "white",
        borderRadius: "25px",
        boxShadow: "0 15px 50px rgba(0, 54, 74, 0.15)",
        overflow: "hidden"
      }}>
        <div style={{ padding: "50px" }}>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
            borderBottom: "1px solid rgba(0, 54, 74, 0.1)",
            paddingBottom: "20px"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              backgroundColor: "#49A3C4",
              borderRadius: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white"
            }}>
              <span style={{ fontSize: "24px", fontWeight: "bold" }}>🔄</span>
            </div>
            <div>
              <h1 style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "#00364A",
                margin: 0,
                lineHeight: "1.2"
              }}>Test Leads Sync API</h1>
              <p style={{
                fontSize: "16px",
                color: "#00364A",
                opacity: 0.7,
                margin: "5px 0 0 0"
              }}>Sync entity tables into unified leads</p>
            </div>
          </div>
          
          {/* Input Section */}
          <div style={{ marginBottom: "30px" }}>
            <label style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#00364A",
              marginBottom: "15px",
              display: "block"
            }}>
              Database Table Names (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g., google_places, yelp_businesses, facebook_pages"
              value={tables}
              onChange={(e) => setTables(e.target.value)}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "rgba(73, 163, 196, 0.15)",
                color: "#00364A",
                fontSize: "16px",
                outline: "none",
                transition: "all 0.3s",
                boxSizing: "border-box"
              }}
              onFocus={(e) => {
                e.target.style.backgroundColor = "rgba(73, 163, 196, 0.25)";
                e.target.style.boxShadow = "0 0 0 3px rgba(73, 163, 196, 0.2)";
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = "rgba(73, 163, 196, 0.15)";
                e.target.style.boxShadow = "none";
              }}
            />
            <small style={{ 
              display: "block", 
              marginTop: "8px", 
              color: "#00364A",
              opacity: 0.6 
            }}>
              Enter exact table names from your PostgreSQL database
            </small>
          </div>

          {/* Batch Size Input */}
          <div style={{ marginBottom: "40px" }}>
            <label style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#00364A",
              marginBottom: "15px",
              display: "block"
            }}>
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 500)}
              style={{
                width: "200px",
                padding: "16px 24px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "rgba(73, 163, 196, 0.15)",
                color: "#00364A",
                fontSize: "16px",
                outline: "none"
              }}
            />
            <small style={{ 
              display: "block", 
              marginTop: "8px", 
              color: "#00364A",
              opacity: 0.6 
            }}>
              Number of rows to process at once (default: 500)
            </small>
          </div>

          {/* Sync Button */}
          <div style={{ marginBottom: "40px", textAlign: "center" }}>
            <button 
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "16px 40px",
                backgroundColor: loading ? "#ccc" : "#00364A",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                boxShadow: "0 4px 15px rgba(0, 54, 74, 0.2)"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 6px 20px rgba(0, 54, 74, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 4px 15px rgba(0, 54, 74, 0.2)";
                }
              }}
              onClick={handleSync}
              disabled={loading}
            >
              {loading ? "🔄 Syncing..." : "🚀 Sync Leads"}
            </button>
          </div>

          {/* Results */}
          {error && (
            <div style={{
              padding: "20px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "12px",
              marginBottom: "20px"
            }}>
              <h3 style={{ color: "#DC2626", marginTop: 0 }}>Error</h3>
              <p style={{ color: "#991B1B" }}>{error}</p>
            </div>
          )}

          {result && (
            <div style={{
              padding: "25px",
              backgroundColor: "#F0F9FF",
              border: "1px solid #BAE6FD",
              borderRadius: "12px"
            }}>
              <h3 style={{ color: "#0369A1", marginTop: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <span>✅</span> Sync Successful!
              </h3>
              <pre style={{
                backgroundColor: "white",
                padding: "15px",
                borderRadius: "8px",
                overflowX: "auto",
                fontSize: "14px",
                color: "#00364A"
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          <div style={{ 
            marginTop: "40px", 
            padding: "25px", 
            backgroundColor: "#F8FBFF", 
            borderRadius: "20px",
            border: "1px solid rgba(0, 54, 74, 0.08)"
          }}>
            <h3 style={{ color: "#00364A", marginTop: 0 }}>📖 How to Use</h3>
            <ol style={{ color: "#00364A", lineHeight: "1.6" }}>
              <li>Make sure your FastAPI backend is running at <code style={{ backgroundColor: "rgba(73, 163, 196, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>http://localhost:8000</code></li>
              <li>Enter your PostgreSQL table names (comma-separated)</li>
              <li>Click "Sync Leads" to normalize data into the unified leads table</li>
              <li>Check your database for the new <code style={{ backgroundColor: "rgba(73, 163, 196, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>leads</code> table</li>
            </ol>
            
            <div style={{ marginTop: "20px" }}>
              <h4 style={{ color: "#00364A" }}>Example Tables:</h4>
              <div style={{ 
                display: "flex", 
                flexWrap: "wrap", 
                gap: "10px",
                marginTop: "10px"
              }}>
                {["Company", "Business", "business_listings", "Jobs", "Companies", "Person", "Contacts"].map(table => (
                  <span 
                    key={table}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "rgba(73, 163, 196, 0.1)",
                      color: "#00364A",
                      borderRadius: "6px",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                    onClick={() => setTables(prev => prev ? `${prev}, ${table}` : table)}
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadSyncTest;