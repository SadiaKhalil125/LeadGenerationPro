import { useState, useRef, useEffect } from 'react';
import { User, MessageSquare, X, ChevronRight, MessageCircle } from 'lucide-react';

export default function ChatbotInterface() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showFAQ, setShowFAQ] = useState(true);
  const messagesEndRef = useRef(null);

  const faqData = [
    {
      question: "How do I reset my password?",
      answer: "To reset your password, click on 'Forgot Password' on the login page. You'll receive an email with instructions to create a new password."
    },
    {
      question: "What programming languages do you support?",
      answer: "We support a wide range of programming languages including JavaScript, Python, Java, C++, Ruby, and many more. Our platform is designed to assist with both common and specialized languages."
    },
    {
      question: "How can I integrate your API?",
      answer: "You can integrate our API by following our comprehensive documentation. We provide RESTful endpoints, authentication guides, and code examples in multiple languages to get you started quickly."
    },
    {
      question: "Do you offer customer support?",
      answer: "Yes! We offer 24/7 customer support through this chat interface, email support, and a comprehensive knowledge base. Premium users also get access to priority phone support."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely! We use industry-standard encryption, secure data centers, and follow best practices for data protection. Your information is never shared with third parties without your consent."
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

  const handleFAQClick = (faq) => {
    setShowFAQ(false);
    
    const userMessage = {
      id: messages.length + 1,
      text: faq.question,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: faq.answer,
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 800);
  };

  const handleSend = () => {
    if (input.trim() === "") return;

    setShowFAQ(false);

    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        text: "Thank you for your message! I'm here to assist you with any questions you may have. Could you please provide more details so I can help you better?",
        sender: "bot",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: '#C7D8ED' }}>
      
      {/* Floating Chatbot Icons in Background */}
      <div className="absolute inset-0 pointer-events-none">
        <MessageSquare 
          className="absolute text-white opacity-20" 
          style={{ 
            width: '80px', 
            height: '80px',
            top: '10%',
            left: '5%',
            animation: 'float1 20s infinite ease-in-out'
          }} 
        />
        <MessageSquare 
          className="absolute text-white opacity-15" 
          style={{ 
            width: '60px', 
            height: '60px',
            top: '60%',
            left: '15%',
            animation: 'float2 25s infinite ease-in-out'
          }} 
        />
        <MessageSquare 
          className="absolute text-white opacity-25" 
          style={{ 
            width: '100px', 
            height: '100px',
            top: '30%',
            right: '10%',
            animation: 'float3 18s infinite ease-in-out'
          }} 
        />
        <MessageSquare 
          className="absolute text-white opacity-20" 
          style={{ 
            width: '70px', 
            height: '70px',
            bottom: '15%',
            right: '20%',
            animation: 'float4 22s infinite ease-in-out'
          }} 
        />
        <MessageSquare 
          className="absolute text-white opacity-15" 
          style={{ 
            width: '90px', 
            height: '90px',
            top: '70%',
            right: '5%',
            animation: 'float5 28s infinite ease-in-out'
          }} 
        />
        <MessageSquare 
          className="absolute text-white opacity-20" 
          style={{ 
            width: '50px', 
            height: '50px',
            bottom: '25%',
            left: '8%',
            animation: 'float6 24s infinite ease-in-out'
          }} 
        />
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -40px) rotate(5deg); }
          50% { transform: translate(-20px, -80px) rotate(-5deg); }
          75% { transform: translate(40px, -60px) rotate(3deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-40px, -50px) rotate(-7deg); }
          66% { transform: translate(30px, -30px) rotate(7deg); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-50px, 40px) rotate(-5deg); }
          50% { transform: translate(20px, 80px) rotate(5deg); }
          75% { transform: translate(-30px, 60px) rotate(-3deg); }
        }
        @keyframes float4 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          30% { transform: translate(40px, -60px) rotate(8deg); }
          60% { transform: translate(-30px, -40px) rotate(-8deg); }
        }
        @keyframes float5 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-35px, -70px) rotate(-6deg); }
          40% { transform: translate(35px, -50px) rotate(6deg); }
          60% { transform: translate(-25px, -90px) rotate(-4deg); }
          80% { transform: translate(25px, -70px) rotate(4deg); }
        }
        @keyframes float6 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(50px, -45px) rotate(10deg); }
          50% { transform: translate(-40px, -70px) rotate(-10deg); }
          75% { transform: translate(35px, -55px) rotate(5deg); }
        }
      `}</style>
      
      {/* Chatbot Interface (Always Rendered, Blurred When Welcome Shows) */}
      <div className={`flex flex-col h-full w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-4 transition-all duration-300 ${showWelcome ? 'blur-md' : ''}`} style={{ backgroundColor: 'white', borderColor: '#00364A' }}>
        {/* Header */}
        <div className="shadow-md border-b-4 p-4" style={{ backgroundColor: 'white', borderColor: '#00364A' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: '#00364A' }}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#00364A' }}>AI Assistant</h1>
              <p className="text-sm" style={{ color: '#666' }}>Online • Ready to help</p>
            </div>
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
                    <p className="text-sm">{message.text}</p>
                  </div>
                  <span className="text-xs mt-1 px-2" style={{ color: '#666' }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
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
                  style={{ 
                    backgroundColor: 'white',
                    borderColor: 'rgba(199, 216, 237, 0.8)'
                  }}
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
              placeholder="Type your message here..."
              className="flex-1 resize-none border-2 rounded-2xl px-4 py-3 max-h-32 placeholder-gray-600"
              style={{ 
                borderColor: 'rgba(199, 216, 237, 0.8)',
                backgroundColor: 'rgba(199, 216, 237, 0.3)',
                color: '#00364A',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00364A';
                e.target.style.boxShadow = '0 0 0 2px rgba(199, 216, 237, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(199, 216, 237, 0.8)';
                e.target.style.boxShadow = 'none';
              }}
              rows="1"
            />
            <button
              onClick={handleSend}
              className="rounded-full p-3 transition-colors duration-200 shadow-md flex-shrink-0 text-white"
              style={{ backgroundColor: '#00364A' }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#004d66';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#00364A';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
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
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full mb-6 shadow-lg" style={{ backgroundColor: '#00364A' }}>
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#00364A' }}>Welcome!</h2>
              
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#00364A' }}>
                I'm your AI Assistant, here to help both <span className="font-semibold" style={{ color: '#00364A' }}>tech</span> and <span className="font-semibold" style={{ color: '#00364A' }}>non-tech</span> users with any questions you might have.
              </p>
              
              <div className="rounded-xl p-4 mb-6 w-full border-2" style={{ backgroundColor: 'rgba(199, 216, 237, 0.5)', borderColor: '#00364A' }}>
                <p style={{ color: '#00364A' }}>
                  Whether you need technical support, general information, or just want to chat - I'm here for you 24/7!
                </p>
              </div>
              
              <button
                onClick={handleCloseWelcome}
                className="px-8 py-3 rounded-full font-semibold transition-all duration-200 shadow-lg flex items-center gap-2 text-white"
                style={{ backgroundColor: '#00364A' }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#004d66';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#00364A';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
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