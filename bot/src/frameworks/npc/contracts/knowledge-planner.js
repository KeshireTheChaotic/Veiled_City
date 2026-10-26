/** Exact original Knowledge class, not an actor knowledge grant or provider. */
export function createNpcKnowledgePlannerConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function'||typeof native.prototype?.plan!=='function')throw new TypeError('Original ContextPlanner class required.');if(source&&source!==native)throw new Error('NPC Knowledge planner replacement forbidden.');source=native;return this;},
 plannerClass(){if(!source)throw Object.assign(new Error('NPC Knowledge planner not composed.'),{code:'NPC_CONVERSATION_PLANNER_COMPOSITION'});return source;}
});}
export const npcKnowledgePlanner=createNpcKnowledgePlannerConsumer();
