# P06-F08 — Enable source-qualified Code Blue

**Phase:** [P06](../../phases/P06/SCOPE.md). **Status:** FROZEN FOR TARGETED QUALIFICATION. **Audit SHA:** `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`.

## Source and behavior

Occurrence `environment:after-hours-emergency-department:code-blue`, source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#after-hours-emergency-department/features/1`: a mundane medical emergency competes for staff attention; the PC may help, exploit the distraction or let it complicate the supernatural problem.

`native-environment-scene.js` already records a source-bound medical emergency with contested staff attention and leaves PC response unselected. The unified GM prompt describes this exact handler. Activation adds no mechanics, PC choice, cost or new narrative restriction.

## Frozen change

Production: `bot/src/native-feature-definitions.json`, `bot/src/native-feature-catalog.js`, `bot/src/native-environment-capabilities.js`. Fresh test: `bot/tests/ai-gm-2026-10/p06-f08.test.mjs`; affected catalog assertions in `p06-f01.test.mjs`; existing feature tests P06-F04 through F07 run because shared catalog/capability modules change.

Only the exact source and existing `environment_code_blue` Action/spotlight/no-target/no-roll/zero-cost contract may expose it. Revert this occurrence descriptor, handler allowlist, capability guard and fresh test as one feature; preserve saved readers and receipts.
