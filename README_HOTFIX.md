# Veiled City v3.2.2 Command-Size Hotfix

Apply over a v3.2.1 installation. This patch does **not** contain or replace `bot/.env` or `bot/data/veiled_city.sqlite`.

After copying the files into your existing Veiled City folder, run from `bot/`:

```powershell
npm install
npm run check
npm run test:offline
npm run register
npm start
```

Expected registration result:

```text
Registered 17 root command(s) to guild <guild id>.
```

Command families are now split (`/vc-session`, `/vc-character`, `/vc-encounter`, `/vc-combat`, etc.) to remain below Discord's 8,000-character per-command limit.
