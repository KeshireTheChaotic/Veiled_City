# Upgrade — v3.5.0 to v3.5.1

v3.5.1 is a dependency-security maintenance release. It does not change the SQLite schema or slash-command definitions.

## Preserve

- `bot/.env`
- `bot/data/veiled_city.sqlite`

## Upgrade

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite`.
3. Overlay the v3.5.1 release files.
4. Remove the old dependency tree so vulnerable transitive packages cannot remain installed:

```powershell
cd bot
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run audit:prod
npm run check
npm run test:offline
npm run test:production
```

5. Retain the newly generated `package-lock.json` with the deployment. Subsequent installs should use `npm ci`.
6. Restart Veilkeeper.

`npm run register` is not required solely for v3.5.1 because command definitions did not change.

## Dependency changes

- `discord.js`: 14.22.1 -> 14.27.0
- npm override `undici`: 6.29.0
- npm override `ws`: 8.22.0

The overrides establish explicit patched transitive floors rather than depending on whatever vulnerable version an upstream package may otherwise resolve.
