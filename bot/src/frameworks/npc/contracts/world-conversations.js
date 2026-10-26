/** Fixed original World operations; native rules retain cost, control and receipt authority. */
export function createNpcWorldConversationsConsumer(){let source=null;const keys=["cityObject","cityKey","cityAudit","requireCitySource","activeCityProxy","assertNpcAvailability","actorState","submitNpcAction"];const current=()=>{if(!source)throw Object.assign(new Error('NPC World conversations not composed.'),{code:'NPC_CONVERSATION_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete original World conversation functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('NPC World conversations replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 cityObject(...args){return current().cityObject(...args);},
 cityKey(...args){return current().cityKey(...args);},
 cityAudit(...args){return current().cityAudit(...args);},
 requireCitySource(...args){return current().requireCitySource(...args);},
 activeCityProxy(...args){return current().activeCityProxy(...args);},
 assertNpcAvailability(...args){return current().assertNpcAvailability(...args);},
 actorState(...args){return current().actorState(...args);},
 submitNpcAction(...args){return current().submitNpcAction(...args);}
});}
export const npcWorldConversations=createNpcWorldConversationsConsumer();
