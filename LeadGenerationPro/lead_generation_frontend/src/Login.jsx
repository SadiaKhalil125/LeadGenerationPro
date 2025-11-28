import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthenticationPage() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="w-full h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#00364A' }}>
      {/* Glass card container */}
      <div className="relative w-full max-w-5xl h-[550px] rounded-2xl shadow-2xl grid grid-cols-2 overflow-hidden backdrop-blur-xl bg-white/40 border border-white/50">
        
        {/* LEFT PANEL - WELCOME SECTION */}
        <AnimatePresence mode="wait">
          {showLogin ? (
            <motion.div
              key="welcome-login"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center p-10 backdrop-blur-md border-r border-white/30"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 54, 74, 0.7), rgba(0, 54, 74, 0.5))'

                // background: 'linear-gradient(135deg, rgba(199, 216, 237, 0.6), rgba(199, 216, 237, 0.4))'
              }}
            >
              {/* <h1 className="text-4xl font-bold mb-4 drop-shadow-lg" style={{ color: '#00364A' }}> */}
              <h1 className="text-4xl font-bold mb-4 drop-shadow-lg text-white">
              
                Insights. 
                Leads. 
                Growth.
              </h1>
              {/* <p className="text-lg text-center drop-shadow" style={{ color: '#00364A', opacity: 0.8 }}> */}
              <p className="text-lg text-white/90 text-center drop-shadow">
              
                Login in to gain actionable insights and grow your client base.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="welcome-signup"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center p-10 backdrop-blur-md border-r border-white/30"
              style={{
                // background: 'linear-gradient(135deg, rgba(199, 216, 237, 0.6), rgba(199, 216, 237, 0.4))'

                background: 'linear-gradient(135deg, rgba(0, 54, 74, 0.7), rgba(0, 54, 74, 0.5))'
              }}
            >
              <h1 className="text-4xl font-bold mb-4 drop-shadow-lg text-white">
              {/* <h1 className="text-4xl font-bold mb-4 drop-shadow-lg" style={{ color: '#00364A' }}> */}
              
                Connect. Capture. Convert.
              </h1>
              {/* <p className="text-lg text-center drop-shadow" style={{ color: '#00364A', opacity: 0.8 }}> */}

              <p className="text-lg text-white/90 text-center drop-shadow">
                Unlock the leads that drive your business forward.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT PANEL - FORM SECTION */}
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
              <h2 className="text-3xl font-bold mb-6 drop-shadow" style={{ color: '#00364A' }}>
                Login
              </h2>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ 
                  color: '#00364A',
                  backgroundColor: 'rgba(199, 216, 237, 0.5)'
                }}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ 
                  color: '#00364A',
                  backgroundColor: 'rgba(199, 216, 237, 0.5)'
                }}
              />
              
              <button 
                className="w-full py-3 text-white font-semibold rounded-xl backdrop-blur-md border border-white/30 transition shadow-lg hover:opacity-90"
                style={{ backgroundColor: 'rgba(0, 54, 74, 0.8)' }}
              >
                Login
              </button>
              <p className="text-center mt-4 drop-shadow" style={{ color: '#00364A' }}>
                Don't have an account?{" "}
                <button
                  onClick={() => setShowLogin(false)}
                  className="font-semibold px-3 py-1 rounded-lg backdrop-blur-sm border border-white/40 transition hover:bg-white/40"
                  style={{ 
                    backgroundColor: 'rgba(199, 216, 237, 0.5)',
                    color: '#00364A'
                  }}
                >
                  Sign Up
                </button>
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
              <h2 className="text-3xl font-bold mb-6 drop-shadow" style={{ color: '#00364A' }}>
                Sign Up
              </h2>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ 
                  color: '#00364A',
                  backgroundColor: 'rgba(199, 216, 237, 0.5)'
                }}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ 
                  color: '#00364A',
                  backgroundColor: 'rgba(199, 216, 237, 0.5)'
                }}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
                style={{ 
                  color: '#00364A',
                  backgroundColor: 'rgba(199, 216, 237, 0.5)'
                }}
              />
             
              <button 
                className="w-full py-3 text-white font-semibold rounded-xl backdrop-blur-md border border-white/30 transition shadow-lg hover:opacity-90"
                style={{ backgroundColor: 'rgba(0, 54, 74, 0.8)' }}
              >
                Sign Up
              </button>
              <p className="text-center mt-4 drop-shadow" style={{ color: '#00364A' }}>
                Already have an account?{" "}
                <button
                  onClick={() => setShowLogin(true)}
                  className="font-semibold px-3 py-1 rounded-lg backdrop-blur-sm border border-white/40 transition hover:bg-white/40"
                  style={{ 
                    backgroundColor: 'rgba(199, 216, 237, 0.5)',
                    color: '#00364A'
                  }}
                >
                  Login
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";

// export default function AuthenticationPage() {
//   const [showLogin, setShowLogin] = useState(true);

//   return (
//     <div className="w-full h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#00364A' }}>
//       {/* Glass card container */}
//       <div className="relative w-full max-w-5xl h-[550px] rounded-2xl shadow-4xl grid grid-cols-2 overflow-hidden backdrop-blur-6xl bg-teal-100/30 border border-teal-950/50">
        
//         {/* LEFT PANEL - WELCOME SECTION */}
//         <AnimatePresence mode="wait">
//           {showLogin ? (
//             <motion.div
//               key="welcome-login"
//               initial={{ opacity: 0, x: -50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -50 }}
//               transition={{ duration: 0.6 }}
//               className="flex flex-col items-center justify-center p-10 backdrop-blur-md border-r border-white/30"
//               style={{
//                 background: 'linear-gradient(135deg, rgba(0, 54, 74, 0.7), rgba(0, 54, 74, 0.5))'
//               }}
//             >
//               <h1 className="text-4xl font-bold mb-4 drop-shadow-lg text-white">
//                 Welcome to My Website
//               </h1>
//               <p className="text-lg text-center drop-shadow text-white/90">
//                 Login to access your dashboard and continue your journey.
//               </p>
//             </motion.div>
//           ) : (
//             <motion.div
//               key="welcome-signup"
//               initial={{ opacity: 0, x: -50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -50 }}
//               transition={{ duration: 0.6 }}
//               className="flex flex-col items-center justify-center p-10 backdrop-blur-md border-r border-white/30"
//               style={{
//                 background: 'linear-gradient(135deg, rgba(0, 54, 74, 0.5), rgba(0, 54, 74, 0.7))'
//               }}
//             >
//               <h1 className="text-4xl font-bold mb-4 drop-shadow-lg text-white">
//                 Welcome Back!
//               </h1>
//               <p className="text-lg text-white/90 text-center drop-shadow">
//                 Sign in again and continue where you left off.
//               </p>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* RIGHT PANEL - FORM SECTION */}
//         <AnimatePresence mode="wait">
//           {showLogin ? (
//             <motion.div
//               key="form-login"
//               initial={{ opacity: 0, x: 50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: 50 }}
//               transition={{ duration: 0.6 }}
//               className="flex flex-col justify-center p-12 backdrop-blur-sm bg-white/30"
//             >
//               <h2 className="text-3xl font-bold mb-6 drop-shadow" style={{ color: '#00364A' }}>
//                 Login
//               </h2>
//               <input
//                 type="email"
//                 placeholder="Email"
//                 className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
//                 style={{ 
//                   color: '#00364A',
//                   backgroundColor: 'rgba(199, 216, 237, 0.5)'
//                 }}
//               />
//               <input
//                 type="password"
//                 placeholder="Password"
//                 className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
//                 style={{ 
//                   color: '#00364A',
//                   backgroundColor: 'rgba(199, 216, 237, 0.5)'
//                 }}
//               />
              
//               <button 
//                 className="w-full py-3 text-white font-semibold rounded-xl backdrop-blur-md border border-white/30 transition shadow-lg hover:opacity-90"
//                 style={{ backgroundColor: 'rgba(0, 54, 74, 0.8)' }}
//               >
//                 Login
//               </button>
//               <p className="text-center mt-4 drop-shadow" style={{ color: '#00364A' }}>
//                 Don't have an account?{" "}
//                 <button
//                   onClick={() => setShowLogin(false)}
//                   className="font-semibold px-3 py-1 rounded-lg backdrop-blur-sm border border-white/40 transition hover:bg-white/40 focus:outline-none active:scale-95"
//                   style={{ 
//                     backgroundColor: 'rgba(199, 216, 237, 0.5)',
//                     color: '#00364A'
//                   }}
//                 >
//                   Sign Up
//                 </button>
//               </p>
//             </motion.div>
//           ) : (
//             <motion.div
//               key="form-signup"
//               initial={{ opacity: 0, x: 50 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: 50 }}
//               transition={{ duration: 0.6 }}
//               className="flex flex-col justify-center p-12 backdrop-blur-sm bg-white/30"
//             >
//               <h2 className="text-3xl font-bold mb-6 drop-shadow" style={{ color: '#00364A' }}>
//                 Sign Up
//               </h2>
//               <input
//                 type="text"
//                 placeholder="Full Name"
//                 className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
//                 style={{ 
//                   color: '#00364A',
//                   backgroundColor: 'rgba(199, 216, 237, 0.5)'
//                 }}
//               />
//               <input
//                 type="email"
//                 placeholder="Email"
//                 className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
//                 style={{ 
//                   color: '#00364A',
//                   backgroundColor: 'rgba(199, 216, 237, 0.5)'
//                 }}
//               />
//               <input
//                 type="password"
//                 placeholder="Password"
//                 className="w-full p-3 mb-4 rounded-xl outline-none backdrop-blur-md border border-white/60 placeholder-gray-600 focus:border-white/80 transition"
//                 style={{ 
//                   color: '#00364A',
//                   backgroundColor: 'rgba(199, 216, 237, 0.5)'
//                 }}
//               />
             
//               <button 
//                 className="w-full py-3 text-white font-semibold rounded-xl backdrop-blur-md border border-white/30 transition shadow-lg hover:opacity-90"
//                 style={{ backgroundColor: 'rgba(0, 54, 74, 0.8)' }}
//               >
//                 Sign Up
//               </button>
//               <p className="text-center mt-4 drop-shadow" style={{ color: '#00364A' }}>
//                 Already have an account?{" "}
//                 <button
//                   onClick={() => setShowLogin(true)}
//                   className="font-semibold px-3 py-1 rounded-lg backdrop-blur-sm border border-white/40 transition hover:bg-white/40 focus:outline-none active:scale-95"
//                   style={{ 
//                     backgroundColor: 'rgba(199, 216, 237, 0.5)',
//                     color: '#00364A'
//                   }}
//                 >
//                   Login
//                 </button>
//               </p>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }