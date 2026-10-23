/** Only an injected existing author capability; no provider or singleton is constructed here. */
export function createOpeningNarrativeCapability(author){
  if(typeof author?.authorAssemblyScene!=='function')throw new TypeError('Narrative opening requires an authorAssemblyScene capability.');
  const invoke=author.authorAssemblyScene.bind(author);
  return Object.freeze({authorAssemblyScene:(...args)=>invoke(...args)});
}
