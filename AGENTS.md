# Instructions for repository agents

## High-priority project direction

Before making any major change to Veilkeeper behavior, architecture, mechanics, persistence, or multiplayer, read [Audience-First Specification](docs/Implementation_Plans/AUDIENCE_FIRST_SPEC.md). Treat it as high-priority project context across agents and future work. For AI-GM implementation, also read the detailed [owner behavior specification](docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md) as directed by the active phase instructions.

These four specifications are the core values of the project and override any other documentation when there are conflicts.
Before any major change, read the high-priority [Audience-First Specification](AUDIENCE_FIRST_SPEC.md). 
Before any major change, read the [Creative-First Specification](CREATIVE_FIRST_SPEC.md).
Before any major change, read the [Agency-Preserving Specification](AGENCY_PRESERVING_SPEC.md).
Before any major change, read the [Weighted-Lore Specification](WEIGHTED_LORE_FRAMEWORK.md).



## Coding rules
* Do not over-engineer or over-complicate the solution. Keep YAGNI in mind at all times. I am not impressed by complex code that does simple tasks, I am impressed by simple, secure, code that does the tasks I need"

1. In user-facing conversation, use terminology a domain-knowledgeable reader can understand without the session history. Prefer established terms over project- or session-local shorthand; repeated use alone does not justify abbreviation. When an exact label, code identifier, or mathematical symbol is needed for reference, make its meaning clear in the current explanation; do not use it as a substitute for the concept's name in ordinary discussion.
2. Treat uncertainty, failure, and underperformance as evidence, not automatic rejection. Before closing a path, distinguish demonstrated harm or impossibility from limits of the method, implementation, conditions, representation, or evidence; ask what could make it work or make the next attempt informative. 
3. A possible failure requires a plausible trigger and material impact grounded in a supported workflow, actor, scale, or deployment before disposition, but evidence alone does not expand the boundary.
4. Separate unrelated changes and justify them independently.

## Test and documentation hygiene
* After a test suite has passed, mark it complete and do not rerun it unless the tested code changes.
* Remove legacy test suites only after their covered code has been migrated and the replacement coverage has passed.
* Replace verbose Markdown progress history with a short description marked complete when the work is done.
* Load only the project context needed for the current task; do not carry the full project history into each task.

## Deliverable report per phase

Summarize: phase ID, delivered features, modified files, tests with real outcomes, known issues, deferred items, and next exact phase. Commit using a phase-specific message when git is available.
