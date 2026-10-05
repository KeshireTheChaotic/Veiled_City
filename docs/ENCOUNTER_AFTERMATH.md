# Encounter Aftermath — v3.3.0

Encounter aftermath converts the result of a completed combat into persistent campaign consequences.

Before combat begins, Veilkeeper records the active PCs' starting resource state. At encounter end, the aftermath engine can consider the encounter objective, adversary outcomes, start/current PC resources, recent transcript, facts, clocks, and relationships.

It may propose:

- player-safe aftermath summary
- GM notes
- facts/clues/references/threads
- Veil Exposure or clock changes
- relationship changes
- evidence/handouts
- canon proposals

It is instructed not to duplicate HP/Stress/Hope changes already applied deterministically during combat.

## Modes

```text
auto
```
Default. Creates a snapshot, generates the aftermath, and applies it immediately.

```text
confirm
```
Stores a pending draft. GM uses `/vc-encounter aftermath-status`, then `/vc-encounter aftermath-confirm` or `/vc-encounter aftermath-discard`.

```text
none
```
Ends the encounter without an aftermath pass.

Set the global default with:

```env
ENCOUNTER_AFTERMATH_MODE=auto
```

Override per encounter:

```text
/vc-encounter end aftermath:confirm
```

A pre-aftermath campaign snapshot is created before consequences are committed.
