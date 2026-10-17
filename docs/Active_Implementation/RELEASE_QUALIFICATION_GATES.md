# Active release and qualification gates

Current branch checkpoint: `014bc39dadd4035b43649c2c24ef3508939b1c40`. **Not marked UA17/18/19 qualified** by this audit. The original 126-suite audience-first receipt is a prior baseline, not this branch's release gate.

## UA17 — final frozen-tree offline qualification

1. Inspect `git status`, actual branch + ancestor and local diff; ensure no owner work, untracked `docs/rework/` inputs or parallel edits are accidentally included.
2. From `bot/`, run full current mandatory test set and all required source guards using the checked-out version's own scripts:

```powershell
npm ci
npm run check
npm run quality
npm run format:check
npm run validate
```

3. Preserve the `validate` machine-readable report and actual exit codes, counts, failing/skipped/not-run matrices, D08 privacy/window and outbox results; do not infer internal assertion counts from module wrapper results.
4. Run generated-manifest synchronization using the **actual** checked-out release script (`node scripts/sync-release.mjs 0.0.0.1`) and verify normalized manifest contents. If synchronization changes any executable/test input, rerun affected gates; do not pretend the original SHA was already qualified. Run `git diff --check`.
5. Freeze the exact passing commit SHA and record it. A docs-only results update must be distinguished from executable/input changes.

**Nonnegotiable acceptance:** all mandatory suites truly run/pass, no blocked mandatory case or missing security proof. Any feature marked supported must have actual native positive path, negative near-neighbor and saved-result/delivery read proof. Missing feature adapters stay review-only.

## UA18 — same-SHA remote and CI evidence

Only after UA17, and only with explicit authority, publish the qualified branch commit to origin without force push, merge or silent rebasing. Verify CI ran against and passed on the **exact** qualified SHA and tested inputs; record run URL, source SHA, matrix and artifact integrity. CI for an earlier SHA or an unmerged detached checkpoint is not sufficient. Resolve changed remote ancestry before deployment planning.

## UA19 — controlled installation

Preflight the actual host/process identity, production code SHA/clean state, Node/dependencies and command schema. Verify a consistent SQLite online backup and disposable restore (integrity, FK, schema, key record/outbox counts); protect secrets and WAL/SHM. Check current pending attacks/reactions, required historical proof readers, exact outbox and feature flags. Authorization for deployment, matching-instance restart, command registration and live tests are distinct steps. Preserve existing production running/stopped state until the approved maintenance window. No database restore as routine code rollback; do not discard native outcomes, replay costs/dice or blindly resend uncertain Discord messages.

## Status evidence versus action

| Claim | Allowed based on current docs | Not allowed without new proof |
| --- | --- | --- |
| "Original v9 audience core was offline qualified" | Yes, earlier SHA only | Current UA17 pass |
| "Current special features include 12 bounded handlers" | Yes, code-owned catalog/source observation | Universal special feature support |
| "Recent focused suites passed" | Yes, scoped tests as recorded | Full mandatory/CI pass or live quality |
| "Assembly repaired in current branch" | Yes, source and targeted offline evidence | Running production code currently uses it |
| "Owner approved a future rollout" | Authorization noted in source ledger | Claim that UA17/18/19 gates happened |

Do not run a paid Discord/model canary just to validate documentation. First satisfy engineering/provenance gates; authorize any live test separately with privacy-safe assertions and cost caps.
