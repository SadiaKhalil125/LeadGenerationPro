import { useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { AuthContext } from "./AuthContext";
import API_BASE from "./api_base";

export default function AuthenticationPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate(); // Hook for navigation
  const [showLogin, setShowLogin] = useState(true);

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup State
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        // 1. Update Context
        login(data.user, data.token);
        // 2. Redirect to Dashboard
        navigate("/userleadsdashboard");
      } else {
        alert(data.detail || "Invalid email or password");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Check backend.");
    }
  };

  const handleSignup = async () => {
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
        setShowLogin(true); // Switch to login view
      } else {
        alert(data.detail || "Signup failed. Try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Check backend.");
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#00364A' }}>
      <div className="relative w-full max-w-5xl h-[550px] rounded-2xl shadow-2xl grid grid-cols-2 overflow-hidden backdrop-blur-xl bg-white/40 border border-white/50">
        
        {/* LEFT PANEL */}
        <AnimatePresence mode="wait">
          {showLogin ? (
            <motion.div
              key="welcome-login"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center p-10 backdrop-blur-md border-r border-white/30"
              style={{ background: 'linear-gradient(135deg, rgba(0, 54, 74, 0.7), rgba(0, 54, 74, 0.5))' }}
            >
              <h1 className="text-4xl font-bold mb-4 drop-shadow-lg text-white">Insights. Leads. Growth.</h1>
              <p className="text-lg text-white/90 text-center drop-shadow">Login in to gain actionable insights and grow your client base.</p>
            </motion.div>
          ) : (
            <motion.div
              key="welcome-signup"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center p-10 backdrop-blur-md border-r border-white/30"
              style={{ background: 'linear-gradient(135deg, rgba(0, 54, 74, 0.7), rgba(0, 54, 74, 0.5))' }}
            >
              <h1 className="text-4xl font-bold mb-4 drop-shadow-lg text-white">Connect. Capture. Convert.</h1>
              <p className="text-lg text-white/90 text-center drop-shadow">Unlock the leads that drive your business forward.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL - FORMS */}
        <AnimatePresence mode="wait">
          {showLogin ? (
            <motion.div
              key="form-login"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center p-12 backdrop-blur-sm bg-white/30"
            >
              <h2 className="text-3xl font-bold mb-6 drop-shadow" style={{ color: '#00364A' }}>Login</h2>
              
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ color: '#00364A', backgroundColor: 'rgba(199, 216, 237, 0.5)' }} />
              
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ color: '#00364A', backgroundColor: 'rgba(199, 216, 237, 0.5)' }} />
              
              <button onClick={handleLogin}
                className="w-full py-3 text-white font-semibold rounded-xl backdrop-blur-md border border-white/30 transition shadow-lg hover:opacity-90"
                style={{ backgroundColor: 'rgba(0, 54, 74, 0.8)' }}>Login</button>
              
              <p className="text-center mt-4 drop-shadow" style={{ color: '#00364A' }}>
                Don't have an account? <button onClick={() => setShowLogin(false)} className="font-semibold underline">Sign Up</button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form-signup"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col justify-center p-12 backdrop-blur-sm bg-white/30"
            >
              <h2 className="text-3xl font-bold mb-6 drop-shadow" style={{ color: '#00364A' }}>Sign Up</h2>
              
              <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ color: '#00364A', backgroundColor: 'rgba(199, 216, 237, 0.5)' }} />

              <input type="email" placeholder="Email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ color: '#00364A', backgroundColor: 'rgba(199, 216, 237, 0.5)' }} />

              <input type="password" placeholder="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ color: '#00364A', backgroundColor: 'rgba(199, 216, 237, 0.5)' }} />
             
              <button onClick={handleSignup}
                className="w-full py-3 text-white font-semibold rounded-xl backdrop-blur-md border border-white/30 transition shadow-lg hover:opacity-90"
                style={{ backgroundColor: 'rgba(0, 54, 74, 0.8)' }}>Sign Up</button>
              
              <p className="text-center mt-4 drop-shadow" style={{ color: '#00364A' }}>
                Already have an account? <button onClick={() => setShowLogin(true)} className="font-semibold underline">Login</button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}