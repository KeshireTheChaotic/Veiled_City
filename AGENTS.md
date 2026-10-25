# Instructions for repository agents

## Coding rules
* Do not over-engineer or over-complicate the solution. Keep YAGNI in mind at all times. I am not impressed by complex code that does simple tasks, I am impressed by simple, secure, code that does the tasks I need"

1. In user-facing conversation, use terminology a domain-knowledgeable reader can understand without the session history. Prefer established terms over project- or session-local shorthand; repeated use alone does not justify abbreviation. When an exact label, code identifier, or mathematical symbol is needed for reference, make its meaning clear in the current explanation; do not use it as a substitute for the concept's name in ordinary discussion.
2. Treat uncertainty, failure, and underperformance as evidence, not automatic rejection. Before closing a path, distinguish demonstrated harm or impossibility from limits of the method, implementation, conditions, representation, or evidence; ask what could make it work or make the next attempt informative. 
3. A possible failure requires a plausible trigger and material impact grounded in a supported workflow, actor, scale, or deployment before disposition, but evidence alone does not expand the boundary.
4. Separate unrelated changes and justify them independently.

## Deliverable report per phase

Summarize: phase ID, delivered features, modified files, tests with real outcomes, known issues, deferred items, and next exact phase. Commit using a phase-specific message when git is available.
