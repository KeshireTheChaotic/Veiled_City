# RF03-F02 C11 — Native group-feature proposal eligibility

Move the existing pure fixed-term checks for group-feature proposals into Daggerheart. Preserve the current three supported identities, NPC actor and feature operation, native feature disposition/stakes kind, exact trait/Difficulty, prohibited proposal version/Experience/Advantage/Disadvantage, and required SRD reaction-roll reference. Return the existing immutable policy for provider-side encounter validation. Keep all scene, source, combatant, target, control, resource, persistence and receipt checks in `native-group-features.js`.

No feature is newly enabled and no new proposal restriction is added. Write fresh direct-native tests under `bot/tests/ai-gm-2026-10/`; run only the frozen test, changed JS/MJS syntax, and RF03 ratchet. Roll back only this policy extraction, test and evidence.
