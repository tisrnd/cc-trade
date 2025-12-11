import { useState, useEffect, useCallback, useRef } from 'react';
import { createChannelId, createChannelData, CHANNEL_TYPES, isValidMessageForChannel } from '../utils/channels';

/**
 * Hook for managing a single channel subscription
 * 
 * This hook creates and manages a channel subscription, handling:
 * - Subscription lifecycle (subscribe on mount, unsubscribe on unmount)
 * - Data updates from the channel
 * - Loading states
 * 
 * @param {Object} wsApi - WebSocket API from useWebSocket ({ subscribe, unsubscribe })
 * @param {string} channelType - Channel type (detail, mini)
 * @param {string} symbol - Trading symbol
 * @param {string} interval - Candle interval
 * @param {Object} options - Optional configuration
 * @returns {Object} { channelId, data, isLoading, error, resubscribe }
 */
const useChannel = (wsApi, channelType, symbol, interval, options = {}) => {
    const { autoSubscribe = true } = options;

    const [channelId, setChannelId] = useState(null);
    const [data, setData] = useState(() => createChannelData(channelType));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const channelIdRef = useRef(null);
    const subscriptionParamsRef = useRef({ channelType, symbol, interval });

    /**
     * Subscribe to the channel
     */
    const subscribeToChannel = useCallback(() => {
        if (!wsApi?.subscribe || !symbol || !interval) {
            return null;
        }

        // Generate new channel ID
        const newChannelId = createChannelId(channelType, symbol, interval);
        channelIdRef.current = newChannelId;
        setChannelId(newChannelId);
        setIsLoading(true);
        setError(null);
        setData(createChannelData(channelType));

        // Subscribe
        const success = wsApi.subscribe({
            channelId: newChannelId,
            channelType,
            symbol,
            interval
        });

        if (!success) {
            setError('Failed to subscribe');
            setIsLoading(false);
        }

        return newChannelId;
    }, [wsApi, channelType, symbol, interval]);

    /**
     * Unsubscribe from the channel
     */
    const unsubscribeFromChannel = useCallback(() => {
        if (channelIdRef.current && wsApi?.unsubscribe) {
            wsApi.unsubscribe(channelIdRef.current);
            channelIdRef.current = null;
            setChannelId(null);
        }
    }, [wsApi]);

    /**
     * Force resubscribe (useful for refresh/retry)
     */
    const resubscribe = useCallback(() => {
        unsubscribeFromChannel();
        return subscribeToChannel();
    }, [unsubscribeFromChannel, subscribeToChannel]);

    /**
     * Handle incoming data for this channel
     */
    const handleChannelData = useCallback((type, payload, extra) => {
        if (!isValidMessageForChannel(channelType, type)) {
            return;
        }

        setData(prev => {
            const next = { ...prev, lastUpdate: Date.now() };

            switch (type) {
                case 'chart':
                    // Full chart update or incremental
                    if (Array.isArray(payload) && payload.length > 1) {
                        // Full chart data
                        next.chart = payload;
                        next.isLoading = false;
                    } else if (Array.isArray(payload) && payload.length === 1) {
                        // Incremental update
                        const candle = payload[0];
                        const existingIndex = prev.chart.findIndex(c => c.time === candle.time);
                        if (existingIndex >= 0) {
                            next.chart = [...prev.chart];
                            next.chart[existingIndex] = candle;
                        } else if (prev.chart.length === 0 || candle.time > prev.chart[prev.chart.length - 1]?.time) {
                            next.chart = [...prev.chart, candle];
                        }
                    }
                    if (extra) {
                        next.lastTick = extra;
                    }
                    break;

                case 'depth':
                    next.depth = payload;
                    break;

                case 'trades':
                    if (Array.isArray(payload)) {
                        next.trades = payload;
                    } else {
                        // Single trade
                        next.trades = [payload, ...(prev.trades || [])].slice(0, 100);
                    }
                    break;

                case 'orders':
                    next.orders = payload;
                    break;

                case 'balances':
                    next.balances = payload;
                    break;

                case 'history':
                    next.history = payload;
                    break;

                case 'execution_update':
                    // Handle order updates
                    if (prev.orders && payload) {
                        // This would need more complex logic to update orders array
                        // For now, the DataContext handles this
                    }
                    break;

                default:
                    break;
            }

            return next;
        });

        // Clear loading state on first data
        if (type === 'chart') {
            setIsLoading(false);
        }
    }, [channelType]);

    // Subscribe on mount or when params change
    useEffect(() => {
        const prevParams = subscriptionParamsRef.current;
        const paramsChanged =
            prevParams.symbol !== symbol ||
            prevParams.interval !== interval ||
            prevParams.channelType !== channelType;

        subscriptionParamsRef.current = { channelType, symbol, interval };

        if (autoSubscribe && (paramsChanged || !channelIdRef.current)) {
            // Unsubscribe from old channel if params changed
            if (paramsChanged && channelIdRef.current) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                unsubscribeFromChannel();
            }
            subscribeToChannel();
        }

        return () => {
            if (autoSubscribe) {
                unsubscribeFromChannel();
            }
        };
    }, [autoSubscribe, channelType, symbol, interval, subscribeToChannel, unsubscribeFromChannel]);

    return {
        channelId,
        data,
        isLoading,
        error,
        resubscribe,
        subscribe: subscribeToChannel,
        unsubscribe: unsubscribeFromChannel,
        handleChannelData
    };
};

export default useChannel;
export { useChannel };

