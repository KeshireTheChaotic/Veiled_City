# RF03-F02 C09 — Native condition odds and movement rules

Move the existing pure Daggerheart rules for cancellation/non-stacking of incoming-roll Advantage and Disadvantage, plus the Very Close movement limit from the named Traffic Saint condition, into a native condition-rules module. The legacy source remains responsible for reading and validating sealed condition receipts and supplies current range-band vocabulary. Preserve exact outputs, range semantics and issue code. Do not change condition activation, source proof, saved roll data, scene position, movement execution or persistence.

Add fresh cases for cancellation, non-stacking, explicit and unknown movement ranges, and unrelated conditions. Run only the frozen fresh test, syntax checks for changed JS/MJS, and RF03 architecture ratchet. Rollback only the native condition-rules extraction, existing provider adapter, tests and evidence.
