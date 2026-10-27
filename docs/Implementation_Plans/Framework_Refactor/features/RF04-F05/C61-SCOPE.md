# RF04-F05 C61 — native rules use Session owner action terminals through a native port

Base bff1db44. Five Daggerheart legacy modules (action-consent, gm-action-review, ordinary-effect-proof, roll-requests, rules-arbitration) stop importing the root owner-action-terminal.js shim and call Session's original overlapsOwnerActionTerminal and recordOwnerActionTerminal through a new nativeOwnerActionTerminal port, bound by the Daggerheart-Session adapter in the native principal bootstrap. rf04-f04-c01 no longer imports the root roster.js removed in C59; it still checks each moved Session module against the public API.

Rollback: Revert only the C61 commit: restore the five direct ./owner-action-terminal.js imports, remove the native owner action terminal port and connector, and restore the five exact transitions from C61-RETIRED.json.
