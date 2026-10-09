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

## Phase C — 9.8.0

The contextual interpreter may now identify exact authored movement spans and referents, including a candidate identity for an ordinary place that is proposed in the same turn. Those records are explicitly non-authoritative. Arrival occurs only after native ownership, current source/session/scene, location revision, local geography, visibility, access, encounter, and destination-match checks succeed. Conditional, hypothetical, quoted, remote, inaccessible, and active-encounter movement remains uncommitted.

Each accepted movement emits an explainable native adjudication envelope with its input source, rule basis, proposed mutation, and verified arrival receipt. The reusable envelope rejects invented native resolution and refuses to classify uncertain consequential actions as roll-required without a native roll request. Observation remains a no-roll, no-cost decision.

Location and NPC creation now preflight a bounded alias and canon index. A single audience-visible identity is reused; ambiguity is rejected; protected identity or canon collisions are reported opaquely so generation can choose another mundane detail without leaking secrets. Autonomous entities carry an explicit `established` epistemic label and newly created NPCs retain empty secret knowledge.

## Phase D — 9.9.0

Validation now distinguishes optional structured-field defects from consequential invariant failures. Invalid interpretation can be quarantined, review decisions can be reconciled to actual native outputs, and world proposals can be dropped only when no committed material claim depends on them. The repaired complete turn is revalidated; unsafe narration still enters the bounded replacement path.

Authority context has compact identity/source/revision/hash indexes plus complete paged record retrieval. Prompt overflow reports `CONTEXT_OVERFLOW` with a retryable, uncommitted diagnostic instead of escalating an engineering limit into fictional human approval. Channel roles are exclusive at configuration and runtime, inactive-session notices are useful and rate-limited, and campaign status exposes routing health.

Logical snapshot retention is bounded to 50 per campaign and the deterministic release test performs a mutate/restore/foreign-key drill. The repository now carries an npm lockfile, Docker uses `npm ci` with a tracked Node version, and GitHub CI runs the same network-denied validation gate.
