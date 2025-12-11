import React from 'react';
import './LoadingOverlay.css';
import { useDataContext } from '../../context/DataContext';

export default function LoadingOverlay() {
    const { isLoading, loadingMessage } = useDataContext();

    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="loading-spinner" />
                <div className="loading-message">{loadingMessage}</div>
            </div>
        </div>
    );
}


