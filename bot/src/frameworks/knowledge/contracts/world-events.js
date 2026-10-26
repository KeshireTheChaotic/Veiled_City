/** Knowledge needs World event issuance and its audit; evidence policy remains Knowledge-owned. */
export function createKnowledgeWorldEventConsumer(){
  let source=null;
  const keys=['indexWorldEvent','cityAudit'];
  const current=()=>{
    if(!source)throw Object.assign(new Error('Knowledge/World events have not been composed.'),{code:'KNOWLEDGE_WORLD_COMPOSITION'});
    return source;
  };
  return Object.freeze({
    bind(native){
      if(keys.some(key=>typeof native?.[key]!=='function'))throw new TypeError('Native World event and audit functions required.');
      if(source&&keys.some(key=>source[key]!==native[key]))throw new Error('Knowledge/World event replacement forbidden.');
      source=Object.freeze(Object.fromEntries(keys.map(key=>[key,native[key]])));return this;
    },
    indexWorldEvent(...args){return current().indexWorldEvent(...args);},
    cityAudit(...args){return current().cityAudit(...args);}
  });
}
export const knowledgeWorldEvents=createKnowledgeWorldEventConsumer();
