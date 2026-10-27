/** Native rules ask World's original NPC availability check; World keeps every schedule rule. */
export function createNativeNpcAvailabilityConsumer(){
 let source=null;
 return Object.freeze({
  bind(native){if(typeof native!=='function')throw new TypeError('Native assertNpcAvailability function required.');if(source&&source!==native)throw new Error('Native NPC availability replacement forbidden.');source=native;return this;},
  assertNpcAvailability(...args){if(!source)throw Object.assign(new Error('Native NPC availability has not been composed.'),{code:'NATIVE_NPC_AVAILABILITY_COMPOSITION'});return source(...args);}
 });
}
export const nativeNpcAvailability=createNativeNpcAvailabilityConsumer();
