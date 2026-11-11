# R6 reviewed-draft publication — slice complete

`native-draft-publication.js` now owns exact reviewed-draft selection, audience validation, active scene/session checks and the durable publication lifecycle. The Discord handler supplies channel transport and human GM authorization. This is the qualification harness, not R4 autonomous ordinary-prose publication.

A supported race was closed: a GM could end the session while publication awaited Discord audience or channel lookup. Publication now snapshots stored channel/scene/session scope and rechecks native scope and GM authority after those awaits and inside the publication claim. It refuses changes before any send claim. No knowledge/canon mutation or new AI tool is added. An attempted send with an uncertain result remains held without retry.

Modified files: the new native service, `discord-gm-session.js`, `r6-gm-session-command.test.mjs`, this report, SHA-256 manifest, session review, ledger and resume handoff.

Validation (Node v26.13.0, 2026-11-10): changed GM-command suite 22/22 passed (602.32 ms), native-root composition 4/4 passed (933.3999 ms). Includes two asynchronous scene/session closure races, current audience refusal, exact fingerprint, unauthorized GM, one-time send and uncertain-send hold. The earlier 21-test run passed before the second test was added; the final 22-test run supersedes it. Fake Discord transport does not qualify live Discord quality. No live operation or inference performed.

Migration: no store schema change; same source, approval and publication receipt formats. Rollback: revert the slice; no database rollback required. Known holds: member-list latency, full R6 command parity, durable crash/reconciliation qualification and R4 autonomous publication remain open. No R0–R8 gate is claimed. Production is unchanged. Source/test hashes: R6_DRAFT_PUBLICATION_HASHES.json.

Next exact phase work: R4 publication validation and delivery integration, after reviewing current turn-runner output guarantees and audience-scoped inference inputs; do not simply publish every saved draft.
