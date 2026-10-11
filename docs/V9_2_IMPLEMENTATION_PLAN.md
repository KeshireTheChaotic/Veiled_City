# Veiled City — Typed Intent v9.2 implementation plan (resume after PvP-B safety stop)

**Reviewed GitHub HEAD:** [`55b006ece3ab`](https://github.com/KeshireTheChaotic/Veiled_City/commit/55b006ece3ab3cf4508c1531fee0e153cf0519eb); repository `https://github.com/KeshireTheChaotic/Veiled_City`, branch `codex/typed-intent-refinement`; prior completed V9-02 commit `1149dc908636d78177e3e38a3e850c2de0215500`. **Do not confuse WIP checkpoint publication with passing V9-PVP-B.** This is an implementation plan, not source modification.

## Policy ruling (binding)

**Separately source-verified per-player clauses; GM review is a nonauthorizing fallback for ambiguity.** Author identity, `subject_character` and bilateral disclosure approval do NOT certify raw narrative meaning. An owner-authored claim about another PC's voluntary reaction needs that other owner to originate/ratify the exact clause. An audited GM cannot grant the other character's consent; their role is to ask for revision, review within-stakes neutral scenery, or obtain the affected owner's approval. See `V9_2_PVP_AUTHORSHIP_CONTRACT.md`.

## Latest status and phase reconciliation

| Ordered phase | Status at remote HEAD | Next step |
|---|---|---|
| V9-00 | **Complete** `c4e08d78f347ffafc8c7e64cff825fdce868bc29` | Do not rerun implementation |
| V9-01 | **Complete** `697f088fe3c6c576472718c5ec34f903ccb1e2bd` | Retain mandatory stale-consent tests |
| V9-PVP-A | **Complete** `2b8d807d11cfe15e47b8eeed2d17ac912203091f` | Retain locked-stakes/consent tests |
| V9-02 | **Complete** `1149dc908636d78177e3e38a3e850c2de0215500` | Reuse window coordinator |
| **V9-PVP-B** | **BLOCKED**; WIP checkpoint `55b006ece3ab` | Fix PVP30; rerun all gates; **then** make phase completion commit |
| V9-03 | Not started | Compound action continuation |
| V9-04 | Not started | Ordinary roll truth and request binding |
| V9-05 | Not started | Crash-safe publication/outbox |
| V9-06 | Not started | Private menu parity / minimal sharing |
| V9-07 | Not started | Discord boundary / no-session paths |
| V9-08 | Not started | Full replay, qualification, D08 gate |
| D08 | **BLOCKED** | Keep blocked until V9-08 acceptance |

**Evidence:** repository progress says `npm run check` passes, while `npm run validate` reports **104 passing / 1 failing** registered suite, `v9-pvp-rounds-test.mjs` (15/16 cases pass: PVP30 fails). These were reported in source/history, not rerun for this audit. GitHub contains five commits newer than the v9.1 baseline, including the PvP-B WIP checkpoint; the user's local dirty tree is not accessible here. Preserve dirty files, `bot/package-lock.json` and production campaign state if applicable.

## V9-PVP-B — focused unblock (P0; ONE phase completion commit after all gates green)

**What is already there:** private separately owner-authorized sealed choice and roll, higher-total non-damaging duel, three-strikes, Hope policy, terminal native receipt, window settlement, private `progress`/`narrate`/`review`/`share` commands. Reuse without refactoring unrelated mechanics. Tests exist and the focused PvP suite reports 15/16 passing; do not rebuild them.

### B.1 — Capture the failing security contract, preserve red gate

- Preserve exact red test `PVP30` in `bot/scripts/v9-pvp-rounds-test.mjs`: Jaxon's authenticated success text `Choso apologizes for losing.` is rejected, even when a mutable subject field points at Jaxon. The corresponding attempt should create no canonical claim or public projection; optionally save an owner-private nonauthoritative draft with explicit reason.
- Add negative tests `PVP30a–PVP30t` from v9.2 regression matrix for attribution, third-person synonyms, mixed clauses, quotations, another player's dialogue/emotions, source changes, stake overreach, publication, GM review, identity/scene switches, replays and no unintended mechanical changes.
- Keep `v9-pvp-rounds-test` mandatory in `validate-offline.mjs` and visibly failing until fixed. Never weaken assertions, skip tests, sanitize the failing text, or claim that private author attribution means authority.

### B.2 — Establish the claim authority model **before** arbitrary prose acceptance

- Add closed versioned `pvp_narrative_clause` and source-bound `pvp_narrative_draft`. Persist signed `proposal/terms_hash/resolution_receipt`, role, claimant user/character/current principal, immutable source event, exact UTF-16 span and offsets, subject character, claim/effect kind and canonical stake constraint.
- Distinguish the winner's permitted success from loser reactions, personal speech, emotions, chosen movement or commitments. A saved duel outcome permits only the exact signed stake; no same-owner `subject_character` value, model guess, rich-text quote or GM reclassification creates opposing PC behavior.
- Bind a cross-character clause to **a separate authenticated source or specific explicit ratification by that affected player's active controller**, for the exact text hash, audience, resolution and agreement revision. Preview consent is not sufficient. Ratification does not change old locked stakes or dice.
- Since natural language meaning cannot be proved by substring matching, use narrowly typed owner-authored templates/canonical effect IDs plus explicit verification. Keep unconstrained natural-language prose as **private draft until independently verified**; ask the author to separate/rephrase unprovable mixed text. Do not implement a fragile verb/name blacklist.
- A withheld reaction remains withheld; mechanically concluded PvP cannot wait indefinitely for prose. No omitted player reply becomes tacit assent.

### B.3 — Audit fallback without GM character control

- Add `pvp_narrative_scope_review` with bounded reasons and author-private status. GM can return a draft for revision, reject excess terms, verify *neutral environment only*, or request exact affected-owner ratification; audit reviewer/source/text hash/reason/revision.
- GM may not mark unowned PC behavior valid, fabricate another player's reply, choose the loser reaction, expand negotiated stakes or change saved result. If GM-reviewed wording requires character agency, direct it to the actual player's separate author/ratify action.
- Implement errors as scoped recoverable results, not a whole-turn model regeneration. An independently valid own clause can be retained if raw mixed text is not published. Never implicitly publish a partial sentence whose semantics changed.

### B.4 — Gate every publication path and run actual command/adversarial tests

- `authorPvpNarrative`: no `private_account` state that implies authorized material without claim validation. A raw unverified proposal remains `draft/needs_scope_review`, with no claim mutation.
- `reviewPvpNarrative`: reviewing a whole text hash means *seen*, not certified. `sharePvpNarrative` must revalidate **all material clauses** and both current audience approvals. The eventual `pvp_public_projection` is rendered from verified native facts/individual owner clauses only, not arbitrary raw winner text.
- Guard actual `/vc-roll pvp` `narrate`, `narrative-review`, `share`, `progress`, and any AI-GM narration/context/public outbox surface. Avoid leaking sealed round data, private descriptions, or unavailable source IDs. Same decision applies to single duel and three-strikes.
- Verify terminal `pvp_resolution_receipt` and window status stay correct and unchanged while narration is awaiting revision or withheld. Do not recalculate rolls, award Hope twice, alter HP/Armor/Stress, or resume descendants based on unverified reaction prose.

**Focused acceptance (must be real executions, not predicted):**

```bash
cd bot
node --import ./scripts/offline-guard.mjs --test --test-name-pattern='PVP30' scripts/v9-pvp-rounds-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-pvp-rounds-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-pvp-agreement-test.mjs
node --import ./scripts/offline-guard.mjs scripts/v9-window-lifecycle-test.mjs
node --import ./scripts/offline-guard.mjs scripts/d08-window-security-test.mjs
npm run check
npm run validate
cd ..
git diff --check
```

**Go condition for V9-PVP-B:** all PVP30 variants pass; the previously failing suite and full validator pass on the *exact final tree* with no ignored/waived tests; authentic loser response and deliberate withholding are preserved; owner-approved party projection never expands claims; no direct PvP HP/Armor/Stress; sealed private data remains isolated; manifests synchronized; append result/rollback/source SHA to `docs/TYPED_INTENT_PROGRESS.md`. **Only then create `feat(v9-pvp): close narrative authorship safety gate` as a distinct V9-PVP-B completion commit.** Do not call the existing WIP checkpoint a completion commit.

## Remaining implementation phases (unchanged responsibilities, with authorship dependency)

The following phases carry forward the existing v9.1 scope; do not start them until V9-PVP-B is green. They must each have independent tests, full validation and a separate commit. Additionally, every public/private PvP projection they touch must recheck v9.2 claim authorization.

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

**Acceptance:** successful shared roll has a truthful delivery receipt; no false failure after send; crash-window states cannot blindly duplicate; recoverability does not reroll/respend.

### V9-06 — Private roll UI parity, complete choices and minimal sharing

**Focus:** G07, G09, G15 (P1/P2). **Commit:** `fix(v9-roll-ux): publish component outcomes and minimize shared content`.

**Work:** Make Discord button/select handling call the same native post-operation publication pipeline as slash-based `contribute` after transaction commit, without needing a second player action. Preserve owner-private mechanics and recipient-bound Help/Tag Team updates. For option lists that exceed safe Discord space, paginate and provide an accessible text fallback; do not truncate essential costs or blocked reasons. For PvP add private, bounded **terms review, countersign, withdraw, mode, trait selection, round progress, narrative submission and per-author disclosure approval** components or accessible native commands; use exact current scope, no button-driven unilateral outcome approval. For explicit party disclosure of non-PvP rolls, project only the source-confirmed accepted roll-intent span, or ask the owner to approve the exact redacted share preview. Never dump the whole composite/private authored message. Verify current source visibility and consent scope at share time.

**Red-first cases:** menu roll and slash contribute have equivalent saved/published effects; request owner, helper and partner see only authorized information; repeated component event; stale menu; long descriptions; two independent actions in one player post, where only one is shared; private-scene roll shared without unrelated secret lines; deliberate cost/trait choices pre-roll; after restart UI recovers current request and choices.

**Acceptance:** all approved mechanical choices are possible through supported native flows, no hidden resource spending or misleading apply statuses, and sharing exposes nothing beyond its exact owner-reviewed scope.

### V9-07 — Discord boundary and inactive-session hardening

**Focus:** G10, G11 and related unbounded sinks (P2). **Commit:** `fix(v9-discord): bound native-route deliveries and inactive session queries`.

**Work:** Reuse `splitDiscordText`, safe private delivery and structured status for native discovery replies; handle missing private DM permissions and half-complete multi-part sends. Handle `/vc-roll pending` and related read-only commands when session does not exist without exceptions; return an explicit `No active session` or an intentionally scoped historical result. Audit PvP dual-private prompts and winner/loser-authored narrative outputs, and other current `interaction.reply`/`message.reply`/`send` calls for 2,000-unit content and attachment/callback delivery mismatches, limiting scope to validated findings.

**Red-first cases:** discovery response >2,000 UTF-16 units; emoji/surrogates, Markdown fences, mention boundaries; DM disabled; no active session roll pending; old historical request; user changes active controlled character; no gameplay effects during read-only query.

**Acceptance:** no relevant unbounded Discord sink and no null-session exception in the tested command paths; no private-to-party fallback.

### V9-08 — Release gates, complete replay and operational acceptance

**Focus:** finish actual D08, new V9 suites. **Commit:** `test(v9-release): qualify complete typed-intent multiplayer lifecycle`.

**Work:** Register all new suites—including `d08-window-security-test`, `d08-observability-test`, PvP agreement security, both opposed modes, boundary-circumvention, rounds, metacurrency and narrative-authority tests—in `validate-offline.mjs`, update release manifest/hash using prescribed script and reconcile progress and contracts. Run offline `npm run check`, `npm run validate`, focused red-first and adversarial cases, test the full four-player Session 2 fixture through the **actual orchestration/Discord adapter path**, with nested actions, consent, private modifiers and recovery, plus a consented Jaxon-versus-Choso harmless shin-tap duel and a **declined** variant that produces no forced effects. Test both single-roll and first-to-three-strikes modes. Capture actual baseline/final counts and exit codes; never claim live-model guarantees. Confirm command registration schema and no unexpected paid request. Provide GM-only optional live staging instructions, backup/rollback and a separate go/no-go decision; **do not deploy or start live production bot automatically**.

**Acceptance:** all formerly red fixtures now green, consent/custody and privacy gates pass, no skipped suites, all pending actions have an actionable lifecycle, both PvP modes have stable terminal receipts with mutually agreed stakes and no unauthorized damage, and status ledger is accurate. Remain BLOCKED if any auth, privacy, native authority or exactly-once test fails.


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
