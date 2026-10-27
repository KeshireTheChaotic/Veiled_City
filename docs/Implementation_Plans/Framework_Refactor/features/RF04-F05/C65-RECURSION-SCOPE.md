# RF04-F05 C65 environment audience revalidation recursion

The fresh C65 privacy follow-up found that establishing or inspecting an environment profile revalidates a Narrative audience, whose context builder looks up that same profile and recursively inspects it. Implement a synchronous, database- and scope-specific reentrancy guard on the existing Daggerheart environment lookup. While an identical profile is already being looked up, its nested lookup contributes no environment projection; outer lookup, native proof checks, source checks and audience selection remain authoritative. Clear the guard on both success and failure. No schema or narrative restriction changes.

Qualify with the newly authored disposable-SQLite test of real profile creation, private recipient isolation, current source retraction and subsequent lookup; record all attempts. Rollback removes the guard and fresh local test/evidence together. RELEASE NOT AUTHORIZED.
