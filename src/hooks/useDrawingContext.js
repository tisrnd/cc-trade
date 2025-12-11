import { useContext } from 'react';
import { DrawingContext } from '../context/DrawingContext';

export function useDrawingContext() {
    const context = useContext(DrawingContext);
    if (!context) {
        throw new Error('useDrawingContext must be used within a DrawingProvider');
    }
    return context;
}
