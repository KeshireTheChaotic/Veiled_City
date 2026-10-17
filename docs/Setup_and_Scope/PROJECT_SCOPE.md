# Product scope and authority boundaries

## Purpose and runtime

Veilkeeper is a stateful, multiplayer, Daggerheart-based occult-noir GM bot for Discord. Players use public scene chat, private player channels and slash commands. Local Node.js services and SQLite handle identities, native rolls, encounter mechanics, history, facts, evidence, NPC state, role/consent gates, source-bound narrative publication and outbox delivery. The OpenAI Responses API supplies bounded interpretation, GM proposals, planning and creative wording. Optional voice is non-authoritative.

The code advertises application `0.0.0.1` and database schema `460`; the old v3–v10 document titles are **not** the application version of this branch. The documentation snapshot is the branch SHA on the [index](README.md), not `main`.

## In scope — existing pathways

- Character creation/import/advancement, attendance, voluntary party formation, late arrivals, guests and authorized human proxies.
- Native PC Duality Dice, owned roll requests, participation, combat/encounter resources, death/Armor, privacy-aware player and GM views.
- Player-authored intent and agency, NPC/world observations, local fiction, evidence/canon reviews, handouts, downtime, NPC/faction world state, typed narrative source/receipts.
- Session planning and owner-entitled personal assembly threads; published prose is checked against native audience and delivery proof.
- NPC standard GM d20 attacks, bounded supported feature adapters, owner-private reaction invitations, source-verified notifications and restart-safe outbox.
- Operator tools for configuration, seed, diagnostics, snapshots/backups, delegation policy and World Director control.

## Authority model

| Concern | Authoritative actor/system | What AI prose cannot do |
| --- | --- | --- |
| PC intent, speech, choices, consent | Authenticated player or lawful human proxy | Impersonate a PC or preselect acceptance, surrender, movement, disclosure or death choice |
| PC Duality and optional resources | Native rules + player execution/approval | Roll for a PC, spend their Hope/Armor or invent help/participation |
| GM discretion on *supported* rules | Current source-bound native GM adjudication | Forged `human_reviewed`, unexplained modifiers or automatic unqualified features |
| NPC/world actions | Current native actor/source/scene and feature executor | Conflate fictional narration with NPC movement, mechanics, paid Fear or hidden knowledge |
| Knowledge and public output | Native visibility/recipient/source checks | Reveal GM-only content or another player's private sources |
| Delivery | Queued native publication + destination/body/receipt verification | Re-send uncertain/acknowledged material or turn freeform GM drafts into facts |
| Administrative policy | Authorized GM/admin configuration and source-controlled release | Self-enable flags, rewrite canon, change deployment or bypass human administrator |

One principle runs throughout: **human declarations own intent; native receipts own outcomes; narration describes only what its audience may know**. Standard nonattack NPC fiction is often no-roll. GM d20 never awards player Hope/Fear. PvP, death and native defense/choice protocols retain their separate, stricter boundaries.

## Explicitly partial and not promised

The present code-owned feature inventory covers **153** authored special-feature occurrences: **12 bounded supported**, **140 review-only**, and **1 needs authoring**. A supported status applies only to its exact qualified scope, not an entire family. There is no generic environment/special-defense executor, blanket multi-target/reaction coverage, general Regent-command compliance or universal semantic-English safety proof. Current active plans and unqualified migration gates are in the **separate Active Implementation package**.

An earlier v9 core passed an offline validation at its historical commit; that result is **not** equivalent to a full mandatory validator at this later snapshot. Offline synthetic requests do not establish real Discord operation, quality, latency or production deployment.
