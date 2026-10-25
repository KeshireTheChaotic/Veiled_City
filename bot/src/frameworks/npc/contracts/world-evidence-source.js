/** One fixed NPC-owned actor-evidence source; no model-facing registry or copied policy. */
export function createNpcEvidenceProvider(){
 let sourceFactory=null;
 return Object.freeze({
  provideSource(factory){if(typeof factory!=='function')throw new TypeError('NPC actor-evidence source factory required.');if(sourceFactory&&sourceFactory!==factory)throw new Error('NPC actor-evidence source already provided.');sourceFactory=factory;},
  actorSourceFunction(){if(!sourceFactory)throw Object.assign(new Error('NPC actor-evidence source has not been provided.'),{code:'NPC_WORLD_EVIDENCE_COMPOSITION'});const source=sourceFactory();if(typeof source!=='function')throw new TypeError('Native NPC actor-evidence function required.');return source;}
 });
}
export const npcEvidenceProvider=createNpcEvidenceProvider();
