/** Scoped fictional interpretation. Meaning and referents never authorize movement, consent, knowledge or canon. */
import { createHash } from "node:crypto";
import { personalCharacter } from "./personal-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { scopedQueryPlan, queryScopedFacts } from "./scoped-query.js";
import { indexWorldEvent, cityAudit } from "./city-calendar.js";
import { locationMatches } from "./scene-entry.js";
// Typed movement now comes from the main GM player_intents contract.
const text=maxLength=>({type:"string",maxLength});
const list=(items,maxItems=12)=>({type:"array",items,maxItems});
const object=properties=>({type:"object",additionalProperties:false,properties,required:Object.keys(properties)});
export const interpretationSchema={anyOf:[{type:"null"},object({source_ref:text(200),
  references:list(object({phrase:text(200),entity_type:{type:"string",enum:["location","npc","character","unknown"]},
    entity_key:text(160),source_refs:list(text(200),6),status:{type:"string",enum:["resolved","candidate","unresolved"]}})),
  intended_actions:list(text(600)),acknowledgements:list(text(600)),
  unresolved:list(object({question:text(300),blocks_action:{type:"boolean"}}),6)})]};
export const CONTEXT_CONTRACT="narrative_interpretation is optional read-only meaning, not a mutation proposal. "
  +"Resolve ordinary names, pronouns and implied referents from audience-visible context without exact-phrase requirements. "
  +"Set it to null unless SCOPED INTERPRETATION supplies input_source. Its source_ref must exactly equal input_source. "
  +"Reference source_refs must be copied only from audience-visible source_ref values supplied in scoped context; unknown entities stay candidate/unresolved. "
  +"Acknowledgements do not need movement/material claims. Never put completed movement, access, possession, status, disclosure or obligations in acknowledgements. "
  +"Copy intended_actions as exact authored source spans; do not paraphrase them. Only unresolved questions that materially affect an action should block that action; continue ordinary conversation. "
  +"Interpretation cannot authorize travel, presence, access, NPC knowledge, spending, consent or canon. State changes require separate native proposals.";
export const contextSourceKey=(messageId,character)=>`context:${createHash("sha256").update(JSON.stringify([messageId,character])).digest("hex").slice(0,40)}`;
export function captureContextSource(db,guild,user,character,messageId,content,{privateScene=false}={}){
  if(!messageId||!character||db.getCityCalendar(guild).flags.natural_language!==true) return null;
  let principal;try{principal=conversationPrincipal(db,guild,user,character);}catch{return null;}
  const pc={id:principal.character_id};
  const key=contextSourceKey(messageId,pc.id),prior=db.getWorldEvent(guild,key);if(prior)return prior;
  return indexWorldEvent(db,guild,{key,kind:"owner_context",title:"Authenticated conversational input; no completed consequences",
    source_id:`player:${user}`,session_id:db.getActiveSession(guild).id,visibility:privateScene?(principal.kind==="owner"?"character":"player"):"party",
    subject_key:privateScene?(principal.kind==="owner"?pc.id:user):"",
    details:{author:user,character_id:pc.id,message_id:messageId,text:String(content).slice(0,4000),private_scene:privateScene,
      principal:{kind:principal.kind,revision:principal.revision,context_id:principal.context_id},
      authority:"Interpretive input only; not state, presence, knowledge or consent."}},user);
}
const eventKey=key=>String(key).replace(/^event:/,"");
export function contextSourceVisible(source,scope){
  if(source?.kind==="owner_context"&&source.details.private_scene&&source.details.principal
    &&source.details.principal.context_id!==(scope.contextId||scope.actorCharacterId))return false;
  return source?.status==="active"&&(["public","party"].includes(source.visibility)
    ||source.kind==="player_declaration"&&source.details.private_scene===false
      &&source.details.author===scope.actorUserId&&source.details.character_id===scope.actorCharacterId
    ||scope.mode==="private"
    &&(source.visibility==="character"&&source.subject_key===(scope.contextId||scope.actorCharacterId)||source.visibility==="player"&&source.subject_key===scope.actorUserId));
}
export function validateInterpretation(db,guild,value,scope){
  if(value==null) return null;
  function check(schema,input){
    if(schema.anyOf)return schema.anyOf.some(option=>check(option,input));
    if(schema.enum)return schema.enum.includes(input);
    if(schema.type==="null")return input===null;
    if(schema.type==="string")return typeof input==="string"&&input.length<=schema.maxLength;
    if(schema.type==="boolean")return typeof input==="boolean";
    if(schema.type==="array")return Array.isArray(input)&&input.length<=schema.maxItems&&input.every(item=>check(schema.items,item));
    return !!input&&typeof input==="object"&&!Array.isArray(input)&&Object.keys(input).length===schema.required.length
      &&schema.required.every(key=>Object.hasOwn(input,key)&&check(schema.properties[key],input[key]));
  }
  const fail=reason=>{throw Object.assign(new Error("Interpretation needs bounded audience-visible sources; it never authorizes consequences."),
    {code:"NARRATIVE_CONTEXT",diagnostic:{reason}});};
  if(!check(interpretationSchema,value))fail("closed_schema");
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  scope={...scope,contextId:principal.context_id};
  const source=db.getWorldEvent(guild,eventKey(value.source_ref)),session=db.getActiveSession(guild);
  if(!source||source.kind!=="owner_context"||source.session_id!==session?.id||source.details.author!==scope.actorUserId
    ||source.details.character_id!==scope.actorCharacterId||!contextSourceVisible(source,scope)
    ||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId)
    ||(source.details.principal?source.details.principal.revision!==principal.revision:principal.kind!=="owner"))fail("current_input_source");
  for(const ref of value.references){
    if(!ref.source_refs.length)fail("reference_source_required");
    if(ref.source_refs.some(key=>!contextSourceVisible(db.getWorldEvent(guild,eventKey(key)),scope)))fail("reference_source_visibility");
    if(ref.status==="resolved"){
      const entity=ref.entity_type==="character"?db.getCharacter(ref.entity_key):ref.entity_type==="npc"?db.getNpcProfile(guild,ref.entity_key)
        :ref.entity_type==="location"?db.getSimulationEntity(guild,"location",ref.entity_key):null;
      if(!entity||entity.guild_id!==guild)fail("resolved_entity");
    }
  }
  return value;
}
export function interpretationContext(db,guild,user,character,query="",{mode="private",messageId=null,botUserId=null}={}){
  if(!character||db.getCityCalendar(guild).flags.natural_language!==true)return null;
  let principal;try{principal=conversationPrincipal(db,guild,user,character);}catch{return null;}
  const pc={id:principal.character_id},contextId=principal.context_id;
  const scope={mode,actorUserId:user,actorCharacterId:pc.id,contextId};
  const terms=[...new Set(String(query).toLowerCase().match(/[a-z0-9-]{3,}/g)||[])].slice(0,8);
  const rows=terms.flatMap(term=>db.characterContinuity(guild,contextId,{kind:"narrative_context",query:term,limit:12}));
  const recent=db.characterContinuity(guild,contextId,{kind:"narrative_context",limit:6});
  const candidates=[...new Map([...rows,...recent].map(row=>[row.record_key,row])).values()]
    .filter(row=>contextSourceVisible(db.getWorldEvent(guild,row.source_event),scope)
      &&row.data.interpretation.references.every(ref=>ref.source_refs.every(key=>contextSourceVisible(db.getWorldEvent(guild,eventKey(key)),scope))))
    .slice(0,12).map(row=>({source_ref:row.source_event,interpretation:row.data.interpretation}));
  const records=[];let used=0;
  for(const record of candidates){const size=JSON.stringify(record).length;if(used+size<=6000){records.push(record);used+=size;}}
  const source=messageId?db.getWorldEvent(guild,contextSourceKey(messageId,pc.id)):null;
  const transcript=db.recentMessagesFor(guild,user,{characterId:principal.kind==="owner"?pc.id:contextId,limit:12})
    .filter(row=>row.session_id===db.getActiveSession(guild)?.id&&(mode==="private"||["public","party"].includes(row.visibility)));
  const prior=transcript.filter(row=>!messageId||row.discord_message_id!==messageId);
  const last=prior.at(-1),focus=last?.speaker_name==="Veilkeeper"&&!last.character_id
    &&(!botUserId||last.discord_user_id===botUserId)?last.content.slice(-1000):"";
  const queryPlan=scopedQueryPlan(db,guild,user,pc.id,query,{contextId,owner:principal.kind==="owner"});
  const targeted=queryScopedFacts(db,guild,user,pc.id,queryPlan,{limit:20}),retrieved=[];let retrievalSize=0;
  for(const fact of targeted.rows){const item={source_ref:fact.id,content:fact.content,provenance:fact.provenance_json};
    const size=JSON.stringify(item).length;if(retrievalSize+size<=4000){retrieved.push(item);retrievalSize+=size;}}
  return {input_source:contextSourceVisible(source,scope)?source.event_key:null,records,omitted_for_size:candidates.length-records.length,conversation_focus:focus,
    focus_source:focus?{kind:"gm_utterance",source_ref:`message:${last.id}`,session_id:last.session_id,visibility:last.visibility,
      authority:"Conversation focus; not observation, actor knowledge or adjudication"}:null,
    principal:{kind:principal.kind,context_id:contextId,revision:principal.revision},query_plan:queryPlan,
    targeted_sources:retrieved,retrieval_omissions:targeted.omitted+targeted.rows.length-retrieved.length,
    authority:"Scoped conversational meaning only; never completed consequences, PC consent or NPC knowledge."};
}
export function persistInterpretation(db,guild,value,scope,provenance={}){
  if(value==null)return null;validateInterpretation(db,guild,value,scope);
  const principal=conversationPrincipal(db,guild,scope.actorUserId,scope.actorCharacterId);
  const source=db.getWorldEvent(guild,eventKey(value.source_ref));
  if(!provenance.messageId||source.details.message_id!==provenance.messageId)throw new Error("Interpretation must belong to the current authenticated message.");
  const key=`interpretation:${source.event_key}`,prior=db.getCityRecord(guild,"narrative_context",key);if(prior)return prior;
  const row=db.saveCityRecord(guild,{kind:"narrative_context",key,source_event:source.event_key,visibility:"character",subject_key:principal.context_id,
    data:{interpretation:value,authority:"Nonbinding contextual meaning only",user:scope.actorUserId}});
  cityAudit(db,guild,"narrative_context",key,null,row,scope.actorUserId);
  // Historical intended_actions remain conversational metadata, never a native movement gate.
  for(const entry of principal.kind==="owner"?db.characterContinuity(guild,scope.actorCharacterId,{kind:"scene_entry",limit:30}):[]){
    if(!["pending","awaiting_adjudication"].includes(entry.status)||entry.data.user!==scope.actorUserId||entry.data.session_id!==source.session_id
      ||scope.mode!=="private"&&entry.data.private_scene)continue;
    const candidates=value.references.filter(ref=>ref.status==="resolved"&&ref.entity_type==="location"
      &&ref.source_refs.map(eventKey).includes(entry.source_event)&&String(source.details.text).includes(ref.phrase))
      .filter(ref=>{const location=db.getSimulationEntity(guild,"location",ref.entity_key);
        return [location.entity_key,location.state?.name,location.state?.title,location.state?.display_name].filter(Boolean)
          .some(name=>String(source.details.text).toLowerCase().includes(String(name).toLowerCase()))||locationMatches(location,entry.data.target);})
      .map(ref=>({location_key:ref.entity_key,phrase:ref.phrase,sources:[entry.source_event,source.event_key]}));
    if(candidates.length){
      const after=db.saveCityRecord(guild,{...entry,key:entry.record_key,data:{...entry.data,
        candidates:[...new Map([...(entry.data.candidates||[]),...candidates].map(candidate=>[candidate.location_key,candidate])).values()].slice(-12)}});
      cityAudit(db,guild,"entry_referent",entry.record_key,entry,after,scope.actorUserId);
    }
  }
  return row;
}
