/** Fixed native collaborator, without copied control policy or additional authority. */
export function createWorldActorControlConsumer(){
 let source=null;
 return Object.freeze({
  bind(native){if(typeof native!=='function')throw new TypeError('Native nativeActorControl function required.');if(source&&source!==native)throw new Error('Native nativeActorControl replacement forbidden.');source=native;return this;},
  nativeActorControl(...args){if(!source)throw Object.assign(new Error('Native nativeActorControl has not been composed.'),{code:'WORLD_ACTOR_CONTROL_COMPOSITION'});return source(...args);}
 });
}
export const worldNativeActorControl=createWorldActorControlConsumer();
