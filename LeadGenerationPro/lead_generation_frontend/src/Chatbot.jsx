import { useState, useRef, useEffect } from 'react';
import { User, MessageSquare, X, ChevronRight, MessageCircle, Trash2 } from 'lucide-react';
import axios from 'axios';

// --- CONFIG ---
const API_BASE_URL = "http://localhost:8000/chat"; // Adjust port if needed

// Helper to manage session ID in localStorage
const getSessionId = () => {
  let id = localStorage.getItem("chat_session_id");
  if (!id) {
    id = "sess_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("chat_session_id", id);
  }
  return id;
};

export default function ChatbotInterface() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showFAQ, setShowFAQ] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(getSessionId());
  const sessionId = sessionIdRef.current;

  // Static FAQ data (only for clicking, answer comes from AI now if you prefer)
  // Or we can treat FAQ clicks as inputs to the AI
  const faqData = [
    { question: "How do I reset my password?", answer: "To reset your password..." },
    { question: "What programming languages do you support?", answer: "We support..." },
    { question: "How can I integrate your API?", answer: "You can integrate..." },
    { question: "Do you offer customer support?", answer: "Yes! We offer..." },
    { question: "Is my data secure?", answer: "Absolutely! We use..." }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch History on Mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/chat/${sessionId}/history`);
        // Format timestamp string to Date object
        const formatted = res.data.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formatted);
        if (formatted.length > 0) setShowFAQ(false);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    fetchHistory();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  // 2. Handle Delete Session
  const handleDeleteSession = async () => {
    if (!window.confirm("Are you sure you want to clear the conversation?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/chat/${sessionId}`);
      setMessages([]);
      setShowFAQ(true);
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  // 3. Central Send Logic
  const sendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    setShowFAQ(false);
    setIsLoading(true);

    // Optimistically add User Message
    const optimisticMsg = {
      id: Date.now(),
      text: textToSend,
      sender: "user",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // API Call
      const res = await axios.post(`${API_BASE_URL}/chat/${sessionId}`, {
        text: textToSend
      });

      // Add Bot Response from API
      const botMsg = {
        id: res.data.id,
        text: res.data.text,
        sender: "bot",
        timestamp: new Date(res.data.timestamp)
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Error sending message:", err);
      // Optional: Add an error message bubble
    } finally {
      setIsLoading(false);
    }
  };

  const handleFAQClick = (faq) => {
    // We send the FAQ question to the AI to get a generative response, 
    // OR you can modify this to display the static answer immediately.
    // Here, we treat it as a user input to the AI:
    sendMessage(faq.question);
  };

  const handleSend = () => {
    sendMessage(input);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#C7D8ED' }}>
      
      {/* Background Animations (Kept existing) */}
      <div className="absolute inset-0 pointer-events-none">
        <MessageSquare className="absolute text-white opacity-20" style={{ width: '80px', height: '80px', top: '10%', left: '5%', animation: 'float1 20s infinite ease-in-out' }} />
        {/* ... (Your other background icons remain here) ... */}
      </div>

      <style>{`
        @keyframes float1 { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(30px, -40px) rotate(5deg); } 50% { transform: translate(-20px, -80px) rotate(-5deg); } 75% { transform: translate(40px, -60px) rotate(3deg); } }
        /* Add other keyframes from your code here */
      `}</style>
      
      {/* Chatbot Interface */}
      <div className={`flex flex-col h-full w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-4 transition-all duration-300 ${showWelcome ? 'blur-md' : ''}`} style={{ backgroundColor: 'white', borderColor: '#00364A' }}>
        
        {/* Header - Now with DELETE button */}
        <div className="shadow-md border-b-4 p-4" style={{ backgroundColor: 'white', borderColor: '#00364A' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full" style={{ backgroundColor: '#00364A' }}>
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#00364A' }}>AI Assistant</h1>
                <p className="text-sm" style={{ color: '#666' }}>
                  {isLoading ? 'AI is thinking...' : 'Online • Powered by Gemini'}
                </p>
              </div>
            </div>
            
            {/* DELETE SESSION BUTTON */}
            <button 
              onClick={handleDeleteSession}
              className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
              title="Clear History"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4" style={{ background: 'linear-gradient(to bottom, rgba(199, 216, 237, 0.3), white)' }}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center`}
                  style={{ backgroundColor: message.sender === 'user' ? '#004d66' : '#00364A' }}
                >
                  {message.sender === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`flex flex-col max-w-md ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-3 shadow-md ${
                    message.sender === 'user' 
                      ? 'rounded-tr-none text-white' 
                      : 'rounded-tl-none border-2'
                  }`}
                  style={{
                    backgroundColor: message.sender === 'user' ? '#00364A' : 'white',
                    color: message.sender === 'user' ? 'white' : '#00364A',
                    borderColor: message.sender === 'bot' ? 'rgba(199, 216, 237, 0.8)' : 'transparent'
                  }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  </div>
                  <span className="text-xs mt-1 px-2" style={{ color: '#666' }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
               <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00364A' }}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border-2 rounded-2xl rounded-tl-none px-4 py-3 shadow-md" style={{ borderColor: 'rgba(199, 216, 237, 0.8)' }}>
                     <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                     </div>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* FAQ Section */}
        {showFAQ && (
          <div className="border-t-2 p-4 max-h-64 overflow-y-auto" style={{ backgroundColor: 'rgba(199, 216, 237, 0.3)', borderColor: 'rgba(199, 216, 237, 0.8)' }}>
            <h3 className="text-lg font-bold mb-3 px-2" style={{ color: '#00364A' }}>Frequently Asked Questions</h3>
            <div className="space-y-2">
              {faqData.map((faq, index) => (
                <button
                  key={index}
                  onClick={() => handleFAQClick(faq)}
                  className="w-full text-left rounded-lg p-3 transition-all duration-200 shadow-sm border-2"
                  style={{ backgroundColor: 'white', borderColor: 'rgba(199, 216, 237, 0.8)' }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(199, 216, 237, 0.5)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#00364A' }}>
                    <ChevronRight className="w-4 h-4" style={{ color: '#00364A' }} />
                    {faq.question}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Container */}
        <div className="border-t-4 p-4 shadow-lg" style={{ backgroundColor: 'white', borderColor: '#00364A' }}>
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder="Type your message here..."
              className="flex-1 resize-none border-2 rounded-2xl px-4 py-3 max-h-32 placeholder-gray-600 disabled:opacity-50"
              style={{ 
                borderColor: 'rgba(199, 216, 237, 0.8)',
                backgroundColor: 'rgba(199, 216, 237, 0.3)',
                color: '#00364A',
                outline: 'none'
              }}
              rows="1"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="rounded-full p-3 transition-colors duration-200 shadow-md flex-shrink-0 text-white disabled:opacity-50"
              style={{ backgroundColor: '#00364A' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 flex items-center justify-center z-50 transition-all duration-300" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 relative border-4 animate-fadeIn backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#00364A' }}>
            <button
              onClick={handleCloseWelcome}
              className="absolute top-4 right-4 rounded-full p-2 transition-colors duration-200 shadow-lg" style={{ backgroundColor: '#dc2626' }}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full mb-6 shadow-lg" style={{ backgroundColor: '#00364A' }}>
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#00364A' }}>Welcome!</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#00364A' }}>
                I'm your AI Assistant. I use Google's Gemini to answer your technical questions concisely.
              </p>
              <button
                onClick={handleCloseWelcome}
                className="px-8 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg flex items-center gap-2 text-white"
                style={{ backgroundColor: '#00364A' }}
              >
                <MessageCircle className="w-5 h-5" />
                Start Chatting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}