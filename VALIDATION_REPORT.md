# Veiled City Multiplayer Discord v3.5.1 — Security Maintenance Validation

**Validation date:** 2026-10-07  
**Release scope:** dependency-security maintenance over v3.5.0; no intentional gameplay/schema/command behavior changes.

## Trigger

A fresh Windows `npm install` of v3.5.0 reported **2 vulnerabilities (1 moderate, 1 high)**.

The v3.5.0 package pinned `discord.js` 14.22.1. That release pins `undici` 6.21.3. Current 2026 Undici advisories include high- and moderate-severity issues affecting that 6.x range, with the September 2026 fixes landing in 6.28.1 and later. The current supported Undici 6.x release is 6.29.0.

## Dependency changes

- `discord.js`: **14.22.1 -> 14.27.0**
- npm override `undici`: **6.29.0**
- npm override `ws`: **8.22.0**
- added `npm run audit:prod` => `npm audit --omit=dev --audit-level=moderate`

`discord.js` 14.27.0 declares `undici ^6.27.0`; the explicit override establishes a known patched 6.x floor/current release for Node 22 deployments. The `ws` override is defensive hardening above the 8.21.0 fix for the 2026 memory-exhaustion advisory.

## Application regression validation

Using isolated local SDK doubles only for unavailable external packages/services:

- `npm run check`: **PASS**
  - JavaScript syntax gate: PASS
  - Discord command schema: **20/20 root commands PASS**
- `npm run test:offline`: **PASS**
- `npm run test:production`: **PASS**
- Veiled City content validator: **PASS**
  - Domain cards: 84
  - Markdown files: 53
  - Content JSON files: 10
- Package JSON parsing: **12/12 PASS**
- Existing content manifest: **64/64 hashes/sizes PASS**

No application source behavior was changed except release-identifying version strings/export version. The dependency update therefore retained the full v3.5.0 state/director/privacy regression baseline.

## Package hygiene

The release package excludes:

- `node_modules`
- `.env`
- SQLite databases / WAL / SHM files
- logs
- temporary SDK test doubles
- Python cache/transient files

## npm registry limitation during validation

The validation container could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so a connected `npm install` / `npm audit` could not be executed inside this environment and no generated `package-lock.json` is bundled.

Published package/advisory metadata was checked on 2026-10-07 and confirms the selected `undici` and `ws` versions are beyond the affected ranges discussed above. **The connected deployment host must still perform the final npm audit gate.**

On the Windows deployment host:

```powershell
cd "D:\Library\Veiled City\bot"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run audit:prod
```

Expected release gate: **0 production vulnerabilities at moderate severity or higher**. Retain the newly generated `package-lock.json`; use `npm ci` thereafter.

If `npm run audit:prod` still reports any vulnerability, do **not** use `npm audit fix --force`; capture the full `npm audit` output so the exact remaining dependency can be patched without an uncontrolled major-version upgrade.

## Migration / registration

- Database migration: **none**
- Slash-command definition changes: **none**
- `/vc-*` re-registration required solely for v3.5.1: **no**
- Existing `.env` and `bot/data/veiled_city.sqlite`: preserve unchanged

## Verdict

**Application/package regression validation: PASS.**  
**Dependency audit release gate: host verification required** because npm registry access was unavailable in the audit container.
