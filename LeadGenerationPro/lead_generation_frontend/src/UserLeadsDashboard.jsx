import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Locate, Phone, Mail , Activity, Layers} from "lucide-react";
import { FiFilter, FiStar, FiPhone, FiGlobe, FiDownload, FiArrowUp, FiArrowDown } from "react-icons/fi";
import { BsSortDown, BsBuilding, BsSourceforge } from "react-icons/bs";
import API_BASE from "./api_base"; // Your FastAPI backendS
import Header from "./components/Header";

// Predefined options for dropdowns
const businessTypes = [
  "Software", "Healthcare", "Finance", "Retail", "Manufacturing",
  "Education", "Real Estate", "Construction",
  "Marketing", "Consulting", "Restaurant", "Entertainment", "Other"
];

const companySizes = [
  "1-10 employees", "11-50 employees", "51-200 employees", 
  "201-500 employees", "501-1000 employees", "1000+ employees"
];

export default function LeadGeneratorPage() {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchInfo, setSearchInfo] = useState({ count: 0, filters: {} });
  // Add these states near your other useState declarations
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filters, setFilters] = useState({
    minRating: 0,
    hasContact: false,
    source: ''
  });
 
  // Filter and sort logic (add this before rendering the table)
  const filteredAndSortedLeads = React.useMemo(() => {
    let result = [...leads];
    
    // Apply filters
    if (filters.minRating > 0) {
      result = result.filter(lead => lead.rating && lead.rating >= filters.minRating);
    }
    
    if (filters.hasContact) {
      result = result.filter(lead => lead.phone || lead.email);
    }
    
    if (filters.hasWebsite) {
      result = result.filter(lead => lead.website);
    }
    
    if (filters.industry) {
      result = result.filter(lead => lead.category === filters.industry);
    }
    
    if (filters.source) {
      result = result.filter(lead => lead.source === filters.source);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Handle numeric sorting for ratings and review counts
      if (sortField === 'rating' || sortField === 'reviews_count') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      // Handle string sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return result;
  }, [leads, filters, sortField, sortDirection]);

  const handleSearch = async () => {
    if (!businessType || !location) {
      alert('Please fill both Business Type and Location fields to search for leads');
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);

    try {
      // Build query parameters matching the backend endpoint
      const params = new URLSearchParams({
        business_type: businessType,
        location: location,
        company_size: companySize || "", // Optional parameter
        limit: "50", // Default from backend
        offset: "0"
      });

      const res = await fetch(`${API_BASE}/leads/search?${params}`);
      const data = await res.json();

      if (!data.success) {
        alert(`Search failed: ${data.detail || "Unknown error"}`);
        setLeads([]);
        setSearchInfo({ count: 0, filters: {} });
      } else {
        setLeads(data.data || []);
        setSearchInfo({
          count: data.count || 0,
          filters: data.filters || {}
        });
      }
    } catch (err) {
      console.error("Search error:", err);
      alert("Server error - check if backend is running");
      setLeads([]);
      setSearchInfo({ count: 0, filters: {} });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export');
      return;
    }
    
    // Map backend fields to CSV columns
    const headers = [
      'Company', 'Industry', 'Location', 'Phone', 'Email', 
      'Website', 'Rating', 'Reviews', 'Source', 'Date Added'
    ];
    
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        `"${lead.name || ''}"`,
        `"${lead.category || ''}"`,
        `"${lead.address || ''}"`,
        `"${lead.phone || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.website || ''}"`,
        `"${lead.rating || ''}"`,
        `"${lead.reviews_count || ''}"`,
        `"${lead.source || ''}"`,
        `"${new Date(lead.created_at).toLocaleDateString() || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${businessType}_${location}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert(`Exported ${leads.length} leads as CSV`);
  };

  const handleExportExcel = () => {
    if (leads.length === 0) {
      alert('No leads to export');
      return;
    }
    
    // For now, we'll use CSV but you can integrate SheetJS for real Excel export
    alert(`Excel export would be implemented with a library like SheetJS. ${leads.length} leads ready.`);
  };

  const handleReset = () => {
    setBusinessType('');
    setLocation('');
    setCompanySize('');
    setLeads([]);
    setSearchPerformed(false);
    setSearchInfo({ count: 0, filters: {} });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    // Simple formatting - you can enhance this
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0,3)}) ${cleaned.substring(3,6)}-${cleaned.substring(6)}`;
    }
    return phone;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px'
    }}>
      <Header activeTab="leads" />

      {/* Main Content */}
      <main style={{
        maxWidth: '1450px',
        margin: '20px auto',
        padding: '0 20px'
      }}>
        {/* Hero Section - Keep as is */}
        <section style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          padding: '50px',
          marginBottom: '40px',
          boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <div>
              <h1 style={{
                fontSize: '48px',
                fontWeight: '800',
                lineHeight: '1.2',
                marginBottom: '20px',
                color: '#00364A'
              }}>
                Find Your Perfect Leads
              </h1>
              <p style={{
                fontSize: '18px',
                lineHeight: '1.6',
                color: '#00364A',
                opacity: 0.8,
                marginBottom: '30px'
              }}>
                Filter through millions of companies to find your ideal customers. 
                Our AI-powered database helps you target the right businesses instantly.
              </p>
              
              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent:'space-around',
                gap: '30px',
                marginTop: '40px'
              }}>
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#49A3C4',
                    marginBottom: '5px'
                  }}>10M+</div>
                  <div style={{ color: '#00364A', opacity: 0.7 }}>Companies</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#49A3C4',
                    marginBottom: '5px'
                  }}>200+</div>
                  <div style={{ color: '#00364A', opacity: 0.7 }}>Industries</div>
                </div>
                <div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#49A3C4',
                    marginBottom: '5px'
                  }}>95%</div>
                  <div style={{ color: '#00364A', opacity: 0.7 }}>Accuracy</div>
                </div>
              </div>
            </div>

            {/* Right Content - Search Form */}
            <div style={{
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              padding: '40px',
              border: '2px solid rgba(73, 163, 196, 0.2)',
              boxShadow: '0 10px 30px rgba(0, 54, 74, 0.08)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '30px',
                color: '#00364A',
                textAlign: 'center'
              }}>
                Customize Your Search
              </h2>

              {/* Form - Keep as is */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Business Type */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#00364A'
                  }}>
                    Business Type / Industry
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      border: '2px solid rgba(0, 54, 74, 0.1)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      color: '#00364A',
                      outline: 'none',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#49A3C4';
                      e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Industry</option>
                    {businessTypes.map((type, index) => (
                      <option key={index} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#00364A'
                  }}>
                    Location (City, State, or Country)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Lahore, United States"
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      border: '2px solid rgba(0, 54, 74, 0.1)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      color: '#00364A',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#49A3C4';
                      e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Company Size */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#00364A'
                  }}>
                    Company Size
                  </label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      border: '2px solid rgba(0, 54, 74, 0.1)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      backgroundColor: 'white',
                      color: '#00364A',
                      outline: 'none',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#49A3C4';
                      e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Company Size</option>
                    {companySizes.map((size, index) => (
                      <option key={index} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '15px',
                  marginTop: '10px'
                }}>
                  <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '18px 30px',
                      backgroundColor: '#00364A',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      opacity: isLoading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.target.style.backgroundColor = '#004d66';
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.target.style.backgroundColor = '#00364A';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isLoading ? (
                      <>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          border: '3px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Searching...
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '20px' }}>🔍</span>
                        Find Leads
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '18px 25px',
                      backgroundColor: 'transparent',
                      color: '#00364A',
                      border: '2px solid #00364A',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#00364A';
                      e.target.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#00364A';
                    }}
                  >
                    Reset
                  </button>
                </div>
                
                {/* Immediate access to Request Form */}
                <p style={{ 
                  marginTop: '15px', 
                  textAlign: 'center', 
                  fontSize: '14px', 
                  color: '#00364A', 
                  opacity: 0.8 
                }}>
                  Don't see your business? 
                  <a 
                    href="https://docs.google.com/forms/d/e/1FAIpQLSfvK4eNpQIwaboIpXmqxYbCYpX_QTPcS-4ZpKtqb0wNETN1Xw/viewform?usp=publish-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#49A3C4', 
                      fontWeight: '700', 
                      marginLeft: '5px',
                      textDecoration: 'underline'
                    }}
                  >
                    Request an addition here
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section - UPDATED for new API response */}
        {searchPerformed && (
          <section style={{
            backgroundColor: 'white',
            borderRadius: '25px',
            padding: '40px',
            boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
            marginBottom: '40px'
          }}>
            {/* Results Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#00364A',
                  marginBottom: '10px'
                }}>
                  Showing {filteredAndSortedLeads.length} of {leads.length} Leads
                </h2>
                <p style={{ color: '#49A3C4', fontWeight: '600' }}>
                  {businessType} • {location || 'Anywhere'} • {companySize || 'Any size'}
                </p>
              </div>
              
              {/* Export Buttons */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={handleExportCSV}
                  disabled={leads.length === 0}
                  style={{
                    padding: '14px 30px',
                    backgroundColor: '#49A3C4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: leads.length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: leads.length === 0 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (leads.length > 0) {
                      e.target.style.backgroundColor = '#3a92b3';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (leads.length > 0) {
                      e.target.style.backgroundColor = '#49A3C4';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📥</span>
                  Export as CSV
                </button>
                
                <button
                  onClick={handleExportExcel}
                  disabled={leads.length === 0}
                  style={{
                    padding: '14px 30px',
                    backgroundColor: '#00364A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: leads.length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: leads.length === 0 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (leads.length > 0) {
                      e.target.style.backgroundColor = '#004d66';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (leads.length > 0) {
                      e.target.style.backgroundColor = '#00364A';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📊</span>
                  Export as Excel
                </button>
              </div>
            </div>
           {leads.length > 0 && (
  <>
    {/* Floating Controls Bar - Line 1 */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      padding: '15px 20px',
      backgroundColor: '#F8FBFF',
      borderRadius: '10px',
      border: '1px solid rgba(73, 163, 196, 0.2)',
      flexWrap: 'wrap',
      gap: '15px'
    }}>
      
      {/* Left: Filter Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
         <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    color: '#00364A',
    fontSize: '13px'
  }}>
    <FiFilter size={14} />
    Filter:
  </div>
        {/* Rating Filter */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#49A3C4',
            zIndex: 1
          }}>
            <FiStar size={14} />
          </div>
          <select
            value={filters.minRating}
            onChange={(e) => setFilters({...filters, minRating: parseFloat(e.target.value)})}
            style={{
              padding: '10px 12px 10px 36px',
              border: '1px solid rgba(0, 54, 74, 0.15)',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white',
              color: '#00364A',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '140px',
              appearance: 'none'
            }}
          >
            <option value="0">All Ratings</option>
            <option value="3.0">3.0+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>
        </div>

        {/* Source Filter */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#49A3C4',
            zIndex: 1
          }}>
            <BsSourceforge size={14} />
          </div>
          <select
            value={filters.source}
            onChange={(e) => setFilters({...filters, source: e.target.value})}
            style={{
              padding: '10px 12px 10px 36px',
              border: '1px solid rgba(0, 54, 74, 0.15)',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white',
              color: '#00364A',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '160px',
              appearance: 'none'
            }}
          >
            <option value="">All Sources</option>
            {Array.from(new Set(leads.map(l => l.source).filter(Boolean))).map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        {/* Contact Checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontWeight: '500',
          color: '#00364A',
          fontSize: '13px',
          padding: '8px 12px',
          backgroundColor: filters.hasContact ? 'rgba(73, 163, 196, 0.1)' : 'transparent',
          borderRadius: '6px',
          border: `1px solid ${filters.hasContact ? '#49A3C4' : 'rgba(0, 54, 74, 0.15)'}`,
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={filters.hasContact}
            onChange={(e) => setFilters({...filters, hasContact: e.target.checked})}
            style={{
              width: '14px',
              height: '14px',
              accentColor: '#49A3C4',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiPhone size={13} />
            Has Contact
          </div>
        </label>
      </div>

      {/* Right: Clear Filters */}
      <button
        onClick={() => {
          setFilters({ minRating: 0, hasContact: false, source: '' });
          setSortField('rating');
          setSortDirection('desc');
        }}
        style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          color: '#00364A',
          border: '1px solid rgba(0, 54, 74, 0.2)',
          borderRadius: '6px',
          fontWeight: '500',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
        }}
      >
        <FiFilter size={13} />
        Clear Filters
      </button>
    </div>

    {/* Sorting Bar - Line 2 */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '12px 20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid rgba(0, 54, 74, 0.1)',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      
      {/* Sort Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: '600',
        color: '#00364A',
        fontSize: '13px'
      }}>
        <BsSortDown size={14} />
        Sort by:
      </div>

      {/* Sort Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {[
          { field: 'rating', label: 'Rating', icon: FiStar },
          { field: 'reviews_count', label: 'Reviews', icon: FiDownload },
          { field: 'name', label: 'Company Name', icon: BsBuilding }
        ].map(option => (
          <button
            key={option.field}
            onClick={() => {
              if (sortField === option.field) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField(option.field);
                setSortDirection('asc');
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: sortField === option.field ? '#49A3C4' : 'white',
              color: sortField === option.field ? 'white' : '#00364A',
              border: `1px solid ${sortField === option.field ? '#49A3C4' : 'rgba(0, 54, 74, 0.15)'}`,
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: 'auto'
            }}
            onMouseEnter={(e) => {
              if (sortField !== option.field) {
                e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (sortField !== option.field) {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            <option.icon size={12} />
            {option.label}
            {sortField === option.field && (
              <span style={{ marginLeft: '4px', fontSize: '12px' }}>
                {sortDirection === 'asc' ? <FiArrowUp /> : <FiArrowDown />}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#49A3C4',
        fontWeight: '500',
        backgroundColor: 'rgba(73, 163, 196, 0.1)',
        padding: '6px 12px',
        borderRadius: '6px',
        marginLeft: 'auto'
      }}>
        <span>📊</span>
        <span>
          {filteredAndSortedLeads.length} of {leads.length} leads
        </span>
      </div>
    </div>
  </>
)}
            {/* Leads Table - UPDATED for new API fields */}
            {filteredAndSortedLeads.length > 0 ? (
              <div style={{
                overflowX: 'auto',
                borderRadius: '15px',
                border: '2px solid rgba(0, 54, 74, 0.1)'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '1200px'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#E0EFFF',
                      borderBottom: '2px solid rgba(0, 54, 74, 0.1)'
                    }}>
                      {['Company', 'Industry', 'Location', 'Contact Info', 'Rating', 'Source', 'Actions'].map((header) => (
                        <th key={header} style={{
                          padding: '20px 15px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: '#00364A',
                          fontSize: '15px'
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedLeads.map((lead, index) => (
                      <tr 
                        key={lead.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? 'white' : '#F8FBFF',
                          borderBottom: '1px solid rgba(0, 54, 74, 0.05)',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E0EFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#F8FBFF';
                        }}
                      >
                        {/* Company with tooltip for long names */}
                        <td style={{
                          padding: '18px 15px',
                          fontWeight: '600',
                          color: '#00364A',
                          maxWidth: '250px',
                          position: 'relative'  // For tooltip positioning
                        }}>
                          <div
                            style={{
                              maxWidth: '250px',
                              cursor: (lead.name && lead.name.length > 30) ? 'help' : 'default',
                              position: 'relative'
                            }}
                            title={lead.name && lead.name.length > 30 ? lead.name : ''}  // Native tooltip
                          >
                            <div style={{
                              fontSize: '16px',
                              marginBottom: '4px',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              maxHeight: '3.2em',  // ~3 lines max
                              lineHeight: '1.6em',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,  // Limit to 2 lines
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {lead.name || 'N/A'}
                            </div>
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '13px',
                                  color: '#49A3C4',
                                  textDecoration: 'none',
                                  display: 'inline-block',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.textDecoration = 'underline';
                                  // Show full URL on hover
                                  e.target.title = lead.website;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.textDecoration = 'none';
                                  e.target.title = '';
                                }}
                              >
                                Visit Website
                              </a>
                            )}
                          </div>
                        </td>
                        
                        {/* Industry */}
                        <td style={{ padding: '18px 15px', color: '#00364A', opacity: 0.8 }}>
                          <span style={{
                            backgroundColor: 'rgba(73, 163, 196, 0.1)',
                            color: '#49A3C4',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {lead.category || 'N/A'}
                          </span>
                        </td>
                        
                        {/* Location */}
                        <td style={{ padding: '18px 15px', color: '#00364A', opacity: 0.8 }}>
                          {lead.address ? (
                            <div style={{ maxWidth: '200px' }}>
                              {lead.address.split(',').slice(0, 2).join(',')}
                              {lead.address.split(',').length > 2 && '...'}
                            </div>
                          ) : 'N/A'}
                        </td>

                        {/* Contact Info Column - Updated */}
                        <td style={{ padding: '18px 15px', color: '#00364A' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {lead.phone && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px'
                              }}>
                                <Phone size={14} color="#49A3C4" />
                                <span>{formatPhoneNumber(lead.phone)}</span>
                              </div>
                            )}
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '14px',
                                  color: '#49A3C4',
                                  textDecoration: 'none'
                                }}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                              >
                                <Mail size={14} />
                                <span style={{
                                  wordBreak: 'break-all',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {lead.email}
                                </span>
                              </a>
                            )}
                          </div>
                        </td>
                        
                        {/* Rating */}
                        <td style={{ padding: '18px 15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {lead.rating ? (
                              <>
                                <span style={{
                                  backgroundColor: lead.rating >= 4 ? '#10B981' : 
                                                   lead.rating >= 3 ? '#F59E0B' : '#EF4444',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600'
                                }}>
                                  {lead.rating.toFixed(1)} ⭐
                                </span>
                                {lead.reviews_count && (
                                  <span style={{ fontSize: '13px', color: '#6B7280' }}>
                                    ({lead.reviews_count})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#9CA3AF', fontSize: '14px' }}>No rating</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Source */}
                        <td style={{ padding: '18px 15px', color: '#00364A', opacity: 0.8 }}>
                          <div>
                            <div style={{ fontWeight: '500' }}>{lead.source || 'Unknown'}</div>
                            {lead.source_entity && (
                              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                {lead.source_entity}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        
                        
                        {/* Actions */}
                        <td style={{ padding: '18px 15px' }}>
                          <button style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: '#49A3C4',
                            border: '2px solid #49A3C4',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#49A3C4';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#49A3C4';
                          }}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#F8FBFF',
                borderRadius: '15px',
                border: '2px dashed rgba(73, 163, 196, 0.3)'
              }}>
                <div style={{
                  fontSize: '60px',
                  marginBottom: '20px',
                  opacity: 0.5
                }}>
                  🔍
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#00364A',
                  marginBottom: '10px'
                }}>
                  No leads found
                </h3>
                <p style={{
                  color: '#00364A',
                  opacity: 0.7,
                  marginBottom: '20px',
                  maxWidth: '500px',
                  margin: '0 auto 20px'
                }}>
                  Try adjusting your filters or broaden your search criteria to find more leads.
                  The database may not have {businessType} businesses in {location}.
                </p>
                <div style={{ 
                  marginBottom: '30px', 
                  padding: '15px', 
                  backgroundColor: 'rgba(73, 163, 196, 0.1)', 
                  borderRadius: '10px',
                  display: 'inline-block'
                }}>
                  <p style={{ color: '#00364A', margin: 0, fontSize: '14px', fontWeight: '500' }}>
                    If we don't have your business in our list, you can send us a request and we will process and add this business with time. <br/>
                    <a 
                      href="https://docs.google.com/forms/d/e/1FAIpQLSfvK4eNpQIwaboIpXmqxYbCYpX_QTPcS-4ZpKtqb0wNETN1Xw/viewform?usp=publish-editor" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#49A3C4', textDecoration: 'underline', fontWeight: '700', marginTop: '5px', display: 'inline-block' }}
                    >
                      Send request via Google Form
                    </a>
                  </p>
                </div>
                <div>
                  <button
                  onClick={handleReset}
                  style={{
                    padding: '12px 30px',
                    backgroundColor: '#00364A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#004d66';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#00364A';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Start New Search
                </button>
              </div>
            </div>
          )}

            {/* Results Summary */}
            {leads.length > 0 && (
              <div style={{
                marginTop: '40px',
                padding: '25px',
                backgroundColor: '#E0EFFF',
                borderRadius: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#00364A', marginBottom: '5px' }}>
                    Ready to take action?
                  </div>
                  <div style={{ color: '#00364A', opacity: 0.7, fontSize: '14px' }}>
                    Export these {leads.length} leads or refine your search for better results
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button style={{
                    padding: '12px 25px',
                    backgroundColor: 'white',
                    color: '#00364A',
                    border: '2px solid #00364A',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '14px',
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
                  }}>
                    Save Search
                  </button>
                  <button style={{
                    padding: '12px 25px',
                    backgroundColor: '#49A3C4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3a92b3';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#49A3C4';
                    e.target.style.transform = 'translateY(0)';
                  }}>
                    <span>💾</span>
                    Save Leads
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Business Request CTA */}
        {searchPerformed && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '25px 40px',
            boxShadow: '0 10px 30px rgba(0, 54, 74, 0.05)',
            marginBottom: '40px',
            border: '2px dashed rgba(73, 163, 196, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px' }}>🏢</div>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>
                Can't find your business?
              </h3>
              <p style={{ color: '#00364A', opacity: 0.7, margin: 0, fontSize: '15px' }}>
                If we don't have your business in our list, you can send us a request and we will process and add this business with time.
              </p>
            </div>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLSfvK4eNpQIwaboIpXmqxYbCYpX_QTPcS-4ZpKtqb0wNETN1Xw/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '12px 25px',
                backgroundColor: '#00364A',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#004d66';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00364A';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span>📩</span>
              Request Business Addition
            </a>
          </div>
        )}

        {/* Features Section */}
        {!searchPerformed && (
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '30px',
            marginTop: '40px'
          }}>
            <FeatureCard 
              icon="🎯"
              title="Precision Targeting"
              description="Filter by industry, location, and more for laser-focused lead generation from your database."
              color="#00364A"
            />
            <FeatureCard 
              icon="📈"
              title="Real Business Data"
              description="Access verified company information, contact details, and ratings from unified leads."
              color="#49A3C4"
            />
            <FeatureCard 
              icon="🔄"
              title="Synced Sources"
              description="Data from multiple sources normalized into a single, searchable leads table."
              color="#7DBBE0"
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#00364A',
        opacity: 0.7,
        fontSize: '14px',
        marginTop: '60px'
      }}>
        <p>© 2025 SCOUT Lead Generator. All rights reserved.</p>
        <p style={{ marginTop: '10px', fontSize: '13px' }}>
          Data from synchronized sources • Real business information • Premium lead quality
        </p>
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// FeatureCard component remains exactly the same
function FeatureCard({ icon, title, description, color }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '30px',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 15px 40px rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.15)` 
          : '0 8px 25px rgba(0, 54, 74, 0.08)',
        cursor: 'pointer',
        border: `2px solid rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`
      }}
    >
      <div style={{
        width: '60px',
        height: '60px',
        backgroundColor: `${color}20`,
        borderRadius: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '28px',
        color: color,
        transition: 'all 0.3s',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)'
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#00364A',
        marginBottom: '12px'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '15px',
        lineHeight: '1.6',
        color: '#00364A',
        opacity: 0.75,
        margin: 0
      }}>
        {description}
      </p>
    </div>
  );
}