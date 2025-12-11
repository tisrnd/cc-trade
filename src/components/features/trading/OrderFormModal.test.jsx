import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderFormModal from './OrderFormModal'
import * as DataContextModule from '../../../context/DataContext'
import { createMockDataContextValue } from '@/test/mocks'

// Mock DataContext
vi.mock('../../../context/DataContext', () => ({
    useDataContext: vi.fn()
}))

describe('OrderFormModal', () => {
    const mockOnHide = vi.fn()
    const mockOnSave = vi.fn()

    const defaultContext = createMockDataContextValue({
        balances: {
            USDT: { available: '1000' },
            BTC: { available: '1' }
        },
        filters: {
            BTCUSDT: {
                tickSize: '0.01',
                stepSize: '0.0001',
                price: 2,
                quantity: 4,
                notional: 2
            }
        },
        panel: { selected: 'BTCUSDT', market: 'USDT' }
    })

    it('should render correctly when shown', () => {
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(defaultContext)
        render(
            <OrderFormModal
                show={true}
                onHide={mockOnHide}
                onSave={mockOnSave}
                initialData={{}}
            />
        )

        expect(screen.getByText('BUY BTCUSDT')).toBeInTheDocument()
        expect(screen.getByLabelText('Price (USDT)')).toBeInTheDocument()
    })

    it('should calculate total when price and amount change', async () => {
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(defaultContext)
        render(
            <OrderFormModal
                show={true}
                onHide={mockOnHide}
                onSave={mockOnSave}
                initialData={{}}
            />
        )

        const priceInput = screen.getByLabelText('Price (USDT)')
        const amountInput = screen.getByLabelText('Amount')
        const totalInput = screen.getByLabelText('Total (USDT)')

        fireEvent.change(priceInput, { target: { value: '50000' } })
        fireEvent.change(amountInput, { target: { value: '0.1' } })

        await waitFor(() => {
            expect(totalInput.value).toBe('5000.00')
        })
    })

    it('should call onSave with correct data', () => {
        vi.spyOn(DataContextModule, 'useDataContext').mockReturnValue(defaultContext)
        render(
            <OrderFormModal
                show={true}
                onHide={mockOnHide}
                onSave={mockOnSave}
                initialData={{}}
            />
        )

        fireEvent.change(screen.getByLabelText('Price (USDT)'), { target: { value: '50000' } })
        fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '0.1' } })

        fireEvent.click(screen.getByTestId('submit-order-btn'))

        expect(mockOnSave).toHaveBeenCalledWith({
            price: 50000,
            amount: 0.1,
            side: 'BUY',
            symbol: 'BTCUSDT',
            id: undefined
        })
    })
})
