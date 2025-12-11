import { describe, it, expect } from 'vitest'
import { round, getMarket, getCoin, filterCoins, balanceUpdate } from './utils'

describe('utils', () => {
    describe('round', () => {
        it('should round to specified precision', () => {
            expect(round(1.2345, 2)).toBe(1.23)
            expect(round(1.2355, 2)).toBe(1.24)
            expect(round(10, 2)).toBe(10)
        })

        it('should default to precision 0', () => {
            expect(round(1.5)).toBe(2)
            expect(round(1.4)).toBe(1)
        })
    })

    describe('getMarket', () => {
        it('should return USDT for USDT pairs', () => {
            expect(getMarket('BTCUSDT')).toBe('USDT')
        })

        it('should return BTC for BTC pairs', () => {
            expect(getMarket('ETHBTC')).toBe('BTC')
        })
    })

    describe('getCoin', () => {
        it('should return coin symbol', () => {
            expect(getCoin('BTCUSDT')).toBe('BTC')
            expect(getCoin('ETHBTC')).toBe('ETH')
        })
    })

    describe('filterCoins', () => {
        it('should filter coins by market and exclude list', () => {
            const symbols = ['BTCUSDT', 'ETHUSDT', 'XRPBTC', 'BADUSDT']
            const markets = ['USDT']
            const exclude = ['BADUSDT']

            const result = filterCoins(symbols, markets, exclude)
            expect(result).toContain('BTCUSDT')
            expect(result).toContain('ETHUSDT')
            expect(result).not.toContain('XRPBTC')
            expect(result).not.toContain('BADUSDT')
        })
    })

    describe('balanceUpdate', () => {
        it('should merge new balance data into old data', () => {
            const oldData = { BTC: { available: 1 }, ETH: { available: 2 } }
            const newData = { BTC: { available: 1.5 } }
            const result = balanceUpdate(newData, oldData)

            expect(result.BTC.available).toBe(1.5)
            expect(result.ETH.available).toBe(2)
        })
    })
})
