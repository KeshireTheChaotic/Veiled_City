# RF04-F04 S04 — Session action-window scene reader

Base `d429def383eca8925163dc5f38e3ba656a734acd`. Session-owned `scene-action-window.js` consumes Session's existing public scene reader directly, removing its use of the root compatibility reader. Session retains original current-scene and action-window rules. This caller adoption does not physically migrate the module or complete RF04.

Rollback: restore the root scene-continuity import and previous Session public import; remove the S04 fresh test and evidence. No transition is added or renewed.
