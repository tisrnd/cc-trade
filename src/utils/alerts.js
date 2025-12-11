/**
 * Price Alert System
 * 
 * Features:
 * - Audio alerts (beep sounds)
 * - Visual alerts (flash, highlight)
 * - Browser notifications
 * - Persistent storage via IndexedDB
 */

import { getAlerts, saveAlert, deleteAlert as removeAlert } from './cache';

// Alert types
export const ALERT_TYPE = {
    PRICE_ABOVE: 'price_above',
    PRICE_BELOW: 'price_below',
    PRICE_CROSS: 'price_cross', // Alert when price crosses in either direction
};

// Notification types
export const NOTIFICATION_TYPE = {
    AUDIO: 'audio',
    VISUAL: 'visual',
    BROWSER: 'browser',
};

// Audio context for generating alert sounds
let audioContext = null;
let audioInitialized = false;

/**
 * Initialize audio context (must be called after user interaction)
 */
export function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
            console.log('Audio context initialized, state:', audioContext.state);
        } catch (error) {
            console.error('Failed to create AudioContext:', error);
            return null;
        }
    }
    
    // Resume if suspended (browser policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('Audio context resumed');
        });
    }
    
    return audioContext;
}

/**
 * Check if audio is ready
 */
export function isAudioReady() {
    return audioInitialized && audioContext && audioContext.state === 'running';
}

/**
 * Play an alert sound
 * @param {string} type - 'beep', 'chime', 'alarm'
 */
export function playAlertSound(type = 'beep') {
    try {
        if (!audioContext) {
            audioContext = initAudioContext();
        }
        
        if (!audioContext) {
            console.warn('Audio context not available');
            return;
        }

        // Resume if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different sound profiles
        switch (type) {
            case 'chime':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
                oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.4);
                break;

            case 'alarm':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.15);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.45);
                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.6);
                break;

            case 'beep':
            default:
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
        }
        
        console.log('Playing sound:', type);
    } catch (error) {
        console.error('Error playing alert sound:', error);
    }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(title, body, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return null;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon: '/vite.svg', // App icon
            badge: '/vite.svg',
            tag: options.tag || 'price-alert',
            requireInteraction: options.requireInteraction || false,
            silent: options.silent || false,
            ...options,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        return notification;
    } catch (error) {
        console.error('Error showing notification:', error);
        return null;
    }
}

/**
 * Create a new price alert
 */
export async function createAlert({
    symbol,
    price,
    type = ALERT_TYPE.PRICE_CROSS,
    name = '',
    notifications = [NOTIFICATION_TYPE.AUDIO, NOTIFICATION_TYPE.VISUAL, NOTIFICATION_TYPE.BROWSER],
    soundType = 'beep',
    repeat = false,
}) {
    const alert = {
        symbol,
        price: parseFloat(price),
        type,
        name: name || `${symbol} @ ${price}`,
        notifications,
        soundType,
        repeat,
        active: true,
        triggered: false,
        triggeredAt: null,
        lastPrice: null,
    };

    return await saveAlert(alert);
}

/**
 * Update existing alert price
 */
export async function updateAlertPrice(id, price) {
    const alerts = await getAlerts();
    const alert = alerts.find(a => a.id === id);
    if (!alert) return null;

    const normalizedPrice = Number(price);
    if (!Number.isFinite(normalizedPrice)) return null;

    const updatedAlert = {
        ...alert,
        price: normalizedPrice,
        name: alert.name || `${alert.symbol} @ ${normalizedPrice}`,
        updatedAt: Date.now(),
    };

    await saveAlert(updatedAlert);
    return updatedAlert;
}

/**
 * Delete an alert
 */
export async function deleteAlertById(id) {
    return await removeAlert(id);
}

/**
 * Check if price triggers any alerts
 * @param {string} symbol - Trading pair symbol
 * @param {number} currentPrice - Current price
 * @param {number} previousPrice - Previous price (for cross detection)
 * @returns {Array} - Triggered alerts
 */
export async function checkAlerts(symbol, currentPrice, previousPrice) {
    const alerts = await getAlerts();
    const triggered = [];

    for (const alert of alerts) {
        if (!alert.active || alert.symbol !== symbol) continue;
        if (alert.triggered && !alert.repeat) continue;

        let shouldTrigger = false;

        switch (alert.type) {
            case ALERT_TYPE.PRICE_ABOVE:
                if (currentPrice >= alert.price && (previousPrice === null || previousPrice < alert.price)) {
                    shouldTrigger = true;
                }
                break;

            case ALERT_TYPE.PRICE_BELOW:
                if (currentPrice <= alert.price && (previousPrice === null || previousPrice > alert.price)) {
                    shouldTrigger = true;
                }
                break;

            case ALERT_TYPE.PRICE_CROSS:
                if (previousPrice !== null) {
                    // Check if price crossed the alert level in either direction
                    const crossedUp = previousPrice < alert.price && currentPrice >= alert.price;
                    const crossedDown = previousPrice > alert.price && currentPrice <= alert.price;
                    if (crossedUp || crossedDown) {
                        shouldTrigger = true;
                    }
                }
                break;
        }

        if (shouldTrigger) {
            triggered.push(alert);

            // Update alert state
            await saveAlert({
                ...alert,
                triggered: true,
                triggeredAt: Date.now(),
                lastPrice: currentPrice,
                active: alert.repeat, // Deactivate if not repeating
            });
        }
    }

    return triggered;
}

/**
 * Fire alert notifications
 */
export function fireAlertNotifications(alert, currentPrice) {
    const { notifications, soundType, name, symbol } = alert;

    // Audio notification
    if (notifications.includes(NOTIFICATION_TYPE.AUDIO)) {
        playAlertSound(soundType);
    }

    // Browser notification
    if (notifications.includes(NOTIFICATION_TYPE.BROWSER)) {
        const direction = currentPrice >= alert.price ? '📈' : '📉';
        showBrowserNotification(
            `${direction} Price Alert: ${symbol}`,
            `${name}\nPrice: ${currentPrice}`,
            { tag: `alert-${alert.id}` }
        );
    }

    // Visual notification is handled by the React component
    return {
        type: 'alert_triggered',
        alert,
        currentPrice,
        timestamp: Date.now(),
    };
}

/**
 * Get all active alerts
 */
export async function getActiveAlerts() {
    const alerts = await getAlerts();
    return alerts.filter(a => a.active);
}

/**
 * Toggle alert active state
 */
export async function toggleAlertActive(id, active) {
    const alerts = await getAlerts();
    const alert = alerts.find(a => a.id === id);
    if (alert) {
        await saveAlert({ ...alert, active });
    }
}

/**
 * Reset a triggered alert (make it active again)
 */
export async function resetAlert(id) {
    const alerts = await getAlerts();
    const alert = alerts.find(a => a.id === id);
    if (alert) {
        await saveAlert({
            ...alert,
            active: true,
            triggered: false,
            triggeredAt: null,
        });
    }
}

