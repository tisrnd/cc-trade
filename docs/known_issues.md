# Known Issues & Technical Debt

This list tracks only the **open** items. Resolved issues move to `docs/fixed_issues.md`.

| Area | Issue | Mitigation / Next Steps |
| --- | --- | --- |
| Volume Profile (VPVR) | Hover readouts, VWAP bands; the histogram can lag after large zoom jumps. | Finish the polish item in `docs/migration.md` §3.1 (bind bins to the visible range, add hover tooltips, ship VWAP overlays). |
| Detail Stream & Pair Switching |

| Precision Utilities | Two implementations of `calculatePrecision` (`utils/utils.js` and `utils/operations.js`) can diverge and produce mismatched rounding. | Unify on the newer `utils/precision.js` helpers and remove legacy math during the order-form validation refresh. | Check if we have legacy websocket Frontend to Backend API left and remove the old one


Please update this file whenever you discover a repeatable bug or start paying down one of the listed items.

