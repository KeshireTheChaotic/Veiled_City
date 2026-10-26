/** Fixed NPC attribution lookup, independent of World/NPC goal orchestration. */
export function createWorldNpcKnowledgeConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Native NPC source-attribution function required.');if(source&&source!==native)throw new Error('NPC source-attribution replacement forbidden.');source=native;return this;},
 ownedKnowledgeSource(...args){if(!source)throw Object.assign(new Error('NPC source attribution has not been composed.'),{code:'NPC_WORLD_KNOWLEDGE_COMPOSITION'});return source(...args);}
});}
export const worldNpcKnowledge=createWorldNpcKnowledgeConsumer();
