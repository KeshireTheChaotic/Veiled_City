# environment:occult-crime-scene:sirens-outside

Status: TARGETED PASS; ADAPTER ACTIVE. Parent: [P06-F01](../../SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ENVIRONMENTS/environments.json#occult-crime-scene/features/2`. Source SHA-256: `ae2c09f77180cc6162cdebf2daf70c87e116ee298e210a51b7f8b752aa2403c5`; template SHA-256: `1071538ee24df905ae15f67823f9478a619871b4dd30ab23d3b7d317535b602f`.

The handler already existed in the native environment arrival adapter, dispatcher and output projector. This feature enables the exact occurrence descriptor and hardens contract validation; it does not create a generic fallback. Descriptor status under test: supported; handler: `sirens_outside`.

Any future adapter must prove current actor/source/scene/target, owner choices, exact costs, native dice and once-only replay using new tests before support promotion. No generic fallback or new creative limitation. Roll back only the occurrence-specific diff; preserve saved readers and receipts.

Final prior source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; the prior catalog test verified source inspection only. Adapter activation is qualified by P06-F04's fresh batch; see [P06_F04_TARGETED.json](../../../../evidence/P06_F04_TARGETED.json).
