/** Original World validators, audit and source capabilities for Session records; not a placement grant. */
export function createSessionSceneWorldConsumer(){
 let source=null;
 const keys=["cityObject","cityKey","cityInteger","cityVisibility","cityAudit","requireCitySource","activeCityProxy"];
 const current=()=>{if(!source)throw Object.assign(new Error('Session scene World sources have not been composed.'),{code:'SESSION_SCENE_WORLD_COMPOSITION'});return source;};
 return Object.freeze({
  bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete native World scene sources required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('Session scene World source replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
  cityObject(...args){return current().cityObject(...args);},
  cityKey(...args){return current().cityKey(...args);},
  cityInteger(...args){return current().cityInteger(...args);},
  cityVisibility(...args){return current().cityVisibility(...args);},
  cityAudit(...args){return current().cityAudit(...args);},
  requireCitySource(...args){return current().requireCitySource(...args);},
  activeCityProxy(...args){return current().activeCityProxy(...args);}
 });
}
export const sessionSceneWorldSources=createSessionSceneWorldConsumer();
