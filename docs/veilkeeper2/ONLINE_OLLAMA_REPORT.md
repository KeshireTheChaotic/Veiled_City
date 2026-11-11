# R1/R4/R6 initial online Ollama qualification — historical snapshot

Later source, review/repair, native engine and retrieval changes are recorded in RESUME_HANDOFF.md and the R3/R4/R7 slice reports. Statements below describe the initial run, not the current implementation. Overall live quality remains unqualified.

User authorized online testing on 2026-11-10 and resumed the overall goal. Native test bot is online only in guild 1467249344947159291 with local qwen3.5:4b, a ten-call native budget and withheld drafts. Twenty-four native root commands were registered there. No production cutover or phase gate is claimed.

## Actual online outcomes

- Discord login/ready and guild-scoped native command registration succeeded. Native stores are new; the legacy source was opened read-only and copied using SQLite backup, not a raw file copy. The copy is read-only to the native application. No existing scratch stores were deleted or restarted.
- Seven synthetic full-rehearsal conversations used the real local model, scoped context authority, gateway, four-capability kernel and no-send queue. Each took one model call and no tool call. End-to-end latency: 1,461–3,267 ms. No private canary body was read, no canary entered model input and no draft was sent.
- Gameplay quality failed: C01 invented PC posture; C02 invented movement and inner state; C03 assigned PC suspicion and location; C04 invented prior entry and implied unsupported observation; C05 assigned PC speech, grip and movement; C06 resisted the private-record request but still assigned PC actions. C07 did not grant gold or finalize payment, but recast a requested grant as an established bid and left transactional truth to the player. These are observations, not passing acceptance cases.
- A separate real two-call tool probe returned state_inspect(receipt_ref=online-check), received a synthetic blocked/unavailable native result and concluded “The online-check receipt is not available.” No native effect was committed. This qualifies the tested transport path, not mechanical parity.
- Three compact-GM prompt experiments still assigned PC behavior and produced meta/escaped alternatives. Three bounded-NPC viewpoint experiments reduced some player authorship but contradicted scene grounding and ignored requested presentation. Neither experiment was applied to the running backend. A small model's poor performance in these conditions is not proof the local-provider approach is impossible; further packet/prompt/model comparison remains warranted.
- Total synthetic local calls in this online session: 15 (7 baseline + 2 tool + 3 compact + 3 NPC viewpoint). No external model spend. The separate ten-call Discord budget was unused at the last receipt inspection. No human command receipts had arrived at that checkpoint.

## Human testing handoff

Bot execution session: 62251. Preserved test directory: `.reports/online-6b8c5ce9-2c6b-4725-9bd5-fb6eb2b5ef56`. It contains legacy-copy.sqlite, native stores and commands-before.json for guild command rollback. Do not delete or silently restart it. The launcher preserves stores when closed; native-start still refuses a nonempty store directory, so restarting this exact run requires a separately implemented safe resume path or a new preserved run.

Human commands are required because the GM/owner adapters require actual observed Discord users and roles. Requested next: `/vc-session start`, then `/vc-gm register-character character:c17c02e2-c569-40dc-a16f-b6a3c3c7c8ea` (Tyrell Williams, from the copied test-guild row). Then owner private-channel, attendance, reviewed bootstrap, natural utterance, private draft review and explicit publication as appropriate. Do not fabricate user events or consent to bypass these checks. The async user question remains pending.

## Files, evidence and limits

New scripts: online-qualification.mjs, online-model-checks.mjs and online-tool-check.mjs. Raw synthetic outputs and SHA-256 manifest are in qualification/. The manifest includes the uncommitted R4 review modules loaded by rehearsal; they are not certified or committed by this qualification work. The launcher's redundant pre-composition diagnostic listener was removed after startup; the current launcher hash is the cleaned reproducible source, not an independently captured launch-time hash. Runtime modules were not hot-reloaded. No unit suite was rerun unchanged; these were actual local model and Discord checks.

Known holds: real human command flow/private delivery/lease timing, canonical migration, full rules parity, agency and narrative quality, consequential prose validation/local repair, concurrency/durability, production deployment. This work does not qualify autonomous publication. Original R4 draft code also still needs atomic repair and asynchronous callback review before commit. Preserve unrelated README.md.

Rollback: close the qualification client gracefully without deleting its directory; restore guild commands from the saved command snapshot only if needed and explicitly scoped to the test guild. No production database or default legacy runtime was changed. Next exact work: inspect actual human command receipts and withheld Ollama drafts; continue R4 validation using the observed failure cases, not a wholesale regex claim or automatic publication.
