/** Character observation receipts use World's original event index; no copied validation, audience or authority. */
export function createCharacterWorldEventsConsumer(){
 let source=null;
 return Object.freeze({
  bind(native){if(typeof native!=='function')throw new TypeError('Original World event index required.');if(source&&source!==native)throw new Error('Character World event source replacement forbidden.');source=native;return this;},
  indexWorldEvent(...args){if(!source)throw Object.assign(new Error('Character World event source has not been composed.'),{code:'CHARACTER_WORLD_EVENTS_COMPOSITION'});return source(...args);},
 });
}
export const characterWorldEvents=createCharacterWorldEventsConsumer();
