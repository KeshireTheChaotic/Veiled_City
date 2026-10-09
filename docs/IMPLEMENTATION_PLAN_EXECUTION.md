# AI GM Reliability Implementation

Baseline: `a763373`, version 9.5.0, 2026-10-09. Source plan: `Implementation_plan.md` supplied by the operator. This record distinguishes deterministic fixture coverage from live-model certification. No live provider or production-guild evaluation is implied.

## Phase A — 9.6.0

The message lifecycle now creates one durable `turn_attempts` row per guild, Discord message, authenticated principal, and session. It records source-span receipts, model attempts, stages, commit status, terminal codes, and recovery references. Duplicate Discord delivery reconciles the existing turn instead of rerunning native mechanics.

Mixed messages are split only on strong authored boundaries. Existing conservative roll, consent, and scoped-recall handlers process exact clauses; unhandled clauses continue to the AI GM once. This layer does not infer consent or authorize outcomes. A read-only response obligation covers authenticated actions, dialogue, needs, reflective scene cues, and continuing exchanges while preserving intentional OOC/table silence.

Top-level party/private processing now has a truthful recovery envelope. Notices distinguish uncommitted, committed, and uncertain turns; a confirmed or uncertain commit is never described as safe to repeat. Pre-turn Director processing records uncertainty before execution and records its independent commit when successful.

Deterministic acceptance is in `implementation-phase-a-test.mjs`, with existing roll, owner-consent, RELAX, and offline suites retained. Freeform semantic quality still requires an explicitly authorized live evaluation.

## Phase B — 9.7.0

`publication_outbox` is created in the same SQLite transaction as the authoritative GM mutation and turn commit. Narration is split into ordered, hashed, visibility-scoped parts with a unique turn/surface/ordinal identity. Party, private-scene, and allowed roster-private output use the same delivery worker; Discord failure never reruns GM reasoning or native mechanics.

Rows are marked `delivering` before network I/O. A restart converts interrupted rows to `uncertain`, because Discord provides no application idempotency key for proving whether an unrecorded send succeeded. Normal retries deliver only pending/failed parts; uncertain parts require an explicit GM force option that warns of possible duplication. Full GM exports and logical snapshots include turn/outbox recovery state; player exports do not expose it.

GM operators can inspect `/vc-gm delivery-status` and use `/vc-gm delivery-resend turn:<id> [force_uncertain:true]`. Both are permission-scoped; resend operates only on committed delivery records.
