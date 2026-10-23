/** V3 damage/group consent. Accepted intent is input; these agreements never mint dice or effects. */
import {createHash} from "node:crypto";
import {consentAction,historicalActionSource} from "./action-consent.js";
import {conversationPrincipal,historicalOwnerPrincipal} from "./conversation-principal.js";
import {currentScene} from "./scene-continuity.js";
import {indexWorldEvent} from "./city-calendar.js";
import {isPvpIntent,pvpTarget} from "./pvp-authority.js";
import {cancelBrawlForWithdrawal} from "./pvp-brawl.js";
import {assertPvpSafety} from './pvp-campaign-policy.js';
import {stageCampaignPvp,validateCampaignPvp} from './pvp-campaign-execution.js';
import {createPvpProfileTerms} from './frameworks/daggerheart/pvp-profile-terms.js';
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(v,keys){
  if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!(k in v)))fail("Closed v3 PvP fields required.");
}
const {checkTerms:nativeCheckTerms}=createPvpProfileTerms({fail});
function checkTerms(db,guild,input,{historical=false}={}){
  return nativeCheckTerms(input,{historical,resolveOwner:(character,isHistorical)=>controlledOwner(db,guild,character,isHistorical),
    currentMinute:()=>db.getSimulationClock(guild).minute});
}
const text=(value,max=600)=>typeof value==='string'&&!!value.trim()&&value.length<=max;
function nativeId(interactionId){if(!text(interactionId,100))fail("Authenticated PvP interaction required.");return interactionId;}
function controlledOwner(db,guild,character,historical=false){
  const pc=db.getCharacter(character);
  if(pc?.guild_id!==guild||!pc.owner_user_id)fail("Current campaign PC owner required.");
  let principal;
  try{principal=historical?historicalOwnerPrincipal(db,guild,pc.owner_user_id,character):conversationPrincipal(db,guild,pc.owner_user_id,character);}
  catch(error){
    if(!/Active session|attendance|controlled role|campaign character/i.test(error.message))throw error;
    fail("Current controlled owner principal/attendance required.");
  }
  if(principal.kind!==(historical?"historical_owner":"owner"))fail("Current controlled owner required, never proxy consent.");
  return {character,user:pc.owner_user_id,principal_revision:principal.revision};
}
function inventory(db,guild,kind){
  const out=[];for(let offset=0;offset<10000;offset+=100){const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);if(page.length<100)return out;}
  fail("PvP record inventory exceeded safe bound; reviewed recovery required.");
}
function writeTerms(db,guild,old,user,input,interactionId){
  const terms=checkTerms(db,guild,input),revision=(old.data.revision||0)+1;
  if(terms.interaction_scope!=="duel"&&terms.spotlight_policy!=="fair_opportunities_native_target_locks")
    fail("New group offers require explicit fair spotlight/target-lock policy and every current owner's fresh approval; legacy consent is not upgraded.");
  const {row:accepted,scene}=consentAction(db,guild,old.data.accepted_intent),location=db.getCharacter(accepted.data.actor).data.location;
  const participants=terms.participants.map(p=>({...controlledOwner(db,guild,p.character),team:p.team}));
  if(!participants.some(p=>p.user===user)||!participants.some(p=>p.character===accepted.data.actor)
    ||!participants.some(p=>p.character===pvpTarget(db,guild,accepted)?.id)
    ||!location||participants.some(p=>db.getCharacter(p.character).data.location!==location))fail("Current co-located original actors and affected owners required.");
  const snapshot={version:3,guild,contract:old.record_key,revision,accepted_intent:accepted.record_key,source_event:accepted.source_event,
    source_hash:accepted.data.source_hash,session_id:scene.session_id,scene:scene.key,location_key:location,participants,terms};
  const digest=hash(snapshot),key=`pvp-damage-terms:${hash([old.record_key,revision])}`;
  const sourceKey=`pvp-damage-offer:${hash([guild,user,interactionId])}`,priorSource=db.getWorldEvent(guild,sourceKey);
  const details={author:user,contract:old.record_key,revision,digest,snapshot};
  if(priorSource&&(priorSource.status!=="active"||hash(priorSource.details)!==hash(details)))fail("Interaction replay cannot change immutable terms.");
  if(db.getCityRecord(guild,"pvp_encounter_terms",key))fail("Immutable terms revision already exists.");
  const source=indexWorldEvent(db,guild,{key:sourceKey,kind:"pvp_damage_terms_offer",title:"Owner-authored damage PvP terms",
    source_id:`player:${user}`,visibility:"character",subject_key:participants.find(p=>p.user===user).character,
    session_id:scene.session_id,scene:scene.key,details},user);
  db.saveCityRecord(guild,{kind:"pvp_encounter_terms",key,source_event:source.event_key,status:"immutable",visibility:"gm",data:{version:3,digest,snapshot}});
  return db.saveCityRecord(guild,{kind:"pvp_encounter_contract",key:old.record_key,source_event:source.event_key,visibility:"gm",status:"proposed",
    data:{version:3,...snapshot,snapshot,revision,terms_revision:key,terms_hash:digest,approvals:[],withdrawals:[],state_revision:(old.data.state_revision||0)+1}});
}
function participant(db,guild,user,p){
  const who=p?.data.participants?.find(x=>x.user===user);if(!who)fail("Only current affected owner participants may inspect or decide.");
  if(controlledOwner(db,guild,who.character).principal_revision!==who.principal_revision)fail("Owner principal changed; fresh review required.");return who;
}
function live(db,guild,key,{terminal=false,committed=false}={}){
  if(db.getCityRecord(guild,'pvp_encounter_contract',key)?.data.version===4)return validateCampaignPvp(db,guild,key,{committed}).contract;
  const p=db.getCityRecord(guild,"pvp_encounter_contract",key),s=p?.data.snapshot,scene=currentScene(db,guild);
  if(!p||p.visibility!=="gm"||p.data.version!==3||s?.guild!==guild||s.contract!==key||hash(s)!==p.data.terms_hash
    ||JSON.stringify(s.participants)!==JSON.stringify(p.data.participants)||s.revision!==p.data.revision
    ||s.scene!==p.data.scene||s.session_id!==p.data.session_id||s.location_key!==p.data.location_key
    ||s.accepted_intent!==p.data.accepted_intent)fail("Native v3 contract digest or scope changed.");
  if(!terminal&&!["proposed","awaiting_consent","locked"].includes(p.status))fail("Damage consent is terminal or not locked.");
  if(s.scene!==scene.key||s.session_id!==scene.session_id||!committed&&s.terms.expires_minute<=db.getSimulationClock(guild).minute)fail("PvP scene/source expired or stale.");
  const revision=db.getCityRecord(guild,"pvp_encounter_terms",p.data.terms_revision),source=db.getWorldEvent(guild,p.source_event);
  if(revision?.status!=="immutable"||revision.data.digest!==p.data.terms_hash||hash(revision.data.snapshot)!==p.data.terms_hash
    ||revision.source_event!==p.source_event||source?.status!=="active"||source.kind!=="pvp_damage_terms_offer"
    ||source.details.digest!==p.data.terms_hash||hash(source.details.snapshot)!==p.data.terms_hash
    ||source.scene!==s.scene||source.session_id!==s.session_id||!s.participants.some(w=>w.user===source.details.author&&w.character===source.subject_key)
    ||source.source_id!==`player:${source.details.author}`||!db.ownerAuthoredSource(guild,source.event_key,source.details.author))fail("PvP terms source retracted, stale or changed.");
  // Group terms remain immutable ancestry when a participant dies or withdraws. Only current living,
  // unwithdrawn actors/targets below can receive fresh execution authority; history never re-enrolls anyone.
  const group=s.terms.interaction_scope!=="duel",ancestry=committed||group;
  try{(ancestry?historicalActionSource:consentAction)(db,guild,s.accepted_intent);}catch(error){if(error.code!=="SCENE_ACTION_WINDOW")throw error;fail("Original PvP declaration source/owner is stale or retracted.");}
  checkTerms(db,guild,s.terms,{historical:ancestry});
  const withdrawn=new Set(p.data.withdrawals.map(ref=>signature(db,guild,p,ref,"withdraw").character));
  for(const w of s.participants){
    if(controlledOwner(db,guild,w.character,ancestry).principal_revision!==w.principal_revision)fail("PvP current owner principal changed.");
    const pc=db.getCharacter(w.character),inactive=group&&(withdrawn.has(w.character)||!["active","reserve","guest"].includes(pc.status));
    if(!inactive&&pc.data.location!==s.location_key)fail("PvP participant location changed; scope review required.");
  }
  return p;
}
export function proposeDamagePvp(db,guild,user,input,{interactionId}={}){
  return db.transaction(()=>{
  closed(input,["accepted_intent","terms"]);nativeId(interactionId);
  const {row:a,principal}=consentAction(db,guild,input.accepted_intent);
  if(principal.user!==user||!isPvpIntent(db,guild,a))fail("Own accepted PC conflict declaration required.");
  const key=`pvp-damage:${hash([guild,a.record_key,interactionId])}`,prior=db.getCityRecord(guild,"pvp_encounter_contract",key);
  if(prior){participant(db,guild,user,prior);live(db,guild,key,{terminal:true});if(hash(checkTerms(db,guild,input.terms))!==hash(prior.data.snapshot.terms))fail("Proposal replay cannot change terms.");return prior;}
  assertPvpSafety(db,guild,[a.data.actor,pvpTarget(db,guild,a)?.id].filter(Boolean));
  return db.transaction(()=>writeTerms(db,guild,{record_key:key,data:{accepted_intent:a.record_key}},user,input.terms,interactionId));
  });
}
export function reviewDamagePvp(db,guild,user,key){
  return db.transaction(()=>{
  const raw=db.getCityRecord(guild,"pvp_encounter_contract",key),who=participant(db,guild,user,raw),p=live(db,guild,key,{terminal:true}),t=p.data.snapshot.terms;
  if(p.data.version===4)return {contract:key,terms_hash:p.data.terms_hash,status:p.status,visibility:'character',character_id:who.character,
    text:['Native campaign conflict scope; not a bilateral consent offer.',`Reference: ${key}; policy revision ${p.data.policy_revision}.`,
      'Your source-bound attack and current target Evasion still require native mechanics. No player reaction or optional choice is implied.',
      'Armor, optional resources/reactions and SRD death choices remain owner-controlled. No PvP Hope or Critical Stress.',
      'Use your immediate safety-stop to prevent new/unfinished hostile effects; committed native outcomes remain saved.'].join('\n')};
  const text=[`Damage-enabled PvP — ${key}`,`Revision ${p.data.revision}; digest ${p.data.terms_hash}; status ${p.status}`,
    `Objective: ${t.objective}`,`Scope: ${t.interaction_scope}; lethality: lethal. Real damage may mark final HP and require YOUR SRD death-move choice.`,
    ...(t.interaction_scope!=="duel"?[t.spotlight_policy==="fair_opportunities_native_target_locks"
      ?"Group policy: fair elective opportunities, no fixed initiative; owner may privately pass. Native simultaneous target locks close after dice; only real source-grouped hits use one target Armor choice. GM Fear moves and separately approved final death actions are not extra elective attacks."
      :"Legacy group terms omit the native spotlight policy. Read-only/inert: issue fresh terms and obtain every affected owner's approval before execution."]:[]),
    "Blaze of Glory, Avoid Death or Risk It All: affected owner chooses under native rules; no GM/attacker choice. Death and scar risks are not guaranteed preventable.",
    "Guaranteed-nonlethal damage tiers, automatic last-HP caps and nonlethal fall substitutions are disabled.",
    ...t.stakes.map(s=>`${db.getCharacter(s.character).name}: best ${s.best}; worst ${s.worst}`),
    ...t.target_permissions.map(e=>`${db.getCharacter(e.actor).name} → ${db.getCharacter(e.target).name}: ${e.effect_class}, ${e.max_risk}`),
    `Boundaries: ${t.boundaries.join(", ")}`,`Hope: ${t.hope_policy}; critical Stress: ${t.critical_stress_policy}; Fear: ${t.fear_policy}.`,
    `Audience: ${t.audience}; scoring: ${t.scoring_policy}; features: ${t.features.join(", ")||"none"}; spending: ${t.resource_spending}.`,
    `Stop: ${t.stop_policy}; expiry: ${t.expires_minute}. All current affected owners must approve this EXACT revision.`,
    "Consent alone grants no dice, damage, resources, forced reaction, item loss or private disclosure. Native attack, defense and effect receipts remain required."
  ].join("\n");
  db.saveCityRecord(guild,{kind:"pvp_damage_review",key:`${key}:${who.character}`,status:"reviewed",source_event:p.source_event,visibility:"character",subject_key:who.character,
    data:{version:3,contract:key,user,terms_hash:p.data.terms_hash,principal_revision:who.principal_revision}});
  return {contract:key,terms_hash:p.data.terms_hash,status:p.status,text,visibility:"character",character_id:who.character};
  });
}
/** Read-only current owner/source proof for private status. Receiving a notice is NOT a terms review or signature. */
export function damagePvpOwnerContext(db,guild,user,key){
  const raw=db.getCityRecord(guild,'pvp_encounter_contract',key),who=participant(db,guild,user,raw);
  return {contract:live(db,guild,key,{terminal:true}),who};
}
function signature(db,guild,p,ref,decision){
  const r=db.getCityRecord(guild,"pvp_damage_consent",ref),d=r?.data,source=r&&db.getWorldEvent(guild,r.source_event),w=p.data.participants.find(x=>x.character===r?.subject_key&&x.user===d?.user);
  if(!w||r.visibility!=="character"||r.status!==({accept:"accepted",decline:"declined",withdraw:"withdrawn"}[decision])
    ||d.version!==3||d.contract!==p.record_key||d.terms_hash!==p.data.terms_hash||d.principal_revision!==w.principal_revision||d.decision!==decision
    ||source?.status!=="active"||source.kind!=="pvp_damage_consent_reply"||source.visibility!=="character"||source.subject_key!==w.character
    ||source.source_id!==`player:${w.user}`||source.scene!==p.data.scene||source.session_id!==p.data.session_id
    ||hash(source.details)!==hash(d)||!db.ownerAuthoredSource(guild,source.event_key,w.user))fail("Current exact affected-owner consent signature/source required.");return w;
}
export function validateDamagePvp(db,guild,key,{committed=false}={}){
  if(db.getCityRecord(guild,'pvp_encounter_contract',key)?.data.version===4)return validateCampaignPvp(db,guild,key,{committed});
  const p=live(db,guild,key,{terminal:committed,committed});
  if(!(p.status==="locked"||committed&&p.status==="withdrawn")||p.data.approvals.length!==p.data.participants.length||new Set(p.data.approvals).size!==p.data.approvals.length)fail("All current affected owners must lock identical consent.");
  const signed=p.data.approvals.map(ref=>signature(db,guild,p,ref,"accept"));
  if(new Set(signed.map(w=>w.character)).size!==p.data.participants.length)fail("Independent participant signatures required.");
  const withdrawn=p.data.withdrawals.map(ref=>signature(db,guild,p,ref,"withdraw").character),participants=committed?signed:signed.filter(w=>!withdrawn.includes(w.character)
    &&["active","reserve","guest"].includes(db.getCharacter(w.character).status));
  if(participants.length<2)fail("Damage PvP withdrawn; no future conflict.");
  for(const edge of p.data.snapshot.terms.target_permissions){
    const key=`pvp-edge:${hash([p.record_key,p.data.terms_hash,edge])}`,proof=db.getCityRecord(guild,"pvp_target_edge_consent",key);
    if(proof?.status!=="locked"||proof.source_event!==p.source_event||hash(proof.data)!==hash({version:3,contract:p.record_key,terms_hash:p.data.terms_hash,edge,source_ref:p.source_event,approvals:p.data.approvals}))
      fail("Native target-specific consent proof required.");
  }
  return {contract:p,participants,terms:p.data.snapshot.terms};
}
export function respondDamagePvp(db,guild,user,input,{interactionId}={}){
  return db.transaction(()=>{
  closed(input,["contract","expected_revision","decision"]);nativeId(interactionId);
  const raw=db.getCityRecord(guild,"pvp_encounter_contract",input.contract),who=participant(db,guild,user,raw),p=live(db,guild,input.contract,{terminal:true});
  if(p.data.version===4)fail('Campaign policy is not bilateral consent; use your owner safety-stop, never forged agreement signatures.');
  if(input.expected_revision!==p.data.terms_hash)fail("PvP terms revision changed; review fresh terms.");
  if(!["accept","decline","withdraw"].includes(input.decision))fail("Explicit affected-owner decision required.");
  if(input.decision==="accept")assertPvpSafety(db,guild,p.data.snapshot.participants.map(x=>x.character));
  const details={version:3,contract:p.record_key,user,principal_revision:who.principal_revision,terms_hash:p.data.terms_hash,decision:input.decision,interaction_id:interactionId};
  const sourceKey=`pvp-damage-reply:${hash([guild,user,interactionId])}`,oldSource=db.getWorldEvent(guild,sourceKey);
  if(oldSource&&hash(oldSource.details)!==hash(details))fail("Consent interaction replay cannot change decision or terms.");
  if(oldSource){
    const key=`pvp-damage-consent:${hash([p.record_key,p.data.terms_hash,who.character,input.decision,interactionId])}`;
    signature(db,guild,p,key,input.decision);return p; // Verify the saved choice, never append/re-enroll on retry.
  }
  if(!["proposed","awaiting_consent","locked"].includes(p.status))fail("Consent is terminal; fresh terms required.");
  if(p.data.withdrawals.some(ref=>signature(db,guild,p,ref,"withdraw").character===who.character))fail("Withdrawn player cannot be silently re-enrolled.");
  const review=db.getCityRecord(guild,"pvp_damage_review",`${p.record_key}:${who.character}`);
  if(input.decision==="accept"&&(review?.status!=="reviewed"||review.data.user!==user||review.data.terms_hash!==p.data.terms_hash
    ||review.data.principal_revision!==who.principal_revision||review.source_event!==p.source_event))fail("Review complete private death-risk terms before acceptance.");
  if(input.decision==="decline"&&p.status==="locked")fail("Use neutral withdrawal for a locked agreement.");
  if(input.decision==="accept"&&p.data.approvals.some(ref=>signature(db,guild,p,ref,"accept").character===who.character))return p;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key:sourceKey,kind:"pvp_damage_consent_reply",title:"Authenticated damage PvP decision",source_id:`player:${user}`,
      visibility:"character",subject_key:who.character,session_id:p.data.session_id,scene:p.data.scene,details},user);
    if(source.status!=="active"||hash(source.details)!==hash(details))fail("Consent source is retracted or changed.");
    const key=`pvp-damage-consent:${hash([p.record_key,p.data.terms_hash,who.character,input.decision,interactionId])}`;
    db.saveCityRecord(guild,{kind:"pvp_damage_consent",key,status:{accept:"accepted",decline:"declined",withdraw:"withdrawn"}[input.decision],
      source_event:source.event_key,visibility:"character",subject_key:who.character,data:details});
    const approvals=input.decision==="accept"?[...p.data.approvals,key]:p.data.approvals;
    const withdrawals=input.decision==="withdraw"?[...p.data.withdrawals,key]:p.data.withdrawals;
    const complete=approvals.length===p.data.participants.length&&approvals.every(ref=>signature(db,guild,p,ref,"accept"));
    const status=input.decision==="decline"?"declined":input.decision==="withdraw"&&(!complete||p.data.participants.length-withdrawals.length<2)?"withdrawn":complete?"locked":"awaiting_consent";
    if(complete)for(const edge of p.data.snapshot.terms.target_permissions)db.saveCityRecord(guild,{
      kind:"pvp_target_edge_consent",key:`pvp-edge:${hash([p.record_key,p.data.terms_hash,edge])}`,status:"locked",source_event:p.source_event,visibility:"gm",
      data:{version:3,contract:p.record_key,terms_hash:p.data.terms_hash,edge,source_ref:p.source_event,approvals}});
    const result=db.saveCityRecord(guild,{...p,key:p.record_key,status,data:{...p.data,approvals,withdrawals,state_revision:p.data.state_revision+1}});
    if(input.decision==="withdraw")cancelBrawlForWithdrawal(db,guild,p.record_key,who.character,source.event_key);
    return result;
  });
  });
}
export function reviseDamagePvp(db,guild,user,input,{interactionId}={}){
  return db.transaction(()=>{
  closed(input,["contract","expected_revision","terms"]);nativeId(interactionId);
  const raw=db.getCityRecord(guild,"pvp_encounter_contract",input.contract);participant(db,guild,user,raw);const p=live(db,guild,input.contract);
  if(p.data.version===4)fail('Campaign scope is immutable native policy, not a revisable bilateral agreement.');
  if(input.expected_revision!==p.data.terms_hash)fail("PvP terms revision changed.");
  if(inventory(db,guild,"pvp_attack_intent").some(r=>r.data.contract===p.record_key))fail("Attack already staged; its terms are immutable. Stop and use a new contract.");
  return db.transaction(()=>writeTerms(db,guild,p,user,input.terms,interactionId));
  });
}
export function damagePvpInbox(db,guild,user){
  const principal=conversationPrincipal(db,guild,user);if(principal.kind!=="owner")fail("Current owner required.");
  return inventory(db,guild,"pvp_encounter_contract").filter(p=>p.data.session_id===principal.session_id&&p.data.participants.some(w=>w.user===user&&w.character===principal.character_id))
    .map(p=>({contract:p.record_key,status:p.status,terms_hash:p.data.terms_hash,authority:"Review privately. Consent is not a mechanical outcome."}));
}
export function damagePvpEligibility(db,guild,accepted){
  accepted=consentAction(db,guild,accepted.record_key).row;
  if(!isPvpIntent(db,guild,accepted)||!['attack','unarmed_attack','weapon_attack'].includes(accepted.data.operation))return null;
  const target=pvpTarget(db,guild,accepted),found=[];
  for(const raw of inventory(db,guild,"pvp_encounter_contract").filter(p=>p.status==="locked"&&p.data.scene===accepted.data.scene)){
    if(raw.data.version===4)continue; // Campaign scopes bind one exact declaration, never another action.
    if(accepted.data.operation!=='attack')continue; // Original bilateral version retains its original declaration contract.
    let ctx;try{ctx=validateDamagePvp(db,guild,raw.record_key);}catch(error){if(error.code!=="NARRATIVE_PVP")throw error;continue;}
    if(![accepted.data.actor,target.id].every(c=>ctx.participants.some(p=>p.character===c)))continue;
    const edge=ctx.terms.target_permissions.find(e=>e.actor===accepted.data.actor&&e.target===target.id&&e.effect_class==="attack_damage");
    if(edge)found.push({...ctx,edge,accepted});
  }
  if(found.length>1)fail("Multiple exact damage scopes; private clarification required before choosing one.");
  if(found.length)return found[0];
  const campaign=stageCampaignPvp(db,guild,accepted);
  if(!campaign)return null;
  const ctx=validateCampaignPvp(db,guild,campaign.record_key);
  return {...ctx,edge:ctx.terms.target_permissions[0],accepted};
}
export function stageDamagePvp(db,guild,accepted){
  return db.transaction(()=>{
  const ctx=damagePvpEligibility(db,guild,accepted);if(!ctx)return null;
  accepted=ctx.accepted;
  assertPvpSafety(db,guild,[accepted.data.actor,ctx.edge.target]);
  const p=ctx.contract,key=`pvp-attack-intent:${hash([guild,accepted.record_key,p.record_key,p.data.terms_hash])}`;
  return db.getCityRecord(guild,"pvp_attack_intent",key)||db.saveCityRecord(guild,{kind:"pvp_attack_intent",key,status:"awaiting_native_attack",
    source_event:accepted.source_event,actor_key:accepted.data.actor,subject_key:accepted.data.actor,visibility:"character",
    data:{version:p.data.version,contract:p.record_key,terms_hash:p.data.terms_hash,accepted_intent:accepted.record_key,source_hash:accepted.data.source_hash,
      actor:accepted.data.actor,target:ctx.edge.target,session_id:p.data.session_id,scene:p.data.scene,edge:ctx.edge,
      authority:"Consent-bound adjudication input only. Native equipment/attack/defense/effect receipts still required; no dice or damage here."}});
  });
}
/** Pending is backed by this exact native input and current consent, never a model's resolution label. */
export function validateDamageAttackIntent(db,guild,key,{committed=false}={}){
  const row=db.getCityRecord(guild,"pvp_attack_intent",key),d=row?.data;
  if(!row||![3,4].includes(d.version)||row.status!=="awaiting_native_attack"||row.visibility!=="character"||row.subject_key!==d.actor
    ||key!==`pvp-attack-intent:${hash([guild,d.accepted_intent,d.contract,d.terms_hash])}`)fail("Exact native pending attack input required.");
  const {row:accepted}=(committed?historicalActionSource:consentAction)(db,guild,d.accepted_intent),ctx=validateDamagePvp(db,guild,d.contract,{committed});
  if(accepted.source_event!==row.source_event||accepted.data.source_hash!==d.source_hash||accepted.data.actor!==d.actor
    ||!(d.version===4?['attack','unarmed_attack','weapon_attack'].includes(accepted.data.operation):accepted.data.operation==='attack')||pvpTarget(db,guild,accepted)?.id!==d.target
    ||ctx.contract.data.version!==d.version||ctx.contract.data.terms_hash!==d.terms_hash||d.scene!==ctx.contract.data.scene||d.session_id!==ctx.contract.data.session_id
    ||![d.actor,d.target].every(c=>ctx.participants.some(p=>p.character===c))
    ||!ctx.terms.target_permissions.some(e=>hash(e)===hash(d.edge)&&e.actor===d.actor&&e.target===d.target))
    fail("Pending attack source, owner, edge or signed terms changed.");
  return {row,accepted,...ctx};
}
