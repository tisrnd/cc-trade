import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './AlertPanel.css';
import { useAlertContext } from '../../../hooks/useAlertContext';
import { useDataContext } from '../../../context/DataContext';
import { playAlertSound, ALERT_TYPE, NOTIFICATION_TYPE } from '../../../utils/alerts';

// Icons
const BellIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
);

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
);

const VolumeIcon = ({ muted }) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        {muted ? (
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        ) : (
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        )}
    </svg>
);

const TestSoundIcon = () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
);

export default function AlertPanel({ isOpen, onClose, initialPrice }) {
    const { panel, ticker } = useDataContext();
    const {
        alerts,
        createAlert,
        deleteAlert,
        toggleAlert,
        resetAlert,
        audioEnabled,
        notificationPermission,
        requestPermission,
        enableAudio,
    } = useAlertContext();

    const [showForm, setShowForm] = useState(false);
    const [newAlert, setNewAlert] = useState({
        price: '',
        type: ALERT_TYPE.PRICE_CROSS,
        name: '',
        soundType: 'beep',
        repeat: false,
    });

    const currentSymbol = panel?.selected || 'BTCUSDT';
    const symbolAlerts = alerts.filter(a => a.symbol === currentSymbol);

    // Get current price from ticker
    const currentPrice = useMemo(() => {
        if (!ticker || ticker.length === 0) return '';
        const currentTicker = ticker.find(t => t.symbol === currentSymbol);
        return currentTicker?.lastPrice || '';
    }, [ticker, currentSymbol]);

    // Set current price as default when opening form
    useEffect(() => {
        if (showForm && currentPrice && newAlert.price === '') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setNewAlert(prev => ({ ...prev, price: currentPrice }));
        }
    }, [showForm, currentPrice, newAlert.price]);

    // Handle initialPrice from Ctrl+click on chart
    useEffect(() => {
        if (isOpen && initialPrice !== null && initialPrice !== undefined) {
            // Format the price nicely
            const formattedPrice = typeof initialPrice === 'number'
                ? initialPrice.toFixed(8).replace(/\.?0+$/, '')
                : initialPrice;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setNewAlert({
                price: formattedPrice,
                type: ALERT_TYPE.PRICE_CROSS,
                name: '',
                soundType: 'beep',
                repeat: false,
            });
            setShowForm(true);
            enableAudio();
        }
    }, [isOpen, initialPrice, enableAudio]);

    // Test sound button
    const handleTestSound = useCallback(() => {
        enableAudio(); // Ensure audio context is initialized
        playAlertSound(newAlert.soundType);
    }, [newAlert.soundType, enableAudio]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!newAlert.price) return;

        await createAlert({
            symbol: currentSymbol,
            price: newAlert.price,
            type: newAlert.type,
            name: newAlert.name || `${currentSymbol} @ ${newAlert.price}`,
            soundType: newAlert.soundType,
            repeat: newAlert.repeat,
        });

        setNewAlert({
            price: '',
            type: ALERT_TYPE.PRICE_CROSS,
            name: '',
            soundType: 'beep',
            repeat: false,
        });
        setShowForm(false);
    }, [createAlert, currentSymbol, newAlert]);

    const handleOpenForm = useCallback(() => {
        // Get current price from ticker at click time
        let priceToUse = '';
        if (ticker && ticker.length > 0) {
            const currentTicker = ticker.find(t => t.symbol === currentSymbol);
            priceToUse = currentTicker?.lastPrice || '';
        }

        // Reset form with current price when opening
        setNewAlert({
            price: priceToUse,
            type: ALERT_TYPE.PRICE_CROSS,
            name: '',
            soundType: 'beep',
            repeat: false,
        });
        setShowForm(true);
        enableAudio(); // Initialize audio context on user interaction
    }, [ticker, currentSymbol, enableAudio]);

    if (!isOpen) return null;

    return (
        <div className="alert-panel">
            <div className="alert-panel-header">
                <div className="alert-panel-title">
                    <BellIcon />
                    <span>Price Alerts</span>
                    <span className="alert-count">{symbolAlerts.length}</span>
                </div>
                <div className="alert-panel-actions">
                    <button
                        className={`alert-icon-btn ${audioEnabled ? '' : 'muted'}`}
                        onClick={handleTestSound}
                        title={audioEnabled ? 'Test sound' : 'Click to enable & test audio'}
                    >
                        <VolumeIcon muted={!audioEnabled} />
                    </button>
                    <button
                        className="alert-icon-btn add"
                        onClick={showForm ? () => setShowForm(false) : handleOpenForm}
                        title={showForm ? 'Cancel' : 'Add Alert'}
                    >
                        <PlusIcon />
                    </button>
                    <button className="alert-close-btn" onClick={onClose}>×</button>
                </div>
            </div>

            {notificationPermission !== 'granted' && (
                <div className="alert-permission-banner">
                    <span>Enable browser notifications for alerts</span>
                    <button onClick={requestPermission}>Enable</button>
                </div>
            )}

            {showForm && (
                <form className="alert-form" onSubmit={handleSubmit}>
                    <div className="alert-form-row">
                        <label>Price</label>
                        <input
                            type="number"
                            step="any"
                            value={newAlert.price}
                            onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })}
                            placeholder="Enter price"
                            autoFocus
                        />
                    </div>
                    <div className="alert-form-row">
                        <label>Type</label>
                        <select
                            value={newAlert.type}
                            onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
                        >
                            <option value={ALERT_TYPE.PRICE_CROSS}>Cross Price</option>
                            <option value={ALERT_TYPE.PRICE_ABOVE}>Price Above</option>
                            <option value={ALERT_TYPE.PRICE_BELOW}>Price Below</option>
                        </select>
                    </div>
                    <div className="alert-form-row">
                        <label>Sound</label>
                        <select
                            value={newAlert.soundType}
                            onChange={(e) => setNewAlert({ ...newAlert, soundType: e.target.value })}
                        >
                            <option value="beep">Beep</option>
                            <option value="chime">Chime</option>
                            <option value="alarm">Alarm</option>
                        </select>
                    </div>
                    <div className="alert-form-row checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={newAlert.repeat}
                                onChange={(e) => setNewAlert({ ...newAlert, repeat: e.target.checked })}
                            />
                            Repeat alert
                        </label>
                    </div>
                    <div className="alert-form-actions">
                        <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
                        <button type="submit" className="primary">Create Alert</button>
                    </div>
                </form>
            )}

            <div className="alert-list">
                {symbolAlerts.length === 0 ? (
                    <div className="alert-empty">
                        No alerts for {currentSymbol}
                    </div>
                ) : (
                    symbolAlerts.map(alert => (
                        <div
                            key={alert.id}
                            className={`alert-item ${alert.active ? 'active' : 'inactive'} ${alert.triggered ? 'triggered' : ''}`}
                        >
                            <div className="alert-item-info">
                                <div className="alert-item-price">
                                    {alert.type === ALERT_TYPE.PRICE_ABOVE && '↑ '}
                                    {alert.type === ALERT_TYPE.PRICE_BELOW && '↓ '}
                                    {alert.type === ALERT_TYPE.PRICE_CROSS && '↔ '}
                                    {alert.price}
                                </div>
                                <div className="alert-item-name">{alert.name}</div>
                                {alert.triggered && (
                                    <div className="alert-item-triggered">
                                        Triggered at {new Date(alert.triggeredAt).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                            <div className="alert-item-actions">
                                {alert.triggered && !alert.repeat && (
                                    <button
                                        className="alert-reset-btn"
                                        onClick={() => resetAlert(alert.id)}
                                        title="Reset alert"
                                    >
                                        ↻
                                    </button>
                                )}
                                <button
                                    className="alert-toggle-btn"
                                    onClick={() => toggleAlert(alert.id, !alert.active)}
                                    title={alert.active ? 'Disable' : 'Enable'}
                                >
                                    {alert.active ? '●' : '○'}
                                </button>
                                <button
                                    className="alert-delete-btn"
                                    onClick={() => deleteAlert(alert.id)}
                                    title="Delete"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

