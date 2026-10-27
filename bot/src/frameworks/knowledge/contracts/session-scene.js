/** Knowledge reads current scene, scene view, presence and principal through Session's original functions; Session keeps every rule. */
export function createKnowledgeSessionSceneConsumer(){
 let source=null;
 const keys=['currentScene','sceneView','scenePresence','conversationPrincipal'];
 const need=name=>{if(!source)throw Object.assign(new Error('Knowledge Session scene source has not been composed.'),{code:'KNOWLEDGE_SESSION_SCENE_COMPOSITION'});return source[name];};
 return Object.freeze({
  bind(session){
   if(keys.some(k=>typeof session?.[k]!=='function'))throw new TypeError('Original Session scene and principal functions required.');
   if(source&&keys.some(k=>source[k]!==session[k]))throw new Error('Knowledge Session scene source replacement forbidden.');
   source=Object.freeze(Object.fromEntries(keys.map(k=>[k,session[k]])));return this;
  },
  currentScene(...args){return need('currentScene')(...args);},
  sceneView(...args){return need('sceneView')(...args);},
  scenePresence(...args){return need('scenePresence')(...args);},
  conversationPrincipal(...args){return need('conversationPrincipal')(...args);},
 });
}
export const knowledgeSessionScene=createKnowledgeSessionSceneConsumer();
