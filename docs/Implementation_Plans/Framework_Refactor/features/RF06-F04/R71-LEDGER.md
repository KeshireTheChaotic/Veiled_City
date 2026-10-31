# RF06-F04 R71 — Story command attachment contract

Base: `3de506ed97af2a238d4b4d2511604319ed812a28` (`RF06 F04 R70 use Discord city attachment interface`).

Result: `7209b3269ec89795fd4d588d029928c609143fe6` (`RF06 F04 R71 use Discord story attachment interface`).

The story command now uses `createAttachment` from the existing Discord public API. Its GM gate, command dispatch, result generation, optional inbox preview, content truncation, ephemeral delivery, mention suppression, and reply call are unchanged. The only production source path is `bot/src/story-commands.js`; `PermissionFlagsBits` remains imported from `discord.js` for the original permission decision.

Pre-edit worktree source SHA256: `90d6fdaf42d09047d8444a79e314cfcfe07019d0f582be649113b48cacf63850`. Git blob SHA256 at the same base: `5a55129f86e8ab4da8b3be38cbef166d6ba6e6abd61fd9ef88fda323d31dacdb` (Windows checkout line-ending conversion).

Fresh test path SHA256: `4b6967bd7836b9d3641f76f3f29914fe99603d37342c7b7cf0bd2bd22f5ade0c` (`bot/tests/ai-gm-2026-10/rf06-f04-r71.test.mjs`). The repository keeps this ignored fresh test in the local worktree; it is intentionally excluded from the six tracked R71 commit paths.

Fresh changed-code result: `node --test tests/ai-gm-2026-10/rf06-f04-r71.test.mjs` — exit 0, 1 passed, 0 failed. Changed-source syntax: `node --check src/story-commands.js` and `node --check tests/ai-gm-2026-10/rf06-f04-r71.test.mjs` — exit 0. The test invokes the actual read-only `pacing-status` path, binding the original Session–Intent language contract as normal application composition does, and checks exact GM-private text, mention suppression, filename and serialized result. Its first attempt failed because that port was unbound; the fixture was corrected to use the existing pair public binder, then the final run passed. No database writes or live service calls occur.

The changed-file architecture inspection found zero active violations and zero transition errors from `story-commands.js`. The overall RF06 ratchet remains red with 1,071 source modules, 4,341 imports, 210 accepted legacy occurrences, and 383 earlier-phase active/transition groups; this is not a phase-wide pass.

No transition record is retired in R71; the command retains its direct `PermissionFlagsBits` SDK import. No full RF06/RF07, live Discord, or release qualification is claimed.

Rollback: revert only the R71 source and evidence paths. Next exact feature: RF06-F04 R72 qualify the read-only simulation status response's attachment through the existing Discord public interface, leaving its owner gate and command operations unchanged.
