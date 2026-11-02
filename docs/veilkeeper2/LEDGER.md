# Veilkeeper 2.0 — current phase status

Goal remains **R0–R8**, active and incomplete. Worktree: `D:\Library\Development\Veiled_City_2\rebuild`; branch `rebuild/veilkeeper2-audience-first`; pinned baseline `1ba6c7e15db1a66ba34b36336f31437beffe44d6`.

- **R0:** Inventory and binding audit slices complete. All 1,077 legacy runtime modules, 4,224 exported bindings, 219 command routes, 55 effective tables and 456 literal record kinds inventoried. Dynamic providers/record uses and semantic conversion proofs remain explicit removal/migration holds. Full acceptance is not claimed. See [R0 report](R0_BINDING_REPORT.md), [initial inventory](REBUILD_INVENTORY.md), and [source corrections](SOURCE_REVIEW.md).
- **R1:** Bootable offline preparation kernel implemented; nine fresh tests passed. No rules/effects, durable store, real authentication adapter, model gateway or publisher installed. Full acceptance remains open. See [R1 report](R1_REPORT.md).
- **R2–R8:** Not implemented. Rules parity, persistent knowledge, conversation, Director, complete Discord commands, migration/durability and release qualification remain required.

Completed test batches: initial audit 5/5, new bindings/schema 8/8, offline kernel 9/9; all zero failures/skips. These are focused offline checks, not full product, live model, Discord or gameplay qualification. No unchanged completed batch was rerun.

Exact per-slice source/test hashes, commands, timestamps, outputs and limitations are in the linked reports and adjacent evidence JSON. `CHECKPOINT_HASHES.json` belongs to historical commit `4a0a6e4c`; use the current slice manifests for current files.

No legacy source/schema/content was changed, no legacy test removed, no production DB opened, no live client started and nothing pushed or deployed. Rollback is to leave the original application active and the isolated offline root unused; there is no production data conversion to undo.

**Next exact work:** finish R1 native principal/source, scoped packet and transport contracts; implement R2 audience/actor/source-closure knowledge authority. Continue resolving R0 dynamic contracts at the boundary being ported. Do not delete or automatically convert any unresolved legacy path. Preserve R3–R8 scope and separate owner deployment approval.
