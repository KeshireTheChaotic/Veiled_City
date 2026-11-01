# RF05-F04 C136 — Intent-owned GM context reader

Extract the original intentContext function from ai-intents.js into Intent context-reader.js. Preserve its complete query order, flags, limits, state revisions, whole-record omission budget and GM-private packet semantics. Root export remains a same-function compatibility alias through Intent public.

The only function-body substitution replaces new ContextPlanner(db).plan(guild,options) with a fixed Intent-owned planContext(db,guild,options) consumer. The existing Intent–Knowledge pair constructs the existing public Knowledge ContextPlanner with those exact arguments; Knowledge retains all actor/audience selection. Existing runtime Intent–Knowledge initialization binds the new consumer. No SQL, write, transaction, schema, policy or authority changes.

Fresh tests must exercise actual extracted context selection, omitted whole records and retained permission fields, revisions, scene/roll flags and bounded group actor context. Verify fixed planner composition, original function-body equality after reversing the single substitution, changed-file syntax and RF05 ratchet. Existing passing suites are rerun only where source under test changes.
