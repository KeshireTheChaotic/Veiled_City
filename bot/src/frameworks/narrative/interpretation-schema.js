/** Closed, read-only interpretation shape used by the application GM. */
const text=maxLength=>({type:"string",maxLength});
const list=(items,maxItems=12)=>({type:"array",items,maxItems});
const object=properties=>({type:"object",additionalProperties:false,properties,required:Object.keys(properties)});
export const interpretationSchema={anyOf:[{type:"null"},object({source_ref:text(200),
  references:list(object({phrase:text(200),entity_type:{type:"string",enum:["location","npc","character","unknown"]},
    entity_key:text(160),source_refs:list(text(200),6),status:{type:"string",enum:["resolved","candidate","unresolved"]}})),
  intended_actions:list(text(600)),acknowledgements:list(text(600)),
  unresolved:list(object({question:text(300),blocks_action:{type:"boolean"}}),6)})]};
