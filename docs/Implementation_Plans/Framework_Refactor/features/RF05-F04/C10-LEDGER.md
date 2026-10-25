# RF05-F04 C10 — Intent GM-arbitration contract public API

**Status:** COMPLETE FOR THE GM PUBLIC-IMPORT SLICE; RF05-F04 and RF05 remain incomplete.
**Base HEAD:** `f5619c45c3e0ba2dc288d42a94c580e047b25478`
**Scope:** [`C10-SCOPE.md`](C10-SCOPE.md)

The import-free 79-line arbitration schema/matcher source moved byte-identically into Intent. The GM imports the contract through Intent public; the root path re-exports it so the other 42 recorded consumers keep their existing imports. The matcher remains a proposal-shape validator only and creates no native result, PC choice, or receipt.

Fresh changed-code batch: **16/16 passed** across ten files, exit **0**, duration **1,419.9164 ms**, one blocking launch. Changed JavaScript/MJS syntax passed **5/5**. The new test verifies real GM service loading, public/compatibility identity, representative schema match/rejection, failure diagnostic, and GM import path. No inherited arbitration tests were run.

RF05 architecture ratchet failed on existing debt: 579 source modules, zero unowned, 2,743 imports, largest cycle 181, 955 active groups/errors. There are zero findings for the new Intent module and the GM public import. Three existing World-to-root compatibility imports remain direct cross-framework findings (`0f087e92887acba18084d3e63b38325d0dd3cf13e40625392bfae4397169187f`, `6027439adfc4e3209457bf566405b6788b0d4b6e59ced587cc22f33ab368eb78`, `278aeba5890605bca6ce3c4cd7496061f8a89ef6e9c7c56a5c451ce5dcbea4b1`); those caller modules were not changed. The root compatibility-location assignment also remains. GM transition `57e5bc30d209d7aa530428a034da2bc8fb26acf52065b046d599bb46c3d167cb` was retired and preserved. **53** RF05-F04 assignments remain.

Provider calls/tokens/spend, network, and production database use: zero; Codex usage: UNMEASURED. Release is **NOT AUTHORIZED**. Roll back only the C10 source/evidence commit, restoring the GM import and exact transition; preserve the compatibility source and all prior work.
