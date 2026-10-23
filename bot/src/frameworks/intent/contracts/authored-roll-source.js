/** Intent-owned authored input reader. Native rules independently validate accepted source, owner, scope and exact selection. */
export function createAuthoredRollSourceCapability(source){
  if(typeof source?.authoredTurnEnvelope!=='function')throw new TypeError('Authored roll envelope reader required.');
  return Object.freeze({authoredTurnEnvelope:source.authoredTurnEnvelope.bind(source)});
}
