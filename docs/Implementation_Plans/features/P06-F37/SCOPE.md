# P06-F37 — Enable Aster Vale Everything Logs

Status: SUPPORTED / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `c54a1d7542745264e6b88ce09a69fdb512014eca`.

Exact occurrence: `environment:aster-vale-predictive-lab:everything-logs`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#aster-vale-predictive-lab/features/0`; source SHA-256 `022ababfeaf115f5d40a58afc5597987dc63ff0c6d9b500b6ea91b52914624f5`; template SHA-256 `c6f1814ce1c763b7b63f7386b593aa3365d7a47ad43f245503f68a12118932ee`.

The existing native adapter records the exact intrusion classification before a player-owned action roll, opens its private trace response only after an actual failure, and gives the affected authenticated owner the choices to leave the trace, optionally spend exactly 1 Hope, or use a source-backed suppression action. Existing ancestry, replay and privacy checks remain authoritative. No roll result, Hope expenditure, suppression or PC intent is inferred.

Scope is limited to qualifying the existing occurrence and HR14 handler registry, contract validation, and fresh tests proving source, current dispatch and saved-reader wiring. No new narrative restriction is proposed. No legacy tests or fixtures, broad runner, provider/model judge or live service.
