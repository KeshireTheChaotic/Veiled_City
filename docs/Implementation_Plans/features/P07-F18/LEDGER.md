# P07-F18 — Ledger

**Status:** COMPLETE — corrective evidence reconciled; P07 overall remains PARTIAL and NOT RELEASE QUALIFIED.

| Field | Result |
|---|---|
| Union run | Final post-repair blocking fresh batch from `bot/`: `node --test --test-reporter=tap tests/ai-gm-2026-10/p07-f13.test.mjs tests/ai-gm-2026-10/p07-f14.test.mjs tests/ai-gm-2026-10/p07-f16.test.mjs tests/ai-gm-2026-10/p07-f17.test.mjs`; exit 0; 6 passed, 0 failed/cancelled/skipped/todo; 1070.5177 ms reported by Node. The two earlier repair batches each exited 1 (2 passed/4 failed) on fixture/assertion setup; fixes and a test EOF-only cleanup were followed by this final result. No poll, broad suite or legacy tests. |
| Syntax / whitespace | The same blocking invocation ran `node --check` on the changed runner and every new `.mjs`; all passed. `git diff --check` passed. |
| New test inputs | F13 `8727585FE9ED4E96DB6C773376871EEE2D1A6CBF0B25B74F9067D353FB842951`; F14 `94F58568F9394A74B3D566DE511F1B4EB660F44933CC7FE3975827BE9EF2D1C1`; F16 `89EBE4DBDBD01D8346591079C4F256C12ECEAC2097979C426EE44CB7425A4A4F`; F17 `CBFCE2A04EC4A9D55A720102A9DCB9B675EF0872C57F3DBB10B4A6A8270FFCD2`; fixture `9DB47F99248FEC77020DF36B7F58A36D32C75C5E621C390F07E9D16E559217DE`. |
| Changed source | Runner `94CD4341D97F343C2E52B4BC5FE3A6078881ACC2E41B246640FB0015745452DE`; coverage `B9B66BFD694C032F9209B95CEF22DAE2286D28EC280F6B11920EC7F51104BB89`. |
| A4/A5/A6/coverage | A4: LOCAL HOLD (no optional non-speech producer); A5: free-capacity writer inclusion verified, committed-beat collision LOCAL HOLD; A6: actual SQLite/source/Director/writer-context trace verified, generated prose/publication unverified; duplicate coverage loading fixed and tested. |
| Cost / services | Zero live provider, Discord, network, CI or production DB calls. One stubbed Director response was counted. No cache or live latency/cost measurement. |
| Release / rollback | NOT LIVE VERIFIED / NOT RELEASE QUALIFIED / RELEASE NOT AUTHORIZED. Roll back by reverting the isolated P07 corrective implementation commit; no migration/state mutation outside disposable DB. |
