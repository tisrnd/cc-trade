import React, { useState, useCallback, useEffect, useRef } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

import { DrawingContext } from './DrawingContext';

import { DRAWING_TOOLS, FIBONACCI_LEVELS, DRAWING_COLORS } from '../constants/drawing';

const STORAGE_KEY_PREFIX = 'drawings_';

// Generate unique ID for drawings
const generateId = () => `${Date.now()} -${Math.random().toString(36).substr(2, 9)} `;

export function DrawingProvider({ children }) {
    // Map of drawings keyed by "symbol:interval"
    const [drawingsMap, setDrawingsMap] = useState({});
    const [activeTool, setActiveTool] = useState(DRAWING_TOOLS.CURSOR);
    const [activeDrawing, setActiveDrawing] = useState(null); // Drawing in progress
    const [selectedDrawingId, setSelectedDrawingId] = useState(null);
    const [selectedColor, setSelectedColor] = useState(DRAWING_COLORS[0]);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPoint, setDragStartPoint] = useState(null);
    const [dragOriginalDrawing, setDragOriginalDrawing] = useState(null);
    const [dragHitType, setDragHitType] = useState(null); // 'body', 'start', or 'end'

    // Current symbol:interval key for the active chart
    const [currentKey, setCurrentKey] = useState(null);

    // Ref to track if initial load happened for current key
    const loadedKeysRef = useRef(new Set());

    // Load drawings from storage when key changes
    useEffect(() => {
        if (!currentKey || loadedKeysRef.current.has(currentKey)) return;

        const storageKey = STORAGE_KEY_PREFIX + currentKey;
        const saved = readStorage(storageKey, []);

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDrawingsMap(prev => ({
            ...prev,
            [currentKey]: saved
        }));

        loadedKeysRef.current.add(currentKey);
    }, [currentKey]);

    // Save drawings to storage whenever they change
    useEffect(() => {
        if (!currentKey) return;
        const drawings = drawingsMap[currentKey] || [];
        const storageKey = STORAGE_KEY_PREFIX + currentKey;
        writeStorage(storageKey, drawings);
    }, [drawingsMap, currentKey]);

    // Get drawings for current key
    const drawings = React.useMemo(() =>
        currentKey ? (drawingsMap[currentKey] || []) : []
        , [currentKey, drawingsMap]);

    // Get selected drawing object
    const selectedDrawing = selectedDrawingId
        ? drawings.find(d => d.id === selectedDrawingId)
        : null;

    // Update the current symbol:interval
    const updateCurrentKey = useCallback((symbol, interval) => {
        if (!symbol || !interval) return;
        const key = `${symbol}:${interval} `;
        setCurrentKey(key);
        // Clear selection when switching
        setSelectedDrawingId(null);
        setActiveDrawing(null);
        setActiveTool(DRAWING_TOOLS.CURSOR);
    }, []);

    // Add a new drawing
    const addDrawing = useCallback((drawing) => {
        if (!currentKey) return null;

        const newDrawing = {
            ...drawing,
            id: generateId(),
            createdAt: Date.now(),
        };

        setDrawingsMap(prev => ({
            ...prev,
            [currentKey]: [...(prev[currentKey] || []), newDrawing]
        }));

        return newDrawing.id;
    }, [currentKey]);

    // Update an existing drawing
    const updateDrawing = useCallback((id, updates) => {
        if (!currentKey) return;

        setDrawingsMap(prev => ({
            ...prev,
            [currentKey]: (prev[currentKey] || []).map(d =>
                d.id === id ? { ...d, ...updates } : d
            )
        }));
    }, [currentKey]);

    // Delete a drawing
    const deleteDrawing = useCallback((id) => {
        if (!currentKey) return;

        setDrawingsMap(prev => ({
            ...prev,
            [currentKey]: (prev[currentKey] || []).filter(d => d.id !== id)
        }));

        if (selectedDrawingId === id) {
            setSelectedDrawingId(null);
        }
    }, [currentKey, selectedDrawingId]);

    // Delete selected drawing
    const deleteSelectedDrawing = useCallback(() => {
        if (selectedDrawingId) {
            deleteDrawing(selectedDrawingId);
        }
    }, [selectedDrawingId, deleteDrawing]);

    // Clear all drawings for current key
    const clearAllDrawings = useCallback(() => {
        if (!currentKey) return;

        setDrawingsMap(prev => ({
            ...prev,
            [currentKey]: []
        }));
        setSelectedDrawingId(null);
    }, [currentKey]);

    // Select a drawing
    const selectDrawing = useCallback((id) => {
        setSelectedDrawingId(id);
        // Switch to cursor mode when selecting
        if (id) {
            setActiveTool(DRAWING_TOOLS.CURSOR);
        }
    }, []);

    // Deselect all
    const deselectAll = useCallback(() => {
        setSelectedDrawingId(null);
    }, []);

    // Set active tool
    const setTool = useCallback((tool) => {
        setActiveTool(tool);
        setActiveDrawing(null);
        setSelectedDrawingId(null);
    }, []);

    // Start drawing (first point)
    const startDrawing = useCallback((point, type) => {
        setActiveDrawing({
            type,
            points: [point],
            startPoint: point,
        });
    }, []);

    // Update drawing in progress (while dragging)
    const updateActiveDrawing = useCallback((point) => {
        setActiveDrawing(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentPoint: point,
            };
        });
    }, []);

    // Add horizontal line directly (single click)
    const addHorizontalLine = useCallback((point) => {
        const drawing = {
            type: DRAWING_TOOLS.HORIZONTAL_LINE,
            price: point.price,
            color: selectedColor,
        };
        const id = addDrawing(drawing);
        setActiveTool(DRAWING_TOOLS.CURSOR);
        return id;
    }, [addDrawing, selectedColor]);

    // Add text annotation
    const addTextAnnotation = useCallback((point, text) => {
        if (!text || !text.trim()) return null;
        const drawing = {
            type: DRAWING_TOOLS.TEXT,
            price: point.price,
            logical: point.logical,
            time: point.time,
            text: text.trim(),
            color: selectedColor,
        };
        const id = addDrawing(drawing);
        setActiveTool(DRAWING_TOOLS.CURSOR);
        return id;
    }, [addDrawing, selectedColor]);

    // Finalize drawing (for trend lines, rectangles, and fibonacci that require two clicks)
    const finalizeDrawing = useCallback((endPoint) => {
        if (!activeDrawing) return null;

        const { type, startPoint } = activeDrawing;

        let drawing;
        if (type === DRAWING_TOOLS.TREND_LINE) {
            // First point must have valid time, second point can use logical index
            if (startPoint.time == null) {
                setActiveDrawing(null);
                return null;
            }
            drawing = {
                type,
                startTime: startPoint.time,
                startPrice: startPoint.price,
                startLogical: startPoint.logical,
                endTime: endPoint.time, // May be null if outside data range
                endPrice: endPoint.price,
                endLogical: endPoint.logical, // Use this when endTime is null
                color: selectedColor,
            };
        } else if (type === DRAWING_TOOLS.RECTANGLE) {
            // Rectangle needs two corners - normalize to top-left and bottom-right
            const topPrice = Math.max(startPoint.price, endPoint.price);
            const bottomPrice = Math.min(startPoint.price, endPoint.price);
            const leftLogical = Math.min(startPoint.logical ?? 0, endPoint.logical ?? 0);
            const rightLogical = Math.max(startPoint.logical ?? 0, endPoint.logical ?? 0);

            drawing = {
                type,
                topPrice,
                bottomPrice,
                leftLogical,
                rightLogical,
                leftTime: startPoint.logical <= endPoint.logical ? startPoint.time : endPoint.time,
                rightTime: startPoint.logical <= endPoint.logical ? endPoint.time : startPoint.time,
                color: selectedColor,
            };
        } else if (type === DRAWING_TOOLS.FIBONACCI) {
            // Fibonacci retracement - store high and low prices with time/logical coords
            const highPrice = Math.max(startPoint.price, endPoint.price);
            const lowPrice = Math.min(startPoint.price, endPoint.price);
            const leftLogical = Math.min(startPoint.logical ?? 0, endPoint.logical ?? 0);
            const rightLogical = Math.max(startPoint.logical ?? 0, endPoint.logical ?? 0);

            drawing = {
                type,
                highPrice,
                lowPrice,
                leftLogical,
                rightLogical,
                leftTime: startPoint.logical <= endPoint.logical ? startPoint.time : endPoint.time,
                rightTime: startPoint.logical <= endPoint.logical ? endPoint.time : startPoint.time,
                // Determine direction: was high at start or end?
                isDowntrend: startPoint.price > endPoint.price,
                color: selectedColor,
            };
        }

        if (drawing) {
            const id = addDrawing(drawing);
            setActiveDrawing(null);
            setActiveTool(DRAWING_TOOLS.CURSOR);
            return id;
        }

        setActiveDrawing(null);
        return null;
    }, [activeDrawing, addDrawing, selectedColor]);

    // Drag start - hitType: 'body', 'start', or 'end'
    const startDrag = useCallback((drawingId, point, hitType = 'body') => {
        const drawing = drawings.find(d => d.id === drawingId);
        if (!drawing) return;

        setIsDragging(true);
        setDragStartPoint(point);
        setDragOriginalDrawing({ ...drawing });
        setDragHitType(hitType);
        setSelectedDrawingId(drawingId);
    }, [drawings]);

    // Drag move - updates the drawing position in real-time
    const updateDrag = useCallback((currentPoint) => {
        if (!isDragging || !dragOriginalDrawing || !dragStartPoint) return;

        const deltaPrice = currentPoint.price - dragStartPoint.price;
        const deltaLogical = (currentPoint.logical ?? 0) - (dragStartPoint.logical ?? 0);

        if (dragOriginalDrawing.type === DRAWING_TOOLS.HORIZONTAL_LINE) {
            updateDrawing(dragOriginalDrawing.id, {
                price: dragOriginalDrawing.price + deltaPrice,
            });
        } else if (dragOriginalDrawing.type === DRAWING_TOOLS.TEXT) {
            // Text annotations can be dragged
            updateDrawing(dragOriginalDrawing.id, {
                price: dragOriginalDrawing.price + deltaPrice,
                logical: (dragOriginalDrawing.logical ?? 0) + deltaLogical,
                time: null, // Clear time so it uses logical
            });
        } else if (dragOriginalDrawing.type === DRAWING_TOOLS.TREND_LINE) {
            if (dragHitType === 'start') {
                // Only move the start point
                updateDrawing(dragOriginalDrawing.id, {
                    startPrice: dragOriginalDrawing.startPrice + deltaPrice,
                    startLogical: (dragOriginalDrawing.startLogical ?? 0) + deltaLogical,
                    startTime: null,
                });
            } else if (dragHitType === 'end') {
                // Only move the end point
                updateDrawing(dragOriginalDrawing.id, {
                    endPrice: dragOriginalDrawing.endPrice + deltaPrice,
                    endLogical: (dragOriginalDrawing.endLogical ?? 0) + deltaLogical,
                    endTime: null,
                });
            } else {
                // Move entire line (body drag)
                updateDrawing(dragOriginalDrawing.id, {
                    startPrice: dragOriginalDrawing.startPrice + deltaPrice,
                    endPrice: dragOriginalDrawing.endPrice + deltaPrice,
                    startLogical: (dragOriginalDrawing.startLogical ?? 0) + deltaLogical,
                    endLogical: (dragOriginalDrawing.endLogical ?? 0) + deltaLogical,
                    startTime: null,
                    endTime: null,
                });
            }
        } else if (dragOriginalDrawing.type === DRAWING_TOOLS.RECTANGLE) {
            // Move entire rectangle (body drag)
            updateDrawing(dragOriginalDrawing.id, {
                topPrice: dragOriginalDrawing.topPrice + deltaPrice,
                bottomPrice: dragOriginalDrawing.bottomPrice + deltaPrice,
                leftLogical: dragOriginalDrawing.leftLogical + deltaLogical,
                rightLogical: dragOriginalDrawing.rightLogical + deltaLogical,
                leftTime: null,
                rightTime: null,
            });
        }
    }, [isDragging, dragOriginalDrawing, dragStartPoint, dragHitType, updateDrawing]);

    // Drag end
    const endDrag = useCallback(() => {
        setIsDragging(false);
        setDragStartPoint(null);
        setDragOriginalDrawing(null);
        setDragHitType(null);
    }, []);

    // Cancel active drawing
    const cancelDrawing = useCallback(() => {
        setActiveDrawing(null);
    }, []);

    const value = {
        // State
        drawings,
        activeTool,
        activeDrawing,
        selectedDrawing,
        selectedDrawingId,
        selectedColor,
        isDragging,
        currentKey,

        // Actions
        updateCurrentKey,
        addDrawing,
        addHorizontalLine,
        addTextAnnotation,
        updateDrawing,
        deleteDrawing,
        deleteSelectedDrawing,
        clearAllDrawings,
        selectDrawing,
        deselectAll,
        setTool,
        setSelectedColor,
        startDrawing,
        updateActiveDrawing,
        finalizeDrawing,
        cancelDrawing,
        startDrag,
        updateDrag,
        endDrag,
    };

    return (
        <DrawingContext.Provider value={value}>
            {children}
        </DrawingContext.Provider>
    );
}



