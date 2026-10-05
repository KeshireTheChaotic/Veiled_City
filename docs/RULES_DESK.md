# Low-Cost Rules Desk

v3.1 adds a separate rules-answer path so routine mechanical questions do not invoke the full narrative GM model.

## Configure
Set a Discord channel:

`/vc-campaign channels rules_channel:#rules-questions`

Set the inexpensive model in `.env`:

```env
OPENAI_RULES_MODEL=gpt-6-luna
RULES_MAX_OUTPUT_TOKENS=500
MAX_RULES_CHUNKS=6
```

If `OPENAI_RULES_MODEL` is omitted, Veilkeeper uses `OPENAI_ROUTER_MODEL`.

## Behavior
In the configured rules channel, Veilkeeper responds to messages that look like questions or explicitly mention rules/mechanics. The rules path:

- searches only player-safe package content;
- never loads `GM_PRIVATE` reference material;
- may include the asking player's current player-safe character sheet;
- does not create facts, clocks, resource changes, threads, NPC/location updates, or fiction;
- uses a short output limit;
- labels unsupported/uncertain answers as a provisional ruling rather than claiming certainty.

Examples:

- `Does Help an Ally cost Hope?`
- `Can Threshold Sense detect a ward automatically?`
- `How does Severe damage interact with armor?`
- `Can my Veil domain card work on a security camera?`

Use `/vc-rules ask` if you want the same behavior outside the dedicated channel.

## What belongs at the table instead
If the question is really a fictional action—"I use Threshold Sense on this specific locked door; what do I notice?"—ask it in `#the-table`. That requires world state and should use the normal GM path.
