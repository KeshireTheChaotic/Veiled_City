# R6 — campaign policy and owner-session adapters (complete slice)

Delivered: bot/src/v2/native-campaign-adapters.js. createCampaignGmPolicyReader derives the closed GM policy from the existing campaign record (configured gm_role_id only; no administrator fallback, no user list; revision is a hash of the role). createOwnerSessionReader resolves the owner's single registered PC in the single active native session from a character id or exact name; absent, ambiguous, closed, unregistered or no-active-session cases return null (never guessed). Its output is the readOwnerSession shape used by discord-session-attendance.js.

Tests (real in-memory scene store; repository is a fixture of the existing getCampaign/listCharacters shapes): r6-campaign-adapters.test.mjs 3 passed / 370 ms.

Known issues: not exercised against the real SQLite legacy repository or composed into a running root; the policy-reader/GM-authority link is only construction-checked. Not installed in production start.

Deferred: session end/recap/opening, owner registration/control rebinding, pre-session attendance, historical migration.
