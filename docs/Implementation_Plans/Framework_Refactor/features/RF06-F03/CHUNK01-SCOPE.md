# RF06-F03 CHUNK01 — Discord chunking prerequisite for saved assembly

Move the existing Discord text chunking functions into the Discord framework and expose them publicly. The original `discord/chunking.js` path re-exports the same functions. The application-owned assembly delivery reader adopts the public API while preserving the exact part projection and stored delivery keys. This is a narrowly authorized RF06 prerequisite for removing Session assembly's dependency on application delivery; it does not change transport, retry, receipts or audience policy.

Rollback the Discord source/public export, root compatibility reader and application import together; restore the exact transition record in CHUNK01-RETIRED.json. Do not remove the root path: other supported callers still use it.
