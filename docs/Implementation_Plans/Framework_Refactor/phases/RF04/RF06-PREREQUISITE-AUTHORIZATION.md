# Owner authorization — exact RF06 prerequisites

On 2026-10-28 the owner selected **Authorize exact prerequisite migrations** in response to the phase-gate conflict between RF04 compatibility shim retirement and RF06-owned consumer migrations.

Authorization covers only the exact prerequisite RF06 migrations needed to close RF04, preserving standalone database construction and saved formats, with fresh targeted tests. It supersedes the RF06 entry hold only for those documented prerequisites. It does not authorize a blanket deadline extension, baseline expansion, removal of required compatibility readers, schema/gameplay changes, legacy test execution, provider spend, push, deployment or release.

Each prerequisite requires its own responsibility/caller/saved-reader review, scope and ledger, exact transition records, actual test results and rollback. RF04 remains incomplete until its exit evidence is met. Unrelated safe work continues while an individual prerequisite is held.
