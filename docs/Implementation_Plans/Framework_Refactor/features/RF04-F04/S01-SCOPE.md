# RF04-F04 S01 — Session assembly scene reader

Base `d429def383eca8925163dc5f38e3ba656a734acd`. The Session-owned `assembly-state.js` consumes its existing Session public scene functions directly, removing its use of the root scene compatibility reader. Session's scene implementation and all audience and source rules remain authoritative. This is a caller adoption, not physical migration of the module or phase completion.

Rollback: restore the original scene-continuity import and separate Session public principal import; remove the S01 fresh test and evidence. No transition is added or renewed.
