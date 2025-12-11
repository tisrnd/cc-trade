import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./AnalyticsPanel.css";
import {
    DEFAULT_ACTIVITY_INTERVAL_DATA,
    DEFAULT_ACTIVITY_PANEL_SETTINGS,
    ACTIVITY_SYMBOL_EXCLUSIONS,
    ANALYTICS_SYMBOL_EXCLUSIONS,
} from "../../constants";
import { useDataContext } from '../../context/DataContext';
import { formatVolumeShort } from '../../utils/operations';

const ALLOWED_MARKETS = ["USDT"];
const MAX_DISPLAY_PAIRS = 7;
const MAX_ANALYTICS_ROWS = 10;

const STABLE_QUOTES = ["USDT", "BUSD", "USDC", "FDUSD", "TUSD", "DAI", "USD", "USDP", "USDD", "GUSD"];
const STABLE_BASES = ["USDT", "BUSD", "USDC", "FDUSD", "TUSD", "DAI", "USDP", "USDD", "GUSD", "EUR", "GBP"];

const ACTIVITY_EXCLUSION_SET = new Set(
    (ACTIVITY_SYMBOL_EXCLUSIONS || []).map((symbol) => symbol.toUpperCase())
);
const ANALYTICS_EXCLUSION_SET = new Set(
    (ANALYTICS_SYMBOL_EXCLUSIONS || []).map((symbol) => symbol.toUpperCase())
);

const STRENGTH_WINDOWS = ["3m", "5m", "15m", "1h"];
const ENDURANCE_WINDOWS = ["1h", "4h", "1d"];

const extractBaseAsset = (symbol = "") => {
    const normalized = symbol.toUpperCase();
    for (const quote of STABLE_QUOTES) {
        if (normalized.endsWith(quote)) {
            return normalized.slice(0, normalized.length - quote.length);
        }
    }
    return normalized;
};

const isStableSymbol = (symbol = "") => {
    const base = extractBaseAsset(symbol);
    if (!base) return false;
    return STABLE_BASES.includes(base);
};

// Interval config: key -> sample interval in ms
const INTERVAL_SAMPLE_MS = {
    '1s': 1000,
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
};
const WINDOW_SIZE = 60; // Rolling window of 60 samples

// ============== ACTIVITY SECTION ==============
const ActivitySection = ({ onPairNavigate }) => {
    const {
        ticker,
        panel,
        handlePanelUpdate,
        activityVolumeFilter,
        activityFeed,
    } = useDataContext();

    const [interval, setInterv] = useState(() => {
        const saved = localStorage.getItem("activity_panel");
        return saved ? JSON.parse(saved).interval : DEFAULT_ACTIVITY_PANEL_SETTINGS.interval;
    });

    const [activity, setActivity] = useState(DEFAULT_ACTIVITY_INTERVAL_DATA);

    // Refs for local calculation state
    // Base coefficient from backend that decays over 60 ticks
    const baseCoeffRef = useRef({}); // { intervalKey: { symbol: { value, decayPerTick, ticksRemaining } } }
    // Rolling window of last 60 price changes (for when base is exhausted or fallback)
    const rollingWindowRef = useRef({}); // { intervalKey: { symbol: [pctChange1, pctChange2, ...] } }
    // Last prices for calculating diff
    const lastPricesRef = useRef({}); // { intervalKey: { symbol: lastPrice } }
    // Last sample time per interval
    const lastSampleTimeRef = useRef({}); // { intervalKey: timestamp }
    // Ticker ref for access in callbacks
    const tickerRef = useRef(ticker);
    const backendAvailableRef = useRef(false);
    const [backendAvailable, setBackendAvailable] = useState(false);

    const volumeMap = useMemo(() => {
        const map = {};
        if (Array.isArray(ticker)) {
            ticker.forEach((t) => {
                map[t.symbol] = parseFloat(t.quoteVolume) || 0;
            });
        }
        return map;
    }, [ticker]);

    // Keep ticker ref updated
    useEffect(() => {
        tickerRef.current = ticker;
    }, [ticker]);

    // Sync base coefficient from backend when available
    useEffect(() => {
        if (!activityFeed?.intervals) return;

        const hasData = Object.values(activityFeed.intervals).some(
            (payload) => Array.isArray(payload?.metrics) && payload.metrics.length > 0
        );

        if (hasData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBackendAvailable(true);
            backendAvailableRef.current = true;

            Object.entries(activityFeed.intervals).forEach(([intervalKey, payload]) => {
                if (!Array.isArray(payload?.metrics) || !payload.metrics.length) return;

                if (!baseCoeffRef.current[intervalKey]) {
                    baseCoeffRef.current[intervalKey] = {};
                }

                payload.metrics.forEach((item) => {
                    const symbol = item?.symbol?.toUpperCase();
                    if (!symbol || ACTIVITY_EXCLUSION_SET.has(symbol)) return;
                    const numericScore = Number(item.score);
                    if (!Number.isFinite(numericScore)) return;

                    // Set up decaying base coefficient
                    // It will decay by value/60 each tick over 60 ticks
                    baseCoeffRef.current[intervalKey][symbol] = {
                        value: numericScore,
                        decayPerTick: numericScore / WINDOW_SIZE,
                        ticksRemaining: WINDOW_SIZE,
                    };

                    // Initialize rolling window for this symbol if not exists
                    if (!rollingWindowRef.current[intervalKey]) {
                        rollingWindowRef.current[intervalKey] = {};
                    }
                    if (!rollingWindowRef.current[intervalKey][symbol]) {
                        rollingWindowRef.current[intervalKey][symbol] = [];
                    }
                });
            });
        }
    }, [activityFeed?.intervals]);

    // Local activity calculation with decaying base + rolling window
    const calculateActivity = useCallback((intervalKey) => {
        const now = Date.now();
        const sampleMs = INTERVAL_SAMPLE_MS[intervalKey];
        if (!sampleMs) return;

        const currentTicker = tickerRef.current;
        if (!Array.isArray(currentTicker) || !currentTicker.length) return;

        // Initialize refs if needed
        if (!lastPricesRef.current[intervalKey]) lastPricesRef.current[intervalKey] = {};
        if (!rollingWindowRef.current[intervalKey]) rollingWindowRef.current[intervalKey] = {};
        if (!baseCoeffRef.current[intervalKey]) baseCoeffRef.current[intervalKey] = {};

        const lastPrices = lastPricesRef.current[intervalKey];
        const rollingWindows = rollingWindowRef.current[intervalKey];
        const baseCoeffs = baseCoeffRef.current[intervalKey];

        const lastSampleTime = lastSampleTimeRef.current[intervalKey] || 0;
        const isCommit = lastSampleTime === 0 || now - lastSampleTime >= sampleMs;

        // If we are committing, update the timestamp
        if (isCommit) {
            lastSampleTimeRef.current[intervalKey] = now;
        }

        const activityUpdate = {};
        const _allSymbols = new Set([
            ...Object.keys(baseCoeffs),
            ...Object.keys(rollingWindows),
            ...currentTicker.map(t => t.symbol) // Include current ticker symbols to catch new ones
        ]);

        // Process each ticker symbol
        currentTicker.forEach((item) => {
            if (!item.symbol || !ALLOWED_MARKETS.some((m) => item.symbol.endsWith(m))) return;
            if (ACTIVITY_EXCLUSION_SET.has(item.symbol.toUpperCase())) return;

            const symbol = item.symbol.toUpperCase();
            const currentPrice = parseFloat(item.lastPrice);
            const quoteVolume = parseFloat(item.quoteVolume) || 0;

            // Filter by volume and price validity
            const isUSDT = symbol.endsWith("USDT");
            const meetsVolume = isUSDT ? quoteVolume > 600000 : quoteVolume > 80;
            if (!meetsVolume || !Number.isFinite(currentPrice) || currentPrice <= 0) return;

            const prevPrice = lastPrices[symbol];

            // Initialize rolling window if needed
            if (!rollingWindows[symbol]) {
                rollingWindows[symbol] = [];
            }

            let pctChange = 0;
            if (prevPrice && prevPrice > 0) {
                pctChange = Math.abs(currentPrice / prevPrice - 1) * 100;
            }

            if (isCommit) {
                // COMMIT PHASE:
                // Push the calculated change (if we had a prevPrice) to the permanent window
                if (prevPrice && prevPrice > 0) {
                    rollingWindows[symbol].push(pctChange);

                    if (rollingWindows[symbol].length > WINDOW_SIZE) {
                        rollingWindows[symbol].shift();
                    }
                }

                // Update baseline references for the NEXT interval
                lastPrices[symbol] = currentPrice;

                // Decay the base coefficient
                if (baseCoeffs[symbol] && baseCoeffs[symbol].ticksRemaining > 0) {
                    baseCoeffs[symbol].value = Math.max(0, baseCoeffs[symbol].value - baseCoeffs[symbol].decayPerTick);
                    baseCoeffs[symbol].ticksRemaining--;
                }
            }

            // SCORE CALCULATION (Preview or Post-Commit):
            // We want to calculate the score using the current window state + pending change.
            // If we just committed, rollingWindows[symbol] already has the latest change.
            // If we are previewing, rollingWindows[symbol] has the PAST data, and we manually add pctChange as the "next" element.

            const window = rollingWindows[symbol] || [];
            let effectiveWindowSum = 0;

            if (isCommit) {
                // The window is already updated with this tick
                effectiveWindowSum = window.reduce((sum, val) => sum + val, 0);
            } else {
                // "Pending" update:
                // We effectively want SUM(last 59 items) + pctChange
                // If window has < 60 items, just add all of them + pctChange
                // If window has 60 items, ignore the 0th item (it would fall off)

                const startIdx = window.length >= WINDOW_SIZE ? 1 : 0;
                // Sum the relevant historical items
                for (let i = startIdx; i < window.length; i++) {
                    effectiveWindowSum += window[i];
                }
                // Add the pending current interval change
                effectiveWindowSum += pctChange;
            }

            const baseData = baseCoeffs[symbol];

            let finalScore;
            // Use current decayed base value
            if (baseData && baseData.ticksRemaining > 0) {
                finalScore = baseData.value + effectiveWindowSum;
            } else {
                finalScore = effectiveWindowSum;
            }

            activityUpdate[symbol] = Number(finalScore.toFixed(3));
        });

        // Update state for this interval
        setActivity((prev) => ({
            ...prev,
            [intervalKey]: activityUpdate,
        }));
    }, []);

    // Run local calculations on intervals
    useEffect(() => {
        // Force immediate first sample for all intervals when ticker becomes available
        // This ensures we don't wait for the full interval before getting first sample
        const runInitial = () => {
            const intervals = Object.keys(INTERVAL_SAMPLE_MS);
            intervals.forEach((key) => {
                // Force the first sample by not checking time constraint
                if (!lastSampleTimeRef.current[key]) {
                    calculateActivity(key);
                }
            });
        };

        // Run initial calculation
        runInitial();

        // Set up interval runners
        const timers = [];
        timers.push(setInterval(() => calculateActivity("1s"), 1000));
        timers.push(setInterval(() => calculateActivity("1m"), 1000));
        timers.push(setInterval(() => calculateActivity("5m"), 1000));
        timers.push(setInterval(() => calculateActivity("15m"), 1000));

        return () => timers.forEach(clearInterval);
    }, [calculateActivity]);

    // Re-run initial when ticker first becomes available
    useEffect(() => {
        if (ticker && ticker.length > 0) {
            const intervals = Object.keys(INTERVAL_SAMPLE_MS);
            intervals.forEach((key) => {
                // If we haven't recorded prices for this interval yet, do it now
                if (!lastPricesRef.current[key] || Object.keys(lastPricesRef.current[key]).length === 0) {
                    calculateActivity(key);
                }
            });
        }
    }, [ticker, calculateActivity]);

    useEffect(() => {
        localStorage.setItem("activity_panel", JSON.stringify({ interval }));
    }, [interval]);

    const selectSymbol = useCallback((symbol) => {
        if (!symbol) return;
        const normalized = symbol.trim().toUpperCase();
        if (!normalized) return;
        if (onPairNavigate) {
            onPairNavigate(normalized);
        } else if (normalized !== panel.selected) {
            handlePanelUpdate({ ...panel, selected: normalized }, true);
        }
    }, [handlePanelUpdate, onPairNavigate, panel]);

    const handlePairClick = (e) => selectSymbol(e.target.textContent);
    const handleIntervalClick = (e) => setInterv(e.target.textContent);

    const showSpinner = !backendAvailable && (!activity || !activity[interval] || !Object.keys(activity[interval] || {}).length);

    if (!activity || !Object.keys(activity).length) {
        return (
            <div className="analytics-section activity-section">
                {showSpinner ? (
                    <div className="analytics-placeholder">Syncing activity…</div>
                ) : (
                    <div className="analytics-placeholder">No activity data</div>
                )}
            </div>
        );
    }

    const volumeThreshold = activityVolumeFilter || 10000000;
    const sortedKeys = Object.keys(activity[interval] || {})
        .filter((key) => ALLOWED_MARKETS.some((market) => key.includes(market)))
        .filter((key) => !ACTIVITY_EXCLUSION_SET.has(key.toUpperCase()))
        .filter((key) => (volumeMap[key] || 0) >= volumeThreshold)
        .sort((a, b) => activity[interval][b] - activity[interval][a])
        .slice(0, MAX_DISPLAY_PAIRS);

    return (
        <div className="analytics-section activity-section">
            <div className="section-header">
                <div className="interval-buttons">
                    {Object.keys(activity)
                        .sort((a, b) => (a[1] === "s" ? -1 : parseInt(a) < parseInt(b) ? -1 : 1))
                        .map((key) => (
                            <button
                                key={key}
                                type="button"
                                className={`interval-btn ${interval === key ? "active" : ""}`}
                                onClick={handleIntervalClick}
                            >
                                {key}
                            </button>
                        ))}
                </div>
            </div>
            <div className="activity-rows">
                {sortedKeys.length > 0 ? (
                    sortedKeys.map((key) => (
                        <div className="activity-row" key={key}>
                            <button
                                type="button"
                                className="activity-symbol"
                                onClick={handlePairClick}
                                style={{ opacity: 0.4 + (1 / 10) * activity[interval][key] }}
                            >
                                {key}
                            </button>
                            <span className="activity-volume">
                                {formatVolumeShort(volumeMap[key] || 0)}
                            </span>
                            <span className="activity-score" style={{ opacity: 0.2 + (1 / 10) * activity[interval][key] }}>
                                {activity[interval][key].toFixed(1)}
                            </span>
                        </div>
                    ))
                ) : showSpinner ? (
                    <div className="analytics-placeholder">Syncing activity…</div>
                ) : (
                    <div className="analytics-placeholder">No pairs match filters</div>
                )}
            </div>
        </div>
    );
};

// ============== STRENGTH SECTION ==============
const StrengthSection = ({ onPairNavigate }) => {
    const { analytics, analyticsVolumeFilter, ticker } = useDataContext();
    const [expanded, setExpanded] = useState(false);
    const [window, setWindow] = useState(STRENGTH_WINDOWS[0]);
    const [sortDirection, setSortDirection] = useState('desc'); // 'desc' = highest first, 'asc' = lowest first

    const volumeMap = useMemo(() => {
        const map = {};
        if (Array.isArray(ticker)) {
            ticker.forEach((t) => {
                map[t.symbol] = parseFloat(t.quoteVolume) || 0;
            });
        }
        return map;
    }, [ticker]);
    const hasVolumeData = Object.keys(volumeMap).length > 0;
    const volumeThreshold = Number(analyticsVolumeFilter) || 10000000;

    const filterRows = (items) =>
        (items || [])
            .filter((item) => item?.symbol && !ANALYTICS_EXCLUSION_SET.has(item.symbol.toUpperCase()) && !isStableSymbol(item.symbol))
            .filter((item) => !hasVolumeData || (volumeMap[item.symbol] || 0) >= volumeThreshold);

    const filterByWindow = (items, targetWindow) => {
        if (!Array.isArray(items) || !targetWindow) return [];
        const decorated = [];
        items.forEach((item) => {
            if (!Array.isArray(item.components)) return;
            const component = item.components.find((c) => c.window === targetWindow);
            if (!component) return;
            decorated.push({ ...item, activeComponent: component });
        });
        decorated.sort((a, b) => {
            const aScore = Number(a.activeComponent?.contribution ?? a.score) || 0;
            const bScore = Number(b.activeComponent?.contribution ?? b.score) || 0;
            return sortDirection === 'desc' ? bScore - aScore : aScore - bScore;
        });
        return decorated;
    };

    const rows = filterByWindow(filterRows(analytics?.strength || []), window).slice(0, MAX_ANALYTICS_ROWS);
    const visibleRows = expanded ? rows : rows.slice(0, 1);

    const formatScore = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(1) : "--";
    };

    return (
        <div className="analytics-section strength-section">
            <div className="section-header">
                <div className="interval-buttons">
                    {STRENGTH_WINDOWS.map((w) => (
                        <button
                            key={w}
                            type="button"
                            className={`interval-btn ${window === w ? "active" : ""}`}
                            onClick={() => setWindow(w)}
                        >
                            {w}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className={`sort-toggle-btn ${sortDirection}`}
                    onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title={sortDirection === 'desc' ? 'Showing highest first' : 'Showing lowest first'}
                >
                    {sortDirection === 'desc' ? '▼' : '▲'}
                </button>
                <button type="button" className={`toggle-btn ${expanded ? "active" : ""}`} onClick={() => setExpanded((v) => !v)}>
                    {expanded ? "▲" : "▼"}
                </button>
            </div>
            <div className="metric-rows">
                {visibleRows.length > 0 ? (
                    visibleRows.map((item) => {
                        const comp = item.activeComponent;
                        const score = Math.min(100, Math.max(0, Number(comp?.contribution ?? item.score) || 0));
                        const context = comp ? `${comp.window}: BTC ${comp.btcMovePct ?? "--"}% / ${comp.coinMovePct ?? "--"}%` : "";
                        return (
                            <div className="metric-row" key={item.symbol}>
                                <button type="button" className="metric-symbol" onClick={() => onPairNavigate?.(item.symbol)}>
                                    {item.symbol}
                                </button>
                                <div className="metric-bar-container">
                                    <div className="metric-bar">
                                        <div className="metric-bar-fill strength" style={{ width: `${score}%` }} />
                                    </div>
                                    <span className="metric-value">{formatScore(score)}</span>
                                </div>
                                {context && <div className="metric-context">{context}</div>}
                            </div>
                        );
                    })
                ) : (
                    <div className="analytics-placeholder">
                        {analytics?.loading ? "Loading…" : analytics?.error || "No data yet"}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============== ENDURANCE SECTION ==============
const EnduranceSection = ({ onPairNavigate }) => {
    const { analytics, analyticsVolumeFilter, ticker } = useDataContext();
    const [expanded, setExpanded] = useState(false);
    const [window, setWindow] = useState(ENDURANCE_WINDOWS[0]);
    const [sortDirection, setSortDirection] = useState('desc'); // 'desc' = highest first, 'asc' = lowest first

    const volumeMap = useMemo(() => {
        const map = {};
        if (Array.isArray(ticker)) {
            ticker.forEach((t) => {
                map[t.symbol] = parseFloat(t.quoteVolume) || 0;
            });
        }
        return map;
    }, [ticker]);
    const hasVolumeData = Object.keys(volumeMap).length > 0;
    const volumeThreshold = Number(analyticsVolumeFilter) || 10000000;

    const filterRows = (items) =>
        (items || [])
            .filter((item) => item?.symbol && !ANALYTICS_EXCLUSION_SET.has(item.symbol.toUpperCase()) && !isStableSymbol(item.symbol))
            .filter((item) => !hasVolumeData || (volumeMap[item.symbol] || 0) >= volumeThreshold);

    const filterByWindow = (items, targetWindow) => {
        if (!Array.isArray(items) || !targetWindow) return [];
        const decorated = [];
        items.forEach((item) => {
            if (!Array.isArray(item.components)) return;
            const component = item.components.find((c) => c.window === targetWindow);
            if (!component) return;
            decorated.push({ ...item, activeComponent: component });
        });
        decorated.sort((a, b) => {
            const aScore = Number(a.activeComponent?.contribution ?? a.score) || 0;
            const bScore = Number(b.activeComponent?.contribution ?? b.score) || 0;
            return sortDirection === 'desc' ? bScore - aScore : aScore - bScore;
        });
        return decorated;
    };

    const rows = filterByWindow(filterRows(analytics?.endurance || []), window).slice(0, MAX_ANALYTICS_ROWS);
    const visibleRows = expanded ? rows : rows.slice(0, 1);

    const formatScore = (value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(1) : "--";
    };

    return (
        <div className="analytics-section endurance-section">
            <div className="section-header">
                <div className="interval-buttons">
                    {ENDURANCE_WINDOWS.map((w) => (
                        <button
                            key={w}
                            type="button"
                            className={`interval-btn ${window === w ? "active" : ""}`}
                            onClick={() => setWindow(w)}
                        >
                            {w}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className={`sort-toggle-btn ${sortDirection}`}
                    onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title={sortDirection === 'desc' ? 'Showing highest first' : 'Showing lowest first'}
                >
                    {sortDirection === 'desc' ? '▼' : '▲'}
                </button>
                <button type="button" className={`toggle-btn ${expanded ? "active" : ""}`} onClick={() => setExpanded((v) => !v)}>
                    {expanded ? "▲" : "▼"}
                </button>
            </div>
            <div className="metric-rows">
                {visibleRows.length > 0 ? (
                    visibleRows.map((item) => {
                        const comp = item.activeComponent;
                        const score = Math.min(100, Math.max(0, Number(comp?.contribution ?? item.score) || 0));
                        const context = comp ? `${comp.window}: BTC ${comp.btcMovePct ?? "--"}% / ${comp.coinMovePct ?? "--"}%` : "";
                        return (
                            <div className="metric-row" key={item.symbol}>
                                <button type="button" className="metric-symbol" onClick={() => onPairNavigate?.(item.symbol)}>
                                    {item.symbol}
                                </button>
                                <div className="metric-bar-container">
                                    <div className="metric-bar">
                                        <div className="metric-bar-fill endurance" style={{ width: `${score}%` }} />
                                    </div>
                                    <span className="metric-value">{formatScore(score)}</span>
                                </div>
                                {context && <div className="metric-context">{context}</div>}
                            </div>
                        );
                    })
                ) : (
                    <div className="analytics-placeholder">
                        {analytics?.loading ? "Loading…" : analytics?.error || "No data yet"}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============== MAIN ANALYTICS PANEL ==============
const AnalyticsPanel = ({ onPairNavigate }) => {
    return (
        <div className="analytics-panel">
            <ActivitySection onPairNavigate={onPairNavigate} />
            <StrengthSection onPairNavigate={onPairNavigate} />
            <EnduranceSection onPairNavigate={onPairNavigate} />
        </div>
    );
};

export default AnalyticsPanel;

