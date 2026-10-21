# environment:dead-platform:third-rail-spirit

Status: SUPPORTED SOURCE-BOUND GM ACTION CUE; EFFECT HOLD. Parent: [P06-F01](../../SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ENVIRONMENTS/environments.json#dead-platform/features/2`. Source SHA-256: `1d4bb3b865866591a7e207ee4f2a792d91acf19c977f9f4099328c909a015243`; template SHA-256: `dc290c7974aa110f61545ba78c61e9a78aa0f7362ee41bb0b7d7f9ae83bf2011`.

P06-F36 adds a source-bound GM cue for the printed one-Fear hostile current and failed Agility Reaction Roll damage rule. The cue does not spend Fear, choose a PC/route, roll, or commit damage; native attack and failure receipts remain held. Descriptor handler: `environment_third_rail_spirit_context`.

No generic fallback or new creative limitation. Roll back only the occurrence-specific diff; preserve saved readers and receipts.

Final tested source SHA: `8e01519b6511bc90af6a1c675e4a9950f12b703c`; run `fresh-delta-1792599054739` passed 47/47 union tests. The catalog test verifies this occurrence source; this is not occurrence effect qualification. Input/test hashes: parent final evidence.
