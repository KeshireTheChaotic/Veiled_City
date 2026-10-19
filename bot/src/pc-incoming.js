/** Real Daggerheart incoming standard NPC attacks. Simulation d20 rows and GM prose are not damage authority. */
import { createHash } from "node:crypto";
import { d, diceSpec, gmD20Roll, gmAttackDamage } from "./dice.js";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene, scenePresence, sceneAccess, RANGE_BANDS } from "./scene-continuity.js";
import { activeCityProxy } from "./city-constraints.js";
import { personalCharacter } from "./personal-continuity.js";
import { conversationPrincipal,historicalOwnerPrincipal } from "./conversation-principal.js";
import { assertNonPvpCombatant } from "./pvp-authority.js";
import {assertPcAttackable} from "./pc-native-eligibility.js";
import {assertFearIncomingExecution} from "./pvp-fear-moves.js";
import {inspectNativeGmDecision,inspectCommittedGmDecision,commitGmActionCost} from './gm-action-capability.js';
import {captureIncomingFeatureWindows} from './native-feature-windows.js';
import {nativeAttackPassives,nativeStandardDamage,nativeDamageBonusExpression} from './native-feature-passives.js';
import {compileNativeFeatures} from './native-feature-catalog.js';
import {nativeHouseErratum} from './native-house-errata.js';
import {nativeHitFeatureCandidates,applyManyDeathsAfterIncoming} from './native-feature-hit.js';
import {nativeIncomingConditions,validateIncomingConditions,incomingConditionOdds,nativeAttackExpiryRevision} from './native-group-features.js';

const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const AUTONOMOUS_FEAR_ATTACK=Symbol("native-autonomous-fear-attack");
const NATIVE_AI_ATTACK=Symbol('native-ai-gm-attack'),INSPECT_ONLY=Symbol('read-only-native-attack');
const VOLLEY='adversary:ritual-enforcement-team:coordinated-volley';
function fail(message){throw Object.assign(new Error(message),{code:"PC_EFFECT_AUTHORITY",expected:true});}
function gmOnly(user,options){if(!options.gm||!user)fail("Authenticated GM native attack required.");}
function facts(db,guild,input,library,authority=null,existingOffer=null,committedRoll=false){
  assertNonPvpCombatant(db,guild,{actor_key:input.npc});
  const scene=currentScene(db,guild),pc=db.getCharacter(input.character),encounter=db.getCurrentEncounter(scene.session_id);
  const c=encounter&&db.listCombatants(encounter.id).find(c=>c.id===input.combatant),binding=encounter&&db.getCityRecord(guild,"encounter_binding",encounter.id);
  if(c)assertNonPvpCombatant(db,guild,c);
  const npc=scenePresence(db,guild,"npc",input.npc),target=pc&&scenePresence(db,guild,"character",pc.id);
  const source=db.getWorldEvent(guild,input.source),ruling=input.ruling?.startsWith('ai-decision:')?inspectNativeGmDecision(db,guild,input.ruling.slice(12)).row:db.getRulesRuling(guild,input.ruling),template=c&&library?.findAdversary(c.base_name);
  if(ruling?.kind==='gm_arbitration_decision'){
    const n=ruling.data.native;
    const expected=n?.operation==='commit_adversary_volley'?n.inputs?.find(i=>i.character===input.character):n?.input;
    if(ruling.status!=='gm_action_ready'||!['commit_adversary_attack','commit_adversary_volley'].includes(n?.operation)||input.source!==ruling.source_event
      ||!expected||hash({...input,source:expected.source,ruling:''})!==hash(expected)||hash(template)!==n.template_hash)fail('Exact native AI-GM attack ruling required.');
  }
  if(pc?.guild_id!==guild||!db.getNpcProfile(guild,input.npc)||!db.getSimulationEntity(guild,"npc",input.npc)
    ||encounter?.status!=="active"||c?.status!=="active"||activeCityProxy(db,guild,input.npc)
    ||!binding?.data.combatants?.some(b=>b.actor===input.npc&&b.id===c.id)
    ||db.getWorldEvent(guild,binding.source_event)?.status!=="active"||source?.status!=="active"
    ||source.session_id!==scene.session_id||source.scene!==scene.key||(authority!==INSPECT_ONLY&&!ruling?.created_by&&ruling?.kind!=='gm_arbitration_decision')||!template
    ||npc?.data.state!=="actually_present"||target?.data.state!=="actually_present"
    ||npc.location_key!==pc.data.location||target.location_key!==pc.data.location
    ||!sceneAccess(db,guild,{observer_type:"npc",observer_key:input.npc,target_type:"character",target_key:pc.id,sense:"sight"}))
    fail("Current native encounter, NPC binding, unproxied presence, source and target legality required.");
  for(const presence of [npc,target])if(db.getWorldEvent(guild,presence.source_event)?.status!=="active")fail("Native presence source retracted.");
  personalCharacter(db,guild,pc.owner_user_id,pc.id);
  assertPcAttackable(pc,db,guild);
  const standard=/^(.+?)\s*[—–]\s*(Melee|Very Close|Close|Far|Very Far)\s*[—–]\s*(\d+d\d+(?:[+-]\d+)?)\s+(physical|magic)$/u.exec(template.standard);
  const evasion=pc.data.evasion,{major,severe}=pc.data.thresholds||{};
  const defenses=input.defenses;
  if(!defenses||Object.keys(defenses).some(k=>!["resistance","armor_reduction","armor_allowed","source"].includes(k))
    ||!["none","half","immune"].includes(defenses.resistance)||![1,2].includes(defenses.armor_reduction)
    ||typeof defenses.armor_allowed!=="boolean"||typeof defenses.source!=="string")fail("Exact reviewed defense applicability required.");
  const base=defenses.resistance==="none"&&defenses.armor_reduction===1&&defenses.armor_allowed;
  const active=[...(pc.data.domain_cards||[]),...(pc.data.inventory||[]),...(pc.data.conditions||[])];
  if(defenses.source==="base"?!base:!active.some(item=>item?.name===defenses.source&&(item.active===true||item.equipped===true)))
    fail("Defense modifier needs an active owned source, saved GM ruling and separate owner review; unsupported defenses remain pending.");
  if(!standard||![evasion,major,severe].every(Number.isSafeInteger)||evasion<1||major<1||severe<major
    ||!Number.isSafeInteger(Number(template.attack)))fail("Verified standard attack, Evasion and final PC thresholds required; unsupported features need review.");
  const actualRange=npc.data.zone===target.data.zone?"Melee":target.data.range;
  if(!RANGE_BANDS.includes(actualRange)||RANGE_BANDS.indexOf(actualRange)>RANGE_BANDS.indexOf(standard[2]))fail("Native target outside standard attack range.");
  const snapshot={scene:scene.key,session:scene.session_id,pc:hash(pc.data),owner:pc.owner_user_id,
    principal:conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision,encounter:encounter.id,combatant:hash(c),binding:hash(binding),
    npc:hash(npc),target:hash(target),source:hash(source),ruling:hash(ruling),template:hash(template)};
  // Saved pre-feature offers retain their original native input; do not retroactively alter odds.
  const passiveDetails=existingOffer&&!Object.hasOwn(existingOffer,'passives')?[]:
    nativeAttackPassives(db,guild,{npc:input.npc,combatant:c,character:pc.id,encounter,binding,template,library});
  const passives=passiveDetails.map(p=>({proof_ref:`npc-passive:${hash([guild,input.source,input.npc,pc.id,p])}`,modifier:p.modifier,fingerprint:hash(p)}));
  if(passives.length)snapshot.passives=hash(passives);
  const hit_details=committedRoll||existingOffer&&!Object.hasOwn(existingOffer,'hit_features')?[]:
    nativeHitFeatureCandidates(db,guild,{template,combatant:c,input});
  const hit_features=committedRoll?existingOffer?.hit_features||[]:hit_details.map(p=>({ref:`hit-feature:${hash([guild,input.source,input.npc,pc.id,p])}`,fingerprint:hash(p)}));
  if(hit_features.length)snapshot.hit_features=hash(hit_features);
  const native_conditions=existingOffer&&!Object.hasOwn(existingOffer,'native_conditions')?[]:
    committedRoll?existingOffer?.native_conditions||[]:nativeIncomingConditions(db,guild,pc.id);
  if(native_conditions.length)snapshot.native_conditions=hash(native_conditions);
  const damage_detail=existingOffer&&!Object.hasOwn(existingOffer,'damage_passive')?null:
    nativeStandardDamage({template,combatant:c,damage:standard[3],actor:input.npc,target:pc.id,conditions:native_conditions});
  const damage_passive=damage_detail?{ref:`damage-passive:${hash([guild,input.source,input.npc,pc.id,damage_detail])}`,fingerprint:hash(damage_detail)}:null;
  if(damage_passive)snapshot.damage_passive=hash(damage_passive);
  return {pc,snapshot,damage:damage_detail?.expression||standard[3],damage_type:standard[4],bonus:Number(template.attack)+passives.reduce((sum,p)=>sum+p.modifier,0),evasion,major,severe,defenses,
    ...(native_conditions.length?{native_conditions}:{}),
    ...(damage_passive?{damage_passive,damage_detail}:{}),
    ...(passives.length?{passives,passive_details:passiveDetails,base_bonus:Number(template.attack)}:{}),...(hit_features.length?{hit_features,hit_details}:{})};
}
/** Legality inspection alone grants no execution, ruling, encounter activation or dice. */
export function inspectIncomingCandidate(db,guild,input,{library}={}){return facts(db,guild,input,library,INSPECT_ONLY);}
/** One explicitly authored feature, never a generic multi-target permission. */
export function inspectVolleyCandidate(db,guild,origin,entry,p,feature,{library,opportunity}={}){
  if(feature.feature_key!==VOLLEY||feature.native_handler!=='coordinated_volley'||entry.actor.type!=='npc'||entry.operation!=='attack'
    ||p.disposition!=='gm_attack_roll'||p.stakes_kind!=='native_attack'||!p.rule_basis_refs.includes('srd:adversary-attacks')
    ||p.difficulty!==null||p.trait!==null||p.experience_ref||p.advantage||p.disadvantage||!p.stakes.trim()||p.proposal_version===2
    ||entry.target_refs.length<1||entry.target_refs.length>3||new Set(entry.target_refs).size!==entry.target_refs.length)fail('Exact Coordinated Volley action, targets and stakes required.');
  const encounter=db.getCurrentEncounter(origin.binding.session),binding=encounter&&db.getCityRecord(guild,'encounter_binding',encounter.id),
    combatant=binding?.data.combatants.find(c=>c.actor===entry.actor.key)?.id;
  const inputs=entry.target_refs.map(character=>{
    if(origin.scope.mode==='private'&&character!==origin.scope.actorCharacterId)fail('Private attack cannot select another recipient.');
    const input={npc:entry.actor.key,combatant,character,source:origin.binding.source,ruling:'',defenses:{resistance:'none',armor_reduction:1,armor_allowed:true,source:'base'}},
      c=facts(db,guild,input,library,INSPECT_ONLY);
    if(c.native_conditions?.length)fail('Target-specific condition odds require a qualified shared-roll policy; no silent waiver.');
    if(c.snapshot.template!==feature.template_hash)fail('Volley template source changed.');return input;
  });
  return {operation:'commit_adversary_volley',inputs,opportunity,template_hash:feature.template_hash,feature:VOLLEY,feature_hash:hash(feature)};
}
/** Parent operation plus existing character-private child offers; no attack dice or Fear spent here. */
export function prepareArbitratedVolley(db,guild,decisionKey,{library}={}){
  return db.transaction(()=>{
    const key=`npc-volley:${hash(decisionKey)}`,saved=db.getCityRecord(guild,'npc_volley_attack',key);
    if(saved?.data.roll)return inspectVolley(db,guild,key).row;
    const {row}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native;
    if(row.status!=='gm_action_ready'||n?.operation!=='commit_adversary_volley'||n.feature!==VOLLEY)fail('Native Volley ruling required.');
    const prior=db.getCityRecord(guild,'npc_volley_attack',key);if(prior){inspectVolley(db,guild,key);return prior;}
    const children=n.inputs.map(input=>prepareIncomingAttack(db,guild,'native:unified-gm',{...input,source:row.source_event,ruling:`ai-decision:${decisionKey}`},
      {gm:NATIVE_AI_ATTACK,interactionId:decisionKey,library,sharedAttack:key}));
    const feature_definition=compileNativeFeatures().find(f=>f.feature_key===VOLLEY);
    if(hash(feature_definition)!==n.feature_hash)fail('Volley descriptor changed before preparation.');
    const offer={version:1,decision:decisionKey,feature:VOLLEY,feature_hash:n.feature_hash,feature_definition,template_hash:n.template_hash,
      targets:children.map(c=>({character:c.subject_key,attack:c.record_key,offer_hash:hash(c.data.offer)}))};
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_volley_offer',source_id:'native:unified-gm',
      title:'Native shared attack with independent target ownership',session_id:row.data.origin.session,scene:row.data.origin.scene,visibility:'gm',details:offer},'native:unified-gm');
    return db.saveCityRecord(guild,{kind:'npc_volley_attack',key,status:'awaiting_defense',source_event:source.event_key,visibility:'gm',data:{offer,targets:offer.targets}});
  });
}
/** Read-only parent proof. Historical provenance never grants a new roll; unexecuted operations use current authority. */
export function inspectVolley(db,guild,key){
  const row=db.getCityRecord(guild,'npc_volley_attack',key),o=row?.data.offer,source=row&&db.getWorldEvent(guild,row.source_event),
    result=row?.data.roll&&db.getCityRecord(guild,'npc_volley_roll_receipt',row.data.roll);
  if(row?.visibility!=='gm'||o?.version!==1||o.feature!==VOLLEY||key!==`npc-volley:${hash(o.decision)}`
    ||source?.status!=='active'||source.kind!=='native_volley_offer'||source.source_id!=='native:unified-gm'||hash(source.details)!==hash(o)
    ||hash(row.data.targets)!==hash(o.targets))fail('Immutable native Volley offer required.');
  const {row:decision}=result?inspectCommittedGmDecision(db,guild,o.decision):inspectNativeGmDecision(db,guild,o.decision),n=decision.data.native;
  if(n?.operation!=='commit_adversary_volley'||n.feature!==o.feature||n.feature_hash!==o.feature_hash||hash(o.feature_definition)!==o.feature_hash
    ||o.feature_definition.native_handler!=='coordinated_volley'||o.feature_definition.feature_key!==VOLLEY
    ||!result&&hash(compileNativeFeatures().find(f=>f.feature_key===VOLLEY))!==o.feature_hash
    ||n.template_hash!==o.template_hash||o.targets.length!==n.inputs.length||o.targets.length<1||o.targets.length>3)fail('Volley feature or targets changed.');
  const children=o.targets.map((target,i)=>{
    const child=db.getCityRecord(guild,'pc_incoming_attack',target.attack),input=n.inputs[i];
    if(!child||target.character!==input.character||target.character!==child.subject_key||target.offer_hash!==hash(child.data.offer)
      ||child.data.offer.shared_attack!==key||hash(child.data.offer.input)!==hash({...input,source:decision.source_event,ruling:`ai-decision:${decision.record_key}`}))fail('Volley child identity changed.');
    return child;
  });
  if(!result){if(row.data.roll)fail('Volley roll receipt missing.');return {row,decision,children,result:null};}
  const {roll:rollId,damage_roll:damageId,...payload}=result.data,roll=db.getSavedRoll(guild,rollId),damageRoll=damageId&&db.getSavedRoll(guild,damageId),
    sealed=db.getWorldEvent(guild,result.source_event),cost=db.getCityRecord(guild,'gm_action_cost_receipt',payload.cost_ref),first=children[0].data.offer;
  if(row.data.roll!==`${key}:roll`||result.record_key!==row.data.roll||result.visibility!=='gm'||result.status!=='resolved'
    ||sealed?.status!=='active'||sealed.kind!=='native_volley_result'||sealed.source_id!=='native:unified-gm'||sealed.details.payload_hash!==hash(result.data)
    ||roll?.roll_type!=='npc_incoming_volley'||roll.character_id!==null||roll.session_id!==first.snapshot.session||hash(roll.payload)!==hash(payload)
    ||payload.attack!==key||payload.offer_hash!==hash(o)||payload.gm_decision!==decision.record_key
    ||cost?.status!=='committed'||cost.source_event!==decision.source_event||cost.data.decision!==decision.record_key
    ||cost.data.before-cost.data.after!==cost.data.amount||hash(cost)!==payload.cost_hash)fail('Saved shared roll and cost ancestry required.');
  let i=0;const expected=gmD20Roll({kind:'attack',modifier:first.bonus,difficulty:Math.min(...children.map(c=>c.data.offer.evasion)),
    advantage:decision.data.proposal.advantage,disadvantage:decision.data.proposal.disadvantage},()=>payload.gm_d20?.faces[i++]);
  if(hash(expected)!==hash(payload.gm_d20)||children.some(c=>c.data.offer.bonus!==first.bonus||c.data.offer.damage!==first.damage)
    ||payload.hits.length!==children.length||payload.hits.some((t,j)=>t.character!==children[j].subject_key||t.evasion!==children[j].data.offer.evasion
      ||t.hit!==(expected.selected===20||expected.total>=t.evasion)))fail('Shared attack arithmetic or Evasions changed.');
  const hit=payload.hits.some(t=>t.hit);let k=0;
  const expectedDamage=gmAttackDamage({...expected,success:hit},first.damage,()=>payload.damage?.dice[k++]);
  if(hash(expectedDamage)!==hash(payload.damage)||hit&&(!damageRoll||damageRoll.roll_type!=='npc_incoming_volley_damage'
    ||damageRoll.character_id!==null||damageRoll.session_id!==first.snapshot.session||hash(damageRoll.payload)!==hash({attack:key,attack_roll:rollId,damage:payload.damage}))
    ||!hit&&damageId!==null)fail('Shared damage ancestry or critical arithmetic required.');
  return {row,decision,children,result};
}
function incomingSourceAuthority(db,guild,source,offer){
  if(offer.shared_attack){
    const parent=inspectVolley(db,guild,offer.shared_attack);
    return offer.gm==='native:unified-gm'&&source.source_id==='native:unified-gm'&&offer.input.source===parent.decision.source_event
      &&parent.children.some(c=>hash(c.data.offer)===hash(offer));
  }
  if(offer.input.ruling?.startsWith('ai-decision:')){
    const {row}=inspectNativeGmDecision(db,guild,offer.input.ruling.slice(12));
    return offer.gm==='native:unified-gm'&&source.source_id==='native:unified-gm'&&offer.input.source===row.source_event;
  }
  return source.source_id===`gm:${offer.gm}`&&db.ownerAuthoredSource(guild,source.event_key,offer.gm);
}
function context(db,guild,key,library,{applied=false}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),source=row&&db.getWorldEvent(guild,row.source_event);
  if(row?.data.version!==1||row.visibility!=="character"||source?.status!=="active"||source.kind!=="native_npc_attack_offer"
    ||hash(source.details)!==hash(row.data.offer)||!incomingSourceAuthority(db,guild,source,row.data.offer))fail("Exact native incoming attack source required.");
  const o=row.data.offer,shared=o.shared_attack&&inspectVolley(db,guild,o.shared_attack);
  // Once the shared attack is committed, an unrelated target's response/state cannot freeze this owner.
  // Revalidate this child's own PC, principal, position and immutable native outcome instead.
  const pc=shared?.result&&db.getCharacter(o.input.character),target=pc&&scenePresence(db,guild,'character',pc.id),scene=currentScene(db,guild);
  if(pc&&(scene.session_id!==o.snapshot.session||scene.key!==o.snapshot.scene||hash(target)!==o.snapshot.target
    ||db.getWorldEvent(guild,target?.source_event)?.status!=='active'||!applied&&hash(pc.data)!==o.snapshot.pc))fail('Volley target state changed; own native review required.');
  const actual=pc?{pc,snapshot:{...o.snapshot,principal:conversationPrincipal(db,guild,pc.owner_user_id,pc.id).revision},
    damage:o.damage,damage_type:o.damage_type,bonus:o.bonus,evasion:o.evasion,major:o.major,severe:o.severe,defenses:o.input.defenses}
    :facts(db,guild,o.input,library,null,o,!!row.data.roll);
  passiveProof(db,guild,row);
  if(actual.pc.owner_user_id!==row.data.offer.snapshot.owner||actual.snapshot.principal!==row.data.offer.snapshot.principal)
    fail("Incoming attack owner/principal changed; native review required.");
  if(!applied&&row.data.roll&&!o.shared_attack&&o.input.ruling?.startsWith('ai-decision:')&&actual.snapshot.pc!==o.snapshot.pc){
    const roll=verifyRoll(db,guild,row),cost=db.getCityRecord(guild,'gm_action_cost_receipt',roll.data.cost_ref);
    if(cost?.data.decision!==o.input.ruling.slice(12)||!nativeAttackExpiryRevision(db,guild,row.subject_key,o.snapshot.pc,actual.snapshot.pc,cost.record_key))
      fail('Incoming PC state changed outside this native condition expiration.');
    actual.snapshot.pc=o.snapshot.pc;
  }
  if(!applied&&hash(actual.snapshot)!==hash(row.data.offer.snapshot))fail("Native attack source/scene/target compare-and-set is stale.");
  return {row,...actual};
}
/** Read-only live offer authorization; still no GM turn, dice, target consent or damage is created. */
export function authorizeIncomingOffer(db,guild,key,{library}={}){return context(db,guild,key,library);}
/** A saved human ruling reviews applicability of the template and defense features; it cannot invent dice. */
export function prepareIncomingAttack(db,guild,user,input,options={}){
  gmOnly(user,options);
  if(!options.interactionId||!input||Object.keys(input).some(k=>!["npc","combatant","character","source","ruling","defenses"].includes(k)))fail("Closed native attack offer required.");
  if(input.ruling?.startsWith('ai-decision:')&&options.gm!==NATIVE_AI_ATTACK)fail('Only the native AI-GM adapter may bind this decision.');
  const actual=facts(db,guild,input,options.library),offer={version:1,gm:user,input,snapshot:actual.snapshot,
    damage:actual.damage,damage_type:actual.damage_type,bonus:actual.bonus,evasion:actual.evasion,major:actual.major,severe:actual.severe,
    ...(actual.passives?{passives:actual.passives,base_bonus:actual.base_bonus}:{}),...(actual.hit_features?{hit_features:actual.hit_features}:{}),
    ...(actual.damage_passive?{damage_passive:actual.damage_passive}:{}),...(options.gm===NATIVE_AI_ATTACK&&options.sharedAttack?{shared_attack:options.sharedAttack}:{})};
  if(actual.native_conditions)offer.native_conditions=actual.native_conditions;
  return db.transaction(()=>{
    const key=`npc-incoming:${hash([guild,input.source,input.npc,input.combatant,input.character])}`,prior=db.getCityRecord(guild,"pc_incoming_attack",key);
    if(prior){if(hash(prior.data.offer)!==hash(offer))fail("Native attack offer identity reused.");return prior;}
    const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"native_npc_attack_offer",title:"Native standard attack awaiting defense review",
      source_id:options.gm===NATIVE_AI_ATTACK?'native:unified-gm':`gm:${user}`,session_id:actual.snapshot.session,scene:actual.snapshot.scene,visibility:"character",subject_key:actual.pc.id,details:offer},user);
    for(const [i,proof] of (actual.passive_details||[]).entries())db.saveCityRecord(guild,{kind:'npc_passive_proof',key:actual.passives[i].proof_ref,
      status:'verified',source_event:source.event_key,visibility:'gm',data:{attack:key,proof}});
    for(const [i,proof] of (actual.hit_details||[]).entries())db.saveCityRecord(guild,{kind:'npc_hit_feature_proof',key:actual.hit_features[i].ref,
      status:'verified',source_event:source.event_key,visibility:'gm',data:{attack:key,proof}});
    if(actual.damage_detail)db.saveCityRecord(guild,{kind:'npc_damage_passive_proof',key:actual.damage_passive.ref,
      status:'verified',source_event:source.event_key,visibility:'gm',data:{attack:key,proof:actual.damage_detail}});
    return db.saveCityRecord(guild,{kind:"pc_incoming_attack",key,status:"awaiting_defense",source_event:source.event_key,
      visibility:"character",subject_key:actual.pc.id,data:{version:1,offer}});
  });
}
export function prepareArbitratedIncomingAttack(db,guild,decisionKey,{library}={}){
  const {row}=inspectNativeGmDecision(db,guild,decisionKey),n=row.data.native;
  if(row.status!=='gm_action_ready'||n?.operation!=='commit_adversary_attack')fail('Native standard attack decision required.');
  return prepareIncomingAttack(db,guild,'native:unified-gm',{...n.input,source:row.source_event,ruling:`ai-decision:${row.record_key}`},
    {gm:NATIVE_AI_ATTACK,interactionId:row.record_key,library});
}
/** Owner confirms base defenses only. Applicable optional features require their own reviewed native route instead. */
export function reviewIncomingAttack(db,guild,user,key,{library}={}){
  const {row,pc,...c}=context(db,guild,key,library);
  personalCharacter(db,guild,user,pc.id);
  if(row.status==='hold_for_owner')db.saveCityRecord(guild,{...row,key,status:'awaiting_defense'});
  db.saveCityRecord(guild,{kind:"pc_incoming_review",key:`${key}:review`,status:"reviewed",source_event:row.source_event,
    visibility:"character",subject_key:pc.id,data:{owner:user,offer_hash:hash(row.data.offer)}});
  return {attack:key,status:row.status==='hold_for_owner'?'awaiting_defense':row.status,character:pc.id,evasion:c.evasion,major:c.major,severe:c.severe,
    damage:c.damage,damage_type:c.damage_type,attack_bonus:c.bonus,defenses:row.data.offer.input.defenses,
    instruction:"Confirm only after reviewing applicable defenses. Unsupported defense features hold the attack for human ruling. Armor is your own later choice; last HP never chooses a death move."};
}
/** Affected owner may leave only their own unresolved workflow pending; silence is not a failed defense. */
export function withholdIncomingDefense(db,guild,user,key,{library,interactionId}={}){
  return db.transaction(()=>{
    const {row,pc}=context(db,guild,key,library);personalCharacter(db,guild,user,pc.id);
    if(!interactionId||!row.data.offer.shared_attack||!['awaiting_defense','ready','awaiting_armor','hold_for_owner'].includes(row.status))fail('Exact owned unresolved Volley required.');
    const source=indexWorldEvent(db,guild,{key:`${key}:withhold:${hash(interactionId)}`,kind:'native_incoming_withheld',source_id:`player:${user}`,
      session_id:row.data.offer.snapshot.session,scene:row.data.offer.snapshot.scene,visibility:'character',subject_key:pc.id,
      title:'Owner leaves incoming defense pending',details:{author:user,attack:key,offer_hash:hash(row.data.offer),interaction:interactionId}},user);
    if(source.status!=='active')fail('Withheld source revoked.');
    return db.saveCityRecord(guild,{...row,key,status:'hold_for_owner',data:{...row.data,withheld:source.event_key}});
  });
}
export function confirmIncomingDefense(db,guild,user,key){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),o=row?.data.offer,pc=o&&personalCharacter(db,guild,user,o.input.character);
  if(!pc||pc.owner_user_id!==o.snapshot.owner||hash(pc.data)!==o.snapshot.pc||row.status!=="awaiting_defense")fail("Current affected owner defense review required.");
  const review=db.getCityRecord(guild,"pc_incoming_review",`${key}:review`);
  if(review?.data.owner!==user||review.data.offer_hash!==hash(o)||review.source_event!==row.source_event
    ||review.visibility!=="character"||review.subject_key!==pc.id)fail("Privately review exact incoming defenses before confirming.");
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:`${key}:defense`,kind:"incoming_defense_choice",title:"Owner confirms reviewed base defenses",
      source_id:`player:${user}`,session_id:o.snapshot.session,scene:o.snapshot.scene,visibility:"character",subject_key:pc.id,
      details:{author:user,attack:key,offer_hash:hash(o),principal:o.snapshot.principal}},user);
    if(source.status!=="active")fail("Defense choice revoked.");
    return db.saveCityRecord(guild,{...row,key,status:"ready",data:{...row.data,defense:source.event_key}});
  });
}
function defenseProof(db,guild,row){
  const choice=db.getWorldEvent(guild,row.data.defense),o=row.data.offer;
  if(choice?.status!=="active"||choice.kind!=="incoming_defense_choice"||choice.details.attack!==row.record_key
    ||choice.visibility!=="character"||choice.subject_key!==row.subject_key||choice.source_id!==`player:${o.snapshot.owner}`
    ||choice.details.author!==o.snapshot.owner||choice.details.principal!==o.snapshot.principal
    ||choice.session_id!==o.snapshot.session||choice.scene!==o.snapshot.scene
    ||choice.details.offer_hash!==hash(o)||!db.ownerAuthoredSource(guild,choice.event_key,o.snapshot.owner))fail("Current exact owner defense choice required.");
}
export function rollIncomingAttack(db,guild,user,key,options={}){
  gmOnly(user,options);
  return db.transaction(()=>{
    if(db.getCityRecord(guild,'pc_incoming_attack',key)?.data.offer.shared_attack)fail('Shared Volley requires its single native executor, never a target-specific GM roll.');
    const c=context(db,guild,key,options.library),{row}=c;defenseProof(db,guild,row);
    if(row.data.roll)return verifyRoll(db,guild,row);
    if(row.status!=="ready")fail("Native attack is not ready.");
    assertFearIncomingExecution(db,guild,row,{autonomous:options.gm===AUTONOMOUS_FEAR_ATTACK});
    let nativeDecision=null,cost=null;
    if(row.data.offer.input.ruling?.startsWith('ai-decision:')){
      if(options.gm!==NATIVE_AI_ATTACK)fail('Native AI-GM executor required; owner defense never grants a GM role.');
      nativeDecision=inspectNativeGmDecision(db,guild,row.data.offer.input.ruling.slice(12)).row;
      cost=commitGmActionCost(db,guild,nativeDecision.record_key);
    }
    validateIncomingConditions(db,guild,c.pc.id,row.data.offer.native_conditions||[]);
    const rng=options.rng||d,result=gmD20Roll({kind:'attack',modifier:c.bonus,difficulty:c.evasion,
      ...incomingConditionOdds(row.data.offer,nativeDecision?.data.proposal)},rng),face=result.selected;
    const hit=result.success,damage=gmAttackDamage(result,c.damage,rng);
    const payload={attack:key,face,bonus:c.bonus,total:face+c.bonus,evasion:c.evasion,hit,damage,type:c.damage_type,offer_hash:hash(row.data.offer),
      ...(nativeDecision?{gm_decision:nativeDecision.record_key,gm_d20:result,cost_ref:cost.record_key}:row.data.offer.native_conditions?{gm_d20:result}: {})};
    const roll=db.addRoll(guild,c.snapshot.session,user,c.pc.id,"npc_incoming_standard",payload);
    const receipt=db.saveCityRecord(guild,{kind:"npc_attack_roll_receipt",key:`${key}:roll`,status:"resolved",source_event:row.source_event,
      visibility:"character",subject_key:c.pc.id,data:{...payload,roll}});
    db.saveCityRecord(guild,{...row,key,status:hit?"awaiting_armor":"missed",data:{...row.data,roll:receipt.record_key}});return receipt;
  });
}
/** No human identity/approval is forged. Current native GM ruling, spotlight and defense authorize this executor. */
export function rollArbitratedIncomingAttack(db,guild,key,{library,rng}={}){
  if(db.getCityRecord(guild,'pc_incoming_attack',key)?.data.offer.shared_attack)return rollVolley(db,guild,key,{library,rng});
  const c=context(db,guild,key,library);
  if(!c.row.data.offer.input.ruling?.startsWith('ai-decision:'))fail('Native AI-GM decision required.');
  return rollIncomingAttack(db,guild,'native:unified-gm',key,{gm:NATIVE_AI_ATTACK,library,rng});
}
function volleyChildPayload(parent,child){
  const r=parent.result.data,o=child.data.offer,t=r.hits.find(t=>t.character===child.subject_key);
  return {attack:child.record_key,face:r.gm_d20.selected,bonus:o.bonus,total:r.gm_d20.total,evasion:o.evasion,hit:t.hit,
    damage:t.hit?r.damage:null,type:o.damage_type,offer_hash:hash(o),gm_decision:r.gm_decision,cost_ref:r.cost_ref,
    gm_d20_faces:r.gm_d20.faces,shared_attack:parent.row.record_key,shared_receipt:parent.result.record_key,shared_hash:hash(parent.result.data)};
}
/** The first entitled defense confirmation executes once. Other owners remain pending, never failed by silence. */
function rollVolley(db,guild,key,{library,rng=d}={}){
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,'pc_incoming_attack',key);
    if(prior?.data.roll&&['resolved','missed'].includes(prior.status)){
      incomingAttackEvidence(db,guild,key,{terminal:true});return verifyRoll(db,guild,prior);
    }
    let c=context(db,guild,key,library),parent=inspectVolley(db,guild,c.row.data.offer.shared_attack);
    defenseProof(db,guild,c.row);
    if(c.row.status!=='ready'){
      if(c.row.data.roll&&['awaiting_armor','resolved','missed'].includes(c.row.status))return verifyRoll(db,guild,c.row);
      fail('This target has not confirmed its own defenses.');
    }
    if(!parent.result){
      // All selected target/range/source snapshots are checked BEFORE the one cost and RNG.
      const current=parent.children.map(child=>context(db,guild,child.record_key,library)),first=current[0];
      if(current.some(t=>t.bonus!==first.bonus||t.damage!==first.damage))fail('Unsupported target-specific pre-roll modifiers require review.');
      const cost=commitGmActionCost(db,guild,parent.decision.record_key),p=parent.decision.data.proposal,
        result=gmD20Roll({kind:'attack',modifier:first.bonus,difficulty:Math.min(...current.map(t=>t.evasion)),advantage:p.advantage,disadvantage:p.disadvantage},rng),
        hits=current.map(t=>({character:t.pc.id,evasion:t.evasion,hit:result.selected===20||result.total>=t.evasion})),
        damage=gmAttackDamage({...result,success:hits.some(t=>t.hit)},first.damage,rng),
        payload={attack:parent.row.record_key,offer_hash:hash(parent.row.data.offer),gm_decision:parent.decision.record_key,
          gm_d20:result,hits,damage,cost_ref:cost.record_key,cost_hash:hash(cost)};
      const roll=db.addRoll(guild,first.snapshot.session,'native:unified-gm',null,'npc_incoming_volley',payload),
        damage_roll=damage?db.addRoll(guild,first.snapshot.session,'native:unified-gm',null,'npc_incoming_volley_damage',{attack:parent.row.record_key,attack_roll:roll,damage}):null,
        data={...payload,roll,damage_roll};
      const source=indexWorldEvent(db,guild,{key:`${parent.row.record_key}:result-source`,kind:'native_volley_result',source_id:'native:unified-gm',
        session_id:first.snapshot.session,scene:first.snapshot.scene,title:'Committed native shared attack and damage',visibility:'gm',details:{payload_hash:hash(data)}},'native:unified-gm');
      const saved=db.saveCityRecord(guild,{kind:'npc_volley_roll_receipt',key:`${parent.row.record_key}:roll`,status:'resolved',source_event:source.event_key,visibility:'gm',data});
      db.saveCityRecord(guild,{...parent.row,key:parent.row.record_key,status:'rolled',data:{...parent.row.data,roll:saved.record_key}});
      parent=inspectVolley(db,guild,parent.row.record_key);
      for(const child of parent.children){
        const v=volleyChildPayload(parent,child),receipt=db.saveCityRecord(guild,{kind:'npc_attack_roll_receipt',key:`${child.record_key}:roll`,
          status:'resolved',source_event:child.source_event,visibility:'character',subject_key:child.subject_key,data:{...v,roll}});
        db.saveCityRecord(guild,{...child,key:child.record_key,status:child.status==='ready'?(v.hit?'awaiting_armor':'missed'):child.status,
          data:{...child.data,roll:receipt.record_key}});
      }
    }else{
      const r=verifyRoll(db,guild,c.row);
      db.saveCityRecord(guild,{...c.row,key,status:r.data.hit?'awaiting_armor':'missed'});
    }
    settleVolley(db,guild,c.row.data.offer.shared_attack);
    return verifyRoll(db,guild,db.getCityRecord(guild,'pc_incoming_attack',key));
  });
}
function settleVolley(db,guild,key){
  if(!key)return;
  const p=inspectVolley(db,guild,key);
  if(p.result)db.saveCityRecord(guild,{...p.row,key,status:p.children.every(c=>['resolved','missed'].includes(c.status))?'resolved':'rolled'});
}
/** Internal automation verifies the exact selected Fear decision; a caller flag is never authority. */
export function rollAutonomousFearIncomingAttack(db,guild,key,{library,rng}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key);
  assertFearIncomingExecution(db,guild,row,{autonomous:true,committedRoll:!!row?.data.roll});
  return rollIncomingAttack(db,guild,"autonomous_pvp_fear",key,{gm:AUTONOMOUS_FEAR_ATTACK,library,rng});
}
function verifyRoll(db,guild,row){
  passiveProof(db,guild,row);
  if(row.data.offer.shared_attack){
    const parent=inspectVolley(db,guild,row.data.offer.shared_attack),r=db.getCityRecord(guild,'npc_attack_roll_receipt',row.data.roll);
    if(!parent.result||r?.status!=='resolved'||r.visibility!=='character'||r.source_event!==row.source_event||r.subject_key!==row.subject_key
      ||r.record_key!==`${row.record_key}:roll`||hash(r.data)!==hash({...volleyChildPayload(parent,row),roll:parent.result.data.roll}))fail('Shared native target roll ancestry required.');
    return r;
  }
  const r=db.getCityRecord(guild,"npc_attack_roll_receipt",row.data.roll),roll=r&&db.getSavedRoll(guild,r.data.roll),{roll:ignored,...payload}=r?.data||{};
  if(r?.status!=="resolved"||r.source_event!==row.source_event||r.subject_key!==row.subject_key
    ||roll?.roll_type!=="npc_incoming_standard"||roll.character_id!==row.subject_key||roll.session_id!==row.data.offer.snapshot.session
    ||hash(roll.payload)!==hash(payload)||payload.offer_hash!==hash(row.data.offer)||payload.attack!==row.record_key)fail("Saved native attack/damage roll ancestry required.");
  return r;
}
function passiveProof(db,guild,row){
  const o=row.data.offer;
  if(o.native_conditions)validateIncomingConditions(db,guild,row.subject_key,o.native_conditions);
  if(o.damage_passive){
    const p=o.damage_passive,record=db.getCityRecord(guild,'npc_damage_passive_proof',p.ref),v=record?.data.proof,
      feature=compileNativeFeatures().find(f=>f.feature_key===v?.feature);
    if(!v||record?.status!=='verified'||record.visibility!=='gm'||record.source_event!==row.source_event||record.data.attack!==row.record_key
      ||!feature||hash(v)!==p.fingerprint||v.feature_hash!==hash(feature)||v.template_hash!==o.snapshot.template
      ||feature.template_hash!==v.template_hash||v.combatant!==o.input.combatant||o.damage!==v.expression
      ||p.ref!==`damage-passive:${hash([guild,o.input.source,o.input.npc,o.input.character,v])}`)fail('Exact native damage passive proof required.');
    if(v.version===2&&feature.native_handler==='sentence_native_vulnerable_damage'){
      if(v.source_hash!==feature.source_hash||v.actor!==o.input.npc||v.target!==o.input.character
        ||hash(v.conditions)!==hash(o.native_conditions||[])||v.bonus!==(v.conditions.length?2:0)
        ||v.expression!==nativeDamageBonusExpression(v.original_damage,v.bonus))fail('Exact native Sentence Carried Out proof required.');
      validateIncomingConditions(db,guild,row.subject_key,v.conditions);
    }else{
      const erratum=nativeHouseErratum('HR11');
      if(feature.native_handler!=='horde_marked_half_damage'||v.erratum!=='HR11'||v.erratum_version!==1||v.erratum_hash!==hash(erratum)
        ||v.expression!==(v.hp.marked_half_or_more?'3d8+8':v.original_damage)
        ||v.hp.marked!==v.hp.max-v.hp.remaining||v.hp.marked_half_or_more!==(v.hp.marked>=Math.ceil(v.hp.max/2)))fail('Exact native Horde damage proof required.');
    }
  }
  if(!o.passives)return;
  if(!Number.isSafeInteger(o.base_bonus)||!Array.isArray(o.passives)||o.passives.length>8||o.bonus!==o.base_bonus+o.passives.reduce((n,p)=>n+p.modifier,0))
    fail('Native passive bonus arithmetic required.');
  for(const p of o.passives){
    const record=db.getCityRecord(guild,'npc_passive_proof',p.proof_ref),v=record?.data.proof;
    if(record?.status!=='verified'||record.visibility!=='gm'||record.source_event!==row.source_event||record.data.attack!==row.record_key
      ||hash(v)!==p.fingerprint||v.modifier!==p.modifier||v.actor!==o.input.npc||v.target!==o.input.character
      ||v.template_hash!==o.snapshot.template||p.proof_ref!==`npc-passive:${hash([guild,o.input.source,o.input.npc,o.input.character,v])}`)
      fail('Exact GM-internal native passive proof required.');
  }
}
/** Read-only current source + immutable GM roll ancestry, usable by receipt-only output adapters. */
export function incomingRollProjection(db,guild,key){
  const {row,offer}=incomingAttackEvidence(db,guild,key),receipt=verifyRoll(db,guild,row),r=receipt.data;
  if(!offer.shared_attack&&offer.input.ruling?.startsWith('ai-decision:')){
    const decision=inspectNativeGmDecision(db,guild,offer.input.ruling.slice(12)).row,cost=db.getCityRecord(guild,'gm_action_cost_receipt',r.cost_ref);
    let i=0;const expected=gmD20Roll({kind:'attack',modifier:offer.bonus,difficulty:offer.evasion,
      ...incomingConditionOdds(offer,decision.data.proposal)},()=>r.gm_d20?.faces[i++]);
    if(r.gm_decision!==decision.record_key||hash(expected)!==hash(r.gm_d20)||expected.selected!==r.face||cost?.status!=='committed'
      ||cost.source_event!==decision.source_event||cost.data.decision!==decision.record_key||cost.data.before-cost.data.after!==cost.data.amount)fail('Exact native GM d20 and pre-roll payment proof required.');
  }
  if(!offer.input.ruling?.startsWith('ai-decision:')&&offer.native_conditions){
    validateIncomingConditions(db,guild,row.subject_key,offer.native_conditions);
    let i=0;const expected=gmD20Roll({kind:'attack',modifier:offer.bonus,difficulty:offer.evasion,...incomingConditionOdds(offer)},()=>r.gm_d20?.faces[i++]);
    if(hash(expected)!==hash(r.gm_d20)||expected.selected!==r.face)fail('Native condition d20 ancestry required.');
  }
  const {count,sides,mod}=diceSpec(offer.damage);
  if(r.face<1||r.face>20||!Number.isSafeInteger(r.face)||r.bonus!==offer.bonus||r.evasion!==offer.evasion
    ||r.total!==r.face+r.bonus||r.hit!==(r.face===20||r.total>=r.evasion)||r.type!==offer.damage_type
    ||!r.hit&&r.damage!==null||r.hit&&(!r.damage||r.damage.expression!==offer.damage||r.damage.modifier!==mod
      ||r.damage.dice.length!==count||r.damage.dice.some(n=>!Number.isSafeInteger(n)||n<1||n>sides)
      ||r.damage.total!==r.damage.dice.reduce((a,b)=>a+b,0)+mod+(r.face===20?count*sides:0)))fail('Verified incoming GM dice arithmetic required.');
  return {row,offer,receipt};
}
/** Read-only immutable offer/outcome proof for a selected immediate GM move; never executes mechanics. */
export function incomingAttackEvidence(db,guild,key,{terminal=false}={}){
  const row=db.getCityRecord(guild,"pc_incoming_attack",key),o=row?.data.offer,source=row&&db.getWorldEvent(guild,row.source_event);
  const original=o&&db.getWorldEvent(guild,o.input.source),scene=currentScene(db,guild),pc=o&&db.getCharacter(o.input.character);
  if(row?.data.version!==1||row.visibility!=="character"||row.subject_key!==o?.input.character||o?.version!==1
    ||source?.status!=="active"||source.kind!=="native_npc_attack_offer"||hash(source.details)!==hash(o)
    ||!incomingSourceAuthority(db,guild,source,o)||original?.status!=="active"||hash(original)!==o.snapshot.source
    ||o.snapshot.session!==scene.session_id||o.snapshot.scene!==scene.key||pc?.guild_id!==guild||pc.owner_user_id!==o.snapshot.owner
    ||historicalOwnerPrincipal(db,guild,o.snapshot.owner,pc.id).revision!==o.snapshot.principal)
    fail("Exact current native incoming offer/source/owner evidence required.");
  if(!terminal)return {row,offer:o};
  if(!["resolved","missed"].includes(row.status)||!row.data.roll)
    throw Object.assign(new Error("Immediate NPC move awaits its native defense, attack or owner Armor workflow."),{code:"NATIVE_EFFECT_PENDING",expected:true});
  defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row),r=roll.data;
  if(!Number.isSafeInteger(r.face)||r.face<1||r.face>20||r.bonus!==o.bonus||r.evasion!==o.evasion||r.total!==r.face+o.bonus
    ||r.hit!==(r.face===20||r.total>=o.evasion)||r.type!==o.damage_type||roll.visibility!=="character")fail("Exact native NPC attack arithmetic/audience required.");
  const effect=r.hit?validateIncomingDamageApplication(db,guild,`${key}:damage`):null;
  if(!r.hit&&(row.status!=="missed"||r.damage!==null)||r.hit&&row.status!=="resolved")fail("Native incoming terminal outcome mismatch.");
  return {row,offer:o,roll,effect};
}
export function resolveIncomingDamage(db,guild,user,key,{armor=false,library}={}){
  return db.transaction(()=>{
    const prior=db.getCityRecord(guild,"pc_effect_receipt",`${key}:damage`);
    if(prior?.data.version===2){const receipt=validateIncomingDamageApplication(db,guild,prior.record_key);
      if(receipt.data.owner!==user||receipt.data.armor!==armor)fail("Native damage receipt owner/decision replay differs.");return receipt;}
    const c=context(db,guild,key,library,{applied:!!prior}),{row,pc}=c;
    personalCharacter(db,guild,user,pc.id);defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row);
    if(prior){if(prior.data.roll!==roll.record_key||prior.data.armor!==armor)fail("Native damage receipt replay differs.");return prior;}
    if(!roll.data.hit||row.status!=="awaiting_armor"||typeof armor!=="boolean")fail("Actual hit and affected owner Armor decision required.");
    assertFearIncomingExecution(db,guild,row,{committedRoll:true});
    const resources=pc.data.resources,hp=resources.hp,slots=resources.armor;
    if(![hp?.current,hp?.max,slots?.current,slots?.max].every(Number.isSafeInteger)||hp.current<0||hp.current>hp.max||hp.max<1||hp.max>12
      ||slots.current<0||slots.current>slots.max||armor&&slots.current===slots.max)fail("Verified available HP and owner-selected Armor Slot required.");
    if(armor&&!c.defenses.armor_allowed)fail("Armor is not applicable to this reviewed damage source.");
    const damage=c.defenses.resistance==="immune"?0:c.defenses.resistance==="half"?Math.ceil(roll.data.damage.total/2):roll.data.damage.total;
    const base=damage<=0?0:damage>=c.severe?3:damage>=c.major?2:1,marks=Math.max(0,base-(armor?c.defenses.armor_reduction:0));
    if(armor&&!base)fail("No positive damage to reduce with Armor.");
    const choice=indexWorldEvent(db,guild,{key:`${key}:armor`,kind:"incoming_armor_owner_choice",title:"Affected owner chooses native incoming Armor",
      source_id:`player:${user}`,session_id:c.snapshot.session,scene:c.snapshot.scene,visibility:"character",subject_key:pc.id,
      details:{author:user,attack:key,offer_hash:hash(row.data.offer),armor,principal:c.snapshot.principal}},user);
    if(choice.status!=="active")fail("Native Armor owner source revoked.");
    db.updateCharacterData(pc.id,data=>{data.resources.hp.current=Math.min(hp.max,hp.current+marks);if(armor)data.resources.armor.current++;
      if(hp.current+marks>=hp.max&&marks>0)data.death_state={request:`${key}:death`,status:"pending_choice"};});
    const after=db.getCharacter(pc.id).data.resources;
    const mutation=db.recordMutation(guild,{sessionId:c.snapshot.session,actorType:"player",actorId:user,sourceLayer:"pc_incoming",mutationType:"verified_npc_attack",
      entityKey:pc.id,visibility:"character",before:resources,after,rationale:"Native NPC standard attack with target-owned Armor.",payload:{attack:key,effect:`${key}:damage`}});
    const material={version:2,cause_type:"verified_npc_attack",roll:roll.record_key,character:pc.id,
      hp_marks:Math.min(marks,hp.max-hp.current),armor,defenses:c.defenses,damage_after_resistance:damage,before:resources,after,
      session:c.snapshot.session,scene:c.snapshot.scene,owner:user,principal:c.snapshot.principal,owner_choice:choice.event_key,mutation:mutation.id};
    const receipt=db.saveCityRecord(guild,{kind:"pc_effect_receipt",key:`${key}:damage`,status:"resolved",source_event:row.source_event,
      visibility:"character",subject_key:pc.id,data:{...material,effect_digest:hash(material)}});
    if(hp.current+marks>=hp.max&&marks>0){const data={version:2,character:pc.id,cause:receipt.record_key,owner:user,principal:c.snapshot.principal,scene:c.snapshot.scene,session:c.snapshot.session,
      authority:"Only the affected owner may select their native SRD death move; no death or narration is automatically chosen."};
      db.saveCityRecord(guild,{kind:"pc_death_move_request",key:`${key}:death`,status:"awaiting_owner",
        source_event:row.source_event,visibility:"character",subject_key:pc.id,data:{...data,digest:hash(data)}});}
    db.saveCityRecord(guild,{...row,key,status:"resolved"});
    settleVolley(db,guild,row.data.offer.shared_attack);
    captureIncomingFeatureWindows(db,guild,receipt.record_key,{library});
    applyManyDeathsAfterIncoming(db,guild,key);
    return receipt;
  });
}

/** Current-source, read-only native injury ancestry. Does not require the injured PC still to be alive or unhealed. */
export function validateIncomingDamageApplication(db,guild,key){
  const receipt=db.getCityRecord(guild,"pc_effect_receipt",key),{effect_digest,...v}=receipt?.data||{},pc=v.character&&db.getCharacter(v.character);
  const row=v.roll&&db.getCityRecord(guild,"pc_incoming_attack",v.roll.replace(/:roll$/u,"")),o=row?.data.offer;
  const source=row&&db.getWorldEvent(guild,row.source_event),original=o&&db.getWorldEvent(guild,o.input.source),scene=currentScene(db,guild);
  if(receipt?.status!=="resolved"||v.version!==2||v.cause_type!=="verified_npc_attack"||hash(v)!==effect_digest||row?.status!=="resolved"
    ||key!==`${row.record_key}:damage`||receipt.visibility!=="character"||receipt.subject_key!==v.character||receipt.source_event!==row.source_event
    ||pc?.guild_id!==guild||pc.owner_user_id!==v.owner||v.owner!==o.snapshot.owner||v.principal!==o.snapshot.principal
    ||historicalOwnerPrincipal(db,guild,v.owner,v.character).revision!==v.principal||v.scene!==scene.key||v.session!==scene.session_id
    ||source?.status!=="active"||source.kind!=="native_npc_attack_offer"||hash(source.details)!==hash(o)
    ||!incomingSourceAuthority(db,guild,source,o)||original?.status!=="active"||hash(original)!==o.snapshot.source)
    fail("Exact current native incoming effect/source/owner ancestry required.");
  defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row),r=roll.data,spec=diceSpec(o.damage),specDamage=r.damage;
  const expectedHit=r.face===20||r.face+o.bonus>=o.evasion;
  if(!Number.isSafeInteger(r.face)||r.face<1||r.face>20||r.bonus!==o.bonus||r.evasion!==o.evasion||r.total!==r.face+o.bonus
    ||r.hit!==expectedHit||!r.hit||r.type!==o.damage_type||specDamage?.expression!==o.damage||specDamage.modifier!==spec.mod
    ||specDamage.dice.length!==spec.count||specDamage.dice.some(n=>!Number.isSafeInteger(n)||n<1||n>spec.sides)
    ||specDamage.total!==specDamage.dice.reduce((a,b)=>a+b,0)+spec.mod+(r.face===20?spec.count*spec.sides:0))fail("Native incoming attack/damage dice arithmetic required.");
  const damage=o.input.defenses.resistance==="immune"?0:o.input.defenses.resistance==="half"?Math.ceil(specDamage.total/2):specDamage.total;
  const severity=damage<=0?0:damage>=o.severe?3:damage>=o.major?2:1;
  const marks=Math.min(Math.max(0,severity-(v.armor?o.input.defenses.armor_reduction:0)),v.before.hp.max-v.before.hp.current),after=structuredClone(v.before);
  after.hp.current+=marks;if(v.armor)after.armor.current++;
  const choice=db.getWorldEvent(guild,v.owner_choice),mutation=db.getMutation(guild,v.mutation);
  if(typeof v.armor!=="boolean"||v.armor&&(!o.input.defenses.armor_allowed||severity===0||v.before.armor.current>=v.before.armor.max)
    ||v.hp_marks!==marks||v.damage_after_resistance!==damage||hash(v.defenses)!==hash(o.input.defenses)||hash(v.after)!==hash(after)
    ||choice?.status!=="active"||choice.kind!=="incoming_armor_owner_choice"||choice.source_id!==`player:${v.owner}`||choice.visibility!=="character"
    ||choice.subject_key!==v.character||choice.details.author!==v.owner||choice.details.principal!==v.principal||choice.details.attack!==row.record_key
    ||choice.details.offer_hash!==hash(o)||choice.details.armor!==v.armor||!db.ownerAuthoredSource(guild,choice.event_key,v.owner)
    ||mutation?.source_layer!=="pc_incoming"||mutation.entity_key!==v.character||hash(JSON.parse(mutation.before_json))!==hash(v.before)
    ||hash(JSON.parse(mutation.after_json))!==hash(v.after))fail("Exact incoming Armor owner choice and atomic native damage mutation required.");
  return receipt;
}

/** Read-only injury evidence. No reroll, effect application, or public disclosure is implied. */
export function visibleIncomingInjury(db,guild,id,character){
  const receipt=typeof id==="string"&&db.getCityRecord(guild,"pc_effect_receipt",id),d=receipt?.data;
  const row=d&&db.getCityRecord(guild,"pc_incoming_attack",d.roll?.replace(/:roll$/u,""));
  const source=row&&db.getWorldEvent(guild,row.source_event),o=row?.data.offer,pc=db.getCharacter(character),scene=currentScene(db,guild);
  if(receipt?.status!=="resolved"||receipt.subject_key!==character||d.character!==character||d.cause_type!=="verified_npc_attack"
    ||row?.status!=="resolved"||id!==`${row.record_key}:damage`||receipt.source_event!==row.source_event
    ||source?.status!=="active"||source.kind!=="native_npc_attack_offer"||hash(source.details)!==hash(o)
    ||db.getWorldEvent(guild,o.input.source)?.status!=="active"||d.session!==scene.session_id||d.scene!==scene.key
    ||pc?.guild_id!==guild||pc.owner_user_id!==d.owner||d.owner!==o.snapshot.owner
    ||conversationPrincipal(db,guild,d.owner,character).revision!==o.snapshot.principal
    ||!Number.isSafeInteger(d.hp_marks)||d.hp_marks<=0||d.after.hp.current-d.before.hp.current!==d.hp_marks
    ||pc.data.resources?.hp?.current!==d.after.hp.current||pc.data.resources.hp.current<=0)
    fail("Current native injury receipt required; sheet marks and prose are not visible condition evidence.");
  defenseProof(db,guild,row);const roll=verifyRoll(db,guild,row);
  if(roll.record_key!==d.roll||!roll.data.hit)fail("Native injury roll ancestry required.");
  // HP counts can return to an old value after healing and a different private injury. That is not fresh disclosure.
  const latest=db.latestPcHpEffect(guild,character);
  if(latest?.record_key!==id)fail("Visible injury disclosure is superseded by a later native HP effect.");
  return receipt;
}
