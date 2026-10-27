# RF04-F04 S03 — Session opening cohort scene reader

Base `d429def383eca8925163dc5f38e3ba656a734acd`, with the S02 assembly context change present. Session-owned `opening-cohort-state.js` consumes the existing Session public scene reader directly, removing its use of the root compatibility reader. Session retains its scene and cohort policies. This caller adoption does not physically migrate the module or complete RF04.

Rollback: restore the root scene-continuity import and previous public events import; remove S03 fresh test and evidence. No transition is added or renewed.
