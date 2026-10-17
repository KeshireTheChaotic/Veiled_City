# Veiled City — Setup & Scope Documentation

**Current source:** [`codex/audience-first-narrative-v9`](https://github.com/KeshireTheChaotic/Veiled_City/tree/codex/audience-first-narrative-v9), pinned audit commit `014bc39dadd4035b43649c2c24ef3508939b1c40` (2026-10-17 review). Application `0.0.0.1`; SQLite schema `460`.

This package is the **current-usage reference**, not a release artifact, installed software, or a claim that this commit passed a whole-branch production gate. It contains setup, product/authority scope, user workflows and operational safeguards. It does not include past proposals, milestone plans, old release receipts, or work-in-progress feature implementations. The separate **Active Implementation** ZIP owns that backlog.

## Reading order

1. [PROJECT_SCOPE.md](PROJECT_SCOPE.md) — what the bot does, authority boundaries, supported versus partial behavior.
2. [INSTALLATION.md](INSTALLATION.md) — development checkout and first-start sequence.
3. [DISCORD_SETUP.md](DISCORD_SETUP.md) and [OPENAI_SETUP.md](OPENAI_SETUP.md) — external services and private settings.
4. [CONTENT_SEEDING.md](CONTENT_SEEDING.md) — content import, ownership and review.
5. [PARTY_ASSEMBLY.md](PARTY_ASSEMBLY.md) and [BOT_COMMANDS.md](BOT_COMMANDS.md) — first session and command entry points.
6. [GM_OPERATIONS.md](GM_OPERATIONS.md), [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md), [DEPLOYMENT.md](DEPLOYMENT.md) — ongoing operation and safe promotion.
7. [RUNTIME_ARCHITECTURE.md](RUNTIME_ARCHITECTURE.md) — source of truth and subsystem flow.
8. [DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md) — scope and checks for this rebuild.

## Source-of-truth precedence

Live source and registered commands in the pinned commit outrank explanatory Markdown. Saved native proof and applicable rule/consent gates outrank model prose. Do **not** interpret these instructions as permission to turn on features, access a production database, push to GitHub, or deploy. Reinspect the exact checkout and its operational state first.
