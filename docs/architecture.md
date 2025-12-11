# WebSocket Architecture

## Overview
The application uses a centralized WebSocket management system to handle real-time data for charts, order books, and trades.

## Key Components

### 1. `useWebSocket` Hook
- **Location**: `src/hooks/useWebSocket.js`
- **Responsibility**: Manages the single WebSocket connection, handles subscriptions, and enforces connection limits.
- **Features**:
    - **Global LRU**: Enforces a maximum of 50 active subscriptions. When the limit is reached, the least recently used subscription is automatically evicted.
    - **Deduplication**: Checks for existing subscriptions before sending new requests, preventing duplicate data streams.
    - **Reconnection**: Automatically reconnects and resubscribes to active channels upon connection loss.

### 2. Channel IDs
- **Location**: `src/utils/channels.js`
- **Format**: `${type}-${symbol}-${interval}` (e.g., `mini-BTCUSDT-1h`)
- **Deterministic**: IDs are generated consistently based on parameters, enabling reliable deduplication and reuse.

### 3. Constants
- **Location**: `src/constants/`
- **Responsibility**: Centralized location for application-wide constants.
- **Structure**:
    - `index.js`: General application constants (intervals, default settings, etc.).
    - `notification.js`: Notification types and configuration.

### 4. Data Context
- **Location**: `src/context/DataContext.jsx`
- **Responsibility**: Distributes data to components and manages application state.
- **Syncing**: Automatically syncs detailed chart data to mini-chart state, ensuring instant loading when switching views.

### 5. Notification System
- **Context**: `src/context/NotificationContext.js` (Context object)
- **Provider**: `src/context/NotificationProvider.jsx` (Component)
- **Hook**: `src/hooks/useNotifications.js` (Custom hook)
- **Constants**: `src/constants/notification.js` (Types)

## Subscription Flow
1.  **Component Request**: A component (e.g., `MainView`) requests a subscription via `subscribeChannel`.
2.  **Deduplication**: `useWebSocket` checks if the channel ID is already active.
    - If **Active**: Updates `lastUsed` timestamp and returns (no network request).
    - If **New**: Adds to active list, updates `lastUsed`.
3.  **Limit Check**: If active subscriptions > 50, the oldest (by `lastUsed`) is unsubscribed.
4.  **Network Request**: Sends `subscribe` action to the WebSocket server.

## Best Practices
- **Always use `createChannelId`**: Ensure consistent ID generation.
- **Don't manually unsubscribe in `MainView`**: Let the global LRU handle cleanup to allow connection reuse across views.
