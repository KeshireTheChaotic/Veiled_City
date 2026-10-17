# Current documentation audit — setup and scope

- **Source**: `KeshireTheChaotic/Veiled_City`, branch `codex/audience-first-narrative-v9`, pinned HEAD `014bc39dadd4035b43649c2c24ef3508939b1c40`.
- **Method**: inspected the recursive GitHub tree, current setup/security/assembly/operator docs, `README.md`, `bot/package.json`, `bot/.env.example`, command schema and selected native implementation modules.
- **Inventory**: 756 tracked blobs; `docs/` has 242 blobs, including 221 Markdown files. Historical planning, old upgrades, changelogs, checkpoint ledgers, prior qualification and superseded fixes were excluded from this package.
- **Rebuild policy**: clean, stand-alone operator documents with current scope and source pointers. This is *not* a deletion instruction for repository evidence or a commit to the branch.

## Material inconsistencies or documentation risks corrected

| Finding in source docs | Treatment in this package |
| --- | --- |
| Old v3–v10 headings mix with current `0.0.0.1` app package | Use exact current application/schema and pin commit; old titles not used as version claims |
| Original audience-first 126/126 pass predates advanced-feature changes | Clarify it is a historical core qualification, not current whole-branch UA17 pass |
| Earlier assembly documentation could imply raw hook delivery | Clarify source-entitled per-PC thread, expressive stage, fallback labeling and exact transport proof |
| Older setup often reads as permission to install/restart immediately | Separate offline/staging steps from production authorization and release gates |
| Narrative/adjudication descriptions blur GM permission and PC execution | Explicit native rule/ownership/agency table and held unsupported feature scopes |
| Command catalogs and examples drift across refactors | Point to exact command builder/owner handlers and use registered split roots |
| Long historical plans dominate navigation | Exclude all historical plan/ledger artifacts; move ongoing work to separate Active Implementation ZIP |

## Verification limits

This audit **read** GitHub source and rebuilt Markdown offline. It did not clone/execute the app, run any offline suite, register slash commands, inspect a production database, deploy or perform live gameplay. Commands and operational outcomes must be verified on the future deployment target. The archive contains Markdown only and no credentials or source-code modifications.
