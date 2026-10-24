/** Fixed character-owned consumer of native creation validation. No choice, rule or state mutation lives here. */
const methods=['validateDomainAccess','validateTraitSpread','validateStartingLoadout'];
export function createCharacterCreationConsumer(){
 let native=null,sourceFactory=null;
 const consumer=Object.freeze(Object.fromEntries(methods.map(name=>[name,(...args)=>{if(!native)throw Object.assign(new Error('Native creation service has not been composed.'),{code:'NATIVE_CREATION_COMPOSITION'});return native[name](...args);}])));
 return Object.freeze({...consumer,
  provideSources(factory){if(typeof factory!=='function')throw new TypeError('Character creation source factory required.');if(sourceFactory&&sourceFactory!==factory)throw new Error('Character creation source factory already provided.');sourceFactory=factory;},
  sourceCapabilities(){if(!sourceFactory)throw Object.assign(new Error('Character creation source factory has not been provided.'),{code:'NATIVE_CREATION_COMPOSITION'});return sourceFactory();},
  bind(service){if(methods.some(name=>typeof service?.[name]!=='function'))throw new TypeError('Complete native creation service required.');if(native&&native!==service)throw new Error('Native creation service replacement forbidden.');native=service;return consumer;}
 });
}
export const characterCreationConsumer=createCharacterCreationConsumer();
