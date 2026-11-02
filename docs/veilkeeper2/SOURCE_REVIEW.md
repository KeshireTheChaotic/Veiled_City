# Pinned source-reference review

All references below are against `1ba6c7e15db1a66ba34b36336f31437beffe44d6`, not the deprecated local checkout.

The handoff's `processTurnEnvelope` reference to `bot/src/index.js:569–620` is incorrect. Its actual definition is **540–564**; the cited range is principally the Discord `messageCreate` routing listener. `processPartyTurn` is **407–534**, not the whole 407–565 range. Preserve intake replay/recovery and listener routing as separate migration obligations.

The combined `renderPart / validateOutputPart` reference to `bot/src/pvp-output.js:123–227` does not contain `validateOutputPart`. Its actual definition is **367–372**, also cited separately in the handoff. This function verifies persisted publication status, identifier/content hashes and re-rendered source authority. It is a genuine privacy/replay obligation, not removable narrative boilerplate.

Twelve cited ranges include a nonexistent final line. SOURCE_REFERENCE_AUDIT.json records exact file lengths and hashes; trim each affected range's end to the recorded lineCount when following it. The original handoff remains unmodified as provenance. These small range defects do not disprove the design concern; they require precise source references before replacement.

Character compatibility inspected directly:

| Source | Existing boundary | Required destination |
|---|---|---|
| `character-export.js:33–39` | Recursive player projection excludes GM visibility and named hidden hook/canon fields | R6 player serializer with fresh nested privacy coverage |
| `character-export.js:41–58` | Player-safe v3.3.3 package, scoped facts and relationships | R6 compatible character export |
| `character-export.js:60–80` | Separate GM-private hooks, including imported seeds | R2 private context and R6 GM export |
| `character-export.js:82–98` | GM-private facts, clocks, threads and references | R6 separate authenticated export |
| `character-export.js:108–124` | GM canon, conflicts and proposals remain distinct | R2 canon review and R6 GM export |
| `frameworks/narrative/gm-hook-import.js:3–31` | v3.3.1/2/3 import recognition, v3.3.3 hooks export recognition, unverified canon suggestions | R6 compatibility reader; never automatic canon promotion |

The content source index points to official SRD authority and explicitly says the package does not reproduce the full core rules. The source catalog describes an SRD edition, but that label is not independent verification of every algorithm. R3 must use the actual authoritative rules and owner house rulings as well as source behavior.

Historical RF05-F04 C143 ledger and deployment documentation were read as historical status only. Neither proves a live deployment or full-branch gameplay qualification for this rebuild.
