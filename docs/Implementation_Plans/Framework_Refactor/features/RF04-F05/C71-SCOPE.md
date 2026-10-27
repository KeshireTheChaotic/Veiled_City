# RF04-F05 C71 — World travel observation source visibility

Replace the World travel observation reader's direct Narrative context import with the existing World-owned Narrative authorship consumer. Preserve the original source visibility function and all receipt, identity, audience and transaction rules. Every execution of the changed visibility check follows a successful `worldIdentityOrigin` call for the same authored record; that call already invokes the same World Narrative consumer, including for historical version-zero identities. Therefore the changed check introduces no additional Narrative composition prerequisite on that path. The identified application caller is `narrative-director-source.js`, reached after application bootstrap.

Rollback: restore the original source import in `world-simulation-receipts.js` and restore the exact transition records if retired. No schema or saved data changes.
