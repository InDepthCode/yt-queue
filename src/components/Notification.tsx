import React, { useEffect } from 'react';

export interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: () => void;
  show: boolean;
}

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  duration = 3000,
  onClose,
  show,
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" className="notification-icon">
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" className="notification-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" className="notification-icon">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        );
      case 'info':
        return (
          <svg viewBox="0 0 24 24" className="notification-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        {getIcon()}
        <span className="notification-message">{message}</span>
        <button 
          className="notification-close" 
          onClick={onClose}
          aria-label="Close notification"
        >
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Notification;
