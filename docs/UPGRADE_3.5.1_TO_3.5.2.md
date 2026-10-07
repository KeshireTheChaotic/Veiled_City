# Upgrade — v3.5.1 to v3.5.2

v3.5.2 is a test-harness maintenance release. It fixes `npm run test:production` remaining alive after printing `PASS` because the voice repeat regression could leave an `@discordjs/voice` AudioPlayer active.

## Upgrade

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Overlay the v3.5.2 release files.
4. Preserve your existing `.env` and database.
5. From `bot/`, run:

```powershell
npm install
npm run audit:prod
npm run check
npm run test:offline
npm run test:production
```

`npm run test:production` should now print `Veilkeeper v3.5.2 production regression test: PASS` and immediately return to the shell.

## Migration / registration

- Database migration: none
- Slash-command definition changes: none
- `/vc-*` re-registration required: no
- Production gameplay/voice behavior changes: none
