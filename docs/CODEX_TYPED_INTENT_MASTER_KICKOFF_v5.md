# Codex master kickoff — Complete the Veiled City typed-intent initiative (v5)

**Copy everything inside the following block into a Codex CLI session started in the Veiled City repository root.** Place `CODEX_TYPED_INTENT_REFINEMENT_PLAN_v5.md` at repository root first, and retain `docs/TYPED_INTENT_PROGRESS.md` as the existing progress record.

```text
You are implementing the Veiled City v10 semantic typed-intent refinement on branch codex/typed-intent-refinement.

FIRST, read CODEX_TYPED_INTENT_REFINEMENT_PLAN_v5.md IN FULL, docs/TYPED_INTENT_PROGRESS.md, docs/TYPED_INTENT_CONTRACTS.md, docs/TYPED_INTENT_BASELINE.md, and the relevant actual source, tests, rules desk and SRD/house-rule references. Do not treat an older v3/v4 plan as current. Inspect git status, branch name and HEAD before changes.

The plan was anchored to reviewed HEAD 0e770f6c60de2546a561340dd16149a6b0e9df3c. If the branch advanced, reconcile source/progress before editing, preserve completed work and never reset another contributor's changes.

T00 baseline, T05a memory privacy and T00.1 movement stabilization are COMPLETE. Do not redo these phases or weaken their checks. The T00.1 progress ledger reports 76/76 passing offline tests; independently re-run npm ci, npm run check and npm run validate from bot/ before implementing changes. If baseline is red, triage and restore it first without bypassing native safety.

MISSION:
Build a truly flexible AI Game Master flow:
  human's unchanged authenticated declaration
  -> model-proposed semantic intents and separate claimed/desired outcomes
  -> native source/actor/target/framing acceptance
  -> lore + grounded Daggerheart SRD, house-rule and saved-ruling adjudication
  -> actual native no-roll, pending dice, opposed/cooperative, blocked or clarified disposition
  -> exactly-once transactional receipts
  -> receipt-consistent AI GM narration
  -> significant scoped memory, preserving objective fact vs attributed claim.

A player's implied/explicit success never self-verifies. Ordinary safe completed action need not roll. The AI can improvise fiction and select grounded rules but cannot invent die results, access, consent, spends, retroactive precedence, world truth or another PC's decisions.

EXECUTE ALL REMAINING PHASES IN THIS EXACT ORDER, AS SEPARATE TESTED COMMITS:
  T01  - authenticated raw source envelopes, offsets, proposed/accepted intent lifecycle, outcome-claim extraction.
  T02  - remove general natural-language phrase matchers as authorization; preserve native explicit owner consent/spend gates.
  T03  - SRD/house-rule/saved-ruling arbitration, real native roll/no-roll request/receipt, claimed outcome verification.
  T04  - ordered compound actions, dependencies, staged world/NPC availability and partial outcome handling.
  T04.1 - MULTI-ACTOR shared-scene action windows, spotlight/timing, conflicting read/write sets, consent/cooperation/PvP, CAS revisions and atomic receipts.
  T05b - memory identity, promotion/ephemerality, epistemic labels, source/audience ancestry, updates, corrections and expiry.
  T06  - verified outcome reconciliation and setting-grounded, audience-specific narration/publication.
  T07  - safe deprecation of obsolete phrase authority and documented backward compatibility.
  T08  - expanded adversarial evaluations, CI/offline regression, migration/replay/rollback checks and release readiness.

FOR EACH PHASE:
  1. Read its detailed scope and acceptance gate in the v5 plan; write failing tests first, including relevant negative authorization cases.
  2. Implement bounded changes consistent with existing repo patterns, native DB receipts and actual SRD + applicable Veiled City house rules. If the source already does part, prove it by tests; do not duplicate code.
  3. Run scoped tests plus npm run check and npm run validate in bot/ using the network-denied fixtures. Do not skip or weaken tests or swap asserted one-call behavior for paid retries.
  4. Document a phase report in docs/TYPED_INTENT_PROGRESS.md: status; source HEAD; files/record contracts; red-first evidence; full test command and outcome; authority/privacy/rules implications; rollback/migration; open debt.
  5. Commit the verified phase with a descriptive TXX commit message. Update docs/TYPED_INTENT_CONTRACTS.md whenever an authority boundary changes. Maintain existing manifest policy.
  6. Once and ONLY once all tests and acceptance gates pass, AUTOMATICALLY PROCEED to the next phase without pausing for an approval request. Keep each commit independently reviewable and recoverable.

MULTIPLAYER INVARIANTS:
  - Multiple intents in one message form a causal dependency graph; a failed prerequisite suspends/blocks only dependent actions.
  - Two players cannot both obtain exclusive custody or commit opposing door states. Use a scene-beat/window and shared resource revisions when fiction truly overlaps; never infer simultaneity purely from Discord arrival times.
  - Never retroactively erase an already committed outcome because a late declaration appeared. Pending reactions must have a legitimate still-open window.
  - Apply real Daggerheart spotlight, consent, reaction, Group/Help/Tag Team and PC-conflict mechanics. Owner/proxy authority, private perception and Hope expenditure remain per participant.
  - An AI-proposed conflict or claimed victory is not a native resolution; optimistic concurrency and final commit receipts decide effects.

STOP RULE:
If you encounter a genuinely unresolved blocker requiring player/GM permission, irreversible schema migration, production data/access, unsupported SRD override, or a validation failure you cannot safely resolve, STOP THERE. Leave a clean progress record marked BLOCKED and report the exact decision needed. Do not fabricate an answer, silently relax a gate, or mark subsequent phases complete.

DO NOT:
Start/deploy/restart the live bot; access production campaign databases/.env/WAL; register live Discord commands; make paid model calls; force-push; merge main; or claim a skipped test passed.

FINISH:
When all phases pass, provide a final implementation summary listing per-phase commit SHAs, changed interfaces, full offline suite counts/results, source-backed behavior and PvP/conflict examples, documented migrations, known limitations, and a recommended merge/rollout checklist. Leave actual deployment/merge to the owner.

Begin with baseline verification and T01 now. Continue through T08 under these gates; if your session ends early, make docs/TYPED_INTENT_PROGRESS.md sufficient to resume the next exact phase without redoing completed work.
```

## Resume prompt for a subsequent Codex session

```text
Read CODEX_TYPED_INTENT_REFINEMENT_PLAN_v5.md and docs/TYPED_INTENT_PROGRESS.md. Inspect the current codex/typed-intent-refinement HEAD and worktree. Resume from the first incomplete phase in the ordered sequence T01, T02, T03, T04, T04.1, T05b, T06, T07, T08. Do not redo completed passing phases or ignore BLOCKED reports. Complete each phase with red-first tests, npm run check, npm run validate, a progress entry and its own commit. Automatically continue to the next passing phase; stop only on a documented unresolved blocker. Preserve no-production/no-paid-API constraints and all native player agency, consent, SRD, audience and exactly-once receipt invariants. Report the current phase and outcome.
```

## Windows CLI launch

```powershell
cd 'D:\Library\Veiled City'
git switch codex/typed-intent-refinement
codex
```

This command assumes that the named path contains the working checkout. Adjust the path if it differs; never delete/reset an existing worktree to make the instruction fit.
