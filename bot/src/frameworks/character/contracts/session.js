/** Character observation reads scene, access, presence and principal through Session's original functions; Session keeps every rule. */
export function createCharacterSessionConsumer(){
 let source=null;
 const keys=['currentScene','sceneAccess','scenePresence','conversationPrincipal'];
 const need=name=>{if(!source)throw Object.assign(new Error('Character Session source has not been composed.'),{code:'CHARACTER_SESSION_COMPOSITION'});return source[name];};
 return Object.freeze({
  bind(session){
   if(keys.some(k=>typeof session?.[k]!=='function'))throw new TypeError('Original Session scene and principal functions required.');
   if(source&&keys.some(k=>source[k]!==session[k]))throw new Error('Character Session source replacement forbidden.');
   source=Object.freeze(Object.fromEntries(keys.map(k=>[k,session[k]])));return this;
  },
  currentScene(...args){return need('currentScene')(...args);},
  sceneAccess(...args){return need('sceneAccess')(...args);},
  scenePresence(...args){return need('scenePresence')(...args);},
  conversationPrincipal(...args){return need('conversationPrincipal')(...args);},
 });
}
export const characterSession=createCharacterSessionConsumer();
