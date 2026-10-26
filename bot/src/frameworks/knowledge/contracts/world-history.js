/** Original World summary reader only; never grants canon, actor knowledge or publication. */
export function createKnowledgeWorldHistoryConsumer(){let source=null;return Object.freeze({
 bind(native){if(typeof native!=='function')throw new TypeError('Original World historyContext function required.');if(source&&source!==native)throw new Error('Knowledge history source replacement forbidden.');source=native;return this;},
 historyContext(...args){if(!source)throw Object.assign(new Error('Knowledge World history source not composed.'),{code:'KNOWLEDGE_HISTORY_COMPOSITION'});return source(...args);}
});}
export const knowledgeWorldHistory=createKnowledgeWorldHistoryConsumer();
