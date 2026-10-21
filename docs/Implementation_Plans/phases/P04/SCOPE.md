# P04 — Multiplayer and private fiction

**Status:** TARGETED DELTA PASS; BROADER BEHAVIOR UNVERIFIED. **Base:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Governing owner specification
[OWNER_AI_GM_BEHAVIOR_SPEC.md](../../OWNER_AI_GM_BEHAVIOR_SPEC.md) is the full owner's desired behavior, not proof of already implemented code. ENGINE constitution is complementary.

## Goal
Protect audience perspectives, overlapping intentions, hidden hooks, assembly and proxies.

## Independent features
- [P04-F01 — Concurrent intents and spotlight](../../features/P04-F01/SCOPE.md)
- [P04-F02 — Audience and knowledge firewall](../../features/P04-F02/SCOPE.md)
- [P04-F03 — Hooks, assembly and proxies](../../features/P04-F03/SCOPE.md)

## Exit
All safe features have current diff, truthful ledger and newly authored tests covering only code changed in this phase. Local source gaps and owner decisions remain visible but do not stop other safe work. No automatic release qualification.

## Test-runner no-poll rule
Follow [TEST_EXECUTION_NO_POLL.md](../../TEST_EXECUTION_NO_POLL.md). Run a frozen batch once; never watch, poll or stream test progress. Collect the final exit code at a natural phase checkpoint.
