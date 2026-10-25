# RF04-F06 ledger — private and hidden source boundaries

**Status:** SCOPED / OFFLINE PRIVACY ACCEPTANCE QUALIFIED.  
**Base HEAD:** `a7d9eebda21fce4a4065f1da638e23108950cf8c`.  
**Scope:** See `SCOPE.md`.

Selected changed-code contract: Narrative context assembly from the P03 extraction, existing native owner source validation, and P02 recipient-bound audience grant/revalidation. A two-owner disposable-SQLite acceptance fixture will establish per-owner private facts and a GM-only fact, then verify what is and is not included in the player context and whether a different owner or stale source can obtain it.

Fresh test `bot/tests/ai-gm-2026-10/rf04-f06-private-source.test.mjs` passed **1/1**, exit **0**, TAP duration **717.5207 ms**. It uses a disposable SQLite campaign, two present owners, an Ada-owned private input, separate private Ada/Noor facts, and a GM-only fact. The actual Narrative context contains only Ada's fact and is bound to Ada's private recipient; Noor cannot reuse Ada's source; the GM-only explanation remains absent; retraction prevents saved grant revalidation; both character records remain byte-for-byte unchanged. Syntax passed for the new MJS test, `git diff --check` passed, and the RF04 architecture ratchet passed: 566 modules, zero unowned, 2722 imports, largest SCC 181, 2442 accepted legacy occurrences, zero active groups and zero transition errors. Exact hashes and logs: `F06-RUN.json` and `phases/RF04/f06-private-source-*.log`.

This qualifies the exercised offline source/privacy cases only; it does not test a live provider, Discord publication, every source kind, or semantic quality. No production code changed in this feature. Providers 0, tokens 0, USD $0; Codex usage UNMEASURED. Rollback removes this test and evidence. Existing production code under test remains from C03-P02/P03. RELEASE NOT AUTHORIZED. Next exact work: continue RF04-F07 qualification after auditing which additional supported source/publication boundaries are still unverified.
