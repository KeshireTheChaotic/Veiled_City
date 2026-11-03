# R3 — owner-selected death outcome arithmetic

Ported pinned pure Risk It All and Avoid Death mappings into v2/rules using the local permanent Hope-cap calculator. There is no owner-choice inference, RNG, character mutation or death/canon commitment. Validated native callers must supply an actual eligible saved roll and level; these primitives are not standalone authorization.

Fresh command from bot: `node --test tests/veilkeeper2/r3-death-outcomes.test.mjs`. Actual result: 4/4 passed, zero failures/skips, 51.0141 ms. Fresh cases cover Hope/Fear/Critical mappings, exact scar threshold, permanent Hope-slot loss, last-slot journey end, unchanged input and invalid caps. Legacy tests/fixtures were not imported. Pinned source and native callsites were inspected. This is arithmetic parity only.

Remaining: owner-selected move proof, death eligibility/cause, authenticated actual rolls, level/input validation, support windows, life/death state, recovery allocation, once-only transactional effects and receipt/publication parity. Death moves are not installed in the default runtime. R3 remains partial; all broader gates remain required. No production change, migration, deployment or phase push occurred. Rollback leaves the opt-in primitives unused. Next: native owner-choice/eligibility lifecycle around these calculations, alongside authoritative action/cost state integration.
