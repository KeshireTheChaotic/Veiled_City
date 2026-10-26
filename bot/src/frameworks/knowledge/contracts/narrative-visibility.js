/** Knowledge consumes the same native Narrative source closure; JSON labels are not disclosure proof. */
export function createKnowledgeNarrativeVisibilityConsumer(){
  let source=null;
  return Object.freeze({
    bind(native){
      if(typeof native!=='function')throw new TypeError('Native Narrative source visibility required.');
      if(source&&source!==native)throw new Error('Knowledge/Narrative visibility replacement forbidden.');
      source=native;return this;
    },
    narrativeSourceVisible(...args){
      if(!source)throw Object.assign(new Error('Knowledge/Narrative visibility has not been composed.'),{code:'KNOWLEDGE_NARRATIVE_COMPOSITION'});
      return source(...args);
    }
  });
}
export const knowledgeNarrativeVisibility=createKnowledgeNarrativeVisibilityConsumer();
