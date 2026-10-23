/**
 * Session-owned port for the existing GMService.authorAssemblyScene signature.
 * @typedef {{mode:string, actorUserId:string|null, actorCharacterId:string|null}} OpeningAudience
 * The caller retains native source/revision/owner checks via options.assertCurrent.
 * This port adds no narrative, mechanical, publication or character-control authority.
 */
export function createOpeningAuthoringPort(capability){
  if(typeof capability?.authorAssemblyScene!=='function')throw new TypeError('Opening authoring requires an authorAssemblyScene capability.');
  const author=capability.authorAssemblyScene.bind(capability);
  return Object.freeze({authorAssemblyScene:(...args)=>author(...args)});
}
