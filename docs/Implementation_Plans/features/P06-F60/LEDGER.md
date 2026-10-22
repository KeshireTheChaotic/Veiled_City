# P06-F60 — ledger

Status: SUPPORTED; TARGETED DELTA PASS.

- Branch/start SHA: `codex/clean-ai-gm-2026-10` / `8dcb4b1fdeb6e4cd711b0554e08ccb957550412c`; implementation SHA `20a6a13e83cc3b6a17187aaf195c5b16a71c421c`.
- Occurrence: [`adversary:pale-court-knight:predatory-grace`](../P06-F01/occurrences/adversary--pale-court-knight--predatory-grace/SCOPE.md).
- Changed paths: descriptor/catalog, new Predatory Grace projector, adversary context, F60 fresh test, F01 expectation repair and coverage map.
- Tests: initial `p06-f60-20261022-a` was 215/217; two F60 assertions exposed stale `roll_protocol: none`. After correcting the descriptor, `p06-f60-20261022-repair` passed 217/217 across 57 fresh files; 0 failed/cancelled/skipped; exit 0; duration 4963.8058 ms. Syntax 5/5; JSON parse 2/2.
- Input SHA-256: definitions `129dbc36a981498f5ad40659316186ee0e7eb2638cea29af744dc834f0ae2608`; catalog `1c80a2a16a65ec815d00ed132e8d0eb6e699c7c5dc27eafc0f37923ab53b4e5f`; context `b027f40007d00b25846675c4dffbdbd64594184f93454295a899d29c38ab8699`; projector `78b0dbaa603e99f3143468259226159e8d571610f5ac90181c4be3767f5e0926`; source `846386ded200f84e487f69c1b82adf4387dcb41526cb60e8ee777e48727fca9c`; test `22ab28a2f5006ca75293e4cac17cd67ae97267b8381a43147c0cba0918842fa3`; map `1937ea1fc2e020d22af809d1c5e99669bd4e58f4be4f91e345f49da42966a191`.
- Catalog: 72 supported / 81 review-only / 0 needs-authoring; 71 registered handler keys / 60 P06 families.
- Cost/cache: provider calls/tokens/spend 0/0/$0; no cache claim; Codex usage unavailable.
- Questions/restrictions: none; no narrative/agency restriction proposed.
- Local hold: forced-movement event matching and once-per-scene prevention/replay are not implemented by the cue.
- Critical blockers: none established. Release authorization: false.
- Full evidence: [P06_F60_TARGETED.json](../../evidence/P06_F60_TARGETED.json).
