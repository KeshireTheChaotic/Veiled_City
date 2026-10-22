# adversary:thorn-hound-of-the-green:root-snare

Status: SUPPORTED SOURCE-BOUND CUE; LOCAL MECHANICAL EFFECTS HELD. Parent: [P06-F01](../../SCOPE.md); feature: [P06-F64](../../../P06-F64/SCOPE.md).

Audit SHA: 9e7bf0687357cf96fbe2ea09a04b3e9d2975f6a3. Checkout base: 0834f299ccff1738e9b3dd753a5fc616d3965370.

Exact source: `content/GM_PRIVATE/ADVERSARIES/adversaries.json#thorn-hound-of-the-green/features/1`. Source SHA-256: `ab2498777e6340d353c26b7f72cdf99b5537a7b74509832727fb1e82861bbc2a`; template SHA-256: `635605d21fb6678134b9c6c825a216849d8ca4b8ec854ad719ccb1207103e861`.

The exact Action cue is exposed only in current GM-owned Hound context; the player's roll, consequence choice and resulting state remain with native mechanics and the player.

Fresh F64 tests cover source, descriptor, actor provenance and source drift. Target, range, PC die, damage, Restrained state, recovery and replay are held locally. No generic fallback or new narrative restriction.

Implementation SHA: `7518e41bde9dc0e2240053e8f2298af677b24452`; frozen run `p06-f64-20261022-a` passed 233/233 mapped fresh tests across 61 files. This qualifies the source-bound context cue only, not the mechanical effect lifecycle. Input hashes: [F64 evidence](../../../../evidence/P06_F64_TARGETED.json).
