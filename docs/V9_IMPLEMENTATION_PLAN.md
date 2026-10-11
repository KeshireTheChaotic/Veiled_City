# Veiled City — Typed-Intent v9.1 Implementation Plan — Narrative PvP Amendment

**Audit target:** `KeshireTheChaotic/Veiled_City` / `codex/typed-intent-refinement` at `26e4d6e8f0c3335a250e81952ac9c092c38450b2` on 2026-10-10.

**Disposition:** not release-ready. **Amendment:** explicit consented narrative PvP replaces standard PC-versus-PC combat, physical damage and adversary attack adjudication; see `V9_NARRATIVE_PVP_CONTRACT.md`. This amendment adds **V9-PVP-A** and **V9-PVP-B** phase commits, leaving existing v9 defect-remediation phase IDs intact.  Current D08 is blocked by a documented consent bypass and missing live coordinated-action completion; 99/99 existing mandatory offline suites do not include the intentionally red D08 security regression. This plan replaces the unmodified v8 kickoff; it **does not** propose repeating already completed H01–H05 or D01–D07 work.

## Standing engineering invariants

1. The current owner's authenticated, verbatim message establishes intent only; AI interpretations are fallible.
2. A separately accepted, current typed intent can request adjudication, but never grants another player's voluntary action or consent.
3. Native receipts, not model prose, establish rolls, costs, damage, success/failure, movement, locks, item custody and world state.
4. Verify owner, principal revision, source ancestry/status, session, scene, target, audience, terms, action and expected revision at *use time*.
5. Transactions and idempotency prevent double Hope charges, dice, status transitions, damage, custody transfers and publications.
6. Do not broaden character-private or GM-only context to party; sharing must be deliberate, minimal and request-bound.
7. Preserve independently valid parallel actions and dependencies when another action requires consent, ruling or resolution.
8. No live/paid API calls or Discord deployment in offline acceptance; production checks require separate explicit authorization.
9. One phase, one separately reviewable commit, a passing focused suite and `npm run check`/`npm run validate`; do not hide intentional red tests in claimed readiness.
10. **Direct PC versus PC conflict is a locked-stakes narrative contest, not normal damage combat.** An attempt does not force another PC's response, hit, harm, relocation or resource cost. The full `V9_NARRATIVE_PVP_CONTRACT.md` governs and has precedence over generic attack/window language for two PCs.
11. Both players affirm the same objective, best/worst outcomes, hard boundaries, selected `single_roll_duel`/`three_strikes` mode, audience and narrative ownership before any PvP dice. A terms edit voids both approvals.
12. No direct PvP HP, Armor or Stress changes; winner narrates their permitted success, loser owns their PC's response; Fear complications stay within boundaries, Hope awards never duplicate lower-level native gains.

## Phase ordering and work packages

### V9-00 — Freeze, baseline and red-first qualification ledger

**Focus:** D08 reopen, test and source truth. **Priority:** P0. **Commit:** `test(v9): baseline reopened D08 consent and lifecycle defects`.

**Work:** Record branch head, recent commits, flags, all existing D00–D08 status, manifest and `npm run check`/`npm run validate` results. Run the two already added D08 focused scripts individually and record the observed failing status; do not claim release qualification. Add targeted failing fixtures for G03–G11 and the PVP01–PVP32 acceptance scenarios without weakening v8 regression behavior. Update outdated structural audit (`v7-delta-baseline-test.mjs`) to inspect *actual* current bridges while retaining behavioral assertions.

**Acceptance:** document reproduced vs unverified defects; existing passing suites unchanged; known-red tests explicitly listed, no default green-gate manipulation; clean scoped commit. No runtime behavior change.

### V9-01 — Native, action-bound and revocable PC consent

**Focus:** G01 (P0), prerequisite for G02. **Commit:** `fix(v9-consent): bind current owner approval to exact scene action`.

**Work:** Define a closed `action_consent` versioned contract. For direct PC conflict, this must attach to an immutable PvP agreement (participants, signed terms digest, selected mode, hard boundaries and explicitly separated player-vs-character narrative authority), never generic consent-to-attack or consent-to-damage. PvP participation consent is not advance consent to lose or allow unauthorized harm.  Consent must be created only from a separately authenticated target owner's actual interaction/declaration; store target character and controlling user, requester and accepted action IDs, terms hash (target, operation, read/write resources, consequences), source event, live principal revision, campaign/session/scene, audience and expiry/revocation. Accept/decline/revoke must be native state transitions, not inferred from dialogue. Replace weak `consent()` check with a referential validator that re-reads world-event ancestry, owner assignment, revocation, terms and expected action/window revisions. For private actions use individual private notices and do not expose another PC's hidden sheet, location, private post or choice. Reject wildcard consents and consent for different terms.

**Red-first cases:** known-red `d08-window-security-test.mjs`; stale source, retracted source, wrong owner/PC, old principal revision, old scene/session, changed terms, foreign audience, revoked/expired decision, same-user different character, replay. Positive: each affected PC separately accepts the *same* immutable terms and a valid current consent can be consumed once or reused only where the contract explicitly permits it.

**Acceptance:** D08 security fixture green and registered as a mandatory gate; no test may authorize a kick using tea-sharing consent; absent consent suspends only the contested action; no unauthorized dice, forced response or damage. PvP consent can only authorize entry into the *separately agreed narrative mode*, never native attack damage.

### V9-PVP-A — Negotiate, approve and lock story-first PvP stakes

**Focus:** New PVP01–PVP12 (P0), prerequisite for narrative rolls. **Commit:** `feat(v9-pvp): require bilateral narrative stakes and boundaries`.

**Work:** Implement the `V9_NARRATIVE_PVP_CONTRACT.md` sections 1–2 and 7: current source-grounded `pvp_proposal` and immutable, hashed `pvp_terms_revision` with both characters' best/worst stakes, non-negotiable boundaries (no death/permanent injury, forced item/character choices or HP/Armor/Stress damage by default), selected resolution mode, trait/modifier policy, optional Hope/Fear policy, disclosure scope, stop/withdrawal procedure and narrative authorship. Present exact terms privately to each player, accept a new revision only after *separate authentic, affirmative decisions from BOTH owners*, and invalidate prior approvals on counteroffers or material changes. Independent mundane movement/dialogue proceeds without granting a hit. A declined or withdrawn proposal closes neutrally with no roll, status loss, fabricated response or punishment. Do not silently import normal combat consent or override a player's boundaries.

**Red-first cases:** unconsented shin kick; asymmetric stakes both displayed; defender declines; offer modified after one accepts; edited Hope rule/mode/terms invalidates signatures; one person owns multiple PCs; different current owner; source retracted; stage/restart; stale button; long terms presentation; forbidden death/HP/item/forced speech sneaks into proposal.

**Acceptance:** No `pvp_round_receipt` can exist before a current locked agreement with two independently authenticated identical-revision approvals. No PC-specific damage or compelled agency can be applied even if the model emits generic `resource_delta` or an unmarked `roll_required` action. The PvP agreement is reviewable in plain language by both owners.

### V9-02 — Finish action-window lifecycle for shared contests and PvP staging

**Focus:** G02, G08, G13 (P0/P1). **Commit:** `feat(v9-windows): connect locked coordination and terminal dispositions`.

**Work:** Add a production consumer for pending consent responses and a deterministic coordinator for `open -> participants -> lock -> native adjudication -> terminal receipts -> resolve/decline`. **For PC-versus-PC conflicts, `native adjudication` is the separately agreed narrative PvP service in V9-PVP-B (paired non-damaging Duality rolls and story-stakes receipt), NOT an adversary attack roll, HP damage or a winner inferred from AI.** Keep generic scarce-resource and non-PvP cooperation windows on their existing mechanically authorized native pathways. Make the action window's identity depend on a stable *native* scene/beat revision and grounded resource keys, not just arbitrary model beat text; repeated beats after closure create new windows, while exact retries reuse originals. Correlate independent players' conflicting claims across separate messages even if proposed beat labels differ. Define the reaction/spotlight closure rule (e.g., explicit participant decline, all required consents, established GM ruling, encounter step, or explicit GM completion), without pretending a time-based deadline authorizes absent players. Confirm exclusive scarce-resource custody has at most one winner; a losing/failing action needs its own truthful terminal disposition and receipt. Surface native consent requests and pending windows privately; give the GM explicit recovery operations for stale/paused windows. Use compare-and-set revisions and persisted lifecycle logs.

**Red-first cases:** two independent users claiming same parcel in different messages; action without consent; concurrent incompatible choices; reaction entry after window closure; wrong scene; reusing beat key after closure; restart at open/locked/pending; conflicting outcomes; reruns do not resolve twice; failure while one independent turn proceeds.

**Acceptance:** a production-path window can move from accepted, correctly scoped consent to a locked operation and terminal closure, and publishes/reconciles exact receipts; for PvP, defer actual roll-outcome terminal proof to V9-PVP-B rather than inventing a normal damage receipt. No synthetic winner, roll or consent. A closed window cannot strand the associated action indefinitely.

### V9-PVP-B — Two consented narrative PvP modes and narrative authorship

**Focus:** New PVP13–PVP32 (P0/P1), finish direct PC-conflict execution. **Commit:** `feat(v9-pvp): adjudicate opposed story stakes without combat damage`.

**Work:** Implement `V9_NARRATIVE_PVP_CONTRACT.md` sections 3–7 using existing low-level native `dualityRoll()` (two saved Hope/Fear d12 faces, verified trait and modifiers, natural double => Critical) while **never** calling adversary damage `finishDamage()` or decrementing another PC's HP/Armor/Stress. In `single_roll_duel`, each player chooses a relevant owned trait and independently authorizes one sealed roll; **higher final total wins** the locked narrative stake. Natural Critical is recorded and colors narration, but does **not** beat a higher total in this custom contest. Equal totals are a stalemate; neither wins until a separately affirmed reroll or an agreed draw. In `three_strikes`, both write attempted actions and privately roll once each per paired exchange, the higher total earns exactly one success/strike, ties score zero, and the first to three verified strikes wins. Roll or score once per exact pair; waiting players cannot be silently forfeited. Both modes require saved agreement, comparison/strike receipts and window CAS transitions; extra costs/options are disabled unless specifically agreed AND individually native-authorized.

**Hope/Fear:** Preserve duality and natural critical behavior. Default mode awards at most one native Hope on a Hope roll (roller gets it unless both consented in locked terms to award that single point to the opponent), respecting caps, with no double grant from generic `applyRollOutcome()`. If terms specify flavor-only, no resource change. Fear may suggest a bounded environmental scene complication (e.g., onlookers notice) without damage, forced action, item loss, surprise attack or leaking a secret. Do not silently grant a GM Fear-meter increase unless the agreed policy and native receipts require it. No metacurrency, modifier or consequence may be invented by narration.

**Narration/agency:** After a verified result, request winner-authored success description within the locked outcome and loser-authored response (or intentional omission). GM can connect approved descriptions and narrate bounded scenery. A winner cannot write the other's dialogue, emotion or injury; a loser cannot undo the verified agreed outcome, but entirely owns their PC's response. Public projection requires scoped owner approval; do not expose sealed traits, private choices or rolls before both complete. An unresolved player narration never allows AI fabrication. The only PvP terminal status is a truthful saved story-stake result or a neutral decline/withdrawal/stalemate.

**Integration:** Enforce the direct-PC authority gate **before** `state.js` constructs native `roll_required` requests; do not trust the presence of optional model coordination metadata. Prevent player-originated PvP effects via generic party `resource_delta` or standard attack/damage handlers; retain legitimate non-PvP GM/NPC/environmental mechanics. Never invoke `finalizeTypedRollAction`'s `Difficulty` comparator for a PvP opposed duel; use its separate two-result comparison. Register result and narrator approvals as native source/receipt records and tie to action-window terminal disposition.

**Red-first cases:** natural matching d12 with lower total; two Criticals; tie with no winner; repeat/abandoned tie; sealed trait choice and no opponent peek; same-user double character switching; three-strikes sequence 3–2; round tie/no strike; replay double strike; reboot after one roll; one party declines before lock; withdrawal after lock; Fear complication outside boundary blocked; Hope reassigned once/capped; no hope double count; no NPC/PvP rule confusion; attempted `resource_delta` to rival blocked; neither player forced to narrate; party-vs-private disclosure gate.

**Acceptance:** both resolution styles complete through actual Discord-adapter-facing transactional services; both owners approve terms; no standard HP/Armor/Stress damage, no fabricated reactions, no hidden cost or private leakage, no Critical overriding a higher opposing total, and no replay changing scores/resources. D08 and the new PvP source/consent tests remain mandatory release blockers.

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

## Required execution order (11 independent commits)

`V9-00 -> V9-01 -> V9-PVP-A -> V9-02 -> V9-PVP-B -> V9-03 -> V9-04 -> V9-05 -> V9-06 -> V9-07 -> V9-08`

Neither player consent nor standard Daggerheart roll mechanics automatically authorize an opposed PC's mechanical injury. The new contract is an **opt-in narrative PvP house rule** and has precedence over older v9 generic `direct_pc_conflict` expectations.

## Phase execution protocol

For each phase: (1) inspect current code and state machine; (2) create **failing** focused test; (3) implement minimal compatible fix; (4) run targeted tests, `git diff --check`, `cd bot && npm run check && npm run validate` (where intentionally red forward-phase fixtures remain excluded until owned); (5) sync manifests if required and rerun; (6) update `docs/TYPED_INTENT_PROGRESS.md` with starting/ending SHA, actual commands/results, risks, rollback and unresolved items; (7) stage only intended files and create the phase commit; (8) continue. Never combine phases into one commit or silently mark an unresolved risk complete.

## Deployment restrictions and rollback

- No production DB access, SQLite/WAL/SHM mutation, `.env` changes, API billing, live Discord command registration, merge, force-push, or bot deployment under this kickoff.
- Use temporary SQLite fixtures and network-denied tests; restore principal/scene/source from current saved state, not model claims.
- Consent, PvP agreement/round/strike/resolution and window schema changes should prefer additive versioned city records; provide migration and backward-incompatibility notes for live old pending records.
- Production resumption requires GM review of pre-existing action windows, uncertain deliveries and old unsafe consent records; old consents must be invalidated/fail closed by default. All *unlocked old PC-versus-PC pending actions* remain inert; never migrate their old ``attack`` rolls into automatic PvP victory or harm without a fresh bilateral terms agreement.
- Declare v9 release-qualified only with a complete actual gate report, and treat real-world smoke tests as a separate deployment authorization.
