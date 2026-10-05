# Daggerheart Multiplayer Operating Rules
**Visibility: ENGINE — player-readable.**

Use normal Daggerheart Duality Dice, Hope/Fear outcomes, Stress, HP, armor, Experiences, domains, class/subclass features, rest structure, advancement, spotlight play, adversaries, environments, and death rules unless a Veiled City house rule explicitly modifies them.

## Multiplayer assumptions
The Discord session roster is authoritative for who is actively participating. Do not assume absent PCs are present. Do not scale an encounter from campaign membership; use only the active PCs who are actually in the scene.

## Encounter construction
Use `ENGINE/MULTIPLAYER_ENCOUNTER_GUIDE.md` and the bot's Battle Point encounter state. Veiled City no longer contains a separate one-PC encounter mode.

## Investigation
Investigation-critical information cannot be permanently locked behind a single failed roll. Failure may change cost, danger, timing, interpretation, exposure, or route while preserving a path forward.

## Hope and Fear
Hope and Fear remain mechanical and narrative currencies. Fear does not always mean immediate physical damage; in investigative play it can advance exposure, attention, deadlines, suspicion, enemy position, collateral risk, or bargains.

## The Veil
Veil Exposure is tracked from 0–6. Conspicuous supernatural events can increase it; clever containment or credible cleanup may reduce it when fiction supports this.

## Technology and firearms
Magic does not automatically disable modern technology. Firearms use Daggerheart's normal weapon abstraction unless scarcity is specifically relevant.

## Death
Use normal Daggerheart death resolution. The multiplayer lifecycle system handles replacement characters after a death or retirement.

## SRD baseline and authoritative automation
Veilkeeper v3.2 targets **Daggerheart SRD 2.0 (August 25, 2026)**. The rules desk labels answers as RAW, Veiled City House Rule, Homebrew Content, GM Ruling, or Provisional Ruling. Saved human-GM rulings override lower-priority campaign interpretation until replaced.

### Spotlight and action economy
Daggerheart does **not** use a mandatory initiative or action-token tracker. The bot records how often each active PC makes an action roll during an encounter only as a **spotlight fairness aid**. It never converts those counts into turns, initiative, or an action limit.

`/vc roll duality` is treated as an action roll unless `reaction:true` is selected. A reaction roll does not generate Hope/Fear and does not increment spotlight tracking.

For normal action rolls, Veilkeeper deterministically records metacurrency from the Duality Dice: rolls with Hope add Hope to the acting PC (maximum 6); rolls with Fear add GM Fear (maximum 12); a Critical Success gains Hope and clears 1 Stress. Narrative success/failure still depends on the Difficulty and the GM's adjudication.

## Advancement
Level advancement is validated by `/vc character level-up`, `/vc character level-choose`, and `/vc character level-confirm`.

- Levels are grouped into four tiers: Level 1; Levels 2–4; Levels 5–7; Levels 8–10.
- Each level-up grants two advancement choices from legal, unmarked slots in the current tier or an eligible lower tier.
- Increasing Proficiency or multiclassing consumes both advancement choices when available.
- Levels 2, 5, and 8 grant a new Experience at +2 and +1 Proficiency as tier achievements; entering Tiers 3 and 4 also clears marked trait advancement slots.
- Every level-up requires one new eligible domain card at the new level or lower, in addition to any card gained through an advancement choice.
- Damage thresholds increase by 1 each level when the character sheet stores structured thresholds.

Veilkeeper validates choices and creates a pre-level snapshot before committing them. The human table still decides **when** a narrative milestone grants a level.

## Downtime and projects
Between sessions, the GM can open a formal downtime cycle. Players submit recovery, investigation, crafting, ritual, relationship, income/upkeep, surveillance, research, or long-term projects.

Daggerheart rest/recovery effects must follow the SRD rather than arbitrary AI healing. Veiled City project resolution can also advance faction/world clocks, create consequences, and establish new facts, but it may not silently contradict the canon ledger. Private project results remain private; party-visible results can be published to the journal.
