import { useState, useCallback, useRef } from 'react';

import { NOTIFICATION_TYPES } from '../constants/notification';
import { NotificationContext } from './NotificationContext';

// Auto-increment ID for notifications
let notificationId = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const timeoutsRef = useRef({});

  /**
   * Dismiss a notification by ID
   */
  const dismissNotification = useCallback((id) => {
    // Clear timeout if exists
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }

    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Add a new notification
   * @param {string} message - The notification message
   * @param {string} type - Type of notification (info, success, warning, error)
   * @param {number} duration - Duration in ms before auto-dismiss (default 5000, 0 = no auto-dismiss)
   * @returns {number} - The notification ID
   */
  const addNotification = useCallback((message, type = NOTIFICATION_TYPES.INFO, duration = 5000) => {
    const id = ++notificationId;
    const timestamp = Date.now();

    const notification = {
      id,
      message,
      type,
      timestamp,
    };

    setNotifications(prev => [...prev, notification]);

    // Add to history (keep last 100)
    setNotificationHistory(prev => {
      const next = [notification, ...prev];
      return next.slice(0, 100);
    });

    // Auto-dismiss after duration (if duration > 0)
    if (duration > 0) {
      timeoutsRef.current[id] = setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }

    return id;
  }, [dismissNotification]);

  /**
   * Dismiss all active notifications
   */
  const dismissAllNotifications = useCallback(() => {
    // Clear all timeouts
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};

    setNotifications([]);
  }, []);

  /**
   * Clear notification history
   */
  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
  }, []);

  // Convenience methods for different notification types
  const notifyInfo = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.INFO, duration);
  }, [addNotification]);

  const notifySuccess = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.SUCCESS, duration);
  }, [addNotification]);

  const notifyWarning = useCallback((message, duration) => {
    return addNotification(message, NOTIFICATION_TYPES.WARNING, duration);
  }, [addNotification]);

  const notifyError = useCallback((message, duration = 8000) => {
    // Errors stay longer by default
    return addNotification(message, NOTIFICATION_TYPES.ERROR, duration);
  }, [addNotification]);

  const value = {
    notifications,
    notificationHistory,
    addNotification,
    dismissNotification,
    dismissAllNotifications,
    clearHistory,
    // Convenience methods
    notifyInfo,
    notifySuccess,
    notifyWarning,
    notifyError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
