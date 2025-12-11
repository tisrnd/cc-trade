import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataProvider, useDataContext } from './DataContext'
import { NotificationProvider } from './NotificationProvider'
import { attachMockLocalStorage } from '@/test/mocks'

// Mock localStorage
const _localStorageMock = attachMockLocalStorage()

// Mock dependencies
vi.mock('../hooks/useWebSocket', () => ({
    default: vi.fn(() => ({
        send: vi.fn(),
        readyState: 1,
        connection: null,
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        sendMessage: vi.fn(),
    }))
}))

vi.mock('../utils/storage', () => ({
    readStorage: vi.fn((key, def) => def),
    writeStorage: vi.fn()
}))

vi.mock('../utils/cache', () => ({
    initCache: vi.fn(() => Promise.resolve()),
    getCachedCandles: vi.fn(() => Promise.resolve(null)),
    setCachedCandles: vi.fn(() => Promise.resolve()),
    mergeCandles: vi.fn(),
    getCacheStats: vi.fn(() => Promise.resolve({ candles: 0, trades: 0, alerts: 0, exchangeInfo: false })),
}))

// Test component to consume context
const TestConsumer = () => {
    const context = useDataContext()
    return (
        <div>
            <span data-testid="selected">{context.panel.selected}</span>
            <span data-testid="market">{context.panel.market}</span>
        </div>
    )
}

// Wrapper with required providers
const TestWrapper = ({ children }) => (
    <NotificationProvider>
        {children}
    </NotificationProvider>
)

describe('DataContext', () => {
    it('should provide default values', () => {
        render(
            <TestWrapper>
                <DataProvider>
                    <TestConsumer />
                </DataProvider>
            </TestWrapper>
        )

        expect(screen.getByTestId('selected').textContent).toBe('PAXUSDT')
        expect(screen.getByTestId('market').textContent).toBe('USDT')
    })
})
