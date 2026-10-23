/** Native damage is a separate target-owned transaction, never narration or a narrative contest score. */
import {createHash,randomUUID} from "node:crypto";
import {d,parseDice,diceSpec} from "./frameworks/daggerheart/public.js";
import {validatePvpAttackRoll,campaignAttackActorHash} from "./pvp-attacks.js";
import {validateDamagePvp} from "./pvp-profiles.js";
import {personalCharacter} from "./personal-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {pendingPvpFear} from "./pvp-fear-gate.js";
import {buildActionPlan,transitionAction} from "./action-dependency.js";
import {completeBlazeAction,validatePcDeathOutcome} from "./pc-death.js";
import {assertPcAttackable} from "./pc-native-eligibility.js";
import {assertBrawlDamageSources,releaseBrawlLocks,pvpWindowDamageSources} from "./pvp-brawl.js";
import {drainActionContinuations} from "./action-continuation.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
import {reserveCampaignDamageNotice} from './native-publications.js';
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const CAMPAIGN_DAMAGE=Symbol('native-campaign-damage-preparation');
function fail(message){throw Object.assign(new Error(message),{code:"PC_EFFECT_AUTHORITY",expected:true});}
function closed(v,keys){if(!v||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!(k in v)))fail("Closed native damage fields required.");}
function ownedAttack(db,guild,user,key){const p=validatePvpAttackRoll(db,guild,key);
  if(user!==p.offer.snapshot.actor_owner||!p.receipt.data.result.hit)fail("Actual native hit and authenticated attacker owner required.");
  personalCharacter(db,guild,user,p.offer.actor);return p;}
export function rollPvpDamage(db,guild,user,input,{rng=d}={}){
  closed(input,["attack_receipt"]);
  const receipt=db.transaction(()=>{
    const p=ownedAttack(db,guild,user,input.attack_receipt),key=`${input.attack_receipt}:damage`,old=db.getCityRecord(guild,"pvp_damage_roll_receipt",key);
    if(old)return validatePvpDamageRoll(db,guild,key).receipt;
    assertPvpSafety(db,guild,[p.offer.actor,p.offer.target]);
    validateDamagePvp(db,guild,p.offer.contract); // Fresh dice never use history/withdrawn consent.
    const pc=db.getCharacter(p.offer.actor);
    if((p.offer.native_rule_basis?campaignAttackActorHash(pc):hash(pc.data))!==p.offer.snapshot.actor||p.request.status!=="awaiting_damage")fail("Attack equipment/source changed before damage; reviewed recovery required, no reroll.");
    const weapon=p.offer.input.kind==="weapon"?pc.data.inventory.find(w=>w.name===p.offer.input.weapon&&w.equipped===true):null;
    if(weapon?.direct_damage!==undefined&&typeof weapon.direct_damage!=="boolean")fail("Exact native direct-damage applicability required.");
    const dice=parseDice(p.offer.damage,rng),spec=diceSpec(p.offer.damage),critical_bonus=p.receipt.data.result.duality==="Critical"?spec.count*spec.sides:0;
    const result={id:randomUUID(),roll_type:"damage_pvp_damage",attack_receipt:input.attack_receipt,...dice,critical_bonus,
      total:dice.total+critical_bonus,type:p.offer.damage_type,direct:weapon?.direct_damage===true};
    const roll=db.addRoll(guild,p.offer.session,user,p.offer.actor,"damage_pvp_damage",result);
    const receipt=db.saveCityRecord(guild,{kind:"pvp_damage_roll_receipt",key,status:"resolved",visibility:"gm",subject_key:p.offer.actor,
      source_event:p.receipt.source_event,data:{version:1,attack_receipt:input.attack_receipt,roll_id:roll,result}});
    db.saveCityRecord(guild,{...p.request,key:p.request.record_key,status:"awaiting_armor",data:{...p.request.data,damage:receipt.record_key}});return receipt;
  });
  const p=validatePvpDamageRoll(db,guild,receipt.record_key);
  if(p.contract.data.version===4&&p.offer.native_rule_basis){
    try{prepareCampaignPvpDamage(db,guild,pvpWindowDamageSources(db,guild,p.request));}
    catch(error){
      if(!['PC_EFFECT_AUTHORITY','NARRATIVE_PVP'].includes(error.code))throw error;
      db.saveCityRecord(guild,{kind:'pvp_campaign_damage_review',key:p.request.record_key,status:'needs_review',visibility:'gm',
        source_event:receipt.source_event,data:{version:1,damage:receipt.record_key,reason:String(error.message).slice(0,500),
          authority:'Saved dice retained; native grouping/defense or rightful owner response required. No HP or Armor effect.'}});
    }
  }
  return receipt;
}
export function validatePvpDamageRoll(db,guild,key){
  const receipt=db.getCityRecord(guild,"pvp_damage_roll_receipt",key),data=receipt?.data,p=data&&validatePvpAttackRoll(db,guild,data.attack_receipt),r=data?.result;
  if(receipt?.status!=="resolved"||data.version!==1||key!==`${data.attack_receipt}:damage`||receipt.visibility!=="gm"
    ||receipt.subject_key!==p.offer.actor||receipt.source_event!==p.receipt.source_event||p.request.data.damage!==key||!p.receipt.data.result.hit
    ||r.roll_type!=="damage_pvp_damage"||r.attack_receipt!==p.receipt.record_key||r.expression!==p.offer.damage||r.type!==p.offer.damage_type||typeof r.direct!=="boolean")fail("Exact native attack/damage receipt required.");
  const roll=db.getSavedRoll(guild,data.roll_id),spec=diceSpec(p.offer.damage),critical=p.receipt.data.result.duality==="Critical"?spec.count*spec.sides:0;
  if(roll?.roll_type!=="damage_pvp_damage"||roll.character_id!==p.offer.actor||roll.discord_user_id!==p.offer.snapshot.actor_owner
    ||roll.session_id!==p.offer.session||hash(roll.payload)!==hash(r)||r.critical_bonus!==critical||r.modifier!==spec.mod
    ||r.dice.length!==spec.count||r.dice.some(v=>!Number.isSafeInteger(v)||v<1||v>spec.sides)
    ||r.total!==r.dice.reduce((a,b)=>a+b,0)+spec.mod+critical)fail("Saved native damage dice and Critical arithmetic required.");
  return {...p,receipt,attack:p.receipt};
}
function defenses(pc,input,ruling,types,{native=false}={}){
  closed(input,["source","resistance","armor_reduction","armor_allowed"]);
  if(!native&&!ruling?.created_by||!["none","half","immune"].includes(input.resistance)||![1,2].includes(input.armor_reduction)
    ||typeof input.armor_allowed!=="boolean")fail("Exact source-reviewed native defenses required.");
  const base=input.resistance==="none"&&input.armor_reduction===1&&input.armor_allowed;
  if(native&&(!base||input.source!=='base'||[...(pc.data.inventory||[]),...(pc.data.domain_cards||[])].some(v=>
    (v?.active===true||v?.equipped===true)&&(v.armor_severity_reduction===2||v.resistance_types?.length||v.immunity_types?.length))))
    fail('Applicable special defenses need exact native selection/review; the baseline cannot suppress owned protection.');
  const owned=[...(pc.data.inventory||[]),...(pc.data.domain_cards||[])].filter(v=>v?.name===input.source&&(v.active===true||v.equipped===true));
  if(input.source==="base"?!base:owned.length!==1)
    fail("Defense requires an actual active owned source and separately reviewed native applicability.");
  if(input.resistance!=="none"){
    const applicable=owned[0]?.[input.resistance==="half"?"resistance_types":"immunity_types"];
    if(!Array.isArray(applicable)||!applicable.length||applicable.some(t=>!["physical","magic"].includes(t))||types.some(t=>!applicable.includes(t)))
      fail("Exact owned resistance/immunity damage-type scope required; mixed sources cannot inherit a partial ward.");
  }
  if(input.armor_reduction===2&&owned[0]?.armor_severity_reduction!==2)fail("Native owned two-threshold Armor mapping required; a feature name is not permission.");
  if((pc.data.conditions||[]).some(c=>c?.active!==false))fail("Unmapped current defensive conditions require native review.");
  const {major,severe}=pc.data.thresholds||{},hp=pc.data.resources?.hp,armor=pc.data.resources?.armor;
  if(![major,severe,hp?.current,hp?.max,armor?.current,armor?.max].every(Number.isSafeInteger)||major<1||severe<major
    ||hp.current<0||hp.current>hp.max||hp.max<1||hp.max>12||armor.current<0||armor.current>armor.max)fail("Verified current thresholds, HP and Armor required.");
}
function facts(db,guild,input,{committed=false,native=false}={}){
  if(!Array.isArray(input.damage_receipts)||!input.damage_receipts.length||input.damage_receipts.length>12
    ||new Set(input.damage_receipts).size!==input.damage_receipts.length)fail("Distinct bounded native simultaneous damage sources required.");
  const rows=input.damage_receipts.map(key=>validatePvpDamageRoll(db,guild,key)),first=rows[0],pc=db.getCharacter(first.offer.target);
  if(native&&rows.some(p=>p.contract.data.version!==4||!p.offer.native_rule_basis))fail('Native campaign damage cannot upgrade bilateral or unverified mechanics.');
  const ruling=native?{kind:'native_campaign_damage',rules:rows.map(p=>p.offer.native_rule_basis)}:db.getRulesRuling(guild,input.ruling);
  assertBrawlDamageSources(db,guild,rows,{committed});
  if(rows.some(p=>p.offer.target!==pc.id||p.offer.scene!==first.offer.scene||p.offer.session!==first.offer.session))fail("Simultaneous source group must share actual target/session/scene.");
  if(!committed){assertPvpSafety(db,guild,rows.flatMap(p=>[p.offer.actor,p.offer.target]));assertPcAttackable(pc,db,guild);for(const p of rows){validateDamagePvp(db,guild,p.offer.contract);
    if(p.request.status!=="awaiting_armor")fail("Damage source is already consumed or not awaiting Armor.");}defenses(pc,input.defenses,ruling,rows.map(p=>p.receipt.data.result.type),{native});}
  return {rows,pc,ruling,first};
}
/** Authenticated human adjudicates actual simultaneity and applicability; cannot supply dice/deltas. */
export function preparePvpDamage(db,guild,user,input,{gm=false,interactionId}={}){
  closed(input,["damage_receipts","ruling","defenses"]);if(!gm||!user||!interactionId)fail("Authenticated GM native damage review required.");
  return db.transaction(()=>{
    const key=`pvp-damage-group:${hash([guild,[...input.damage_receipts].sort()])}`,old=db.getCityRecord(guild,"pvp_damage_offer",key);
    if(old){if(hash(old.data.binding.input)!==hash(input))fail("Frozen damage group cannot change sources/rules; reviewed recovery required.");proof(db,guild,key,{committed:old.status==="applied"});return old;}
    const native=gm===CAMPAIGN_DAMAGE,f=facts(db,guild,input,{native});assertPvpSafety(db,guild,f.rows.flatMap(p=>[p.offer.actor,p.offer.target]));
    const binding={version:1,input,reviewer:user,...(native?{native_authority:'native_campaign'}:{}),target:f.pc.id,owner:f.pc.owner_user_id,
      principal:f.first.offer.snapshot.target_principal,session:f.first.offer.session,scene:f.first.offer.scene,
      before:hash(f.pc.data),target_state:{resources:f.pc.data.resources,thresholds:f.pc.data.thresholds},
      ruling_hash:hash(f.ruling),sources:f.rows.map(p=>({key:p.receipt.record_key,digest:hash(p.receipt)}))};
    for(const p of f.rows){const used=db.getCityRecord(guild,"pvp_damage_group_member",p.receipt.record_key);
      if(used&&used.data.group!==key)fail("Native damage source already belongs to another simultaneous group.");}
    const mutation=native&&db.recordMutation(guild,{actorType:'system',actorId:'campaign_pvp',sourceLayer:'pvp_campaign',
      mutationType:'campaign_damage_review',entityKey:key,sessionId:binding.session,visibility:'gm',after:binding});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"native_pvp_damage_review",title:"Source-reviewed native damage and simultaneous grouping",
      ...(native?{source_kind:'mutation',source_id:mutation.id}:{source_id:`gm:${user}`}),visibility:"gm",session_id:binding.session,scene:binding.scene,details:binding},user);
    for(const p of f.rows)db.saveCityRecord(guild,{kind:"pvp_damage_group_member",key:p.receipt.record_key,status:"locked",visibility:"gm",source_event:source.event_key,data:{group:key}});
    return db.saveCityRecord(guild,{kind:"pvp_damage_offer",key,status:"awaiting_owner",visibility:"gm",source_event:source.event_key,data:{binding,digest:hash(binding)}});
  });
}
function proof(db,guild,key,{committed=false}={}){
  const row=db.getCityRecord(guild,"pvp_damage_offer",key),b=row?.data.binding,s=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.visibility!=="gm"||b?.version!==1||hash(b)!==row.data.digest||key!==damageOfferKey(guild,b)
    ||row.source_event!==`${key}:source`||s?.status!=="active"||s.kind!=="native_pvp_damage_review"||s.visibility!=="gm"
    ||hash(s.details)!==hash(b)||s.session_id!==b.session||s.scene!==b.scene
    ||!damageReviewAuthority(db,guild,key,s,b))fail("Exact native damage review source required.");
  if(b.recovery){
    const old=db.getCityRecord(guild,'pvp_damage_offer',b.recovery.previous),previous=old?.data.binding,
      source=old&&db.getWorldEvent(guild,old.source_event);
    if(b.native_authority!=='native_campaign'||old?.status!=='superseded'||old.data.replacement!==key
      ||old.data.digest!==b.recovery.digest||hash(previous)!==old.data.digest||source?.status!=='active'
      ||source.kind!=='native_pvp_damage_review'||source.visibility!=='gm'||hash(source.details)!==hash(previous)
      ||!damageReviewAuthority(db,guild,old.record_key,source,previous)||previous.native_authority!=='native_campaign'
      ||hash(previous.input)!==hash(b.input)||previous.owner!==b.owner||previous.principal!==b.principal
      ||previous.target!==b.target||previous.scene!==b.scene||previous.session!==b.session)
      fail('Exact immutable native pending-damage recovery ancestry required.');
  }
  const f=facts(db,guild,b.input,{committed,native:b.native_authority==='native_campaign'});
  if(f.pc.id!==b.target||f.pc.owner_user_id!==b.owner||f.first.offer.snapshot.target_principal!==b.principal
    ||f.first.offer.session!==b.session||f.first.offer.scene!==b.scene||hash(f.ruling)!==b.ruling_hash
    ||f.rows.some((p,i)=>hash(p.receipt)!==b.sources[i].digest||p.receipt.record_key!==b.sources[i].key
      ||db.getCityRecord(guild,"pvp_damage_group_member",p.receipt.record_key)?.data.group!==key))fail("Native damage source/rule/owner changed.");
  if(!committed&&hash(f.pc.data)!==b.before)fail("Target defense/resource compare-and-set is stale; reviewed recovery required.");
  return {...f,row,b};
}
function damageOfferKey(guild,binding){
  const base=`pvp-damage-group:${hash([guild,[...binding.input.damage_receipts].sort()])}`;
  return binding.recovery?`pvp-damage-refresh:${hash([guild,binding.input.damage_receipts,binding.recovery.previous,binding.recovery.digest,binding.before])}`:base;
}
function damageReviewAuthority(db,guild,key,source,binding){
  if(binding.native_authority!=='native_campaign')return source.source_id===`gm:${binding.reviewer}`&&db.ownerAuthoredSource(guild,source.event_key,binding.reviewer);
  const m=source.source_kind==='mutation'&&db.getMutation(guild,source.source_id);let after;
  try{after=JSON.parse(m?.after_json||'null');}catch{return false;}
  return binding.reviewer==='native:campaign_pvp'&&m?.actor_type==='system'&&m.actor_id==='campaign_pvp'
    &&m.source_layer==='pvp_campaign'&&m.mutation_type==='campaign_damage_review'&&m.entity_key===key
    &&m.session_id===binding.session&&m.visibility==='gm'&&hash(after)===hash(binding);
}
/** Existing threshold/Armor engine, actual saved damage only. Never chooses or spends the defender's Armor. */
export function prepareCampaignPvpDamage(db,guild,receipts){
  const groups=new Set(receipts.map(key=>db.getCityRecord(guild,'pvp_damage_group_member',key)?.data.group).filter(Boolean));
  if(groups.size===1){
    const current=db.getCityRecord(guild,'pvp_damage_offer',[...groups][0]);
    if(current?.data.binding.native_authority==='native_campaign'
      &&hash([...current.data.binding.input.damage_receipts].sort())===hash([...receipts].sort())){
      proof(db,guild,current.record_key,{committed:current.status==='applied'});
      if(current.status==='awaiting_owner')reserveCampaignDamageNotice(db,guild,current.record_key);
      return current;
    }
  }
  const offer=preparePvpDamage(db,guild,'native:campaign_pvp',{damage_receipts:receipts,ruling:'',
    defenses:{source:'base',resistance:'none',armor_reduction:1,armor_allowed:true}},
    {gm:CAMPAIGN_DAMAGE,interactionId:`native-damage:${hash(receipts)}`});
  reserveCampaignDamageNotice(db,guild,offer.record_key);return offer;
}
/** Explicit affected-owner reinspection after an independent native sheet change. No dice, Armor or HP choice. */
export function refreshCampaignPvpDamage(db,guild,user,input,{interactionId}={}){
  closed(input,['damage']);if(!interactionId)fail('Authenticated exact owner recovery interaction required.');
  const result=db.transaction(()=>{
    const raw=db.getCityRecord(guild,'pvp_damage_offer',input.damage);
    if(raw?.status==='superseded'&&raw.data.binding.native_authority==='native_campaign'){
      const replacement=db.getCityRecord(guild,'pvp_damage_offer',raw.data.replacement),
        checked=proof(db,guild,replacement?.record_key,{committed:replacement?.status==='applied'});
      if(checked.b.recovery?.previous!==raw.record_key||checked.b.owner!==user)fail('Exact affected-owner recovery replay required.');
      personalCharacter(db,guild,user,checked.pc.id);return replacement;
    }
    if(raw?.status!=='awaiting_owner'||raw.data.binding.native_authority!=='native_campaign')
      fail('Only unfinished native campaign damage may refresh; committed outcomes and human reviews remain immutable.');
    const prior=proof(db,guild,input.damage,{committed:true}),f=facts(db,guild,prior.b.input,{native:true});
    if(user!==prior.b.owner||f.pc.owner_user_id!==user||f.first.offer.snapshot.target_principal!==prior.b.principal)
      fail('Only the exact current affected owner may refresh their pending native defense.');
    personalCharacter(db,guild,user,f.pc.id);assertPvpSafety(db,guild,f.rows.flatMap(p=>[p.offer.actor,p.offer.target]));
    const before=hash(f.pc.data);if(before===prior.b.before)return raw;
    const binding={...prior.b,before,target_state:{resources:f.pc.data.resources,thresholds:f.pc.data.thresholds},
      recovery:{previous:raw.record_key,digest:raw.data.digest}},key=damageOfferKey(guild,binding);
    if(db.getCityRecord(guild,'pvp_damage_offer',key))fail('Native recovery identity collision; inspect saved recovery instead.');
    const mutation=db.recordMutation(guild,{actorType:'system',actorId:'campaign_pvp',sourceLayer:'pvp_campaign',
      mutationType:'campaign_damage_review',entityKey:key,sessionId:binding.session,visibility:'gm',after:binding});
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_pvp_damage_review',
      title:'Native pending damage reinspection; no owner resource choice',source_kind:'mutation',source_id:mutation.id,
      visibility:'gm',session_id:binding.session,scene:binding.scene,details:binding},'native:campaign_pvp');
    db.saveCityRecord(guild,{...raw,key:raw.record_key,status:'superseded',data:{...raw.data,replacement:key}});
    for(const p of f.rows)db.saveCityRecord(guild,{kind:'pvp_damage_group_member',key:p.receipt.record_key,
      status:'locked',visibility:'gm',source_event:source.event_key,data:{group:key}});
    return db.saveCityRecord(guild,{kind:'pvp_damage_offer',key,status:'awaiting_owner',visibility:'gm',
      source_event:source.event_key,data:{binding,digest:hash(binding)}});
  });
  if(result.status==='awaiting_owner')reserveCampaignDamageNotice(db,guild,result.record_key);return result;
}
/** Read-only exact affected-owner defense status. Receipt delivery is not an Armor decision. */
export function pvpDamageOwnerStatus(db,guild,user,key){
  const raw=db.getCityRecord(guild,'pvp_damage_offer',key),f=proof(db,guild,key,{committed:raw?.status==='applied'});
  if(user!==f.b.owner)fail('Only the affected current owner may inspect this damage choice.');
  personalCharacter(db,guild,user,f.pc.id);
  return {damage_group:key,character:f.pc.id,owner:user,status:raw.status,digest:raw.data.digest,
    native_campaign:f.b.native_authority==='native_campaign',...amounts(f),armor:f.pc.data.resources.armor,
    authority:'Private native defense status only; no Armor choice, HP change, consent or disclosure.'};
}
function amounts(f){const raw=f.rows.reduce((n,p)=>n+p.receipt.data.result.total,0),def=f.b.input.defenses;
  const damage=def.resistance==="immune"?0:def.resistance==="half"?Math.ceil(raw/2):raw,{major,severe}=f.b.target_state.thresholds;
  return {raw,damage,severity:damage<=0?0:damage>=severe?3:damage>=major?2:1,direct:f.rows.some(p=>p.receipt.data.result.direct)};}
export function reviewPvpDamage(db,guild,user,key){
  return db.transaction(()=>{const old=db.getCityRecord(guild,"pvp_damage_offer",key),f=proof(db,guild,key,{committed:old?.status==="applied"});
    if(user!==f.b.owner)fail("Current affected owner must review their own native damage.");
    if(old.status==="applied")return {damage:key,revision:old.data.digest,status:"applied",effect:validatePvpDamageApplication(db,guild,old.data.application).record_key};
    personalCharacter(db,guild,user,f.pc.id);
    const a=amounts(f);db.saveCityRecord(guild,{kind:"pvp_damage_owner_review",key:`${key}:review`,status:"reviewed",visibility:"character",subject_key:f.pc.id,
      source_event:old.source_event,data:{owner:user,digest:old.data.digest}});
    return {damage:key,revision:old.data.digest,character:f.pc.id,damage:a.damage,severity:a.severity,direct:a.direct,thresholds:f.pc.data.thresholds,
      armor:f.pc.data.resources.armor,defenses:f.b.input.defenses,
      instruction:"Choose your own Armor Slot, if applicable. Armor reduces severity, not raw damage. Final HP invokes YOUR vanilla SRD death move; no guaranteed nonlethal cap or forced reaction. Other PCs' traits and private choices are not disclosed."};});
}
export function resolvePvpDamage(db,guild,user,input,{interactionId}={}){
  closed(input,["damage","expected_revision","armor"]);if(!interactionId||typeof input.armor!=="boolean")fail("Authenticated affected-owner exact Armor choice required.");
  return db.transaction(()=>{
    const old=db.getCityRecord(guild,"pvp_damage_offer",input.damage),f=proof(db,guild,input.damage,{committed:old?.status==="applied"});
    if(user!==f.b.owner||input.expected_revision!==old.data.digest)fail("Current affected owner/revision required.");
    if(old.status==="applied"){const receipt=validatePvpDamageApplication(db,guild,old.data.application);
      if(receipt.data.armor!==input.armor)fail("Native Armor decision replay differs.");return receipt;}
    assertPvpSafety(db,guild,f.rows.flatMap(p=>[p.offer.actor,p.offer.target]));
    personalCharacter(db,guild,user,f.pc.id);
    const review=db.getCityRecord(guild,"pvp_damage_owner_review",`${input.damage}:review`);
    if(review?.status!=="reviewed"||review.visibility!=="character"||review.subject_key!==f.pc.id||review.source_event!==old.source_event
      ||review.data.owner!==user||review.data.digest!==old.data.digest)fail("Privately review exact native damage before your Armor choice.");
    const a=amounts(f),resources=f.pc.data.resources,slots=resources.armor,hp=resources.hp,def=f.b.input.defenses;
    if(input.armor&&(a.direct||!def.armor_allowed||!a.severity||slots.current>=slots.max))fail("Armor unavailable or forbidden for direct/no damage.");
    const marks=Math.max(0,a.severity-(input.armor?def.armor_reduction:0)),actual=Math.min(marks,hp.max-hp.current);
    const choice=indexWorldEvent(db,guild,{key:`${input.damage}:armor`,kind:"pvp_armor_owner_choice",title:"Target-owned native Armor decision",
      source_id:`player:${user}`,session_id:f.b.session,scene:f.b.scene,visibility:"character",subject_key:f.pc.id,
      details:{author:user,damage:input.damage,digest:old.data.digest,armor:input.armor,principal:f.b.principal,interaction:interactionId}},user);
    if(choice.status!=="active")fail("Native owner Armor source revoked.");
    const authority={version:1,kind:"verified_pvp_damage",group:input.damage,target:f.pc.id,before:f.b.before,hp_marks:actual,armor:input.armor,
      native_damage_refs:f.b.sources,owner_choice:choice.event_key,terms:f.rows.map(p=>p.offer.terms_hash)};
    const entitlement=db.saveCityRecord(guild,{kind:"pc_effect_authority",key:`${input.damage}:authority`,status:"applied",source_event:old.source_event,
      visibility:"gm",data:authority});
    db.updateCharacterData(f.pc.id,data=>{data.resources.hp.current+=actual;if(input.armor)data.resources.armor.current++;
      if(hp.current+actual===hp.max&&marks>0)data.death_state={request:`${input.damage}:death`,status:"pending_choice"};});
    const after=db.getCharacter(f.pc.id).data.resources,key=`${input.damage}:effect`;
    const mutation=db.recordMutation(guild,{sessionId:f.b.session,actorType:"player",actorId:user,sourceLayer:"pvp_damage",mutationType:"verified_pvp_damage",
      entityKey:f.pc.id,visibility:"character",before:resources,after,rationale:"Native consented PC damage with affected-owner Armor decision.",payload:{authority:entitlement.record_key,effect:key}});
    const material={version:1,cause_type:"verified_pvp_damage",group:input.damage,authority:entitlement.record_key,authority_hash:hash(authority),character:f.pc.id,
      hp_marks:actual,armor:input.armor,damage_after_resistance:a.damage,severity:a.severity,before:resources,after,owner_choice:choice.event_key,
      scene:f.b.scene,session:f.b.session,owner:user,principal:f.b.principal,mutation:mutation.id};
    const effect=db.saveCityRecord(guild,{kind:"pc_effect_receipt",key,status:"resolved",source_event:old.source_event,visibility:"character",subject_key:f.pc.id,
      data:{...material,effect_digest:hash(material)}});
    db.saveCityRecord(guild,{...old,key:old.record_key,status:"applied",data:{...old.data,application:key}});
    for(const p of f.rows)db.saveCityRecord(guild,{...p.request,key:p.request.record_key,status:"damage_applied",data:{...p.request.data,application:key}});
    if(hp.current+actual===hp.max&&marks>0){const data={version:2,character:f.pc.id,owner:user,principal:f.b.principal,cause:key,scene:f.b.scene,session:f.b.session,
      authority:"Only this current PC owner selects a vanilla SRD death move. No automatic death, cap, nonlethal fall, narration or scar story."};
      db.saveCityRecord(guild,{kind:"pc_death_move_request",key:`${input.damage}:death`,status:"awaiting_owner",source_event:old.source_event,visibility:"character",subject_key:f.pc.id,
        data:{...data,digest:hash(data)}});}
    for(const p of f.rows){const staged=db.getCityRecord(guild,"pvp_attack_intent",p.offer.input.attack);
      if(p.attack.data.result.auto_critical)completeBlazeAction(db,guild,p.offer.actor,staged.data.accepted_intent,
        {request:p.request.record_key,roll:p.attack.data.roll_id,effect:effect.record_key});
      settlePvpDamageAction(db,guild,p.request.record_key);}
    return effect;
  });
}
/** Read-only proof; publication still requires separate bounded owner disclosure. */
export function validatePvpDamageApplication(db,guild,key){
  const effect=db.getCityRecord(guild,"pc_effect_receipt",key),{effect_digest,...d}=effect?.data||{},f=d.group&&proof(db,guild,d.group,{committed:true});
  if(effect?.status!=="resolved"||d.cause_type!=="verified_pvp_damage"||hash(d)!==effect_digest||key!==`${d.group}:effect`
    ||effect.visibility!=="character"||effect.subject_key!==f.pc.id||effect.source_event!==f.row.source_event||f.row.data.application!==key||f.row.status!=="applied"
    ||d.character!==f.pc.id||d.owner!==f.b.owner||d.principal!==f.b.principal||d.scene!==f.b.scene||d.session!==f.b.session)fail("Exact native PC damage application required.");
  const authority=db.getCityRecord(guild,"pc_effect_authority",d.authority),choice=db.getWorldEvent(guild,d.owner_choice),mutation=db.getMutation(guild,d.mutation);
  const a=amounts(f),before=f.b.target_state.resources,marks=Math.max(0,a.severity-(d.armor?f.b.input.defenses.armor_reduction:0));
  const actual=Math.min(marks,before.hp.max-before.hp.current),after=structuredClone(before);after.hp.current+=actual;if(d.armor)after.armor.current++;
  const expectedAuthority={version:1,kind:"verified_pvp_damage",group:d.group,target:f.pc.id,before:f.b.before,hp_marks:actual,armor:d.armor,
    native_damage_refs:f.b.sources,owner_choice:d.owner_choice,terms:f.rows.map(p=>p.offer.terms_hash)};
  if(hash(authority?.data)!==hash(expectedAuthority)||d.hp_marks!==actual||hash(d.before)!==hash(before)||hash(d.after)!==hash(after)
    ||d.damage_after_resistance!==a.damage||d.severity!==a.severity||d.authority!==`${d.group}:authority`
    ||d.armor&&(a.direct||!f.b.input.defenses.armor_allowed||!a.severity||before.armor.current>=before.armor.max))fail("Native damage/threshold/Armor arithmetic and exact entitlement required.");
  if(authority?.status!=="applied"||authority.data.kind!=="verified_pvp_damage"||hash(authority.data)!==d.authority_hash
    ||authority.source_event!==effect.source_event||choice?.status!=="active"||choice.kind!=="pvp_armor_owner_choice"||choice.subject_key!==f.pc.id
    ||choice.visibility!=="character"||choice.source_id!==`player:${d.owner}`||choice.details.author!==d.owner||choice.details.damage!==d.group
    ||choice.details.digest!==f.row.data.digest||choice.details.armor!==d.armor||choice.details.principal!==d.principal
    ||!db.ownerAuthoredSource(guild,choice.event_key,d.owner)||mutation?.source_layer!=="pvp_damage"||mutation.entity_key!==f.pc.id
    ||hash(JSON.parse(mutation.before_json))!==hash(d.before)||hash(JSON.parse(mutation.after_json))!==hash(d.after)
    ||d.after.hp.current-d.before.hp.current!==d.hp_marks||d.after.armor.current-d.before.armor.current!==(d.armor?1:0))fail("Native damage authority, owner choice and atomic mutation required.");
  return effect;
}
export function settlePvpDamageAction(db,guild,key){
  const request=db.getCityRecord(guild,"pvp_attack_request",key),o=request?.data.offer;
  if(!request?.data.application){
    if(!request?.data.roll||request.status==='cancelled')return null;
    const p=validatePvpAttackRoll(db,guild,request.data.roll);
    if(p.receipt.data.result.hit)return null;
    if(pendingPvpFear(db,guild,p.contract).length)return {status:'consequence_pending',roll:p.receipt.record_key};
    return settlePvpAction(db,guild,request,p,null,'failure');
  }
  const effect=validatePvpDamageApplication(db,guild,request.data.application),p=validatePvpAttackRoll(db,guild,request.data.roll);
  const defense=db.getCityRecord(guild,"pvp_damage_offer",effect.data.group).data.binding.input.defenses;
  if(effect.data.after.hp.current===effect.data.after.hp.max&&effect.data.severity-(effect.data.armor?defense.armor_reduction:0)>0){
    const death=db.getCityRecord(guild,"pc_death_move_request",`${effect.data.group}:death`);
    if(!death||death.data.cause!==effect.record_key)fail("Native final-HP request required before dependent terminal.");
    if(death.status!=="resolved")return {status:"death_move_pending",effect:effect.record_key};
    if(validatePcDeathOutcome(db,guild,`${death.record_key}:outcome`).status!=="resolved")fail("Actual native death outcome must resolve before dependent terminal.");
  }
  if(pendingPvpFear(db,guild,p.contract).length)return {status:"consequence_pending",effect:effect.record_key};
  return settlePvpAction(db,guild,request,p,effect,'success');
}
function settlePvpAction(db,guild,request,p,effect,outcome){
  const key=request.record_key,o=request.data.offer;
  const id=`${key}:terminal`,old=db.getCityRecord(guild,"pvp_action_terminal_receipt",id);if(old)return old;
  const staged=db.getCityRecord(guild,"pvp_attack_intent",o.input.attack),action=db.getCityRecord(guild,"typed_intent",staged.data.accepted_intent);
  const terminal=db.saveCityRecord(guild,{kind:"pvp_action_terminal_receipt",key:id,status:"resolved",visibility:"gm",source_event:action.source_event,
    data:{attack:key,roll:request.data.roll,damage:request.data.damage||null,effect:effect?.record_key||null,action:action.record_key,outcome}});
  const receipt=db.saveCityRecord(guild,{kind:"action_outcome_receipt",key:`${id}:action`,status:"resolved",visibility:"character",subject_key:o.actor,source_event:action.source_event,
    data:{action_id:action.record_key,actor_ref:o.actor,audience:"character",outcome,native_roll_refs:[p.receipt.data.roll_id],
      state_mutations:effect?[effect.record_key]:[],terminal:id}});
  // Declaration remains immutable accepted input/consent ancestry. Only private execution metadata is appended.
  db.saveCityRecord(guild,{...action,key:action.record_key,data:{...action.data,outcome_receipt:receipt.record_key,native_disposition:"private_pvp_resolved"}});
  const nodes=db.listCityRecords(guild,{kind:"compound_action",includeGM:true,limit:500}),node=nodes.find(n=>n.data.action_id===action.record_key);
  if(node)transitionAction(db,guild,node.record_key,{expected_status:node.data.status,status:outcome==='success'?'resolved':'failed',receipt:receipt.record_key});
  const related=nodes.filter(n=>n.source_event===action.source_event).map(n=>db.getCityRecord(guild,"typed_intent",n.data.action_id));if(related.length)buildActionPlan(db,guild,related);
  db.saveCityRecord(guild,{...request,key,status:outcome==='success'?'resolved':'missed',data:{...request.data,terminal:terminal.record_key}});
  releaseBrawlLocks(db,guild,key);drainActionContinuations(db,guild,{sourceEvent:action.source_event});return terminal;
}
