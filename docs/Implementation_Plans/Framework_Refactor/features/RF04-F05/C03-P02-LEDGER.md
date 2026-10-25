# RF04-F05 C03-P02 — Narrative-owned audience grant adapter

**Status:** SCOPED PREREQUISITE QUALIFIED; C03 remains locally held.  
**Base HEAD:** `06140bf600fb3cd8982eb8f45b4bc54977d0652b`.  
**Scope:** Move the existing opaque grant authority and native grant/revalidation adapter into Narrative-owned modules, keep existing import paths as compatibility readers, and inject the existing native context/hash/failure functions. This was an API ownership extraction only. It did not change audience policy, recipients, Daggerheart mechanics, creative behavior, state, persistence, or publication.

The new `audience-authority.js` retains the existing frozen proof, WeakMap issuance, recipient checks and audience-surface mapping. `native-audience-grant.js` retains registered-context snapshots, audience selection, proof construction, revalidation and stale-source rejection while receiving context construction/hash/failure as injected functions. `frameworks/narrative/public.js` exports the new APIs. `audience-first-capability.js` and `audience-native-v9.js` remain compatibility readers that use the Narrative-owned implementations.

Fresh test `bot/tests/ai-gm-2026-10/rf04-f05-c03-p02.test.mjs` passed **1/1**, exit **0**, TAP duration **506.2793 ms**. It exercises the exported capability, legacy export identity, unregistered context rejection, wrong audience, opaque grant inspection, owner-bound private grant, party/channel grant, revalidation, stale source hash, wrong guild/scope, missing recipient rejection and required injected dependencies. Changed-file syntax checks passed for all five changed production modules and the fresh test (exit 0). `git diff --check` passed (exit 0).

RF04 architecture ratchet passed (exit 0): **565** source modules, **0** unowned, **2720** imports, largest cycle **181**, **2442** accepted legacy occurrences, **0** active violation groups and **0** transition errors. Terminal output and source/test hashes are in `C03-P02-RUN.json`; concise test and architecture outputs are in `phases/RF04/f05-c03-p02-test.log` and `f05-c03-p02-architecture.log`.

No provider or Discord calls, tokens, or spend: **0 / 0 / $0**. Codex usage: **UNMEASURED**. Rollback by restoring the two original module bodies and removing the two Narrative implementations and their public exports, test, and evidence together. Preserve the five pre-existing owner edits in the working tree.

**Unresolved C03 prerequisite:** Context construction/source authorization still uses legacy-owned code, and bootstrap-reached Narrative–World application composition is not established. No `narrative--world` adapter or workflow adoption is claimed. This extraction alone does not qualify cross-framework operation. **RF04 remains incomplete; RELEASE NOT AUTHORIZED.** Next exact step: scope and inspect C03-P03 for the remaining native context/source boundary, without changing gameplay behavior.
