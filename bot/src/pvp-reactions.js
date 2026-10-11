/** Source-backed hazard reactions during PvP reuse native owner roll requests; they never change an independent attack. */
import {createHash} from "node:crypto";
import {validatePvpAttackRoll} from "./pvp-attacks.js";
import {consentAction,completedActionSource} from "./action-consent.js";
import {personalCharacter} from "./personal-continuity.js";
import {prepareRollRequest,formatRollRequest,rollRevision} from "./roll-requests.js";
import {adjudicateRollSource,contributeRoll} from "./roll-collaboration.js";
const hash=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
function fail(message){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true});}
function closed(input,keys){if(!input||Object.keys(input).length!==keys.length||keys.some(k=>!(k in input)))fail("Closed native reaction fields required.");}
function facts(db,guild,input,{completed=false}={}){
  const parent=validatePvpAttackRoll(db,guild,input.attack_receipt),{row:accepted,principal,scene}=(completed?completedActionSource:consentAction)(db,guild,input.accepted_intent);
  const trigger=db.getWorldEvent(guild,input.trigger),ruling=db.getRulesRuling(guild,input.ruling),rule=trigger?.details.reaction_rule;
  const author=trigger?.source_id?.startsWith("gm:")?trigger.source_id.slice(3):null;
  if(!parent.contract.data.participants.some(p=>p.character===accepted.data.actor)||accepted.data.operation!=="reaction"
    ||accepted.data.type!=="roll"||!author||trigger?.status!=="active"||trigger.kind!=="environment_hazard"||trigger.source_kind!=="gm"
    ||trigger.session_id!==scene.session_id||trigger.scene!==scene.key||trigger.location_key!==parent.contract.data.location_key
    ||!db.ownerAuthoredSource(guild,trigger.event_key,author)||!ruling?.created_by||ruling.created_by!==author
    ||!rule||rule.trait!==input.trait||rule.ruling!==input.ruling||!Number.isSafeInteger(rule.difficulty)||rule.difficulty<1||rule.difficulty>100
    ||!["partial","none"].includes(rule.normal_success)||rule.critical_success!=="none")
    fail("Exact human-established hazard trigger/rule and current owner-authored reaction source required; no free defender roll.");
  return {parent,accepted,principal,trigger,ruling,rule,scene};
}
function proof(db,guild,key){
  const row=db.getCityRecord(guild,"pvp_reaction_offer",key),d=row?.data;
  if(row?.visibility!=="gm"||d?.version!==1||d.digest!==hash(d.binding)||key!==`pvp-reaction:${hash([guild,d.binding.input.trigger,d.binding.character])}`)
    fail("Exact native reaction offer required.");
  const actual=facts(db,guild,d.binding.input,{completed:row.status==="resolved"});
  if(hash(actual.trigger)!==d.binding.trigger_hash||hash(actual.ruling)!==d.binding.ruling_hash
    ||actual.principal.revision!==d.binding.principal||actual.principal.user!==d.binding.owner||row.source_event!==actual.trigger.event_key)
    fail("Native hazard source/rule/owner changed; do not reroll.");
  const request=db.getCityRecord(guild,"roll_request",d.binding.request);
  if(!request||request.subject_key!==d.binding.character||request.data.kind!=="reaction"||hash(request.data.input)!==d.binding.request_input_hash)
    fail("Exact native owner reaction request changed.");
  return {...actual,row,request};
}
export function preparePvpReaction(db,guild,user,input,{gm=false,interactionId}={}){
  if(!gm||!user||!interactionId)fail("Authenticated GM must review the actual source-triggered rule.");
  closed(input,["attack_receipt","accepted_intent","trigger","ruling","trait","modifier_keys"]);
  return db.transaction(()=>{
    const f=facts(db,guild,input),key=`pvp-reaction:${hash([guild,input.trigger,f.accepted.data.actor])}`,old=db.getCityRecord(guild,"pvp_reaction_offer",key);
    if(old){proof(db,guild,key);if(hash(old.data.binding.input)!==hash(input))fail("Hazard reaction already staged; no second declaration/reroll.");return old;}
    const difficulty=adjudicateRollSource(db,guild,{key:`${key}:difficulty`,character_id:f.accepted.data.actor,kind:"difficulty",ruling_key:input.ruling,
      data:{declaration:f.accepted.source_event,value:f.rule.difficulty}},user);
    const requestInput={source_event:f.accepted.source_event,accepted_intent:f.accepted.record_key,character_id:f.accepted.data.actor,
      trait:input.trait,kind:"reaction",adjudication:`Human-reviewed hazard ${input.trigger}; rule ${input.ruling}. Not a second PC attack defense.`,
      modifier_keys:input.modifier_keys,difficulty_source:difficulty.event_key,private_result:true};
    const request=prepareRollRequest(db,guild,requestInput,user);
    if(hash(request.data.input)!==hash(requestInput)||request.status!=="pending")fail("Accepted reaction already belongs to different native mechanics; no replacement dice.");
    const binding={input,character:f.accepted.data.actor,owner:f.principal.user,principal:f.principal.revision,trigger_hash:hash(f.trigger),
      ruling_hash:hash(f.ruling),request:request.record_key,request_input_hash:hash(requestInput)};
    return db.saveCityRecord(guild,{kind:"pvp_reaction_offer",key,status:"pending",source_event:f.trigger.event_key,visibility:"gm",
      data:{version:1,binding,digest:hash(binding)}});
  });
}
export function reviewPvpReaction(db,guild,user,key){
  return db.transaction(()=>{
    const f=proof(db,guild,key),b=f.row.data.binding;personalCharacter(db,guild,user,b.character);
    if(user!==b.owner)fail("Current affected owner must review the reaction.");
    db.saveCityRecord(guild,{kind:"pvp_reaction_review",key:`${key}:review`,source_event:f.row.source_event,status:"reviewed",visibility:"character",subject_key:b.character,
      data:{user,digest:f.row.data.digest}});
    return {offer:key,digest:f.row.data.digest,text:formatRollRequest(f.request,{user}),
      instruction:"This reaction addresses only the established hazard. It cannot negate the separate PC attack or mint damage/resources. Critical avoids remaining normal-success hazard effects; any actual negative effect still requires its own native cause."};
  });
}
export function rollPvpReaction(db,guild,user,input,{interactionId,rng}={}){
  closed(input,["offer","expected_revision"]);if(!interactionId)fail("Authenticated owner reaction interaction required.");
  return db.transaction(()=>{
    const f=proof(db,guild,input.offer),b=f.row.data.binding;personalCharacter(db,guild,user,b.character);
    if(user!==b.owner||input.expected_revision!==f.row.data.digest)fail("Exact current reaction owner/revision required.");
    const prior=db.getCityRecord(guild,"pvp_reaction_roll_receipt",`${input.offer}:roll`);
    if(prior){
      const native=db.getSavedRoll(guild,prior.data.roll_id);
      if(prior.status!=="resolved"||prior.visibility!=="gm"||prior.data.offer!==input.offer||prior.source_event!==f.row.source_event
        ||native?.roll_type!=="reaction"||native.character_id!==b.character||native.discord_user_id!==user
        ||hash(native.payload)!==hash({...prior.data.result,request:b.request,revision:prior.data.request_revision}))fail("Native saved reaction receipt ancestry required.");
      return prior;
    }
    const review=db.getCityRecord(guild,"pvp_reaction_review",`${input.offer}:review`);
    if(review?.status!=="reviewed"||review.data.user!==user||review.data.digest!==f.row.data.digest||review.subject_key!==b.character
      ||review.visibility!=="character"||review.source_event!==f.row.source_event)fail("Private exact reaction review required before owner dice.");
    const revision=rollRevision(f.request),request=contributeRoll(db,guild,user,{key:`${input.offer}:operation`,op:"roll",request:b.request,expected_revision:revision},{rng});
    const r=request.data.result,success=r.duality==="Critical"||r.total>=f.rule.difficulty;
    const outcome=r.duality==="Critical"?"critical_avoids_effect":success?`success_${f.rule.normal_success}_effect`:"failure_effect_pending";
    const receipt=db.saveCityRecord(guild,{kind:"pvp_reaction_roll_receipt",key:`${input.offer}:roll`,status:"resolved",source_event:f.row.source_event,visibility:"gm",
      data:{version:1,offer:input.offer,roll_id:request.data.roll_id,result:r,request_revision:revision,outcome,
        effect_authority:"Reaction outcome only; no automatic PC resource, attack hit/damage, movement or narration change."}});
    db.saveCityRecord(guild,{...f.row,key:f.row.record_key,status:"resolved"});return receipt;
  });
}
