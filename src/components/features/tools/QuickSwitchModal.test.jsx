import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickSwitchModal from './QuickSwitchModal';

describe('QuickSwitchModal', () => {
    const mockResults = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
    const mockOnClose = vi.fn();
    const mockOnQueryChange = vi.fn();
    const mockOnSelect = vi.fn();
    const mockOnMoveSelection = vi.fn();

    it('should not render when not visible', () => {
        render(
            <QuickSwitchModal
                visible={false}
                results={[]}
                selectedIndex={0}
                onClose={mockOnClose}
            />
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render correctly when visible', () => {
        render(
            <QuickSwitchModal
                visible={true}
                mode="pair"
                query=""
                results={mockResults}
                selectedIndex={0}
                onClose={mockOnClose}
                onQueryChange={mockOnQueryChange}
                onSelect={mockOnSelect}
                onMoveSelection={mockOnMoveSelection}
            />
        );
        expect(screen.getByPlaceholderText('Type pair (e.g. BTCUSDT)')).toBeInTheDocument();
        expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
        expect(screen.getByText('ETHUSDT')).toBeInTheDocument();
    });

    it('should call onQueryChange when typing', () => {
        render(
            <QuickSwitchModal
                visible={true}
                mode="pair"
                query=""
                results={mockResults}
                selectedIndex={0}
                onClose={mockOnClose}
                onQueryChange={mockOnQueryChange}
            />
        );
        const input = screen.getByPlaceholderText('Type pair (e.g. BTCUSDT)');
        fireEvent.input(input, { target: { value: 'BTC' } });
        // QuickSwitchModal might have a debounce or specific event handling
        // Let's check if we need to wait or if the event is correct.
        // If it uses local state and then calls prop, we might need to wait.
        // For now, let's try awaiting a bit or checking if it's called at all.
        expect(mockOnQueryChange).toHaveBeenCalledWith('BTC');
    });

    it('should highlight the selected index', () => {
        render(
            <QuickSwitchModal
                visible={true}
                mode="pair"
                query=""
                results={mockResults}
                selectedIndex={1}
                onClose={mockOnClose}
            />
        );
        const items = screen.getAllByText(/USDT/);
        expect(items[1]).toHaveClass('selected');
    });

    it('should call onSelect when clicking an item', () => {
        render(
            <QuickSwitchModal
                visible={true}
                mode="pair"
                query=""
                results={mockResults}
                selectedIndex={0}
                onClose={mockOnClose}
                onSelect={mockOnSelect}
            />
        );
        fireEvent.click(screen.getByText('ETHUSDT'));
        expect(mockOnSelect).toHaveBeenCalledWith('ETHUSDT');
    });
});
