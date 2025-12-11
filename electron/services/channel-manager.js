/**
 * ChannelManager - Manages multiple WebSocket subscription channels
 * 
 * Channel Types:
 * - detail: Full trading view (chart, depth, trades, orders, balances, history)
 * - mini: Lightweight chart-only subscription
 * - global: Shared data (ticker, filters) - single instance
 */

const CHANNEL_TYPES = {
    DETAIL: 'detail',
    MINI: 'mini',
    GLOBAL: 'global'
};

// What data each channel type subscribes to
const CHANNEL_STREAMS = {
    [CHANNEL_TYPES.DETAIL]: ['kline', 'trade', 'depth'],
    [CHANNEL_TYPES.MINI]: ['kline'],
    [CHANNEL_TYPES.GLOBAL]: ['ticker']
};

class ChannelManager {
    constructor(logger) {
        this.channels = new Map();
        this.logger = logger || console;
    }

    /**
     * Create a new channel subscription
     * @param {string} channelId - Unique channel identifier
     * @param {string} type - Channel type (detail, mini, global)
     * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT')
     * @param {string} interval - Candle interval (e.g., '1h')
     * @returns {Object} The created channel
     */
    createChannel(channelId, type, symbol, interval) {
        if (this.channels.has(channelId)) {
            this.logger.warn(`Channel ${channelId} already exists, removing old one`);
            this.removeChannel(channelId);
        }

        const channel = {
            id: channelId,
            type,
            symbol: symbol?.toUpperCase(),
            interval,
            streams: CHANNEL_STREAMS[type] || [],
            wsConnection: null,
            depthCache: null,
            state: {
                initChart: true,
                initTrades: true,
                initDepth: true
            },
            createdAt: Date.now()
        };

        this.channels.set(channelId, channel);
        this.logger.info(`Channel created: ${channelId} (${type}, ${symbol}, ${interval})`);
        return channel;
    }

    /**
     * Get a channel by ID
     * @param {string} channelId
     * @returns {Object|null}
     */
    getChannel(channelId) {
        return this.channels.get(channelId) || null;
    }

    /**
     * Update channel properties
     * @param {string} channelId
     * @param {Object} updates
     * @returns {Object|null}
     */
    updateChannel(channelId, updates) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            this.logger.warn(`Cannot update non-existent channel: ${channelId}`);
            return null;
        }
        
        Object.assign(channel, updates);
        return channel;
    }

    /**
     * Set the WebSocket connection for a channel
     * @param {string} channelId
     * @param {Object} wsConnection
     */
    setChannelConnection(channelId, wsConnection) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.wsConnection = wsConnection;
        }
    }

    /**
     * Set the depth cache for a channel
     * @param {string} channelId
     * @param {Object} depthCache
     */
    setChannelDepthCache(channelId, depthCache) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.depthCache = depthCache;
        }
    }

    /**
     * Remove a channel and cleanup its resources
     * @param {string} channelId
     * @param {Function} disconnectFn - Async function to disconnect WebSocket
     * @returns {boolean}
     */
    async removeChannel(channelId, disconnectFn) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            return false;
        }

        // Cleanup WebSocket connection
        if (channel.wsConnection && disconnectFn) {
            try {
                await disconnectFn(channel.wsConnection, `channel ${channelId}`);
            } catch (err) {
                this.logger.warn(`Failed to disconnect channel ${channelId}:`, err);
            }
        }

        this.channels.delete(channelId);
        this.logger.info(`Channel removed: ${channelId}`);
        return true;
    }

    /**
     * Get all channels for a specific symbol
     * @param {string} symbol
     * @returns {Array}
     */
    getChannelsBySymbol(symbol) {
        const normalizedSymbol = symbol?.toUpperCase();
        const result = [];
        for (const channel of this.channels.values()) {
            if (channel.symbol === normalizedSymbol) {
                result.push(channel);
            }
        }
        return result;
    }

    /**
     * Get all channels of a specific type
     * @param {string} type
     * @returns {Array}
     */
    getChannelsByType(type) {
        const result = [];
        for (const channel of this.channels.values()) {
            if (channel.type === type) {
                result.push(channel);
            }
        }
        return result;
    }

    /**
     * Get the detail channel (there should only be one)
     * @returns {Object|null}
     */
    getDetailChannel() {
        const details = this.getChannelsByType(CHANNEL_TYPES.DETAIL);
        return details.length > 0 ? details[0] : null;
    }

    /**
     * Check if a channel exists
     * @param {string} channelId
     * @returns {boolean}
     */
    hasChannel(channelId) {
        return this.channels.has(channelId);
    }

    /**
     * Get all channel IDs
     * @returns {Array<string>}
     */
    getChannelIds() {
        return Array.from(this.channels.keys());
    }

    /**
     * Get channel count
     * @returns {number}
     */
    getChannelCount() {
        return this.channels.size;
    }

    /**
     * Cleanup all channels
     * @param {Function} disconnectFn - Async function to disconnect WebSocket
     */
    async cleanup(disconnectFn) {
        const channelIds = this.getChannelIds();
        this.logger.info(`Cleaning up ${channelIds.length} channels`);
        
        for (const channelId of channelIds) {
            await this.removeChannel(channelId, disconnectFn);
        }
    }

    /**
     * Get debug info about all channels
     * @returns {Object}
     */
    getDebugInfo() {
        const info = {};
        for (const [id, channel] of this.channels) {
            info[id] = {
                type: channel.type,
                symbol: channel.symbol,
                interval: channel.interval,
                hasConnection: !!channel.wsConnection,
                createdAt: channel.createdAt
            };
        }
        return info;
    }
}

/**
 * Generate a unique channel ID
 * @param {string} type - Channel type
 * @param {string} symbol - Trading symbol
 * @param {string} interval - Candle interval
 * @returns {string}
 */
function createChannelId(type, symbol, interval) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `${type}-${symbol?.toUpperCase()}-${interval}-${timestamp}-${random}`;
}

/**
 * Parse a channel ID to extract components
 * @param {string} channelId
 * @returns {Object}
 */
function parseChannelId(channelId) {
    if (!channelId || channelId === 'global') {
        return { type: 'global', symbol: null, interval: null };
    }
    
    const parts = channelId.split('-');
    if (parts.length < 3) {
        return { type: 'unknown', symbol: null, interval: null };
    }
    
    return {
        type: parts[0],
        symbol: parts[1],
        interval: parts[2]
    };
}

export { ChannelManager, CHANNEL_TYPES, CHANNEL_STREAMS, createChannelId, parseChannelId };

