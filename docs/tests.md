# Testing Strategy

## Goals
- Guarantee core flows (chart rendering, pair switching, order interactions) behave across upgrades.
- Catch regressions in the Electron bridge when Binance responses change shape.
- Keep feedback fast (unit tests < 5s, integration tests < 1 min).

## Layers

| Layer | Tooling | Scope |
| --- | --- | --- |
| Unit | Vitest | Pure helpers (`utils/utils.js`), custom hooks (`useWebSocket`), Context logic. |
| Component | Vitest + React Testing Library | UI rendering, interactions (`InfoPanel`, `OrderFormModal`), Chart mounting (`ChartWrapper`). |
| End-to-End | Playwright (Electron) | Full app launch (Smoke Test), Critical Flows (UI component verification). |

## Data Strategy
- Mock mode already emits deterministic structures; add a seed toggle so tests can assert exact values.
- Use the shared factories under `src/test/mocks/` (importable via `@/test/mocks`) for DataContext snapshots, mini-chart data, and browser APIs like `localStorage` so mocks never leak into production modules.
- Keep large/static JSON blobs (chart/trades/depth) under `tests/fixtures/` for repeatable playback.

## Completed Steps
1. Set up Vitest + RTL infrastructure.
2. Implemented Unit Tests for Utils, Hooks, and Context.
3. Implemented Component Tests for InfoPanel, OrderFormModal, and ChartWrapper.
4. Implemented Playwright Smoke Test and Critical Flow Test.
5. Integrated `npm run test:all` script.

## Next Steps
1. Gate CI on lint + unit + smoke tests; run E2E nightly.
2. Expand E2E coverage to include full trading lifecycle (mocked).

