import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    createAlert as createAlertFn,
    deleteAlertById,
    checkAlerts,
    fireAlertNotifications,
    toggleAlertActive,
    resetAlert as resetAlertFn,
    requestNotificationPermission,
    initAudioContext,
    updateAlertPrice as updateAlertPriceFn,
    ALERT_TYPE,
    NOTIFICATION_TYPE,
} from '../utils/alerts';
import { getAlerts } from '../utils/cache';
import { AlertContext } from './AlertContext';

export function AlertProvider({ children }) {
    const [alerts, setAlerts] = useState([]);
    const [triggeredAlerts, setTriggeredAlerts] = useState([]);
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [visualEnabled, setVisualEnabled] = useState(true);
    const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true);

    // Track previous prices for cross detection
    const previousPrices = useRef({});

    const loadAlerts = useCallback(async () => {
        const allAlerts = await getAlerts();
        setAlerts(allAlerts);
    }, []);

    const checkNotificationPermission = useCallback(async () => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Load alerts on mount
    useEffect(() => {
        loadAlerts();
        checkNotificationPermission();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Request notification permission
    const requestPermission = useCallback(async () => {
        const granted = await requestNotificationPermission();
        setNotificationPermission(granted ? 'granted' : 'denied');
        return granted;
    }, []);

    // Initialize audio on first user interaction
    const enableAudio = useCallback(() => {
        initAudioContext();
        setAudioEnabled(true);
    }, []);

    // Create a new alert
    const createAlert = useCallback(async (alertData) => {
        // Build notifications array based on enabled settings
        const notifications = [];
        if (audioEnabled) notifications.push(NOTIFICATION_TYPE.AUDIO);
        if (visualEnabled) notifications.push(NOTIFICATION_TYPE.VISUAL);
        if (browserNotificationsEnabled && notificationPermission === 'granted') {
            notifications.push(NOTIFICATION_TYPE.BROWSER);
        }

        const alert = await createAlertFn({
            ...alertData,
            notifications: alertData.notifications || notifications,
        });

        await loadAlerts();
        return alert;
    }, [audioEnabled, visualEnabled, browserNotificationsEnabled, notificationPermission, loadAlerts]);

    // Delete an alert
    const deleteAlert = useCallback(async (id) => {
        await deleteAlertById(id);
        await loadAlerts();
    }, [loadAlerts]);

    // Toggle alert active state
    const toggleAlert = useCallback(async (id, active) => {
        await toggleAlertActive(id, active);
        await loadAlerts();
    }, [loadAlerts]);

    // Reset a triggered alert
    const resetAlert = useCallback(async (id) => {
        await resetAlertFn(id);
        await loadAlerts();
    }, [loadAlerts]);

    const moveAlertPrice = useCallback(async (id, price) => {
        const updated = await updateAlertPriceFn(id, price);
        if (updated) {
            await loadAlerts();
        }
        return updated;
    }, [loadAlerts]);

    // Check price against alerts (called from DataContext on price updates)
    const checkPriceAlerts = useCallback(async (symbol, currentPrice) => {
        const previousPrice = previousPrices.current[symbol] || null;
        previousPrices.current[symbol] = currentPrice;

        const triggered = await checkAlerts(symbol, currentPrice, previousPrice);

        if (triggered.length > 0) {
            const newTriggered = [];

            for (const alert of triggered) {
                const event = fireAlertNotifications(alert, currentPrice);
                newTriggered.push(event);
            }

            setTriggeredAlerts(prev => [...prev, ...newTriggered]);
            await loadAlerts();

            return newTriggered;
        }

        return [];
    }, [loadAlerts]);

    // Clear triggered alerts
    const clearTriggeredAlerts = useCallback(() => {
        setTriggeredAlerts([]);
    }, []);

    // Dismiss a specific triggered alert
    const dismissTriggeredAlert = useCallback((alertId) => {
        setTriggeredAlerts(prev => prev.filter(t => t.alert.id !== alertId));
    }, []);

    // Get alerts for a specific symbol
    const getAlertsForSymbol = useCallback((symbol) => {
        return alerts.filter(a => a.symbol === symbol);
    }, [alerts]);

    const value = {
        // State
        alerts,
        triggeredAlerts,
        notificationPermission,
        audioEnabled,
        visualEnabled,
        browserNotificationsEnabled,

        // Actions
        createAlert,
        deleteAlert,
        toggleAlert,
        resetAlert,
        loadAlerts,
        requestPermission,
        enableAudio,
        checkPriceAlerts,
        clearTriggeredAlerts,
        dismissTriggeredAlert,
        getAlertsForSymbol,
        setAudioEnabled,
        setVisualEnabled,
        setBrowserNotificationsEnabled,
        updateAlertPrice: moveAlertPrice,
    };

    return (
        <AlertContext.Provider value={value}>
            {children}
        </AlertContext.Provider>
    );
}
