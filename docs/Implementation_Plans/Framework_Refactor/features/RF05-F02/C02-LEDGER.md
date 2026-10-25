# RF05-F02 C02 ledger — Restore deferred Responses-client validation

**Status:** CORRECTIVE SLICE QUALIFIED. **Base HEAD:** `70dacfc4`. **Scope:** [`C02-SCOPE.md`](C02-SCOPE.md)

**Defect found by reconciliation.** At HEAD, RF04-F04 C08/C09 failed 0/5 with `AI Responses client is required.` They were qualified at `4c27f0a6` before RF05-F02 (`8e778dba`) added a construction-time client check absent from the original `GMService.requestModel`. RF05-F02's evidence did not rerun those consumers. Production is unaffected (no injected client means `GMService` builds the real OpenAI client), but the extraction was not behavior-preserving for injected clients.

**Change.** Removed only that check from `createModelTransport`; configuration is still required. A missing `responses.create` again fails at dispatch inside the guarded call: one `PROVIDER_ERROR` metric and incident, no retry.

**Evidence.** A first batch passed 21/21 in 14 files but omitted the transport test, which imports through the AI-provider public API; its log is retained as `phases/RF05/rf05-f02-c02-initial-test.log`. The final batch, with that test added, passed **28/28 across 15 files**, exit 0: the new C02 test, RF05-F02 transport, RF04-F04 C08 and C09 (now passing), and the eleven RF05 GM-constructing tests. Syntax 2/2. RF04 ratchet passes (0 groups/errors); RF05 ratchet unchanged (955/955); no changed-path findings. No transitions changed. Hashes: [`C02-RUN.json`](C02-RUN.json).

Provider calls/spend, network and production data: zero. Rollback: revert only this commit. **RELEASE NOT AUTHORIZED.**