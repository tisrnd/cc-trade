import { vi } from 'vitest';

const DEFAULT_PANEL = {
  selected: 'BTCUSDT',
  interval: '1h',
  market: 'USDT',
};

const DEFAULT_PRECISION = {
  price: 2,
  quantity: 4,
};

const DEFAULT_FILTERS = {
  BTCUSDT: {
    tickSize: '0.01',
    stepSize: '0.000001',
    minQty: '0.0001',
    minNotional: '10',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
  },
};

export const mockChartData = [
  { time: 1700000000, open: 50000, high: 51000, low: 49000, close: 50500 },
  { time: 1700003600, open: 50500, high: 52000, low: 50000, close: 51500 },
];

export const DEFAULT_MINI_CHART_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'SOLUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
];

export const createMockMiniCharts = ({
  symbols = DEFAULT_MINI_CHART_SYMBOLS,
  interval = '1h',
  data = mockChartData,
  overrides = {},
} = {}) => {
  const clonedData = data.map((entry) => ({ ...entry }));
  const lastTick = clonedData[clonedData.length - 1] ?? null;

  return symbols.reduce((acc, symbol) => {
    const key = `${symbol}-${interval}`;
    acc[key] = {
      data: clonedData.map((entry) => ({ ...entry })),
      lastTick,
      ...(overrides[key] ?? {}),
    };
    return acc;
  }, {});
};

export const createMockDataContextValue = ({
  panel,
  balances,
  orders,
  filters,
  ticker,
  marketHistory,
  history,
  chart,
  trades,
  depth,
  selectedPrecision,
  enabledMarketBalance,
  wsConnection,
  subscribeChannel,
  unsubscribeChannel,
  miniCharts,
  handlePanelUpdate,
  setChart,
  setTrades,
  setHistory,
  setDepth,
  setOrders,
  setBalances,
  setMarketHistory,
  ...extra
} = {}) => ({
  panel: { ...DEFAULT_PANEL, ...(panel ?? {}) },
  balances: balances ?? {},
  orders: orders ?? [],
  filters: { ...DEFAULT_FILTERS, ...(filters ?? {}) },
  ticker: ticker ?? [],
  marketHistory: marketHistory ?? [],
  history: history ?? [],
  chart: chart ?? [],
  trades: trades ?? [],
  depth: {
    bids: { ...(depth?.bids ?? {}) },
    asks: { ...(depth?.asks ?? {}) },
  },
  selectedPrecision: { ...DEFAULT_PRECISION, ...(selectedPrecision ?? {}) },
  enabledMarketBalance: enabledMarketBalance ?? false,
  wsConnection: wsConnection ?? { readyState: 1 },
  subscribeChannel: subscribeChannel ?? vi.fn(),
  unsubscribeChannel: unsubscribeChannel ?? vi.fn(),
  miniCharts: miniCharts ?? createMockMiniCharts(),
  handlePanelUpdate: handlePanelUpdate ?? vi.fn(),
  setChart: setChart ?? vi.fn(),
  setTrades: setTrades ?? vi.fn(),
  setHistory: setHistory ?? vi.fn(),
  setDepth: setDepth ?? vi.fn(),
  setOrders: setOrders ?? vi.fn(),
  setBalances: setBalances ?? vi.fn(),
  setMarketHistory: setMarketHistory ?? vi.fn(),
  ...extra,
});

