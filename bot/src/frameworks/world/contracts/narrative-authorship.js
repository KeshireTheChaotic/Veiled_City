/** World consumes native Narrative proof, never model labels or an independently minted audience. */
export function createNarrativeAuthorshipConsumer(){
  let source=null;
  const required=['mintNarrativeAudience','revalidateNarrativeAudience','narrativeSourceVisible','fail'];
  const current=()=>{
    if(!source)throw Object.assign(new Error('Narrative/World authorship has not been composed.'),{code:'NARRATIVE_WORLD_COMPOSITION'});
    return source;
  };
  return Object.freeze({
    bind(native){
      if(required.some(key=>typeof native?.[key]!=='function'))throw new TypeError('Complete native Narrative authorship capabilities required.');
      if(source&&source!==native)throw new Error('Narrative/World authorship replacement forbidden.');
      source=native;return this;
    },
    mintNarrativeAudience(...args){return current().mintNarrativeAudience(...args);},
    revalidateNarrativeAudience(...args){return current().revalidateNarrativeAudience(...args);},
    narrativeSourceVisible(...args){return current().narrativeSourceVisible(...args);},
    fail(...args){return current().fail(...args);}
  });
}
export const worldNarrativeAuthorship=createNarrativeAuthorshipConsumer();
