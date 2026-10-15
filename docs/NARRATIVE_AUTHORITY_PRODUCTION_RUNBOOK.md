# Verified Windows production rollout — 10.1.0

## Actual preflight (2026-10-14 local / 2026-10-15 UTC)

- Development: `D:\Library\Development\Veiled_City`, feature branch `codex/narrative-authority-emergence`; foundation `da29994d117ecf298126bd32ebf11bd783a60ee4`.
- Production code: `D:\Library\Veiled City`; direct Node installation, not a discovered Docker/service deployment. Node `v24.19.0`. No Veilkeeper Node process, matching Windows service or matching scheduled task was running. Other Node processes are Codex tools, not the bot; never stop them. Preserve the owner's stopped state; this release does not launch Discord.
- Production resolved `DATABASE_PATH`: `D:\Library\Veiled City\bot\data\veiled_city.sqlite`. Only that setting was inspected; credentials never printed. Old production HEAD `da29994d117ecf298126bd32ebf11bd783a60ee4`.
- Only dirty production file: `bot/package-lock.json`, two version-only corrections from 9.8.0 to 10.0.0. Preserve an external copy and a path-scoped stash before fast-forward installation; the qualified 10.1.0 release supersedes those two version strings without changing dependencies. Keep the stash, do not drop it or reapply stale version strings.
- All 36 existing outbox rows delivered; no pending/uncertain send. Historical failed uncommitted turn attempts (29) remain audit history, not pending actions to replay. No cleanup/deletion is required.
- New flags absent/false; existing `scene_continuity` and `playable_narration` true. No ad-hoc flag SQL permitted. No authenticated Discord/admin connector is available here; activation remains an actual GM operation after owner starts the bot.

## Verified independent online backup and restore

Created before any production modification, with current owner/SYSTEM/Administrators-only Windows ACL, outside the repository:

`D:\Library\Backups\Veiled_City\narrative-authority-20261015-0404\pre-10.1.0.sqlite`

SHA-256 `9afbc694af6b153e328fdb3e1b7d260eab1f494eaaa71c82cb81c96db2d79c6a`; **19,890,176 bytes**. Original, backup and disposable restore: `integrity_check=ok`, zero foreign-key failures, `user_version=460`, WAL mode. Matching counts: 6 characters, 0 rows in legacy rolls table, 303 mutation-ledger rows, 36 outbox rows, 192 world events, 305 city records. These are consistency counters, not an assertion that no native roll records exist elsewhere. Disposable restore removed after verification. No VeiledDB startup, migration, native effect or network was invoked by the drill. Backup is access-controlled, not claimed encrypted.

Actual command from development `bot/`:

```powershell
node --import ./scripts/offline-guard.mjs scripts/production-backup.mjs 'D:\Library\Veiled City\bot\data\veiled_city.sqlite' 'D:\Library\Backups\Veiled_City\narrative-authority-20261015-0404\pre-10.1.0.sqlite'
```

For later updates use a new protected directory/file; the script refuses overwrite and failed integrity/FK checks. It uses Node's SQLite online Backup API, not a raw live database copy; copies only the completed consistent backup for the restore drill. Preserve WAL/SHM with the live source, never delete them to force a startup.

## Installation after qualification

Use this host's Git executable, assigned to a task-specific variable:

```powershell
$vcGit='C:\Users\Keshi\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe'
# Push the qualified feature commit from development; no merge/force push.
& $vcGit push -u origin codex/narrative-authority-emergence
# In production: preserve the local version correction, fetch and fast-forward the exact feature branch.
& $vcGit -C 'D:\Library\Veiled City' stash push -m 'pre-10.1.0 production version-only lock metadata' -- bot/package-lock.json
& $vcGit -C 'D:\Library\Veiled City' fetch origin codex/narrative-authority-emergence
& $vcGit -C 'D:\Library\Veiled City' switch -c codex/narrative-authority-emergence --track origin/codex/narrative-authority-emergence
& $vcGit -C 'D:\Library\Veiled City' rev-parse HEAD
```

Branch must be a descendant of the recorded old production commit and exactly match qualification. Do not replace a diverged tree. Compare dependency manifests; no dependency additions or command-schema changes in this release, so no `npm install`/live registration is required. Preserve `.env`, runtime DB/content and the recoverable stash. Verify normalized source-manifest hashes, environment hash, DB integrity/schema/counters, and still-OFF new flags after installation. Do not start a second process or run synthetic player/model messages.

The owner controls `npm start` from production `bot/`; no running bot is to be restarted here. Once organically running, a real GM uses the progressive commands in `NARRATIVE_AUTHORITY_RELEASE.md`. Watch `/vc-admin` operational reports and delivery holds passively. No paid staging traffic, live model probe or live literary-quality claim is part of this release.

## Rollback

Installation completed at qualified release `b8004a8559b9dad879c0feb627f92cc2fba10a86`; GitHub CI run `38681684918` succeeded. Production normalized manifest: 679 files, zero mismatches. Schema/integrity/FK and receipt/character/outbox counts unchanged; `.env` unchanged. Local version-only lock correction preserved in external copy and retained stash `7082c4ccf37ccd545eca45df582f3678157627bb`. No bot startup, SQL migration, live provider/Discord test or automatic flag enable occurred. Results-only deployment documentation can be fast-forwarded afterward with no executable/test changes; see the handoff for that exact final revision.

For behavior issues use authenticated `/vc-city flags json:{"narrative_authority":false}` first. Stop/hold affected publication, preserve source/receipts/outbox and take a forensic online backup. Do not regenerate resolved dice/costs/Fear, delete historical campaigns or blindly resend uncertain Discord messages.

For code rollback with schema healthy, retain flags OFF, gracefully stop the bot if the owner has started it, and switch production to the old qualified `codex/playable-narration-repair` commit recorded above. Current schema is unchanged; new record kinds remain history. New queued prose may need read-side review under old code; do not treat failed projection as permission to replay mechanics. The retained version-only stash is recoverable; inspect before restoring it.

DB restore is a separate incident operation, **not routine code rollback**. First back up post-incident data and verify a disposable restore again. Restoring the pre-release DB can erase legitimate later play; reconcile audit/native receipts/outbox before any explicitly authorized maintenance restore. Never copy over a running WAL database or unconditionally erase post-upgrade outcomes.
