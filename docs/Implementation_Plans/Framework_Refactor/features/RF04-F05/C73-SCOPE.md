# RF04-F05 C73 — World encounter actor control

Use the existing World actor-control consumer in the encounter candidate reader. The existing Daggerheart–World pair and startup initializer forward the original native classifier and proxy source. Preserve candidate validation, current owner and proxy checks, and read-only behavior. The direct legacy import transition is eligible for retirement once the phase gate confirms it is unused.

Rollback: restore the direct `native-actor-control.js` import and the retired transition together. No schema or saved data change.
