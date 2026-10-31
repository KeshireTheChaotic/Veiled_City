# AF07 disposable and live qualification

The opt-in runner at `bot/scripts/af07-codex-scene.mjs` creates a source-backed adversary encounter in a temporary SQLite database, calls `GMService.runTurn`, and commits through `commitGmTurn`. The deterministic mock proposes the Aster Vale Contractor's Flashbang feature and verifies the saved native feature execution and owner reaction invitation. It never resolves the owner's dice or choice.

Run the focused local qualification from `bot/`:

```powershell
node --check src/frameworks/daggerheart/environment-binding-rules.js
node --check scripts/af07-codex-scene.mjs
node --check tests/ai-gm-2026-10/af07-codex-scene.test.mjs
node --test tests/ai-gm-2026-10/af07-codex-scene.test.mjs
```

The single live invocation is:

```powershell
node scripts/af07-codex-scene.mjs --live-codex
```

Live mode reads the development `.env` without printing it, requires `AI_AUTH_MODE=chatgpt` and no API key, checks the configured development SQLite database read-only, and connects to Discord with the Guilds intent only. It does not read or send Discord messages. The model turn still runs against the disposable fixture database, so no campaign record is changed by this qualification. The guarded client uses the local Codex ChatGPT sign-in and does not use a billed API key.

Verification on 2026-10-31: focused syntax checks passed; the fresh mock suite passed **2/2**, 0 failed/skipped, exit 0. One live invocation also exited 0: the development database preflight found one campaign and one active session; Discord connected; the real ChatGPT turn committed on the disposable database. The model returned one unified decision but selected no native action, so this establishes the live connection/turn path only, not autonomous feature selection or effect execution. No Discord messages were read or sent. No guild or bot credentials were emitted.
