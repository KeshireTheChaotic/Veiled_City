/** AI-GM ordinary worldbuilding: authenticated inputs, canonical entities, bounded native actions and atomic replay receipts. */
import { createHash } from "node:crypto";
import { conversationPrincipal } from "./conversation-principal.js";
import { personalCharacter } from "./personal-continuity.js";
import { indexWorldEvent, cityAudit, cityObject } from "./city-calendar.js";
import { currentScene, recordScenePresence } from "./scene-continuity.js";
import { activeCityProxy } from "./city-constraints.js";
import { configureSimulationEntity } from "./simulation.js";
import { validateMinorIdentity } from "./city-depth.js";
import { normalizeNpcKey } from "./npc-cognition.js";
import { stateRevision } from "./ai-intents.js";
import { resolvePlaceReference, preflightPlaceIdentity, preflightNpcIdentity } from "./location-language.js";
import { currentAcceptedIntent, currentTypedMovement } from "./typed-intents.js";
import { movementAdjudication } from "./rules-arbitration.js";
import { contextMemoriesForScope } from "./context-memory.js";
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
export const AUTONOMOUS_WORLD_VERSION=1;
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
export const AUTONOMOUS_WORLD_PROMPT="Veilkeeper IS the GM: missing ordinary surroundings, places, people or descriptions are prompts to create, not human approval gates. "
  +"Use world_additions for modest new locations or NPCs, scene_actions for validated reveal/move/introduce_npc/local_zone. Reuse existing identities first. "
  +"Every new location is an ordinary public accessible nearby place, not a vault, hidden answer, new canon override, distant route or free combatant. "
  +"parent_location_key is the acting PC's current location (empty only if none exists). New NPCs need a real location, ordinary role/voice and bounded knowledge. "
  +"No special powers, money, stats, property grants or hidden campaign knowledge. Never introduce/move/speak for an active human NPC proxy. "
  +"Search/observation reveals a candidate WITHOUT moving the PC. move needs the owner's exact current explicit entry clause in source_span and an ordinary accessible local destination. "
  +"local_zone changes only the local zone, not city location. scene_actions.entity_ref is the canonical existing or proposed key. "
  +"Native preview stages entities, arrival and presence before checking claims; use claims for completed movement/access, not cosmetic description. "
  +"Unknown records, disabled expansions, low confidence and technical failures are NOT fictional contradictions. "
  +"For actual locked access, distant travel, costs or encounters adjudicate the obstacle through native rules; keep unrelated conversation moving. "
  +"Only specific incompatible authoritative facts merit human reconciliation. Avoid/reuse/rename a conflicting proposal first. "
  +"world_conflicts may queue only a specific current CANON LEDGER key/event ID with a materially different proposed value and reason; never use it for missing records, low confidence or mechanics. Keep unrelated narration moving and do not narrate the conflicting outcome as committed. "
  +"Treat in-character needs, worries, aspirations and indirect remarks as invitations to engage: ask an open contextual question or offer an observable lead, not a mandatory menu. "
  +"For 'I need work, PantryQueue is not pulling in enough money', ask about seeking work/what work they want; do not accept a job, create a debt, award income or move the PC for them.";

export function worldAuthority(db,guild){
  return {gm_authority_mode:"autonomous",auto_create_locations:true,auto_create_npcs:true,human_review_policy:"conflicts_only",
    audit_autonomous_worldbuilding:true,...db.getCityRecord(guild,"gm_authority","campaign")?.data};
}
export function configureWorldAuthority(db,guild,input,reviewer){
  cityObject(input);
  if(!reviewer||Object.keys(input).some(k=>!["gm_authority_mode","auto_create_locations","auto_create_npcs"].includes(k))
    ||input.gm_authority_mode!==undefined&&!['autonomous','manual'].includes(input.gm_authority_mode)
    ||['auto_create_locations','auto_create_npcs'].some(k=>input[k]!==undefined&&typeof input[k]!=="boolean")) throw new Error("Closed GM authority configuration required.");
  return db.transaction(()=>{
    const before=db.getCityRecord(guild,"gm_authority","campaign");
    const source=indexWorldEvent(db,guild,{key:`gm-authority:${hash([before?.data||{},input,Date.now()])}`,kind:"gm_authority",
      title:"Explicit GM world authority configuration",source_id:reviewer},reviewer);
    const after=db.saveCityRecord(guild,{kind:"gm_authority",key:"campaign",source_event:source.event_key,data:{...worldAuthority(db,guild),...input}});
    cityAudit(db,guild,"gm_authority","campaign",before,after,reviewer);return after;
  });
}
/** Explicit human correction of autonomous description only; never retcon agency, secrets, dice or canon implicitly. */
export function retconAutonomousEntity(db,guild,input,reviewer){
  cityObject(input);
  if(!reviewer||Object.keys(input).sort().join()!=="expected_revision,key,kind,op,reason,summary"||input.op!=="retcon"
    ||!['npc','location'].includes(input.kind)||typeof input.summary!=="string"||!input.summary.trim()||input.summary.length>600
    ||typeof input.reason!=="string"||!input.reason.trim()||input.reason.length>600)fail("Closed reasoned human description retcon required.");
  const before=db.getCityRecord(guild,"autonomous_entity",`${input.kind}:${input.key}`);
  if(!before||stateRevision(before)!==input.expected_revision)fail("Current autonomous entity revision required.");
  if(input.kind==="npc"&&activeCityProxy(db,guild,input.key))fail("Human-controlled NPC portrayal must be coordinated with its controller.");
  return db.transaction(()=>{
    if(input.kind==="location"){
      const location=db.getSimulationEntity(guild,"location",input.key);if(!location)fail("Location no longer exists.");
      configureSimulationEntity(db,guild,"location",input.key,{description:input.summary});
    }else{
      const p=db.getNpcProfile(guild,input.key);if(!p)fail("NPC no longer exists.");
      db.upsertNpcProfile(guild,{npcKey:p.npc_key,displayName:p.display_name,role:p.role,publicIdentity:p.public_identity,
        portrayal:input.summary.slice(0,160),activityTier:p.activity_tier,decisionProfile:p.decision_profile,
        knowledgeBoundaries:p.knowledge_boundaries,capabilities:p.capabilities,source:p.source});
    }
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,data:{...before.data,summary:input.summary,
      corrections:[...(before.data.corrections||[]),{previous_summary:before.data.summary,reason:input.reason,reviewer}].slice(-20)}});
    const ref=db.getReference(guild,input.kind,input.key);
    if(ref)db.upsertReference(guild,{kind:input.kind,key:input.key,name:ref.display_name,summary:input.summary,visibility:ref.visibility,
      subjectUserId:ref.subject_user_id,subjectCharacterId:ref.subject_character_id});
    cityAudit(db,guild,"ai_gm_world_retcon",input.key,before,after,reviewer);return after;
  });
}
export const worldInputKey=(messageId,character)=>`world-input:${hash([messageId,character])}`;
/** Lazy additive migration: retain original requests/provenance; expire only demonstrably stale authority. */
export function revalidateWorldEntries(db,guild,user,character){
  const pc=personalCharacter(db,guild,user,character),scene=currentScene(db,guild),changed=[];
  for(const before of db.characterContinuity(guild,pc.id,{kind:"scene_entry",limit:50})){
    if(!["pending","awaiting_adjudication"].includes(before.status))continue;
    const source=db.getWorldEvent(guild,before.source_event);
    const stale=before.data.user!==user||before.data.session_id!==scene.session_id||before.data.scene!==scene.key
      ||(before.data.prior_location??null)!==(pc.data.location??null)||source?.status!=="active"
      ||source.details.author!==user||!db.ownerAuthoredSource(guild,source.event_key,user);
    const manual=worldAuthority(db,guild).gm_authority_mode==="manual";
    const status=stale?"expired":manual?before.status:"awaiting_adjudication";
    if(status===before.status)continue;
    const after=db.saveCityRecord(guild,{...before,key:before.record_key,status,data:{...before.data,
      authority:stale?"Historical attempt expired; no arrival or consent inferred":"Current owner attempt available for AI-GM native adjudication"}});
    cityAudit(db,guild,"scene_entry_revalidation",before.record_key,before,after,"ai_gm");changed.push(after);
  }
  return changed;
}
export function captureWorldInput(db,guild,user,character,messageId,message,{privateScene=false}={}){
  if(!character||!messageId)return null;
  let principal;try{principal=conversationPrincipal(db,guild,user,character);}catch{return null;}
  if(principal.kind!=="owner")return null;
  revalidateWorldEntries(db,guild,user,character);
  const key=worldInputKey(messageId,character),prior=db.getWorldEvent(guild,key);if(prior)return prior;
  return indexWorldEvent(db,guild,{key,kind:"ai_gm_input",source_id:`player:${user}`,title:"Authenticated current worldbuilding request",
    session_id:db.getActiveSession(guild).id,scene:currentScene(db,guild).key,
    visibility:privateScene?"character":"party",subject_key:privateScene?character:"",
    details:{author:user,character_id:character,message_id:messageId,text:String(message).slice(0,4000),private_scene:privateScene,revision:principal.revision}},user);
}
function visible(db,guild,type,key,scope){
  const authored=db.getCityRecord(guild,"autonomous_entity",`${type}:${key}`);
  const reference=db.getReference(guild,type,key);
  const boundary=authored||reference;
  if(!boundary&&type==="location"&&scope.actorCharacterId&&db.getCharacter(scope.actorCharacterId)?.data.location===key)return true;
  return boundary&&(["public","party"].includes(boundary.visibility)||scope.mode==="private"
    &&boundary.visibility==="character"&&(boundary.subject_key||boundary.subject_character_id)===scope.actorCharacterId);
}
function match(row,name){return normalizeNpcKey(row.state?.name||row.display_name||"")===normalizeNpcKey(name);}
function locationIdentityMatches(row,name){
  const normalize=value=>normalizeNpcKey(String(value||"").replace(/^the\s+/i,""));
  const expected=normalize(name),values=[row?.entity_key,row?.state?.name,row?.state?.title,row?.state?.display_name];
  return !!expected&&values.filter(Boolean).some(value=>normalize(value)===expected);
}
function fail(message){throw Object.assign(new Error(message),{code:"AUTONOMOUS_WORLD"});}
function closed(schema,value){
  if(schema.anyOf)return schema.anyOf.some(s=>closed(s,value));
  if(schema.enum)return schema.enum.includes(value);
  if(schema.type==="string")return typeof value==="string"&&value.length>=(schema.minLength||0)&&value.length<=schema.maxLength
    &&(!schema.pattern||new RegExp(schema.pattern).test(value));
  if(schema.type==="array")return Array.isArray(value)&&value.length<=schema.maxItems&&value.every(v=>closed(schema.items,v));
  return value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===schema.required.length
    &&schema.required.every(k=>Object.hasOwn(value,k)&&closed(schema.properties[k],value[k]));
}
function localAccess(db,guild,pc,key){
  const location=db.getSimulationEntity(guild,"location",key),s=location?.state||{};
  const origin=pc.data.location?db.getSimulationEntity(guild,"location",pc.data.location)?.state||{}:{};
  if(!location||["restricted","locked","contested","hazard","travel_required","removed","sealed"].some(k=>s[k])
    ||s.hazards?.length||s.wards?.length||Number(s.travel_cost)||Number(s.travel_minutes)||s.access&&s.access!=="public")return false;
  if(key!==pc.data.location&&(origin.sealed||origin.locked_exit||origin.blocks_exit||Number(origin.exit_cost)||origin.exit_hazards?.length))return false;
  const policy=db.getCityRecord(guild,"entry_policy",key),scene=currentScene(db,guild);
  const approved=policy?.status==="active"&&db.getWorldEvent(guild,policy.source_event)?.status==="active"
    &&policy.data.session_id===scene.session_id&&policy.data.scene===scene.key
    &&policy.data.from_locations?.includes(pc.data.location)&&policy.data.destination_revision===stateRevision(location)
    &&policy.data.from_revisions?.[pc.data.location]===stateRevision(db.getSimulationEntity(guild,"location",pc.data.location));
  return key===pc.data.location||s.parent_location_key===pc.data.location&&!!pc.data.location
    ||origin.parent_location_key===key||s.ai_gm_origin===true&&!pc.data.location&&!s.parent_location_key||approved;
}
/** All calls occur inside the shared turn transaction (preview uses the identical path then rolls back). */
export function applyAutonomousWorld(db,guild,narrative,scope,provenance={},content=null){
  return db.transaction(()=>applyWorld(db,guild,narrative,scope,provenance,content));
}
function applyWorld(db,guild,narrative,scope,provenance,content){
  const additions=narrative?.world_additions||[],actions=narrative?.scene_actions||[],conflicts=narrative?.world_conflicts||[];
  if(!closed(worldAdditionsSchema,additions)||!closed(sceneActionsSchema,actions)||!closed(worldConflictsSchema,conflicts))fail("Closed bounded world additions/actions/conflicts required.");
  if(!additions.length&&!actions.length&&!conflicts.length)return [];
  const config=worldAuthority(db,guild);
  if(config.gm_authority_mode!=="autonomous")fail("This table explicitly uses manual world authority; continue descriptive conversation without autonomous effects.");
  const pc=personalCharacter(db,guild,scope.actorUserId,scope.actorCharacterId),session=db.getActiveSession(guild),scene=currentScene(db,guild);
  const principal=conversationPrincipal(db,guild,scope.actorUserId,pc.id);
  const source=db.getWorldEvent(guild,worldInputKey(provenance.messageId,pc.id));
  if(!source||source.status!=="active"||source.session_id!==session.id||source.scene!==scene.key
    ||source.details.author!==scope.actorUserId||source.details.revision!==principal.revision
    ||source.details.private_scene!==(scope.mode==="private")||!db.ownerAuthoredSource(guild,source.event_key,scope.actorUserId))fail("Current owner/source/session/scene/audience required.");
  const key=`world-turn:${hash([session.id,provenance.messageId,pc.id])}`,prior=db.getCityRecord(guild,"autonomous_turn",key);
  if(prior)return prior.data.results;
  const boundary={visibility:scope.mode==="private"?"character":"party",subject_key:scope.mode==="private"?pc.id:null};
  const results=[],refs=new Map();
  const exclusions=(narrative?.player_intents||[]).filter(i=>i.framing==='immediate'&&i.type==='search')
    .flatMap(i=>i.excluded_targets||[]).map(normalizeNpcKey);
  for(const conflict of conflicts){
    const current=db.currentCanon(guild,conflict.canon_key);
    if(!current||current.id!==conflict.current_event_id||!conflict.proposed_value.trim()
      ||current.value.trim()===conflict.proposed_value.trim()||!conflict.reason.trim())fail("Human escalation requires a specific current contradictory authoritative canon source, not missing data.");
    const review=db.proposeCanon(guild,{key:conflict.canon_key,value:conflict.proposed_value,visibility:"gm",sessionId:session.id,
      sourceType:"ai_gm_conflict",sourceId:source.event_key,provenance:conflict.reason});
    const row=db.saveCityRecord(guild,{kind:"world_conflict",key:`${key}:conflict:${conflict.canon_key}`,status:"conflict_pending",
      source_event:source.event_key,visibility:"gm",data:{conflicting_sources:[current.id,source.event_key],current_values:[current.value],
        proposed_value:conflict.proposed_value,suggested_resolutions:["Keep existing canon and choose another ordinary detail","Explicit human canon reconciliation"],
        conflict_id:review.conflict.id,session_id:session.id}});
    cityAudit(db,guild,"ai_gm_world_conflict",row.record_key,null,row,"ai_gm");
    results.push({status:"contradiction",conflict_id:review.conflict.id});
  }
  const event=(slot,kind,location,details={},eventBoundary=boundary)=>indexWorldEvent(db,guild,{key:`${key}:${slot}`,kind,title:"AI-GM ordinary world adjudication",
    source_id:kind==="arrival"?`player:${pc.owner_user_id}`:"ai_gm",session_id:session.id,scene:scene.key,location_key:location,
    ...eventBoundary,details:{...details,input_source:source.event_key}},"ai_gm");
  for(const a of [...additions].sort((a,b)=>Number(a.kind==="npc")-Number(b.kind==="npc"))){
    if(!a.name.trim()||!a.summary.trim()||normalizeNpcKey(a.key)!==a.key||!a.key)fail("A world addition needs a non-empty name and summary plus a normalized stable key (lowercase words separated by single hyphens); omit it if you cannot provide all three.");
    if(scope.mode==="private"&&a.visibility==="party")fail("Private world creation cannot publish party knowledge.");
    if(a.kind==="location"&&exclusions.some(excluded=>
      normalizeNpcKey(excluded)===normalizeNpcKey(a.name)||normalizeNpcKey(excluded)===a.key))fail("Explicitly excluded locations cannot answer the owner's search.");
    if(!config[a.kind==="location"?"auto_create_locations":"auto_create_npcs"])fail("World creation is explicitly disabled for this entity type.");
    {
      const preflight=a.kind==="location"?preflightPlaceIdentity(db,guild,{key:a.key,name:a.name,scope})
        :preflightNpcIdentity(db,guild,{key:a.key,name:a.name,scope});
      if(preflight.status==="protected_collision")fail(`Proposed ordinary ${a.kind} conflicts with protected existing identity or canon; choose another mundane detail without exposing it.`);
      if(preflight.status==="ambiguous")fail(`${a.kind} aliases are materially ambiguous; use a specific visible existing key.`);
      if(preflight.status==="reuse"){
        const existingKey=preflight.matches[0].entity_key||preflight.matches[0].npc_key;refs.set(a.key,existingKey);
        results.push({status:"resolved_existing",kind:a.kind,key:existingKey});continue;
      }
    }
    const rows=a.kind==="location"?db.listSimulationEntities(guild,"location"):db.listNpcProfiles(guild,{limit:10000});
    const exact=rows.filter(row=>(row.entity_key||row.npc_key)===a.key||match(row,a.name));
    if(exact.length>1)fail("Identity is materially ambiguous; reuse a specific existing key or ask the player.");
    if(exact.length){
      const existing=exact[0],existingKey=existing.entity_key||existing.npc_key;
      if(!visible(db,guild,a.kind,existingKey,scope))fail("Existing private identity cannot be disclosed/replaced by autonomous creation.");
      refs.set(a.key,existingKey);results.push({status:"resolved_existing",kind:a.kind,key:existingKey});continue;
    }
    if(db.getReference(guild,a.kind,a.key)||db.worldDraftNameInUse(guild,a.kind,a.name,a.key))fail("Established reference/draft identity exists; resolve it without replacement.");
    const visibility=a.visibility==="gm"?"gm":boundary.visibility,subject=visibility==="character"?pc.id:null;
    let location;
    if(a.kind==="location"){
      const parent=refs.get(a.parent_location_key)||a.parent_location_key;
      if(parent!==(pc.data.location||""))fail("A new nearby place must be grounded in the actor's actual location, not invented remote geography.");
      configureSimulationEntity(db,guild,"location",a.key,{name:a.name,description:a.summary,parent_location_key:parent,
        access:"public",ai_gm_origin:true,visibility,subject_character_id:subject});location=a.key;
    }else{
      location=refs.get(a.location_key)||a.location_key;
      if(!db.getSimulationEntity(guild,"location",location))fail("NPC location must exist before introduction.");
      if(location!==pc.data.location&&!localAccess(db,guild,pc,location))fail("New NPC must be grounded locally, not an invented distant occupant.");
      const profile={name:a.name,occupation:a.occupation,public_identity:a.public_identity,portrayal:a.portrayal};
      validateMinorIdentity(db,content||{read:()=>""},guild,a.key,profile);
      db.upsertNpcProfile(guild,{npcKey:a.key,displayName:a.name,role:a.occupation,publicIdentity:a.public_identity,portrayal:a.portrayal,
        activityTier:"background",source:"ai_gm_world_create",knowledgeBoundaries:["Only own local observations and legitimate delivery; no campaign secrets granted by generation."]});
      // Do not use simulation actor defaults: no free resources, powers or adversary statistics.
      db.setSimulationEntity(guild,"npc",a.key,{name:a.name,activity_tier:"background",location_key:location,ai_gm_origin:true,
        resources:{influence:0,materials:0,information:0,manpower:0,leverage:0,wounds:0,stress:0,favors:0},visibility,subject_character_id:subject});
    }
    const created=event(`create:${a.kind}:${a.key}`,"ai_gm_world_create",location,{entity_type:a.kind,entity_key:a.key},{visibility,subject_key:subject});
    const record=db.saveCityRecord(guild,{kind:"autonomous_entity",key:`${a.kind}:${a.key}`,source_event:created.event_key,
      location_key:location,visibility,subject_key:subject,data:{kind:a.kind,key:a.key,name:a.name,summary:a.summary,
        epistemic_label:"established",session_id:session.id}});
    if(visibility!=="gm")db.upsertReference(guild,{kind:a.kind,key:a.key,name:a.name,summary:a.summary,visibility,subjectCharacterId:subject});
    cityAudit(db,guild,"ai_gm_world_create",a.key,null,record,"ai_gm");
    refs.set(a.key,a.key);results.push({status:"created",kind:a.kind,key:a.key,source_event:created.event_key});
  }
  for(const [index,action] of actions.entries()){
    const target=refs.get(action.entity_ref)||action.entity_ref;
    let actionSource=source,entrySource=null;
    if(action.kind==="move"&&!source.details.text.includes(action.source_span)){
      const entries=db.characterContinuity(guild,pc.id,{kind:"scene_entry",limit:50}).filter(entry=>
        ["pending","awaiting_adjudication"].includes(entry.status)&&entry.data.user===pc.owner_user_id
        &&entry.data.session_id===session.id&&entry.data.scene===scene.key&&(entry.data.prior_location??null)===(pc.data.location??null)
        &&entry.visibility==="character"&&entry.subject_key===pc.id
        &&entry.data.private_scene===(scope.mode==="private"));
      const matching=entries.filter(entry=>{
        const declaration=db.getWorldEvent(guild,entry.source_event);
        return declaration?.status==="active"&&declaration.kind==="player_declaration"
          &&declaration.visibility==="character"&&declaration.subject_key===pc.id
          &&declaration.session_id===session.id&&declaration.scene===scene.key
          &&declaration.details.author===pc.owner_user_id&&declaration.details.character_id===pc.id
          &&declaration.details.private_scene===(scope.mode==="private")&&declaration.details.text.includes(action.source_span)
          &&(!entry.data.principal_revision||entry.data.principal_revision===principal.revision)
          &&db.ownerAuthoredSource(guild,declaration.event_key,pc.owner_user_id);
      });
      if(matching.length!==1)fail("Older entry needs a unique current owner/source/scene/location-bound declaration.");
      entrySource=matching[0];actionSource=db.getWorldEvent(guild,entrySource.source_event);
    }
    if(!action.source_span.trim()||!actionSource.details.text.includes(action.source_span))fail("Scene actions need an exact span from the current owner message or revalidated entry.");
    const prefix=actionSource.details.text.slice(0,actionSource.details.text.indexOf(action.source_span));
    if((prefix.match(/["\u201c\u201d]/g)||[]).length%2||/\b(?:if|example|hypothetical|might|would|could|imagine|suppose|planning)\b/i.test(prefix))
      fail("Quoted, conditional or hypothetical spans cannot authorize native scene actions.");
    const latest=db.getCharacter(pc.id);
    if(action.kind==="move"){
      const semantic=currentTypedMovement(db,guild,latest,action.source_span,target,scope,source.event_key);
      if(!semantic&&!entrySource)
        fail("Movement requires current verified typed intent authorization or an explicit revalidated legacy scene entry.");
      const location=db.getSimulationEntity(guild,"location",target);
      if(!location||!visible(db,guild,"location",target,scope)||!localAccess(db,guild,latest,target))fail("Movement requires accessible local geography; adjudicate real travel/access obstacles without inventing an arrival.");
      if(db.getCurrentEncounter(session.id)?.status==="active")fail("Active encounter movement requires native combat rules.");
      if(semantic){
        const phrase=semantic.data.target_name||semantic.data.target_key;
        const resolved=resolvePlaceReference(db,guild,pc.id,phrase,{mode:scope.mode,user:scope.actorUserId});
        if(semantic.data.target_key&&semantic.data.target_key!==target||resolved.status!=="resolved_existing"||resolved.location.entity_key!==target)
          fail("Arrival destination must match the current typed owner's explicit target.");
        if(semantic.data.destination==="exterior"&&action.zone!=="exterior"||semantic.data.destination!=="interior"&&action.zone==="interior"
          ||semantic.data.destination==="interior"&&action.zone!=="interior")
          fail("Movement destination scope cannot broaden approach/exterior into interior entry.");
      }else if(!locationIdentityMatches(location,entrySource.data.target)){
        fail("Legacy scene entry destination must match the persisted owner-authored target.");
      }
      let adapter=null;
      if(entrySource){
        const adapterKey=`legacy-entry-adapter:${hash([entrySource.record_key,actionSource.event_key,target,pc.data.location??null])}`;
        adapter=db.getCityRecord(guild,"legacy_scene_entry_adapter",adapterKey)||db.saveCityRecord(guild,{
          kind:"legacy_scene_entry_adapter",key:adapterKey,status:"authorized",source_event:actionSource.event_key,
          visibility:"character",subject_key:pc.id,
          data:{entry_key:entrySource.record_key,character_id:pc.id,owner_user_id:pc.owner_user_id,target_key:target,
            session_id:session.id,scene:scene.key,prior_location:pc.data.location??null,source_span:action.source_span,
            principal_revision:principal.revision,revision_basis:entrySource.data.principal_revision?"exact":"historical_owner_source",
            authority:"Revalidated legacy owner entry authorizes native adjudication only; this record is not an outcome."}});
      }
      db.updateCharacterData(pc.id,data=>{data.location=target;});
      const arrival=event(`action:${index}`,"arrival",target,{entity_type:"character",entity_key:pc.id,owner_user_id:pc.owner_user_id,declaration:actionSource.event_key});
      recordScenePresence(db,guild,{entity_type:"character",entity_key:pc.id,location_key:target,
        source_event:arrival.event_key,zone:action.zone||"scene",...boundary,accepted_by:pc.owner_user_id},"ai_gm");
      results.push({status:"arrived",key:target,source_event:arrival.event_key,
        ...(adapter?{authorization:{kind:"legacy_scene_entry",receipt:adapter.record_key,source_event:adapter.source_event}}:{}),
        adjudication:movementAdjudication({sourceRef:actionSource.event_key,sourceSpan:action.source_span,receipt:arrival.event_key})});
      if(semantic)db.saveCityRecord(guild,{...semantic,key:semantic.record_key,status:"resolved",
        data:{...semantic.data,arrival:arrival.event_key,adjudication:"native_resolved"}});
      if(entrySource)db.saveCityRecord(guild,{...entrySource,key:entrySource.record_key,status:"resolved",data:{...entrySource.data,arrival:arrival.event_key,resolved_by:"ai_gm"}});
      for(const entry of db.listCityRecords(guild,{kind:"scene_entry",includeGM:true,limit:100}).filter(e=>["pending","awaiting_adjudication"].includes(e.status))){
        const declaration=db.getWorldEvent(guild,entry.source_event);
        if(entry.data.character===pc.id&&entry.data.user===pc.owner_user_id&&declaration?.details.message_id===provenance.messageId)
          db.saveCityRecord(guild,{...entry,key:entry.record_key,status:"resolved",data:{...entry.data,arrival:arrival.event_key,resolved_by:"ai_gm"}});
      }
    }else if(action.kind==="introduce_npc"){
      const accepted=['speak','interact'].map(type=>currentAcceptedIntent(db,guild,{sourceEvent:source.event_key,
        actor:pc.id,type,sourceSpan:action.source_span,targetKey:target,scope})).find(Boolean);
      if(!accepted)fail("NPC introduction requires a current accepted typed interaction, not phrase matching.");
      const npc=db.getSimulationEntity(guild,"npc",target),location=npc?.state.location_key;
      if(!npc||activeCityProxy(db,guild,target)||npc.state.removed||['dead','removed'].includes(npc.state.status))fail("Existing living unproxied NPC required; AI cannot override NPC control/status.");
      if(location!==latest.data.location||!visible(db,guild,"npc",target,scope))fail("NPC must actually share the actor's scene and be audience-appropriate.");
      const arrival=event(`action:${index}`,"arrival",location,{entity_type:"npc",entity_key:target});
      recordScenePresence(db,guild,{entity_type:"npc",entity_key:target,
        location_key:location,source_event:arrival.event_key,zone:"scene",...boundary},"ai_gm");
      const identity=db.getCityRecord(guild,"autonomous_entity",`npc:${target}`);
      if(identity){
        const appearances=(identity.data.appearances||0)+1;
        const p=db.getNpcProfile(guild,target);
        if(appearances>=3&&p.activity_tier==="background"){
          db.upsertNpcProfile(guild,{npcKey:p.npc_key,displayName:p.display_name,role:p.role,publicIdentity:p.public_identity,
            portrayal:p.portrayal,activityTier:"supporting",decisionProfile:p.decision_profile,
            knowledgeBoundaries:p.knowledge_boundaries,capabilities:p.capabilities,source:p.source});
          db.setSimulationEntity(guild,"npc",target,{...npc.state,activity_tier:"supporting"});
        }
        const after=db.saveCityRecord(guild,{...identity,key:identity.record_key,data:{...identity.data,appearances}});
        cityAudit(db,guild,"ai_gm_npc_continuity",target,identity,after,"ai_gm");
      }
      results.push({status:"introduced",key:target,source_event:arrival.event_key,
        adjudication:movementAdjudication({sourceRef:actionSource.event_key,sourceSpan:action.source_span,receipt:arrival.event_key})});
    }else if(action.kind==="local_zone"){
      const zoneIntent=currentAcceptedIntent(db,guild,{sourceEvent:source.event_key,actor:pc.id,type:'local_zone',
        sourceSpan:action.source_span,targetKey:target,scope});
      if(target!==latest.data.location||!action.zone.trim()||!zoneIntent)
        fail("Only authenticated typed local-zone movement is allowed.");
      if(db.getCurrentEncounter(session.id)?.status==="active")fail("Combat movement requires native encounter resolution.");
      const arrival=event(`action:${index}`,"arrival",target,{entity_type:"character",entity_key:pc.id,owner_user_id:pc.owner_user_id});
      recordScenePresence(db,guild,{entity_type:"character",entity_key:pc.id,
        location_key:target,zone:action.zone,source_event:arrival.event_key,...boundary,accepted_by:pc.owner_user_id},"ai_gm");
      results.push({status:"local_zone",key:target,zone:action.zone,
        adjudication:movementAdjudication({sourceRef:actionSource.event_key,sourceSpan:action.source_span,receipt:arrival.event_key})});
    }else{
      const accepted=['observe','search'].map(type=>currentAcceptedIntent(db,guild,{sourceEvent:source.event_key,
        actor:pc.id,type,sourceSpan:action.source_span,targetKey:target,scope})).find(Boolean);
      if(!accepted)fail("Nearby discovery requires a current accepted typed observation or search.");
      if(!visible(db,guild,"location",target,scope)||!localAccess(db,guild,latest,target))fail("Nearby discovery must be local and visibility-safe.");
      results.push({status:"revealed",key:target,adjudication:{intent:"observation",source_refs:[actionSource.event_key],mode:"no_roll",
        rule_basis:{kind:"none",refs:[]},risk:"none",stakes:"none",native_mechanic:null,required_consent:[],participants:[pc.id],
        proposed_mutations:[],verified_receipts:[],source_span:action.source_span}});
    }
  }
  db.saveCityRecord(guild,{kind:"autonomous_turn",key,source_event:source.event_key,...boundary,
    data:{contract_version:AUTONOMOUS_WORLD_VERSION,results,session_id:session.id}});
  return results;
}

export function autonomousWorldContext(db,guild,scope,messageId){
  const pc=scope.actorCharacterId?db.getCharacter(scope.actorCharacterId):null,source=pc&&db.getWorldEvent(guild,worldInputKey(messageId,pc.id));
  return {authority:worldAuthority(db,guild),input_source:source?.event_key||null,requirements:{kind:"semantic_intents",note:"Interpret intent via player_intents, not lexical patterns."},
    saved_location:pc?.guild_id===guild?pc.data.location||null:null,
    memories:contextMemoriesForScope(db,guild,scope),
    locations:db.listSimulationEntities(guild,"location").slice(0,80).map(r=>({key:r.entity_key,state:r.state,may_reveal:!!visible(db,guild,"location",r.entity_key,scope)})),
    instruction:"GM-only context; may_reveal=false records are not new player knowledge. Missing records are not contradictions."};
}
