# End-to-end implementation record

Baseline: 5.8.0 (`e180793`). The nine-phase roadmap is
`SUGGESTIONS-End-To-End.md`. This document records implemented work; later phases
remain unimplemented until their release entry is added.

## Phase A — 5.9.0: governed intent boundary

- Closed version-1 schemas cover eleven feature families. Unknown authority,
  reviewer, consent, principal and patch fields are rejected locally.
- Existing structured turn, director, downtime and aftermath requests expose
  bounded intents. Legacy fixture/response bundles without intents mean `[]`.
- All authoritative mutation paths use the same dispatcher and native adapters.
  The goal adapter is available initially; other feature adapters are fail-closed
  until their domain phases. This is not eleven-feature autonomous completion.
- `/vc-story delegation` configures manual, suggest-only or expiring routine
  delegation with an explicit operation allowlist and operation/cost ceilings.
  Defaults remain manual. Flags do not imply delegation. No automatic activation.
- `/vc-story ai-inbox` is read-only and GM-private. `/vc-story ai-review` requires
  authenticated GM authorization plus the item's current fingerprint.
- Source prerequisites, target and policy revisions are checked again at commit.
  Native effects and application-owned idempotency receipts share a transaction.
  Failed operations retain blocked diagnostics privately without partial effects.
- First-pass narration is conservatively withheld for intent-bearing bundles;
  pending operations cannot masquerade as committed fiction. Receipts enter later
  GM planning context. No second paid rendering call is introduced.

Example (fictional expiry must be after the current campaign minute):

```json
{"mode":"routine_delegated","allow":["goal.propose"],"max_operations":1,"max_cost":0,"expires_minute":1440}
```

Revocation uses `mode: manual`, an empty allowlist and `expires_minute: null`.
It increments the policy revision; pending intents cannot use an old delegation.
No command registration or live-provider validation is automatic.

Validation: required offline suite includes `end-to-end-a-test.mjs`, synthetic
Responses output through actual authoritative commit, suggest-only/no effect,
forged authority, policy/target revisions, private scope and restart replay.

## Remaining audit gaps

B: scene reconciliation and witness checks. C: durable consequences and richer
motivations. D: groups and strategies. E: owner confirmation and natural-language
read-only discovery. F: projects and mediation. G: memory maintenance and fairness.
H: seeds and complete review UX. I: cross-feature orchestration and rollout.

Release policy: phase minors roll .9 to the next major .0. After Phase I, perform
the requested final major release and deploy the clean, verified checkout while
preserving production configuration, runtime data and local content.
