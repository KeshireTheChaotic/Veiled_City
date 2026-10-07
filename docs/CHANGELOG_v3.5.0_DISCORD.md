## Veiled City Multiplayer Discord v3.5.0

**Autonomous World Director update**

- Added autonomous world reactions at three fictional pacing boundaries: completed player-round cadences, real scene transitions, and explicit in-game downtime.
- Player rounds are pacing only — no initiative/order enforcement. A scene transition supersedes a pending round pass to avoid double world moves.
- Downtime now separates player-project resolution from autonomous faction/world movement, based on fictional downtime only — never real-life elapsed time.
- Added durable pending director passes so a failed API/state attempt can be retried instead of silently disappearing.
- Added mandatory post-turn review for facts/clues, resources, clocks, threads, references, relationships, handouts, canon, Veil Exposure, and scene continuity.
- Review/mutation mismatches get one corrective retry and are rejected before commit if still inconsistent.
- Blocked scoped actions are now explicitly disclosed: sanitized notice to the acting player in private + detailed GM-log notice. Valid consequences in the same turn may still commit.
- Private scene director context includes the acting character's private transcript/facts and cannot leak its scene label into party director state.
- `/vc-campaign status` now shows director round/scene/pending state.

**Status:** production validation required after deployment credentials/live Discord checks.
