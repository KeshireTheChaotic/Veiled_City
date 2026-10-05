# Veiled City Multiplayer Discord v3.2.0 — Validation Report

**Build date:** 2026-10-05

## Result
**PASS**

## v3.2.0 systems validated
- AI-assisted Level 1 character concept drafts validate the required trait spread, domains, Experiences, starting cards, structured hooks, and player/GM hook permissions before acceptance.
- Level-up planning/application validates sequential levels, tier achievements, advancement-choice limits, double-choice proficiency/multiclass advances, domain-card progression, and structured advancement history.
- Deterministic combat state persists individual adversary/minion HP, Stress, thresholds, conditions/effects, status, GM Fear, and non-binding spotlight counts in SQLite.
- Normal Duality rolls can mutate Hope/Fear/Critical resources deterministically; Reaction rolls are excluded from Hope/Fear generation and spotlight tracking.
- Campaign snapshots capture authoritative campaign state; rollback creates a safety snapshot first and restores the selected snapshot while preserving operational logs.
- Canon proposals are versioned; contradictory facts create pending conflicts and require explicit GM resolution instead of silent replacement.
- Downtime cycles/projects persist between sessions, respect visibility, accept deterministic state events, and record resolved world consequences.
- Rules rulings persist and the Rules Desk supports authority labels: RAW, Veiled City House Rule, Homebrew Content, GM Ruling, or Provisional Ruling.

## Compatibility / migration
- v3.1.3 SQLite → v3.2.0 migration test: **PASS**.
- Existing characters, sessions, party state, NPC proxies, private knowledge, encounters, and campaign data remain intact.
- New tables/columns are additive.

## Code / content checks
- `npm run check`: **PASS**.
- `npm run test:offline`: **PASS**.
- Veiled City content validator: **PASS**.
- Domain cards: **84**.
- Content Markdown files: **51**.
- Content JSON files: **10**.
- Final Daggerheart action handling uses freeform spotlight play; Veilkeeper's spotlight counters are advisory and do not create an initiative/action-token economy.

## Not exercised without user credentials
- Live Discord command registration/interactions.
- Live OpenAI character-draft, GM, rules, and downtime calls.
- Live private-channel/DM delivery.

Those require the user's Discord/OpenAI credentials and are intentionally excluded from offline validation.
