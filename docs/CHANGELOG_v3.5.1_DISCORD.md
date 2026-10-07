# Veiled City v3.5.1 — Dependency Security Maintenance

- Updated **discord.js** from 14.22.1 to 14.27.0.
- Added explicit patched transitive dependency overrides for **undici 6.29.0** and **ws 8.22.0**.
- Added `npm run audit:prod` to check production dependencies at moderate severity or higher.
- No campaign database migration is required.
- No slash-command re-registration is required solely for this update.
- No gameplay, GM/world-director, voice, privacy, or state-management behavior was intentionally changed.
- Existing `.env` and campaign database files can be preserved.
- Upgrade installs should remove the old `node_modules`, run a fresh `npm install`, retain the generated `package-lock.json`, then use `npm ci` for later deployments.
