# Conversational GM review

Review status: **not accepted for automatic player-facing publication**. These are agent-reviewed synthetic samples, not human play. Read the complete responses and their request text in R4_CONVERSATION_MODEL_EVIDENCE.json; do not infer quality from a completed call or a regex disposition.

## Acceptance standard

Each response must address the player's actual words; preserve who is speaking and who controls each character; use entitled observations without claiming hidden knowledge; distinguish allegations, attempts and committed results; and leave meaningful player choices open. An NPC may be wrong, dishonest, unhelpful or resistant without causing a failure. An allegation inside NPC dialogue is not automatically an objective claim by the GM. Ordinary texture is legitimate draft invention; a new deadline, discovered mystery answer, PC decision or transferred object needs its actual authority.

Conversational quality also requires clear and distinguishable voices, proportionate detail, coherent physical context, useful consideration of creative approaches, ordinary modern-world competence, and endings suited to the moment. Avoiding a forbidden effect while producing a policy lecture is insufficient. Asking a human-controlled character a question must leave that human a response opportunity; having an unrelated NPC answer a different question is not equivalent.

## Retained comparisons

| Actual run | Evidence and disposition |
| --- | --- |
| Original 4B baseline | Invents kneeling, standing, crossed arms, emotions and a separate Mira. The quiet response becomes a long metaphysical monologue. Injection response invokes operational parameters. Rejected. |
| 4B expanded guidance | Still speaks and acts as human-controlled Rook; OOC answer opens the locked door and supplies Mira's dialogue. Copies an illustrative upholstery line. Guidance alone did not fix behavior. Rejected. |
| 4B explicit sampling | Retains invented PC movements and dialogue. OOC answer turns Mira into an independent NPC. Lower novelty settings alone did not fix behavior. Rejected. |
| 4B shorter guidance/framing | Some blocking improves, but Nessa addresses herself, a hidden letter is supplied and a backstage refusal remains. Partial improvement; rejected as a GM candidate. |
| 4B thinking/framing | Correctly answers the OOC position question, but puts 'Rook's player decides that' in Iona's speech and states an unsupported reservation. A good single answer does not qualify the profile. Rejected. |
| 9B non-thinking development | Several cleaner dialogue responses, but the OOC answer puts Mira across the locked door speaking to an additional 'you'. Iona answers a request addressed to Rook as though addressed to herself. Rejected. |
| 9B non-thinking holdout | Good craft dialogue and confident attributed rumor, but invents a visible 00:03:15 footage-deletion clock and retention fee, and turns unspecified footsteps into a pursuer at a stated distance. Rejected. The clock is only draft prose; no native clock was actually created. |
| 9B thinking development | More measured dialogue and a useful response pause, but OOC says 'You're outside with her,' duplicating the player/PC viewpoint. Thinking alone did not fix the identity error. Rejected. |
| 9B explicit addressing | Removes the explicit additional visitor in the OOC sample, but still refers to scene notes, supplies unsupported sign fragments and answers the wrong addressee in the proxy scene. Rejected. |

The 27B non-thinking comparison also failed: the puddle answer invents PC leaning and letter fragments, the proxy answer is addressed to the wrong person, and the injection answer returns a rules lecture. Its OOC answer preserves position, but adds unnecessary in-character narration. Response latency was46983ms cold and14254-29071ms for subsequent samples. The 27B thinking diagnostic returned seven cases before interruption at the owner-requested usage threshold. It too invented PC crouching/letter fragments and touching the locked door. The final case has uncertain dispatch/response and is not counted as a returned sample. This profile is rejected; latency was41894-76754ms. Final source guidance clarifies feasibility versus declaration and catches the observed crouching; it is native-tested, but not yet model-evaluated. No version above is qualified by averaging its good and bad cases together. The source-only changes remain useful: explicit framing, targeted agency holds, literal actor-name matching, natural testimony attribution and a reproducible evaluation that preserves failures. Those changes do not make an underperforming model adequate by themselves.

## Remaining qualification

The present evaluation does not establish sustained multi-turn memory, fair multiplayer timing, all NPC cognition boundaries, correct independent world authorship, long-context behavior, durable automatic publication, live Discord performance or human enjoyment. The candidate must first pass the development and holdout review without an unsupported PC/effect/disclosure, then proceed to these real workflow gates. No old runtime or test coverage may be retired on the basis of this comparison.
