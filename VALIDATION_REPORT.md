# Veiled City Multiplayer Discord v3.5.4 — Validation Report

## Release scope

v3.5.4 adds durable private-player canon proposals. An explicit request in a configured player-private GM channel to establish a statement as campaign canon is no longer left as conversational narration: Veilkeeper emits structured `canon_proposals`, records the proposal in the existing `canon_proposals` queue, confirms privately that canon itself was not changed, and attempts to notify the configured GM log. A blocked private `canon` mutation is also converted to a proposal when its key/value can be preserved safely.

## Production validation

- **JavaScript syntax:** PASS for bot source and test scripts.
- **Discord command schema:** PASS — 20 root commands; `/vc-canon` remains below Discord's 8,000-character command-schema limit.
- **Offline campaign smoke suite:** PASS.
- **Production regression suite:** PASS.
- **Private player canon proposal regression:** PASS.
  - Explicit private canon intent triggers structured corrective retry when the model omits a proposal.
  - Proposal remains pending and does not mutate the canon ledger.
  - Proposer/source metadata is persisted.
  - Exact repeated proposals deduplicate to the existing queue row.
  - Proposal appears through the same backing queue used by `/vc-canon proposals`.
- **v3.5.3 → v3.5.4 database migration:** PASS against a v3.5.3-created SQLite database; existing proposal data was preserved and the new metadata columns were added automatically.
- **Content package validator:** PASS — 84 domain cards, 53 content Markdown files, 10 content JSON files.
- **Content manifest:** PASS — 64/64 entries hash-verified.
- **Package JSON parsing:** PASS — all packaged JSON files parsed successfully.
- **Transient/secret scan:** PASS — no `.env`, runtime SQLite database, log, `node_modules`, or test-double files are included.

## Canon-proposal behavior validated

1. A private player may explicitly request a durable campaign-canon statement.
2. Veilkeeper does **not** write the request directly to global canon.
3. The proposal is associated with the acting player character and stored with source user/session/channel/message metadata.
4. The player receives application-generated proposal ID/status confirmation.
5. The configured GM log receives a detailed player-canon-proposal notice.
6. If GM-log delivery is unavailable, the proposal remains durable and Veilkeeper records a state-error fallback reference rather than claiming successful notification.
7. Human GM review remains `/vc-canon proposals` → `/vc-canon proposal-resolve`.
8. Contradictory accepted proposals continue through the existing canon-conflict workflow.

## Deployment note

The `/vc-canon proposals` and `/vc-canon proposal-resolve` Discord descriptions were generalized from imported-only proposals to all canon proposals, so run `npm run register` once after upgrading.

The external npm/OpenAI/Discord SDK packages were not downloaded during this isolated package audit; internal regression execution used minimal SDK test doubles only where required. The dependency set is unchanged from v3.5.3. On the connected production host, run `npm install`, `npm run audit:prod`, `npm run check`, `npm run test:offline`, and `npm run test:production` before restart.

**Release verdict: production application/package validation PASS, pending the normal connected-host dependency audit and live Discord smoke test.**
