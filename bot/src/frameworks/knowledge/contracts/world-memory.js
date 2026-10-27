/** Fixed original World functions for Knowledge source-relative memory; never objective canon or new audience authority. */
export function createKnowledgeWorldMemoryConsumer(){let source=null;const keys=["cityObject","cityKey","cityInteger","cityAudit","requireCitySource"];const current=()=>{if(!source)throw Object.assign(new Error('Knowledge World memory sources have not been composed.'),{code:'KNOWLEDGE_WORLD_MEMORY_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete native World memory source functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Knowledge memory source replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 cityObject(...args){return current().cityObject(...args);},
 cityKey(...args){return current().cityKey(...args);},
 cityInteger(...args){return current().cityInteger(...args);},
 cityAudit(...args){return current().cityAudit(...args);},
 requireCitySource(...args){return current().requireCitySource(...args);}
});}
export const knowledgeWorldMemory=createKnowledgeWorldMemoryConsumer();
