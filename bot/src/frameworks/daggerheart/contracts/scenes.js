/** Native rules read and record scene presence through Session's original functions; Session keeps every scene rule. */
export function createNativeScenesConsumer(){
 let source=null;
 const keys=['currentScene','scenePresence','sceneAccess','recordScenePresence'];
 const need=name=>{if(!source)throw Object.assign(new Error('Native Session scene source has not been composed.'),{code:'NATIVE_SCENES_COMPOSITION'});return source[name];};
 return Object.freeze({
  bind(session){
   if(keys.some(k=>typeof session?.[k]!=='function'))throw new TypeError('Original Session scene functions required.');
   if(source&&keys.some(k=>source[k]!==session[k]))throw new Error('Native Session scene source replacement forbidden.');
   source=Object.freeze(Object.fromEntries(keys.map(k=>[k,session[k]])));return this;
  },
  currentScene(...args){return need('currentScene')(...args);},
  scenePresence(...args){return need('scenePresence')(...args);},
  sceneAccess(...args){return need('sceneAccess')(...args);},
  recordScenePresence(...args){return need('recordScenePresence')(...args);},
 });
}
export const nativeScenes=createNativeScenesConsumer();
