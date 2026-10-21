# P06-F36 — Support Dead Platform Third Rail Spirit cue

Status: SUPPORTED SOURCE-BOUND ACTION CUE / TARGETED PASS. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `b8f9512174779900f2d5fbc040667dd114bcc871`; implementation `d0e4faeb2986ca3ee7980725fd4b063f9b54286c`.

Exact occurrence: `environment:dead-platform:third-rail-spirit`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#dead-platform/features/2`; source SHA-256 `1d4bb3b865866591a7e207ee4f2a792d91acf19c977f9f4099328c909a015243`; template SHA-256 `dc290c7974aa110f61545ba78c61e9a78aa0f7362ee41bb0b7d7f9ae83bf2011`.

Printed rule: “Spend a Fear to manifest a hostile current across a route, dealing 2d8+3 magic damage on a failed Agility Reaction Roll.” The source-bound cue will expose the exact Fear and roll/damage terms to the scoped GM. It will not spend Fear, choose a target/route, roll for a PC, or commit damage.

This adds no narrative restriction. Native environment manifestation, exact eligible target/route, Fear transaction, player-owned Agility Reaction Roll, and failure-only magic damage receipt/replay remain local holds until qualified. Descriptor handler: `environment_third_rail_spirit_context`.

Only fresh feature-specific tests in `bot/tests/ai-gm-2026-10/`; freeze before one mapped batch, changed-file syntax checks only, never poll, and no broad test runner or paid provider. Record SHAs, inputs, outcomes, cost/cache, questions, blockers and unverified work in this scope/ledger and targeted evidence.
