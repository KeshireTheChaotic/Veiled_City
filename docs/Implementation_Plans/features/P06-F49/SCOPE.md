# P06-F49 — Enforce the owner's exact HR14 v1 authorization

Status: IMPLEMENTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `81569d08699343e401fc11ba1eaed0f10b4fd37a`; implementation commit `282b1de560005fd0ba9ed74846624b080c6d9da6`.

Owner decision received 2026-10-21: authorize `owner:everything-logs-hope:v1` exactly as HR14 v1 specifies—one optional Hope, the affected current PC owner only, silence never pays, suppression only for that trace. No broader authorization is implied.

The repository already contains the supported HR14 route and owner choice flow. Harden the native trace adapter's rule gate to require every authorized interpretation field, and extend the fresh F37 tests to check the exact contract and per-trace suppression target. Preserve PC agency, optional payment, source-backed suppression, audience privacy, and exactly-once receipts.

Only fresh feature-specific tests under `bot/tests/ai-gm-2026-10/`, a single mapped batch, and changed-file syntax checks. No legacy tests, broad runner, live services, provider spend or polling.

## Qualification

Frozen `p06-f49-20261021-a` passed 5/5 tests in the one mapped fresh file. Changed JS syntax passed 2/2 and changed JSON parse passed 2/2. See [targeted evidence](../../evidence/P06_F49_TARGETED.json).
