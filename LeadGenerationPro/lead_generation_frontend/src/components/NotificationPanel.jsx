import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

const NotificationPanel = ({ notifications, onRemove }) => {
  if (!notifications.length) return null;
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      zIndex: 9999, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '10px', 
      maxWidth: '400px' 
    }}>
      {notifications.map(notif => (
        <div 
          key={notif.id} 
          style={{
            backgroundColor: notif.type === 'success' ? '#10B981' : notif.type === 'info' ? '#3B82F6' : '#EF4444',
            color: 'white', 
            padding: '16px 20px', 
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px',
            animation: 'slideIn 0.3s ease', 
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            {notif.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>
            {notif.message}
          </div>
          <button 
            onClick={() => onRemove(notif.id)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer', 
              opacity: 0.8, 
              padding: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              borderRadius: '4px', 
              flexShrink: 0 
            }}
            onMouseEnter={e => e.target.style.opacity = '1'} 
            onMouseLeave={e => e.target.style.opacity = '0.8'}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};

export default NotificationPanel;