# RF06-F04 R87 — Canon proposal presentation in Discord

Move the existing GM canon-proposal list text construction from `commands.js` into a small Discord-owned formatter exposed through the Discord public API. Preserve the Application-owned GM guard, character lookup, Persistence read call, status/limit arguments, private reply, source labels, optional context and exact 1,950-character clipping behavior. No proposal mutation, resolution, snapshot or Native authority moves.

The fresh tests cover player/private and imported source labels, optional current value/reason, empty results, clipping, GM command query arguments and ephemeral delivery, and denial before database reads for non-GMs. The change does not qualify the canon storage contract, proposal authority or full command workflow.
