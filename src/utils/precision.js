const DEFAULT_PRECISION = {
    status: 'UNKNOWN',
    price: 4,
    quantity: 4,
    notional: 2,
    minQty: 0,
    maxQty: Infinity,
    minNotional: 0,
    maxPrice: Infinity,
    minPrice: 0,
    tickSize: 0.0001,
    stepSize: 0.0001,
    baseAsset: null,
    quoteAsset: null,
    quotePrecision: 2,
};

const clampPrecision = (value, fallback) => {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(12, Math.round(value)));
};

const safeNumber = (value, fallback = 0) => {
    if (value === undefined || value === null) return fallback;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(num) ? num : fallback;
};

const safePositiveNumber = (value, fallback) => {
    const num = safeNumber(value, fallback);
    return num > 0 ? num : fallback;
};

const decimalsFromStep = (value, fallback) => {
    if (value === undefined || value === null) return fallback;

    const numeric = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return fallback;
    }

    let str = typeof value === 'string' ? value.trim() : numeric.toString();
    if (!str.includes('.') && !str.toLowerCase().includes('e-')) {
        return 0;
    }

    if (str.toLowerCase().includes('e-')) {
        const exponent = parseInt(str.toLowerCase().split('e-')[1], 10);
        if (Number.isFinite(exponent)) {
            return clampPrecision(exponent, fallback);
        }
        return fallback;
    }

    const decimalPart = str.split('.')[1]?.replace(/0+$/, '') ?? '';
    return clampPrecision(decimalPart.length, fallback);
};

const deriveQuotePrecision = (filter) => {
    if (filter?.quoteAssetPrecision !== undefined && filter?.quoteAssetPrecision !== null) {
        const numeric = Number(filter.quoteAssetPrecision);
        if (Number.isInteger(numeric)) return clampPrecision(numeric, DEFAULT_PRECISION.notional);
    }
    if (filter?.quotePrecision !== undefined && filter?.quotePrecision !== null) {
        const numeric = Number(filter.quotePrecision);
        if (Number.isInteger(numeric)) return clampPrecision(numeric, DEFAULT_PRECISION.notional);
    }
    const quote = filter?.quoteAsset;
    if (!quote) return DEFAULT_PRECISION.notional;
    if (quote === 'BTC') return 6;
    if (quote === 'ETH') return 5;
    if (quote.endsWith('SDT') || quote.endsWith('SDC')) return 2;
    return DEFAULT_PRECISION.notional;
};

export const calculatePrecision = (filter) => {
    if (!filter) {
        return { ...DEFAULT_PRECISION };
    }

    const priceDecimals = decimalsFromStep(filter.tickSize, DEFAULT_PRECISION.price);
    const quantityDecimals = decimalsFromStep(filter.stepSize ?? filter.minQty, DEFAULT_PRECISION.quantity);
    const quoteDecimals = deriveQuotePrecision(filter);

    const tickSize = safePositiveNumber(
        filter.tickSize,
        Number(priceDecimals) > 0 ? Math.pow(10, -priceDecimals) : 1
    );
    const stepSize = safePositiveNumber(
        filter.stepSize ?? filter.minQty,
        Number(quantityDecimals) > 0 ? Math.pow(10, -quantityDecimals) : 1
    );

    return {
        status: filter.status ?? DEFAULT_PRECISION.status,
        price: clampPrecision(priceDecimals, DEFAULT_PRECISION.price),
        quantity: clampPrecision(quantityDecimals, DEFAULT_PRECISION.quantity),
        notional: clampPrecision(quoteDecimals, DEFAULT_PRECISION.notional),
        minQty: safeNumber(filter.minQty, DEFAULT_PRECISION.minQty),
        maxQty: safeNumber(filter.maxQty, DEFAULT_PRECISION.maxQty),
        minNotional: safeNumber(filter.minNotional, DEFAULT_PRECISION.minNotional),
        maxPrice: safeNumber(filter.maxPrice, DEFAULT_PRECISION.maxPrice),
        minPrice: safeNumber(filter.minPrice, DEFAULT_PRECISION.minPrice),
        tickSize,
        stepSize,
        baseAsset: filter.baseAsset ?? DEFAULT_PRECISION.baseAsset,
        quoteAsset: filter.quoteAsset ?? DEFAULT_PRECISION.quoteAsset,
        quotePrecision: clampPrecision(quoteDecimals, DEFAULT_PRECISION.notional),
    };
};

export const precisionTruncate = (val, precision) => {
    if (val === undefined || val === null || !Number.isFinite(Number(val))) {
        return 0;
    }

    const numeric = typeof val === 'number' ? val : parseFloat(val);
    if (!`${numeric}`.includes('.')) {
        return Math.trunc(numeric);
    }

    const fixed = numeric.toFixed(Math.min(12, Math.max(precision, 0)));
    const [whole, fraction = ''] = fixed.split('.');
    if (precision <= 0) {
        return parseInt(whole, 10);
    }
    return parseFloat(`${whole}.${fraction.slice(0, precision)}`);
};

export const formatWithPrecision = (value, decimals, { trimTrailing = false } = {}) => {
    if (value === undefined || value === null) return '--';
    const numeric = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(numeric)) return '--';

    const fixed = numeric.toFixed(decimals);
    if (!trimTrailing) return fixed;
    if (!fixed.includes('.')) return fixed;
    return fixed.replace(/\.?0+$/, '') || '0';
};

export const formatPrice = (value, precision) => {
    const decimals = precision?.price ?? DEFAULT_PRECISION.price;
    return formatWithPrecision(value, decimals);
};

export const formatQuantity = (value, precision) => {
    const decimals = precision?.quantity ?? DEFAULT_PRECISION.quantity;
    return formatWithPrecision(value, decimals);
};

export const formatNotional = (value, precision) => {
    const decimals = precision?.notional ?? DEFAULT_PRECISION.notional;
    return formatWithPrecision(value, decimals);
};

export const getMinMove = (precision) => {
    if (!precision) return Math.pow(10, -DEFAULT_PRECISION.price);
    if (precision.tickSize && precision.tickSize > 0) return precision.tickSize;
    const decimals = precision.price ?? DEFAULT_PRECISION.price;
    return Math.pow(10, -decimals);
};

export { DEFAULT_PRECISION };

