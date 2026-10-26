/** Fixed native collaborator, without copied control policy or additional authority. */
export function createNativeWorldProxyConsumer(){
 let source=null;
 return Object.freeze({
  bind(native){if(typeof native!=='function')throw new TypeError('Native activeCityProxy function required.');if(source&&source!==native)throw new Error('Native activeCityProxy replacement forbidden.');source=native;return this;},
  activeCityProxy(...args){if(!source)throw Object.assign(new Error('Native activeCityProxy has not been composed.'),{code:'NATIVE_WORLD_PROXY_COMPOSITION'});return source(...args);}
 });
}
export const nativeWorldProxy=createNativeWorldProxyConsumer();
