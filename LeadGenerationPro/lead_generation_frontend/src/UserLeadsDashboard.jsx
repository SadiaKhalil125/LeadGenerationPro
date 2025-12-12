import React, { useState } from 'react';
import { Link } from 'react-router-dom';
export default function LeadGeneratorPage() {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const businessTypes = [
    'Technology & Software',
    'Healthcare & Medical',
    'Finance & Banking',
    'Retail & E-commerce',
    'Manufacturing',
    'Real Estate',
    'Education',
    'Hospitality & Tourism',
    'Marketing & Advertising',
    'Construction',
    'Transportation & Logistics',
    'Energy & Utilities'
  ];

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '501-1000 employees',
    '1000+ employees'
  ];

  const sampleLeads = [
    { id: 1, company: 'TechFlow Solutions', industry: 'Technology & Software', location: 'San Francisco, CA', size: '201-500 employees', contact: 'Sarah Johnson', email: 'sarah@techflow.com', phone: '(415) 555-0123', website: 'techflow.com' },
    { id: 2, company: 'HealthFirst Medical', industry: 'Healthcare & Medical', location: 'Boston, MA', size: '501-1000 employees', contact: 'Michael Chen', email: 'mchen@healthfirst.com', phone: '(617) 555-0145', website: 'healthfirst.com' },
    { id: 3, company: 'FinSecure Bank', industry: 'Finance & Banking', location: 'New York, NY', size: '1000+ employees', contact: 'Robert Williams', email: 'rwilliams@finsecure.com', phone: '(212) 555-0189', website: 'finsecure.com' },
    { id: 4, company: 'EcomExpress', industry: 'Retail & E-commerce', location: 'Seattle, WA', size: '51-200 employees', contact: 'Jennifer Lee', email: 'jlee@ecomespress.com', phone: '(206) 555-0167', website: 'ecomespress.com' },
    { id: 5, company: 'BuildRight Constructors', industry: 'Construction', location: 'Chicago, IL', size: '201-500 employees', contact: 'David Miller', email: 'dmiller@buildright.com', phone: '(312) 555-0134', website: 'buildright.com' },
    { id: 6, company: 'EduTech Academy', industry: 'Education', location: 'Austin, TX', size: '11-50 employees', contact: 'Amanda Rodriguez', email: 'arodriguez@edutech.com', phone: '(512) 555-0178', website: 'edutech.com' },
  ];

  const handleSearch = () => {
    if (!businessType || !location || !companySize) {
      alert('Please fill all fields to search for leads');
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    
    // Simulate API call
    setTimeout(() => {
      const filteredLeads = sampleLeads.filter(lead => 
        lead.industry === businessType && 
        lead.location.toLowerCase().includes(location.toLowerCase()) &&
        lead.size === companySize
      );
      
      setLeads(filteredLeads.length > 0 ? filteredLeads : sampleLeads.slice(0, 3));
      setIsLoading(false);
    }, 1500);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No leads to export');
      return;
    }
    
    const headers = ['Company', 'Industry', 'Location', 'Size', 'Contact', 'Email', 'Phone', 'Website'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        `"${lead.company}"`,
        `"${lead.industry}"`,
        `"${lead.location}"`,
        `"${lead.size}"`,
        `"${lead.contact}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.website}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${businessType}_${Date.now()}.csv`;
    a.click();
    
    alert(`Exported ${leads.length} leads as CSV`);
  };

  const handleExportExcel = () => {
    if (leads.length === 0) {
      alert('No leads to export');
      return;
    }
    
    // In a real implementation, you would use a library like SheetJS
    alert(`Exported ${leads.length} leads as Excel file`);
  };

  const handleReset = () => {
    setBusinessType('');
    setLocation('');
    setCompanySize('');
    setLeads([]);
    setSearchPerformed(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px 60px',
        position: 'relative',
        zIndex: 50
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '12px 40px',
          boxShadow: '0 4px 20px rgba(0, 54, 74, 0.1)',
          width: '100%',
          maxWidth: '1600px'
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#00364A'
          }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            HUNTERS - Lead Generator
          </div>
          
          {/* Navigation */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px'
          }}>
            <Link to="/chatbot" style={{
    fontWeight: '500',
    color: '#00364A',
    textDecoration: 'none',
    transition: 'all 0.3s',
    padding: '8px 20px',
    borderRadius: '10px'
  }}
  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.1)'}
  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
    Chatbot
  </Link>
            <a href="#" style={{
              fontWeight: '500',
              color: '#00364A',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px',
              backgroundColor: '#00364A',
              color: 'white'
            }}>
              Find Leads
            </a>
            <a href="/history" style={{
              fontWeight: '500',
              color: '#00364A',
              textDecoration: 'none',
              transition: 'all 0.3s',
              padding: '8px 20px',
              borderRadius: '10px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.1)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
              History
            </a>
          </nav>
          
          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>John Doe</div>
              <div style={{ fontSize: '13px', color: '#49A3C4' }}>Premium Plan</div>
            </div>
            <div style={{
              width: '45px',
              height: '45px',
              backgroundColor: '#49A3C4',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '18px'
            }}>
              JD
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1600px',
        margin: '40px auto',
        padding: '0 20px'
      }}>
        {/* Hero Section */}
        <section style={{
          backgroundColor: 'white',
          borderRadius: '25px',
          padding: '50px',
          marginBottom: '40px',
          boxShadow: '0 15px 40px rgba(0, 54, 74, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: 'linear-gradient(135deg, rgba(73, 163, 196, 0.1) 0%, rgba(73, 163, 196, 0) 70%)',
            borderRadius: '0 25px 0 0'
          }} />
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '50px',
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

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Business Type */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: '600',
                    color: '#00364A'
                  }}>
                    <span style={{ color: '#49A3C4', marginRight: '5px' }}>▸</span>
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
                    <span style={{ color: '#49A3C4', marginRight: '5px' }}>▸</span>
                    Location (City, State, or Country)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., San Francisco, CA or United States"
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
                    <span style={{ color: '#49A3C4', marginRight: '5px' }}>▸</span>
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
              </div>

              {/* Quick Tips */}
              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: 'rgba(73, 163, 196, 0.1)',
                borderRadius: '12px',
                fontSize: '14px',
                color: '#00364A',
                opacity: 0.8
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 Tips for better results:</div>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Be specific with location for targeted leads</li>
                  <li>Combine filters for precise matching</li>
                  <li>Save successful searches for future use</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
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
                  Found {leads.length} Leads
                </h2>
                <p style={{ color: '#49A3C4', fontWeight: '600' }}>
                  {businessType} • {location || 'Anywhere'} • {companySize}
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

            {/* Leads Table */}
            {leads.length > 0 ? (
              <div style={{
                overflowX: 'auto',
                borderRadius: '15px',
                border: '2px solid rgba(0, 54, 74, 0.1)'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '1000px'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#E0EFFF',
                      borderBottom: '2px solid rgba(0, 54, 74, 0.1)'
                    }}>
                      {['Company', 'Industry', 'Location', 'Size', 'Contact', 'Email', 'Phone', 'Actions'].map((header) => (
                        <th key={header} style={{
                          padding: '20px 15px',
                          textAlign: 'left',
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
                    {leads.map((lead, index) => (
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
                        <td style={{ padding: '18px 15px', fontWeight: '600', color: '#00364A' }}>
                          {lead.company}
                        </td>
                        <td style={{ padding: '18px 15px', color: '#00364A', opacity: 0.8 }}>
                          {lead.industry}
                        </td>
                        <td style={{ padding: '18px 15px', color: '#00364A', opacity: 0.8 }}>
                          {lead.location}
                        </td>
                        <td style={{ padding: '18px 15px' }}>
                          <span style={{
                            backgroundColor: 'rgba(73, 163, 196, 0.1)',
                            color: '#49A3C4',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}>
                            {lead.size}
                          </span>
                        </td>
                        <td style={{ padding: '18px 15px', color: '#00364A' }}>
                          {lead.contact}
                        </td>
                        <td style={{ padding: '18px 15px', color: '#49A3C4', fontWeight: '500' }}>
                          {lead.email}
                        </td>
                        <td style={{ padding: '18px 15px', color: '#00364A' }}>
                          {lead.phone}
                        </td>
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
                  marginBottom: '30px',
                  maxWidth: '500px',
                  margin: '0 auto 30px'
                }}>
                  Try adjusting your filters or broaden your search criteria to find more leads.
                </p>
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
                    Export these leads or refine your search for better results
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
              description="Filter by industry, location, company size, revenue, and more for laser-focused lead generation."
              color="#00364A"
            />
            <FeatureCard 
              icon="📈"
              title="Fresh Data"
              description="Our database is updated daily with verified company information and contact details."
              color="#49A3C4"
            />
            <FeatureCard 
              icon="🛡️"
              title="GDPR Compliant"
              description="All data collection follows strict privacy regulations and business-to-business guidelines."
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
        <p>© 2024 HUNTERS Lead Generator. All rights reserved.</p>
        <p style={{ marginTop: '10px', fontSize: '13px' }}>
          Data is updated daily • 10M+ companies in database • Premium data sources
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