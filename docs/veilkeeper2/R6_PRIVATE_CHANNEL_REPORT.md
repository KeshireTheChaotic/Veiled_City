# R6 private-channel service extraction — slice complete

Owner scope validation, two fresh Discord audience reads, binding conflict checks and the revision-checked channel commit now live in `native-private-channel-registration.js`. The Discord adapter retains observed-event authorization, durable interaction claims and private replies. No AI capability or fictional effect was added.

Changed files: the new native service, `discord-player-channel.js`, the focused private-channel test, this report, its SHA-256 manifest, session review, ledger and resume handoff.

Validation (Node v26.13.0, 2026-11-10): private-channel tests 4/4 passed (564.8999 ms); native-root composition tests 4/4 passed (949.154 ms). Checks cover owner registration and replay, changing audiences, conflicting bindings, unauthorized events, ownership revocation during audience reads and root composition. The first new race-test run failed because its fixture submitted a stored actor with forbidden metadata; corrected the fixture to use the closed actor input shape, then all four passed. No live Discord operation or inference was performed. These checks do not qualify live privacy or GM quality.

Migration: implementation-only extraction, unchanged store format, command and source references. Rollback: revert this slice; no database rollback required. Production and the pinned legacy runtime remain unchanged. Source/test hashes are in R6_PRIVATE_CHANNEL_HASHES.json.

Known holds: R6 is incomplete; draft publication still lives in a Discord handler, the full command surface is not ported and live audience latency remains unresolved. R0–R8 gates remain open. Next exact slice: extract draft publication into a native service and test current audience/scene authorization across asynchronous delivery preparation; then continue R4 validated ordinary-prose publication.
