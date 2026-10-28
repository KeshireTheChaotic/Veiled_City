# RF04-F05 C162 — Narrative and Publication read World simulation receipts through fixed ports

Base b6f3b167. Narrative director source prepares World simulation observations through the Narrative-owned narrativeWorldSimulation port and native outcome output reads audience-scoped World receipts through the Publication-owned publicationWorldReceipts port (new publication--world adapter); the World simulation receipts root shim is retired.

Rollback: Revert only the C162 commit: restore bot/src/world-simulation-receipts.js, the native-outcome-output.js and narrative-director-source.js imports, repointed tests, BRIDGE_CONTRACTS.json and PACKAGES.json, drop the publicationWorldReceipts and narrativeWorldSimulation ports, the publication--world adapter and initializePublicationWorld, and restore the transitions from C162-RETIRED.json.
