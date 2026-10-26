/** World authorship consumes existing Knowledge disclosure and native record paging, never new knowledge. */
export function createWorldKnowledgeConsumer(){
  let source=null;
  const keys=['factVisibleTo','listNarrativeRecords'];
  const current=()=>{
    if(!source)throw Object.assign(new Error('World/Knowledge sources have not been composed.'),{code:'WORLD_KNOWLEDGE_COMPOSITION'});
    return source;
  };
  return Object.freeze({
    bind(native){
      if(keys.some(key=>typeof native?.[key]!=='function'))throw new TypeError('Native Knowledge disclosure and record functions required.');
      if(source&&keys.some(key=>source[key]!==native[key]))throw new Error('World/Knowledge source replacement forbidden.');
      source=Object.freeze(Object.fromEntries(keys.map(key=>[key,native[key]])));return this;
    },
    factVisibleTo(...args){return current().factVisibleTo(...args);},
    listNarrativeRecords(...args){return current().listNarrativeRecords(...args);}
  });
}
export const worldKnowledgeSources=createWorldKnowledgeConsumer();
