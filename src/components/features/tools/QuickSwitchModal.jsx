import React, { useEffect, useRef } from 'react';
import './QuickSwitchModal.css';

const QuickSwitchModal = ({
    visible,
    mode,
    query,
    results,
    selectedIndex,
    onClose,
    onQueryChange,
    onSelect,
    onMoveSelection
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (visible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [visible, mode]);

    if (!visible) return null;

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            onMoveSelection(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            onMoveSelection(-1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (results[selectedIndex]) {
                onSelect(results[selectedIndex]);
            }
        }
    };

    return (
        <div className="quick-switch-backdrop" onClick={onClose}>
            <div className="quick-switch-modal" onClick={(e) => e.stopPropagation()}>
                <div className="quick-switch-header">
                    <span>{mode === 'pair' ? 'Quick Pair Switch' : 'Quick Interval Switch'}</span>
                    <span className="quick-switch-hint">Esc</span>
                </div>
                <input
                    ref={inputRef}
                    className="quick-switch-input"
                    value={query}
                    onInput={(e) => onQueryChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === 'pair' ? 'Type pair (e.g. BTCUSDT)' : 'Type interval (e.g. 15m)'}
                />
                <div className="quick-switch-results">
                    {results.length === 0 && (
                        <div className="quick-switch-empty">No matches</div>
                    )}
                    {results.map((item, index) => (
                        <div
                            key={item}
                            className={`quick-switch-item ${index === selectedIndex ? 'selected' : ''}`}
                            onMouseEnter={() => onMoveSelection(index - selectedIndex)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelect(item)}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuickSwitchModal;

