/** Exact owner-authored replies extend native consent. Any other prose remains nonbinding and open-ended. */
import { personalCharacter, personalArc } from "./personal-continuity.js";
import { organizationRequest } from "./owned-community.js";
import { manageLongProject } from "./long-projects.js";
import { manageEvidence } from "./evidence-custody.js";
import { stateRevision } from "./ai-intents.js";
import { requireCitySource } from "./city-core.js";
import { indexWorldEvent } from "./city-calendar.js";
import { motivationKey } from "./simulation-motivation.js";

export function consentOffers(db,guild,user,characterId){
  const pc=personalCharacter(db,guild,user,characterId);
  const offers=["organization_request","arc_candidate","arc_beat","project_draft"].flatMap(kind=>
    db.characterContinuity(guild,pc.id,{kind,limit:100}).filter(row=>row.status==="pending")
      .map(row=>({...row,terms:row.data.terms||row.data.statement||row.data.invitation||JSON.stringify(row.data),revision:stateRevision(row)})));
  if(db.getCityCalendar(guild).flags.evidence_custody===true) for(const handout of db.listHandoutsFor(guild,user,{characterId:pc.id,limit:100})){
    const evidence=handout.metadata.evidence,pending=evidence?.pending;
    if(pending?.to!==`character:${pc.id}`) continue;
    offers.push({kind:"evidence_transfer",record_key:handout.id,source_event:pending.source_event,subject_key:pc.id,
      revision:stateRevision(evidence),terms:`Receive ${pending.copy} of ${handout.title}`,data:{copy:pending.copy,expires_minute:1000000001}});
  }
  return offers;
}
export function respondConsent(db,guild,user,{characterId,messageId,text,proposal,revision,authorize=true}){
  const flags=db.getCityCalendar(guild).flags;
  if(flags.natural_language!==true) throw new Error("Natural-language continuity is opt-in.");
  if(typeof text!=="string"||text.length>4000||!messageId) throw new Error("Bounded authenticated reply required.");
  const pc=personalCharacter(db,guild,user,characterId),key=`consent:${motivationKey([messageId,pc.id])}`;
  const prior=db.getCityRecord(guild,"consent_reply",key);if(prior) return prior;
  const offer=consentOffers(db,guild,user,pc.id).find(row=>row.record_key===proposal);
  if(!offer||offer.revision!==revision||db.getSimulationClock(guild).minute>=(offer.data.expires_minute??1000000001))
    throw new Error("Current owned proposal, exact revision and fictional expiry required.");
  requireCitySource(db,guild,offer.source_event);
  // Conservative whole-message authorization only. Questions, conditions, quoted speech and partial agreement never commit.
  const prefix=`Regarding ${proposal}${text.startsWith(`Regarding ${proposal}@`)?`@${revision}`:""}, `;
  const reply=text.startsWith(prefix)?text.slice(prefix.length):text;
  const accepted=authorize&&reply===`I agree to: ${offer.terms}`;
  const declined=authorize&&reply===`I decline: ${offer.terms}`;
  const deferred=authorize&&reply===`I defer: ${offer.terms}`;
  return db.transaction(()=>{
    const source=indexWorldEvent(db,guild,{key,kind:"owner_offer_reply",title:"Owner's exact reply to current terms",source_id:`player:${user}`,
      visibility:"character",subject_key:pc.id,details:{author:user,character_id:pc.id,text,proposal,revision,terms:offer.terms,
        authority:accepted||declined||deferred?"explicit_exact_owner_response":"nonbinding_question_counteroffer_or_ambiguity"}},user);
    let result=null;
    if(offer.kind==="organization_request"&&(accepted||declined)) result=organizationRequest(db,guild,user,
      {op:accepted?"confirm":"decline",key:proposal,character_id:pc.id,expected_revision:revision});
    if(["arc_candidate","arc_beat"].includes(offer.kind)&&(accepted||declined||deferred)) result=personalArc(db,guild,user,
      {op:offer.kind==="arc_candidate"?(accepted?"confirm":declined?"reject":"defer"):"respond",decision:accepted?"accept":declined?"decline":"defer",
        key:proposal,character_id:pc.id,expected_revision:revision});
    if(offer.kind==="project_draft"&&accepted) result=manageLongProject(db,guild,user,
      {op:"accept-proposal",key:proposal,character_id:pc.id,expected_revision:revision});
    if(offer.kind==="evidence_transfer"&&(accepted||declined)) result=manageEvidence(db,guild,{op:accepted?"accept":"decline",
      id:proposal,key,copy:offer.data.copy,source_event:offer.source_event,expected_revision:revision},user);
    return db.saveCityRecord(guild,{kind:"consent_reply",key,visibility:"character",subject_key:pc.id,source_event:source.event_key,
      status:result?"applied":"pending",data:{user,proposal,revision,terms:offer.terms,exact_reply:text,result_key:result?.record_key||result?.id||null,
        authority:result?"native_owner_response_not_automatic_world_effect":"nonbinding; current terms unchanged; clarify or revise proposal before accepting new terms"}});
  });
}
export async function routeConsentMessage({db,message,characterId,text=message.content,deliver}){
  if(message.author.bot||db.getCityCalendar(message.guild.id).flags.natural_language!==true||!characterId) return false;
  const match=/^Regarding ([^,@\n]+)(?:@([^,\n]+))?, ([\s\S]+)$/.exec(text);if(!match) return false;
  let committed=false;
  try{
    const offer=consentOffers(db,message.guild.id,message.author.id,characterId).find(row=>row.record_key===match[1]);
    if(!offer) return false;
    const row=respondConsent(db,message.guild.id,message.author.id,{characterId,messageId:message.id,text,proposal:offer.record_key,
      revision:match[2]||offer.revision,authorize:!!match[2]});
    committed=true;
    await deliver(row.status==="applied"?"Your exact response was recorded by the native owner-consent service. It does not spend resources, force attendance or bypass GM review.":
      "Your reply is preserved without agreement or changing the terms. What needs to be clarified or changed?");
  }catch{try{await deliver(committed?"Response saved; private delivery failed. Inspect your existing continuity inbox; do not repeat a world action.":
    "No consent was applied. The current terms or ownership need clarification. What did you intend?");}catch{/* Never retry a committed mutation after delivery failure. */}}
  return true;
}
