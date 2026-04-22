// src/components/Header.jsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Layers, Activity, ChevronDown, LogOut, Menu } from 'lucide-react';
import { AuthContext } from '../AuthContext';

const Header = ({ activeTab, onToggleSidebar, fullWidth, title }) => {
  const { user, logout } = useContext(AuthContext);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derive initials from name (e.g., "John Doe" -> "JD")
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const navItemStyle = (tabName) => ({
    fontWeight: '500',
    color: '#00364A',
    textDecoration: 'none',
    transition: 'all 0.3s',
    padding: '8px 16px',
    borderRadius: '10px',
    backgroundColor: activeTab === tabName ? '#00364A' : 'transparent',
    color: activeTab === tabName ? 'white' : '#00364A',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    border: 'none',
  });

  const dropdownItemStyle = {
    padding: '12px 20px',
    color: '#00364A',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s',
    cursor: 'pointer',
    width: '100%',
    background: 'none',
    border: 'none',
  };

  const buttonStyle = (isPrimary) => ({
    padding: '10px 24px',
    backgroundColor: isPrimary ? '#00364A' : '#49A3C4',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '14px',
  });

  const handleMouseEnter = (e, tabName) => {
    if (activeTab !== tabName) {
      e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.1)';
    }
  };

  const handleMouseLeave = (e, tabName) => {
    if (activeTab !== tabName) {
      e.target.style.backgroundColor = 'transparent';
    }
  };

  const handleNavClick = (e, hash) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If not on homepage, navigate to homepage with hash
      navigate(`/#${hash}`);
    }
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px 60px',
      position: 'relative',
      zIndex: 100
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '12px 30px',
        boxShadow: '0 4px 20px rgba(0, 54, 74, 0.1)',
        width: '100%',
        maxWidth: fullWidth ? '100%' : '1600px'
      }}>
        {/* Logo & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              style={{
                background: 'none',
                border: 'none',
                color: '#00364A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 54, 74, 0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Menu size={24} />
            </button>
          )}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#00364A' }}>
            <div style={{ position: 'relative', width: '40px', height: '24px' }}>
              <Layers size={50} strokeWidth={2} style={{ position: 'absolute', top: -14, left: -5 }} />
              <Activity size={30} strokeWidth={2} style={{ position: 'absolute', top: -2, left: 6 }} />
            </div>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>SCOUT</span>
          </Link>
          {title && (
            <>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(0, 54, 74, 0.15)', margin: '0 5px' }} />
              <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', margin: 0 }}>{title}</h1>
            </>
          )}
        </div>

        {/* Dynamic Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={navItemStyle('home')}
            onMouseEnter={(e) => handleMouseEnter(e, 'home')}
            onMouseLeave={(e) => handleMouseLeave(e, 'home')}>
            Home
          </Link>
          <a href="/#about" onClick={(e) => handleNavClick(e, 'about')} style={navItemStyle('about')}
            onMouseEnter={(e) => handleMouseEnter(e, 'about')}
            onMouseLeave={(e) => handleMouseLeave(e, 'about')}>
            About Us
          </a>
          <a href="/#pricing" onClick={(e) => handleNavClick(e, 'pricing')} style={navItemStyle('pricing')}
            onMouseEnter={(e) => handleMouseEnter(e, 'pricing')}
            onMouseLeave={(e) => handleMouseLeave(e, 'pricing')}>
            Pricing
          </a>

          {/* Core Product Links - only if user is logged in */}
          {user && (
            <>
              <Link to="/userleadsdashboard" style={navItemStyle('leads')}
                onMouseEnter={(e) => handleMouseEnter(e, 'leads')}
                onMouseLeave={(e) => handleMouseLeave(e, 'leads')}>
                Dashboard
              </Link>
              <Link to="/outreach" style={navItemStyle('outreach')}
                onMouseEnter={(e) => handleMouseEnter(e, 'outreach')}
                onMouseLeave={(e) => handleMouseLeave(e, 'outreach')}>
                Outreach
              </Link>
              <Link to="/enrichment" style={navItemStyle('enrichment')}
                onMouseEnter={(e) => handleMouseEnter(e, 'enrichment')}
                onMouseLeave={(e) => handleMouseLeave(e, 'enrichment')}>
                Enrichment
              </Link>

              <div style={{ position: 'relative' }} ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  style={navItemStyle('more')}
                  onMouseEnter={(e) => handleMouseEnter(e, 'more')}
                  onMouseLeave={(e) => handleMouseLeave(e, 'more')}
                >
                  More <ChevronDown size={14} style={{ transform: isMoreOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                </button>

                {isMoreOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '10px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 54, 74, 0.15)',
                    minWidth: '200px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 54, 74, 0.05)'
                  }}>
                    <Link to="/chatbot" style={dropdownItemStyle} onClick={() => setIsMoreOpen(false)} onMouseEnter={e => e.target.style.background = '#F0F7FF'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                      AI Chatbot
                    </Link>
                    <Link to="/quick-extract" style={dropdownItemStyle} onClick={() => setIsMoreOpen(false)} onMouseEnter={e => e.target.style.background = '#F0F7FF'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                      Quick Extract
                    </Link>
                    <Link to="/userleadsdashboard" style={dropdownItemStyle} onClick={() => setIsMoreOpen(false)} onMouseEnter={e => e.target.style.background = '#F0F7FF'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                      Dashboard
                    </Link>
                    <div style={{ borderTop: '1px solid rgba(0,54,74,0.05)' }} />
                    <button onClick={logout} style={{ ...dropdownItemStyle, color: '#EF4444' }} onMouseEnter={e => e.target.style.background = '#FFF5F5'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Right Side Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>{user.name}</div>
                <div style={{ fontSize: '13px', color: '#49A3C4' }}>Premium Plan</div>
              </div>
              <div style={{
                width: '45px', height: '45px',
                backgroundColor: '#49A3C4',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: '600', fontSize: '18px'
              }}>
                {getInitials(user.name)}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => navigate('/login')}
                style={buttonStyle(false)}
                onMouseEnter={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.color = '#49A3C4'; e.target.style.boxShadow = '0 4px 12px rgba(73, 163, 196, 0.3)'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = '#49A3C4'; e.target.style.color = 'white'; e.target.style.boxShadow = 'none'; }}
              >
                Login
              </button>
              <button
                onClick={() => handleNavClick({ preventDefault: () => { } }, 'contact us')}
                style={buttonStyle(true)}
                onMouseEnter={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.color = '#00364A'; e.target.style.border = '2px solid #00364A'; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = '#00364A'; e.target.style.color = 'white'; e.target.style.border = 'none'; }}
              >
                Contact us
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
