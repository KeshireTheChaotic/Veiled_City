# Deterministic Combat State — v3.2.0

Encounter composition still uses the v3.1.3 Battle Point builder. v3.2.0 adds deterministic execution state.

## Starting combat

`/vc encounter start`

Veilkeeper creates one SQLite combatant record for every adversary body in the encounter, including individual Minions.

## GM commands

- `/vc encounter combatants` — HP, Stress, conditions/effects, status, Fear, and spotlight counts.
- `/vc encounter damage target:<name/id> amount:<rolled damage>` — converts damage to HP marks from stored thresholds.
- `/vc encounter heal target:<name/id> hp:<amount>`
- `/vc encounter stress target:<name/id> delta:<+/- amount>`
- `/vc encounter condition target:<name/id> condition:<text>` — tracks Vulnerable, Restrained, temporary effects, etc.; use `remove:true` to clear.
- `/vc encounter combatant-status ...` — Active, Defeated, Escaped, or Removed.

Minions mark 1 HP when damaged. Other adversaries mark HP from Minor/Major/Severe thresholds. Reaching 0 HP automatically marks the combatant Defeated unless the GM changes the status.

## Hope, Fear, reactions, and spotlight

`/vc roll duality` is treated as an **action roll** by default. It deterministically applies Hope/Fear metacurrency and, during an active encounter, increments that PC's spotlight count.

Use `reaction:true` for a Daggerheart reaction roll. Reaction rolls do not generate Hope/Fear and do not count as spotlight actions.

Daggerheart final/SRD 2.0 has **no mandatory action tracker or rigid initiative**. Spotlight counts are advisory only.

GM Fear is persisted from 0–12. `/vc gm fear` can correct or manually adjust it.
