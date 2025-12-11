export const MARKETS = ['BTC', 'USDT']
export const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']

export const DEFAULT_PANEL = {
    input: '',
    market: 'BTC',
    interval: '1h',
    selected: 'BNBBTC',
    update_socket: false,
    observable: true,
    watchlist: ['BTCSDT', 'BNBBTC', 'BNBUSDT', 'ETHUSDT']
}

export const DEFAULT_THROTTLE = {
    state: false,
    timeout: 500,
}

export const DEFAULT_STATE = {
    chart: [],
    balances: {},
    orders: [],
    filters: {},
    depth: [],
    trades: [],
    history: [],
    ticker: [],
    dialog: {},
    activity_data: {},
    filtered_coins: ['USDSBUSDT', 'RENBTCETH', 'BCHABC', 'BCHSV', 'BCC'],
    filtered_patterns: ['DOWNUSDT', 'UPUSDT', 'BEAR', 'BULL'],
    filtered_markets: {
        BTC: true,
        USDT: true,
    },
    update_chart: true,
    is_final: false,
    connection: false,
}

export const DEFAULT_ORDER_BOOK_SETTINGS = {
    shown_number: 21,
    accuracy: 10,
    max_accuracy: 45,
    min_accuracy: 0,
}

export const DEFAULT_ACTIVITY_PANEL_SETTINGS = {
    interval: '1s',
}

export const DEFAULT_ACTIVITY_INTERVAL_DATA = { '1s': {}, '1m': {}, '5m': {}, '15m': {} }

// Placeholder for known_pairs if not available yet, or we can copy it later.
// For now, empty array or minimal set.
export const DEFAULT_TRADE_PAIRS = [];

export const DEFAULT_INCREASE_MIN_PRICE = false;
export const DEFAULT_ENABLED_MARKET_BALANCE = false; 

export const ACTIVITY_SYMBOL_EXCLUSIONS = [
    'USDCUSDT',
    'BUSDUSDT',
    'FDUSDUSDT',
    'TUSDUSDT',
    'USDPUSDT',
    'USDDUSDT',
    'DAIUSDT',
    'USDTUSDC',
    'USDTBUSD',
    'XUSDUSDT',
    'USDEUSDT',
    'PAXGUSDT',
    'USD1USDT',
    'BFUSDUSDT',
    'EURUSDT',
    'GBPUSDT',
    'EURIUSDT'
];

export const ANALYTICS_SYMBOL_EXCLUSIONS = [
    'USDCUSDT',
    'BUSDUSDT',
    'FDUSDUSDT',
    'TUSDUSDT',
    'USDPUSDT',
    'USDDUSDT',
    'DAIUSDT',
    'USDTUSDC',
    'USDTBUSD',
    'XUSDUSDT',
    'USDEUSDT',
    'PAXGUSDT',
    'USD1USDT',
    'BFUSDUSDT',
    'EURUSDT',
    'GBPUSDT',
    'EURIUSDT'
];
