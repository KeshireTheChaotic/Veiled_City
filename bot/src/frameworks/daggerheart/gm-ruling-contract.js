/** Native closed proposal contract; structural validation never grants gameplay authority. */
export function createGmRulingContract(){
/** Dependency-free shared proposal schema; no gameplay side effects. */
const text=n=>({type:"string",maxLength:n});
const list=n=>({type:"array",maxItems:n,items:text(200)});
const object=properties=>({type:"object",additionalProperties:false,properties,required:Object.keys(properties)});
const gmRulingSchema=object({version:{type:"integer",enum:[1]},
  disposition:{type:"string",enum:["narrative_no_roll","standard_action_roll","needs_review"]},
  context_refs:list(8),capability:object({kind:{type:"string",enum:["mundane","special","unverified"]},ref:text(200)}),
  effect_class:{type:"string",enum:["observation","attempt_only","scene","resource","damage","custody","special"]},
  trait:{anyOf:[{type:"string",enum:["Agility","Strength","Finesse","Instinct","Presence","Knowledge"]},{type:"null"}]},
  difficulty:{anyOf:[{type:"integer",minimum:0,maximum:100},{type:"null"}]},
  risk:text(300),stakes:text(600),explanation:text(600),difficulty_reason:text(600),
  saved_ruling_key:text(160),override_refs:list(8),raw_refs:list(8),house_refs:list(8),homebrew_refs:list(8),modifier_keys:list(20)});
function matches(schema,value){
  if(schema.anyOf)return schema.anyOf.some(form=>matches(form,value));
  if(schema.enum)return schema.enum.includes(value);
  if(schema.type==="null")return value===null;
  if(schema.type==="integer")return Number.isSafeInteger(value)&&value>=(schema.minimum??-Infinity)&&value<=(schema.maximum??Infinity);
  if(schema.type==="string")return typeof value==="string"&&value.length<=schema.maxLength;
  if(schema.type==="array")return Array.isArray(value)&&value.length<=schema.maxItems
    &&new Set(value).size===value.length&&value.every(item=>matches(schema.items,item));
  return value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length
    &&schema.required.every(key=>Object.hasOwn(value,key)&&matches(schema.properties[key],value[key]));
}
function validateGmRulingProposal(value){
  if(!matches(gmRulingSchema,value))throw new Error("Closed versioned GM ruling proposal required.");
  return value;
}

return Object.freeze({gmRulingSchema,validateGmRulingProposal});
}
