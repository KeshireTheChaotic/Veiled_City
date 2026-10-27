# RF04-F04 S02 — Session assembly context scene reader

Base `d429def383eca8925163dc5f38e3ba656a734acd`. The Session-owned `assembly-context.js` consumes the existing Session public scene functions directly, removing its use of the root compatibility reader. Session retains its original scene, presence and assembly policies. This caller adoption does not physically migrate the module or complete RF04.

Rollback: restore the root scene-continuity import and the previous Session public import; remove S02 test and evidence. No transition is added or renewed.
