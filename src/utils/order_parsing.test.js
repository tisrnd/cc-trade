
import { describe, it, expect } from 'vitest';
import { parseData } from './utils';

describe('Order Partial Fill Bug Reproduction', () => {
    it('should correctly update order quantity on partial fill', () => {
        // Initial state: One open order
        const initialOrders = [{
            orderId: 12345,
            origQty: 100, // Original quantity
            price: 10,
            side: 'BUY',
            status: 'NEW',
            symbol: 'BTCUSDT',
            time: 1600000000000
        }];
        const initialHistory = [];
        const panel = { market: 'USDT' };

        // Simulate execution_update with PARTIALLY_FILLED
        const updateMessage = JSON.stringify({
            requestId: 'req1',
            execution_update: {
                e: 'executionReport',
                E: 1600000001000,
                s: 'BTCUSDT',
                c: 'clientOid',
                S: 'BUY',
                o: 'LIMIT',
                f: 'GTC',
                q: '100.00000000',
                p: '10.00000000',
                P: '0.00000000',
                F: '0.00000000',
                g: -1,
                C: '',
                x: 'TRADE',
                X: 'PARTIALLY_FILLED',
                r: 'NONE',
                i: 12345,
                l: '10.00000000',
                z: '10.00000000',
                L: '10.00000000',
                n: '0',
                N: null,
                T: 1600000001000,
                t: 1,
                I: 12346,
                w: false,
                m: false,
                M: false,
                O: 1600000000000,
                Z: '100.00000000',
                Y: '100.00000000',
                Q: '0.00000000'
            }
        });

        const result = parseData(updateMessage, initialOrders, initialHistory, panel);

        expect(result).not.toBeNull();
        expect(result.type).toBe('execution_update');

        const updatedOrders = result.payload;
        expect(updatedOrders).toHaveLength(1);

        const updatedOrder = updatedOrders[0];
        // If origQty tracks remaining quantity, it should be 100 - 10 = 90
        expect(updatedOrder.origQty).toBe(90);
    });

    it('should correctly handle multiple partial fills', () => {
        // State after first fill (remaining: 90)
        const ordersAfterFirstFill = [{
            orderId: 12345,
            origQty: 90,
            price: 10,
            side: 'BUY',
            status: 'PARTIALLY_FILLED',
            symbol: 'BTCUSDT',
            time: 1600000000000
        }];
        const history = [];
        const panel = { market: 'USDT' };

        // Simulate second execution_update with PARTIALLY_FILLED
        const updateMessage = JSON.stringify({
            requestId: 'req2',
            execution_update: {
                e: 'executionReport',
                E: 1600000002000,
                s: 'BTCUSDT',
                c: 'clientOid',
                S: 'BUY',
                o: 'LIMIT',
                f: 'GTC',
                q: '100.00000000',
                p: '10.00000000',
                P: '0.00000000',
                F: '0.00000000',
                g: -1,
                C: '',
                x: 'TRADE',
                X: 'PARTIALLY_FILLED',
                r: 'NONE',
                i: 12345,
                l: '20.00000000',
                z: '30.00000000',
                L: '10.00000000',
                n: '0',
                N: null,
                T: 1600000002000,
                t: 2,
                I: 12347,
                w: false,
                m: false,
                M: false,
                O: 1600000000000,
                Z: '200.00000000',
                Y: '200.00000000',
                Q: '0.00000000'
            }
        });

        const result = parseData(updateMessage, ordersAfterFirstFill, history, panel);

        const updatedOrders = result.payload;
        const updatedOrder = updatedOrders[0];

        // If origQty tracks remaining quantity, it should be 90 - 20 = 70
        expect(updatedOrder.origQty).toBe(70);
    });

    it('should correctly parse orders snapshot and calculate remaining quantity', () => {
        const initialOrders = [];
        const initialHistory = [];
        const panel = { market: 'USDT' };

        // Simulate orders snapshot (e.g. from GET /openOrders)
        // Order has 100 original, 10 executed. Remaining should be 90.
        const snapshotMessage = JSON.stringify({
            requestId: 'req3',
            orders: [
                {
                    orderId: 12345,
                    origQty: '100.00000000',
                    executedQty: '10.00000000',
                    price: '10.00000000',
                    side: 'BUY',
                    status: 'PARTIALLY_FILLED',
                    symbol: 'BTCUSDT',
                    time: 1600000000000
                }
            ]
        });

        const result = parseData(snapshotMessage, initialOrders, initialHistory, panel);

        expect(result).not.toBeNull();
        expect(result.type).toBe('orders');

        const parsedOrders = result.payload;
        expect(parsedOrders).toHaveLength(1);

        const parsedOrder = parsedOrders[0];
        // origQty should be 100 - 10 = 90
        expect(parseFloat(parsedOrder.origQty)).toBe(90);
    });
});
