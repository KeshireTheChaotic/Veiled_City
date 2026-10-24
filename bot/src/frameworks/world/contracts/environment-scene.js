/** One explicit world consumer for the existing native scene service. No registry or authority inference. */
const methods=["validateMundaneEnvironmentDetail","validateMaintenanceMemoryFact","applyEnvironmentSceneAction","inspectEnvironmentSceneEffect","environmentSceneProjection"];
export function createEnvironmentSceneConsumer(){
 let service=null,sourceFactory=null;
 const consumer=Object.fromEntries(methods.map(name=>[name,(...args)=>{
  if(!service)throw Object.assign(new Error('Native scene service has not been composed.'),{code:'ENVIRONMENT_SCENE_COMPOSITION'});
  return service[name](...args);
 }]));
 Object.freeze(consumer);
 return Object.freeze({...consumer,
 provideSources(factory){
  if(typeof factory!=='function')throw new TypeError('World scene source factory required.');
  if(sourceFactory&&sourceFactory!==factory)throw new Error('World scene source factory already provided.');
  sourceFactory=factory;
 },
 sourceCapabilities(){
  if(!sourceFactory)throw Object.assign(new Error('World scene source factory has not been provided.'),{code:'ENVIRONMENT_SCENE_COMPOSITION'});
  return sourceFactory();
 },
 bind(native){
  if(methods.some(name=>typeof native?.[name]!=='function'))throw new TypeError('Complete native scene service required.');
  if(service&&service!==native)throw new Error('Native scene service already composed; replacement forbidden.');
  service=native;return consumer;
 }});
}
export const environmentSceneConsumer=createEnvironmentSceneConsumer();
