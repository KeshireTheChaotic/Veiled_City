# P07-F23 — Ledger

**Status:** PARTIAL — persisted source replay and several current-scope rejection cases verified; required-response overflow and cross-session recovery remain untested. Baseline `507ff89dd7892c649b054c041b5b401edf97eaa4`; feature commit SHA in phase closeout.

| Evidence | Result |
|---|---|
| Persistence fixture | `VeiledDB` closed and reopened on the same disposable SQLite file. The original source event and hash were unchanged; current Director and writer readers rebuilt the same two source-bound signals after restart. |
| Revalidation | Retraction of a source after binding held it and removed it from rebuilt writer context. Removing owner B attendance held the old hint. Reusing party binding under a private audience returned null. Scene revision change produced zero old-scene beats and held stale hints. |
| Test | One blocking run: `node --test --test-reporter=tap tests/ai-gm-2026-10/p07-f23.test.mjs`; exit 0, 2 passed, 0 failed/skipped/cancelled/todo; Node duration 1171.6533 ms. Fixture/test syntax checks exit 0. Test SHA-256 `12F3F3FDFE65A409FE8E56DF4F7207BE80BA3CF074A6B07FEC4D67744833C2ED`; helper SHA-256 `974E651C313A7C15FFB72AA570D60F288B77B1F64DB426932A0679872A74DC5E`; coverage SHA-256 `6F5161DB3DEE0959DDCF8118148559F3A563365EF96285DB161C13DFD31BDE1A`. |
| Cost | Two mocked offline Director results across the two tests, no live model/provider/network/Discord/CI/production DB and no cache changes. |
| Holds | Required-response 5–8 signal overflow, cross-session recovery and private-owner request content are not established by this feature. F17 provides a separate existing offline speech-private boundary test. |
