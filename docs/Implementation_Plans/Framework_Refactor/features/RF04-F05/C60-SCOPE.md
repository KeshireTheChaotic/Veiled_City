# RF04-F05 C60 — native rules read World proxy and NPC availability through native ports

Base c5dec374. Twelve Daggerheart legacy modules stop importing the root city-constraints.js shim. activeCityProxy goes through the existing nativeWorldProxy port; assertNpcAvailability (native-environment-witnesses, pvp-fear-moves) goes through a new nativeNpcAvailability port bound by the Daggerheart-World adapter in the existing native World bootstrap. p09-f06 now composes startup ports for its real Pack Pressure flow.

Rollback: Revert only the C60 commit: restore the twelve direct ./city-constraints.js imports, remove the native NPC availability port and connector, and restore the twelve exact transitions from C60-RETIRED.json.
