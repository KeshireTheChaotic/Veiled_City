# Upgrade: v3.5.5 → v3.6.0

1. Stop Veilkeeper.
2. Back up `bot/data/veiled_city.sqlite` and preserve `bot/.env`.
3. Overlay the v3.6.0 package.
4. Run `npm install` from `bot/`.
5. Run `npm run validate` and `npm run audit:prod`.
6. Start Veilkeeper.

No database migration or slash-command re-registration is required solely for v3.6.0; command names/options are unchanged.

## Important privacy change

When configuring `gm_log` or `state_errors`, Veilkeeper now rejects channels that are readable by `@everyone` or a non-GM role. `/vc-player private-channel` likewise validates that the selected channel is private before storing it. Existing unsafe channel IDs are not silently trusted: GM/private publishing refuses them until Discord permissions are corrected.

If a configured custom GM role is used, ensure it can read the GM channels. Users with Discord Administrator or Manage Server remain privileged.

## Dependency lockfile advisory

The release source keeps exact direct dependency versions and security overrides. The build environment used for this package could not query npm registry metadata to generate a trustworthy transitive `package-lock.json`; do not substitute an audit-stub/generated offline lockfile. On the connected deployment host, retain the real `package-lock.json` produced by `npm install`. Once retained with your deployment source, use `npm ci` for reproducible future installs.
