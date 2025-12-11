import React from 'react';
import './NotificationToast.css';
import { useNotifications } from '../../hooks/useNotifications';
import { NOTIFICATION_TYPES } from '../../constants/notification';

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const getTypeIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return '✓';
    case NOTIFICATION_TYPES.WARNING:
      return '⚠';
    case NOTIFICATION_TYPES.ERROR:
      return '✕';
    case NOTIFICATION_TYPES.INFO:
    default:
      return 'ℹ';
  }
};

const NotificationToast = () => {
  const { notifications, dismissNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-toast notification-toast-${notification.type}`}
          onClick={() => dismissNotification(notification.id)}
        >
          <div className="notification-toast-icon">
            {getTypeIcon(notification.type)}
          </div>
          <div className="notification-toast-content">
            <div className="notification-toast-message">
              {notification.message}
            </div>
            <div className="notification-toast-time">
              {formatTime(notification.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;

