# RF04-F05 C138 — World observation ownership

Move the original World observation implementation into World and keep the original root reader with the same function identities and its original source-slot registration. The application command uses World public directly. Because that removes the app's root import, the existing World execution initializer also registers the exact same function before services. Public-only imports remain unbound until root import or explicit bootstrap; initialization is idempotent. Existing root scripts and saved readers remain available. No observation, source, audience or PC control rule changes.

Rollback the source move, public exports, root reader, bootstrap registration and command import together; restore the exact application import record in C138-RETIRED.json. The root location record remains until compatibility readers and supported workflows can be retired independently.
