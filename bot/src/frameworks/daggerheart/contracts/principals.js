/** Native rules authenticate owners through Session's original principal readers; Session keeps every identity rule. */
export function createNativePrincipalsConsumer(){
 let source=null;
 const keys=['conversationPrincipal','historicalOwnerPrincipal'];
 const need=name=>{if(!source)throw Object.assign(new Error('Native Session principal source has not been composed.'),{code:'NATIVE_PRINCIPALS_COMPOSITION'});return source[name];};
 return Object.freeze({
  bind(session){
   if(keys.some(k=>typeof session?.[k]!=='function'))throw new TypeError('Original Session principal functions required.');
   if(source&&keys.some(k=>source[k]!==session[k]))throw new Error('Native Session principal source replacement forbidden.');
   source=Object.freeze(Object.fromEntries(keys.map(k=>[k,session[k]])));return this;
  },
  conversationPrincipal(...args){return need('conversationPrincipal')(...args);},
  historicalOwnerPrincipal(...args){return need('historicalOwnerPrincipal')(...args);},
 });
}
export const nativePrincipals=createNativePrincipalsConsumer();
