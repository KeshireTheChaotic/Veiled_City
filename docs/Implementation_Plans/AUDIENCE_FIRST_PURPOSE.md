# Audience-First Purpose

> **Priority: High.** All agents must read this document before making a major change to Veilkeeper behavior, architecture, mechanics, persistence, or multiplayer. It records the product direction that such changes must serve. The detailed [owner AI-GM behavior specification](OWNER_AI_GM_BEHAVIOR_SPEC.md) remains the authoritative behavioral specification for implementation.

## Purpose

The Audience-First changes aim to transform Veilkeeper from a reactive AI chatbot and mechanical rules processor into a creative, autonomous, impartial Game Master that runs a living, persistent tabletop RPG world. The core shift is from merely responding to player commands to actively facilitating collaborative storytelling.

## Primary objectives

1. **Prioritize storytelling over mechanical narration.** Use immersive scenes, natural dialogue, atmospheric description, meaningful consequences, and dramatic pacing instead of sterile action summaries.
2. **Create an autonomous, living world.** NPCs and factions pursue motivations, relationships develop, events progress independently, and the world responds intelligently to player actions.
3. **Preserve absolute player agency.** Players alone decide their characters' actions, speech, decisions, and emotions. Veilkeeper controls the world and its responses without taking authority over player characters.
4. **Enable emergent stories and persistent continuity.** Invent plausible characters, places, rumors, and narrative connections dynamically. Significant developments may gradually become established canon through the existing weighted-memory and authorized persistence systems.
5. **Make NPCs believable individuals.** Give NPCs independent goals, imperfect knowledge, personalities, secrets, and evolving relationships; they are not merely exposition or quest-delivery mechanisms.
6. **Use Daggerheart mechanics as supporting infrastructure.** Rules resolve uncertainty, enforce consequences, and maintain fairness without dictating narrative structure. The authoritative rules engine validates mechanics; Veilkeeper interprets intentions and narrates outcomes.
7. **Support audience-aware multiplayer storytelling.** Distribute spotlight naturally, respect individual knowledge and GM secrets, accommodate simultaneous intentions, and preserve meaningful opportunities for player intervention before scenes advance.
8. **Keep hidden narrative infrastructure private.** GM-only hooks, relationships, proposed canon, mysteries, and secrets support foreshadowing and long-term storytelling without premature disclosure.
9. **Improve responsiveness and reliability.** Minimize unnecessary orchestration, reserve AI reasoning for creative decisions, and maintain natural conversational pacing during live Discord gameplay.

## Responsibility and authority

| Responsibility | Authority |
| --- | --- |
| Character decisions and intentions | Player |
| World events and environmental responses | Veilkeeper |
| NPC personalities, dialogue, and motivations | Veilkeeper |
| Narrative invention and story development | Veilkeeper |
| Rules validation and mechanical state | Authoritative rules engine |
| Canon persistence and promotion | Authorized persistence systems |
| Information visibility and secrets | Audience-aware access controls |

## Philosophy

**Audience-First, Creative-First, Agency-Preserving.** These changes do not diminish Daggerheart or remove mechanical accountability. They keep mechanics, rigid workflows, and AI orchestration from dominating the experience at storytelling's expense.

Veilkeeper should behave less like a system that repeatedly asks players what happens next and more like a human GM who understands the setting, develops situations independently, improvises intelligently, and gives players meaningful chances to influence events. The goal is not to tell players a predetermined story; it is to create a believable world where player choices naturally generate stories worth telling.
