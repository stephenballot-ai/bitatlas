import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'error' ? 8000 : 5000)
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (unless persistent)
    if (!newNotification.persistent && (newNotification.duration ?? 0) > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration!);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      showNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationItem({ 
  notification, 
  onRemove 
}: { 
  notification: Notification;
  onRemove: () => void;
}) {
  const typeStyles = {
    success: {
      background: '#d1e7dd',
      border: '1px solid #badbcc',
      color: '#0f5132'
    },
    error: {
      background: '#f8d7da',
      border: '1px solid #f5c2c7',
      color: '#842029'
    },
    warning: {
      background: '#fff3cd',
      border: '1px solid #ffecb5',
      color: '#664d03'
    },
    info: {
      background: '#cff4fc',
      border: '1px solid #b6effb',
      color: '#055160'
    }
  };

  const typeIcons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'i'
  };

  return (
    <div style={{
      ...typeStyles[notification.type],
      padding: '15px',
      borderRadius: '4px',
      marginBottom: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontFamily: 'system-ui',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            fontWeight: 'bold', 
            marginBottom: notification.message ? '5px' : '0' 
          }}>
            <span style={{ marginRight: '8px', fontSize: '18px' }}>
              {typeIcons[notification.type]}
            </span>
            {notification.title}
          </div>
          {notification.message && (
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {notification.message}
            </div>
          )}
        </div>
        
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'inherit',
            opacity: 0.7,
            marginLeft: '10px',
            padding: '0 5px'
          }}
          title="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}