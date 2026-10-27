const object=properties=>({type:"object",additionalProperties:false,properties,required:Object.keys(properties)});
const text=maxLength=>({type:"string",maxLength});
const nonEmptyText=maxLength=>({type:"string",minLength:1,maxLength});
const common={key:{...nonEmptyText(100),pattern:"^[a-z0-9]+(?:-[a-z0-9]+)*$"},name:nonEmptyText(160),summary:nonEmptyText(600),visibility:{type:"string",enum:["party","character","gm"]}};
export const worldAdditionsSchema={type:"array",maxItems:4,items:{anyOf:[
  object({kind:{type:"string",enum:["location"]},...common,parent_location_key:text(160)}),
  object({kind:{type:"string",enum:["npc"]},...common,location_key:text(160),occupation:text(160),public_identity:text(160),portrayal:text(160)})
]}};
export const sceneActionsSchema={type:"array",maxItems:4,items:object({
  kind:{type:"string",enum:["reveal_nearby_place","move","introduce_npc","local_zone"]},
  entity_ref:text(160),source_span:text(1500),zone:text(160)
})};
export const worldConflictsSchema={type:"array",maxItems:2,items:object({canon_key:text(160),current_event_id:text(160),
  proposed_value:text(600),reason:text(600)})};
