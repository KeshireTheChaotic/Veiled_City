# C115 ledger

## 2026-10-28 C115 Session dialogue and story continuity read Intent language readings and World NPC availability through Session ports

Session's dialogue-continuity.js stops importing the World shim city-constraints.js and the Intent root module authored-turn-envelope.js; story-continuity.js stops importing the Intent root module gameplay-intake.js. activeCityProxy now uses the existing Session scene World port (same World original). Session gains fixed sessionIntentLanguage and sessionWorldNpcAvailability ports; Intent gains authored turn and gameplay intake slots filled at load by authored-turn-envelope.js and gameplay-intake.js. The adopted intent--session and session--world adapters bind the ports from initializeSessionIntent and initializeSessionSceneWorld (no index.js change). Static reachability from index.js unchanged.

Tests: one frozen batch of 56 files: 251 tests, 251 pass, 0 fail. Architecture: 3 exact records retired. RF04 exit 0, 0 active violations, 822 modules; RF05 149 groups/errors. Provider 0 tokens, $0. RELEASE NOT AUTHORIZED.
