# Veiled City v3.2.3 JSON Hotfix

Apply these files over an existing **v3.2.2** installation.

This fixes `/vc-character concept` failures involving quoted descriptions and malformed/truncated structured JSON, including `Expected double-quoted property name` and `Unexpected end of JSON input`.

Preserve your existing `bot/.env` and `bot/data/veiled_city.sqlite`.

From `bot/` run:

```powershell
npm install
npm run check
npm run test:offline
npm start
```

No `npm run register` is required when upgrading directly from v3.2.2 because the Discord command tree is unchanged.

Optional `.env` update:

```env
CHARACTER_MAX_OUTPUT_TOKENS=3200
STRUCTURED_JSON_RETRY_MAX_TOKENS=6000
```

The code enforces at least 3200 output tokens for character concepts even if the old `.env` still says 1800.
