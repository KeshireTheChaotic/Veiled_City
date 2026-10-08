# Autonomous World Director — v3.7.0

Veilkeeper v3.5.0 adds an autonomous world-director layer that may advance the setting **between meaningful pieces of player-driven play**. It is not a real-time scheduler and it does not replace player agency, deterministic encounter controls, or human canon-conflict resolution.

## Three director layers

### 1. End-of-player-round cadence

A director "round" is a pacing cadence, **not initiative**. Veilkeeper records which currently present player-controlled Discord users have completed at least one GM-resolved party action. Once every eligible user has acted, it queues one end-of-round director pass.

The pass may let NPCs/factions react, advance an appropriate clock, establish a consequence, update a relationship/reference, create a handout, send legitimate private information, or narrate a visible world response. It may also return `act=false` when no world movement is warranted.

Players are never prevented from acting twice, forced into an order, or shown a turn counter. A genuine scene transition supersedes a pending round pass so the same player action does not cause two world moves.

Eligible users are currently present/late/guest PC controllers plus active NPC-proxy controllers who are present. Multiple controlled roles owned by the same Discord user count once for pacing.

## 2. Scene-transition director

Every normal AI GM turn must perform a mandatory post-turn state review. Its scene result is either:

- `continue` — the fictional scene remains materially the same; or
- `transition` — location, objective, time frame, or dramatic scene boundary actually changed, with a short new scene label.

A party scene transition queues a scene-director pass. It may reconcile offscreen positioning, clocks, faction/NPC reactions, consequences of departure/arrival, and pressure newly relevant to the new scene. It must not replay the transition narration that just occurred.

A **private** scene transition gets its own private director pass with the acting character's private transcript/facts available as context. Its narration is delivered privately, and private-scope state guards remain in force. Private scene labels are intentionally not copied into the party director state, preventing private location/context from contaminating later public world passes.

## 3. Extended in-game mechanical downtime

The downtime director runs only after a human GM explicitly invokes `/vc-downtime resolve` for an open downtime cycle. It reacts to the **fictional/mechanical interval represented by that downtime**, never to real-world time between Discord messages or sessions.

Downtime resolution has two conceptual AI layers:

1. **Player-project resolution** — resolves the submitted recovery, research, relationship, crafting, surveillance, etc. projects.
2. **World movement** — separately considers faction actions, threats, obligations, investigations, and clocks that could reasonably move during that fictional interval.

Both AI results are generated before authoritative state commit and are committed together so an API failure cannot leave the downtime cycle half-resolved. The director should scale movement to the fictional opportunity/duration and must not punish players merely for choosing downtime.

## Durable pending passes

Party round/scene passes are stored in session state before execution. If generation or authoritative state application fails, the pending pass remains recoverable and Veilkeeper retries it on a later party turn. A failed director call therefore does not silently erase the world reaction.

A pending pass does **not** use wall-clock time and there is no background scheduler. Veilkeeper can continue table operation rather than freezing play solely because a director API call failed.

Use `/vc-campaign status` for the compact cadence view, or `/vc-director status` for the operational view. `/vc-director history` shows recent passes and their rationale. GMs may pause/resume automatic director passes or request a one-time manual review with `/vc-director run`. Pausing never advances the world through real-world time.

## Authority and safety boundaries

The world director may use the same structured campaign actions available to the normal AI GM: facts/clues, resources where permitted, clocks, threads, references, relationships, handouts, canon where permitted, private messages, and narration.

It still may not:

- invent dice results;
- choose voluntary PC dialogue/actions/beliefs/resource spending;
- silently alter deterministic encounter combat state;
- contradict current canon;
- resolve canon conflicts without the human GM;
- write global canon or global Veil Exposure from a private scene;
- target another PC's private resources/relationships from a private scene.

Forbidden state actions are **blocked rather than applied**. Other valid consequences from the same turn may still commit.

## Blocked-action disclosure

When Veilkeeper attempts a prohibited scoped action and there is an acting player:

1. the prohibited mutation is not applied;
2. Veilkeeper sends the acting player a sanitized private scope-guard notice explaining what class of action was refused;
3. Veilkeeper posts the detailed blocked action to the configured GM log channel;
4. if the player-private notice cannot be delivered, the GM log explicitly reports that delivery failure;
5. the block is recorded in the audit log.

The player notice does not reveal hidden GM data. For example, a private attempt to create global canon tells the player that the discovery remained private and requires GM promotion; the GM receives the exact blocked canon key/reason.

## Mandatory post-turn state review

Every normal AI GM turn must explicitly review all of these categories before it is accepted:

- facts/clues
- PC resources
- clocks
- threads
- references
- relationships
- handouts
- canon
- Veil Exposure
- scene continuity

Each state category must say `changed` or `no_change` with a reason and a confidence score from 0–100. A category marked `changed` must have a matching structured mutation; a category with no matching mutation must be `no_change`. Scene continuity must say `continue` or `transition` and provide a scene label for transitions.

Veilkeeper cross-validates this review in application code. If the structured response is inconsistent, it gets one corrective structured-output retry. If the replacement remains inconsistent, the turn is rejected before authoritative state changes are committed.

This prevents consequences such as Stress, relationship shifts, new clues, clocks, or canon changes from existing only in narration without a corresponding state decision.


## Confidence and human review

Authoritative AI state changes require at least 55% confidence. A proposed category below that floor must remain `no_change`; Veilkeeper posts the ambiguity to the GM log instead of committing speculative state. World Director moves use the same 55% floor: low-confidence passes become recorded no-move/history entries for human GM review.
