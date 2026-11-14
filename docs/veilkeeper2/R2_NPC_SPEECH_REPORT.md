# R2 — autonomous NPC utterance provenance

Complete as a scoped slice,2026-11-14. **R2 remains incomplete.** Parent483bc73e. No Human-GM narrative approval, specialized AI speech tool, production change or new model call.

## Delivered

The existing generic knowledge_propose accepts an optional testimony proposal with a verified independent NPC subject_ref and exact quote. Native validation binds the AI's pending authorship to current source, actor/control snapshot and audience inside the SQLite transaction. PCs/proxies cannot become independent speakers. This proposal is not a spoken event, truth, consent or an effect. All four generic capability names/schema remain unchanged.

Only a complete, native-authorized published narrative with matching explicit direct attribution and quoted words can establish an utterance. Matching includes the pending authorship, canonical speaker identity, original audience, saved draft/review/text hashes and every delivered part/message receipt. Private records retain original PC-view scope. Named PC/proxy collisions and duplicate speaker names cannot infer an identity. No Human-GM annotation or approval is offered.

An utterance persists as attributed testimony with speaker identity and delivery provenance, never a world fact or proof of sincere belief. Only the speaker remembers saying it. Other NPCs learn nothing from co-presence, channel membership or the current player message. Audience recall includes explicit npc_statement/speaker_ref authorship; NPC private planning can recall its own attributed speech. Human-statement origins remain excluded from private NPC cognition.

Historical speech is validated against its immutable delivered event, not today's source-message text or current speaker name. Source edits and speaker renames do not erase what was actually said. Restart preserves the record. Current audience/actor entitlement and full ancestry remain required before bodies are read; private cross-PC views and altered provenance are denied. Source refresh skips the old player message only after verifying the historical native utterance receipt. Ordinary narrative with no persistent authorship proposal still publishes normally and creates no speech event.

## Modified files

R2_NPC_SPEECH_HASHES.json lists every owned file and exact checkout-byte SHA256. Added npc-speech-lineage.js and r2-npc-speech-lineage.test.mjs. Updated native-root, knowledge-authority's optional native testimony author, context-authority authorship, private NPC origin validation, statement-origin-refresh and conversational instructions. Current phase/checklist/handoff are refreshed. No SQL schema change, production store, legacy runtime or old test deletion.

## Verification — complete for this slice

**324 distinct checks across48 files passed:** nine focused checks (eight in11964.3627ms; one additional OOC case in1305.3759ms) and315 affected checks in47 files39991.4923ms. Dependency selection/log and acceptance receipt accompany this report. Synthetic provider/Discord SDK with actual native code and SQLite; zero live Discord writes or inference calls. Tests exercise the real knowledge_propose tool loop, pending vs delivered speech, once-only replay, cold history, source edits, source/metadata tampering, private scope, actor rename, NPC/proxy/PC identity, audience recall and actor-private planning. No claim of live narrative quality or full R2 acceptance.

An initial test incorrectly mutated the first message to simulate a new message and failed source-lineage validation; the fixture now preserves both actual message objects. Earlier implicit quote-capture implementation passed301 affected checks but was rejected in review: an OOC example could look like delivered in-fiction speech. Its tests are superseded; the final implementation requires explicit native authorship plus actual matching delivery. No claim that formatted prose alone proves a fictional utterance.

## Migration, rollback and holds

Existing native schemas stay unchanged. Pending intents/native speech events use immutable proposal rows and versioned knowledge history; no old messages are retroactively assigned speakers or listeners. Historical evidence and statuses are preserved. New isolated tests reopen real stores and prove safe source edits/replay; no populated legacy conversion was performed. For rollback, use the existing sealed offline snapshot and exclusive guild lease workflow; never erase events, downgrade live stores, rerun uncertain sends or rewrite spoken testimony. Older origin validators will not recognize new speech records; restore a separately sealed compatible snapshot before running older code.

This slice captures only unambiguous whole-paragraph direct quotations using a canonical name plus says/asks/replies/whispers/shouts and straight/curly double quotes. Other dialogue forms remain unrestricted narrative but do not gain persistent utterance evidence. The AI must already have a verified speaker reference; complete audience-safe NPC identity discovery remains open. No listener perception/hearing issuer, human in-character speech boundary, historical belief learning, world correction, protected canon lifecycle, independent world identity, long-history weighting or full R2 privacy acceptance is claimed.

Publication and memory journals are not cross-database atomic: a crash after publication but before capture can leave missing speech memory. Native replay capture is idempotent under the same actor frame, but complete recovery across changed control/scene frames remains an R7 hold. Uncertain/partial sends remain unpromoted; do not retry them. Full R3/R4/R5/R6/R7/R8 gates remain open, including authoritative mechanics, grounding and latency.

Next exact phase: continue R2 native listener/perception and historical actor learning; establish current audience-safe NPC identity/knowledge issuers without treating scene co-presence as hearing. Independently complete bounded recall curation for references beyond256/64, fictional time and pin issuers. Keep narrative autonomous, only four generic capabilities, and production unchanged.
