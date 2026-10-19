# Relevant validation and CI repair

## Execution pruning, not security deletion

Inventory before repair:191 distinct registered suites,152 critical/default and39 optional/historical extended suites. No duplicate suite registrations or imports justifying removal of unique behavior were found. All191 remain; the new selector regression brings inventory to192 /153 critical /39 extended. Historical assertion conservation, original SEM06, PVP30/q/ag, FH40, OBS21, native mechanics/death, privacy, outbox/restart and both D08 remain registered.

| Input | CI execution | Coverage limitation |
| --- | --- | --- |
| Documentation/release metadata only |7 static/registry/reporter/selection gates | Gameplay acceptance explicitly `not_selected`; **not release-qualified** |
| Registered test files only |7 gates + changed suites + historical assertion conservation | Unselected gameplay suites remain available, not reported passing |
| Shared production code, content/rules, SQL, fixtures, dependencies, validator, workflow, unregistered/deleted test or unknown diff | Complete153-suite critical gate | Still does not certify unimplemented product scope or live model/Discord behavior |
| Explicit `npm run validate` | Complete critical gate | Default behavior preserved |
| `npm run validate:extended` | All192 registered suites | Preserves optional/historical feature matrices |

`npm run validate -- --changed` uses a strict40-hex `VC_CHANGED_BASE`, `git diff` via argument array (not shell interpolation) and current HEAD. Missing/zero/shallow/invalid ancestry or any uncommitted/untracked source input falls back to full; a HEAD-only diff must not hide local work. PR base SHA / push-before SHA comes from the GitHub event. Workflow changes themselves trigger full qualification. Checkout fetches ancestry for selection; no model/provider call. Machine-readable reports include selection mode, reason and unselected suites; focused PASS is labeled `FOCUSED`, and full acceptance requirements cannot silently pass by omission.

This avoids running irrelevant behavioral matrices for documentation edits without pretending finite source/assertion overlap proves security equivalence. No suites/assertions deleted, no old failure skipped to repair CI, no live performance/savings claim. Actual registered-test ID changes, rule content changes and unknown inputs are covered by the selector regression; a Markdown rule in `content/` is **not** documentation-only.

## Confirmed failing CI

- Run [39257396716](https://github.com/KeshireTheChaotic/Veiled_City/actions/runs/39257396716), job118076017585, exact373c7d6, Ubuntu Node24.9.0. Dependency installation succeeds. Critical validation fails at `v95-protected-narrative-test`.
- Same local baseline suite:27 tests,25 passed /2 failed, exit1,17118.853ms (`ci-protected-baseline.log`). NAR05 and NAR14 attempt player-triggered `world_additions` without the native independent GM identity receipt required by W2. This is an outdated **fixture producer**, not a reason to remove the production authorship firewall.
- Explicit opt-in native fixture authoring establishes the new porter / adjoining lobby. Actual source-backed initial presence supplies the Director's camera, matching the current native arrival contract. Original cross-actor apology, privacy, resource, independent Billy movement and Choso-location assertions remain unchanged. A new raw-addition negative exercises the same production boundary without setup permission.
- Early setup corrections failed on absent native camera, then absent continuity flag / owner-established presence. Those are fixture errors, not additional production bugs. Selection red caught content/GM/rules.md misclassified as docs-only; fixed the path rule before qualification.35/35 preliminary combined tests passed11663.1259ms before the final raw-addition negative. Final results are recorded in the active ledger after execution, not guessed here.

## Reproduction / handoff commands

From `bot`, using isolated temporary SQLite and the network guard:

```powershell
node --import ./scripts/offline-guard.mjs --test scripts/v95-protected-narrative-test.mjs scripts/world-authorship-test.mjs scripts/validation-selection-test.mjs scripts/v95-validation-reporter-test.mjs scripts/critical-validation-profile-test.mjs
npm run validate
# Inspect .reports/offline-validation.json summary and failed cases, not successful logs.
```

Full release qualification still requires the complete frozen product scope and identical-SHA release/CI gates. Uncommitted pre-roll Fear code in the main development checkout is excluded from this repair's test tree and remains unqualified; never infer it passes from this run.
