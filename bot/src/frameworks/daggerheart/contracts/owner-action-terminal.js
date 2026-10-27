/** Native rules read and record owner action terminals through Session's original functions; Session keeps the rule. */
export function createNativeOwnerActionTerminalConsumer(){
 let source=null;
 const keys=['overlapsOwnerActionTerminal','recordOwnerActionTerminal'];
 const need=name=>{if(!source)throw Object.assign(new Error('Native owner action terminal source has not been composed.'),{code:'NATIVE_OWNER_ACTION_TERMINAL_COMPOSITION'});return source[name];};
 return Object.freeze({
  bind(session){
   if(keys.some(k=>typeof session?.[k]!=='function'))throw new TypeError('Original Session owner action terminal functions required.');
   if(source&&keys.some(k=>source[k]!==session[k]))throw new Error('Native owner action terminal replacement forbidden.');
   source=Object.freeze(Object.fromEntries(keys.map(k=>[k,session[k]])));return this;
  },
  overlapsOwnerActionTerminal(...args){return need('overlapsOwnerActionTerminal')(...args);},
  recordOwnerActionTerminal(...args){return need('recordOwnerActionTerminal')(...args);},
 });
}
export const nativeOwnerActionTerminal=createNativeOwnerActionTerminalConsumer();
