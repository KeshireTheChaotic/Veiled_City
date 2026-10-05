# PARTY ASSEMBLY & DROP-IN ENTRY — v3.1.1

Veilkeeper now distinguishes **campaign membership**, **session attendance**, and **party membership**.

## The three phases

### Assembly
Characters may be unrelated. Each has an independent reason to enter the same incident.

### Converged
The characters understand that their immediate objectives overlap. Cooperation is useful, but no one is forced to stay.

### Party
The players have voluntarily chosen to continue as an established working group.

Veilkeeper must never invent friendship, trust, loyalty, shared history, or consent just to force party formation.

## Recommended first-session workflow

1. GM starts:
   `/vc session start title:Opening Night assembly:auto`

2. Players check in:
   `/vc session present character:<name>`

3. After the expected players are present, the GM runs:
   `/vc session assemble`

4. Veilkeeper:
   - creates one GM-private convergence plan;
   - sends each player a private opening hook through their registered private channel, falling back to DM;
   - posts one shared opening in `#the-table`;
   - leaves all PC actions and dialogue to the players.

5. When the PCs clearly recognize a shared immediate objective:
   `/vc session converged`

6. If the players later decide to remain an ongoing team:
   `/vc party establish`
   or
   `/vc party establish name:<team name>`

The party state persists across sessions.

## Assembly modes

`auto` — recommended. Uses existing persistent-party state when present; otherwise builds the best convergence from character hooks.

`already_together` — no convergence scene. Use when the current PCs are already an established team.

`shared_incident` — everyone independently reaches the same supernatural event.

`common_client` — one client/faction separately pulls the PCs into the same problem.

`crossed_cases` — separate investigations are revealed to overlap. Excellent default for Veiled City.

`mutual_threat` — one threat independently endangers multiple PCs.

`faction_summons` — Concord, Lantern Office, or another faction calls them together.

`chain_contacts` — A knows B, B knows C; avoids requiring everyone to share history.

`rescue` — one PC's situation draws the others in.

`debt_favor` — separate obligations point toward the same job.

`manual` — Veilkeeper does not generate assembly/arrival plans; the human GM handles introductions.

## GM status

`/vc session assembly-status`

Shows the GM:
- mode and phase;
- present characters;
- whether a plan exists;
- convergence goal;
- proposed practical links;
- GM notes.

It is ephemeral and GM-only.

## Late arrivals

A player joining after play begins uses:

`/vc session arrive character:<name>`

Veilkeeper can generate:
- a private reason the character is at/near the current scene;
- a public opening for the table;
- a practical link to the current problem.

It does **not** retcon the character as having been present all along.

## Guest characters

`/vc guest claim character:<name>`

If the session has moved beyond initial Assembly, Veilkeeper can generate an entry hook for the guest.

## Replacement characters / character switches

`/vc character select character:<name>`

When switching away from another active PC mid-session, Veilkeeper can generate a fictionally appropriate entry for the new PC.

This supports:
- character death;
- retirement;
- temporary character changes;
- a reserve PC replacing an absent one.

## Persistent party state

`/vc party status`

Shows the stored continuing group.

`/vc party establish`

Saves the currently present characters as the continuing party and marks the session phase `party`.

Returning party members no longer require a fresh convergence scene next session. A genuinely new, guest, or replacement character still receives an entry hook.

## Character hook fields

Imported JSON may include:

```json
{
  "background": "",
  "home": "",
  "person": "",
  "obligation": "",
  "opening_status": "",
  "goals": [],
  "unresolved_incident": "",
  "gm_hooks": [],
  "faction_connections": [],
  "entry_hooks": [],
  "exit_hooks": [],
  "notes": ""
}
```

These fields are player-authored inputs, not hidden answers. Veilkeeper uses them to answer:

- Why is this character here?
- What connects this incident to their life?
- What practical reason might they have to keep cooperating?
- How can they enter or leave without breaking continuity?

## Private-hook safety

Private opening hooks remain character-private. Veilkeeper may use all hooks as GM context, but it must not reveal one player's private hook to another unless that information is later shared or independently discovered.
