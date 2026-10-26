/** Fixed original native World capabilities; no policy, grant or receipt copied into adapter. */
export function createIntentWorldPrimitivesConsumer(){let source=null;const keys=["requireCitySource","cityObject","cityInteger","cityAudit","indexWorldEvent"];const current=()=>{if(!source)throw Object.assign(new Error('Intent native world-primitives source not composed.'),{code:'INTENT_WORLD_NATIVE_COMPOSITION'});return source;};return Object.freeze({
 bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete original native World world-primitives functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Intent native World source replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 requireCitySource(...args){return current().requireCitySource(...args);},
 cityObject(...args){return current().cityObject(...args);},
 cityInteger(...args){return current().cityInteger(...args);},
 cityAudit(...args){return current().cityAudit(...args);},
 indexWorldEvent(...args){return current().indexWorldEvent(...args);}
});}
export const intentWorldPrimitives=createIntentWorldPrimitivesConsumer();
