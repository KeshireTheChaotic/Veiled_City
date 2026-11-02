# RF06-F04 R91 — Encounter combat-state message

Move only the existing `/vc encounter combatants` message wrapper and 1,950-character clipping into a Discord-owned formatter. Preserve the command's GM guard, active-session and encounter lookups, combatant/roster/campaign reads, spotlight derivation, preformatted combatant rows, read order, empty-body copy and ephemeral reply.

Fresh tests cover exact header/body text, empty state, clipping, actual command read order, GM guard and ephemeral delivery. No combat mechanics, Native combatant rendering, Persistence SQL or authority moves.
