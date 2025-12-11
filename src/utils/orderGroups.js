/**
 * Order Grouping Utility
 * Groups consecutive orders by side (BUY/SELL) with price proximity check
 * Orders are only grouped if they're the same side AND within 1% price difference
 */

// Price difference threshold for grouping (1% = 0.01)
const PRICE_GROUP_THRESHOLD = 0.01;

/**
 * Calculate weighted average price from orders
 * @param {Array} orders - Array of orders with price and qty
 * @returns {Object} - { avgPrice, totalQty, totalValue }
 */
const calculateWeightedAverage = (orders) => {
    let totalValue = 0;
    let totalQty = 0;

    orders.forEach(order => {
        const price = parseFloat(order.price);
        const qty = parseFloat(order.qty || order.executedQty || order.origQty);
        if (Number.isFinite(price) && Number.isFinite(qty)) {
            totalValue += price * qty;
            totalQty += qty;
        }
    });

    const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;

    return {
        avgPrice,
        totalQty,
        totalValue,
    };
};

/**
 * Check if two prices are within the grouping threshold
 * @param {number} price1 
 * @param {number} price2 
 * @returns {boolean}
 */
const arePricesClose = (price1, price2) => {
    if (!Number.isFinite(price1) || !Number.isFinite(price2) || price1 === 0) {
        return false;
    }
    const priceDiff = Math.abs(price1 - price2) / price1;
    return priceDiff <= PRICE_GROUP_THRESHOLD;
};

/**
 * Get the average price of a group's orders (for comparison with new order)
 */
const getGroupAvgPrice = (group) => {
    const { avgPrice } = calculateWeightedAverage(group.orders);
    return avgPrice;
};

/**
 * Group orders by consecutive side (BUY/SELL) with price proximity
 * @param {Array} orders - Raw order history sorted by time
 * @returns {Array} - Grouped orders with weighted averages
 */
const normalizeOrderTime = (time) => {
    if (time instanceof Date) {
        return time.getTime()
    }
    const numeric = Number(time)
    if (Number.isFinite(numeric)) {
        return numeric
    }
    const parsed = Date.parse(time)
    return Number.isFinite(parsed) ? parsed : 0
}

export const groupOrdersBySide = (orders) => {
    if (!orders || orders.length === 0) return [];

    // Sort by time ascending
    const normalizedOrders = orders.map((order) => ({
        ...order,
        time: normalizeOrderTime(order.time),
    }));
    const sortedOrders = normalizedOrders.sort((a, b) => a.time - b.time);
    
    const groups = [];
    let currentGroup = null;

    sortedOrders.forEach(order => {
        // Handle both side field and isBuyer boolean (history uses isBuyer)
        let side = order.side;
        if (!side && order.isBuyer !== undefined) {
            side = order.isBuyer ? 'BUY' : 'SELL';
        }
        
        const orderPrice = parseFloat(order.price);
        
        // Check if we should start a new group:
        // 1. No current group
        // 2. Different side (BUY vs SELL)
        // 3. Price difference > 1% from group's average
        const shouldStartNewGroup = !currentGroup || 
            currentGroup.side !== side ||
            !arePricesClose(getGroupAvgPrice(currentGroup), orderPrice);
        
        if (shouldStartNewGroup) {
            // Finalize current group and start a new one
            if (currentGroup) {
                groups.push(finalizeGroup(currentGroup));
            }
            currentGroup = {
                side,
                orders: [order],
                symbol: order.symbol,
                startTime: order.time,
                endTime: order.time,
            };
        } else {
            // Add to current group (same side AND price is close)
            currentGroup.orders.push(order);
            currentGroup.endTime = order.time;
        }
    });

    // Don't forget the last group
    if (currentGroup) {
        groups.push(finalizeGroup(currentGroup));
    }

    return groups;
};

/**
 * Finalize a group by calculating weighted average
 */
const finalizeGroup = (group) => {
    const { avgPrice, totalQty, totalValue } = calculateWeightedAverage(group.orders);
    
    return {
        id: `group-${group.startTime}-${group.side}`,
        side: group.side,
        symbol: group.symbol,
        avgPrice,
        totalQty,
        totalValue,
        orderCount: group.orders.length,
        startTime: group.startTime,
        endTime: group.endTime,
        orders: group.orders, // Keep original orders for reference
    };
};

/**
 * Group orders by symbol first, then by consecutive side
 * @param {Array} orders - Raw order history
 * @returns {Object} - Map of symbol -> grouped orders
 */
export const groupOrdersBySymbol = (orders) => {
    if (!orders || orders.length === 0) return {};

    // Group by symbol first
    const bySymbol = {};
    orders.forEach(order => {
        const symbol = order.symbol;
        if (!bySymbol[symbol]) {
            bySymbol[symbol] = [];
        }
        bySymbol[symbol].push(order);
    });

    // Then group each symbol by side
    const result = {};
    Object.entries(bySymbol).forEach(([symbol, symbolOrders]) => {
        result[symbol] = groupOrdersBySide(symbolOrders);
    });

    return result;
};

/**
 * Get all grouped orders for chart display (flattened)
 * @param {Array} orders - Raw order history
 * @returns {Array} - Grouped orders ready for chart overlay
 */
const normalizeSymbol = (symbol) => (symbol || '').toString().toUpperCase()

export const getGroupedOrdersForChart = (orders, currentSymbol) => {
    if (!orders || orders.length === 0) return [];
    
    // Filter by current symbol
    if (!currentSymbol) return [];

    const normalizedSymbol = normalizeSymbol(currentSymbol);
    const symbolOrders = orders.filter((o) => normalizeSymbol(o.symbol) === normalizedSymbol);
    
    return groupOrdersBySide(symbolOrders);
};

