/** PC resource effects require a separately authorized native cause, never generated prose. */
import { createHash } from "node:crypto";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene } from "./scene-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { personalCharacter } from "./personal-continuity.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const fail=message=>{throw Object.assign(new Error(message),{code:"PC_EFFECT_AUTHORITY",expected:true});};
const owned=(pc,name)=>[...(pc.data.domain_cards||[]),...(pc.data.inventory||[])].some(v=>(typeof v==="string"?v:v.name)===name);
function sourceProof(db,guild,pc,ref){
  const scene=currentScene(db,guild),source=db.getWorldEvent(guild,ref);
  if(source?.status!=="active"||source.session_id!==scene.session_id||source.scene!==scene.key
    ||!db.ownerAuthoredSource(guild,ref,pc.owner_user_id))fail("Current owner-authored native cause source required.");
  personalCharacter(db,guild,pc.owner_user_id,pc.id);
  return source;
}
function saveAuthority(db,guild,data,source,key){
  const prior=db.getCityRecord(guild,"pc_effect_authority",key);
  if(prior){if(hash(prior.data)!==hash(data)||prior.source_event!==source.event_key)fail("Native cause identity changed.");return prior;}
  return db.saveCityRecord(guild,{kind:"pc_effect_authority",key,status:"awaiting_owner",source_event:source.event_key,
    visibility:"character",subject_key:data.character,data});
}
/** Authenticated GM chooses exact mechanics from an owned feature and saved ruling. Does not spend or heal. */
export function reviewFeatureEffect(db,guild,user,input,{gm=false,interactionId}={}){
  if(!gm||!user||!interactionId)fail("Authenticated human GM review required.");
  if(!input||Object.keys(input).some(k=>!["character","feature","ruling","source","resource","amount"].includes(k)))fail("Closed native feature cause required.");
  const pc=db.getCharacter(input.character),ruling=db.getRulesRuling(guild,input.ruling),scene=currentScene(db,guild);
  if(pc?.guild_id!==guild||!owned(pc,input.feature)||!ruling||!ruling.created_by
    ||!["hp","stress","armor","hope"].includes(input.resource)||!Number.isSafeInteger(input.amount)||!input.amount||Math.abs(input.amount)>12
    ||input.resource==="hp"&&input.amount>0)fail("Owned feature, reviewed exact ruling and bounded non-damage effect required.");
  const authored=sourceProof(db,guild,pc,input.source),principal=conversationPrincipal(db,guild,pc.owner_user_id,pc.id);
  const data={version:1,kind:"reviewed_feature",...input,owner:pc.owner_user_id,principal:principal.revision,
    session:scene.session_id,scene:scene.key,before:hash(pc.data),source_hash:hash(authored.details),ruling_hash:hash(ruling),reviewer:user};
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`pc-cause:${hash([guild,input.character,input.source,input.feature,input.resource])}`,kind:"native_pc_feature_review",
      title:"Exact feature effect awaiting affected owner approval",source_id:`gm:${user}`,session_id:scene.session_id,scene:scene.key,
      visibility:"character",subject_key:pc.id,details:data},user);
    if(source.status!=="active"||hash(source.details)!==hash(data))fail("Native review source changed.");
    return saveAuthority(db,guild,data,source,`pc-authority:${hash(source.event_key)}`);
  });
}
function verify(db,guild,row){
  const d=row?.data,scene=currentScene(db,guild),pc=d&&db.getCharacter(d.character),source=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.kind!=="pc_effect_authority"||row.visibility!=="character"||row.subject_key!==d.character||d.version!==1
    ||pc?.guild_id!==guild||d.session!==scene.session_id||d.scene!==scene.key||pc.owner_user_id!==d.owner
    ||source?.kind!=="native_pc_feature_review"||source.status!=="active"||source.source_id!==`gm:${d.reviewer}`
    ||!db.ownerAuthoredSource(guild,source.event_key,d.reviewer)
    ||source.subject_key!==pc.id||source.session_id!==d.session||source.scene!==d.scene||hash(source.details)!==hash(d)
    ||!owned(pc,d.feature)||hash(db.getRulesRuling(guild,d.ruling))!==d.ruling_hash
    ||conversationPrincipal(db,guild,d.owner,pc.id).revision!==d.principal
    ||hash(sourceProof(db,guild,pc,d.source).details)!==d.source_hash)fail("Native cause, source, feature, owner or scene changed.");
  return pc;
}
/** Separate affected-owner approval; neither the model nor GM may sign for the PC. */
export function reviewPcEffect(db,guild,user,key){
  const row=db.getCityRecord(guild,"pc_effect_authority",key),pc=verify(db,guild,row);
  if(pc.owner_user_id!==user)fail("Current affected owner must privately review mechanics.");
  db.saveCityRecord(guild,{kind:"pc_effect_review",key:`${key}:review`,status:"reviewed",source_event:row.source_event,
    visibility:"character",subject_key:pc.id,data:{owner:user,terms_hash:hash(row.data)}});
  const d=row.data;
  return {authority:key,status:row.status,character:pc.id,feature:d.feature,resource:d.resource,delta:d.amount,
    ruling:d.ruling,source:d.source,session:d.session,scene:d.scene,terms_hash:hash(d),
    instruction:"Review the exact signed delta before approve. Positive HP/Stress/Armor marks slots; negative clears slots. Hope is a pool. No damage is authorized here."};
}
export function approvePcEffect(db,guild,user,key,{interactionId}={}){
  const row=db.getCityRecord(guild,"pc_effect_authority",key),pc=verify(db,guild,row);
  if(pc.owner_user_id!==user||!interactionId)fail("Affected current owner must approve exact native effect.");
  const review=db.getCityRecord(guild,"pc_effect_review",`${key}:review`);
  if(review?.data.owner!==user||review.data.terms_hash!==hash(row.data)||review.source_event!==row.source_event
    ||review.visibility!=="character"||review.subject_key!==pc.id)fail("Privately review exact current mechanics before approval.");
  if(row.status!=="awaiting_owner"&&row.status!=="approved")fail("Native effect is no longer awaiting approval.");
  return db.transaction(()=>{
    const k=`pc-effect-choice:${hash([key,user])}`,data={authority:key,authority_hash:hash(row.data),author:user,character:pc.id,principal:row.data.principal};
    const source=indexWorldEvent(db,guild,{key:k,kind:"pc_effect_owner_choice",title:"Owner-approved exact resource effect",source_id:`player:${user}`,
      session_id:row.data.session,scene:row.data.scene,visibility:"character",subject_key:pc.id,details:data},user);
    if(source.status!=="active"||hash(source.details)!==hash(data)||!db.ownerAuthoredSource(guild,k,user))fail("Owner effect approval revoked or changed.");
    return db.saveCityRecord(guild,{...row,key,status:"approved"});
  });
}
/** Atomic CAS + effect receipt. Replays return the same already-applied effect, never another delta. */
export function applyPcEffect(db,guild,key){
  return db.transaction(()=>{
    const row=db.getCityRecord(guild,"pc_effect_authority",key),pc=verify(db,guild,row),d=row.data;
    const k=`pc-effect:${hash(key)}`,prior=db.getCityRecord(guild,"pc_effect_receipt",k);
    const choice=db.getWorldEvent(guild,`pc-effect-choice:${hash([key,d.owner])}`);
    if(choice?.status!=="active"||choice.kind!=="pc_effect_owner_choice"||choice.details.authority!==key
      ||choice.subject_key!==pc.id||choice.visibility!=="character"||choice.session_id!==d.session||choice.scene!==d.scene
      ||choice.source_id!==`player:${d.owner}`||choice.details.character!==pc.id||choice.details.author!==d.owner||choice.details.principal!==d.principal
      ||choice.details.authority_hash!==hash(d)||!db.ownerAuthoredSource(guild,choice.event_key,d.owner))fail("Current affected owner effect approval required.");
    if(prior){if(prior.source_event!==row.source_event||prior.data.authority_hash!==hash(d))fail("Native effect receipt ancestry changed.");return prior;}
    if(row.status!=="approved"||hash(pc.data)!==d.before)fail("Native PC effect compare-and-set is stale.");
    const resource=pc.data.resources?.[d.resource],before=d.resource==="hope"?resource:resource?.current,max=d.resource==="hope"?6:resource?.max;
    if(!Number.isSafeInteger(before)||!Number.isSafeInteger(max)||before<0||before>max)fail("Verified current resource required.");
    const after=Math.max(0,Math.min(max,before+d.amount));
    if(d.amount>0&&before+d.amount>max||d.amount<0&&["hope"].includes(d.resource)&&before+d.amount<0)fail("Insufficient resources or cost overflow.");
    db.updateCharacterData(pc.id,data=>{if(d.resource==="hope")data.resources.hope=after;else data.resources[d.resource].current=after;});
    const receipt=db.saveCityRecord(guild,{kind:"pc_effect_receipt",key:k,status:"resolved",source_event:row.source_event,visibility:"character",subject_key:pc.id,
      data:{version:1,authority:key,authority_hash:hash(d),character:pc.id,resource:d.resource,requested:d.amount,amount:after-before,before,after,
        scene:d.scene,session:d.session,owner_choice:choice.event_key,cause_type:d.resource==="hp"?"verified_healing":"verified_feature_cost"}});
    db.saveCityRecord(guild,{...row,key,status:"applied"});return receipt;
  });
}
/** Model event can consume only an exact, separately human-approved entitlement. Invalid proposals remain scoped blocks. */
export function applyGeneratedPcEffect(db,guild,session,event,character,scope){
  if(typeof event.cause_receipt!=="string"||!event.cause_receipt||event.cause_receipt.length>160)
    fail("needs_native_cause: exact separately authorized native PC effect receipt required.");
  const row=db.getCityRecord(guild,"pc_effect_authority",event.cause_receipt);
  if(!row||row.data.character!==character||row.data.resource!==event.key||row.data.amount!==event.amount||row.data.session!==session
    ||scope?.mode!=="private"||scope.actorCharacterId!==character||scope.actorUserId!==row.data.owner)
    fail("needs_native_cause: exact separately authorized native PC effect receipt required.");
  return applyPcEffect(db,guild,row.record_key);
}
