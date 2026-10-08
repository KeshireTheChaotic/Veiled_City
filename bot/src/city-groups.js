/** Reviewed community lifecycle over existing communities; membership grants no knowledge, consent, allegiance, debts or resources. */
import { cityObject, cityKey, cityAudit } from "./city-calendar.js";
import { requireCitySource } from "./city-core.js";
import { updateCityCivic } from "./city-civic.js";
import { activeCityProxy, assertNpcAvailability } from "./city-constraints.js";
import { motivationKey } from "./simulation-motivation.js";
import { UserInputError, StateConflictError } from "./errors.js";
const playerCommunity=(db,guild,key)=>db.listCityRecords(guild,{kind:"community_membership",actor:`community:${key}`,status:"active",includeGM:true,limit:1}).length>0;
function protectPlayerCommunity(db,guild,data){
  if(["join","dissolve"].includes(data.operation)&&playerCommunity(db,guild,data.group_key)
    ||data.operation==="merge"&&(data.from_groups||[]).some(key=>playerCommunity(db,guild,key)))
    throw new StateConflictError("Player-participating community changes require the explicit owner workflow; NPC votes cannot appoint staff or dissolve it.");
}
export function manageGroup(db,guild,input,actorId){
  cityObject(input);if(db.getCityCalendar(guild).flags.emergent_groups!==true) throw new StateConflictError("Emergent groups are opt-in.");
  const key=cityKey(input.key),before=db.getCityRecord(guild,"group_transition",key),op=input.op||"propose";
  if(op==="propose"){
    if(before) return before;requireCitySource(db,guild,input.source_event);cityKey(input.group_key);cityKey(input.name);
    const operation=input.operation||"form",members=input.members;
    if(!["form","join","leave","dissolve","split","merge"].includes(operation)||!Array.isArray(members)
      ||members.length<1||members.length>20||new Set(members).size!==members.length) throw new UserInputError("Bounded group lifecycle/members required.");
    for(const npc of members) if(!db.getNpcProfile(guild,npc)||activeCityProxy(db,guild,npc)) throw new StateConflictError("Existing non-proxied NPC members required; no PCs.");
    for(const npc of members) assertNpcAvailability(db,guild,npc,{});
    const group=db.getCityRecord(guild,"community",input.group_key);
    if(["join","leave","dissolve"].includes(operation)?group?.status!=="active":!!group) throw new StateConflictError("Group existence conflicts with the operation.");
    if(["leave","dissolve"].includes(operation)&&members.some(member=>!group.data.members.includes(member))) throw new StateConflictError("Departing NPC must already be a member.");
    const sources=input.from_groups||[];
    protectPlayerCommunity(db,guild,{operation,group_key:input.group_key,from_groups:sources});
    if(!Array.isArray(sources)||sources.length>4||sources.some(source=>db.getCityRecord(guild,"community",source)?.status!=="active"))
      throw new StateConflictError("Source groups must be established active communities.");
    if(["split","merge"].includes(operation)&&sources.length<(operation==="merge"?2:1)) throw new StateConflictError("Split/merge source groups required.");
    if(["split","merge"].includes(operation)&&members.some(member=>!sources.some(source=>db.getCityRecord(guild,"community",source).data.members.includes(member))))
      throw new StateConflictError("Schism members must belong to the original group.");
    const roles=cityObject(input.roles||{}),projects=input.shared_projects||[];
    if(Object.entries(roles).some(([member,role])=>!members.includes(member)||typeof role!=="string"||role.length>100)
      ||!Array.isArray(projects)||projects.length>8||projects.some(project=>!db.getCityRecord(guild,"project",project)))
      throw new UserInputError("Bounded member roles and established shared projects required.");
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{kind:"group_transition",key,status:"pending",source_event:input.source_event,
        data:{group_key:input.group_key,name:input.name,operation,members,from_groups:sources,responses:{},before:group,
          source_groups:sources.map(source=>db.getCityRecord(guild,"community",source)),roles,
          shared_projects:projects,major:["split","merge","dissolve"].includes(operation),authority:"proposal_only"}});
      cityAudit(db,guild,"group_proposed",key,null,after,actorId);return after;
    });
  }
  if(!before) throw new StateConflictError("Group proposal not found.");
  if(before.status!=="pending") return before;
  if(op!=="reject") requireCitySource(db,guild,before.source_event);
  if(op==="respond"){
    if(before.data.responses[input.member]) return before;
    assertNpcAvailability(db,guild,input.member,{});
    if(!before.data.members.includes(input.member)||activeCityProxy(db,guild,input.member)||!["accept","decline"].includes(input.decision))
      throw new StateConflictError("Explicit non-proxied candidate response required.");
    return db.transaction(()=>{
      const after=db.saveCityRecord(guild,{...before,key,data:{...before.data,responses:{...before.data.responses,
        [input.member]:{decision:input.decision,recorded_by:actorId,reason:input.reason||"",information_key:input.information_key||""}}}});
      cityAudit(db,guild,"group_response",key,before,after,actorId);return after;
    });
  }
  if(!["approve","reject"].includes(op)) throw new UserInputError("Use propose, respond, approve or reject.");
  return db.transaction(()=>{
    if(op==="approve"){
      const data=before.data,current=db.getCityRecord(guild,"community",data.group_key);
      protectPlayerCommunity(db,guild,data);
      if(JSON.stringify(current)!==JSON.stringify(data.before)) throw new StateConflictError("Group changed; propose a new transition.");
      for(const source of data.source_groups) if(JSON.stringify(db.getCityRecord(guild,"community",source.record_key))!==JSON.stringify(source))
        throw new StateConflictError("Source group changed; reconcile before approval.");
      if(data.members.some(member=>!data.responses[member]||activeCityProxy(db,guild,member))) throw new StateConflictError("Every candidate must explicitly respond; proxies retain control.");
      for(const member of data.members) assertNpcAvailability(db,guild,member,{});
      const accepted=data.members.filter(member=>data.responses[member].decision==="accept");
      if(!accepted.length) throw new StateConflictError("No accepted members; reject the proposal instead.");
      if(["form","split","merge"].includes(data.operation)&&accepted.length<2) throw new StateConflictError("At least two consenting NPCs required for a group.");
      if(data.operation==="dissolve"){
        if(data.members.length!==current.data.members.length||accepted.length!==data.members.length)
          throw new StateConflictError("Dissolution requires explicit responses from all members; dissent requires a schism proposal.");
        db.saveCityRecord(guild,{...current,key:data.group_key,status:"dissolved"});
      }else{
        const members=data.operation==="join"?[...new Set([...current.data.members,...accepted])]
          :data.operation==="leave"?current.data.members.filter(member=>!accepted.includes(member)):accepted;
        updateCityCivic(db,guild,{kind:"community",key:data.group_key,source_event:before.source_event,
          data:current?{...current.data,members}:{name:data.name,capacity:0,members,priorities:[],shared_history:[]}},actorId);
        if(["split","merge"].includes(data.operation)) for(const source of data.source_groups){
          const remaining=source.data.members.filter(member=>!accepted.includes(member));
          db.saveCityRecord(guild,{...source,key:source.record_key,status:remaining.length||playerCommunity(db,guild,source.record_key)?"active":"dissolved",data:{...source.data,members:remaining}});
        }
      }
    }
    const after=db.saveCityRecord(guild,{...before,key,status:op==="approve"?"approved":"rejected",data:{...before.data,reviewed_by:actorId}});
    cityAudit(db,guild,"group_review",key,before,after,actorId);return after;
  });
}
export function proposeContactGroup(db,guild){
  if(db.getCityCalendar(guild).flags.emergent_groups!==true||db.isDirectorPaused(guild)) return null;
  const contacts=db.listCityRecords(guild,{kind:"conversation",includeGM:true,limit:20}).filter(row=>row.data.outcome==="contacted");
  const members=[...new Set(contacts.flatMap(row=>row.data.participants))].sort().slice(0,3);
  const related=contacts.filter(row=>row.data.participants.every(member=>members.includes(member)));
  if(members.length!==3||related.length<3||new Set(related.flatMap(row=>row.data.participants)).size!==3) return null;
  const key=`group:${motivationKey(members)}`;
  try{return manageGroup(db,guild,{key,op:"propose",operation:"form",group_key:`working-${motivationKey(members)}`,
    name:"Proposed working group",members,source_event:related[0].source_event},"group_opportunity");}catch{return null;}
}
