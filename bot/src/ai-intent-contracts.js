/** Versioned, closed model intent contracts. Authority, receipts and derived impact are application-owned. */
const text=(maxLength=160)=>({type:"string",maxLength});
const choice=(...values)=>({type:"string",enum:values});
const integer=(minimum,maximum)=>({type:"integer",minimum,maximum});
const list=(items,maxItems=20)=>({type:"array",items,maxItems});
const object=properties=>({type:"object",additionalProperties:false,properties,required:Object.keys(properties)});
const actor={actor_type:choice("npc","faction","institution"),actor_key:text(),information_key:text()};
const source={source_event:text()};
const action=object({type:text(),target_type:choice("npc","faction","location","institution","district",""),
  target_key:text(),location_key:text(),information_key:text(),reason:text(1000)});
export const INTENT_PAYLOADS={
  goal:object({...actor,...source,op:choice("propose","reprioritize","pause","resume","supersede","complete","abandon"),
    goal_key:text(),new_goal_key:text(),objective:text(1000),reason:text(1000),priority:integer(0,100),confidence:integer(0,100),
    horizon:choice("immediate","near","long"),dependencies:list(text()),acceptable_methods:list(text()),conflicts:list(text())}),
  consequence:object({...source,op:choice("subscribe","unsubscribe","apply"),handler:choice("service"),entity_key:text(),
    event_kinds:list(text(),8),location_key:text(),delta:integer(-10,10)}),
  scene:object({...source,op:choice("record"),entity_type:choice("npc","character","adversary","evidence","hazard","entrance","barrier"),
    entity_key:text(),location_key:text(),zone:text(),to_zone:text(),range:choice("Melee","Very Close","Close","Far","Very Far",""),
    state:choice("actually_present","believed_present","uncertain","departed"),hidden:{type:"boolean"},
    known_to:list(text(180),30),visibility:choice("gm","party","public","character","player"),subject_key:text(),blocks:list(choice("sight","sound"),2)}),
  group:object({...source,op:choice("propose","respond"),operation:choice("form","join","leave","split","merge","dissolve"),
    group_key:text(),name:text(),members:list(text()),from_groups:list(text(),4),shared_projects:list(text(),8),
    member:text(),decision:choice("accept","decline",""),information_key:text(),reason:text(1000)}),
  strategy:object({...actor,...source,op:choice("propose","replan","run","pause","resume","abandon"),goal_key:text(),
    cost_ceiling:integer(1,20),deadline_minute:integer(0,1000000000),steps:list(object({key:text(),requires:list(text(),12),action}),12),
    alternatives:list(text(500),8),assumptions:list(text(500),8)}),
  arc:object({...source,op:choice("invite","candidate"),character_id:text(),arc_key:text(),type:choice("dilemma","stake","relationship","vow","choice","desire"),
    statement:text(1500),invitation:text(1000)}),
  discovery:object({...source,op:choice("lookup"),mode:choice("know","leads","changed","witness","arcs"),query:text(300)}),
  project:object({...source,op:choice("propose","advance","pause","resume","abandon"),character_id:text(),title:text(),participants:list(text(),8),
    result_ids:list(text(),8),npc_collaborators:list(object({npc_key:text(),information_key:text(),source_event:text(),commitment_key:text()}),8),
    phases:list(object({key:text(),title:text(),duration_minutes:integer(0,525600),requires:list(text(),8),prerequisites:list(text(),8)}),8)}),
  mediation:object({...source,op:choice("reconcile"),actor_type:choice("npc","institution"),actor_key:text(),action_key:text()}),
  memory:object({...source,op:choice("consolidate","revise","revert"),actor_type:choice("npc","faction","institution","campaign"),actor_key:text(),
    topic:text(),sources:list(object({kind:choice("npc_memory","memory","report","event"),key:text()}),20)}),
  density:object({...source,op:choice("inspect"),location_key:text()})
};
const causalBase={...source,op:choice("subscribe","unsubscribe","apply"),entity_key:text(),event_kinds:list(text(),8),location_key:text()};
INTENT_PAYLOADS.consequence={anyOf:[INTENT_PAYLOADS.consequence,
  object({...causalBase,handler:choice("goal"),goal:INTENT_PAYLOADS.goal}),
  object({...causalBase,handler:choice("transmit"),transmission:object({from_type:choice("npc","institution","community","audience"),
    from_key:text(),to_type:choice("npc","institution","community","audience"),to_key:text(),information_key:text(),mechanism:text(),distortion:integer(0,20)})})]};
export const intentOperations=feature=>(INTENT_PAYLOADS[feature]?.anyOf||[INTENT_PAYLOADS[feature]])
  .flatMap(schema=>schema?.properties.op.enum||[]);
export const intentArraySchema={type:"array",maxItems:4,items:{anyOf:Object.entries(INTENT_PAYLOADS).map(([feature,payload])=>object({
  version:integer(1,1),feature:choice(feature),target_key:text(),expected_revision:text(64),policy_revision:integer(0,1000000000),
  source_prerequisites:list(text(),8),payload
}))}};
export function validateIntent(value){
  function check(schema,input){
    if(schema.anyOf) return schema.anyOf.some(item=>check(item,input));
    if(schema.enum&&!schema.enum.includes(input)) return false;
    if(schema.type==="string") return typeof input==="string"&&(schema.maxLength===undefined||input.length<=schema.maxLength);
    if(schema.type==="integer") return Number.isSafeInteger(input)&&input>=schema.minimum&&input<=schema.maximum;
    if(schema.type==="boolean") return typeof input==="boolean";
    if(schema.type==="array") return Array.isArray(input)&&input.length<=schema.maxItems&&input.every(item=>check(schema.items,item));
    if(schema.type==="object") return input!==null&&typeof input==="object"&&!Array.isArray(input)
      &&Object.keys(input).length===schema.required.length&&schema.required.every(key=>Object.hasOwn(input,key)&&check(schema.properties[key],input[key]));
    return false;
  }
  return check(intentArraySchema.items,value);
}
export const INTENT_PROMPT=`Optional ai_intents are version-1 proposals, never completed effects. Use only supplied source IDs,
state fingerprints and policy revision. Never invent consent, reviewer identity, permission, rolls or movement.
For group responses use only that member's group_actor_packet, owned evidence and established preferences;
GM-only planning context is not member knowledge. Dissent is valid and must not be overwritten.
Use [] when no valid opportunity exists. Feature flags do not authorize execution. Pending/blocked/rejected receipts
are not accomplished events; describe invitations and plans as proposals. No extra calls per actor are required.`;
