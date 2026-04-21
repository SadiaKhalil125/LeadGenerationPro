// src/Login.jsx
import { useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Layers, Activity, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from "./AuthContext";
import API_BASE from "./api_base";

export default function AuthenticationPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(true);

  // Loading States
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup State
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }
    setLoadingLogin(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        login(data.user, data.token);
        navigate("/userleadsdashboard");
      } else {
        alert(data.detail || "Invalid email or password");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Check backend.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleSignup = async () => {
    if (!fullName || !signupEmail || !signupPassword) {
      alert("Please fill all fields for signup");
      return;
    }
    setLoadingSignup(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: signupEmail,
          password: signupPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        alert("Signup successful! You can now login.");
        setShowLogin(true);
      } else {
        alert(data.detail || "Signup failed. Try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Check backend.");
    } finally {
      setLoadingSignup(false);
    }
  };

  const Spinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      style={{
        width: '18px',
        height: '18px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '50%',
        borderTop: '2px solid white',
        display: 'inline-block',
      }}
    />
  );

  const inputContainerStyle = {
    position: 'relative',
    marginBottom: '20px',
    width: '100%',
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 18px 14px 45px',
    backgroundColor: 'rgba(73, 163, 196, 0.1)',
    border: '2px solid transparent',
    borderRadius: '14px',
    fontSize: '15px',
    color: '#00364A',
    outline: 'none',
    transition: 'all 0.3s',
  };

  const iconStyle = {
    position: 'absolute',
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#49A3C4',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      overflow: 'hidden'
    }}>
      {/* Homepage Grid Background Pattern */}
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

      {/* Auth Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: '1000px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          backgroundColor: 'white',
          borderRadius: '30px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 54, 74, 0.15)',
          position: 'relative',
          zIndex: 10,
          minHeight: '600px'
        }}
      >
        {/* Left Side: Brand & Visuals */}
        <div style={{
          backgroundColor: '#00364A',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated Background Decor */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity }}
            style={{
              position: 'absolute',
              top: '-10%',
              right: '-10%',
              width: '300px',
              height: '300px',
              backgroundColor: '#49A3C4',
              borderRadius: '50%',
              filter: 'blur(80px)',
            }} 
          />

          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '15px', color: 'white', marginBottom: '80px' }}>
            <div style={{ position: 'relative', width: '40px', height: '20px' }}>
              <Layers size={45} strokeWidth={2.5} style={{ position: 'absolute', top: -12, left: -5 }} />
              <Activity size={28} strokeWidth={2.5} style={{ position: 'absolute', top: -1, left: 5, color: '#49A3C4' }} />
            </div>
            <span style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '1px' }}>SCOUT</span>
          </Link>

          <AnimatePresence mode="wait">
            {showLogin ? (
              <motion.div
                key="text-login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
              >
                <h2 style={{ fontSize: '42px', fontWeight: '800', lineHeight: '1.2', marginBottom: '25px' }}>
                  Insights. <br />
                  Leads. <br />
                  Growth.
                </h2>
                <p style={{ fontSize: '18px', opacity: 0.8, lineHeight: '1.6', maxWidth: '350px' }}>
                  Sign in to gain actionable insights and grow your client base with AI-powered data.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="text-signup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.5 }}
              >
                <h2 style={{ fontSize: '42px', fontWeight: '800', lineHeight: '1.2', marginBottom: '25px' }}>
                  Connect. <br />
                  Capture. <br />
                  Convert.
                </h2>
                <p style={{ fontSize: '18px', opacity: 0.8, lineHeight: '1.6', maxWidth: '350px' }}>
                  Join thousands of teams scaling their lead generation with precision scraping.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Link to="/" style={{ 
            marginTop: 'auto', 
            color: 'rgba(255,255,255,0.7)', 
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onMouseEnter={e => e.target.style.color = 'white'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
          >
            <ArrowLeft size={16} /> Back to homepage
          </Link>
        </div>

        {/* Right Side: Form */}
        <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            {showLogin ? (
              <motion.div
                key="form-login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <h3 style={{ fontSize: '32px', fontWeight: '700', color: '#00364A', marginBottom: '10px' }}>Welcome Back</h3>
                <p style={{ color: '#64748B', marginBottom: '40px' }}>Please enter your details to login.</p>

                <div style={inputContainerStyle}>
                  <Mail style={iconStyle} size={18} />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#49A3C4'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'; }}
                  />
                </div>

                <div style={inputContainerStyle}>
                  <Lock style={iconStyle} size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#49A3C4'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#49A3C4',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <motion.button 
                  onClick={handleLogin}
                  disabled={loadingLogin}
                  whileTap={{ scale: 0.96 }}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    backgroundColor: '#00364A', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '14px', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    transition: 'all 0.3s',
                    boxShadow: '0 10px 25px rgba(0, 54, 74, 0.2)'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#004C66'}
                  onMouseLeave={e => e.target.style.backgroundColor = '#00364A'}
                >
                  {loadingLogin ? <Spinner /> : "Sign In"}
                </motion.button>

                <p style={{ textAlign: 'center', marginTop: '30px', color: '#64748B', fontSize: '15px' }}>
                  Don't have an account? {' '}
                  <button 
                    onClick={() => setShowLogin(false)} 
                    style={{ background: 'none', border: 'none', color: '#49A3C4', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                  >
                    Create Account
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form-signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <h3 style={{ fontSize: '32px', fontWeight: '700', color: '#00364A', marginBottom: '10px' }}>Join Scout</h3>
                <p style={{ color: '#64748B', marginBottom: '40px' }}>Start your lead generation journey today.</p>

                <div style={inputContainerStyle}>
                  <User style={iconStyle} size={18} />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#49A3C4'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'; }}
                  />
                </div>

                <div style={inputContainerStyle}>
                  <Mail style={iconStyle} size={18} />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={signupEmail} 
                    onChange={(e) => setSignupEmail(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#49A3C4'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'; }}
                  />
                </div>

                <div style={inputContainerStyle}>
                  <Lock style={iconStyle} size={18} />
                  <input 
                    type={showSignupPassword ? "text" : "password"} 
                    placeholder="Create Password" 
                    value={signupPassword} 
                    onChange={(e) => setSignupPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#49A3C4'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.1)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#49A3C4',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <motion.button 
                  onClick={handleSignup}
                  disabled={loadingSignup}
                  whileTap={{ scale: 0.96 }}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    backgroundColor: '#00364A', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '14px', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    transition: 'all 0.3s',
                    boxShadow: '0 10px 25px rgba(0, 54, 74, 0.2)'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = '#004C66'}
                  onMouseLeave={e => e.target.style.backgroundColor = '#00364A'}
                >
                  {loadingSignup ? <Spinner /> : "Create Account"}
                </motion.button>

                <p style={{ textAlign: 'center', marginTop: '30px', color: '#64748B', fontSize: '15px' }}>
                  Already have an account? {' '}
                  <button 
                    onClick={() => setShowLogin(true)} 
                    style={{ background: 'none', border: 'none', color: '#49A3C4', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}