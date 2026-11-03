# R6 — native root, opt-in start and live harness (current summary)

Status: offline-tested and running in the authorized test guild only; no phase gate passed. Review findings: SESSION_REVIEW_2026-11-03.md.

## What exists

- `native-root.js`: opens the dedicated native stores in a new directory (scenes, sources, actions, prompts, decisions, interactions; plus turns and knowledge when a provider is configured), the exclusive interaction router, GM, attendance, private-channel and death services, and the message observer. `allowedGuildIds` makes the router and observer ignore every other guild. `close()` is idempotent.
- `legacy-readonly-repository.js`: opens the legacy SQLite file read-only and exposes only `getCharacter`, `getCampaign` and `listCharacters`.
- `native-start.js` (`npm run start:v2:native`): requires `VK2_NATIVE=1`, `VK2_NATIVE_DIR` (new or empty), `VK2_LEGACY_DB`, `DISCORD_TOKEN` and `VK2_ALLOWED_GUILD_ID`. `VK2_ENV_FILE` loads a legacy .env by path (values never read or printed here). Inference is a second opt-in (`VK2_INFERENCE=1`, model from `VK2_MODEL` or `OPENAI_GM_MODEL`, `VK2_MAX_TURNS` 1-100) behind a hard call budget; `AI_AUTH_MODE=chatgpt` uses the legacy Codex-login client. GM authority for campaigns without a GM role: `VK2_GM_ROLE_ID`, `VK2_GM_USER_IDS`, `VK2_GM_ALLOW_ADMINISTRATORS=1`.
- `discord-message-observer.js`: owner messages in registered channels become native evidence; with a provider each becomes a withheld draft (empty GM context; nothing sent).
- Draft review: `/vc-gm drafts` lists withheld drafts privately; `/vc-gm publish-draft` sends one approved draft once after re-reading the live audience and scene, records no knowledge or canon, and holds an unconfirmed send as `publication_uncertain` without retry. This is a qualification harness, not the target delivery path (review finding 2).
- `discord-audience-reader.js`: on Discord's member-listing rate limit it waits the stated delay once (up to 60 s) and retries with a fresh read.

## Tests (latest runs, all fakes; no live send claimed by tests)

r6-native-root 4, r6-native-start 9, r1-discord-message-observer 5, r1-provider-budget 2, r1-discord-audience-reader 5, r6-gm-session-command 20, r3-discord-death-decisions router suite 57, r6-command-schema-compat 2, r6-player-private-channel 3. Full `tests/veilkeeper2` run earlier in the session: 488/488.

## Live findings (test guild 1467249344947159291)

Server Members Intent had to be enabled; the campaign record has no GM role (administrator opt-in used); member listing is rate-limited (finding 6). See LIVE_QUALIFICATION_RUNBOOK.md status log.

## Open

GM context and recall for drafts; autonomous validated publication (R4); thin adapters (finding 3); v2 command overlay (finding 4); party channel registration; historical migration; performance design for audience reads.
