# RF03-F02 C13 — Safe native attack adapter initialization

Resolve the observed circular-import temporal-dead-zone failures in the actual native feature-window load path: `pvp-attacks.js` constructs its Daggerheart attack-terms adapter before `scene-continuity.js` initializes `RANGE_BANDS`, and `native-feature-effects.js` constructs its reaction-stakes adapter before group-feature bindings initialize. Defer only these adapter constructions until their first respective function call. Keep all callback values, range-band values, terms, stakes and rule calculations unchanged.

Add a fresh cold-import test that imports the actual `native-feature-windows.js` provider and exercises its exported feature-cost contract, proving the specific loading path initializes without touching production services. No network, database or provider call. Run only this fresh test, syntax for changed JS/MJS, and RF03 ratchet. Roll back only lazy adapter construction and this test/evidence if needed.
