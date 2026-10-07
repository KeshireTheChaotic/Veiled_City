# Veiled City Multiplayer Discord v3.5.0 — Production Validation Report

**Validation date:** 2026-10-07  
**Release verdict:** **PASS — application/package release validated**, with the deployment advisories at the end of this report.

## Release scope

v3.5.0 adds three autonomous GM/world-director layers while preserving the v3.4.1 serialized/atomic state model:

1. **End-of-player-round director cadence** — one opportunity after every currently present player controller has completed at least one GM-resolved party action. This is pacing, not initiative.
2. **Scene-transition director** — runs when the mandatory turn review detects a genuine scene boundary. Party transitions are public/world scoped; private transitions use the acting character's private context and stay private scoped.
3. **Extended in-game mechanical downtime director** — runs only when a GM explicitly resolves a downtime cycle and advances the world according to the represented fictional interval, never real-world elapsed time.

The release also adds mandatory post-turn state review, blocked-action disclosure, durable party director passes, director status in `/vc-campaign status`, and additional player-safe export hardening.

## Confirmed behavior

### Autonomous director cadence

- Round cadence counts unique currently present/late/guest player controllers, including active NPC-proxy controllers who are present.
- It does not impose action order, block repeated actions, or expose initiative-style turns.
- A real scene transition supersedes a pending round pass from the same cadence, preventing two world moves for one boundary.
- Party round/scene passes are persisted in `sessions.director_state_json` before execution.
- A failed generation/state attempt leaves the pass pending for a later player turn rather than silently dropping it.
- A pre-existing failed pending pass is attempted at most once during a later player message; it is not charged/retried again at the end of the same message.
- Director output may legitimately be `act=false`; `act=false` with state/narration output is rejected.

### Scene transitions and privacy

- Normal AI turns must classify scene continuity as `continue` or `transition`; transitions require a non-empty scene label.
- Party scene transitions invoke the party/world director.
- Private scene transitions invoke a separately scoped scene director.
- The exact selected player character/NPC assignment is forwarded to the private scene director, preventing context drift for users controlling multiple roles.
- Private scene director context includes the acting character's private transcript/facts.
- Private scene labels are not copied into party director state.

### Extended in-game downtime

- `/vc-downtime resolve` remains a human GM trigger and remains prohibited during an active session in the current command model.
- Player-project resolution and autonomous world movement are separate AI passes.
- Both AI results are generated before authoritative state commit.
- Project and world-director mutations commit together inside one SQLite transaction.
- A model/API failure cannot leave the downtime cycle half-resolved.
- The downtime director prompt explicitly forbids using real-world elapsed time as an advancement trigger.
- A no-active-session downtime director regression test passes.

### Mandatory post-turn state review

Every normal AI GM turn must account for:

- facts/clues
- PC resources
- clocks
- threads
- NPC/location references
- relationships
- handouts
- canon
- Veil Exposure
- scene continuity

Each state category must be `changed` or `no_change` with a reason. Application code cross-validates the review against emitted structured mutations. A mismatch gets one corrective state-review response pass; a still-inconsistent replacement is rejected before authoritative mutation.

Regression tests confirm that narration/state cannot claim a clock change while the review says `no_change`, nor claim a changed category without a corresponding structured mutation.

### Blocked-action disclosure

Private scope guards now block, rather than apply, prohibited actions including:

- direct private-scene writes to global canon;
- direct private-scene changes to global Veil Exposure;
- private resource changes targeting another player/character;
- private relationship changes targeting another PC;
- generated private side-messages outside the allowed recipient scope.

For blocked actions with an acting player:

- the player receives a sanitized private scope-guard notice;
- the configured GM log receives the detailed blocked action/reason;
- if the required player-private notice cannot be delivered, that delivery failure is added to the GM notice;
- the block is recorded in the audit log.

Regression coverage confirms the player-facing canon warning does not reveal the blocked canon key/value while the GM-facing description retains the relevant key.

Blocked scoped actions do not force otherwise-valid consequences to roll back. A regression test confirms that a valid private fact commits while a prohibited global-canon event in the same generated turn is refused.

### Existing state-safety guarantees retained

- GM turns remain serialized per Discord guild.
- Authoritative generated mutations remain atomic.
- Discord publication happens after state commit.
- Publication failures do not invite unsafe replay of already-committed turns.
- Deterministic encounter/combat state remains outside autonomous director authority.
- Canon contradictions continue to create human-GM conflicts instead of silently replacing canon.
- Player character death/retirement remains human-controlled.
- Dice results remain application-controlled; the model is instructed not to invent rolls.

## Privacy hardening found during this audit

The CLI `player` campaign export was tightened while validating v3.5.0:

- `export_version` is now `3.5.0`.
- Player-safe session records exclude `assembly_plan_json` and `director_state_json`.
- Player-safe canon export now uses only `public`/`party` current canon instead of a broad `visibility != gm` predicate.

A targeted export regression verified that GM assembly notes, internal director state, and GM-only canon do not appear in the player-safe export.

Party/world generated private messages are now limited to active (`present`, `guest`, `late`) session recipients rather than any roster row.

## Migration validation

A database created with the **v3.4.1** code/schema was opened with **v3.5.0**.

Result: **PASS**

- existing campaign/session remained readable;
- startup automatically added `sessions.director_state_json`;
- migrated director state initialized to round 1 / scene 1 / no pending pass;
- no manual SQL migration is required.

## Automated validation results

### JavaScript/source + command schema

`npm run check` — **PASS**

- all checked JavaScript modules parse;
- `src/director.js` is included in the syntax gate;
- Discord command schema validator: **20/20 root commands PASS**;
- every root command remains below the 8,000-character registration limit.

### Offline campaign smoke suite

`npm run test:offline` — **PASS**

Covers the existing campaign persistence/import/export/canon/relationships/encounter/downtime/handout/narrative behaviors inherited from prior releases.

### Production regression suite

`npm run test:production` — **PASS**

Includes retained v3.4.1 state/voice/concurrency tests plus v3.5.0 coverage for:

- mandatory review completeness/cross-validation;
- corrective review retry;
- round cadence;
- scene-over-round precedence;
- durable director state transitions;
- private scene director transcript context;
- explicit in-game downtime director with no active session;
- prohibited private canon/resource/Veil Exposure handling;
- safe coexistence of blocked and valid private mutations;
- sanitized blocked-action description;
- private reference isolation;
- guild turn serialization;
- voice ordering, capacity reservation, relocation permissions, repeat cooldown;
- voice startup config validation.

### Content validation

`python content/ENGINE/validate_package.py` — **PASS**

- Domain cards: **84**
- Markdown files: **53**
- Content JSON files: **10**

### JSON and content manifest

- All package JSON files outside temporary audit dependencies: **12/12 parse successfully**.
- Existing content manifest: **64/64 files hash/size verified**.

### Player-safe CLI export privacy regression

**PASS**

Targeted generated export contained neither internal assembly plan/director state nor GM-only canon.

## Packaging/security checks

The final release packaging process excludes:

- `.env`
- SQLite databases / WAL / SHM files
- logs and temporary files
- `node_modules`
- temporary audit SDK doubles
- Python cache files

`bot/.env.example` contains empty credential placeholders only. A literal `sk-...` string in `docs/OPENAI_SETUP.md` is documentation placeholder text, not a credential.

The root release manifest is regenerated after all final files are written and is verified again from the finished ZIP.

## Deployment advisories

### 1. npm lockfile

The audit environment could not maintain npm-registry connectivity long enough to generate a complete transitive `package-lock.json`. Direct dependencies in `bot/package.json` remain pinned to exact versions.

On the first network-connected deployment:

```bash
cd bot
npm install
```

Retain the generated `package-lock.json` with the deployment/repository. Thereafter prefer:

```bash
npm ci
```

The final release ZIP intentionally does **not** contain the temporary audit `node_modules` doubles used to execute SDK-dependent offline validation in this network-constrained environment.

### 2. Live service smoke test

No production Discord token, OpenAI API key, or live voice connection was used during package validation. After deployment, perform a short live smoke test:

1. start Veilkeeper and confirm v3.5.0 startup;
2. run `/vc-campaign status` and confirm the World Director line;
3. run one two-player test cadence and verify one end-of-round director opportunity;
4. trigger a clear scene transition and verify one scene-director opportunity;
5. test a private scene transition and confirm output stays private;
6. if using downtime, resolve a disposable test downtime cycle and confirm project/world passes;
7. if using voice, test join → narration → repeat → leave.

## Final verdict

**PASS — v3.5.0 is application/package release validated.**

No known state-corruption, privacy-boundary, migration, command-schema, or autonomous-director blocker remains from this change set. The remaining items are deployment-environment verification: install the pinned dependencies/retain a lockfile and perform a brief credentialed Discord/OpenAI smoke test.
