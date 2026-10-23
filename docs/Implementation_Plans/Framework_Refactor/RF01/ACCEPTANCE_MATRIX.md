# RF01 acceptance and remaining work

Intake: `0abf4be1d45e87abb2df4416f0e0f546b90cce72`, `codex/clean-ai-gm-2026-10`. Result: **RF01 OFFLINE ACCEPTANCE SATISFIED**. This is an architectural enforcement foundation, not a claim that the old application is isolated.

| Requirement | Actual evidence | Disposition |
|---|---|---|
| Exclusive source ownership | 377 currently scanned source/support modules, zero unowned; legacy explicit manifest + new package classification | PASS |
| Consumer-owned interfaces | Session owns authoring request port; publication owns transport port; exact pair adapters preserve receivers/arguments/source/audience/receipt/error identity | F02: 5/5 |
| Explicit dependency injection | Instance-local lazy container, declared dependencies, graph validation before factory execution, no eager provider/database/Discord initialization | F03: 6/6 |
| Executable import boundaries | Real AST, exports/re-exports, aliases, literal/computed dynamic imports, public/private/two-owner restrictions, new-to-legacy prohibition | F04: current 24/24 |
| Cycle regression rejection | Added edge fails with unchanged component membership; both direct validator and disposable real CLI exercised | PASS |
| Exact legacy transitions | 2,839 records cover 2,861 counted occurrences; original-edge baseline, per-feature owner/removal/phase expiry; added/unused/duplicate/forged/expired records fail | PASS for RF01; debt remains |
| Canonical registry | 63 source-backed pairs; 2 implemented contracts with real composition imports, 61 proposals; references do not pretend execution | F05: 8/8 |
| Actual checker command | `npm --prefix bot run architecture:check`, exit 0; final refined-registry CLI check exit 0; zero active violation groups/transition errors | PASS |
| Truthful strict gate | `architecture:strict` exit 1, raw debt 2,861; RF07 ratchet exit 1 with 2,839 expired records | EXPECTED FAILURE, migration not complete |
| Command-line failure behavior | Disposable source trees; source never evaluated; cross/private imports, cycle additions, duplicate config, missing baseline, unregistered packages and parse errors fail | F06: 10/10 |
| Fresh test evidence union | 5 + 6 + 8 prior unchanged passes, 24 + 10 frozen changed-code passes; **53 unique current tests**, 0 failures/skips/cancellations | PASS; no old suite executed |
| Changed syntax | 23 new JS/MJS production/test files, zero syntax failures | PASS |
| Existing application preserved | All 355 original runtime path hashes unchanged; no original module moved/adopted; supported commands/runtime dependency versions/production lock entries unchanged | PASS, static comparison |
| Storage/build/operations preserved | Schema file hash unchanged, static version 460; no tracked SQL/content/Docker/CI changes; no production DB/service accessed | PASS, static comparison |
| Remove 211-module dependency cycle | Component still 211 modules with 1,120 cyclic import occurrences | NOT DONE; RF02–RF06 decomposition |
| Actual native runner adoption and gameplay/replay equivalence | Existing startup deliberately untouched; new contracts tested with fresh callbacks, not live native execution | NOT QUALIFIED; later owning migration features |
| Semantic thinness/complete JavaScript effect proof | Static parser is not a semantic policy verifier/security sandbox | REVIEW REQUIRED during each decomposition |
| RF02 physical migration | No existing implementation relocation | NOT STARTED — owner hold |
| Live services, providers, narrative quality and release | No relevant authorization or execution | NOT QUALIFIED; RELEASE NOT AUTHORIZED |

## Failures retained as evidence

F04 first batch exited 1 before assertions because a fresh fixture had an invalid computed object key; `F04_ATTEMPT_1.json` preserves it. Corrected fixture then passed 23 tests. Adding unsupported-source-type enforcement and registry reader integration changed the affected code; the final frozen batch passed its current 24 F04 tests plus 10 F06 tests. Passing unchanged F02/F03/F05 tests were not repeated.

The first package-command gate was launched from repository root without `--prefix bot`; npm returned ENOENT before either package command ran. Corrected commands exited 0/1 as intended. The separately successful RF07 expiry command was not repeated. `GATE_LAUNCH_ATTEMPT_1.json` retains the failed launch. A final evidence-assembly script used a nonexistent schema-path metadata field and failed after its checks; corrected static assembly used the actual `bot/sql/schema.sql` path. None of these failures is represented as a passed batch.

## Holds and rollback

No critical blocker or owner decision is pending for RF01. No creative-output limits were introduced. Hold RF02 file migrations as explicitly requested; keep independent future native adoption/transaction decomposition with the owning migration scopes. Preserve historical RF00/P-series evidence and original native authority until each replacement is independently tested.

Rollback is a local Git revert of the RF01 implementation and closeout commits, in reverse order, after preserving any subsequent edits. This removes only new packages/tooling/tests/docs, Acorn's dev dependency and the two new commands, and restores the prior current registry. No data/schema rollback, restart, provider call or deployment is needed. Do not reset/clean the checkout. Later consumers require reversing their adoption first.
