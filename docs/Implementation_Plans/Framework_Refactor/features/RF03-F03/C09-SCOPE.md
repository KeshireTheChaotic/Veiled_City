# RF03-F03 corrective C09 — native action-consent term contract

Extract the existing pure bounded resource/participant validation and canonical consent-term projection from `action-consent.js` into a Daggerheart-owned factory. Preserve validation limits, error message/code, property names, sorting, and source/audience fields exactly. The existing provider retains all source, scene, principal, persistence, consent response, and transaction responsibilities and injects its established failure constructor.

Add a new focused test under `bot/tests/ai-gm-2026-10/` against the new implementation and provider call surface where feasible. Do not execute inherited tests. Run the frozen new test once with a blocking command, syntax-check changed JS/MJS, and run the RF03 boundary ratchet once. No DB, network, provider, gameplay, creative, or schema changes. Record exact outcomes and hashes in `C09-LEDGER.md`; rollback this extraction, export, test, and evidence as one unit.
