# Validated Character Advancement — v3.2.0

The table still decides **when** a narrative milestone grants a level. Veilkeeper validates the mechanical choices after that decision.

## Workflow

1. `/vc character level-up character:<name>`
2. `/vc character level-choose ...`
3. Review the draft.
4. `/vc character level-confirm`

Confirmation creates an automatic pre-level snapshot before changing the sheet.

## Validation

Veilkeeper validates:

- target level and tier;
- two legal advancement choices;
- available advancement slots in the current/eligible lower tiers;
- double-slot Proficiency or multiclass choices;
- tier achievements at Levels 2, 5, and 8;
- marked-trait restrictions and tier clearing;
- mandatory new domain card every level;
- domain/card-level eligibility;
- Veiled City custom-domain access;
- +1 threshold progression when thresholds are stored structurally.

Official/non-bundled domain cards can be supplied as name, domain, and level metadata. Bundled Veiled City custom cards are checked against the local card library.
