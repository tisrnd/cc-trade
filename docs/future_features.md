# Future Features & Improvements

This document tracks features and improvements planned for the post-migration phase.

## Chart Features
- [x] **Drawing Tools**: Horizontal lines, trend lines, rectangles, Fibonacci retracement with persistence per symbol:interval.
- [x] **Drawing Tools Polish**:
    - [x] Color picker for individual drawings (8 preset colors)
    - [x] Drag-to-reposition for all drawings in cursor mode
    - [x] Edge handle dragging for trend line endpoints
    - [x] Rectangle tool with semi-transparent fill
    - [x] Fibonacci retracement tool with standard levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
    - [x] Text labels on drawing toolbar buttons
    - [x] Text/label annotations (on-chart text) - click to place, type to add text
    - [ ] Drawing templates (save/load common setups)
    - [ ] Drawing undo/redo CTRL+Z, CTRL+SHIFT+Z
- [ ] **Candle/Area Switching**: UI to toggle between Candle and Area chart types.
- [ ] **Advanced VPVR**: Hover readouts, VWAP bands, and tighter binding to the visible range.
- [x] **Price Alerts**: Audio/visual/browser notification alerts at specific price levels.
    - [x] Ctrl+double-click on chart opens alert panel with clicked price pre-filled.
    - [x] Alert lines displayed on chart (amber/yellow, semi-transparent)
- [x] **Order Overlays on Chart**:
    - [x] Redesigned active order lines with modern gradient styling
    - [x] Completed/historical order lines displayed on chart (grouped by side, weighted avg price)
- [x] **Multiple Timeframe Analysis**: Mini charts showing different timeframes side-by-side.
    - [x] MainView with 8-chart grid (configurable symbols/intervals)
    - [x] ALT+Click navigation between DepthView and MainView
    - [x] Per-chart interval buttons for quick timeframe switching
    - [x] Live data via mini channel subscriptions
    - [x] Activity panel toggle with bookmark on left edge
    - [x] Selected slot indicator (green border) - click to select a chart
    - [x] QuickSwitch updates selected slot (not always slot 0)
    - [x] ActivityPanel clicks update selected slot
    - [x] DepthView/MainView sync - changes in DepthView reflect in MainView selected slot
    - [x] WebSocket connection limit (50 max) with LRU cleanup
    - [x] Connections persist across view switches (no reconnection overhead)
    - [x] Chart pan/zoom preserved on data updates
    - [x] Price measurement tool (Shift+Click) - same as DepthView


## Order Form & Trading
- [ ] **Stop-Limit Orders**: Support for Stop-Limit and other advanced order types.
- [ ] **Position Size Calculator**: Risk-based position sizing with stop-loss input.
- [ ] **Risk/Reward Visualization**: Show R:R ratio on chart when placing orders.
- [ ] **Trade Journal Integration**: Log trades with notes and screenshots.

## User Interface & Experience
- [ ] ON HOLD **Theming**: Ensure dark/light mode parity and align shared styles with the refreshed palette.
- [x] **Loading Feedback**: Full-screen loading overlay with spinner during initial load and pair switching.
- [x] **Pair Switching Feedback**: Loading overlay shows symbol being loaded.
- [x] **Loading Timeout**: Auto-dismiss loading overlay after 15s to prevent stuck states.
- [ ] **Loading Error State**: Show user-friendly error message when loading times out, with retry button. - REMARK: we already have notification system, that might be useful
- [ ] **Add Global Undo/Redo with History**: Store last users action of change of pairs or drawings, etc. And allow him to revert/redo the last action
- [ ] **Hotkey Cheat Sheet**: Overlay showing all available keyboard shortcuts.
- [ ] **Customizable Layout**: Drag-and-resize panels, save layout presets.
- [ ] **Watchlist Panel**: Quick-access list of favorite trading pairs with mini price info.

## Keyboard Shortcuts
- [ ] **Configurable Mappings**: Allow users to customize keyboard shortcuts.
- [ ] **Extended Shortcuts**: Expand shortcuts beyond the Quick Switch overlay (e.g., timeframe switching, modal triggers).

## Data & Analytics
- [ ] **Trade History Export**: Export trade history to CSV/Excel.
- [x] **Order History Display**: 
    - [x] Grouped order history view (consolidates multiple orders by side with weighted avg price)
    - [x] Visual distinction between buy/sell with gradient backgrounds
    - [x] Display on chart as semi-transparent overlays
- [x] **P&L Tracking**: Real-time profit/loss calculation per day/week/month with reset capability.
    - [x] Auto-syncs with order history
- [ ] **Performance Analytics**: Win rate, average R:R, equity curve visualization. - REMARK: we already have PLN feature - might be useful
- [ ] **Market Scanner**: Filter pairs by volume, price change, volatility.
- [ ] **Strength Analyzer** - Analyze how hard the pair is resisting on BTCUSDT fast volatile changes and provide some ration - by resistance it means that the pair is continuing it's channel price path without breaking. Each coin behaves differently
- [ ] **Endurance Analyzer** - Analyze how long the pair is resistin on BCTUSDT long volatile changes and provide some ratio -  - by resistance it means that the pair is continuing it's channel price path without breaking. Each coin behaves differently

## Technical Debt & Infrastructure
- [x] **WebSocket Channel Refactor**:
    - [x] Implement Detail Stream metadata tracking via `channelId`.
    - [x] Normalize chart payloads with symbol/interval tags.
    - [x] Refactor subscription management with `ChannelManager` class.
    - [x] Add `useChannel` hook for component-level subscriptions.
- [x] **Multi-Chart Support**: 
    - [x] MainView component with 8-chart grid layout
    - [x] MiniChart component with lightweight candlestick rendering
    - [x] Mini channel subscriptions for independent data streams
    - [x] Per-chart interval controls
    - [x] Chart configs persisted to localStoragen
- [x] **API Rate Limiting**: Binance API rate limiter to prevent throttling.
    - [x] REST API token bucket limiter (800 weight/minute)
    - [x] WebSocket connection throttling (200ms between connections)
    - [x] Staggered mini-chart subscriptions (250ms apart)
    - [x] User feedback via notification system
- [x] **App Notification System**: Toast notifications for user feedback
    - [x] Top-right corner toast with slide-in animation
    - [x] Auto-dismiss after 5 seconds, click to close
    - [x] Types: info, success, warning, error (color-coded)
    - [x] Notification history in TradesPanel
    - [x] Integration with connection/loading events
- [x] **Activity Panel Improvements**:
    - [x] Configurable 24h volume filter (default 10M USDT)
    - [x] Volume threshold setting in TradesPanel → Settings
    - [x] Limited to top 7 active pairs display
    - [x] Setting persisted to localStorage
- [ ] **Testing**: Seed deterministic mock data playback for QA/UI testing.
- [ ] **Documentation**: Document lint/build debt and keep `known_issues.md` current.
- [x] **Offline Mode**: IndexedDB cache for candles, trades, and exchange info.
