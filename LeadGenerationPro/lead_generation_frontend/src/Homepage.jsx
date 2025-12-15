import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Magnet, Clock, LucideHammer, Target, BarChart2, Link2, Bot, Zap, Search, Database, Settings, Cloud, Activity, Layers, Bug, Network } from 'lucide-react';
// import { Target, BarChart2, Link2 } from 'lucide-react';
// import { Globe, Zap } from 'lucide-react';

export default function WebScraperLanding() {
  const [url, setUrl] = useState('');
  const [activePage, setActivePage] = useState('home');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();
  const handleTryNow = () => {
    if (url) {
      alert(`Processing URL: ${url}`);
    } else {
      alert('Please enter a URL first');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // Detect which section is in view
      const sections = ['home', 'about', 'pricing'];
      const scrollPosition = window.scrollY + 200; // Offset for better detection

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActivePage(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
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
          maxWidth: '1400px'
        }}>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#00364A'
          }}
          onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          }}
          >
            {/* <div style={{ position: 'relative', width: '24px', height: '24px' }}>
              <Globe size={24} strokeWidth={2} style={{ position: 'absolute', top: 0, left: 0 }} />
              <Zap size={16} strokeWidth={2} style={{ position: 'absolute', top: 4, left: 4 }} />
            </div>
            SCOUT
          </div> */}
          <div style={{ position: 'relative', width: '40px', height: '24px' }}>
             <Layers size={50} strokeWidth={2} style={{ position: 'absolute', top:-14, left: -5 }} />
             <Activity size={30} strokeWidth={2} style={{ position: 'absolute', top: -2, left: 6 }} />

            </div>
            SCOUT
          </div>
          {/* <div style={{ position: 'relative', width: '40px', height: '24px' }}>
             <Globe size={40} strokeWidth={2} style={{ position: 'absolute', top:-10, left: -5 }} />
             <Bot size={30} strokeWidth={2} style={{ position: 'absolute', top: -2, left: 6 }} />

            </div>
            SCOUT
          </div>  */}
          {/* <div style={{ position: 'relative', width: '40px', height: '24px' }}>
             <Database size={50} strokeWidth={2} style={{ position: 'absolute', top:-14, left: -5 }} />
             <Search size={30} strokeWidth={2} style={{ position: 'absolute', top: -2, left: 6 }} />

            </div>
            SCOUT
          </div>  */}
          {/* <div style={{ position: 'relative', width: '40px', height: '24px' }}>
             <Cloud  size={50} strokeWidth={2} style={{ position: 'absolute', top:-14, left: -5 }} />
             <Settings size={30} strokeWidth={2} style={{ position: 'absolute', top: -2, left: 6 }} />

            </div>
            SCOUT
          </div>  */}
          

          
          {/* Navigation Links - Center */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            <a 
              href="#home" 
              onClick={(e) => {
                e.preventDefault();
                setActivePage('home');
                scrollToSection('home');
              }}
              style={{
                fontWeight: '500',
                color: '#00364A',
                textDecoration: 'none',
                transition: 'all 0.3s',
                padding: '8px 20px',
                borderRadius: '10px',
                backgroundColor: activePage === 'home' ? '#00364A' : 'transparent',
                color: activePage === 'home' ? 'white' : '#00364A'
              }}
              onMouseEnter={(e) => {
                if (activePage !== 'home') {
                  e.target.style.opacity = '0.6';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}>
              Home
            </a>
            <a 
              href="#about" 
              onClick={(e) => {
                e.preventDefault();
                setActivePage('about');
                scrollToSection('about');
              }}
              style={{
                fontWeight: '500',
                color: '#00364A',
                textDecoration: 'none',
                transition: 'all 0.3s',
                padding: '8px 20px',
                borderRadius: '10px',
                backgroundColor: activePage === 'about' ? '#00364A' : 'transparent',
                color: activePage === 'about' ? 'white' : '#00364A'
              }}
              onMouseEnter={(e) => {
                if (activePage !== 'about') {
                  e.target.style.opacity = '0.6';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}>
              About Us
            </a>
            <a 
              href="#pricing" 
              onClick={(e) => {
                e.preventDefault();
                setActivePage('pricing');
                scrollToSection('pricing');
              }}
              style={{
                fontWeight: '500',
                color: '#00364A',
                textDecoration: 'none',
                transition: 'all 0.3s',
                padding: '8px 20px',
                borderRadius: '10px',
                backgroundColor: activePage === 'pricing' ? '#00364A' : 'transparent',
                color: activePage === 'pricing' ? 'white' : '#00364A'
              }}
              onMouseEnter={(e) => {
                if (activePage !== 'pricing') {
                  e.target.style.opacity = '0.6';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1';
              }}>
              Pricing
            </a>
          </nav>
          
          {/* Buttons - Right */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => navigate('/login')} // Navigates to the route defined in App.js
              style={{
                padding: '10px 28px',
                backgroundColor: '#49A3C4',
                color: 'white',
                border: '2px solid #49A3C4', // Added explicit border for hover consistency
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '15px',
                fontFamily: 'inherit' // Ensures font matches
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#49A3C4';
                e.target.style.border = '2px solid #49A3C4';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(73, 163, 196, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#49A3C4';
                e.target.style.color = 'white';
                e.target.style.border = '2px solid #49A3C4';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Login
            </button>
            <button style={{
              padding: '10px 28px',
              backgroundColor: '#00364A',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '15px'
            }}
              onClick={() => {
                document.getElementById('contact us')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#00364A';
              e.target.style.border = '2px solid #00364A';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 54, 74, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#00364A';
              e.target.style.color = 'white';
              e.target.style.border = 'none';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              Contact us
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '80px 60px',
        minHeight: 'calc(100vh - 100px)',
        position: 'relative',
        gap: '60px'
      }}>
        {/* Grid Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 54, 74, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 54, 74, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          pointerEvents: 'none'
        }} />

        {/* Hero Content */}
        <div style={{
          flex: 1,
          maxWidth: '650px',
          position: 'relative',
          zIndex: 10,
          marginLeft: '80px'
        }}>
          <h1 style={{
            fontSize: '58px',
            fontWeight: '800',
            lineHeight: '1.15',
            marginBottom: '25px',
            color: '#00364A',
            textAlign: 'left'
          }}>
            POWERFUL CUSTOMIZED WEB SCRAPER FOR LEAD GENERATION
          </h1>
          
          <p style={{
            fontSize: '20px',
            marginBottom: '10px',
            color: '#00364A',
            opacity: 0.9,
            textAlign: 'left'
          }}>
            Automate data extraction in <span style={{ color: '#49A3C4', fontWeight: '600' }}>20 minutes</span>
          </p>
          
          <p style={{
            fontSize: '18px',
            lineHeight: '1.7',
            marginBottom: '45px',
            color: '#00364A',
            opacity: 0.85,
            textAlign: 'left'
          }}>
            Web Scraper is designed for Lead Generation and Data Extraction to extract large amounts of data and easily integrate with other systems.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '50px'
          }}>
            <button style={{
              padding: '16px 36px',
              backgroundColor: '#00364A',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick = {() => navigate('/quick-extract')}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#00364A';
              e.target.style.border = '2px solid #00364A';
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0, 54, 74, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#00364A';
              e.target.style.color = 'white';
              e.target.style.border = 'none';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              Get started for free
            </button>
            <button style={{
              padding: '16px 36px',
              backgroundColor: 'white',
              color: '#00364A',
              border: '2px solid #00364A',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#00364A';
              e.target.style.color = 'white';
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0, 54, 74, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#00364A';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              <span style={{ fontSize: '20px' }}>✨</span> How it works
            </button>
          </div>

          {/* URL Input Section */}
          <div style={{
            display: 'flex',
            gap: '15px',
            maxWidth: '700px'
          }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a URL to get data"
              style={{
                flex: 1,
                padding: '18px 24px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: 'rgba(73, 163, 196, 0.15)',
                color: '#00364A',
                outline: 'none',
                transition: 'all 0.3s'
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
            <button 
              onClick={handleTryNow}
              style={{
                padding: '18px 40px',
                backgroundColor: 'white',
                color: '#00364A',
                border: '2px solid #00364A',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#00364A';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#00364A';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}>
              💬 Try it now
            </button>
          </div>
        </div>

        {/* Hero Image - Robot */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10
        }}>
          <RobotAnimation />
        </div>
      </section>

    
        {/* Use Cases Section */}
      <section style={{
        padding: '80px 60px',
        backgroundColor: '#E0EFFF'
      }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '60px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            backgroundColor: 'white',
            borderRadius: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0, 54, 74, 0.1)'
          }}>
            <span style={{ color: '#49A3C4', fontSize: '18px' }}>✓</span>
            <span style={{ color: '#49A3C4', fontWeight: '500', fontSize: '16px' }}>Our Vision</span>
          </div>
          <h2 style={{
            fontSize: '42px',
            fontWeight: '800',
            color: '#00364A',
            margin: 0
          }}>
            Use Cases
          </h2>
        </div>

          {/* Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '30px',
            maxWidth: '1400px',
            margin: '0 auto 60px'
          }}>
        
          <UseCaseCard 
            icon={<Globe size={28} color="#fff" />}
            title="Source & Data Extraction"
            description="Select from existing data sources or configure a new one to initiate structured data extraction. The system ensures secure and accurate retrieval, enabling efficient integration into downstream processes."
          />

          <UseCaseCard 
            icon={<Magnet size={28} color="#fff" />}
            title="Entity Extraction"
            description="Define specific entities within your data source and extract data only for them. This focused approach ensures precision, relevance, and reduces unnecessary processing."
          />

          <UseCaseCard 
            icon={<Clock size={28} color="#fff" />}
            title="Automated Scheduling"
            description="Configure extraction tasks for entities or entire sources and automate execution on a monthly, yearly, or custom schedule. Each task handles the complete scraping process for consistent, hands-free data collection."
          />

          <UseCaseCard 
            icon={<LucideHammer size={28} color="#fff" />}
            title="Customization & Support"
            description="Customize data fields, filters, and extraction logic to meet specific requirements. An integrated trained chatbot provides guidance, answers queries, and assists with troubleshooting."
          />

          </div>         
      
          {/* Discord CTA */}
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            backgroundColor: '#49A3C4',
            borderRadius: '20px',
            padding: '30px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 40px rgba(73, 163, 196, 0.3)'
          }}>
            <span style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Explore More Use Cases. Join Our Discord Community!
            </span>
            <button style={{
              padding: '12px 30px',
              backgroundColor: 'white',
              color: '#49A3C4',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}>
              <span style={{ fontSize: '18px' }}>💬</span> Discord
            </button>
          </div>
        </section>
        

      {/* How It Works Section */}
      <section style={{
        padding: '100px 60px',
        backgroundColor: '#7DBBE0'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Section Title */}
          <h2 style={{
            fontSize: '48px',
            fontWeight: '800',
            color: '#00364A',
            textAlign: 'center',
            marginBottom: '80px'
          }}>
            HOW IT WORKS
          </h2>

          {/* Steps Container */}
          <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0',
            backgroundColor: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)'
          }}>
            {/* Progress Line */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '4px',
              backgroundColor: '#49A3C4'
            }} />

            <StepCard 
              number="1"
              title="Paste Website URL"
              bgColor="#7DBBE0"
            />
            <StepCard 
              number="2"
              title="Fetch data"
              bgColor="#7DBBE0"
            />
            <StepCard 
              number="3"
              title="Processing the page"
              bgColor="white"
            />
            <StepCard 
              number="4"
              title="See results"
              bgColor="white"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '100px 60px',
        backgroundColor: '#C7D8ED'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Section Header */}
          <h2 style={{
            fontSize: '42px',
            fontWeight: '800',
            color: '#00364A',
            textAlign: 'center',
            marginBottom: '15px',
            lineHeight: '1.3'
          }}>
            From startups to global teams — extract smarter, grow faster
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#00364A',
            textAlign: 'center',
            marginBottom: '60px',
            opacity: 0.8
          }}>
            Trusted,powerful, precision-driven web scraping solutions that fuel smarter business decisions
          </p>

          {/* Features Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '30px',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 40px'
          }}>
            <FeatureCard 
              icon="📤"
              title="No coding required"
              description="Point and click to extract the data you need in minutes."
            />
            <FeatureCard 
              icon="🔍"
              title="AI-powered monitoring"
              description="Keep your data up to date (and accurate) automatically."
            />
            <FeatureCard 
              icon="🔧"
              title="Custom Built Scrapper"
              description="Built-in scrapper with custom data to make your work more easier"
            />
            <FeatureCard 
              icon="💻"
              title="Extract data from any website"
              description="Built-in bot detection, proxy management, automatic retries, and rate limiting."
            />
            <FeatureCard 
              icon="📊"
              title="Scale with confidence"
              description="Build on a platform designed for limitless scale."
            />
            <FeatureCard 
              icon="💎"
              title="Managed services"
              description="Full-service implementation options for complex projects."
            />
          </div>
        </div>
      </section>

      
      {/* Platform Features Section */}
        <section id="about" style={{
          padding: '100px 60px',
          backgroundColor: '#E0EFFF'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '25px',
              padding: '60px 50px',
              border: '3px solid #00364A',
              boxShadow: '0 15px 50px rgba(0, 54, 74, 0.1)'
            }}>
              {/* Header */}
              <h2 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                marginBottom: '15px',
                textAlign: 'left'
              }}>
                The ultimate data extraction platform
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.75,
                marginBottom: '50px',
                textAlign: 'left'
              }}>
                Reliable and scalable data scraping so you can unlock the data you need.
              </p>

              {/* Three Columns */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '50px'
              }}>
                {/* Extract Column */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '25px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#E0F2FE',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Target size={20} color="#00364A" />
                    </div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#00364A',
                      margin: 0
                    }}>
                      Extract
                    </h3>
                  </div>
                  <FeatureList items={[
                    'AI-powered point-and-click assistant',
                    'Deep scraping',
                    'Solves captchas',
                    'Handles pagination',
                    'Location-based data'
                  ]} />
                </div>

                {/* Monitor Column */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '25px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#E0F2FE',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <BarChart2 size={20} color="#00364A" />
                    </div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#00364A',
                      margin: 0
                    }}>
                      Monitor
                    </h3>
                  </div>
                  <FeatureList items={[
                    'Real-time monitoring and alerts',
                    'Scheduled monitoring',
                    'AI-powered site layout monitoring'
                  ]} />
                </div>

                {/* Integrate Column */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '25px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#E0F2FE',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Link2 size={20} color="#00364A" />
                    </div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#00364A',
                      margin: 0
                    }}>
                      Integrate
                    </h3>
                  </div>
                  <FeatureList items={[
                    'Google Sheets',
                    'Airtable',
                    'Zapier',
                    'API & Webhooks',
                    '...or 7,000+ other apps and tools'
                  ]} />
                </div>
              </div>
            </div>
          </div>
        </section>


      {/* Pricing Section */}
      <section id="pricing" style={{
        padding: '100px 60px',
        backgroundColor: '#7DBBE0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '25px',
            padding: '60px 50px',
            boxShadow: '0 15px 50px rgba(0, 54, 74, 0.1)'
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '42px',
                fontWeight: '800',
                color: '#00364A',
                marginBottom: '15px'
              }}>
                Plans & Pricing
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.75,
                marginBottom: '30px'
              }}>
                Whether your time-saving automation needs are large or small,<br />
                we're here to help you scale.
              </p>
              
              {/* Billing Toggle */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '50px'
              }}>
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '10px 30px',
                    backgroundColor: billingCycle === 'monthly' ? '#49A3C4' : 'transparent',
                    color: billingCycle === 'monthly' ? 'white' : '#49A3C4',
                    border: billingCycle === 'monthly' ? 'none' : '2px solid #49A3C4',
                    borderRadius: '25px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}>
                  MONTHLY
                </button>
                <button 
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    padding: '10px 30px',
                    backgroundColor: billingCycle === 'yearly' ? '#49A3C4' : 'transparent',
                    color: billingCycle === 'yearly' ? 'white' : '#49A3C4',
                    border: billingCycle === 'yearly' ? 'none' : '2px solid #49A3C4',
                    borderRadius: '25px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}>
                  YEARLY
                </button>
              </div>
            </div>

            {/* Pricing Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '30px',
              alignItems: 'stretch'
            }}>
              {/* Starter Plan */}
              <PricingCard 
                price={billingCycle === 'monthly' ? '$19' : '$190'}
                period={billingCycle === 'monthly' ? '/month' : '/year'}
                title="Starter"
                description="Unleash the power of automation."
                features={[
                  'Multi-step Zaps',
                  '3 Premium Apps',
                  '2 Users team'
                ]}
                buttonText="Choose plan"
                isPopular={false}
                cardColor="white"
                billingCycle={billingCycle}
              />

              {/* Professional Plan */}
              <PricingCard 
                price={billingCycle === 'monthly' ? '$54' : '$540'}
                period={billingCycle === 'monthly' ? '/month' : '/year'}
                title="Professional"
                description="Advanced tools to take your work to the next level."
                features={[
                  'Multi-step Zaps',
                  'Unlimited Premium Apps',
                  '50 Users team',
                  'Shared Workspace'
                ]}
                buttonText="Choose plan"
                isPopular={false}
                cardColor="white"
                billingCycle={billingCycle}
              />

              {/* Company Plan */}
              <PricingCard 
                price={billingCycle === 'monthly' ? '$89' : '$890'}
                period={billingCycle === 'monthly' ? '/month' : '/year'}
                title="Company"
                description="Automation plus enterprise-grade features."
                features={[
                  'Multi-step Zap',
                  'Unlimited Premium Apps',
                  'Unlimited Users Team',
                  'Advanced Admin',
                  'Custom Data Retention'
                ]}
                buttonText="Choose plan"
                isPopular={true}
                cardColor="#49A3C4"
                billingCycle={billingCycle}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{
        padding: '100px 60px',
        backgroundColor: '#C7D8ED'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Section Title */}
          <h2 style={{
            fontSize: '48px',
            fontWeight: '800',
            color: '#00364A',
            textAlign: 'center',
            marginBottom: '60px'
          }}>
            FAQ's
          </h2>

          {/* FAQ Items */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <FAQItem 
              question="What is web scraping and how does it work?"
              answer="Web scraping is an automated method of extracting data from websites. Our tool uses AI-powered technology to navigate web pages, identify relevant data, and extract it in a structured format. You simply point and click on the data you need, and our system handles the rest - including pagination, captchas, and data formatting."
            />
            <FAQItem 
              question="Do I need coding skills to use this platform?"
              answer="No coding skills are required! Our platform is designed with a user-friendly interface that allows you to extract data through simple point-and-click actions. However, for advanced users, we also provide API access and custom scripting options for more complex scraping tasks."
            />
            <FAQItem 
              question="How does the pricing work for different plans?"
              answer="We offer three flexible pricing tiers to suit different needs. The Starter plan ($19/month) is perfect for individuals, the Professional plan ($54/month) includes advanced features for teams, and the Company plan ($89/month) offers enterprise-grade features with unlimited users. You can save 20% by choosing annual billing."
            />
            <FAQItem 
              question="Is web scraping legal and ethical?"
              answer="Web scraping is legal when done responsibly and in compliance with website terms of service and applicable laws. Our platform includes built-in rate limiting and respects robots.txt files. We recommend always reviewing the target website's terms of service and ensuring your use case complies with data protection regulations like GDPR."
            />
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section 
      id="contact us"
      style={{
        padding: '60px 60px',
        backgroundColor: '#E0EFFF',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Decorative Lines */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: `
            linear-gradient(45deg, #49A3C4 1px, transparent 1px),
            linear-gradient(-45deg, #49A3C4 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none'
        }} />
        
        {/* Decorative Circles */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          border: '3px solid #49A3C4',
          opacity: 0.2
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '3px solid #49A3C4',
          opacity: 0.2
        }} />

        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '60px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Left Side - Contact Form */}
          <div style={{
            flex: 1,
            maxWidth: '600px'
          }}>
            <h3 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#00364A',
              marginBottom: '30px'
            }}>
              Contact us via your Email
            </h3>
            <div style={{
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              <input
                type="email"
                placeholder="Email@gmail.com"
                style={{
                  flex: 1,
                  padding: '18px 24px',
                  border: '2px solid #D1D5DB',
                  borderRadius: '12px',
                  fontSize: '16px',
                  color: '#00364A',
                  outline: 'none',
                  transition: 'all 0.3s',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#49A3C4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button style={{
                padding: '18px 40px',
                backgroundColor: '#00364A',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#004d66';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00364A';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}>
                Contact Us
              </button>
            </div>
          </div>

          {/* Right Side - Robot Icon */}
          <div style={{
            width: '150px',
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ContactRobot />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '80px 60px 60px',
        backgroundColor: '#C7D8ED',
        position: 'relative'
      }}>
        {/* Decorative Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(73, 163, 196, 0.1) 10px, rgba(73, 163, 196, 0.1) 20px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Main Footer Content */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '80px',
            gap: '100px'
            
          }}>
          
            <div style={{
              flex: '0 0 auto'
            }}> 
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '30px'
              }}
              onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              }}>
                  
                <div style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  flexShrink: 0
                }}>
                <Layers
                  size={36}
                  strokeWidth={2.5}
                  color="#00364A"
                />
                <Activity
                  size={22}
                  strokeWidth={2.5}
                  color="#49A3C4"
                  style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)'
                }}/>
              </div>

              {/* Brand Name */}
              <h3 style={{
                fontSize: '36px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0
              }}>
                SCOUT
              </h3>  
            </div>


              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.8,
                lineHeight: '1.6',
                marginBottom: '35px',
                maxWidth: '300px'
              }}>
                Join the Early Access Program
              </p>
              {/* Payment Methods */}
              <div style={{
                display: 'flex',
                gap: '15px',
                alignItems: 'center'
              }}>
                <div style={{
                  width: '70px',
                  height: '45px',
                  backgroundColor: '#000000',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '30px',
                    height: '30px',
                    backgroundColor: '#EB001B',
                    borderRadius: '50%',
                    left: '15px'
                  }} />
                  <div style={{
                    position: 'absolute',
                    width: '30px',
                    height: '30px',
                    backgroundColor: '#F79E1B',
                    borderRadius: '50%',
                    right: '15px',
                    opacity: 0.9
                  }} />
                </div>
                <div style={{
                  width: '70px',
                  height: '45px',
                  backgroundColor: '#000000',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontStyle: 'italic',
                  letterSpacing: '1px'
                }}>
                  VISA
                </div>
                <div style={{
                  width: '70px',
                  height: '45px',
                  backgroundColor: '#000000',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'white'
                }}>
                  P
                </div>
              </div>
            </div>

            {/* Center - Navigation */}
            <div style={{
              display: 'flex',
              gap: '120px',
              flex: '1',
              justifyContent: 'center'
            }}>
              <div>
                <a href="#" style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  textDecoration: 'none',
                  display: 'block',
                  marginBottom: '20px',
                  transition: 'color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#49A3C4'}
                onMouseLeave={(e) => e.target.style.color = '#00364A'}>
                  Home
                </a>
                <a href="#" style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  textDecoration: 'none',
                  display: 'block',
                  marginBottom: '20px',
                  transition: 'color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#49A3C4'}
                onMouseLeave={(e) => e.target.style.color = '#00364A'}>
                  Blog
                </a>
                <a href="#" style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#49A3C4'}
                onMouseLeave={(e) => e.target.style.color = '#00364A'}>
                  Pricing
                </a>
              </div>

              <div>
                <a href="#" style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#00364A',
                  textDecoration: 'none',
                  display: 'block',
                  transition: 'color 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#49A3C4'}
                onMouseLeave={(e) => e.target.style.color = '#00364A'}>
                  Redeem Code
                </a>
              </div>
            </div>

            {/* Right Side - Social */}
            <div style={{
              flex: '0 0 auto'
            }}>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#00364A',
                marginBottom: '25px'
              }}>
                Connect with us
              </h4>
              <div style={{
                display: 'flex',
                gap: '15px'
              }}>
                <a href="#" style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: 'rgba(0, 54, 74, 0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#49A3C4';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(73, 163, 196, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 54, 74, 0.1)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <span style={{ fontSize: '22px', color: '#00364A', fontWeight: '600' }}>𝕏</span>
                </a>
                <a href="#" style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: 'rgba(0, 54, 74, 0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#49A3C4';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(73, 163, 196, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 54, 74, 0.1)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <span style={{ fontSize: '20px', color: '#00364A' }}>💬</span>
                </a>
                <a href="#" style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: 'rgba(0, 54, 74, 0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#49A3C4';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(73, 163, 196, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 54, 74, 0.1)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <span style={{ fontSize: '20px', color: '#00364A' }}>▶</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '40px',
            paddingTop: '40px',
            borderTop: '1px solid rgba(0, 54, 74, 0.15)'
          }}>
            <p style={{
              fontSize: '15px',
              color: '#00364A',
              opacity: 0.7,
              margin: 0
            }}>
              © 2025 Copyright by BrowserAct™ All rights reserved
            </p>
            <span style={{
              fontSize: '15px',
              color: '#00364A',
              opacity: 0.5
            }}>
              •
            </span>
            <a href="#" style={{
              fontSize: '15px',
              color: '#00364A',
              textDecoration: 'underline',
              opacity: 0.7,
              transition: 'opacity 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}>
              Terms
            </a>
            <span style={{
              fontSize: '15px',
              color: '#00364A',
              opacity: 0.5
            }}>
              •
            </span>
            <a href="#" style={{
              fontSize: '15px',
              color: '#00364A',
              textDecoration: 'underline',
              opacity: 0.7,
              transition: 'opacity 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}>
              Privacy
            </a>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '50px',
            height: '50px',
            backgroundColor: '#49A3C4',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(73, 163, 196, 0.4)',
            transition: 'all 0.3s',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#00364A';
            e.target.style.transform = 'translateY(-5px)';
            e.target.style.boxShadow = '0 6px 20px rgba(0, 54, 74, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#49A3C4';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px rgba(73, 163, 196, 0.4)';
          }}>
          ↑
        </button>
      )}
    </div>
  );
}

function ContactRobot() {
  return (
    <div style={{
      width: '100px',
      height: '100px',
      position: 'relative'
    }}>
      {/* Robot Head */}
      <div style={{
        width: '70px',
        height: '60px',
        backgroundColor: 'white',
        borderRadius: '15px',
        margin: '0 auto',
        position: 'relative',
        boxShadow: '0 4px 15px rgba(0, 54, 74, 0.15)',
        border: '3px solid #00364A'
      }}>
        {/* Antenna */}
        <div style={{
          width: '3px',
          height: '20px',
          backgroundColor: '#00364A',
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            backgroundColor: '#49A3C4',
            borderRadius: '50%',
            position: 'absolute',
            top: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 8px rgba(73, 163, 196, 0.6)'
          }} />
        </div>
        
        {/* Eyes */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '18px',
          paddingTop: '18px'
        }}>
          <div style={{
            width: '18px',
            height: '18px',
            backgroundColor: '#49A3C4',
            borderRadius: '50%'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#00364A',
              borderRadius: '50%',
              margin: '3px 0 0 3px'
            }}>
              <div style={{
                width: '3px',
                height: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                margin: '2px 0 0 2px'
              }} />
            </div>
          </div>
          <div style={{
            width: '18px',
            height: '18px',
            backgroundColor: '#49A3C4',
            borderRadius: '50%'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#00364A',
              borderRadius: '50%',
              margin: '3px 0 0 3px'
            }}>
              <div style={{
                width: '3px',
                height: '3px',
                backgroundColor: 'white',
                borderRadius: '50%',
                margin: '2px 0 0 2px'
              }} />
            </div>
          </div>
        </div>

        {/* Smile */}
        <div style={{
          width: '20px',
          height: '2px',
          backgroundColor: '#00364A',
          borderRadius: '2px',
          margin: '8px auto 0'
        }} />
      </div>

      {/* Robot Body */}
      <div style={{
        width: '50px',
        height: '35px',
        backgroundColor: 'white',
        borderRadius: '12px',
        margin: '8px auto 0',
        boxShadow: '0 4px 15px rgba(0, 54, 74, 0.15)',
        border: '3px solid #00364A',
        position: 'relative'
      }}>
        {/* Chest Line */}
        <div style={{
          width: '25px',
          height: '2px',
          backgroundColor: '#49A3C4',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '1px'
        }} />
      </div>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '3px solid #49A3C4',
      overflow: 'hidden',
      transition: 'all 0.3s'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '25px 30px',
          backgroundColor: 'white',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FBFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}>
        <span style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#00364A',
          textAlign: 'left'
        }}>
          {question}
        </span>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: '#00364A',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          color: 'white',
          fontWeight: '700',
          transition: 'all 0.3s',
          flexShrink: 0,
          marginLeft: '20px'
        }}>
          {isOpen ? '−' : '+'}
        </div>
      </button>
      
      <div style={{
        maxHeight: isOpen ? '500px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.4s ease-in-out'
      }}>
        <div style={{
          padding: '0 30px 25px 30px',
          fontSize: '15px',
          lineHeight: '1.7',
          color: '#00364A',
          opacity: 0.8
        }}>
          {answer}
        </div>
      </div>
    </div>
  );
}

function PricingCard({ price, period, title, description, features, buttonText, isPopular, cardColor, billingCycle }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isCompanyPlan = cardColor === '#49A3C4';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: cardColor,
        borderRadius: '20px',
        padding: '40px 30px',
        position: 'relative',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 20px 50px rgba(0, 54, 74, 0.2)' : '0 10px 30px rgba(0, 54, 74, 0.1)',
        border: isCompanyPlan ? 'none' : '2px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column'
      }}>
      {/* Popular Badge */}
      {isPopular && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          backgroundColor: 'white',
          color: '#49A3C4',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '0.5px'
        }}>
          MOST POPULAR
        </div>
      )}

      {/* Price */}
      <div style={{
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          marginBottom: '10px'
        }}>
          <span style={{
            fontSize: '48px',
            fontWeight: '800',
            color: isCompanyPlan ? 'white' : '#00364A',
            transition: 'all 0.3s'
          }}>
            {price}
          </span>
          <span style={{
            fontSize: '16px',
            color: isCompanyPlan ? 'white' : '#00364A',
            opacity: 0.7,
            transition: 'all 0.3s'
          }}>
            {period}
          </span>
        </div>

        {/* Savings Badge for Yearly */}
        {billingCycle === 'yearly' && (
          <div style={{
            display: 'inline-block',
            backgroundColor: isCompanyPlan ? 'rgba(255, 255, 255, 0.2)' : '#E0F2FE',
            color: isCompanyPlan ? 'white' : '#49A3C4',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '10px'
          }}>
            Save 20%
          </div>
        )}

        {/* Title */}
        <h3 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: isCompanyPlan ? 'white' : '#00364A',
          marginBottom: '10px'
        }}>
          {title}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: '14px',
          color: isCompanyPlan ? 'white' : '#00364A',
          opacity: 0.8,
          lineHeight: '1.5',
          marginBottom: '30px'
        }}>
          {description}
        </p>
      </div>

      {/* Features */}
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: '0 0 30px 0',
        flex: 1
      }}>
        {features.map((feature, index) => (
          <li key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '15px',
            fontSize: '15px',
            color: isCompanyPlan ? 'white' : '#00364A'
          }}>
            <span style={{
              color: isCompanyPlan ? 'white' : '#49A3C4',
              fontSize: '16px'
            }}>✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <button style={{
        padding: '14px 30px',
        backgroundColor: isCompanyPlan ? 'white' : '#4D7280',
        color: isCompanyPlan ? '#49A3C4' : 'white',
        border: 'none',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '15px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        if (isCompanyPlan) {
          e.target.style.backgroundColor = '#F0F9FF';
        } else {
          e.target.style.backgroundColor = '#3D5A66';
        }
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = isCompanyPlan ? 'white' : '#4D7280';
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = 'none';
      }}>
        {buttonText}
      </button>
    </div>
  );
}

function FeatureList({ items }) {
  return (
    <ul style={{
      listStyle: 'none',
      padding: 0,
      margin: 0
    }}>
      {items.map((item, index) => (
        <li key={index} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          marginBottom: '12px',
          fontSize: '15px',
          color: '#00364A',
          lineHeight: '1.6'
        }}>
          <span style={{
            color: '#49A3C4',
            fontSize: '18px',
            marginTop: '2px'
          }}>→</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureCard({ icon, title, description }) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Icon mapping with better visuals
  const iconMap = {
    '📤': '↗',
    '🔍': '🔎',
    '🔧': '⚙',
    '💻': '🖥',
    '📊': '📈',
    '💎': '⭐'
  };

  const displayIcon = iconMap[icon] || icon;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '35px 30px',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 15px 40px rgba(0, 54, 74, 0.15)' : '0 8px 25px rgba(0, 54, 74, 0.08)',
        cursor: 'pointer',
        border: '2px solid rgba(77, 114, 128, 0.1)'
      }}>
      {/* Icon */}
      <div style={{
        width: '56px',
        height: '56px',
        backgroundColor: '#4D7280',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        fontSize: '28px',
        color: 'white',
        fontWeight: '700'
      }}>
        {displayIcon}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: '20px',
        fontWeight: '700',
        color: '#00364A',
        marginBottom: '12px'
      }}>
        {title}
      </h3>

      {/* Description */}
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

function StepCard({ number, title, bgColor }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: bgColor,
        padding: '60px 40px',
        textAlign: 'center',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
        cursor: 'pointer',
        position: 'relative'
      }}>
      {/* Step Number */}
      <div style={{
        fontSize: '18px',
        fontWeight: '800',
        color: '#00364A',
        marginBottom: '15px',
        letterSpacing: '1px'
      }}>
        STEP {number}
      </div>

      {/* Step Title */}
      <div style={{
        fontSize: '16px',
        fontWeight: '500',
        color: '#00364A',
        lineHeight: '1.5'
      }}>
        {title}
      </div>

      {/* Hover indicator */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '6px',
          backgroundColor: '#49A3C4'
        }} />
      )}
    </div>
  );
}
function UseCaseCard({ icon, title, description }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(73, 163, 196, 0.3))',
        borderRadius: '20px',
        padding: '40px 30px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 15px 40px rgba(0, 54, 74, 0.2)' : '0 8px 25px rgba(0, 54, 74, 0.1)',
        cursor: 'pointer'
      }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '120px',
        height: '120px',
        opacity: 0.1,
        backgroundImage: `
          linear-gradient(45deg, #00364A 25%, transparent 25%),
          linear-gradient(-45deg, #00364A 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #00364A 75%),
          linear-gradient(-45deg, transparent 75%, #00364A 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }} />

      {/* Icon */}
      <div style={{
        width: '60px',
        height: '60px',
        background: 'linear-gradient(135deg, #49A3C4, #7DBBE0)',
        borderRadius: '25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 4px 15px rgba(73, 163, 196, 0.3)',
        fontSize: '28px',
        color: '#fff',        // Ensures icon is bright and outline-free
        lineHeight: 1
        
      
      }}>

        {icon}
      </div>
      {/* Title */}
      <h3 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#00364A',
        marginBottom: '15px',
        position: 'relative',
        zIndex: 1
      }}>
        {title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: '15px',
        lineHeight: '1.7',
        color: '#00364A',
        opacity: 0.85,
        margin: 0,
        position: 'relative',
        zIndex: 1
      }}>
        {description}
      </p>
    </div>
  );
}

function RobotAnimation() {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const [currentThought, setCurrentThought] = React.useState('');
  const navigate = useNavigate();
  const thoughts = [
    "How can I help you?",
    "Need assistance?",
    "Let's chat!",
    "Ready to help! 👋",
    "Ask me anything!",
    "I'm here to assist!",
    "Questions? Click me!",
    "Your AI assistant 🤖",
    "Let's get started!",
    "Click for support!"
  ];

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculateEyePosition = (robotX, robotY) => {
    const dx = mousePosition.x - robotX;
    const dy = mousePosition.y - robotY;
    const angle = Math.atan2(dy, dx);
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy) / 100, 5);
    
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
    setCurrentThought(randomThought);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleRobotClick = () => {
    navigate('/chatbot');
    // window.open('/chatbot', '_blank');
  };

  const handleRobotMouseEnter = () => {
    handleMouseEnter();
  };

  const handleRobotMouseLeave = () => {
    handleMouseLeave();
  };

  return (
    <div 
      onMouseEnter={handleRobotMouseEnter}
      onMouseLeave={handleRobotMouseLeave}
      onClick={handleRobotClick}
      style={{
        width: '420px',
        height: '420px',
        background: 'linear-gradient(135deg, rgba(73, 163, 196, 0.35), rgba(255, 255, 255, 0.6))',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: isHovered ? '0 30px 80px rgba(73, 163, 196, 0.5)' : '0 25px 70px rgba(73, 163, 196, 0.35)',
        animation: 'float 3s ease-in-out infinite',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)'
      }}>
      
      {/* Thought Cloud */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '15px 25px',
          borderRadius: '20px',
          boxShadow: '0 8px 25px rgba(0, 54, 74, 0.2)',
          fontSize: '15px',
          fontWeight: '600',
          color: '#00364A',
          whiteSpace: 'nowrap',
          animation: 'fadeIn 0.3s ease-in-out',
          zIndex: 100,
          textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            {currentThought}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#49A3C4',
            fontWeight: '500'
          }}>
            Click on me to get help! 💬
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0',
            height: '0',
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '10px solid white'
          }} />
        </div>
      )}

      <div style={{ position: 'relative', width: '180px', height: '210px' }}>
        {/* Robot Head */}
        <div style={{
          width: '105px',
          height: '85px',
          backgroundColor: 'white',
          borderRadius: '22px',
          margin: '0 auto',
          position: 'relative',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.12)'
        }}>
          {/* Antenna */}
          <div style={{
            width: '4px',
            height: '32px',
            backgroundColor: '#00364A',
            position: 'absolute',
            top: '-32px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              backgroundColor: '#49A3C4',
              borderRadius: '50%',
              position: 'absolute',
              top: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'blink 2s infinite',
              boxShadow: '0 0 10px rgba(73, 163, 196, 0.5)'
            }} />
          </div>
          
          {/* Eyes */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '28px',
            paddingTop: '28px'
          }}>
            <InteractiveEye mousePosition={mousePosition} position="left" />
            <InteractiveEye mousePosition={mousePosition} position="right" />
          </div>

          {/* Mouth - animated based on hover */}
          <div style={{
            width: '30px',
            height: isHovered ? '8px' : '3px',
            backgroundColor: '#00364A',
            borderRadius: '10px',
            margin: '12px auto 0',
            transition: 'all 0.3s',
            transform: isHovered ? 'scaleX(1.2)' : 'scaleX(1)'
          }} />
        </div>

        {/* Arms */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          justifyContent: 'space-between',
          width: '150px',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          <div style={{
            width: '28px',
            height: '65px',
            backgroundColor: 'white',
            borderRadius: '14px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
            transform: isHovered ? 'rotate(-35deg)' : 'rotate(-18deg)',
            transition: 'transform 0.3s'
          }} />
          <div style={{
            width: '28px',
            height: '65px',
            backgroundColor: 'white',
            borderRadius: '14px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
            transform: isHovered ? 'rotate(35deg)' : 'rotate(18deg)',
            transition: 'transform 0.3s'
          }} />
        </div>

        {/* Robot Body */}
        <div style={{
          width: '88px',
          height: '75px',
          backgroundColor: 'white',
          borderRadius: '18px',
          margin: '12px auto 0',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.12)',
          position: 'relative'
        }}>
          {/* Chest lines */}
          <div style={{
            position: 'absolute',
            width: '42px',
            height: '3px',
            backgroundColor: '#49A3C4',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '2px'
          }} />
          <div style={{
            position: 'absolute',
            width: '30px',
            height: '2px',
            backgroundColor: '#49A3C4',
            opacity: 0.5,
            top: 'calc(50% - 10px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '2px'
          }} />
          <div style={{
            position: 'absolute',
            width: '30px',
            height: '2px',
            backgroundColor: '#49A3C4',
            opacity: 0.5,
            top: 'calc(50% + 10px)',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '2px'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function InteractiveEye({ mousePosition, position }) {
  const eyeRef = React.useRef(null);
  const [eyePosition, setEyePosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (eyeRef.current) {
      const rect = eyeRef.current.getBoundingClientRect();
      const eyeCenterX = rect.left + rect.width / 2;
      const eyeCenterY = rect.top + rect.height / 2;
      
      const dx = mousePosition.x - eyeCenterX;
      const dy = mousePosition.y - eyeCenterY;
      const angle = Math.atan2(dy, dx);
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy) / 80, 4);
      
      setEyePosition({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      });
    }
  }, [mousePosition]);

  return (
    <div 
      ref={eyeRef}
      style={{
        width: '26px',
        height: '26px',
        backgroundColor: '#49A3C4',
        borderRadius: '50%',
        position: 'relative',
        overflow: 'hidden'
      }}>
      <div style={{
        width: '11px',
        height: '11px',
        backgroundColor: '#00364A',
        borderRadius: '50%',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${eyePosition.x}px), calc(-50% + ${eyePosition.y}px))`,
        transition: 'transform 0.1s ease-out'
      }}>
        <div style={{
          width: '5px',
          height: '5px',
          backgroundColor: 'white',
          borderRadius: '50%',
          position: 'absolute',
          top: '2px',
          left: '2px'
        }} />
      </div>
    </div>
  );
}