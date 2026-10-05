# Drop-In, Drop-Out, Guest, Replacement, and Death Framework

Veiled City v3 treats **players**, **characters**, and **session attendance** as separate records.

## Normal absence
At session start, known players default to **absent/offscreen** until they check in. This avoids the bot assuming everyone is present.

Players use:
- `/vc-session present` — join with an owned character.
- `/vc-session absent mode:offscreen` — character is outside active danger.
- `/vc-session absent mode:background` — character can be mentioned but cannot be consequentially controlled by the AI.
- `/vc-session absent mode:proxy proxy:@Player` — explicitly let another human control the PC this session.
- `/vc-session arrive` — enter after being late.
- `/vc-session leave` — leave early with an attendance policy.

### Offscreen is the default
The character can be explained as following another lead, covering an exit, handling a contact, recovering, or simply separated by the current circumstances. Missing a real-world session should never cause arbitrary HP/Stress/resource loss.

### Background consent boundary
Background means the AI can say things such as "Morgan watches the hallway" or "Elias is still at the wheel." It may NOT:
- roll for the PC;
- make major decisions;
- spend resources;
- reveal private information;
- sign bargains;
- volunteer equipment;
- suffer avoidable damage;
- solve a challenge for the attending group.

### Proxy
Only the named human proxy may make choices for that PC. Proxy control lasts for the session assignment.

If the proxy is also playing their own PC, ordinary messages default to their own character. To act as the proxied PC, prefix the post with the character's name:

`Elias Mercer: I check the eastern fire escape.`

or

`[Elias Mercer] I check the eastern fire escape.`

This keeps authorship explicit on mobile without forcing constant character-switch commands.

## Guest characters
A guest player can have a purpose-built temporary character:
1. `/vc-guest create name:"..." player:@Guest`
2. Guest joins with `/vc-guest claim character:"..."`

The character remains in the campaign database as canon afterward, so they can recur.

## Multiple characters
A player can own many characters. `/vc-character select` changes the current session assignment. Old PCs are preserved rather than overwritten.

Recommended practice:
- Keep one primary active PC.
- Keep former PCs as reserve/retired rather than deleting them.
- Use a new character for substantially different concepts instead of rewriting history.

## Character death
After the normal Daggerheart death move is resolved:
`/vc-character death character:"Name"`

The record remains in canon with `dead` status. The player can immediately:
- select an existing reserve;
- claim a guest;
- create/import a replacement.

The AI should introduce the replacement at the first plausible scene transition rather than keeping the player sidelined.

## Retirement
`/vc-character retire character:"Name"`

Retirement is not deletion. Retired PCs may remain NPCs in canon, but the AI must not treat their former player as still controlling them unless the character is explicitly returned to active status by a human administrator.


## Character-specific knowledge
v3 distinguishes **player-private** knowledge from **character-private** knowledge. Character-private facts follow the PC even if:
- the original player is absent;
- another player controls the PC by Proxy;
- the player later switches to a different PC.

This prevents a replacement character from automatically inheriting everything the player's previous character knew.


## Party assembly and character entry (v3.1.1)
A campaign player being present does not mean their PC is automatically part of the current group.

For a first meeting of unrelated PCs:
1. GM starts the session with `/vc-session start assembly:auto`.
2. Players check in with `/vc-session present`.
3. GM runs `/vc-session assemble`.
4. Veilkeeper gives each PC a private reason to reach the same situation and posts a shared opening.
5. When immediate goals clearly overlap, GM runs `/vc-session converged`.
6. Only after the players choose ongoing cooperation does the GM run `/vc-party establish`.

Late players use `/vc-session arrive`. Guests and replacement PCs can receive their own entry hook. Veilkeeper must not retcon that they were present all along unless established fiction supports that.

Imported character JSON may include `home`, `person`, `obligation`, `opening_status`, `goals`, `unresolved_incident`, `gm_hooks`, `faction_connections`, `entry_hooks`, and `exit_hooks`. These give Veilkeeper strong convergence material without deciding hidden answers for the player.


## Guest-controlled antagonists (v3.1.2)
An established NPC antagonist is **not** claimed with `/vc-guest claim`. A human GM creates an NPC Proxy assignment with `/vc-npc offer` or `/vc-npc proxy`.

The guest receives a sanitized NPC package through their registered private GM channel first, then DM. If neither delivery works, Veilkeeper places the same sanitized package in configured `#state-errors` for an admin GM to relay.

NPC-private knowledge is scoped to the NPC, not to the guest's ordinary PC. The guest may later return to a player character without inheriting antagonist-only facts. NPC proxy control ends automatically at session end or via `/vc-npc release`.
