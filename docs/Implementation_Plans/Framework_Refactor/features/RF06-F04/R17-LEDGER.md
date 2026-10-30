# RF06-F04 R17 — Complete voice command family

Original voice group now lives in Discord voice-commands.js, using same injected voice subsystem and deferred original GM permission callback. Root awaits the handler inside its existing receipt-capture try/finally; unknown subcommand false retains original outer fallthrough. No premature restoration or extra permission evaluation. Original status/repeat/join/control/configure/narrate logic, replies/errors, runtime setting behavior and speech-call arguments remain.

AST comparison proves all original branch statements structurally identical except exactly two isGM(db,interaction)→isGm() substitutions and explicit final false fallback (R17-STRUCTURE.json). This family is wholly Discord transport/voice behavior; database/controller lookup stays with existing caller callback, no new generic command switch or mixed domain module.

Parent397e08aa plus concurrent Agent A C81; branchcodex/clean-ai-gm-2026-10. Agent B commands/Discord public ownership. Changed runtime commands.js, frameworks/discord/public.js; new voice-commands.js. Fresh c17 test + R17 scope/ledger/log/hashes/structural proof only; no registry/index/Publication/SQL/native edits.

One frozen batch node --test bot/tests/ai-gm-2026-10/rf06-f04-c17.test.mjs: exit0,7passed,0failed/skipped/cancelled,417.929ms. Mocked cases cover public identity/missing subsystem, non-GM status/repeat, missing/current channel and defer→permission→join→edit order, GM control refusal/call counts, nullable/empty configure values, narration arguments/failure text and unknown fallback/caller await/receipt-finally ordering. No real voice join/playback/provider request. Syntax4/4, AST proof and scoped whitespace passed; R17-HASHES and .reports/RF06-R17-final.json.

No provider/network/DB, schema/native effects/source/audience/PC-agency change. This is one completed command-family separation, not whole command dispatcher qualification. Rollback only R17. Next exact feature RF06-F04 R18 player private-channel/accessibility command boundary after inspecting its exact Persistence interface. Release/deployment unauthorized.
