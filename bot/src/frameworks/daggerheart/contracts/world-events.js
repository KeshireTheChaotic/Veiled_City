/** Native rules record their receipts through World's original event index and audit; no copied validation or authority. */
export function createNativeWorldEventsConsumer(){
 let source=null;
 const need=name=>{if(!source)throw Object.assign(new Error('Native World event source has not been composed.'),{code:'NATIVE_WORLD_EVENTS_COMPOSITION'});return source[name];};
 return Object.freeze({
  bind(world){
   if(!world||!['indexWorldEvent','cityAudit','cityKey','cityObject'].every(name=>typeof world[name]==='function'))throw new TypeError('Original World event index, audit and key/object validators required.');
   if(source&&['indexWorldEvent','cityAudit','cityKey','cityObject'].some(name=>source[name]!==world[name]))throw new Error('Native World event source replacement forbidden.');
   source=Object.freeze({indexWorldEvent:world.indexWorldEvent,cityAudit:world.cityAudit,cityKey:world.cityKey,cityObject:world.cityObject});return this;
  },
  indexWorldEvent(...args){return need('indexWorldEvent')(...args);},
  cityAudit(...args){return need('cityAudit')(...args);},
  cityKey(...args){return need('cityKey')(...args);},
  cityObject(...args){return need('cityObject')(...args);},
 });
}
export const nativeWorldEvents=createNativeWorldEventsConsumer();
