/** Reviewable bargaining revisions; explicit consent and bounded existing resources, never automatic PC spend. */
import { cityObject, cityKey, cityInteger, cityAudit } from "./city-calendar.js";
import { requireCitySource, requireCityRecord } from "./city-core.js";
import { activeCityProxy, assertInstitutionDelegation } from "./city-constraints.js";
import { actorState } from "./simulation.js";
function participants(db,guildId,list,terms){
  if(!Array.isArray(list)||list.length<2||list.length>6||new Set(list.map(p=>`${p.type}:${p.key}`)).size!==list.length) throw new Error("Two to six distinct established participants required.");
  for(const p of list){
    cityKey(p.key);
    if(p.type==="character"){
      const c=db.getCharacter(p.key);if(c?.guild_id!==guildId||c.status!=="active") throw new Error("Active campaign PC required.");
    }else if(p.type==="npc"||p.type==="faction"){
      if(p.type==="npc"&&(!db.getNpcProfile(guildId,p.key)||activeCityProxy(db,guildId,p.key))) throw new Error("Human-proxied or missing NPC cannot be committed.");
      const state=db.getSimulationEntity(guildId,p.type,p.key)?.state;
      if(!state||state.removed||["dead","removed"].includes(state.status)) throw new Error("Participant is unavailable.");
      const goal=p.type==="npc"?db.listNpcGoals(guildId,p.key,{status:"active",limit:100}).find(g=>g.goal_key===p.goal_key)
        :db.getSimulationRecord(guildId,p.goal_key);
      if(!goal||p.type==="faction"&&(goal.kind!=="goal"||goal.status!=="active"||goal.entity_key!==`faction:${p.key}`)) throw new Error("Established bargaining goal required.");
      if(p.type==="npc"&&goal.acceptable_methods.length&&!goal.acceptable_methods.includes("negotiate")) throw new Error("Goal does not authorize negotiation.");
      for(const info of p.awareness_keys||[]) if(p.type!=="npc"||!db.getNpcKnowledge(guildId,p.key,info)) throw new Error("Participant lacks cited awareness.");
    }else if(p.type==="institution"){
      const inst=requireCityRecord(db,guildId,"institution",p.key);
      if(!inst.data.procedures.includes("negotiate_request")||!inst.data.jurisdictions.includes(terms.jurisdiction)) throw new Error("Institution lacks bargaining authority/jurisdiction.");
      assertInstitutionDelegation(db,guildId,inst,{type:"negotiate_request",personnel_key:p.personnel_key});
      for(const report of p.awareness_keys||[]) if(db.getCityRecord(guildId,"report",report)?.actor_key!==p.key) throw new Error("Institution lacks the report.");
    }else throw new Error("Unknown bargaining participant type.");
  }
}
function validateTerms(db,guildId,list,terms){
  cityObject(terms);cityKey(terms.statement);cityInteger(terms.deadline);
  const allowed=["statement","deadline","jurisdiction","costs","major","supernatural","recognized_terms","obligation"];
  if(Object.keys(terms).some(key=>!allowed.includes(key))) throw new Error("Unsupported agreement effect; use an established reviewed workflow.");
  if(terms.deadline<db.getSimulationClock(guildId).minute) throw new Error("Agreement deadline has passed.");
  if(terms.supernatural===true&&terms.recognized_terms!==true) throw new Error("Supernatural terms require explicit recognized custom and consent.");
  participants(db,guildId,list,terms);
  if(!Array.isArray(terms.costs)||terms.costs.length>12) throw new Error("Bounded explicit resource costs required.");
  const totals=new Map();
  for(const cost of terms.costs){
    cityInteger(cost.amount,1,100);
    const p=list.find(p=>`${p.type}:${p.key}`===cost.party);if(!p||p.type==="character") throw new Error("No automatic PC expense or nonparticipant cost.");
    const resource=p.type==="institution"?cost.resource==="capacity":['influence','materials','information','manpower','leverage','favors'].includes(cost.resource);
    if(!resource) throw new Error("Unsupported agreement resource.");
    const key=`${cost.party}:${cost.resource}`;totals.set(key,(totals.get(key)||0)+cost.amount);
    const available=p.type==="institution"?requireCityRecord(db,guildId,"institution",p.key).data.capacity:actorState(db,guildId,p.type,p.key).resources[cost.resource];
    if(available<totals.get(key)) throw new Error("Participant cannot promise unavailable resources.");
  }
  if(terms.obligation){
    const o=cityObject(terms.obligation);cityKey(o.content);
    for(const endpoint of [o.debtor,o.creditor]) if(!list.some(p=>`${p.type}:${p.key}`===endpoint)) throw new Error("Obligation party is not a participant.");
  }
}
export function negotiateAgreement(db,guildId,input,actorId){
  cityObject(input);if(db.getCityCalendar(guildId).flags.negotiations!==true) throw new Error("Negotiations are opt-in.");
  const key=cityKey(input.key),step=cityKey(input.step),before=db.getCityRecord(guildId,"negotiation",key);
  if(before?.data.history.some(row=>row.step===step)) return before;
  requireCitySource(db,guildId,input.source_event);
  const op=input.op||"offer";
  if(!before&&op!=="offer") throw new Error("An offer must come first.");
  if(before&&["accepted","refused"].includes(before.status)) throw new Error("Negotiation is closed.");
  const list=before?.data.participants||input.participants;
  const terms=["offer","counteroffer","concede"].includes(op)?input.terms:before?.data.terms;
  validateTerms(db,guildId,list,terms);
  if(!["offer","counteroffer","concede","refuse","approve","accept"].includes(op)||before&&op==="offer") throw new Error("Invalid bargaining transition.");
  if(op==="accept"){
    if(terms.major===true&&before.data.approved_revision!==before.data.revision) throw new Error("Major agreement requires review before any expense.");
    for(const p of list){
      const identity=p.type==="character"?db.getCharacter(p.key).owner_user_id:`${p.type}:${p.key}`;
      if(!identity||input.accepted_by?.[`${p.type}:${p.key}`]!==identity) throw new Error("Explicit acceptance by every authorized participant/PC owner required.");
    }
  }
  return db.transaction(()=>{
    let obligationId=null;
    if(op==="accept"){
      for(const cost of terms.costs){
        const p=list.find(p=>`${p.type}:${p.key}`===cost.party);
        if(p.type==="institution"){
          const old=requireCityRecord(db,guildId,"institution",p.key);
          const next=db.saveCityRecord(guildId,{...old,key:old.record_key,data:{...old.data,capacity:old.data.capacity-cost.amount}});
          cityAudit(db,guildId,"agreement_resource",p.key,old,next,actorId);
        }else{
          const old=actorState(db,guildId,p.type,p.key),next={...old,resources:{...old.resources,[cost.resource]:old.resources[cost.resource]-cost.amount}};
          db.setSimulationEntity(guildId,p.type,p.key,next);cityAudit(db,guildId,"agreement_resource",p.key,old,next,actorId);
        }
      }
      if(terms.obligation) obligationId=db.putSimulationRecord(guildId,{kind:"obligation",entityKey:terms.obligation.debtor,
        data:{...terms.obligation,source_event:input.source_event,agreement:key,accepted_by:input.accepted_by,history:[]}}).id;
    }
    const revised=["offer","counteroffer","concede"].includes(op),revision=(before?.data.revision||0)+(revised?1:0);
    const data={...before?.data,participants:list,terms,revision,approved_revision:op==="approve"?revision:revised?null:before?.data.approved_revision,
      ...(op==="approve"?{approved_by:actorId}:{}),...(op==="accept"?{accepted_by:input.accepted_by,obligation_id:obligationId}:{}),
      history:[...(before?.data.history||[]),{step,op,revision,source_event:input.source_event,actor:actorId,terms:revised?terms:null}]};
    const after=db.saveCityRecord(guildId,{kind:"negotiation",key,status:op==="accept"?"accepted":op==="refuse"?"refused":terms.major?"pending":"offered",
      source_event:input.source_event,data});cityAudit(db,guildId,"negotiation",key,before,after,actorId);return after;
  });
}
