/** One explicit narrative consumer of native bilateral agreement policy. No generic service registry or model authority. */
const methods=["pvpOwnerContext","proposePvp","reviewPvp","pvpInbox","revisePvp","validatePvpAgreement","respondPvp","stagePvpAttempts"];
export function createPvpAgreementConsumer(){
 let native=null,sourceFactory=null;
 const consumer=Object.freeze(Object.fromEntries(methods.map(name=>[name,(...args)=>{
  if(!native)throw Object.assign(new Error('Native bilateral agreement service has not been composed.'),{code:'NATIVE_PVP_COMPOSITION'});
  return native[name](...args);
 }])));
 return Object.freeze({...consumer,
 provideSources(factory){if(typeof factory!=='function')throw new TypeError('Agreement source factory required.');if(sourceFactory&&sourceFactory!==factory)throw new Error('Agreement source factory already provided.');sourceFactory=factory;},
 sourceCapabilities(){if(!sourceFactory)throw Object.assign(new Error('Agreement source factory has not been provided.'),{code:'NATIVE_PVP_COMPOSITION'});return sourceFactory();},
 bind(service){if(methods.some(name=>typeof service?.[name]!=='function'))throw new TypeError('Complete native agreement service required.');if(native&&native!==service)throw new Error('Native agreement service replacement forbidden.');native=service;return consumer;}
 });
}
export const pvpAgreementConsumer=createPvpAgreementConsumer();
