# Guest-Controlled NPC Antagonists — v3.1.2

Veilkeeper can temporarily hand one established NPC antagonist to a guest player without treating that NPC as a guest PC and without exposing the full GM record.

## Why this is a separate system
An antagonist may know secrets the party does not, while the GM may know far more than the antagonist. `/vc guest claim` is therefore not used for antagonists. NPC control uses a **sanitized NPC Proxy package** with its own knowledge boundary.

## Control levels
- **Portrayal** — the guest controls dialogue, demeanor, social choices, and characterization. Veilkeeper retains tactics/mechanics unless the human GM explicitly expands authority.
- **Tactical** — recommended. The guest controls portrayal, movement, listed abilities, and tactical choices. Veilkeeper resolves mechanics, dice, damage, and world reactions.
- **Full NPC** — the guest controls all voluntary decisions of that one NPC using only the supplied package. This is still not co-GM access.

## Recommended workflow: offer then claim
Human GM:

`/vc npc offer npc:"Doctor Vale" player:@Guest control:tactical objective:"Recover the correction device without being captured."`

Veilkeeper generates and stores a sanitized package, then delivers it in this order:
1. the guest's registered private GM channel;
2. Discord DM if no usable private channel exists;
3. if both fail, `#state-errors`, clearly marked for an admin GM to relay.

The guest receives the full player-facing package before accepting, including explicit **DO** and **DON'T** rules.

Guest:

`/vc npc claim npc:"Doctor Vale"`

To decline:

`/vc npc decline npc:"Doctor Vale"`

## Immediate assignment
A GM may skip the claim step:

`/vc npc proxy npc:"Doctor Vale" player:@Guest control:tactical`

This activates control immediately and sends the same sanitized package.

## Acting as the NPC
If the guest controls only the NPC, ordinary messages in `#the-table` default to that NPC.

If the guest also controls a PC or another proxy, prefix actions:

`Doctor Vale: I step behind the ward and offer Mercer a bargain.`

or

`[Doctor Vale] I trigger the prepared seal.`

Veilkeeper refuses to guess which role is speaking when multiple roles are active.

## Secret NPC actions
A registered private GM channel can be used for secret NPC actions. Prefix the NPC name when the player controls more than one role.

A DM may receive the control package, but v3.1.2 does not treat inbound Discord DMs as a campaign scene input. For two-way secret play, create/register a private GM channel.

## Package boundary
The guest package may include:
- identity and portrayal cues;
- the NPC's current objective;
- knowledge the NPC is allowed to use;
- relevant relationships;
- capabilities the guest may choose;
- limits/vulnerabilities the guest should know;
- scene cues.

It must not include unrelated GM secrets, another PC's private knowledge, hidden clocks, future scenes, or mystery answers the NPC does not know.

NPC-private discoveries are stored under a stable NPC knowledge identity rather than the guest's normal PC. Switching back to a player character does not transfer antagonist-only information.

## Ending control
The guest or human GM can use:

`/vc npc release npc:"Doctor Vale"`

All active/offered NPC proxies are also released automatically when the session ends. Veilkeeper resumes normal GM control afterward.

## Other commands
`/vc npc status` — player sees their offers/active proxies; GM sees all active/offered proxies.

`/vc npc packet npc:"Doctor Vale"` — re-send the sanitized player package using the same private-channel → DM → `#state-errors` fallback.

## Human-GM review
The packet generator uses GM-private context to understand the antagonist, but outputs a deliberately sanitized player packet. If an antagonist sits at the center of a major mystery, use a precise `objective:` and `gm_notes:` when creating the proxy and review the GM log entry after generation.
