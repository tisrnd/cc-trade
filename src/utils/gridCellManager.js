/**
 * GridCellManager - Manages grid cell state for MainView
 * 
 * Responsibilities:
 * 1. Track which pairs are displayed in which grid cells
 * 2. Find existing cells for a given pair (prevents duplicates)
 * 3. Manage the selected/active cell index
 * 4. Handle navigation logic between views
 */

const STORAGE_KEY_SELECTED_SLOT = 'mainViewSelectedSlot';
const STORAGE_KEY_CHART_CONFIGS = 'mainViewCharts';
const DEFAULT_SLOT = 0;
const GRID_SIZE = 8;

/**
 * Find the index of a cell that already displays the given symbol
 * @param {Array} chartConfigs - Array of {symbol, interval} objects
 * @param {string} symbol - The symbol to find
 * @returns {number} Index of the cell, or -1 if not found
 */
export const findCellBySymbol = (chartConfigs, symbol) => {
    if (!Array.isArray(chartConfigs) || !symbol) return -1;
    const normalizedSymbol = symbol.toUpperCase();
    return chartConfigs.findIndex(config => 
        config?.symbol?.toUpperCase() === normalizedSymbol
    );
};

/**
 * Check if a symbol is already displayed in the grid
 * @param {Array} chartConfigs - Array of {symbol, interval} objects
 * @param {string} symbol - The symbol to check
 * @returns {boolean} True if the symbol exists in the grid
 */
export const symbolExistsInGrid = (chartConfigs, symbol) => {
    return findCellBySymbol(chartConfigs, symbol) !== -1;
};

/**
 * Get the stored selected slot index
 * @returns {number} The selected slot index (0-7)
 */
export const getStoredSelectedSlot = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SELECTED_SLOT);
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed < GRID_SIZE) {
            return parsed;
        }
    } catch {
        // Fall through to default
    }
    return DEFAULT_SLOT;
};

/**
 * Store the selected slot index
 * @param {number} slotIndex - The slot index to store
 */
export const storeSelectedSlot = (slotIndex) => {
    if (Number.isFinite(slotIndex) && slotIndex >= 0 && slotIndex < GRID_SIZE) {
        localStorage.setItem(STORAGE_KEY_SELECTED_SLOT, slotIndex.toString());
    }
};

/**
 * Get the stored chart configurations
 * @param {Array} defaultPairs - Default pairs array if nothing stored
 * @param {string} defaultInterval - Default interval
 * @returns {Array} Array of chart config objects
 */
export const getStoredChartConfigs = (defaultPairs, defaultInterval = '1h') => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_CHART_CONFIGS);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(config => ({
                    symbol: config.symbol,
                    interval: config.interval || defaultInterval
                }));
            }
        }
    } catch {
        // Fall through to default
    }
    return defaultPairs.map(symbol => ({
        symbol,
        interval: defaultInterval
    }));
};

/**
 * Store chart configurations
 * @param {Array} chartConfigs - Array of chart config objects
 */
export const storeChartConfigs = (chartConfigs) => {
    if (Array.isArray(chartConfigs)) {
        const toSave = chartConfigs.map(({ symbol, interval }) => ({ symbol, interval }));
        localStorage.setItem(STORAGE_KEY_CHART_CONFIGS, JSON.stringify(toSave));
    }
};

/**
 * Resolve the target cell for a symbol/interval pair operation
 * 
 * Logic:
 * 1. If the symbol already exists in the grid, return that cell's index (focus existing)
 * 2. If the symbol doesn't exist, return the currently selected slot (create new)
 * 
 * @param {Array} chartConfigs - Current chart configurations
 * @param {string} symbol - The symbol to resolve
 * @param {number} selectedSlot - The currently selected slot
 * @returns {{targetSlot: number, isExisting: boolean}} Target slot and whether it's existing
 */
export const resolveTargetCell = (chartConfigs, symbol, selectedSlot) => {
    const existingIndex = findCellBySymbol(chartConfigs, symbol);
    
    if (existingIndex !== -1) {
        return {
            targetSlot: existingIndex,
            isExisting: true
        };
    }
    
    return {
        targetSlot: selectedSlot,
        isExisting: false
    };
};

/**
 * Update chart configs with a new symbol/interval at the target slot
 * Only updates if necessary (avoids unnecessary state changes)
 * 
 * @param {Array} chartConfigs - Current chart configurations
 * @param {number} targetSlot - The slot to update
 * @param {string} symbol - The symbol to set
 * @param {string} interval - The interval to set (optional, keeps existing if not provided)
 * @returns {Array|null} New configs array, or null if no change needed
 */
export const updateChartConfig = (chartConfigs, targetSlot, symbol, interval) => {
    if (!Array.isArray(chartConfigs) || targetSlot < 0 || targetSlot >= chartConfigs.length) {
        return null;
    }
    
    const currentConfig = chartConfigs[targetSlot];
    const newSymbol = symbol?.toUpperCase();
    const newInterval = interval || currentConfig?.interval;
    
    // Check if update is needed
    if (currentConfig?.symbol?.toUpperCase() === newSymbol && 
        currentConfig?.interval === newInterval) {
        return null; // No change needed
    }
    
    const newConfigs = [...chartConfigs];
    newConfigs[targetSlot] = {
        symbol: newSymbol,
        interval: newInterval
    };
    
    return newConfigs;
};

/**
 * Create a handler function for pair selection that manages duplicates
 * This is a higher-order function that returns a handler
 * 
 * @param {Function} getChartConfigs - Function to get current chart configs
 * @param {Function} getSelectedSlot - Function to get currently selected slot
 * @param {Function} setChartConfigs - Function to update chart configs
 * @param {Function} setSelectedSlot - Function to update selected slot
 * @returns {Function} Handler function (symbol, interval) => void
 */
export const createPairSelectionHandler = (
    getChartConfigs,
    getSelectedSlot,
    setChartConfigs,
    setSelectedSlot
) => {
    return (symbol, interval) => {
        if (!symbol) return;
        
        const chartConfigs = getChartConfigs();
        const selectedSlot = getSelectedSlot();
        const { targetSlot, isExisting } = resolveTargetCell(chartConfigs, symbol, selectedSlot);
        
        // If it's an existing cell, just focus it
        if (isExisting) {
            if (targetSlot !== selectedSlot) {
                setSelectedSlot(targetSlot);
            }
            // If interval is provided and different, update the interval
            if (interval) {
                const newConfigs = updateChartConfig(chartConfigs, targetSlot, symbol, interval);
                if (newConfigs) {
                    setChartConfigs(newConfigs);
                }
            }
            return;
        }
        
        // New symbol - update the selected slot
        const newConfigs = updateChartConfig(chartConfigs, targetSlot, symbol, interval);
        if (newConfigs) {
            setChartConfigs(newConfigs);
        }
    };
};

/**
 * Swap two cells in the chart configs array
 * @param {Array} chartConfigs - Current chart configurations
 * @param {number} indexA - First cell index
 * @param {number} indexB - Second cell index
 * @returns {Array|null} New configs array, or null if swap is invalid
 */
export const swapCells = (chartConfigs, indexA, indexB) => {
    if (!Array.isArray(chartConfigs)) return null;
    if (indexA < 0 || indexA >= chartConfigs.length) return null;
    if (indexB < 0 || indexB >= chartConfigs.length) return null;
    if (indexA === indexB) return null; // No change needed
    
    const newConfigs = [...chartConfigs];
    const temp = newConfigs[indexA];
    newConfigs[indexA] = newConfigs[indexB];
    newConfigs[indexB] = temp;
    
    return newConfigs;
};

export default {
    findCellBySymbol,
    symbolExistsInGrid,
    getStoredSelectedSlot,
    storeSelectedSlot,
    getStoredChartConfigs,
    storeChartConfigs,
    resolveTargetCell,
    updateChartConfig,
    createPairSelectionHandler,
    swapCells,
};
