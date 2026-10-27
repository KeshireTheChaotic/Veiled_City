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
      if(native.narrativeRecordLimit!==undefined&&(!Number.isSafeInteger(native.narrativeRecordLimit)||native.narrativeRecordLimit<=0))throw new TypeError('Native Knowledge record limit must be a positive integer.');
      if(source&&(keys.some(key=>source[key]!==native[key])||source.narrativeRecordLimit!==native.narrativeRecordLimit))throw new Error('World/Knowledge source replacement forbidden.');
      source=Object.freeze({...Object.fromEntries(keys.map(key=>[key,native[key]])),narrativeRecordLimit:native.narrativeRecordLimit});return this;
    },
    factVisibleTo(...args){return current().factVisibleTo(...args);},
    listNarrativeRecords(...args){return current().listNarrativeRecords(...args);},
    narrativeRecordLimit(){const limit=current().narrativeRecordLimit;if(limit===undefined)throw new Error('World/Knowledge record limit has not been composed.');return limit;}
  });
}
export const worldKnowledgeSources=createWorldKnowledgeConsumer();
