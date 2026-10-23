/** Intent-owned current source/board and proposal schema capability. Native rules remain independent of generated proposal labels. */
export function createUnifiedAdjudicationSourcePort(source){
  const methods=['inspectArbitrationOrigin','buildSceneIntentBoard','currentScenePlayerInputs','arbitrationTurnOrigin','matchesArbitrationSchema'];
  if(methods.some(name=>typeof source?.[name]!=='function')||!source.gmArbitrationProposalSchema||!source.unifiedArbitrationSchema)throw new TypeError('Complete current intent source/board capability required.');
  return Object.freeze({...Object.fromEntries(methods.map(name=>[name,source[name].bind(source)])),gmArbitrationProposalSchema:source.gmArbitrationProposalSchema,unifiedArbitrationSchema:source.unifiedArbitrationSchema});
}
