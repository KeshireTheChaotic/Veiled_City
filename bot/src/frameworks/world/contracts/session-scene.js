/** Native World travel/hook context consumes original Session scene evidence, never PC placement permission. */
export function createWorldSessionSceneConsumer(){let source=null;const keys=['currentScene','reconcileSceneArrival'];const current=()=>{if(!source)throw Object.assign(new Error('World Session scene source has not been composed.'),{code:'WORLD_SESSION_SCENE_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Native Session scene functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('World Session scene replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 currentScene(...args){return current().currentScene(...args);},reconcileSceneArrival(...args){return current().reconcileSceneArrival(...args);}
});}
export const worldSessionScene=createWorldSessionSceneConsumer();
