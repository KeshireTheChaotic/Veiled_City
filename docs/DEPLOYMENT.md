# Deployment

## Requirements
- A Discord server where you have **Manage Server** permission.
- Node.js 22.16+ for direct install, or Docker.
- An OpenAI API key with billing enabled.
- A machine that remains online while the campaign is running.

A small home server, NAS, VPS, Windows desktop, or Linux host is enough. The bot itself is lightweight; API inference happens remotely.

## Option A — Docker (recommended)
1. Copy `bot/.env.example` to `bot/.env`.
2. Fill in Discord and OpenAI credentials.
3. From the package root:
   ```bash
   docker compose build
   docker compose run --rm veilkeeper npm run register
   docker compose up -d
   ```
4. Inspect logs:
   ```bash
   docker compose logs -f veilkeeper
   ```

## Option B — Node directly
From `bot/`:
```bash
cp .env.example .env
# edit .env
npm install
npm run register
npm start
```

On Windows PowerShell:
```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run register
npm start
```

## Updating
Before replacing versions:
1. Stop the bot.
2. Back up `bot/data/veiled_city.sqlite`.
3. Preserve `bot/.env`.
4. Replace source/content files.
5. `npm install` (or rebuild Docker).
6. `npm run register` if slash commands changed.
7. Start the bot.

## Response modes
`/vc campaign setup ... mode:`

- **mention** — lowest API cost; normal chat is ignored until the bot is mentioned.
- **assisted** — recommended default; obvious in-world actions/questions are routed, casual chatter is ignored.
- **active** — every play-channel message gets a very cheap router classification; best natural-table feel, slightly more API usage.
