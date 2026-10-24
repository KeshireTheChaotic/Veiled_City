/** One fixed publication consumer of read-only native mechanical projections. */
export function createNativeOutcomeConsumer(){
 let native=null,sourceFactory=null;
 const consumer=Object.freeze({
  handlesOutcome(kind){if(!native)throw Object.assign(new Error('Native outcome service has not been composed.'),{code:'NATIVE_OUTCOME_COMPOSITION'});return native.handlesOutcome(kind);},
  projectMechanicalOutcome(...args){if(!native)throw Object.assign(new Error('Native outcome service has not been composed.'),{code:'NATIVE_OUTCOME_COMPOSITION'});return native.projectMechanicalOutcome(...args);}
 });
 return Object.freeze({...consumer,
  provideSources(factory){if(typeof factory!=='function')throw new TypeError('Native outcome source factory required.');if(sourceFactory&&sourceFactory!==factory)throw new Error('Native outcome source factory already provided.');sourceFactory=factory;},
  sourceCapabilities(){if(!sourceFactory)throw Object.assign(new Error('Native outcome source factory has not been provided.'),{code:'NATIVE_OUTCOME_COMPOSITION'});return sourceFactory();},
  bind(service){if(typeof service?.handlesOutcome!=='function'||typeof service?.projectMechanicalOutcome!=='function')throw new TypeError('Complete native outcome service required.');if(native&&native!==service)throw new Error('Native outcome service replacement forbidden.');native=service;return consumer;}
 });
}
export const nativeOutcomeConsumer=createNativeOutcomeConsumer();
