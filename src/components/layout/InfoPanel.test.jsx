import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import InfoPanel from './InfoPanel'
import * as DataContextModule from '../../context/DataContext'
import { createMockDataContextValue } from '@/test/mocks'

// Mock DataContext
vi.mock('../../context/DataContext', () => ({
    useDataContext: vi.fn()
}))

describe('InfoPanel', () => {
    const mockHandleRequest = vi.fn()
    const mockHandlePanelUpdate = vi.fn()

    const defaultContext = createMockDataContextValue({
        handlePanelUpdate: mockHandlePanelUpdate,
        balances: {},
        orders: [],
        filters: {},
        ticker: [],
        marketHistory: [],
    })

    it('should render tabs correctly', () => {
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(defaultContext)
        render(<InfoPanel handleRequest={mockHandleRequest} />)

        expect(screen.getByText('Journal')).toBeInTheDocument()
        expect(screen.getByText('Orders')).toBeInTheDocument()
        expect(screen.getByText('Balances')).toBeInTheDocument()
    })

    it('should switch tabs', () => {
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(defaultContext)
        render(<InfoPanel handleRequest={mockHandleRequest} />)

        const balancesTab = screen.getByText('Balances')
        fireEvent.click(balancesTab)

        expect(balancesTab.className).toContain('selected')
        expect(screen.getByText('Coin')).toBeInTheDocument() // Header for balances
    })

    it('should display orders', () => {
        const contextWithOrders = createMockDataContextValue({
            handlePanelUpdate: mockHandlePanelUpdate,
            orders: [
                {
                    orderId: 1,
                    symbol: 'BTCUSDT',
                    price: '50000',
                    origQty: '1',
                    side: 'BUY',
                    time: Date.now(),
                }
            ],
            filters: {
                BTCUSDT: { tickSize: '0.01', stepSize: '0.000001' }
            }
        })
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(contextWithOrders)
        render(<InfoPanel handleRequest={mockHandleRequest} />)

        expect(screen.getByText('BTCUSDT')).toBeInTheDocument()
        expect(screen.getByText('50000.00')).toBeInTheDocument()
    })

    it('should display balances', () => {
        const contextWithBalances = createMockDataContextValue({
            handlePanelUpdate: mockHandlePanelUpdate,
            balances: {
                BTC: { available: '1.5', onOrder: '0' }
            },
            ticker: [{ symbol: 'BTCUSDT', lastPrice: '50000' }],
            filters: {
                BTCUSDT: { tickSize: '0.01', stepSize: '0.000001' }
            }
        })
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(contextWithBalances)
        render(<InfoPanel handleRequest={mockHandleRequest} />)

        // Switch to balances tab
        fireEvent.click(screen.getByText('Balances'))

        expect(screen.getByText('BTC')).toBeInTheDocument()
        expect(screen.getByText('1.500000')).toBeInTheDocument()
    })
})
