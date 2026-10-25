/** Session needs native World event issuance, not independent event validation or authority. */
export function createSessionWorldEventConsumer(){
 let source=null;
 const consumer=Object.freeze({indexWorldEvent(...args){if(!source)throw Object.assign(new Error('Session/World native event source has not been composed.'),{code:'SESSION_WORLD_EVENT_COMPOSITION'});return source(...args);}});
 return Object.freeze({...consumer,bind(native){if(typeof native!=='function')throw new TypeError('Native World event function required.');if(source&&source!==native)throw new Error('Session/World native event replacement forbidden.');source=native;return consumer;}});
}
export const sessionWorldEvents=createSessionWorldEventConsumer();
