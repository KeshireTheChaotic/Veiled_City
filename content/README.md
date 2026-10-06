# VEILED CITY — Multiplayer Campaign Content
**Daggerheart SRD 2.0 homebrew campaign package • modern occult-noir • model-portable**

Veiled City is a present-day hidden-magic campaign frame for multiplayer Daggerheart play. The visible world is contemporary and recognizable; beneath it, supernatural courts, spirits, occult investigators, predatory institutions, strange markets, and ancient bargains compete behind a reality-softening phenomenon called **the Veil**.

This package is intentionally split by visibility.

## READ THIS FIRST
- `PLAYER/` — **PLAYER SAFE.** No intended campaign spoilers.
  - `PLAYER/PLAYERS/` — standard portable path for player-safe per-character freeform Markdown.
- `CARDS/` — **PLAYER SAFE.** Character options and item/card mechanics.
- `ENGINE/` — **PLAYER SAFE.** Model-independent GM operating instructions and persistence protocol.
- `STATE/` — player-facing save state and schemas.
- `GM_PRIVATE/` — **AI DM ONLY / SPOILERS. DO NOT OPEN DURING PLAY.** Mysteries, hidden motives, unrevealed clocks, adversaries, secret location truths, and campaign metaplot.
  - `GM_PRIVATE/PLAYERS/` — standard portable path for GM-only per-character freeform Markdown.

## Current rules baseline
Built for **Daggerheart SRD 2.0 (August 25, 2026)**. Core rules remain authoritative. This package contains original homebrew rather than reproducing the core rulebook.

Official references:
- https://www.daggerheart.com/srd/
- https://www.daggerheart.com/homebrewkit/

## What's new in v2.0
- Complete **Veiled City Campaign Frame** and character-creation layer.
- Four full custom domains — **Hex, Signal, Veil, Pact** — each with 21 cards across levels 1–10.
- Eight modern-occult communities and six setting ancestries.
- Optional **Occult Scar** cards for supernatural changes acquired in play.
- Modern weapons, occult weapons, armor, consumables, relics, services, and vehicles.
- 41 multiplayer adversaries across Tiers 1–4 with Daggerheart Battle Point metadata.
- 16 urban-occult environments.
- Eight factions with hidden agendas and clocks.
- Twenty-one major NPC dossiers.
- Twenty-four recurring locations.
- Seven complete mystery modules plus a Tier 1–4 campaign spine.
- Mobile/travel play mode and concise cross-model handoff prompts.
- Expanded JSON persistence state and validation utilities.

## Starting a game
Give your chosen AI model these files first:
1. `ENGINE/AI_GM_CONSTITUTION.md`
2. `ENGINE/DAGGERHEART_MULTIPLAYER_CORE.md`
3. `ENGINE/MODEL_START_PROMPT.md`
4. `PLAYER/CAMPAIGN_FRAME.md`
5. `PLAYER/CHARACTER_CREATION.md`
6. `STATE/CAMPAIGN_STATE.json`
7. `GM_PRIVATE/GM_STATE.json` **without reading it yourself**

Then provide the character sheet and any selected card files. The AI can request additional files from the package as needed.

## Authority and persistence
The newest explicitly confirmed JSON save files are authoritative over chat memory. A model must never silently fill missing campaign state with invented “remembered” facts.

## Homebrew status
All Veiled City setting text and custom game content in this package is original homebrew. It is not an official Darrington Press product. Treat mechanical material as **playtest content** and adjust if your table discovers an unintended interaction.
