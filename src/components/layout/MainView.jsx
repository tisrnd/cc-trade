import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './MainView.css';
import MiniChart from '../features/charts/MiniChart';
import { useDataContext } from '../../context/DataContext';
import { CHANNEL_TYPES, createChannelId } from '../../utils/channels';
import { 
    findCellBySymbol, 
    resolveTargetCell,
    storeChartConfigs,
    storeSelectedSlot,
    getStoredSelectedSlot,
    getStoredChartConfigs,
    swapCells
} from '../../utils/gridCellManager';

// Default pairs for the 8-chart grid (top coins by market cap)
const DEFAULT_PAIRS = [
    'PAXUSDT',
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'XRPUSDT',
    'SOLUSDT',
    'ADAUSDT',
    'DOGEUSDT'
];

const DEFAULT_INTERVAL = '1h';

// Maximum WebSocket connections to keep alive for mini charts
const MAX_MINI_CONNECTIONS = 50;

const MainView = ({ onSwitchToDepth, onPairChange, onSelectedSlotChange, showAnalyticsPanel, onToggleAnalyticsPanel, isActive }) => {
    const {
        wsConnection,
        subscribeChannel,
        unsubscribeChannel: _unsubscribeChannel,
        miniCharts,
        panel,  // Get panel state for syncing with DepthView
        ticker // Get ticker data for real-time updates
    } = useDataContext();

    // Load saved chart configs from localStorage using gridCellManager
    const [chartConfigs, setChartConfigs] = useState(() => 
        getStoredChartConfigs(DEFAULT_PAIRS, DEFAULT_INTERVAL)
    );

    // Selected slot index (0-7) - the chart that QuickSwitch will update
    const [selectedSlot, setSelectedSlot] = useState(() => 
        getStoredSelectedSlot()
    );

    // Persist selected slot using gridCellManager
    useEffect(() => {
        storeSelectedSlot(selectedSlot);
    }, [selectedSlot]);

    // Track if we've synced after view switch (to avoid duplicate syncs)
    const lastSyncedPanelRef = useRef(null);

    // Sync selected slot with panel when MainView becomes active (view switch from DepthView)
    // This ensures changes made in DepthView are reflected in MainView's selected slot
    // KEY: Check if the pair already exists in grid - if so, just focus that cell instead of creating duplicate
    useEffect(() => {
        if (!isActive) {
            // Reset sync tracking when leaving MainView
            lastSyncedPanelRef.current = null;
            return;
        }
        if (!panel?.selected || !panel?.interval) return;

        // Check if we already synced this panel state
        const panelKey = `${panel.selected}-${panel.interval}`;
        if (lastSyncedPanelRef.current === panelKey) return;

        // Check if the pair from DepthView already exists in the grid
        const existingIndex = findCellBySymbol(chartConfigs, panel.selected);
        
        if (existingIndex !== -1) {
            // Pair already exists in grid - focus that cell instead of creating duplicate
            // Also update the interval if it changed in DepthView
            if (existingIndex !== selectedSlot) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setSelectedSlot(existingIndex);
            }
            // Update interval if needed (user might have changed interval in DepthView)
            setChartConfigs(prev => {
                if (prev[existingIndex]?.interval === panel.interval) {
                    return prev; // No change needed
                }
                const newConfigs = [...prev];
                newConfigs[existingIndex] = {
                    ...newConfigs[existingIndex],
                    interval: panel.interval
                };
                return newConfigs;
            });
        } else {
            // Pair doesn't exist - update selected slot with panel state
            setChartConfigs(prev => {
                // If panel already matches selected slot, no change needed
                if (prev[selectedSlot]?.symbol === panel.selected && prev[selectedSlot]?.interval === panel.interval) {
                    return prev;
                }

                // Update selected slot with panel's symbol and interval
                const newConfigs = [...prev];
                newConfigs[selectedSlot] = {
                    symbol: panel.selected,
                    interval: panel.interval
                };
                return newConfigs;
            });
        }

        lastSyncedPanelRef.current = panelKey;
    }, [isActive, panel?.selected, panel?.interval, selectedSlot, chartConfigs]);

    // Expose method to update the selected slot (for AnalyticsPanel clicks)
    // KEY: Check if pair exists - if so, focus that cell instead of creating duplicate
    const updateSelectedSlotFromAnalytics = useCallback((symbol, interval) => {
        setChartConfigs(prev => {
            const { targetSlot, isExisting } = resolveTargetCell(prev, symbol, selectedSlot);
            
            if (isExisting) {
                // Pair exists - focus that cell
                if (targetSlot !== selectedSlot) {
                    setSelectedSlot(targetSlot);
                }
                // Update interval if provided and different
                const effectiveInterval = interval || prev[targetSlot]?.interval;
                if (prev[targetSlot]?.interval === effectiveInterval) {
                    return prev; // No change needed
                }
                const newConfigs = [...prev];
                newConfigs[targetSlot] = {
                    ...newConfigs[targetSlot],
                    interval: effectiveInterval
                };
                return newConfigs;
            }
            
            // New pair - update selected slot
            const newConfigs = [...prev];
            newConfigs[selectedSlot] = {
                symbol: symbol,
                interval: interval || prev[selectedSlot]?.interval || DEFAULT_INTERVAL
            };
            return newConfigs;
        });
    }, [selectedSlot]);

    // Expose method to update the selected slot (for QuickSwitch)
    // KEY: Check if pair exists - if so, focus that cell instead of creating duplicate
    const updateSelectedSlot = useCallback((symbol, interval) => {
        setChartConfigs(prev => {
            const { targetSlot, isExisting } = resolveTargetCell(prev, symbol, selectedSlot);
            
            if (isExisting) {
                // Pair exists - focus that cell
                if (targetSlot !== selectedSlot) {
                    setSelectedSlot(targetSlot);
                }
                // Update interval if provided and different
                const effectiveInterval = interval || prev[targetSlot]?.interval;
                if (prev[targetSlot]?.interval === effectiveInterval) {
                    return prev; // No change needed
                }
                const newConfigs = [...prev];
                newConfigs[targetSlot] = {
                    ...newConfigs[targetSlot],
                    interval: effectiveInterval
                };
                return newConfigs;
            }
            
            // New pair - update selected slot
            const newConfigs = [...prev];
            newConfigs[selectedSlot] = {
                symbol: symbol,
                interval: interval || prev[selectedSlot]?.interval || DEFAULT_INTERVAL
            };
            return newConfigs;
        });
    }, [selectedSlot]);

    // Expose method to get chart configs and selected slot (for external duplicate checking)
    const getGridState = useCallback(() => ({
        chartConfigs,
        selectedSlot
    }), [chartConfigs, selectedSlot]);

    // Notify parent when pair changes in MainView (for AnalyticsPanel coordination)
    useEffect(() => {
        if (onPairChange) {
            onPairChange(updateSelectedSlotFromAnalytics);
        }
    }, [onPairChange, updateSelectedSlotFromAnalytics]);

    // Notify parent of selected slot updater (for QuickSwitch coordination)
    useEffect(() => {
        if (onSelectedSlotChange) {
            onSelectedSlotChange(updateSelectedSlot, getGridState);
        }
    }, [onSelectedSlotChange, updateSelectedSlot, getGridState]);

    // Handle clicking on a chart to select it
    const handleChartSelect = useCallback((index) => {
        setSelectedSlot(index);
    }, []);

    // ========== DRAG & DROP STATE ==========
    // Drag state: { sourceIndex, mouseX, mouseY, sourceRect }
    const [dragState, setDragState] = useState(null);
    const [dropTargetIndex, setDropTargetIndex] = useState(null);
    const [swappedCells, setSwappedCells] = useState(null); // Track recently swapped cells for animation
    const gridRef = useRef(null);
    const cellRectsRef = useRef([]); // Store cell rectangles for hit testing

    // Update cell rects when grid changes
    const updateCellRects = useCallback(() => {
        if (!gridRef.current) return;
        const cells = gridRef.current.querySelectorAll('.mini-chart');
        cellRectsRef.current = Array.from(cells).map(cell => cell.getBoundingClientRect());
    }, []);

    // Find which cell the mouse is over
    const getCellIndexAtPoint = useCallback((x, y) => {
        for (let i = 0; i < cellRectsRef.current.length; i++) {
            const rect = cellRectsRef.current[i];
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return i;
            }
        }
        return -1;
    }, []);

    // Handle CTRL+mousedown to start drag
    const handleDragStart = useCallback((index, event) => {
        if (!event.ctrlKey) return false;
        
        event.preventDefault();
        event.stopPropagation();
        
        // Update cell rects for accurate hit testing
        updateCellRects();
        
        // Get the source cell's rect for the preview
        const sourceRect = cellRectsRef.current[index];
        
        setDragState({
            sourceIndex: index,
            mouseX: event.clientX,
            mouseY: event.clientY,
            sourceRect: sourceRect ? {
                width: sourceRect.width,
                height: sourceRect.height,
                startX: event.clientX,
                startY: event.clientY
            } : null
        });
        
        return true;
    }, [updateCellRects]);

    // Handle mouse move during drag
    const handleDragMove = useCallback((event) => {
        if (!dragState) return;
        
        const targetIndex = getCellIndexAtPoint(event.clientX, event.clientY);
        setDropTargetIndex(targetIndex !== dragState.sourceIndex ? targetIndex : null);
        
        setDragState(prev => ({
            ...prev,
            mouseX: event.clientX,
            mouseY: event.clientY
        }));
    }, [dragState, getCellIndexAtPoint]);

    // Handle mouse up to complete or cancel drag
    const handleDragEnd = useCallback(() => {
        if (!dragState) return;
        
        if (dropTargetIndex !== null && dropTargetIndex !== -1 && dropTargetIndex !== dragState.sourceIndex) {
            // Swap the cells
            const newConfigs = swapCells(chartConfigs, dragState.sourceIndex, dropTargetIndex);
            if (newConfigs) {
                setChartConfigs(newConfigs);
                // Update selected slot if it was one of the swapped cells
                if (selectedSlot === dragState.sourceIndex) {
                    setSelectedSlot(dropTargetIndex);
                } else if (selectedSlot === dropTargetIndex) {
                    setSelectedSlot(dragState.sourceIndex);
                }
                // Trigger swap animation
                setSwappedCells({ a: dragState.sourceIndex, b: dropTargetIndex });
                setTimeout(() => setSwappedCells(null), 400);
            }
        }
        
        setDragState(null);
        setDropTargetIndex(null);
    }, [dragState, dropTargetIndex, chartConfigs, selectedSlot]);

    // Global mouse event listeners for drag
    useEffect(() => {
        if (!dragState) return;
        
        const handleMouseMove = (e) => handleDragMove(e);
        const handleMouseUp = () => handleDragEnd();
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, handleDragMove, handleDragEnd]);

    // Track active channel subscriptions with timestamps for LRU cleanup
    // Map: key -> { channelId, subscribedAt }
    const _activeChannelsRef = useRef(new Map());

    // Persist chart configs using gridCellManager
    useEffect(() => {
        storeChartConfigs(chartConfigs);
    }, [chartConfigs]);


    // Subscribe to mini channels for each chart
    // NOTE: We intentionally do NOT cleanup on unmount to keep connections alive
    // when switching views. This prevents reconnection overhead and errors.
    // We limit to MAX_MINI_CONNECTIONS and clean up oldest unused when exceeding.
    // Subscribe to mini channels for each chart
    // NOTE: We intentionally do NOT cleanup on unmount to keep connections alive
    // when switching views. This prevents reconnection overhead and errors.
    // The global useWebSocket hook handles LRU eviction (max 50 connections).
    useEffect(() => {
        if (!wsConnection || !subscribeChannel) return;

        // Determine which subscriptions are currently needed
        const newKeysNeeded = [];
        for (const config of chartConfigs) {
            // We don't check activeChannelsRef here anymore because useWebSocket handles deduplication
            // However, we still want to stagger NEW subscriptions to avoid rate limits
            newKeysNeeded.push(config);
        }

        // Subscribe to new channels with staggered timing to avoid rate limits
        // Binance allows ~5 new WS connections per second, we use 250ms delay
        const subscribeWithDelay = async () => {
            for (let i = 0; i < newKeysNeeded.length; i++) {
                const config = newKeysNeeded[i];

                // Stagger subscriptions: wait 250ms between each (max 4/sec)
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 250));
                }

                const channelId = createChannelId(CHANNEL_TYPES.MINI, config.symbol, config.interval);
                subscribeChannel({
                    channelId,
                    channelType: CHANNEL_TYPES.MINI,
                    symbol: config.symbol,
                    interval: config.interval
                });
            }
        };

        subscribeWithDelay();
        // No cleanup on unmount - keep connections alive across view switches
    }, [wsConnection, subscribeChannel, chartConfigs]);

    // Merge chart configs with data from miniCharts and live ticker updates
    const chartsWithData = useMemo(() => {
        return chartConfigs.map((config, index) => {
            const key = `${config.symbol}-${config.interval}`;
            const miniData = miniCharts[key];
            let data = miniData?.data || [];

            // Apply live ticker update to the last candle if available
            // This ensures the mini chart reflects the real-time price even between kline updates
            if (data.length > 0 && ticker[config.symbol]) {
                const lastCandle = data[data.length - 1];
                const livePrice = parseFloat(ticker[config.symbol].lastPrice);

                if (livePrice && !isNaN(livePrice)) {
                    // Create a new last candle with updated close price
                    // We also update high/low if the new price exceeds current bounds
                    const updatedCandle = {
                        ...lastCandle,
                        close: livePrice,
                        high: Math.max(lastCandle.high, livePrice),
                        low: Math.min(lastCandle.low, livePrice)
                    };

                    // Create a new data array with the updated last candle
                    // Optimization: Array.slice and push is faster than spread for large arrays
                    data = data.slice(0, -1);
                    data.push(updatedCandle);
                }
            }

            // Ticker is an array of objects { symbol, lastPrice, quoteVolume, ... }
            const tickerItem = Array.isArray(ticker) ? ticker.find(t => t.symbol === config.symbol) : null;
            return {
                ...config,
                index,
                data,
                volume: tickerItem ? parseFloat(tickerItem.quoteVolume) : 0,
                isLoading: !miniData?.data?.length,
                isSelected: index === selectedSlot
            };
        });
    }, [chartConfigs, miniCharts, selectedSlot, ticker]);

    // Handle interval change for a chart
    const handleIntervalChange = useCallback((symbol, newInterval) => {
        setChartConfigs(prev => prev.map(config =>
            config.symbol === symbol
                ? { ...config, interval: newInterval }
                : config
        ));
    }, []);

    return (
        <div className={`main-view ${showAnalyticsPanel ? '' : 'analytics-hidden'}`}>
            {/* Analytics Panel Toggle Button */}
            <button
                className="analytics-toggle-bookmark"
                onClick={onToggleAnalyticsPanel}
                title={showAnalyticsPanel ? 'Hide analytics panel' : 'Show analytics panel'}
            >
                <span className="analytics-toggle-icon">{showAnalyticsPanel ? '◀' : '▶'}</span>
            </button>

            {/* Analytics Panel placeholder - actual panel rendered at App level for persistence */}
            {showAnalyticsPanel && (
                <div className="side main-view-side analytics-panel-placeholder" />
            )}

            {/* Charts Grid */}
            <div className="main-view-grid" ref={gridRef}>
                {chartsWithData.map((config) => (
                    <MiniChart
                        key={`${config.symbol}-${config.interval}-${config.index}`}
                        symbol={config.symbol}
                        interval={config.interval}
                        data={config.data}
                        volume={config.volume}
                        isLoading={config.isLoading}
                        isSelected={config.isSelected}
                        onClick={() => handleChartSelect(config.index)}
                        onIntervalChange={handleIntervalChange}
                        onAltClick={onSwitchToDepth}
                        onDragStart={(e) => handleDragStart(config.index, e)}
                        isDragging={dragState?.sourceIndex === config.index}
                        isDropTarget={dropTargetIndex === config.index}
                        justSwapped={swappedCells?.a === config.index || swappedCells?.b === config.index}
                    />
                ))}
            </div>

            {/* Drag Preview Overlay */}
            {dragState && dragState.sourceRect && (
                <div 
                    className="drag-preview"
                    style={{
                        left: dragState.mouseX - dragState.sourceRect.width / 2,
                        top: dragState.mouseY - dragState.sourceRect.height / 2,
                        width: dragState.sourceRect.width,
                        height: dragState.sourceRect.height,
                    }}
                >
                    <div className="drag-preview-content">
                        <span className="drag-preview-symbol">
                            {chartConfigs[dragState.sourceIndex]?.symbol}
                        </span>
                        <span className="drag-preview-interval">
                            {chartConfigs[dragState.sourceIndex]?.interval}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainView;

