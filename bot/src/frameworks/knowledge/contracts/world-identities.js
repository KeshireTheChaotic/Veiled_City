/** Knowledge retrieves established World identities; these callbacks confer no invention or movement authority. */
export function createKnowledgeWorldIdentityConsumer(){
  let source=null;
  const keys=['resolvePlaceReference','preflightNpcIdentity','worldIdentityOrigin'];
  const current=()=>{
    if(!source)throw Object.assign(new Error('Knowledge/World identity sources have not been composed.'),{code:'KNOWLEDGE_WORLD_IDENTITY_COMPOSITION'});
    return source;
  };
  return Object.freeze({
    bind(native){
      if(keys.some(key=>typeof native?.[key]!=='function'))throw new TypeError('Native World identity readers required.');
      if(source&&keys.some(key=>source[key]!==native[key]))throw new Error('Knowledge/World identity replacement forbidden.');
      source=Object.freeze(Object.fromEntries(keys.map(key=>[key,native[key]])));return this;
    },
    resolvePlaceReference(...args){return current().resolvePlaceReference(...args);},
    preflightNpcIdentity(...args){return current().preflightNpcIdentity(...args);},
    worldIdentityOrigin(...args){return current().worldIdentityOrigin(...args);}
  });
}
export const knowledgeWorldIdentities=createKnowledgeWorldIdentityConsumer();
