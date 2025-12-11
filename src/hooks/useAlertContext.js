import { useContext } from 'react';
import { AlertContext } from '../context/AlertContext';

export function useAlertContext() {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlertContext must be used within an AlertProvider');
    }
    return context;
}
