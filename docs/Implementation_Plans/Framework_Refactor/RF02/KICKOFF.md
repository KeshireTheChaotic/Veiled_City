# Veiled City — RF02 Implementation Kickoff
**Assigned model:** Codex Sol 6.1 Medium  
**Initiative:** Framework Isolation  
**Phase:** RF02 — Pure and Low-Coupling Framework Migration  
**Repository:** `KeshireTheChaotic/Veiled_City`  
**Target branch:** `codex/clean-ai-gm-2026-10`  
**Last inspected HEAD:** `bd85d23da791285dbcc75ffdd6552e1d3a6dfdfd`

## Mission

Implement RF02-F01 through RF02-F06 of the established Framework Isolation refactoring plan.

**Owner authorization:** The RF02 implementation hold is lifted. You are authorized to perform the necessary local source changes, create new framework modules and integration adapters, update imports, write fresh tests, update documentation, and create local checkpoint commits for RF02.

Do not begin RF03 or later phases. Do not push, open pull requests, merge, deploy, restart production, access production databases, trigger CI, or spend on AI provider calls without separate authorization.

The objective is to physically migrate low-coupling modules into their designated frameworks while proving that the new architectural boundaries work without changing application behavior.

This is a **behavior-preserving structural refactor**, not a gameplay redesign.

## 1. Mandatory preparation

Before modifying implementation code:

1. Verify the actual branch, HEAD, worktree status, and uncommitted changes. Preserve all owner changes. The inspected SHA is a reference, not a reset target.
2. Read the root `AGENTS.md` and follow its four collaboration principles.
3. Read the complete owner AI GM behavior specification and complementary ENGINE constitution.
4. Read the current implementation test protocol, no-test-polling policy, and decision gates.
5. Read the Framework Refactor master handoff, RF00 findings, RF01 closeout, architectural rules, ownership manifest, dependency graph, bridge registry, migration crosswalk, and transition baseline.
6. Inspect the actual source, exports, consumers, module-level state, path dependencies, and resource loading behavior before moving each module.

Create the following RF02 documentation before implementation:

- `docs/Implementation_Plans/Framework_Refactor/phases/RF02/SCOPE.md`
- `docs/Implementation_Plans/Framework_Refactor/phases/RF02/LEDGER.md`
- Independent `SCOPE.md` and `LEDGER.md` files for RF02-F01 through RF02-F06, created as their features become active.

Do not overwrite historical RF00/RF01 evidence or P-series implementation records.

## 2. Mandatory architecture rules

Every source module must have exactly one accountable framework owner.

Framework implementations may import their own internals, approved external dependencies, and genuinely domain-neutral kernel primitives.

Cross-framework functionality belongs exclusively in:

`bot/src/framework-to-framework/<framework-a>--<framework-b>/`

Pair names must use alphabetical ordering.

Frameworks communicate through consumer-owned ports and injected capabilities. Pair integrations may reference only the public APIs of their two declared frameworks.

Workflows combining three or more frameworks belong in `application/workflows/` and must remain thin coordinators.

**Do not permit:**

- Direct implementation imports across framework boundaries.
- Shared domain logic hidden in generic utility modules.
- Circular dependencies introduced or preserved as a shortcut.
- Third-framework dependencies inside two-framework integrations.
- Duplicate runtime singletons, authorization grants, or module instances.
- Permanent compatibility facades.
- Broad architectural exceptions or expansion of the RF01 legacy baseline.
- Changes to Daggerheart rules, GM behavior, character agency, or narrative authority merely to simplify restructuring.

A module relocation and behavioral decomposition must be separate, reviewable changes wherever practical.

## 3. RF02 implementation features

### RF02-F01 — Kernel and generic primitives

Identify and relocate genuinely framework-neutral utilities.

Review `errors.js`, `serial-queue.js`, and applicable shared primitives.

Separate domain-specific error classification and legacy-message policy from reusable error classes before relocation.

Preserve exception names, codes, serialization, stack behavior, module identity, and relevant public interfaces.

Do not move campaign-specific authority or source-validation logic into the kernel.

### RF02-F02 — Content framework

Relocate content indexing, package loading, manifest handling, and associated pure catalog utilities.

Preserve:

- `CONTENT_ROOT` resolution.
- `import.meta.url` behavior.
- Relative asset paths.
- Content manifest compatibility.
- Existing content data and parsing semantics.

Test real relocated path resolution through fresh offline fixtures.

Do not rewrite campaign content.

### RF02-F03 — Operations framework

Relocate appropriate logging, metrics, diagnostics, tracing, and operational monitoring modules.

Preserve metric names, event shapes, redaction behavior, timing semantics, and diagnostic output contracts.

Keep framework-specific business decisions outside the Operations framework.

Observability must not become a hidden dependency allowing frameworks to bypass their declared interfaces.

### RF02-F04 — Character framework

Relocate pure character-related functionality, including appropriate portions of:

- Character import/export.
- Advancement calculations.
- Character data validation.
- Character presentation and serialization.

Separate functionality that genuinely belongs to Daggerheart mechanics, persistence, narrative authorization, or other frameworks.

Use consumer-owned interfaces and precisely named framework-to-framework adapters where required.

Preserve existing character package formats, advancement rules, identities, ownership boundaries, and historical compatibility.

Do not modify gameplay balance or character creation rules.

### RF02-F05 — Discord transport helpers

Relocate self-contained Discord utilities, including appropriate portions of:

- Message chunking.
- Channel privacy helpers.
- Interaction lifecycle handling.
- Transport-specific response utilities.

Maintain existing public interfaces and delivery semantics.

Preserve interaction acknowledgment behavior, source/recipient checks, timeout handling, and private-channel protections.

Do not rewrite the main command dispatcher or publication pipeline. Those larger decompositions belong to RF06.

### RF02-F06 — Verification and phase closeout

Validate every completed RF02 migration.

Run the executable architecture checker, fresh changed-code-specific tests, and changed-file syntax checks.

Remove resolved transition records and temporary compatibility facades in the same feature that resolves them.

Record remaining architectural debt, newly introduced framework interfaces, measured dependency changes, and any unresolved migration obligations.

Close RF02 only when its documented exit criteria are satisfied.

## 4. Required migration procedure

For each individual feature:

1. Inspect the module and all relevant reverse dependencies.
2. Verify its intended owner against the RF00 ownership manifest.
3. Determine whether it can be safely moved or first requires domain separation.
4. Implement the minimum necessary framework ports and pair integrations.
5. Move the module and update affected import paths.
6. Preserve one authoritative runtime module identity.
7. Update the exact corresponding RF01 transition records without increasing the frozen debt baseline.
8. Author new focused tests exercising the changed code and paths.
9. Run the appropriate frozen test batch without polling.
10. Run architectural enforcement and changed-file syntax checks.
11. Record actual results, remaining violations, rollback instructions, and resulting local commit SHA.

Do not silently expand scope to unrelated modules.

If a module's dependencies make isolation unsafe within RF02, document the concrete obstruction and its owning future feature. Continue independent safe migrations.

## 5. Testing restrictions

Follow the repository's existing fresh-test-only protocol.

- Author newly created RF02 tests under `bot/tests/ai-gm-2026-10/`.
- Test only code modified for RF02, using freshly authored test fixtures and controlled dependencies.
- Do not execute, import, copy, modify, or repurpose historical test suites or golden fixtures.
- Do not run the old broad validation commands.
- Use temporary disposable storage and mocked Discord/provider interfaces where necessary.
- Never poll, watch, or repeatedly inspect running tests.
- Record the actual test command, exit code, counts, failures, duration, and source/test hashes.

Use the RF01 architecture checker:

`npm --prefix bot run architecture:check`

Use the applicable phase-aware boundary enforcement with RF02 expiry rules.

The strict architecture gate may still fail because later phases have unresolved legacy dependencies. Do not represent that expected remaining debt as a completed migration or silently suppress it.

Any newly introduced architectural violation must be resolved before closing its feature.

## 6. Non-negotiable behavioral preservation

Veilkeeper must continue operating as an Audience-First, Creative-First, Agency-Preserving AI Game Master.

Preserve:

- Player ownership of PC actions, speech, feelings, intentions, and choices.
- Native Daggerheart adjudication and truthful dice results.
- Source-qualified narrative and independent NPC behavior.
- Autonomous world simulation and persistent continuity.
- Public, player-private, and GM-private information boundaries.
- Existing SQLite schema and authoritative transaction semantics.
- Durable receipts, outbox idempotency, and recovery guarantees.
- Current startup, command registration, and package execution contracts.

No new narrative restrictions, pacing constraints, or gameplay behavior changes are authorized.

## 7. Execution and reporting

Use Sol 6.1 Medium as the primary architect and implementer.

Work serially through RF02-F01 to RF02-F06. Continue through independently safe features without routine owner confirmation.

Keep individual changes reviewable and use local checkpoint commits.

Only stop the affected work for a concrete unresolved architectural, authority, privacy, or data-integrity risk. Escalate owner decisions where the existing protocols require them.

At completion, return:

- Actual branch and final local HEAD SHA.
- RF02 phase and feature completion status.
- Old-to-new module relocation summary.
- New interfaces and framework integration packages.
- Architectural violations and dependency-cycle changes.
- Temporary compatibility facades and removal deadlines.
- Fresh tests actually executed and their results.
- Existing behavior that remains unverified.
- Local holds, blockers, and rollback instructions.
- Explicit confirmation that RF03 was not started and deployment was not performed.

**RF02 is complete only when actual module migrations establish valid framework boundaries, newly affected code passes its permitted checks, and observable behavior remains consistent with the original contracts to the extent tested.**

Begin RF02-F01 after verifying the current checkout and required documentation.