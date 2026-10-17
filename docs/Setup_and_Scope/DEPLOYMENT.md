# Deployment and release safety

## Deployment is not qualification

This package documents a **source snapshot**, not a production-certified release. The historical Audience-First v9 baseline passed 126/126 mandatory offline suites at commit `c600349b15a057bfde582cb864b52acf12d37c41`; subsequent advanced-feature and assembly work on the audited branch has focused-suite evidence, **not a documented new whole-branch UA17 qualification**. Do not use the 126/126 count to certify commit `014bc39dadd4035b43649c2c24ef3508939b1c40`.

## Preflight for authorized promotion

1. Pin exact development commit, inspect `git status`, compare production target/source ancestry and all local changes.
2. Run syntax, quality, format, full offline mandatory validation and manifest/hash integrity on the same frozen tree. Review acceptance inventory, failed/skipped/not-run counts and any new regressions.
3. Confirm required independent remote/CI proof (UA18) **after** local qualification. Do not assume a pushed branch or a green prior commit qualifies a newer tree.
4. Inspect the **current** production process identity, running/stopped state, checked-out SHA, dependency/runtime versions, environment and schema; never stop unrelated Node processes.
5. Take and verify a consistent privacy-protected backup of the exact production SQLite (including WAL concerns), and confirm pending/uncertain outbox/roll/feature readers before changing code.
6. Obtain separate authorization for installation, slash registration, restart, flag changes and any live paid/Discord tests. UA19 must not precede UA17/18.

## First install or staging instance

From the repository's `bot/` directory: `npm ci`, configure `.env`, `npm run check`, `npm run validate`, then (when approved) `npm run register` and `npm start`. Node.js 22.16+ is required. Do not start a second instance against the same DB. The repository also contains Docker-oriented deployment files, but do not assume the production host uses Docker without inspecting it.

## Updates, feature activation and rollback

Back up and preserve `.env`, content and live SQLite, along with published/uncertain outbox and saved native roll/effect/consent evidence. Re-register commands only when schema changed; restart only the positively identified instance. Enable optional flags or delegation grants deliberately through authenticated controls with bounded policy; a source file appearing on disk does not enable a runtime route.

For incidents, disable the exact offending publication/feature where possible, preserve evidence and perform a code rollback using verified compatibility for new native proof readers. A database restore is **separate**, lossy incident handling, not the normal source rollback. No invented refunds, rerolls, removal of acknowledged messages or clearing of pending owner decisions.

## Production status

No deployment, startup, production permission inspection, push, CI run or live test was performed by this documentation audit. Prior deployment notes in old runbooks refer to other commits and should not be treated as an installation receipt for the pinned branch.
