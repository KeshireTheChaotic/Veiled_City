# P06-F35 — Support Dead Platform Express Through Memory

Status: SUPPORTED SOURCE-BOUND ACTION CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `cbabc7a0c08c10d087fbd9119a530e5ba540eded`.

Exact occurrence: `environment:dead-platform:express-through-memory`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#dead-platform/features/1`; source SHA-256 `1b5899579f84ceb13e5e1b889a412546713018171d23de8b44a26e6eb227c4d2`; template SHA-256 `dc290c7974aa110f61545ba78c61e9a78aa0f7362ee41bb0b7d7f9ae83bf2011`.

Printed rule: “The PC makes a Knowledge Reaction Roll (14); on a failure, the next train opens onto a location associated with a painful memory rather than the intended stop.” This exact source-bound action cue will be projected only to the scoped GM. It leaves departure, declared destination, PC response, dice and all optional choices to the player. The cue does not itself request a reaction roll, select a painful memory, or change a destination.

This adapter adds no new restriction on narration or player options. The integrated player-owned reaction-roll and failure-destination receipt path remains an explicit local hold until implemented and directly qualified. Descriptor handler: `environment_express_through_memory_context`.

Only new feature-specific tests in `bot/tests/ai-gm-2026-10/`; no historic tests/fixtures or providers. Freeze before one mapped fresh-test batch, changed-file syntax checks only, no polling or broad validation. Record changed paths, SHAs, test/cost/cache evidence, questions, blockers and unverified work in the paired ledger and targeted evidence. Release qualification is separate.
