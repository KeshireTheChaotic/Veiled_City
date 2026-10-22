# P07-F19 — Ledger

**Status:** COMPLETE — source-to-Director-to-writer-context baseline. Intake baseline `c03fd5dbdaa8d0570e59f83d71060285cb7eec07`; implementation commit recorded at closeout; branch `codex/clean-ai-gm-2026-10`.

| Evidence | Result |
|---|---|
| Source path | Native typed speech/presence → `worldNarrativeBridgePacket` → `GMService.runWorldDirector` request → symbol-bound Director event → `worldDirectorBridgeBeats` current-source revalidation → `buildNarrativeContext` writer packet. |
| Meaning | Bridge selection and writer hints do not author, accept, commit, or publish. Writer acceptance requires `authorNarrativeRequests` and `establishNarrativeUnits`; publication requires transactional turn outbox and acknowledgement. |
| Fixture | Reuses the already-created disposable-SQLite feature helper; this test does not import any inherited suite or fixture. |
| Tests / cost | One blocking run: `node --test --test-reporter=tap tests/ai-gm-2026-10/p07-f19.test.mjs`; exit 0, 1 passed, 0 failed/skipped/cancelled/todo; Node duration 784.4722 ms. Changed bridge/test syntax checks exit 0. Test SHA-256 `F36B14E5ADADDD6CAB001BA49DDD19C819F6B51C472C7B55D22A2337633F510E`; coverage SHA-256 `C98A0A14EA1934AEA32C66E9762756D91AA02039E364AA84270883D69344492F`. One offline injected Director response, zero live/provider/network/Discord calls, no cache changes. |
| Hold | Capacity contention and accepted writer/outbox pipeline are not established by this baseline test. |

Rollback: revert only the F19 evidence commit; preserve all pre-existing P06/P08/P09 and untracked handoffs. No production state or schema changed.
