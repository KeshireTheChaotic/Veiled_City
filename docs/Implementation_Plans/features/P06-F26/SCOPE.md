# P06-F26 — Support the source-bound Auction of Consequences prompt

Status: FROZEN for one targeted batch. Audit `9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3`; branch `codex/clean-ai-gm-2026-10`; start SHA `3f5daadbc696fcca943c07bc541f4db0036e09dc`.

Exact occurrence: `environment:glass-market-grand-concourse:auction-of-consequences`; source `content/GM_PRIVATE/ENVIRONMENTS/environments.json#glass-market-grand-concourse/features/1`; source SHA-256 `8535b6ea80ac799e4625f0ce68f28d747aa781309485008da95576970659c3a3`; template SHA-256 `78cd4c8e38a0bfd156d1c2e1d8793ce1cc88c78d744725b6c88e1847571ef947`.

The adapter exposes the exact source-bound auction prompt to the GM's scoped current-scene context. The GM retains narrative initiative and authors the item, secret or contract and bids; output remains audience-bound. Context alone records no bid, sale, transfer or PC commitment. No Daggerheart mechanic changes.

Fresh tests only: new `p06-f26.test.mjs` and mapped fresh tests for changed catalog/capability/scene modules. One frozen batch; changed-file syntax and JSON parse checks only. No provider spend or broad validation. No new creative restriction or owner question proposed; no critical blocker established.
