/** Native group opportunities and target locks. Coordination never supplies dice, consent or damage. */
import {createHash} from "node:crypto";
import {openActionWindow} from "./scene-action-window.js";
import {indexWorldEvent} from "./city-calendar.js";
import {validateDamagePvp} from "./pvp-profiles.js";
import {personalCharacter} from "./personal-continuity.js";
import {conversationPrincipal} from "./conversation-principal.js";
import {validatePvpAttackRoll,attackReviewAuthority} from "./pvp-attacks.js";
import {blazeActionAuthorization} from "./pc-death.js";
import {assertPvpSafety,pvpSafetyStatus} from './pvp-campaign-policy.js';
import {validateCampaignPvp} from './pvp-campaign-execution.js';
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const terminal=new Set(["missed","resolved","cancelled"]);
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function inventory(db,guild,kind){const out=[];for(let offset=0;offset<10000;offset+=100){
  const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);if(page.length<100)return out;
}fail("Brawl inventory exceeded safe recovery bound.");}
const lockKey=o=>`pvp-target:${hash([o.session,o.scene,o.target])}`;
const opportunityKey=attack=>`${attack}:opportunity`;
function grouping(contract){
  if(contract.data.version!==4)return {ref:contract.record_key,hash:contract.data.terms_hash};
  const s=contract.data.snapshot;if(!s)return {ref:null,hash:null};
  const ref=`campaign-conflict:${hash([s.guild,s.session_id,s.scene,s.location_key,s.policy_revision])}`;
  return {ref,hash:hash([ref,s.policy_revision])};
}
const groupMatches=(window,o)=>o.brawl?.group_ref
  ?window.group_ref===o.brawl.group_ref&&window.group_hash===o.brawl.group_hash
  :window.contract===o.contract&&window.terms_hash===o.terms_hash;
function campaignMembers(db,guild,ctx){
  if(ctx.contract.data.version!==4)return ctx.participants;
  const g=grouping(ctx.contract),members=new Map();
  for(const row of inventory(db,guild,'pvp_encounter_contract')){
    if(row.data.version!==4||grouping(row).ref!==g.ref)continue;
    try{
      const actual=validateCampaignPvp(db,guild,row.record_key,{committed:true});
      for(const member of actual.participants)members.set(member.character,member);
    }catch(error){if(!['NARRATIVE_PVP','SCENE_ACTION_WINDOW'].includes(error.code))throw error;}
  }
  return [...members.values()];
}
function currentParticipant(db,guild,id){
  try{assertPvpSafety(db,guild,[id]);return true;}
  catch(error){if(error.pvpSafetyHold)return false;throw error;}
}
function opportunitySource(db,guild,source,offer,binding){
  if(offer.authority!=='native_campaign')return source.source_id===`gm:${offer.reviewer}`&&db.ownerAuthoredSource(guild,source.event_key,offer.reviewer);
  const m=source.source_kind==='mutation'&&db.getMutation(guild,source.source_id);let after;
  try{after=JSON.parse(m?.after_json||'null');}catch{return false;}
  return m?.actor_type==='system'&&m.actor_id==='campaign_pvp'&&m.source_layer==='pvp_campaign'
    &&m.mutation_type==='campaign_spotlight_reservation'&&m.entity_key===binding.attack&&m.visibility==='gm'
    &&m.session_id===offer.session&&hash(after)===hash(binding);
}
function proof(db,guild,row){
  const o=row?.data.offer,opp=o&&db.getCityRecord(guild,"pvp_spotlight_opportunity",opportunityKey(row.record_key));
  const s=row&&db.getWorldEvent(guild,row.source_event),w=opp&&db.getCityRecord(guild,"scene_action_window",opp.data.window);
  const reservation=opp&&db.getWorldEvent(guild,opp.source_event),{roll:usedRoll,...binding}=opp?.data||{};
  if(!o?.brawl||!opp||opp.visibility!=="gm"||opp.source_event!==`${opp.record_key}:source`||opp.actor_key!==o.actor
    ||opp.data.version!==1||opp.data.attack!==row.record_key||opp.data.offer_hash!==row.data.offer_hash
    ||opp.data.contract!==o.contract||opp.data.terms_hash!==o.terms_hash||opp.data.actor!==o.actor||opp.data.target!==o.target
    ||o.brawl.group_ref&&(opp.data.group_ref!==o.brawl.group_ref||opp.data.group_hash!==o.brawl.group_hash)
    ||s?.status!=="active"||s.kind!=="pvp_attack_mechanics_review"||hash(s.details)!==hash(o)||!attackReviewAuthority(db,guild,s,o)
    ||!w?.data.pvp_brawl||w.visibility!=="gm"
    ||reservation?.status!=="active"||reservation.kind!=="native_pvp_opportunity"||reservation.visibility!=="gm"
    ||!opportunitySource(db,guild,reservation,o,binding)||hash(reservation.details)!==hash(binding)
    ||reservation.scene!==o.scene||reservation.session_id!==o.session
    ||opp.data.window_source!==w.source_event||!Number.isSafeInteger(opp.data.ordinal)||opp.data.ordinal<0
    ||!groupMatches(w.data.pvp_brawl,o)||w.data.pvp_brawl.target!==o.target
    ||w.data.scene!==o.scene||w.data.session_id!==o.session||!w.data.pvp_brawl.requests.includes(row.record_key))
    fail("Exact native brawl opportunity/source/target lock required.");
  if(row.status==="cancelled"){
    const stop=db.getCityRecord(guild,"pvp_brawl_stop_receipt",`${row.record_key}:stop`),source=stop&&db.getWorldEvent(guild,stop.source_event);
    if(stop?.data.reason==='owner_safety_stop'){
      const pc=db.getCharacter(stop.data.character),control=db.getCityRecord(guild,'pvp_safety_stop',stop.data.character);
      if(stop.status!=='resolved'||stop.visibility!=='gm'||stop.data.attack!==row.record_key
        ||stop.data.native_roll!==(row.data.roll||null)||![o.actor,o.target].includes(stop.data.character)
        ||control?.source_event!==stop.source_event||!pvpSafetyStatus(db,guild,pc.owner_user_id,{character_id:pc.id}).stopped)
        fail('Exact owner safety-stop cancellation receipt required.');
      return {opp,w};
    }
    const consent=inventory(db,guild,"pvp_damage_consent").find(r=>r.source_event===source?.event_key&&r.status==="withdrawn");
    if(stop?.status!=="resolved"||stop.visibility!=="gm"||stop.data.attack!==row.record_key||stop.data.reason!=="owner_withdrawal"
      ||stop.data.native_roll!==(row.data.roll||null)||source?.status!=="active"||source.kind!=="pvp_damage_consent_reply"
      ||source.details.decision!=="withdraw"||source.details.contract!==o.contract||source.details.terms_hash!==o.terms_hash
      ||consent?.subject_key!==stop.data.character||![o.actor,o.target].includes(stop.data.character)
      ||!db.ownerAuthoredSource(guild,source.event_key,source.details.user))fail("Native neutral cancellation needs the exact affected-owner stop source.");
  }
  return {o,opp,w};
}
function windowMembers(db,guild,w){
  const members=inventory(db,guild,"pvp_spotlight_opportunity").filter(r=>r.data.window===w.record_key)
    .map(r=>proof(db,guild,db.getCityRecord(guild,"pvp_attack_request",r.data.attack)).opp).sort((a,b)=>a.data.ordinal-b.data.ordinal);
  if(!members.length||members.some((r,i)=>r.data.ordinal!==i)||hash(members.map(r=>r.data.attack))!==hash(w.data.pvp_brawl.requests))
    fail("Native simultaneous window membership does not match immutable reservation sources.");
  const first=db.getCityRecord(guild,"pvp_attack_request",members[0].data.attack);
  if(w.source_event!==first.source_event||w.data.pvp_brawl.before!==first.data.offer.snapshot.target)fail("Native target-window original source/sheet proof required.");
  return members;
}
function groupOpportunities(db,guild,contract){const g=grouping(contract);return inventory(db,guild,"pvp_spotlight_opportunity").filter(r=>contract.data.version===4
  ?r.data.group_ref===g.ref&&r.data.group_hash===g.hash:r.data.contract===contract.record_key&&r.data.terms_hash===contract.data.terms_hash).map(r=>{
  const request=db.getCityRecord(guild,"pvp_attack_request",r.data.attack),p=proof(db,guild,request);
  if(!["reserved","used","cancelled"].includes(r.status)||r.status==="used"&&(!request.data.roll||r.data.roll!==request.data.roll)
    ||r.status==="cancelled"&&request.status!=="cancelled")fail("Native opportunity lifecycle/roll proof required.");return p.opp;
});}
function cohort(db,guild,ctx){const pcs=campaignMembers(db,guild,ctx).filter(p=>{
  const pc=db.getCharacter(p.character);return ["active","reserve","guest"].includes(pc?.status)
    &&currentParticipant(db,guild,p.character)&&!["unconscious","dead","journey_ended","blaze_pending","allocate_recovery","pending_choice"].includes(pc.data.death_state?.status);
});return pcs.filter(p=>ctx.contract.data.version===4||ctx.terms.target_permissions.some(e=>e.actor===p.character&&pcs.some(t=>t.character===e.target))).map(p=>p.character);}
function fairness(db,guild,ctx,key=null){
  const eligible=cohort(db,guild,ctx),entries=groupOpportunities(db,guild,ctx.contract),counts=Object.fromEntries(eligible.map(c=>[c,0]));
  for(const e of entries)if(e.record_key!==opportunityKey(key)&&e.status!=="cancelled"&&e.data.actor in counts)counts[e.data.actor]++;
  const g=grouping(ctx.contract),passes=inventory(db,guild,"pvp_spotlight_pass").filter(r=>ctx.contract.data.version===4
    ?r.data.group_ref===g.ref&&r.data.group_hash===g.hash:r.data.contract===ctx.contract.record_key&&r.data.terms_hash===ctx.contract.data.terms_hash);
  for(const pass of passes){
    const source=db.getWorldEvent(guild,pass.source_event),p=campaignMembers(db,guild,ctx).find(p=>p.character===pass.subject_key);
    if(!p||pass.status!=="recorded"||pass.visibility!=="character"||source?.status!=="active"||source.kind!=="pvp_spotlight_owner_pass"
      ||source.subject_key!==p.character||source.visibility!=="character"||source.scene!==ctx.contract.data.scene||source.session_id!==ctx.contract.data.session_id
      ||pass.data.character!==p.character||pass.data.principal!==p.principal_revision||hash(source.details)!==hash(pass.data)
      ||source.source_id!==`player:${p.user}`||!db.ownerAuthoredSource(guild,source.event_key,p.user))fail("Exact owner-authored opportunity relinquishment required.");
    if(pass.subject_key in counts)counts[pass.subject_key]++;
  }
  return {eligible,counts,entries,passes};
}
/** Rechecked before reservation and before dice; no model-specified turn or participant ordering. */
export function brawlAdmission(db,guild,ctx,key){
  const o={session:ctx.row.data.session_id,scene:ctx.row.data.scene,target:ctx.row.data.target},pointer=db.getCityRecord(guild,"pvp_target_lock",lockKey(o));
  if(ctx.contract.data.version!==4&&ctx.terms.interaction_scope==="duel"){
    if(pointer?.status==="locked")fail("Target has a native multiplayer lock; finish that conflict before a separate duel.");return null;
  }
  const own=db.getCityRecord(guild,"pvp_attack_request",key),actor=ctx.row.data.actor,{eligible,counts}=fairness(db,guild,ctx,key);
  if(ctx.contract.data.version!==4&&ctx.terms.spotlight_policy!=="fair_opportunities_native_target_locks")fail("Legacy group consent lacks native spotlight/target-lock policy; fresh independently signed terms required.");
  const urgent=blazeActionAuthorization(db,guild,actor,ctx.accepted.record_key);
  if(!eligible.includes(actor)&&!urgent||!ctx.participants.some(p=>p.character===o.target))fail("Current eligible consenting actor/target required.");
  if(!urgent&&counts[actor]>Math.min(...Object.values(counts)))fail("Fair spotlight opportunity requires other eligible peers first; owners may privately relinquish.");
  const requests=inventory(db,guild,"pvp_attack_request");
  if(requests.some(r=>r.record_key!==key&&r.data.offer?.scene===o.scene&&r.data.offer?.actor===actor&&!terminal.has(r.status)))
    fail("Actor already has an unfinished native attack; no second elective opportunity.");
  let window=null;
  if(pointer?.status==="locked"){
    const w=db.getCityRecord(guild,"scene_action_window",pointer.data.window),b=w?.data.pvp_brawl;
    const g=grouping(ctx.contract),matches=ctx.contract.data.version===4?b?.group_ref===g.ref&&b?.group_hash===g.hash
      :b?.contract===ctx.contract.record_key&&b?.terms_hash===ctx.contract.data.terms_hash;
    if(!b||!matches||b.target!==o.target
      ||b.before!==hash(db.getCharacter(o.target).data)||w.data.scene!==o.scene||w.data.session_id!==o.session)
      fail("Target lock/source/sheet changed; scoped reviewed recovery required.");
    windowMembers(db,guild,w);
    if(!b.requests.includes(key)&&w.status!=="open")fail("Simultaneous target entry is locked after native dice; no late attacking join.");
    window=w.record_key;
  }else if(own?.data.offer.brawl&&db.getCityRecord(guild,"pvp_spotlight_opportunity",opportunityKey(key)))fail("Native target lock missing; no fresh execution authority.");
  return {version:1,eligible,counts,window,...(ctx.contract.data.version===4?{group_ref:grouping(ctx.contract).ref,group_hash:grouping(ctx.contract).hash}:{}),
    ...(urgent?{urgent_blaze:urgent.record_key}:{})};
}
export function reserveBrawlAttack(db,guild,ctx,row){
  if(!row.data.offer.brawl)return row;
  const o=row.data.offer,admission=brawlAdmission(db,guild,ctx,row.record_key),pointerKey=lockKey(o);
  let w=admission.window&&db.getCityRecord(guild,"scene_action_window",admission.window);
  if(!w){w=openActionWindow(db,guild,{key:row.record_key,source_event:row.source_event,reason:"combat_spotlight",resources:[`pc:${o.target}`],location_key:ctx.contract.data.location_key});
    if(w.data.pvp_brawl||w.status!=="open"||w.source_event!==row.source_event)fail("Native target window collision; review before reserving.");
    w=db.saveCityRecord(guild,{...w,key:w.record_key,data:{...w.data,pvp_brawl:{version:1,contract:o.contract,terms_hash:o.terms_hash,
      ...(o.brawl.group_ref?{group_ref:o.brawl.group_ref,group_hash:o.brawl.group_hash}:{}),target:o.target,before:o.snapshot.target,requests:[]}}});
  }
  w=db.saveCityRecord(guild,{...w,key:w.record_key,data:{...w.data,revision:w.data.revision+1,
    pvp_brawl:{...w.data.pvp_brawl,requests:[...w.data.pvp_brawl.requests,row.record_key]}}});
  db.saveCityRecord(guild,{kind:"pvp_target_lock",key:pointerKey,status:"locked",source_event:w.source_event,visibility:"gm",
    data:{version:1,window:w.record_key,target:o.target,contract:o.contract,terms_hash:o.terms_hash}});
  const data={version:1,attack:row.record_key,contract:o.contract,terms_hash:o.terms_hash,actor:o.actor,target:o.target,offer_hash:row.data.offer_hash,
    window:w.record_key,window_source:w.source_event,ordinal:w.data.pvp_brawl.requests.length-1,
    ...(o.brawl.group_ref?{group_ref:o.brawl.group_ref,group_hash:o.brawl.group_hash}:{})};
  const mutation=o.authority==='native_campaign'&&db.recordMutation(guild,{actorType:'system',actorId:'campaign_pvp',sourceLayer:'pvp_campaign',
    mutationType:'campaign_spotlight_reservation',entityKey:row.record_key,sessionId:o.session,visibility:'gm',after:data});
  const source=indexWorldEvent(db,guild,{key:`${opportunityKey(row.record_key)}:source`,kind:"native_pvp_opportunity",title:"Native source-reviewed elective opportunity and target reservation",
    ...(mutation?{source_kind:'mutation',source_id:mutation.id}:{source_id:`gm:${o.reviewer}`}),visibility:"gm",session_id:o.session,scene:o.scene,details:data},o.reviewer);
  db.saveCityRecord(guild,{kind:"pvp_spotlight_opportunity",key:opportunityKey(row.record_key),status:"reserved",source_event:source.event_key,visibility:"gm",actor_key:o.actor,data});
  return row;
}
export function verifyBrawlAttack(db,guild,row,{committed=false}={}){
  if(!row.data.offer.brawl)return;
  const {opp,w}=proof(db,guild,row);
  windowMembers(db,guild,w);
  if(!committed&&row.status==='cancelled'
    &&db.getCityRecord(guild,'pvp_brawl_stop_receipt',`${row.record_key}:stop`)?.data.reason==='owner_safety_stop')
    fail('Owner safety stop cancelled this unfinished hostile permission.');
  if(committed){if(opp.status!=="used"||opp.data.roll!==row.data.roll)fail("Actual native consumed spotlight and saved roll required.");}
  else if(opp.status!=="reserved"||!["open","locked"].includes(w.status))fail("Target lock/spotlight is cancelled or consumed.");
}
export function consumeBrawlAttack(db,guild,row,receipt){
  if(!row.data.offer.brawl)return;
  const {opp,w}=proof(db,guild,row);
  if(opp.status!=="reserved")fail("Native opportunity already consumed.");
  db.saveCityRecord(guild,{...opp,key:opp.record_key,status:"used",data:{...opp.data,roll:receipt.record_key}});
  if(w.status==="open")db.saveCityRecord(guild,{...w,key:w.record_key,status:"locked",data:{...w.data,revision:w.data.revision+1}});
  releaseBrawlLocks(db,guild,row.record_key);
}
/** Only already reserved, independently authorized attacks in the SAME simultaneous target window
 * may finish their saved exchange. No new reservation, later turn or other window gets this exception. */
export function brawlBatchMayFinish(db,guild,row,triggers){
  if(!row.data.offer.brawl||!triggers.length)return false;
  const {opp,w}=proof(db,guild,row);windowMembers(db,guild,w);
  if(!(opp.status==="reserved"&&w.status==="locked"&&triggers.every(t=>t.data.version===2&&t.status==="awaiting_move"
    &&(row.data.offer.brawl.group_ref||t.data.proposal===row.data.offer.contract)&&w.data.pvp_brawl.requests.includes(t.data.round))))return false;
  for(const t of triggers){
    const p=validatePvpAttackRoll(db,guild,t.data.attack_receipt),r=p.receipt,o=p.offer;
    const expected=`pvp-fear:${hash([o.contract,o.terms_hash,p.request.record_key,r.record_key]).slice(0,40)}`;
    if(t.record_key!==expected||t.visibility!=="gm"||t.data.terms_hash!==o.terms_hash||t.data.session!==o.session||t.data.scene!==o.scene
      ||t.data.round!==p.request.record_key||t.data.roll_id!==r.data.roll_id||t.data.source_event!==r.source_event||t.source_event!==r.source_event
      ||t.data.roller_character!==o.actor||t.data.roller_principal_revision!==o.snapshot.actor_principal||t.data.duality!=="Fear"
      ||r.data.result.duality!=="Fear")fail("Exact native immediate Fear ancestry required before simultaneous sibling dice.");
  }
  return true;
}
export function assertBrawlFearOrder(db,guild,request,trigger){
  if(!request.data.offer.brawl)return;
  const pending=orderedBrawlFear(db,guild,request);
  if(pending[0]?.record_key!==trigger.record_key)fail("Resolve simultaneous immediate Fear moves in native reservation order.");
}
/** Source-verified recovery order, shared by the executor and the bounded restart coordinator. */
export function orderedBrawlFear(db,guild,request){
  if(!request.data.offer.brawl)return [];
  const {w}=proof(db,guild,request),members=windowMembers(db,guild,w),order=new Map(members.map(m=>[m.data.attack,m.data.ordinal]));
  const pending=inventory(db,guild,"pvp_fear_trigger").filter(t=>t.data.version===2&&t.status!=="resolved"&&order.has(t.data.round));
  for(const t of pending){const actual=validatePvpAttackRoll(db,guild,t.data.attack_receipt);
    if(actual.receipt.data.result.duality!=="Fear"||actual.request.record_key!==t.data.round||!groupMatches(w.data.pvp_brawl,actual.offer))
      fail("Exact native simultaneous Fear source required.");}
  pending.sort((a,b)=>order.get(a.data.round)-order.get(b.data.round));
  return pending;
}
export function assertBrawlDamageSources(db,guild,rows,{committed=false}={}){
  const grouped=rows.filter(r=>r.offer.brawl);if(!grouped.length)return;
  if(grouped.length!==rows.length)fail("Simultaneous native target window cannot mix unrelated duel sources.");
  const windows=grouped.map(r=>proof(db,guild,r.request).w);if(new Set(windows.map(w=>w.record_key)).size!==1)fail("Exact simultaneous target lock required.");
  windowMembers(db,guild,windows[0]);
  const expected=[];
  for(const key of windows[0].data.pvp_brawl.requests){const request=db.getCityRecord(guild,"pvp_attack_request",key);proof(db,guild,request);
    if(request.status==="cancelled"&&!request.data.application)continue;
    if(!request.data.roll||!["awaiting_armor","damage_applied","resolved","missed"].includes(request.status))fail("Simultaneous target has a pending native attack/damage source.");
    const roll=db.getCityRecord(guild,"pvp_attack_roll_receipt",request.data.roll);
    if(roll?.data.result.hit){if(!request.data.damage)fail("Simultaneous native damage source is pending.");expected.push(request.data.damage);}
  }
  if(hash(expected.sort())!==hash(rows.map(r=>r.receipt.record_key).sort()))fail("All actual simultaneous target sources must be grouped once before Armor.");
  if(!committed&&windows[0].status!=="locked")fail("Simultaneous target window no longer executable.");
}
/** Exact native target-window source selection, never an AI simultaneity assertion. */
export function pvpWindowDamageSources(db,guild,request){
  if(!request.data.offer.brawl){if(!request.data.damage)fail('Native damage pending.');return [request.data.damage];}
  const {w}=proof(db,guild,request);windowMembers(db,guild,w);
  const sources=[];
  for(const id of w.data.pvp_brawl.requests){
    const row=db.getCityRecord(guild,'pvp_attack_request',id);proof(db,guild,row);
    if(row.status==='cancelled'&&!row.data.application)continue;
    if(!row.data.roll)fail('Simultaneous native attack roll is pending.');
    const hit=validatePvpAttackRoll(db,guild,row.data.roll).receipt.data.result.hit;
    if(hit&&!row.data.damage)fail('Simultaneous native damage roll is pending.');
    if(hit)sources.push(row.data.damage);
  }
  if(!sources.length)fail('No actual hit damage sources.');return sources;
}
export function releaseBrawlLocks(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_attack_request",key);if(!row?.data.offer.brawl)return;
  const {w}=proof(db,guild,row),b=w.data.pvp_brawl;
  if(!b.requests.every(id=>terminal.has(db.getCityRecord(guild,"pvp_attack_request",id)?.status)))return;
  db.saveCityRecord(guild,{...w,key:w.record_key,status:"closed",data:{...w.data,revision:w.data.revision+1}});
  const pointer=db.getCityRecord(guild,"pvp_target_lock",lockKey(row.data.offer));
  if(pointer?.data.window===w.record_key)db.saveCityRecord(guild,{...pointer,key:pointer.record_key,status:"released"});
}
/** Native neutral stop; never rewrites committed dice/effects, selects a reaction or erases Fear. */
export function cancelBrawlForWithdrawal(db,guild,contract,character,source){
  for(const row of inventory(db,guild,"pvp_attack_request").filter(r=>r.data.offer?.brawl&&r.data.offer.contract===contract
    &&[r.data.offer.actor,r.data.offer.target].includes(character)&&!terminal.has(r.status)&&!r.data.application)){
    const o=row.data.offer,opp=db.getCityRecord(guild,"pvp_spotlight_opportunity",opportunityKey(row.record_key));
    db.saveCityRecord(guild,{kind:"pvp_brawl_stop_receipt",key:`${row.record_key}:stop`,status:"resolved",visibility:"gm",source_event:source,
      data:{version:1,attack:row.record_key,character,reason:"owner_withdrawal",native_roll:row.data.roll||null,authority:"Neutral cancellation only; no forfeit, new effect, reroll or erased Fear."}});
    db.saveCityRecord(guild,{...row,key:row.record_key,status:"cancelled"});
    if(opp?.status==="reserved")db.saveCityRecord(guild,{...opp,key:opp.record_key,status:"cancelled"});
    releaseBrawlLocks(db,guild,row.record_key);
  }
}
/** Priority owner stop cancels unfinished hostile permission only; native dice, effects and Fear remain history. */
export function cancelBrawlForSafety(db,guild,character,user,source){
  if(!pvpSafetyStatus(db,guild,user,{character_id:character}).stopped
    ||db.getCityRecord(guild,'pvp_safety_stop',character)?.source_event!==source)fail('Exact saved owner safety stop required.');
  for(const row of inventory(db,guild,'pvp_attack_request').filter(r=>[r.data.offer?.actor,r.data.offer?.target].includes(character)
    &&!terminal.has(r.status)&&!r.data.application)){
    const opp=db.getCityRecord(guild,'pvp_spotlight_opportunity',opportunityKey(row.record_key));
    db.saveCityRecord(guild,{kind:'pvp_brawl_stop_receipt',key:`${row.record_key}:stop`,status:'resolved',visibility:'gm',source_event:source,
      data:{version:1,attack:row.record_key,character,reason:'owner_safety_stop',native_roll:row.data.roll||null,
        authority:'Neutral cancellation of unfinished permission; no loss/reversal of dice, damage, Fear or owner choice.'}});
    db.saveCityRecord(guild,{...row,key:row.record_key,status:'cancelled'});
    if(opp?.status==='reserved')db.saveCityRecord(guild,{...opp,key:opp.record_key,status:'cancelled'});
    if(row.data.offer.brawl)releaseBrawlLocks(db,guild,row.record_key);
  }
}
function ownerOpportunity(db,guild,user,contract){
  const ctx=validateDamagePvp(db,guild,contract),pc=personalCharacter(db,guild,user),principal=conversationPrincipal(db,guild,user,pc.id);
  if(ctx.contract.data.version!==4&&ctx.terms.interaction_scope==="duel"||!campaignMembers(db,guild,ctx).some(p=>p.character===pc.id&&p.user===user))fail("Only a current affected multiplayer owner may review/relinquish their opportunity.");
  const state=fairness(db,guild,ctx),pending=state.entries.filter(e=>e.data.actor===pc.id&&e.status==="reserved").map(e=>e.data.attack);
  const revision=hash([ctx.contract.data.terms_hash,pc.id,principal.revision,state.eligible,state.counts,state.entries.map(e=>[e.record_key,e.status]),state.passes.map(p=>p.record_key)]);
  return {ctx,pc,principal,state,pending,revision};
}
export function reviewBrawlOpportunity(db,guild,user,contract){return db.transaction(()=>{
  const f=ownerOpportunity(db,guild,user,contract);
  db.saveCityRecord(guild,{kind:"pvp_spotlight_review",key:`${contract}:${f.pc.id}`,status:"reviewed",visibility:"character",subject_key:f.pc.id,
    source_event:f.ctx.contract.source_event,data:{owner:user,revision:f.revision,principal:f.principal.revision}});
  return {contract,character:f.pc.id,revision:f.revision,opportunities:f.state.counts[f.pc.id]??null,pending:f.pending,
    instruction:"Any eligible owner can act next; no fixed initiative. You may privately relinquish YOUR current elective opportunity with spotlight-pass. This is not a fictional action, surrender, cost, damage or consent for someone else."};
});}
export function passBrawlOpportunity(db,guild,user,input,{interactionId}={}){return db.transaction(()=>{
  if(!input||Object.keys(input).sort().join()!=="contract,expected_revision"||!interactionId)fail("Authenticated exact owner opportunity decision required.");
  const key=`pvp-pass:${hash([guild,user,interactionId])}`,old=db.getCityRecord(guild,"pvp_spotlight_pass",key),f=ownerOpportunity(db,guild,user,input.contract);
  if(old){if(old.subject_key!==f.pc.id||old.data.contract!==input.contract||old.data.expected_revision!==input.expected_revision)fail("Opportunity replay changed; no extra pass.");return old;}
  const review=db.getCityRecord(guild,"pvp_spotlight_review",`${input.contract}:${f.pc.id}`),count=f.state.counts[f.pc.id];
  if(input.expected_revision!==f.revision||review?.data.revision!==f.revision||review.data.owner!==user||review.subject_key!==f.pc.id
    ||review.visibility!=="character"||review.source_event!==f.ctx.contract.source_event)fail("Privately review your current exact opportunity revision before relinquishing.");
  if(f.pending.length||count===undefined||count>Math.min(...Object.values(f.state.counts)))fail("No current ready opportunity to relinquish; finish/cancel your pending action or wait for peers.");
  const data={version:1,contract:input.contract,terms_hash:f.ctx.contract.data.terms_hash,character:f.pc.id,owner:user,principal:f.principal.revision,
    expected_revision:input.expected_revision,interaction:interactionId,
    ...(f.ctx.contract.data.version===4?{group_ref:grouping(f.ctx.contract).ref,group_hash:grouping(f.ctx.contract).hash}:{})};
  const s=indexWorldEvent(db,guild,{key:`${key}:source`,kind:"pvp_spotlight_owner_pass",title:"Owner neutrally relinquishes their current elective opportunity",
    source_id:`player:${user}`,visibility:"character",subject_key:f.pc.id,scene:f.ctx.contract.data.scene,session_id:f.ctx.contract.data.session_id,details:data},user);
  return db.saveCityRecord(guild,{kind:"pvp_spotlight_pass",key,status:"recorded",visibility:"character",subject_key:f.pc.id,source_event:s.event_key,data});
});}
