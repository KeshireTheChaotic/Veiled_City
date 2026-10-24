/** Existing world appointments/obligations. Native owner-consent proof is injected; scheduling never establishes presence. */
import {cityObject,cityKey,cityInteger,cityAudit,scheduleCityEvent} from './city-calendar.js';
import {requireCitySource,cityStrings} from './city-source.js';
export function createWorldCommitments({hasOwnerConsent,activeCityProxy}){
if(typeof hasOwnerConsent!=='function'||typeof activeCityProxy!=='function')throw new TypeError('World commitment consent/control capabilities required');
function establishCommitment(db,guildId,input,actorId){
  cityObject(input);const key=cityKey(input.key),existing=db.getCityRecord(guildId,"commitment",key);
  if(existing&&input.op==="cancel") return db.transaction(()=>{
    const obligation=db.getSimulationRecord(guildId,existing.data.obligation_id);
    if(obligation) db.putSimulationRecord(guildId,{...obligation,kind:"obligation",entityKey:obligation.entity_key,status:"forgiven",data:obligation.data});
    const schedule=db.getCitySchedule(guildId,`commitment:${key}`);
    if(schedule?.status==="scheduled") scheduleCityEvent(db,guildId,{key:schedule.schedule_key,op:"cancel"},actorId);
    const after=db.saveCityRecord(guildId,{...existing,key,status:"cancelled",data:{...existing.data,cancelled_by:actorId}});
    cityAudit(db,guildId,"commitment_cancel",key,existing,after,actorId);return after;
  });
  if(existing) return existing;
  if(input.op==="cancel"){
    const offer=db.getCityRecord(guildId,"commitment_offer",key);
    if(!offer) throw new Error("Commitment or invitation not found.");
    return db.transaction(()=>{const after=db.saveCityRecord(guildId,{...offer,key,status:"cancelled"});cityAudit(db,guildId,"commitment_offer_cancel",key,offer,after,actorId);return after;});
  }
  requireCitySource(db,guildId,input.source_event);
  if(!["appointment","promise","social","supernatural"].includes(input.type)) throw new Error("Explicit commitment type required.");
  cityKey(input.terms);cityStrings(input.participants);cityInteger(input.start);cityInteger(input.end);
  if(input.end<=input.start) throw new Error("Commitment must have positive duration.");
  let consentOffer=null;
  if(db.getCityCalendar(guildId).flags.natural_language===true&&input.participants.some(actor=>actor.startsWith("character:"))){
    if(Object.keys(input).some(field=>!["key","source_event","type","terms","participants","start","end","location_key","accepted_by","op"].includes(field)))
      throw new Error("Closed meeting terms required; no hidden effects or caller-owned consent.");
    for(const actor of input.participants){
      if(actor.startsWith("character:")?db.getCharacter(actor.slice(10))?.guild_id!==guildId:!actor.startsWith("npc:")||!db.getNpcProfile(guildId,actor.slice(4)))
        throw new Error("Actual established invitation participants required.");
      if(actor.startsWith("npc:")&&activeCityProxy(db,guildId,actor.slice(4))) throw new Error("Human-proxied NPC requires its own authored review; meeting remains uncommitted.");
    }
    const proposal=Object.fromEntries(["key","source_event","type","terms","participants","start","end","location_key"].filter(field=>input[field]!==undefined).map(field=>[field,input[field]]));
    consentOffer=db.getCityRecord(guildId,"commitment_offer",key);
    if(!consentOffer) return db.transaction(()=>{
      const after=db.saveCityRecord(guildId,{kind:"commitment_offer",key,status:"pending",source_event:input.source_event,
        data:{proposal,authority:"Nonbinding invitation; actual current owner receipts required, never arrival or spending."}});
      cityAudit(db,guildId,"commitment_offer",key,null,after,actorId);return after;
    });
    if(consentOffer.status!=="pending"||JSON.stringify(consentOffer.data.proposal)!==JSON.stringify(proposal)) throw new Error("Invitation closed or terms changed; propose fresh terms under a new key.");
    const verified=[];
    for(const actor of input.participants.filter(value=>value.startsWith("character:"))){
      const pc=db.getCharacter(actor.slice(10));if(!hasOwnerConsent(db,guildId,consentOffer,pc.id,pc.owner_user_id))
        throw new Error("Every current actual owner must authorize the exact invitation terms/revision; supplied accepted_by cannot bind PCs.");
      verified.push(pc.owner_user_id);
    }
    input={...input,accepted_by:verified};
  }
  for(const actor of input.participants){
    if(actor.startsWith("character:")){
      const character=db.getCharacter(actor.slice(10));
      if(character?.guild_id!==guildId||!character.owner_user_id||!input.accepted_by?.includes(character.owner_user_id))
        throw new Error("PC commitment needs its owner's explicit acceptance; no inferred consent.");
    }else if(actor.startsWith("npc:")&&!db.getNpcProfile(guildId,actor.slice(4))) throw new Error("NPC participant not found.");
    else if(!actor.startsWith("npc:")&&!actor.startsWith("character:")) throw new Error("Unsupported commitment actor.");
    if(db.overlappingCommitment(guildId,actor,input.start,input.end))
      throw new Error("Conflicting commitment requires explicit cancellation or delegation first.");
  }
  return db.transaction(()=>{
    const obligation=db.putSimulationRecord(guildId,{kind:"obligation",entityKey:input.participants[0],data:{content:input.terms,
      debtor:input.participants[0],creditor:input.participants[1]||"entity:appointment",commitment_type:input.type,accepted_by:input.accepted_by||[]}});
    scheduleCityEvent(db,guildId,{key:`commitment:${key}`,title:input.terms.slice(0,160),due_minute:input.start,invitees:input.participants});
    const after=db.saveCityRecord(guildId,{kind:"commitment",key,source_event:input.source_event,location_key:input.location_key||"",
      data:{...input,obligation_id:obligation.id}});
    if(consentOffer) db.saveCityRecord(guildId,{...consentOffer,key,status:"accepted",data:{...consentOffer.data,reviewed_by:actorId,commitment:key}});
    cityAudit(db,guildId,"commitment",key,null,after,actorId);return after;
  });
}
return Object.freeze({establishCommitment});
}
