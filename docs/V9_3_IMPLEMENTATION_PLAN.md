# Veiled City — typed-intent v9.3.1 implementation plan: cross-actor authority + nonblocking PC observation

**GitHub audit:** `bf6b592d2ea1e44c9c666770b533e0800176c102` (`codex/typed-intent-refinement`, 2026-10-11). **Local uncommitted work was not accessible**; the Codex checkout must inspect and preserve all local changes before editing. This replaces the prior *resume plan*, not the completed v9 phases or the underlying approved narrative-PvP rules.

## Binding policy

PvP remains bilateral, consented, story-first and non-damaging. Narrative effects are source-verified and character-owned; GM review cannot ratify another PC. **Output authorization derives from affected characters/scene/audience and native receipts, not from the person whose turn triggered generation.** Equally, **ordinary questions and observations about other PCs must remain playable**: use verified visible descriptions or a truthful nonblocking unknown answer when the target has not been described. Do not invent permanent appearance, private information or voluntary reactions. The binding contracts are `V9_3_OUTPUT_AUTHORITY_CONTRACT.md` and `V9_3_1_OBSERVATION_CONTRACT.md`.

## Verified phase reconciliation

| Phase | Status | Notes |
|---|---|---|
| V9-00 | Complete `c4e08d78f` | Do not redo |
| V9-01 | Complete `697f088fe` | Native source/owner consent green |
| V9-PVP-A | Complete `2b8d807d1` | Bilateral signed stakes green |
| V9-02 | Complete `1149dc908` | Window lifecycle green |
| **V9-PVP-B** | **P0 BLOCKED** | Remote WIP `bf6b592d2`; local draft may differ; new cross-actor tests red |
| V9-03, V9-04, V9-05, V9-06, V9-07, V9-08 | **Not started** | Execute sequentially after PVP-B completes |
| D08 | **BLOCKED** | Release qualification still pending |

**Most recent recorded baseline:** `npm run check` PASS, offline `npm run validate` FAIL **105 suites pass / 1 fails** (`v9-pvp-authorship-test`: 20/22 tests pass). Both `PVP30q cross-actor` tests remain red: Billy's AI narration improperly enqueues an unapproved Choso apology. Original `PVP30` passes; preserve its implementation and assertion. These are documented Codex runs, not tests performed by this review.

## Current-stop patchset: V9-PVP-B only

Do **not** begin V9-03 until B.0–B.6 are green. Finish as one individually reviewable **V9-PVP-B completion commit**, never label the existing WIP checkpoint as completion.

### B.0 — Freeze local source and reproduce red gate

1. `git status --short`, `git log -8 --oneline`, `git diff --stat`, `git diff -- bot/src/pvp-authorship.js bot/src/gm.js bot/src/narrative-integrity.js bot/src/publication-outbox.js bot/scripts/v9-pvp-authorship-test.mjs` before touching the files. Do not reset or silently overwrite user changes. Baseline against GitHub `bf6b592d2ea1` only if actually present locally.
2. Read `docs/TYPED_INTENT_PROGRESS.md` lines 537 onward and v9.2 contract/progress. Preserve the separately owner-authorized `pvp_narrative_clause`, exact loser ratification, closed templates, `pvpProjection`, and native rounds/receipts.
3. Reproduce **both** `--test-name-pattern='cross-actor'` failures using the offline guard. Preserve exact PVP30 and PVP30q fixtures. Capture stderr/exit codes, fixtures, expected source IDs, and baseline validation count.

### B.1 — Eliminate triggering-actor authorization (P0)

- Replace `assertPvpOutput()`'s `scope.actorUserId` proposal inclusion rule with an **audience/scene/affected-character** resolver sourced from current native PvP terms, windows, persisted receipts and actual scope. Include Jaxon/Choso during unrelated Billy-triggered party GM output; do not allow empty `narrative_claims` to imply no protected text.
- Distinguish protected party, character-private, player-private, and GM-only surfaces. Require current owner proof for emitted own response and affected-owner exact ratification for other-PC clauses. A closed PvP window is not a waiver for any subsequent model-written claim about the same conflict.
- Negative raw `validateNarrativeClaims()` and `queueTurnPublications()` calls must fail before any side effect, including the exact two reported PVP30q assertions. Do NOT fix only one.
- Do **not** replace the actor filter with an unconditional `if any PvP then throw` at orchestration: this would block unrelated legitimate actions and is not qualifying behavior.
- **Observation carve-in, not agency bypass:** An authenticated `What does Jaxon look like?` / `Where did Jaxon go?` or similar inquiry is allowed despite active PvP and despite missing target-character appearance data. Resolve the queried PC and observer through native position, scene presence, prior compatible perception/memory, and source/field visibility. The question alone establishes no PC behavior or descriptive fact. Unknown data leads to a safe answer, not a rejected turn.

### B.2 — Introduce receipt-backed output preparation and safe salvage (P0)

- Add a single source-owned `prepareAuthorizedTurnOutput` (name flexible) that yields **trusted, renderer-created** parts and scoped review/quarantine records. Its inputs include session, real scene, audience, authoritative native refs, and untrusted model prose. No untrusted `approved=true` flag or copied paragraph is acceptable.
- For any protected PvP context, **raw model prose is untrusted**: do not use free-English semantics, PC-name regex, quotes, `narrative_claims:[]`, or arbitrary model field labels as authorization. Renderer may emit only exact signed PvP stake, verified winner's own clause, verified loser-authored/ratified response, approved bounded neutral scenery, and **independent native action receipts**.
- On mixed Billy turn, preserve the valid native `move`/observe/other authoritative sibling action; quarantine the unsupported generated paragraph without turning it into a campaign memory. Use an explicit receipt-generated safe acknowledgement such as a grounded movement summary. No fake arrival, success, or forced character response. The protected raw block may require private owner/GM scope review, but it must not be party-delivered.
- Separate narration quarantine from invalid state mutation: the former does not necessarily cancel independent mechanical actions; the latter must still fail/rollback as before. No whole-turn regeneration merely to override `NARRATIVE_PVP`.
- Keep the original native PvP result terminal, scores and Hope unchanged while prose is awaiting ratification.
- Introduce an explicit trusted `observation_answer` output-part type (name flexible) distinct from a material PC-agency assertion. Evidence-backed attributes/activity use exact observer-visible sources; missing/partial descriptions render fixed truthful `not_established` / `not_known_to_observer` / `not_visible` responses, never fabricated face, clothing, attitude, speech or memories. **Do not require another PC to describe themselves before the questioning PC can continue.**
- Permit an optional authenticated, owner-private, deduplicated appearance-description invitation with reply/decline/defer and explicit disclosure settings. A denied DM, owner silence or a private-only answer cannot block the question or turn; requests never authorize immediate sheet/public fact changes.

### B.3 — One guard, every surface (P0/P1)

- Integrate prepared output at `GMService.runTurn()` completion, `commitGmTurn`/`applyAuthoritativeMutation`, `validateNarrativeClaims`, `queueTurnPublications`, and direct publication/replay paths, **without trusting stale prepared flags**. Recheck claims/signed-stake, visibility and source ancestry at publication time.
- Explicitly cover `index.js` World Director `public_narration` and each recipient `private_messages`, the private scene director, other direct model-generated `postPlayMessage` invocations, and **voice** narration. Text-to-speech may only read the same saved approved party-visible output actually delivered, not `result.narration`.
- `player_summary`, private messages, journal/handout/model-generated summaries, NPC cognition/memory and future retrieval must not turn the quarantined raw sentence into a durable public or actor-known fact. If existing components need a projection API, they should receive only trusted part references rather than raw text.
- Preserve ordinary generated prose where no protected scope applies; if a requested output surface is protected but the model passage cannot be independently verified, replace only its unsafe narrative publication with a truthful native receipt projection, not an invented harmless paraphrase.
- Cover the **read-side** inquiry service and information retrieval in both ordinary GM and World Director pathways. It may answer supported observations and safe unknowns without being mistaken for an unapproved PC reaction; a visible character appearance is not a blanket license to read their hidden sheet/GM hooks. Tests must distinguish observed public details, previously witnessed facts, concealed/private fields and absent targets.

### B.4 — Transaction, provenance, replay and deterministic denial

- Use a versioned, keyed `pvp_output_part`/`pvp_output_quarantine` or equivalent storing source, audience, recipient, render version, native proof refs, content hash, and exact turn reference. Raw text stays character-/GM-private as appropriate; no public indexing.
- Enqueue only independently revalidated native parts inside the same safe transaction as ordinary turn commit. Direct callers with raw outputs continue to throw/return failure; high-level callers intentionally prepare safe parts before queueing. No publication row may exist from the failing raw PVP30q direct test.
- After crash or restart, re-read the actual owner, source, terms, receipt and per-recipient audience permissions. If changed, place the part in `needs_review/uncertain` rather than rendering old raw prose or leaking a now-private source. Reuse existing delivery outbox; leave full transport crash semantics to V9-05, but do not introduce a new duplicate-send route.
- GM review remains nonauthorizing; another player must separately authenticate any clause about their own PC. Negative attempts log bounded, private diagnostics without leaking spoiler text in a public exception.
- Preserve provenance for owner-supplied appearance and voluntary public description: current owner/source, exact selected visible fields, revision and opted disclosure. A private appearance entry or unaccepted draft must not enter party context. For missing details, store at most a scoped optional description-request receipt, **not an invented appearance fact**.

### B.5 — Expand security and playability tests (P0)

Keep `v9-pvp-rounds-test.mjs` and `v9-pvp-authorship-test.mjs` mandatory, no skips/waivers. Add PVP30u–PVP30am (see added matrix) with **actual paths**, not mere source greps:

- Billy-party-turn model narration `Choso apologizes for losing.`, with `narrative_claims: []`: direct claim validation rejects; direct outbox enqueue rejects and leaves zero rows.
- High-level mixed Billy independent movement and unverified apology: real movement receipt and safe notice survive; apology quarantined; no Choso change, no spurious game re-roll, no world memory of apology.
- Exact separately ratified Choso reaction plus Jaxon's permitted stake: correct authorized projection, recipient/audience gating, one receipt on restart/retry.
- World Director party/private, private scene, TTS, summary/journal/handout candidate, forged `verified` metadata, removed/retracted source, closing/expired PvP scope, same owner switching PCs, spectator and other-scene participants; no false positives outside protected relevant audiences.
- Independent other PCs remain playable. Discarding all of Billy's actions to reject model prose is **a regression**, not an acceptable security pass.
- Add **OBS01–OBS22** from the expanded v9.3.1 matrix: known/partial/unknown physical description, optional nonblocking owner invitation, absent target and compatible prior memory, current outfit/status/position, private identity/GM-only facts, unauthorized mental-state disclosure, ordinary external scenery, later owner-authored descriptions with field-level visibility, and attempts to launder unauthorized Choso apology through a question. Exercise both direct GM question and **actual** turn/Discord/outbox pathways; distinguish a graceful uncertainty answer from an exception.
- At least one end-to-end regression must accept `Choso: What does Jaxon look like?` when **no description record exists**; verify an authorized neutral answer, zero new canon appearance claims, no forced Jaxon response, no roll, and no blocked unrelated action. Test another case where trusted visible appearance facts exist, plus a direct question about a private unseen activity that safely withholds details.

### B.6 — Final same-tree gates and completion commit

Run in this order after focused repairs. Also execute the new `v9-observation-compatibility-test.mjs` (or equivalently named registered behavioral suite) focused and in default validation; **do not** fake a green check by creating only matrix availability fixtures:

```bash
cd bot
node --import ./scripts/offline-guard.mjs --test --test-name-pattern='cross-actor' scripts/v9-pvp-authorship-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-pvp-authorship-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-observation-compatibility-test.mjs
node --import ./scripts/offline-guard.mjs --test --test-name-pattern='PVP30' scripts/v9-pvp-rounds-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-pvp-rounds-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-pvp-agreement-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-window-lifecycle-test.mjs
node --import ./scripts/offline-guard.mjs scripts/d08-window-security-test.mjs
npm run check
node scripts/sync-release.mjs 10.0.0
npm run validate
cd ..
git diff --check
```

Re-run check/validate after any manifest/documentation change that affects the recorded tree. Record actual command exit codes, suite/test counts, source SHA, key traces, privacy/replay proof, any knowingly unsupported expressive PvP prose, and rollback guidance in `docs/TYPED_INTENT_PROGRESS.md`. Then and only then create `feat(v9-pvp): close cross-actor narrative output authority` as the **separate V9-PVP-B phase-completion commit**. A commit solely publishing an owner-requested WIP checkpoint does not count. Continue to V9-03 only if all P0 gates pass.

## Subsequent phase responsibilities — carry forward v9.2, not yet started



The following phases carry forward the existing v9.1 scope; do not start them until V9-PVP-B is green. They must each have independent tests, full validation and a separate commit. Additionally, every public/private PvP projection they touch must recheck v9.2 claim authorization.

**Cross-phase observation invariant:** Later continuation, publication, UI, and release work must not regress the v9.3.1 observation path. A question is not an unauthorized response merely because it names a PC; an evidence gap generates a truthful nonblocking answer, not a fabricated source or suppressed turn. A question must never bypass the source requirement for an actual asserted PC reaction.

### V9-03 — Durable continuation for compound actions

**Focus:** G04 (P1), closes residual D06 gap. **Commit:** `fix(v9-continuation): resume ready descendants after native outcomes`.

**Work:** Build one durable continuation trigger for terminal roll, window **and narrative PvP resolution/neutral-closure** receipts. A locked PvP window may satisfy a downstream precondition only through its saved `pvp_resolution_receipt` for the exact previously agreed outcome; decline/withdrawal cannot silently count as victory. For every newly ready dependency, revalidate current source, principal, scene, position, access, audience and target. Route safe native actions through the existing authoritative interpreter/execution path without replaying prior transactions. When native execution is not deterministic or a scene/actor prerequisite changed, save an explicit pending or clarification step and schedule bounded GM narration/adjudication; **do not** silently mark the action done. Publish a concise truthful continuation receipt to the proper audience using existing turn outbox. Enforce exact idempotency for each causal node and protect independent nodes from failed siblings.

**Red-first cases:** unlock succeeds then enter; unlock fails then entry blocked; simultaneous independent observation still completes; after-roll target moved; saved receipt replay; failure after checkpoint before publication; reboot before continuation; original player source unchanged; no double movement/damage/roll/expense.

**Acceptance:** integration fixture shows a native dependent action genuinely completed or explicitly held for a valid reason, rather than stopping at `status=ready`.

### V9-04 — Roll outcome truth, source binding and missing Difficulty

**Focus:** G05, G12 (P1). **Commit:** `fix(v9-rolls): require grounded difficulty and exact request correlation`.

**Work:** Remove the `difficulty==null => success` inference **from ordinary typed action completion**. PvP is deliberately exempt from fixed Difficulty only because it has a different, separately receipt-backed *opposed-total comparator* under V9-PVP-B; do not treat its absent Difficulty as ordinary success. For rule-defined opposed action, require a saved, relevant Difficulty and native result; when Difficulty is unavailable, keep a real review/pending disposition or use an explicitly authorized *non-success-classified* roll where SRD permits that path. Ensure the roll request selected from a new owner action is explicitly linked to its current authenticated declaration/accepted action or a user-specified existing request; do not choose an unrelated sole pending request based only on count. Preserve natural Hope/Fear faces and matching-dice critical rules, reaction semantics, attack damage completion and exactly-once Hope/Fear resource changes.

**Red-first cases:** resolved roll with null Difficulty must not become success; false/zero difficulty distinctions; actual success, failure and natural critical; two pending requests; one unrelated pending request; an explicit current user selection; private owner switch; attack awaiting damage; replay and no extraneous resource/dice changes.

**Acceptance:** every terminal `action_outcome_receipt` either cites a native verifiable success basis or a distinct neutral/needs-review disposition; no guessed success, no unrelated request consumed.

### V9-05 — Truthful delivery APIs and publication outboxes

**Focus:** G03, G06, G14 (P1). **Commit:** `fix(v9-publishing): unify roll disclosures and crash-safe delivery receipts`.

**Work:** Normalize the `postPlayMessage` success contract and every caller; verify that a Discord `Message` result is not mistakenly consumed as `{ok:true}`. Unify roll amendments, roll-party disclosures, **bilateral PvP stakes/roll/narration notices** and private notices with existing durable turn/publication infrastructure. Mark `delivering` before I/O, capture actual message/channel IDs, treat uncertain interruption as **uncertain** rather than blindly retryable, provide GM reconcile/status/resync. Use chunk-identified receipts for >2,000-character messages and avoid duplicate callbacks. Maintain an explicit policy for partial multi-chunk delivery and private fallback; no double posting after acknowledged success. Keep native mechanics independent from delivery success.

**Red-first cases:** Discord post succeeds but return contract misread; send throws before network; send succeeds then process dies before receipt save; DM partly succeeds; retry through same and new interaction IDs; two requests from one source; owner-share replays; recipient privacy and channel missing; no mechanics rerun on delivery retry.

**Additional observation carry-forward:** If a character-description request is enabled, its owner-private notification and eventual owner reply must use safe idempotent delivery and recipient-scope checks; a DM failure never blocks the original in-character question.

**Acceptance:** successful shared roll has a truthful delivery receipt; no false failure after send; crash-window states cannot blindly duplicate; recoverability does not reroll/respend.

### V9-06 — Private roll UI parity, complete choices and minimal sharing

**Focus:** G07, G09, G15 (P1/P2). **Commit:** `fix(v9-roll-ux): publish component outcomes and minimize shared content`.

**Work:** Make Discord button/select handling call the same native post-operation publication pipeline as slash-based `contribute` after transaction commit, without needing a second player action. Preserve owner-private mechanics and recipient-bound Help/Tag Team updates. For option lists that exceed safe Discord space, paginate and provide an accessible text fallback; do not truncate essential costs or blocked reasons. For PvP add private, bounded **terms review, countersign, withdraw, mode, trait selection, round progress, narrative submission and per-author disclosure approval** components or accessible native commands; use exact current scope, no button-driven unilateral outcome approval. For explicit party disclosure of non-PvP rolls, project only the source-confirmed accepted roll-intent span, or ask the owner to approve the exact redacted share preview. Never dump the whole composite/private authored message. Verify current source visibility and consent scope at share time.

**Red-first cases:** menu roll and slash contribute have equivalent saved/published effects; request owner, helper and partner see only authorized information; repeated component event; stale menu; long descriptions; two independent actions in one player post, where only one is shared; private-scene roll shared without unrelated secret lines; deliberate cost/trait choices pre-roll; after restart UI recovers current request and choices.

**Additional observation carry-forward:** Offer an accessible private description-request response and explicit visible/private scope selection where a description is missing. The owner can decline/defer; there is no auto-approval or compulsory questionnaire, and private sheet material never appears in party options.

**Acceptance:** all approved mechanical choices are possible through supported native flows, no hidden resource spending or misleading apply statuses, and sharing exposes nothing beyond its exact owner-reviewed scope.

### V9-07 — Discord boundary and inactive-session hardening

**Focus:** G10, G11 and related unbounded sinks (P2). **Commit:** `fix(v9-discord): bound native-route deliveries and inactive session queries`.

**Work:** Reuse `splitDiscordText`, safe private delivery and structured status for native discovery replies; handle missing private DM permissions and half-complete multi-part sends. Handle `/vc-roll pending` and related read-only commands when session does not exist without exceptions; return an explicit `No active session` or an intentionally scoped historical result. Audit PvP dual-private prompts and winner/loser-authored narrative outputs, and other current `interaction.reply`/`message.reply`/`send` calls for 2,000-unit content and attachment/callback delivery mismatches, limiting scope to validated findings.

**Red-first cases:** discovery response >2,000 UTF-16 units; emoji/surrogates, Markdown fences, mention boundaries; DM disabled; no active session roll pending; old historical request; user changes active controlled character; no gameplay effects during read-only query.

**Acceptance:** no relevant unbounded Discord sink and no null-session exception in the tested command paths; no private-to-party fallback.

### V9-08 — Release gates, complete replay and operational acceptance

**Focus:** finish actual D08, new V9 suites. **Commit:** `test(v9-release): qualify complete typed-intent multiplayer lifecycle`.

**Work:** Register all new suites—including `d08-window-security-test`, `d08-observability-test`, PvP agreement security, both opposed modes, boundary-circumvention, rounds, metacurrency and narrative-authority tests—in `validate-offline.mjs`, update release manifest/hash using prescribed script and reconcile progress and contracts. Run offline `npm run check`, `npm run validate`, focused red-first and adversarial cases, test the full four-player Session 2 fixture through the **actual orchestration/Discord adapter path**, with nested actions, consent, private modifiers and recovery, plus a consented Jaxon-versus-Choso harmless shin-tap duel and a **declined** variant that produces no forced effects. Test both single-roll and first-to-three-strikes modes. Capture actual baseline/final counts and exit codes; never claim live-model guarantees. Confirm command registration schema and no unexpected paid request. Provide GM-only optional live staging instructions, backup/rollback and a separate go/no-go decision; **do not deploy or start live production bot automatically**.

**Additional v9.3.1 release replay:** In the same four-PC Discord-adapter fixture, have Choso inquire about Jaxon's appearance before any description exists, then after an owner-supplied visible description, and have Billy ask about a private/unobserved activity. Confirm useful nonblocking responses, no invented permanent PC details, no data leak, no PvP consent/agency bypass, and stable results after restart. All OBS01–OBS22 cases must be accounted for by named behavioral tests, not just matrix rows.

**Acceptance:** all formerly red fixtures now green, consent/custody and privacy gates pass, no skipped suites, all pending actions have an actionable lifecycle, both PvP modes have stable terminal receipts with mutually agreed stakes and no unauthorized damage, observation requests remain usable without existing appearance data, and status ledger is accurate. Remain BLOCKED if any auth, privacy, native authority or exactly-once test fails.


## v9.2 additional release requirements

- `V9-03`: continuation depends on native terminal PvP receipt, never on narrated apology/subjective response. If the loser withholds a reaction, continuation can proceed only when established stakes and exact dependencies permit it.
- `V9-05`: move **claim-verified projections** through crash-safe publication outbox; do not expose quarantined drafts during a retry or use publication receipts as agency consent.
- `V9-06`: private component UX must show explicit ownership of each proposed clause and what the user is authorizing. Winning stake, reaction authorization and disclosure are three distinct affordances.
- `V9-08`: include four-player Session 2 replay with consented and declined PvP, PVP30 adversarial narration through actual `/vc-roll pvp` adapters, positive independently authored loser reaction, and deliberately withheld reaction. All mandatory suites must pass, D08 may only be marked complete after qualification.

## Commit / safety protocol

1. Fetch latest and compare actual local HEAD/dirty tree. Keep WIP checkpoint, do not hard-reset, overwrite, stash destructively or cherry-pick completed phases again. Inspect diffs first.
2. For each *remaining* phase: red-first relevant scenario; minimal production fix; focused checks; `npm run check`; `npm run validate`; `git diff --check`; prescribed `node scripts/sync-release.mjs 10.0.0` where needed; repeat exact-tree validation; document result and create ONE phase commit. Stop if authority/privacy gate remains red.
3. Use temp SQLite and network-denied fixtures. Do **not** access production DB, SQLite WAL/SHM, `.env`, paid APIs, Discord registration, deploy/start bot, merge or force-push under this plan. Production Git pull/push is a separate explicit operation, not implied by source review.
4. Preserve old consents and pending windows as inert historical records unless upgraded through actual new bilateral approval. Do not transform obsolete PvP attack rolls into narrative victories. Do not edit past receipts to enlarge terms or force a reaction.


## v9.3 override for later phases

- **V9-03:** dependencies consume terminal native story-stake receipts, never an unverified apology. Keep independent actions active even when a model paragraph is quarantined.
- **V9-05:** only deliver saved, claim-verified output parts; do not treat `approved` flags as security. Review uncertain sends before retry. Ensure voice and director use exactly the same authorized publication source.
- **V9-06:** keep winner success, loser reaction/ratification, review of ambiguous private drafts and bilateral *disclosure* as different buttons/commands; no raw message shortcut.
- **V9-08:** include both previously failing cross-actor assertions, high-level mixed-turn salvage, full director/voice/restart fixture, 4-player Session 2 replay and both PvP modes. D08 remains BLOCKED if any output sink lacks native proof.

## v9.3.1 addendum: observation/description compatibility (binding before any v9.3 work)

This amendment adds **no new phase** and declares no prior blocker resolved. The new read-side path is part of **B.1–B.5**, not work to postpone until after V9-PVP-B. All previously approved PvP protections apply to asserted voluntary reactions; they must not be extended to ordinary information requests or known visible/remembered facts. Missing appearance is a normal answerability gap. Implement source-backed answer rendering, an optional idempotent owner invitation, and explicit nonblocking response states per `V9_3_1_OBSERVATION_CONTRACT.md`. Register **OBS01–OBS22** with mandatory behavioral fixtures. Keep both PVP30q cross-actor failures unchanged until fixed, and do not claim `npm run validate` passed until Codex actually runs it on the resulting source.
