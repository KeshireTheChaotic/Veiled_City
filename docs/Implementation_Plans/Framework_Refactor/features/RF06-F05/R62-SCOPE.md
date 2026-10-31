# RF06-F05 R62 — Original Discord client construction

After R61checkpoint and specific source grant, move sole original index.js new Client(options) expression into a zero-argument Discord factory exported through its existing public API. Exact original SDK constructor and five intent/Channel partial option ASTs; root factory call stays at original construction point. No constructor injection/options knobs, client caching, login/event/recovery/GM/voice/config/DB changes. Remove only now-unused SDK import from entrypoint.

Exclusive index construction/Discordpublic/newfactory source window and separate INDEX grant. Fresh actual exported factory-body evaluation with FakeClient and real SDK enum values, constructor/getter/error order/no login and fresh-instance evidence; full source AST proof for constructor and all other index statements. Tests do not instantiate a real Discord client or log in. No pair/registry/provider/production changes.

Checker identified the exact now-unused EAGER_MODULE_CONSTRUCTION Client record641a3bce40ef02770c1eeec1b71db08355b0befc762336f2fe666c9655e7580c. Retire only that record under the C119-returned exclusive TRANSITIONS window and preserve original root construction timing; no new exception.
