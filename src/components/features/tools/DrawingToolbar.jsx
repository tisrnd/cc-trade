import React, { useState } from 'react';
import './DrawingToolbar.css';
import { useDrawingContext } from '../../../hooks/useDrawingContext';
import { DRAWING_TOOLS, DRAWING_COLORS } from '../../../constants/drawing';

// Simple SVG icons for the toolbar
const CursorIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M4 4l16 8-7 2-2 7z" />
    </svg>
);

const HorizontalLineIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <line x1="3" y1="12" x2="21" y2="12" />
        <circle cx="3" cy="12" r="2" fill="currentColor" />
        <circle cx="21" cy="12" r="2" fill="currentColor" />
    </svg>
);

const TrendLineIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <line x1="4" y1="18" x2="20" y2="6" />
        <circle cx="4" cy="18" r="2" fill="currentColor" />
        <circle cx="20" cy="6" r="2" fill="currentColor" />
    </svg>
);

const RectangleIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="1" />
    </svg>
);

const FibonacciIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.5" fill="none">
        <line x1="3" y1="4" x2="21" y2="4" />
        <line x1="3" y1="8" x2="21" y2="8" strokeDasharray="4,2" />
        <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="4,2" />
        <line x1="3" y1="16" x2="21" y2="16" strokeDasharray="4,2" />
        <line x1="3" y1="20" x2="21" y2="20" />
        <text x="22" y="5" fontSize="5" fill="currentColor">0</text>
        <text x="22" y="21" fontSize="5" fill="currentColor">1</text>
    </svg>
);

const TextIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M5 4v3h5.5v12h3V7H19V4H5z" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
);

const ColorPickerIcon = ({ color }) => (
    <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="12" cy="12" r="8" fill={color} stroke="currentColor" strokeWidth="2" />
    </svg>
);

const tools = [
    { id: DRAWING_TOOLS.CURSOR, icon: CursorIcon, label: 'Select', shortLabel: 'Select' },
    { id: DRAWING_TOOLS.HORIZONTAL_LINE, icon: HorizontalLineIcon, label: 'Horizontal Line', shortLabel: 'H-Line' },
    { id: DRAWING_TOOLS.TREND_LINE, icon: TrendLineIcon, label: 'Trend Line', shortLabel: 'Trend' },
    { id: DRAWING_TOOLS.RECTANGLE, icon: RectangleIcon, label: 'Rectangle', shortLabel: 'Rect' },
    { id: DRAWING_TOOLS.FIBONACCI, icon: FibonacciIcon, label: 'Fibonacci Retracement', shortLabel: 'Fib' },
    { id: DRAWING_TOOLS.TEXT, icon: TextIcon, label: 'Text Annotation', shortLabel: 'Text' },
];

function ColorPicker({ selectedColor, onColorSelect, isOpen, onToggle }) {
    return (
        <div className="color-picker-container">
            <button
                className="drawing-tool-btn color-btn"
                onClick={onToggle}
                title="Select Color"
            >
                <ColorPickerIcon color={selectedColor} />
            </button>
            {isOpen && (
                <div className="color-picker-dropdown">
                    {DRAWING_COLORS.map(color => (
                        <button
                            key={color}
                            className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                                onColorSelect(color);
                                onToggle();
                            }}
                            title={color}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DrawingToolbar() {
    const {
        activeTool,
        setTool,
        selectedDrawingId,
        selectedColor,
        setSelectedColor,
        deleteSelectedDrawing,
        selectedDrawing,
        updateDrawing,
    } = useDrawingContext();

    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    const handleColorSelect = (color) => {
        setSelectedColor(color);
        // Also update the selected drawing's color if one is selected
        if (selectedDrawingId && selectedDrawing) {
            updateDrawing(selectedDrawingId, { color });
        }
    };

    return (
        <div className="drawing-toolbar">
            <div className="drawing-toolbar-tools">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        className={`drawing-tool-btn with-label ${activeTool === tool.id ? 'active' : ''}`}
                        onClick={() => setTool(tool.id)}
                        title={tool.label}
                    >
                        <tool.icon />
                        <span className="tool-label">{tool.shortLabel}</span>
                    </button>
                ))}
            </div>
            <div className="drawing-toolbar-separator" />
            <ColorPicker
                selectedColor={selectedColor}
                onColorSelect={handleColorSelect}
                isOpen={colorPickerOpen}
                onToggle={() => setColorPickerOpen(!colorPickerOpen)}
            />
            <div className="drawing-toolbar-separator" />
            <div className="drawing-toolbar-actions">
                <button
                    className={`drawing-tool-btn with-label delete ${!selectedDrawingId ? 'disabled' : ''}`}
                    onClick={deleteSelectedDrawing}
                    disabled={!selectedDrawingId}
                    title="Delete Selected (Del)"
                >
                    <TrashIcon />
                    <span className="tool-label">Delete</span>
                </button>
            </div>
        </div>
    );
}

