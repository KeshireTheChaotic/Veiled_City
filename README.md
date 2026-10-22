# Veiled City — Veilkeeper

A persistent, multiplayer Discord AI GM for an occult-noir Daggerheart campaign.
Players write naturally; the GM interprets the fiction; native services adjudicate
and record consequential outcomes. Characters, private knowledge and unfinished
stories survive between sessions.

## This development branch

**Implementation branch:** `codex/clean-ai-gm-2026-10` · **Implementation source SHA:** `20a6a13e83cc3b6a17187aaf195c5b16a71c421c`
**Application:** `0.0.0.1` ([package](bot/package.json)) · **SQLite schema:** `460`

This checkout implements the [clean AI GM plan](docs/Implementation_Plans/README.md), anchored at audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`. It is not an assurance about an installed production instance. Older document
titles such as v9.6 or v10 name design milestones, not this application version.
Targeted offline results are not full release qualification or evidence of live
narrative quality, latency or cost.

Start with the [setup and scope guide](docs/Setup_and_Scope/README.md) for operation
and the [latest implementation ledger](docs/Active_Implementation/NO_DEFERRALS_LEDGER.md)
for historical context only. That historical package is absent here; use the [current source crosswalk](docs/Implementation_Plans/CURRENT_SOURCE_CROSSWALK.md) and clean phase/feature ledgers for work, tests and blockers. Some supporting guides are pinned older
snapshots; the current source and latest ledger outrank their older status claims.

## Concept and authority

> Accepted typed intents are canonical adjudication inputs. Human declarations
> own intent. Native receipts own outcomes. GM narration projects authorized
> fiction; narration does not create its own authority.

The goal is expressive, responsive roleplay without requiring special phrases for
every action. Understanding contextual references is distinct from authorizing
travel, access, damage, custody, knowledge or consent. A player can attempt an
action without declaring its success. An NPC can threaten arrest without the GM
deciding that a PC surrenders.

| Conceptual scope | Responsibility and boundary |
| --- | --- |
| Semantic intent | Preserve exact authenticated declarations, actors, spans and dependencies. Questions, quotations and hypothetical wishes are not automatic commitments or capabilities. |
| Audience-first narration | Compose source-bound public and owner-private output. GM hooks, another PC's secrets and unverified reactions cannot become public facts. Held prose must not discard independent valid actions. |
| Unified GM arbitration | Make supported ordinary rulings and select source-pinned native actions through the combined GM turn. A model role, proposed receipt or feature name grants no execution authority. |
| Native mechanics | Resolve actual dice, Difficulty/Evasion, costs, conditions, damage, Armor and death through native services and authenticated choices. Optional spending and participation remain voluntary. |
| Persistent world | Store campaign memory, subjective NPC beliefs, evidence and continuity alongside identity, workflow and immutable effect receipts. Rumors are not canon; imported dossiers do not establish live presence or PC knowledge. |
| World Director | Connect bounded world proposals and scoped narrative evidence to native execution. Bidirectional integration is incremental, not a claim that the complete design is implemented. |
| Openings and assembly | Build privately entitled personal hooks and returning continuity; support late entries and delivery recovery. Attendance cannot force arrival, co-location, party membership or cooperation. |
| Recovery and operations | Preserve committed effects across retries/restarts. Revalidate queued payloads and recipients; never blindly resend uncertain Discord deliveries. |

See the [architecture](docs/Setup_and_Scope/RUNTIME_ARCHITECTURE.md),
[arbitration contract](docs/Active_Implementation/UNIFIED_GM_ARBITRATION.md) and
[security/privacy guide](docs/Setup_and_Scope/SECURITY_AND_PRIVACY.md).

For automatic openings and explicit, acknowledgement-preserving recovery, see the
[session assembly guide](docs/Setup_and_Scope/PARTY_ASSEMBLY.md).

Source verification is not a universal semantic proof of generated English.
Fresh GM-owned NPC/world prose uses a restricted authoring and audience boundary;
it must not establish protected PC outcomes. Newly generated prose still carries
residual semantic risk. Deterministic guards and regression corpora demonstrate
their tested boundaries, not perfect detection of every possible assertion.

### Appearance: two distinct lanes

Native-validated structured fields support authoritative visible observations.
Exact owner-attributed prose supports expressive self-description, but remains an
**unverified owner report**, not evidence of injuries, capabilities, another PC's
reaction or canon. Ownership proves authorship, not every clause's truth or safety.
Both lanes retain source and audience checks. See the
[N15 contract and residual semantic risk](docs/Active_Implementation/N15_APPEARANCE_CONTRACT.md).

## Implemented boundaries and unfinished scope

Existing pathways include character import/advancement, attendance and voluntary
parties, private channels, sourced roll requests and optional collaboration, NPC
standard attacks, bounded special features, evidence/canon review, memory,
assembly, diagnostics and durable publication. Each retains its own flags,
source, consent, rule and actor requirements. A flag is not blanket AI authority.

At this rebuild, the special-feature catalog contains **153 occurrences**:
**72 bounded supported**, **81 review-only**, and **0 needs-authoring**, using
**60 P06 handler families**. Standard actions are separate. Supported means the exact
documented adapter, not arbitrary variants or whole-release qualification.
See the [feature crosswalk](docs/Active_Implementation/UNIFIED_ARBITRATION_FEATURE_COVERAGE.md)
and [runtime catalog](bot/src/native-feature-definitions.json).

Current execution follows [P00 through P06](docs/Implementation_Plans/README.md) and the [owner behavioral specification](docs/Implementation_Plans/OWNER_AI_GM_BEHAVIOR_SPEC.md). The [source crosswalk](docs/Implementation_Plans/CURRENT_SOURCE_CROSSWALK.md) distinguishes existing pathways, changed-code evidence and unverified work. The 81 review-only catalog occurrences remain local execution holds; no generic adapter is implied. Full release qualification, live Discord/provider testing and deployment require separate authorization.

## Installation and setup

Use Node.js **22.16.0+**, npm, Git and writable persistent SQLite storage. A connected
bot needs a Discord application and provider account; FFmpeg is optional for voice.
Use an isolated development/staging checkout, not an unqualified production upgrade.

```powershell
git clone --branch main --single-branch https://github.com/KeshireTheChaotic/Veiled_City.git
Set-Location .\Veiled_City\bot
npm ci
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
```

Configure `.env` locally using [the example](bot/.env.example): Discord IDs/token,
provider credentials, `DATABASE_PATH`, `CONTENT_ROOT`, response mode and optional
features. Run npm commands from **`bot/`**. Keep credentials, SQLite/WAL/SHM files,
backups and private campaign data out of commits and shared logs.

See [installation](docs/Setup_and_Scope/INSTALLATION.md),
[Discord setup](docs/Setup_and_Scope/DISCORD_SETUP.md),
[provider setup](docs/Setup_and_Scope/OPENAI_SETUP.md) and
[content seeding](docs/Setup_and_Scope/CONTENT_SEEDING.md). Configure genuinely private
per-player and GM-only channels before delivering sensitive material.

### Offline development and qualification

For this initiative, follow [TEST_PROTOCOL.md](docs/Implementation_Plans/TEST_PROTOCOL.md) and [TEST_EXECUTION_NO_POLL.md](docs/Implementation_Plans/TEST_EXECUTION_NO_POLL.md). Run only fresh feature tests under `bot/tests/ai-gm-2026-10/` and changed-file syntax checks. Never invoke inherited tests, registries or broad validation. Delta evidence is not release certification.

`npm run register` changes Discord command registration. `npm start` connects the
bot and may incur provider charges. Use them only in an authorized environment
after qualification; run one bot instance per campaign database.

## Useful commands

Current registration uses **split `/vc-*` roots**, not `/vc <group>`; the latter
is only a compatibility path for stale registered schemas. Use Discord's picker
and the current [command definitions](bot/src/command-definitions.js) for required
options and JSON contracts. Registration is an external write, not an offline test.

| Player task | Entry points |
| --- | --- |
| Create/import/select an owned PC | `/vc-character create`, `/vc-character import`, `/vc-character select` |
| Register an owner-private channel | `/vc-player private-channel` |
| Check in / arrive / leave | `/vc-session present`, `/vc-session arrive`, `/vc-session leave` |
| Submit appearance material | `/vc-character describe` — structured or expressive lane, explicit visibility |
| Inspect pending dice and private options | `/vc-roll pending`, `/vc-roll menu`, `/vc-roll result` |
| Resolve an owned native choice | Current private controls or `/vc-roll contribute`, `/vc-roll window`, `/vc-roll effect` |
| Ask rules / inspect entitled knowledge | `/vc-rules ask`, `/vc-intel recap`, `/vc-intel facts`, `/vc-intel clues` |

| GM/admin task | Entry points |
| --- | --- |
| Configure channels / inspect health | `/vc-campaign setup`, `/vc-campaign channels`, `/vc-admin doctor` |
| Seed data / inspect inferred drafts | `/vc-admin seed-data`, `/vc-admin seed-drafts` |
| Start / inspect assembly | `/vc-session start`, `/vc-session assembly-status`, `/vc-session assemble` |
| Inspect source-bound operations | `/vc-story expansion-status`, `/vc-story ai-inbox`, `/vc-admin ops` |
| Inspect flags / delegation | `/vc-city status`, `/vc-city flags`, `/vc-story delegation` |
| Inspect / pause Director | `/vc-director status`, `/vc-director history`, `/vc-director pause` |
| Back up / inspect archival | `/vc-admin backup`, `/vc-admin archive-history` — preview first |

An invocation or invitation is not owner approval. Use current keys/revisions;
inspect stale choices rather than replaying effects. Guided PvP and incoming
attacks retain native consent, defense, Armor and death controls. Roleplay remains
text-first, not a requirement to encode every action as JSON.

Owner safety stop (works even while absent or while the GM is generating):
`/vc-roll pvp json:{"op":"safety-stop","character_id":"YOUR_CHARACTER_ID"}`.
This immediately holds unfinished hostile PvP effects, including related NPC
Fear attacks, without reversing saved outcomes. The stop is sticky; a GM cannot
override it. Independent actions remain available.

GM-only campaign policy: `/vc-roll pvp json:{"op":"campaign-mode","enabled":true}`
or `{"op":"campaign-status"}`. It defaults disabled. Saving policy does **not**
activate an unqualified non-bilateral effect route or waive existing native
consent, Armor, optional-cost or death controls. See the
[owner-approved PvP/Fear contract](docs/Active_Implementation/PVP_CAMPAIGN_AND_PRE_ROLL_FEAR_CONTRACT.md).

The first native pre-roll Fear route reserves1 existing campaign Fear for one
legal standard NPC attack before an existing unrolled request. Exact private
delivery acknowledgement, owner defenses/Armor/death choices and native terminal
receipts gate resumption. GM-only reviewed recovery uses the existing
`/vc-roll effect` JSON interface; see [Fear lifecycle and recovery](docs/Active_Implementation/PRE_ROLL_FEAR_IMPLEMENTATION.md).
This does not enable the unfinished non-bilateral PvP executor or other feature adapters.

For workflows, see [assembly](docs/Setup_and_Scope/PARTY_ASSEMBLY.md),
[GM operations](docs/Setup_and_Scope/GM_OPERATIONS.md),
[command map](docs/Setup_and_Scope/BOT_COMMANDS.md) and
[deployment/rollback](docs/Setup_and_Scope/DEPLOYMENT.md).
Optional voice narrates authorized output, never private records or new outcomes;
settings are in [the environment example](bot/.env.example).

## Repository map

- [`bot/src/`](bot/src/) — native authority, interpretation, publication and Discord adapters.
- [`bot/scripts/`](bot/scripts/) — offline regressions, validation and release tooling.
- [`content/`](content/) — setting/rules inputs; import and visibility rules still apply.
- [`docs/Setup_and_Scope/`](docs/Setup_and_Scope/README.md) — operator-facing setup and product scope.
- [`docs/Active_Implementation/`](docs/Active_Implementation/README.md) — contracts, active plans and evidence.
- [`manifest.json`](manifest.json) — normalized release-file inventory, not deployment proof.

Keep immutable native outcomes and delivery receipts on upgrades. Recovery must
not repeat dice, resource spending or messages.
