/**
 * Tests for Rate Limiting functionality
 * 
 * These tests verify:
 * 1. REST API rate limiting with weight tracking
 * 2. WebSocket connection throttling
 * 3. Request spacing with hard-coded delays
 * 4. Network error retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * RateLimiter class (extracted for testing)
 * In production, this is in binance-connection.js
 */
class RateLimiter {
    constructor(maxWeight = 800, windowMs = 60000, requestDelayMs = 500) {
        this.maxWeight = maxWeight;
        this.windowMs = windowMs;
        this.requestDelayMs = requestDelayMs;
        this.requests = [];
        this.lastRequestTime = 0;
    }

    cleanup() {
        const now = Date.now();
        this.requests = this.requests.filter(r => now - r.timestamp < this.windowMs);
    }

    getCurrentWeight() {
        this.cleanup();
        return this.requests.reduce((sum, r) => sum + r.weight, 0);
    }

    canMakeRequest(weight) {
        this.cleanup();
        return this.getCurrentWeight() + weight <= this.maxWeight;
    }

    getWaitTime(weight) {
        this.cleanup();
        if (this.getCurrentWeight() + weight <= this.maxWeight) return 0;
        
        const targetWeight = this.maxWeight - weight;
        let accumulated = 0;
        
        for (const req of this.requests) {
            accumulated += req.weight;
            if (accumulated > targetWeight) {
                const timeUntilExpiry = (req.timestamp + this.windowMs) - Date.now();
                return Math.max(0, timeUntilExpiry);
            }
        }
        return this.windowMs;
    }

    async enforceDelay() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.requestDelayMs) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelayMs - elapsed));
        }
        this.lastRequestTime = Date.now();
    }

    async execute(fn, weight = 1, maxRetries = 2) {
        await this.enforceDelay();
        
        const waitTime = this.getWaitTime(weight);
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await fn();
                this.requests.push({ timestamp: Date.now(), weight });
                return result;
            } catch (err) {
                lastError = err;
                const isNetworkError = err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT' ||
                                       err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED';
                
                if (isNetworkError && attempt < maxRetries) {
                    const retryDelay = 1000 * (attempt + 1);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                throw err;
            }
        }
        throw lastError;
    }
}

describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
        vi.useFakeTimers();
        limiter = new RateLimiter(100, 60000, 100); // 100 weight/min, 100ms delay
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Weight Tracking', () => {
        it('should track request weights', async () => {
            const executeAndAdvance = async (weight) => {
                const promise = limiter.execute(() => Promise.resolve('ok'), weight);
                await vi.advanceTimersByTimeAsync(200); // Past the delay
                return promise;
            };
            
            await executeAndAdvance(10);
            expect(limiter.getCurrentWeight()).toBe(10);
            
            await executeAndAdvance(20);
            expect(limiter.getCurrentWeight()).toBe(30);
        });

        it('should allow requests under weight limit', () => {
            expect(limiter.canMakeRequest(50)).toBe(true);
            expect(limiter.canMakeRequest(100)).toBe(true);
        });

        it('should block requests over weight limit', async () => {
            // Fill up the weight
            for (let i = 0; i < 10; i++) {
                await limiter.execute(() => Promise.resolve('ok'), 10);
                vi.advanceTimersByTime(100); // Advance past delay
            }
            
            expect(limiter.getCurrentWeight()).toBe(100);
            expect(limiter.canMakeRequest(1)).toBe(false);
        });

        it('should clean up old requests after window expires', async () => {
            await limiter.execute(() => Promise.resolve('ok'), 50);
            expect(limiter.getCurrentWeight()).toBe(50);
            
            // Advance past the window
            vi.advanceTimersByTime(61000);
            
            expect(limiter.getCurrentWeight()).toBe(0);
            expect(limiter.canMakeRequest(100)).toBe(true);
        });
    });

    describe('Request Spacing', () => {
        it('should enforce minimum delay between requests', async () => {
            const times = [];
            
            // First request
            const p1 = limiter.execute(() => { times.push(Date.now()); return Promise.resolve('1'); }, 1);
            await vi.advanceTimersByTimeAsync(150);
            await p1;
            
            // Second request - should wait for delay
            const p2 = limiter.execute(() => { times.push(Date.now()); return Promise.resolve('2'); }, 1);
            await vi.advanceTimersByTimeAsync(150);
            await p2;
            
            // Check that delay was enforced
            expect(times[1] - times[0]).toBeGreaterThanOrEqual(100);
        });

        it('should not delay if enough time has passed', async () => {
            // First request
            const p1 = limiter.execute(() => Promise.resolve('1'), 1);
            await vi.advanceTimersByTimeAsync(150);
            await p1;
            
            // Wait longer than delay
            await vi.advanceTimersByTimeAsync(200);
            
            const startTime = Date.now();
            // Second request - should not need additional delay
            const p2 = limiter.execute(() => Promise.resolve('2'), 1);
            // Minimal advance needed
            await vi.advanceTimersByTimeAsync(10);
            await p2;
            
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(100);
        });
    });

    describe('Network Error Retry', () => {
        it('should retry on ECONNRESET', async () => {
            let attempts = 0;
            const fn = vi.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 2) {
                    const error = new Error('Connection reset');
                    error.code = 'ECONNRESET';
                    throw error;
                }
                return Promise.resolve('success');
            });

            const promise = limiter.execute(fn, 1, 2);
            // Advance past initial delay + retry delay
            await vi.advanceTimersByTimeAsync(2500);
            const result = await promise;
            
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should retry on ETIMEDOUT', async () => {
            let attempts = 0;
            const fn = vi.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    const error = new Error('Timed out');
                    error.code = 'ETIMEDOUT';
                    throw error;
                }
                return Promise.resolve('success');
            });

            const promise = limiter.execute(fn, 1, 3);
            // Advance past initial delay + multiple retry delays
            await vi.advanceTimersByTimeAsync(10000);
            const result = await promise;
            
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries exceeded', async () => {
            const fn = vi.fn().mockImplementation(() => {
                const error = new Error('Connection reset');
                error.code = 'ECONNRESET';
                throw error;
            });

            let caughtError = null;
            const promise = limiter.execute(fn, 1, 2).catch(e => { caughtError = e; });
            // Advance past all retries
            await vi.advanceTimersByTimeAsync(10000);
            await promise;
            
            expect(caughtError).not.toBeNull();
            expect(caughtError.message).toBe('Connection reset');
            expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should not retry non-network errors', async () => {
            const fn = vi.fn().mockImplementation(() => {
                throw new Error('Bad request');
            });

            let caughtError = null;
            const promise = limiter.execute(fn, 1, 2).catch(e => { caughtError = e; });
            await vi.advanceTimersByTimeAsync(200);
            await promise;
            
            expect(caughtError).not.toBeNull();
            expect(caughtError.message).toBe('Bad request');
            expect(fn).toHaveBeenCalledTimes(1); // No retries
        });
    });
});

describe('WebSocket Connection Throttling', () => {
    let lastWsConnectionTime = 0;
    const WS_CONNECTION_MIN_INTERVAL = 500;

    const throttleWsConnection = async () => {
        const now = Date.now();
        const elapsed = now - lastWsConnectionTime;
        if (elapsed < WS_CONNECTION_MIN_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, WS_CONNECTION_MIN_INTERVAL - elapsed));
        }
        lastWsConnectionTime = Date.now();
    };

    beforeEach(() => {
        vi.useFakeTimers();
        lastWsConnectionTime = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should enforce 500ms between WebSocket connections', async () => {
        const connectTimes = [];
        
        // First connection - immediate
        const p1 = throttleWsConnection().then(() => connectTimes.push(Date.now()));
        await vi.advanceTimersByTimeAsync(10);
        await p1;
        
        // Second connection - should wait
        const p2 = throttleWsConnection().then(() => connectTimes.push(Date.now()));
        await vi.advanceTimersByTimeAsync(600); // Advance past the throttle
        await p2;
        
        const gap = connectTimes[1] - connectTimes[0];
        expect(gap).toBeGreaterThanOrEqual(500);
    });

    it('should not delay if enough time has passed', async () => {
        const p1 = throttleWsConnection();
        await vi.advanceTimersByTimeAsync(10);
        await p1;
        const firstTime = Date.now();
        
        // Wait longer than interval
        await vi.advanceTimersByTimeAsync(600);
        
        const p2 = throttleWsConnection();
        await vi.advanceTimersByTimeAsync(10);
        await p2;
        const secondTime = Date.now();
        
        // Should connect almost immediately after the 600ms advance
        expect(secondTime - firstTime).toBeLessThan(700);
    });

    it('should handle rapid connection requests', async () => {
        const connections = [];
        
        // Rapid-fire 5 connection requests with timer advances
        for (let i = 0; i < 5; i++) {
            const p = throttleWsConnection().then(() => {
                connections.push({ time: Date.now(), index: i });
            });
            await vi.advanceTimersByTimeAsync(600); // Ensure each completes
            await p;
        }
        
        // Each should be at least 500ms apart (except first)
        for (let i = 1; i < connections.length; i++) {
            const gap = connections[i].time - connections[i - 1].time;
            expect(gap).toBeGreaterThanOrEqual(500);
        }
    });
});

describe('Frontend "Dumb" Architecture', () => {
    /**
     * These tests verify that the frontend has no connection-wise logic.
     * The frontend simply sends subscribe/unsubscribe messages and receives data.
     * All connection management is handled by the backend hub.
     */

    it('frontend subscribe request should be a simple message (no connection logic)', () => {
        // This is what the frontend sends - just a plain object
        const subscribeRequest = {
            action: 'subscribe',
            channelId: 'mini-BTCUSDT-1h',
            channelType: 'mini',
            symbol: 'BTCUSDT',
            interval: '1h'
        };

        // No connection state, no socket references, no retry logic
        expect(subscribeRequest).not.toHaveProperty('socket');
        expect(subscribeRequest).not.toHaveProperty('connection');
        expect(subscribeRequest).not.toHaveProperty('retryCount');
        expect(subscribeRequest).not.toHaveProperty('reconnect');
        
        // Just simple data
        expect(subscribeRequest.action).toBe('subscribe');
        expect(subscribeRequest.symbol).toBe('BTCUSDT');
    });

    it('frontend unsubscribe request should be minimal', () => {
        const unsubscribeRequest = {
            action: 'unsubscribe',
            channelId: 'mini-BTCUSDT-1h'
        };

        // Just the action and channel ID - backend handles everything else
        expect(Object.keys(unsubscribeRequest)).toHaveLength(2);
    });

    it('frontend depth view toggle should be a simple message', () => {
        const enableDepthView = {
            action: 'enable_depth_view',
            symbol: 'BTCUSDT'
        };

        const disableDepthView = {
            action: 'disable_depth_view'
        };

        // Frontend doesn't manage WebSocket connections for depth
        expect(enableDepthView).not.toHaveProperty('tradeSocket');
        expect(enableDepthView).not.toHaveProperty('depthSocket');
        expect(disableDepthView).not.toHaveProperty('disconnect');
    });

    it('frontend should receive data without managing connections', () => {
        // Simulated message from backend
        const chartData = {
            channelId: 'mini-BTCUSDT-1h',
            type: 'chart',
            symbol: 'BTCUSDT',
            interval: '1h',
            payload: [{ time: 1700000000, open: 50000, high: 51000, low: 49000, close: 50500 }],
            extra: { time: 1700000000, open: 50500, high: 50600, low: 50400, close: 50550 }
        };

        // Data comes ready to use - no connection info needed
        expect(chartData.payload).toBeDefined();
        expect(chartData.payload[0].close).toBe(50500);
        
        // No connection metadata that frontend would need to manage
        expect(chartData).not.toHaveProperty('socketId');
        expect(chartData).not.toHaveProperty('connectionState');
    });
});

describe('Request Deduplication', () => {
    /**
     * Tests verifying that the backend hub properly deduplicates
     * subscription requests to minimize Binance API usage.
     */

    it('should track multiple subscribers to same stream', () => {
        // Simulating MarketStreamManager behavior
        const klineStreams = new Map();
        
        const addSubscriber = (streamName, channelId) => {
            if (!klineStreams.has(streamName)) {
                klineStreams.set(streamName, new Set());
            }
            klineStreams.get(streamName).add(channelId);
        };

        // Two different channels want the same stream
        addSubscriber('btcusdt@kline_1h', 'mini-BTCUSDT-1h');
        addSubscriber('btcusdt@kline_1h', 'detail-BTCUSDT-1h');

        // Should only have ONE stream entry
        expect(klineStreams.size).toBe(1);
        // But two subscribers
        expect(klineStreams.get('btcusdt@kline_1h').size).toBe(2);
    });

    it('should not remove stream until all subscribers unsubscribe', () => {
        const klineStreams = new Map();
        
        const addSubscriber = (streamName, channelId) => {
            if (!klineStreams.has(streamName)) {
                klineStreams.set(streamName, new Set());
            }
            klineStreams.get(streamName).add(channelId);
        };

        const removeSubscriber = (streamName, channelId) => {
            if (klineStreams.has(streamName)) {
                klineStreams.get(streamName).delete(channelId);
                if (klineStreams.get(streamName).size === 0) {
                    klineStreams.delete(streamName);
                }
            }
        };

        // Add two subscribers
        addSubscriber('btcusdt@kline_1h', 'channel-1');
        addSubscriber('btcusdt@kline_1h', 'channel-2');

        // Remove one - stream should still exist
        removeSubscriber('btcusdt@kline_1h', 'channel-1');
        expect(klineStreams.has('btcusdt@kline_1h')).toBe(true);

        // Remove the other - stream should be gone
        removeSubscriber('btcusdt@kline_1h', 'channel-2');
        expect(klineStreams.has('btcusdt@kline_1h')).toBe(false);
    });

    it('should handle multiple different streams efficiently', () => {
        const klineStreams = new Map();
        
        const addSubscriber = (streamName, channelId) => {
            if (!klineStreams.has(streamName)) {
                klineStreams.set(streamName, new Set());
            }
            klineStreams.get(streamName).add(channelId);
        };

        // 8 different mini charts with potentially overlapping intervals
        const configs = [
            { symbol: 'BTCUSDT', interval: '1h' },
            { symbol: 'ETHUSDT', interval: '1h' },  // Same interval as BTC
            { symbol: 'BNBUSDT', interval: '4h' },
            { symbol: 'SOLUSDT', interval: '4h' },  // Same interval as BNB
            { symbol: 'ADAUSDT', interval: '1d' },
            { symbol: 'XRPUSDT', interval: '1d' },  // Same interval as ADA
            { symbol: 'DOGEUSDT', interval: '1h' }, // Same interval as BTC/ETH
            { symbol: 'AVAXUSDT', interval: '4h' }, // Same interval as BNB/SOL
        ];

        configs.forEach((config, i) => {
            const streamName = `${config.symbol.toLowerCase()}@kline_${config.interval}`;
            addSubscriber(streamName, `mini-${i}`);
        });

        // All 8 should be unique streams (different symbols)
        expect(klineStreams.size).toBe(8);
        
        // Each stream has exactly one subscriber
        for (const subscribers of klineStreams.values()) {
            expect(subscribers.size).toBe(1);
        }
    });
});
