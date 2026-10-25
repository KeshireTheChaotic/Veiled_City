# RF05-F04 C09 — Intent decision-advisory public boundary

## Objective

Move the existing decision-advisory implementation into `frameworks/intent/decision-advisory.js`, publish its contracts through Intent's public API, and switch the GM and turn-commit workflow to that public interface. Retain `bot/src/decision-advisory.js` as an unchanged-behavior compatibility re-export. Preserve the injected database parameter; the Intent implementation imports no application or persistence module.

## Behavioral and authority contract

Preserve all schema values, prompt-compaction behavior, query results, validator conditions, diagnostics, error text, and return values. The advisory remains GM-private and advisory only; it never authorizes a roll, PC intent, consent, mechanical outcome, mutation, or receipt. Native adjudication, Daggerheart rules, player authority, and transaction handling remain unchanged.

Retire only exact direct-import transitions `c68d2ed4dcedd5fc7841e88cfa427f0fea8b7777c3026cd2ea9c019d1de66bbf` (GM) and `c0781b4074f000b11290a1671eaa926ec868bae1ff4f88cb70bc83d038522d09` (turn orchestration) after both callers use the Intent public API. Preserve both original records. Retain the root compatibility path and its existing source-location assignment.

## Verification

Create a fresh test at `bot/tests/ai-gm-2026-10/rf05-f04-c09.test.mjs` that imports real `GMService` and `commitGmTurn`, checks public/compatibility export identity and supported advisory behavior, and verifies both callers use Intent public. Freeze and run one blocking union containing this test and all fresh tests affected by changes to `gm.js` or `turn-orchestration.js`. Syntax-check changed JavaScript/MJS and run the RF05 architecture ratchet. No inherited tests, broad validation, network, production data, providers, or polling.

## Exit evidence

Record hashes, exact test and architecture outcomes, remaining RF05-F04/F05 assignments, current root compatibility hold, costs, rollback, and release status. This slice does not complete either feature or RF05.
