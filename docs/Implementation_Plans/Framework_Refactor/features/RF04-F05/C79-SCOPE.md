# RF04-F05 C79 — Narrative opportunity ranking ownership

Move the self-contained Narrative opportunity ranking policy byte-for-byte into the Narrative framework. Retain its original root reader as a re-export of the Narrative public API and have the Narrative–World bridge use that API. Preserve the original function and order-object identity, existing pure ranking policy, saved inputs and bootstrap behavior. The old root path remains under its original Narrative ownership; the new file is in the Narrative framework directory.

Rollback: restore the original root source, remove the new framework source and public export, restore the bridge's original import and any retired transitions together. No persisted data or schema changes.
