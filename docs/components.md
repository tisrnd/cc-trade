# Component Reference

This document summarizes each major React component, its responsibilities, and any migration caveats.

| Component | Responsibilities | Notes / TODO |
| --- | --- | --- |
| `ChartWrapper.jsx` | Renders lightweight-charts instance (candles, SMA, volume, VPVR overlay). Handles order shortcuts, price line, and drawing tools. | VPVR implemented. Measurement tool added. Drawing tools integrated. |
| `DrawingToolbar.jsx` | Vertical toolbar for chart drawing tools (cursor, horizontal line, trend line, delete). | Positioned between Activity Panel and Chart. |
| `ActivityPanel.jsx` | Displays top 7 active movers per interval. Configurable 24h volume filter (default 10M USDT). | Uses timers + refs; keep filters synced via refs to avoid stale closures. Volume filter configurable via Settings. |
| `UpperPanel.jsx` | Market + interval selectors, pair info summary. | Needs pair switching plumbing (refresh WebSocket + dependent panels). |
| `TradesPanel.jsx` | Shows live trades/history, throttling controls, notification history, and activity volume filter setting. | Has 4 tabs: Trades, History, Notifications, Settings. |
| `OrderBook.jsx` | Aggregated depth view with precision controls and double-click order shortcuts. | Tightly coupled to Binance filters; ensure filters are ready before rendering. |
| `InfoPanel.jsx` | Balances, open orders, P&L tracking, and quick market history links. | Cancel order button still relays to placeholder `handleRequest`. |
| `OrderFormModal.jsx` | Bootstrap modal for manual order entry (invoked via shortcuts). | Precision enforcement implemented. |
| `InputCoin.jsx` | Autocomplete search for pairs + keyboard input handling. | Legacy keyboard UX retained; revisit after pair switching improvements. |
| `NotificationToast.jsx` | Displays toast notifications in top-right corner. | Auto-dismiss 5s, click to dismiss. Uses NotificationContext. |
| `MainView.jsx` | Dashboard with 8 mini charts in 4x2 grid. | Selected slot syncs with DepthView, connection limit enforced. |
| `MiniChart.jsx` | Lightweight chart component for MainView dashboard. | Per-chart interval buttons, measurement tool support. |
| `useWebSocket.js` | Maintains a resilient connection to the local WebSocket server, queues panel updates. | Fully tested (unit tests). Supports channel protocol. |

## Styling & Layout

- Global primitives now live in `src/styles/base.css`; every major component owns a sibling `*.css` file so styles stay close to the JSX.
- Bootstrap is only used inside modal components; keep the rest of the UI in the bespoke theme.

## Adding New Components

1. Place UI components under `src/components/`.
2. Keep business/data logic in hooks or utils to ease testing.
3. Document the new component here (responsibilities + any quirks).

