/** PC resource effects require a separately authorized native cause, never generated prose. */
import { createHash } from "node:crypto";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene,scenePresence,sceneAccess,RANGE_BANDS } from "./scene-continuity.js";
import { conversationPrincipal } from "./conversation-principal.js";
import { personalCharacter } from "./personal-continuity.js";
import {hopeCap,assertPcCanAct} from "./pc-native-eligibility.js";
import {consentAction} from "./action-consent.js";
import {wakeAfterNativeAllyHealing} from "./pc-death.js";

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const fail=message=>{throw Object.assign(new Error(message),{code:"PC_EFFECT_AUTHORITY",expected:true});};
const owned=(pc,name)=>[...(pc.data.domain_cards||[]),...(pc.data.inventory||[])].some(v=>(typeof v==="string"?v:v.name)===name);
function pvpHopeGuard(db,guild,source,resource,amount,input){
  if(resource!=="hope"||amount<=0)return;
  if(source.kind.startsWith("pvp_")||["pc_death_owner_choice","pc_death_recovery_allocation"].includes(source.kind))
    fail("PvP generates zero Hope, including feature/Armor/death Critical paths.");
  if(db.hasNativePvpSource(guild,source.event_key)){
    const a=input.accepted_intent&&consentAction(db,guild,input.accepted_intent).row;
    if(!a||a.source_event!==source.event_key||a.data.actor!==input.character||!["other","interact"].includes(a.data.type)
      ||!["activate","use"].includes(a.data.operation)||a.data.target_key?.replace(/^character:/u,"")!==input.character)
      fail("PvP generates zero Hope; an independently accepted own-feature clause is required for unrelated ordinary Hope.");
  }
}
function sourceProof(db,guild,pc,ref){
  const scene=currentScene(db,guild),source=db.getWorldEvent(guild,ref);
  if(source?.status!=="active"||source.session_id!==scene.session_id||source.scene!==scene.key
    ||!db.ownerAuthoredSource(guild,ref,pc.owner_user_id))fail("Current owner-authored native cause source required.");
  personalCharacter(db,guild,pc.owner_user_id,pc.id);
  return source;
}
function healingFacts(db,guild,input){
  const healer=personalCharacter(db,guild,db.getCharacter(input.healer)?.owner_user_id,input.healer),pc=db.getCharacter(input.character);
  const {row:a}=consentAction(db,guild,input.accepted_intent),feature=[...(healer.data.domain_cards||[]),...(healer.data.inventory||[])]
    .filter(v=>v?.name===input.feature&&(v.active===true||v.equipped===true)),mapping=feature[0]?.healing;
  if(healer.id===pc?.id||pc?.guild_id!==guild||a.data.actor!==healer.id||a.data.target_key?.replace(/^character:/u,"")!==pc.id
    ||a.data.operation!=="heal"||a.source_event!==input.source||!["party","public"].includes(a.visibility)
    ||feature.length!==1||!mapping||Object.keys(mapping).sort().join()!=="fixed_hp,range"||!Number.isSafeInteger(mapping.fixed_hp)
    ||mapping.fixed_hp<1||mapping.fixed_hp>12||!RANGE_BANDS.includes(mapping.range)||input.resource!=="hp"||input.amount!==-mapping.fixed_hp)
    fail("Exact public owner-authored ally healing and supported fixed native healing mapping required; no invented amount/cost or private source promotion.");
  const hp=pc.data.resources?.hp;
  if(hp?.current===hp?.max&&pc.data.death_state?.status!=="unconscious")fail("Affected PC must choose their native death move before ally recovery.");
  const actor=scenePresence(db,guild,"character",healer.id),target=scenePresence(db,guild,"character",pc.id);
  if([actor,target].some(p=>p?.data.state!=="actually_present"||db.getWorldEvent(guild,p.source_event)?.status!=="active")
    ||actor.location_key!==target.location_key||healer.data.location!==pc.data.location
    ||!sceneAccess(db,guild,{observer_type:"character",observer_key:healer.id,target_type:"character",target_key:pc.id,sense:"sight"}))fail("Native ally/target presence and healing range required.");
  const range=actor.data.zone===target.data.zone?"Melee":target.data.range;
  if(!RANGE_BANDS.includes(range)||RANGE_BANDS.indexOf(range)>RANGE_BANDS.indexOf(mapping.range))fail("Ally healing target outside native range.");
  return {healer,mapping,principal:conversationPrincipal(db,guild,healer.owner_user_id,healer.id),presence:hash([actor,target])};
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
  if(!input||Object.keys(input).some(k=>!["character","feature","ruling","source","resource","amount","healer","accepted_intent"].includes(k)))fail("Closed native feature cause required.");
  const pc=db.getCharacter(input.character),ruling=db.getRulesRuling(guild,input.ruling),scene=currentScene(db,guild);
  const healing=input.healer?healingFacts(db,guild,input):null,actor=healing?.healer||pc;
  if(pc?.guild_id!==guild||!owned(actor,input.feature)||!ruling||!ruling.created_by
    ||!["hp","stress","armor","hope"].includes(input.resource)||!Number.isSafeInteger(input.amount)||!input.amount||Math.abs(input.amount)>12
    ||input.resource==="hp"&&input.amount>0)fail("Owned feature, reviewed exact ruling and bounded non-damage effect required.");
  assertPcCanAct(actor,db,guild);
  const authored=sourceProof(db,guild,actor,input.source),principal=conversationPrincipal(db,guild,pc.owner_user_id,pc.id);
  pvpHopeGuard(db,guild,authored,input.resource,input.amount,input);
  const data={version:1,kind:"reviewed_feature",...input,owner:pc.owner_user_id,principal:principal.revision,
    session:scene.session_id,scene:scene.key,before:hash(pc.data),source_hash:hash(authored.details),ruling_hash:hash(ruling),reviewer:user};
  if(healing){Object.assign(data,{healer_owner:actor.owner_user_id,healer_principal:healing.principal.revision,healer_before:hash(actor.data),
    healing_mapping:healing.mapping,healing_presence:healing.presence});data.healing_digest=hash(data);}
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
  const healing=d?.healer?healingFacts(db,guild,d):null,actor=healing?.healer||pc;
  if(row?.kind!=="pc_effect_authority"||row.visibility!=="character"||row.subject_key!==d.character||d.version!==1
    ||pc?.guild_id!==guild||d.session!==scene.session_id||d.scene!==scene.key||pc.owner_user_id!==d.owner
    ||source?.kind!=="native_pc_feature_review"||source.status!=="active"||source.source_id!==`gm:${d.reviewer}`
    ||!db.ownerAuthoredSource(guild,source.event_key,d.reviewer)
    ||source.subject_key!==pc.id||source.session_id!==d.session||source.scene!==d.scene||hash(source.details)!==hash(d)
    ||!owned(actor,d.feature)||hash(db.getRulesRuling(guild,d.ruling))!==d.ruling_hash
    ||conversationPrincipal(db,guild,d.owner,pc.id).revision!==d.principal
    ||hash(sourceProof(db,guild,actor,d.source).details)!==d.source_hash)fail("Native cause, source, feature, owner or scene changed.");
  if(healing){const {healing_digest,...binding}=d;
    if(hash(binding)!==healing_digest||healing.healer.owner_user_id!==d.healer_owner||healing.principal.revision!==d.healer_principal
      ||hash(healing.mapping)!==hash(d.healing_mapping)||healing.presence!==d.healing_presence)fail("Native healer ownership/mapping/presence changed.");}
  pvpHopeGuard(db,guild,db.getWorldEvent(guild,d.source),d.resource,d.amount,d);return pc;
}
export function reviewHealingSource(db,guild,user,key){return db.transaction(()=>{
  const row=db.getCityRecord(guild,"pc_effect_authority",key);if(!row?.data.healer||row.data.healer_owner!==user)fail("Only current healer owner may review their own feature.");
  verify(db,guild,row);personalCharacter(db,guild,user,row.data.healer);
  db.saveCityRecord(guild,{kind:"pc_healing_source_review",key:`${key}:healer-review`,status:"reviewed",visibility:"character",subject_key:row.data.healer,
    source_event:row.data.source,data:{owner:user,authority:key,digest:row.data.healing_digest}});
  return {authority:key,revision:row.data.healing_digest,feature:row.data.feature,target:row.subject_key,hp_cleared:-row.data.amount,
    instruction:"Your free source-reviewed feature choice only. Target separately approves. Their HP, scars, sheet and private choices are not disclosed."};
});}
export function authorizeHealingSource(db,guild,user,input,{interactionId}={}){return db.transaction(()=>{
  if(!interactionId||Object.keys(input).sort().join()!=="authority,expected_revision")fail("Exact authenticated healer authorization required.");
  const row=db.getCityRecord(guild,"pc_effect_authority",input.authority),d=row?.data;
  if(!d?.healer||d.healer_owner!==user||d.healing_digest!==input.expected_revision)fail("Current healer owner/revision required.");
  verify(db,guild,row);assertPcCanAct(personalCharacter(db,guild,user,d.healer),db,guild);
  const review=db.getCityRecord(guild,"pc_healing_source_review",`${row.record_key}:healer-review`);
  if(review?.status!=="reviewed"||review.visibility!=="character"||review.subject_key!==d.healer||review.source_event!==d.source
    ||review.data.owner!==user||review.data.digest!==d.healing_digest)fail("Privately review your native healing source before authorization.");
  const details={author:user,authority:row.record_key,digest:d.healing_digest,principal:d.healer_principal,interaction:interactionId},key=`${row.record_key}:healer-choice`;
  const prior=db.getWorldEvent(guild,key);if(prior){healerChoice(db,guild,row);return row;}
  indexWorldEvent(db,guild,{key,kind:"pc_healing_source_choice",source_id:`player:${user}`,title:"Healer authorizes their own reviewed native feature",
    session_id:d.session,scene:d.scene,visibility:"character",subject_key:d.healer,details},user);return row;
});}
function healerChoice(db,guild,row){const d=row.data,source=db.getWorldEvent(guild,`${row.record_key}:healer-choice`);
  if(source?.status!=="active"||source.kind!=="pc_healing_source_choice"||source.visibility!=="character"||source.subject_key!==d.healer
    ||source.source_id!==`player:${d.healer_owner}`||source.scene!==d.scene||source.session_id!==d.session||source.details.author!==d.healer_owner
    ||source.details.authority!==row.record_key||source.details.digest!==d.healing_digest||source.details.principal!==d.healer_principal
    ||!db.ownerAuthoredSource(guild,source.event_key,d.healer_owner))fail("Current exact healer authorization required; no GM/recipient proxy choice.");return source;}
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
    if(prior){if(prior.source_event!==row.source_event||prior.data.authority_hash!==hash(d))fail("Native effect receipt ancestry changed.");
      if(d.healer)validateAllyHealingApplication(db,guild,prior.record_key);return prior;}
    const actor=d.healer?personalCharacter(db,guild,d.healer_owner,d.healer):pc;assertPcCanAct(actor,db,guild);
    if(d.healer){healerChoice(db,guild,row);if(hash(actor.data)!==d.healer_before)fail("Healer source sheet compare-and-set changed.");}
    if(row.status!=="approved"||hash(pc.data)!==d.before)fail("Native PC effect compare-and-set is stale.");
    const resource=pc.data.resources?.[d.resource],before=d.resource==="hope"?resource:resource?.current,max=d.resource==="hope"?hopeCap(pc.data):resource?.max;
    if(!Number.isSafeInteger(before)||!Number.isSafeInteger(max)||before<0||before>max)fail("Verified current resource required.");
    const after=Math.max(0,Math.min(max,before+d.amount));
    if(d.amount>0&&before+d.amount>max||d.amount<0&&["hope"].includes(d.resource)&&before+d.amount<0)fail("Insufficient resources or cost overflow.");
    db.updateCharacterData(pc.id,data=>{if(d.resource==="hope")data.resources.hope=after;else data.resources[d.resource].current=after;});
    const mutation=db.recordMutation(guild,{sessionId:d.session,actorType:"player",actorId:d.owner,sourceLayer:"pc_feature",
      mutationType:"owner_approved_feature",entityKey:pc.id,visibility:"character",before:pc.data,after:db.getCharacter(pc.id).data,
      rationale:"Exact separately approved native feature effect.",payload:{authority:key,choice:choice.event_key}}).id;
    const receipt=db.saveCityRecord(guild,{kind:"pc_effect_receipt",key:k,status:"resolved",source_event:row.source_event,visibility:"character",subject_key:pc.id,
      data:{version:1,authority:key,authority_hash:hash(d),character:pc.id,resource:d.resource,requested:d.amount,amount:after-before,before,after,
        scene:d.scene,session:d.session,owner_choice:choice.event_key,mutation,cause_type:d.resource==="hp"?"verified_healing":"verified_feature_cost"}});
    db.saveCityRecord(guild,{...row,key,status:"applied"});
    if(d.healer&&d.resource==="hp"&&after<before)wakeAfterNativeAllyHealing(db,guild,receipt.record_key);
    return receipt;
  });
}
/** Read-only applied healing proof; never creates or consumes an effect to validate it. */
export function validateAllyHealingApplication(db,guild,key){
  const receipt=db.getCityRecord(guild,"pc_effect_receipt",key),r=receipt?.data,row=r&&db.getCityRecord(guild,"pc_effect_authority",r.authority),d=row?.data;
  if(!d?.healer)fail("Native ally healing source required.");
  verify(db,guild,row);healerChoice(db,guild,row);
  const choice=db.getWorldEvent(guild,r.owner_choice),m=db.getMutation(guild,r.mutation);
  const before=m&&JSON.parse(m.before_json),after=m&&JSON.parse(m.after_json),expected=before&&structuredClone(before);
  if(expected)expected.resources.hp.current=Math.max(0,before.resources.hp.current+d.amount);
  if(row.status!=="applied"||receipt.status!=="resolved"||receipt.visibility!=="character"||receipt.subject_key!==d.character
    ||key!==`pc-effect:${hash(row.record_key)}`||receipt.source_event!==row.source_event||r.authority_hash!==hash(d)
    ||r.character!==d.character||r.resource!=="hp"||r.cause_type!=="verified_healing"||r.requested!==d.amount
    ||r.session!==d.session||r.scene!==d.scene||r.amount!==r.after-r.before||r.amount>=0
    ||choice?.status!=="active"||choice.kind!=="pc_effect_owner_choice"||choice.details.authority!==row.record_key
    ||choice.source_id!==`player:${d.owner}`||choice.visibility!=="character"||choice.subject_key!==d.character
    ||choice.scene!==d.scene||choice.session_id!==d.session||choice.details.authority_hash!==hash(d)
    ||choice.details.author!==d.owner||choice.details.principal!==d.principal||!db.ownerAuthoredSource(guild,choice.event_key,d.owner)
    ||m?.source_layer!=="pc_feature"||m.entity_key!==d.character||hash(before)!==d.before||hash(after)!==hash(expected)
    ||r.before!==before?.resources.hp.current||r.after!==after?.resources.hp.current)fail("Actual native ally healing owner choices, arithmetic and mutation required.");
  return receipt;
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
