import React, { useState, useMemo } from 'react'
import './TradesPanel.css'
import { timeParse, timeFormat } from 'd3-time-format'
import { calculatePrecision, precisionTruncate } from '../../../utils/operations'
import { useDataContext } from '../../../context/DataContext'
import { useNotifications } from '../../../hooks/useNotifications'
import { NOTIFICATION_TYPES } from '../../../constants/notification'
import { groupOrdersBySide } from '../../../utils/orderGroups'

const parseFormat = timeParse('%Q')
const formatTime = timeFormat('%H:%M:%S')
const HISTORY_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const padNumber = (value) => String(value).padStart(2, '0')

const formatHistoryTimestamp = (value) => {
    let date
    if (value instanceof Date) {
        date = value
    } else {
        const numeric = Number(value)
        date = Number.isFinite(numeric) ? new Date(numeric) : new Date()
    }
    return {
        day: padNumber(date.getDate()),
        month: HISTORY_MONTHS[date.getMonth()] || '',
        time: `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`,
    }
}

// Grouped History View Component
const GroupedHistoryView = ({ history, precision, market, marketValueDecimals }) => {
    const groupedOrders = useMemo(() => {
        if (!history || history.length === 0) return [];
        return groupOrdersBySide(history).sort((a, b) => b.endTime - a.endTime);
    }, [history]);

    if (groupedOrders.length === 0) {
        return <div className="grouped-history-empty">No trade history</div>;
    }

    return (
        <div className="grouped-history-container">
            {groupedOrders.map((group) => {
                const isSell = group.side === 'SELL';
                const avgPriceFormatted = precisionTruncate(group.avgPrice, precision.price).toFixed(precision.price);
                const totalFormatted = precisionTruncate(group.totalValue, marketValueDecimals).toFixed(marketValueDecimals);
                const timeDetails = formatHistoryTimestamp(parseFormat(group.endTime.toString()));

                return (
                    <div
                        key={group.id}
                        className={`grouped-order ${isSell ? 'sell' : 'buy'}`}
                    >
                        <div className="grouped-order-header">
                            <span className={`grouped-order-side ${isSell ? 'sell' : 'buy'}`}>
                                {isSell ? 'SOLD' : 'BOUGHT'}
                            </span>
                            <span className="grouped-order-count">
                                {group.orderCount > 1 ? `${group.orderCount} orders` : '1 order'}
                            </span>
                            <span className="grouped-order-time">
                                <span className="grouped-order-time-date">{timeDetails.day}</span>
                                <span className="grouped-order-time-month">{timeDetails.month}</span>
                                <span className="grouped-order-time-clock">{timeDetails.time}</span>
                            </span>
                        </div>
                        <div className="grouped-order-details">
                            <div className="grouped-order-main">
                                <span className="grouped-order-price">{avgPriceFormatted}</span>
                                <span className="grouped-order-at">@ {totalFormatted} {market}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
// Format notification time for history view
const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const getNotificationTypeLabel = (type) => {
    switch (type) {
        case NOTIFICATION_TYPES.SUCCESS: return 'SUCCESS';
        case NOTIFICATION_TYPES.WARNING: return 'WARNING';
        case NOTIFICATION_TYPES.ERROR: return 'ERROR';
        default: return 'INFO';
    }
};

const TradesPanel = () => {
    const {
        trades,
        history,
        filters,
        panel,
        throttle,
        handleThrottleSwitch,
        handleThrottleTimeout,

        enabledMarketBalance,
        handleEnabledMarketBalance,
        tradeNotionalFilter,
        minBtcTradeNotional,
        handleTradeNotionalFilterChange,
        activityVolumeFilter,
        handleActivityVolumeFilterChange,
        analyticsVolumeFilter,
        handleAnalyticsVolumeFilterChange,
    } = useDataContext();
    const { notificationHistory, clearHistory } = useNotifications();
    const [menu, setMenu] = useState('trades')
    const [increaseMinPrice, setIncreaseMinPrice] = useState(false);

    const handleMenuClick = (e) => {
        // Use id from the clicked element
        const id = e.target.id;
        if (['trades', 'history', 'settings', 'notifications'].includes(id)) {
            setMenu(id);
        }
    }

    const compoundOrder = (order, precision, market, maxTotal, _index, marketValueDecimals) => {
        let t, p, q, m, f

        if (menu === 'trades') {
            // translate order to classic property type
            if (order.time) {
                order.T = order.time
                order.p = order.price
                order.q = order.qty
                order.m = order.isBuyerMaker
            }
            t = parseFormat(order.T.toString())
            p = parseFloat(order.p)
            q = parseFloat(order.q)
            m = order.m
            f = formatTime
        } else {
            t = parseFormat(order.time)
            p = parseFloat(order.price)
            q = parseFloat(order.qty)
            m = !order.isBuyer
            // Note: History tab now uses GroupedHistoryView, this branch is legacy
            f = formatTime
        }

        let total = p * q

        // if notional of the order is below the configured filter - hide it (only for trades tab)
        if (menu === 'trades') {
            const minNotionalThreshold = market === 'BTC' ? minBtcTradeNotional : tradeNotionalFilter;
            if (total < minNotionalThreshold) return null
        }

        t = f(t)
        const targetPrecision = enabledMarketBalance ? marketValueDecimals : precision.quantity
        const valueToDisplay = enabledMarketBalance ? total : q
        const qString = Number.isFinite(valueToDisplay)
            ? precisionTruncate(valueToDisplay, targetPrecision).toFixed(targetPrecision)
            : valueToDisplay

        p = precisionTruncate(p, precision.price).toFixed(precision.price)

        let opacityDivider = (maxTotal ? total / maxTotal : 1)
        return (
            <div
                className={'trade ' + (m ? 'red' : 'green')}
                style={{ opacity: 0.4 + opacityDivider }}
                key={_index}
            >
                <span className="piece">{p}</span>
                <span className="piece">{qString}</span>
                <span className="piece">{t}</span>
            </div>
        )
    }

    let feed, maxTotal

    // Guard against missing data
    if (!filters || !panel) {
        return <div className="trades-panel"><div className="color-white">Loading...</div></div>
    }

    const precision = calculatePrecision(filters?.[panel.selected])
    const market = panel.market
    const marketValueDecimals = market === 'BTC' ? 6 : 0

    switch (menu) {
        case 'trades':
            if (trades && trades.length > 0) {
                maxTotal = Math.max.apply(
                    Math,
                    trades.map((item) => parseFloat(item.q || item.qty) * parseFloat(item.p || item.price))
                )
                feed = trades
                    .map((order, index) => compoundOrder(order, precision, market, maxTotal, index, marketValueDecimals))
                    .filter(Boolean)
            } else {
                // Show loading spinner while waiting for trades data
                feed = (
                    <div className="trades-loading">
                        <div className="trades-spinner"></div>
                        <span>Loading trades...</span>
                    </div>
                )
            }
            break
        case 'history':
            feed = <GroupedHistoryView
                history={history}
                precision={precision}
                market={market}
                marketValueDecimals={marketValueDecimals}
                handlePairClick={(symbol) => {
                    if (symbol && symbol !== panel.selected) {
                        // Handle pair click would need to be passed from context
                    }
                }}
            />
            break
        case 'settings':
            feed = (
                <table className="settings">
                    <tbody>
                        <tr className="item">
                            <td className="option">
                                Throttle:
                            </td>
                            <td className="value">
                                <input className="throttle" type="checkbox" checked={throttle?.state} onChange={handleThrottleSwitch}></input>
                            </td>
                        </tr>
                        <tr className="item">
                            <td className="option">
                                Throttle timeout:
                            </td>
                            <td className="value">
                                <input className="timeout" disabled={!throttle?.state} type="text" defaultValue={throttle?.timeout} onBlur={handleThrottleTimeout}></input>ms
                            </td>
                        </tr>
                        <tr className="item">
                            <td className="option">
                                Increase price when bying from Orderbook:
                            </td>
                            <td className="value">
                                <input
                                    className="increase-min-price"
                                    type="checkbox"
                                    checked={increaseMinPrice}
                                    onChange={() => setIncreaseMinPrice((prev) => !prev)}
                                ></input>
                            </td>
                        </tr>
                        <tr className="item">
                            <td className="option">
                                Show market value:
                            </td>
                            <td className="value">
                                <input
                                    className="enabled-market-balance"
                                    type="checkbox"
                                    checked={enabledMarketBalance}
                                    onChange={handleEnabledMarketBalance}
                                ></input>
                            </td>
                        </tr>
                        <tr className="item">
                            <td className="option">
                                Min trade filter:
                            </td>
                            <td className="value">
                                <input
                                    className="notional-filter"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={tradeNotionalFilter}
                                    onChange={(e) => handleTradeNotionalFilterChange(e.target.value)}
                                ></input>
                            </td>
                        </tr>
                        <tr className="item">
                            <td className="option">
                                Min activity volume (USDT):
                            </td>
                            <td className="value">
                                <input
                                    className="activity-volume-filter"
                                    type="text"
                                    defaultValue={new Intl.NumberFormat('de-DE').format(activityVolumeFilter)}
                                    onBlur={(e) => {
                                        const value = e.target.value.replace(/\./g, '');
                                        handleActivityVolumeFilterChange(value);
                                        // Re-format the input value after blur
                                        if (value && !isNaN(value)) {
                                            e.target.value = new Intl.NumberFormat('de-DE').format(value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const value = e.target.value.replace(/\./g, '');
                                            handleActivityVolumeFilterChange(value);
                                            if (value && !isNaN(value)) {
                                                e.target.value = new Intl.NumberFormat('de-DE').format(value);
                                            }
                                            e.target.blur();
                                        }
                                    }}
                                    onChange={(e) => {
                                        // Allow only numbers and dots
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        if (val !== e.target.value) {
                                            e.target.value = val;
                                        }
                                    }}
                                ></input>
                            </td>
                        </tr>
                        <tr className="item">
                            <td className="option">
                                Min analytics volume (USDT):
                            </td>
                            <td className="value">
                                <input
                                    className="analytics-volume-filter"
                                    type="text"
                                    defaultValue={new Intl.NumberFormat('de-DE').format(analyticsVolumeFilter)}
                                    onBlur={(e) => {
                                        const value = e.target.value.replace(/\./g, '');
                                        handleAnalyticsVolumeFilterChange(value);
                                        if (value && !isNaN(value)) {
                                            e.target.value = new Intl.NumberFormat('de-DE').format(value);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const value = e.target.value.replace(/\./g, '');
                                            handleAnalyticsVolumeFilterChange(value);
                                            if (value && !isNaN(value)) {
                                                e.target.value = new Intl.NumberFormat('de-DE').format(value);
                                            }
                                            e.target.blur();
                                        }
                                    }}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        if (val !== e.target.value) {
                                            e.target.value = val;
                                        }
                                    }}
                                ></input>
                            </td>
                        </tr>
                    </tbody>
                </table>
            )
            break
        case 'notifications':
            if (notificationHistory && notificationHistory.length > 0) {
                feed = (
                    <div className="notifications-history-container">
                        <div className="notifications-history-header">
                            <span className="notifications-count">{notificationHistory.length} notifications</span>
                            <button className="notifications-clear-btn" onClick={clearHistory}>
                                Clear All
                            </button>
                        </div>
                        <div className="notifications-history-list">
                            {notificationHistory.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-history-item notification-history-${notification.type}`}
                                >
                                    <div className="notification-history-type">
                                        {getNotificationTypeLabel(notification.type)}
                                    </div>
                                    <div className="notification-history-message">
                                        {notification.message}
                                    </div>
                                    <div className="notification-history-time">
                                        {formatNotificationTime(notification.timestamp)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else {
                feed = <div className="color-white notifications-empty">No notifications yet</div>;
            }
            break
        default:
            feed = ''
    }

    return (
        <div className="trades-panel">
            <div className="header">
                <div
                    id="trades"
                    className={'item ' + (menu === 'trades' ? 'selected' : '')}
                    onClick={handleMenuClick}
                >
                    Trades
                </div>
                <div
                    id="history"
                    className={'item ' + (menu === 'history' ? 'selected' : '')}
                    onClick={handleMenuClick}
                >
                    History
                </div>
                <div
                    id="notifications"
                    className={'item ' + (menu === 'notifications' ? 'selected' : '') + (notificationHistory.length > 0 ? ' has-notifications' : '')}
                    onClick={handleMenuClick}
                >
                    Notifications
                    {notificationHistory.length > 0 && (
                        <span className="notification-badge">{notificationHistory.length > 99 ? '99+' : notificationHistory.length}</span>
                    )}
                </div>
                <div
                    id="settings"
                    className={'item ' + (menu === 'settings' ? 'selected' : '')}
                    onClick={handleMenuClick}
                >
                    Settings
                </div>
            </div>
            <div className="feed">{feed}</div>
        </div>
    )
}

export default TradesPanel
