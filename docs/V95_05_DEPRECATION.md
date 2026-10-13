# V95-05 — conservative deprecation and compact validation

Starting commit: `194a64a6405a0068eb1c0a13d7ff0e38b18d1b11`. No runtime rules, schema, historical records or campaign state changed. Accepted typed intents are canonical adjudication inputs; human declarations own intent; native receipts own outcomes.

## Retirement proof and consolidation

The machine-readable [evidence](V95_05_DEPRECATION_EVIDENCE.json) pins the original 130-suite registry, 3,556 literal assertion lines, artifact hashes/last-change commits and all 32 original availability IDs. It is generated mechanically by `v95-deprecation-audit.mjs` from the pinned predecessor; it is not the heuristic candidate crosswalk. `v95-deprecation-coverage-test.mjs` verifies every original assertion text is still present in its original mandatory suite, every original suite is registered, all original IDs remain, and all seven distinct export checks survive. Future intentional assertion rewrites require explicit evidence review, not silently regenerating away a failure.

| Register / matrix | Decision and exact evidence |
|---|---|
| D001–002 / DEP01–02 | Retired both timestamp source backups. Git literal-reference search found only historical docs, inventory and manifests; import graph has no runtime callers. `check-source`/format accept JS/MJS only, quality accepts JS only. Docker copies the bot tree but never executes backups; generated release lists intentionally stop shipping them. Original bytes remain recoverable from pinned Git history; hashes/last-change commits are in evidence. |
| D003 / DEP03 | KEEP: contrary to the planning audit, current v7 script is corrected and runs real D01/D05 behavior. Its F08/F10/F11/F12/F13 structural checks and two subprocesses pass. Historical plan references remain truthful. Do not retire it as an old intentionally-red test. |
| D004 / DEP04 | Retired unregistered `v9-pvp-contract-test.mjs`. No CI/package/import caller; historical docs only. Its 32 Node cases repeated four export checks per case (128 invocations, seven unique exports). Consolidated the seven type checks and 32 preserved IDs into one mandatory inventory test. This is availability equivalence only, NOT 32 behavioral qualifications. Original CSV and subsequent superseding policy negatives remain intact. |
| D005–008 / DEP05/07 | KEEP all baseline, release, v94 qualification and D06 suites. Apparent overlap is not equivalence: D06 has nondeterministic descendant/strict reconciliation; v9 continuation has owner-private restart/access/checkpoint cases; v94 qualification has selected incoming NPC attack ancestry, defender/Armor and corrupt-context negatives, versus release's Discord four-owner replay. No registered suite or assertion removed. |
| D009–012 / DEP08–09 | KEEP every i-heard-you/system/implementation/end-to-end suite and all original 270 matrix requirements. Historical non-PvP paths remain distinct; assertion inventory retained exactly. No speculative rewrite or name-based consolidation. Candidate crosswalk continues to say NOT equivalence. |
| D013/017 / DEP06 | KEEP legacy authority migration/readers and v1/v2 consent/history negatives. No reprocessing, resource rewrite, IDs renumbering or data deletion. |
| D014–016 | Prior migrations complete, authoritative manual Fear/JSON command recovery interfaces retained. No new runtime adapter retirement. |
| DEP10 | All original 130 registrations preserved; two new mandatory suites bring final registry to 132. REL01 additionally requires reporter/deprecation gates. CI default still executes full validator. |
| DEP11 | Same unchanged D08 negative run in an isolated temporary source copy: original passes; removing exactly `validateActionConsent` guard fails with `Missing expected exception: stale unrelated consent must not authorize a new PC conflict`. No mutation to branch files; temporary copy removed. |
| DEP12 | Manifest regenerated from actual inventory, release stays 10.0.0; no database migration. Restore retired source from baseline Git into a review branch if needed; never restore a production database or re-execute historical effects. |

Static reachability reviewed literal/dynamic imports, package scripts, CI, root Docker tooling and recursive loaders. Nonliteral import in audit regression constructs the queue URL, not backup paths. Generated inventories/manifests are packaging records, not consumers requiring stale backups. Unavailable external operator scripts are not certified; none are present in repository tooling. No registered behavior-suite consolidation was proven safe, so none was performed. This is deliberate conservative scope, not an assertion of complete redundancy removal.

## Reporter contract

Supplied guarded Python patch dry-run matched before application; its three isolated smoke cases passed without real suites. Portable Python 3.12.10 was downloaded to TEMP because the system Python command is a Store placeholder; no persistent installation. Supplied scripts and user README were preserved as inputs.

Runner captures passing child output and atomically replaces ignored `bot/.reports/offline-validation.json` after each suite. Rows retain duration, exit/signal, failed/not-run identity, bounded redacted local diagnostics; original acceptance mapping still gates success. A minimal regression proved malformed acceptance previously left `running`; repaired to write `failed`. Storage failure exits nonzero, never PASS. Abrupt termination leaves the latest valid running checkpoint, not an invented terminal result. Report paths can be overridden with `VC_VALIDATION_REPORT_PATH`.

Diagnostics are local fixture logs, **not safe public telemetry**: common credential patterns and configured credentials are redacted, but arbitrary private text cannot be reliably scrubbed. Never publish raw tails or commit reports. Windows file modes are best-effort, not a replacement for operator directory ACLs. Success output is one summary; inspect JSON summary/nonpassed rows only. No paid/live call is made by the reporter, and children retain the network-denied guard/dummy credentials. A 32 MiB child capture overflow is a failing suite, not a pass.

## Actual evidence and limits

New reporter regression initially failed malformed acceptance (3/4 green); final 4/4 green. Retirement regression initially failed because backups existed (3/4 green), with its isolated D08 mutant already correctly detected; after retirement 4/4 green. T1 reporter/deprecation/release/D08-observability/corrected-v7 group: 13/13 Node entries, zero failure/skip, exit 0; legacy script entries contain additional internal assertions. Logs are in TEMP `veiled-v95-05-*.log`. Supplied Python smoke: 3/3 synthetic cases, exit 0.

Final gate results belong in `TYPED_INTENT_PROGRESS.md`. Baseline 130 suite subprocesses; no removal, two added. No claim of faster test execution or live narrative quality: compact output reduces context/log noise; removing redundant source reduces shipped stale code. No production, credential, live Discord/model, push or deployment operation authorized or performed.
