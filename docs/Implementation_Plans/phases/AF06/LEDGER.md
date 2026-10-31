# AF06 — Obsolete context consumer audit

**IN PROGRESS — current static audit complete, Agent C.** The current JavaScript scan finds 49 source-context occurrences: 27 adversary projectors and 22 environment facades. Their implementations occupy 24 candidate modules. The only external symbol consumer found is Daggerheart's public export surface (23 reference sites). No durable state-writer call was found in the candidate modules. Exact paths, symbols, source hashes and references are in CONTEXT-CONSUMERS.json.

Delivered files: `audit-context-consumers.mjs`, `CONTEXT-CONSUMERS.json`, this ledger. The script reads source text; it does not load the application, access campaign data or run inherited tests. Final execution **exit 0**. Its first attempt counted the public re-export as an environment facade and stopped at its inventory assertion (23 instead of 22); limiting facade discovery to native environment modules corrected the scan. No production behavior was changed by this audit.

Known limits: exact static symbols cannot prove runtime equivalence or exclude computed/external clients. The shared public export surface is concurrently involved in RF05/RF06 work. No code, authored content, old tests or historical readers were deleted. Professional Entry's separate native first-use/Advantage machinery is explicitly protected.

Next exact work: **AF06 shared native scene-consumer equivalence and ownership/export migration**, then remove only wrappers whose replacement and current consumers are verified. AF04 Null Foam remains separately pending the owner's area-definition decision. AF07 runtime/model qualification is unfinished; this audit is not release evidence.
