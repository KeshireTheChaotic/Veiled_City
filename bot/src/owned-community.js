/** Explicit owner requests materialize through native civic/project services; no AI votes, PC costs or inferred membership. */
import { cityObject, cityKey, cityAudit, indexWorldEvent } from "./city-calendar.js";
import { personalCharacter } from "./personal-continuity.js";
import { requireCitySource, requireCityRecord } from "./city-core.js";
import { updateCityCivic } from "./city-civic.js";
import { manageLongProject } from "./long-projects.js";
import { actorSource, motivationKey } from "./simulation-motivation.js";
import { stateRevision } from "./ai-intents.js";
const kinds=["found","join","property","staff","plan","project"];
function knownSource(db,guild,pc,key){
  const source=requireCitySource(db,guild,key);
  if(!["public","party"].includes(source.visibility)&&!(source.visibility==="character"&&source.subject_key===pc.id)
    &&!(source.visibility==="player"&&source.subject_key===pc.owner_user_id)) throw new Error("Request source must be known to this character.");
  return source;
}
function membership(db,guild,pc,community){
  const row=db.getCityRecord(guild,"community_membership",`${pc.id}:${community}`);
  if(row?.subject_key!==pc.id||row.status!=="active") throw new Error("Explicit established membership required; no secret joining.");
  requireCitySource(db,guild,row.source_event);
  requireCityRecord(db,guild,"community",community);return row;
}
export function inviteOrganization(db,guild,input,actor){
  if(db.getCityCalendar(guild).flags.player_organizations!==true) throw new Error("Player organizations are opt-in.");
  const character=db.getCharacter(input.character_id);
  if(character?.guild_id!==guild||!character.owner_user_id||!["active","guest","reserve"].includes(character.status)) throw new Error("Existing eligible owned campaign character required.");
  const pc=personalCharacter(db,guild,character.owner_user_id,character.id);knownSource(db,guild,pc,input.source_event);
  if(!kinds.includes(input.request)||typeof input.title!=="string"||!input.title.trim()||input.title.length>160
    ||typeof input.terms!=="string"||!input.terms.trim()||input.terms.length>500
    ||!Number.isInteger(input.duration_minutes)||input.duration_minutes<0||input.duration_minutes>525600) throw new Error("Bounded proposed terms required; no automatic resources or contracts.");
  for(const field of ["target_key","community_key","commitment_key","information_key"]) if(typeof input[field]!=="string"||input[field].length>160) throw new Error("Bounded request references required.");
  const key=`${pc.id}:${cityKey(input.key)}`,prior=db.getCityRecord(guild,"organization_request",key);if(prior) return prior;
  const recent=db.characterContinuity(guild,pc.id,{kind:"organization_request",limit:50});
  if(actor!==pc.owner_user_id&&recent.some(row=>row.data.request===input.request&&row.data.title===input.title&&row.data.target_key===input.target_key
    &&db.getSimulationClock(guild).minute-row.minute<1440)) throw new Error("Repeated invitation cooldown preserves the player's decline or silence.");
  if(recent.filter(row=>["pending","consented"].includes(row.status)).length>=5) throw new Error("Resolve existing owner proposals before adding more (maximum five pending).");
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{kind:"organization_request",key,status:"pending",visibility:"character",subject_key:pc.id,source_event:input.source_event,
      data:{request:input.request,title:input.title,terms:input.terms,target_key:input.target_key,community_key:input.community_key,
        commitment_key:input.commitment_key,information_key:input.information_key,duration_minutes:input.duration_minutes,
        proposed_by:actor,expires_minute:db.getSimulationClock(guild).minute+1440,authority:"Invitation only; no PC decision, spending, membership or world effect."}});
    cityAudit(db,guild,"organization_invitation",key,null,after,actor);return after;
  });
}
export function organizationRequest(db,guild,user,input){
  cityObject(input);if(db.getCityCalendar(guild).flags.player_organizations!==true) throw new Error("Player organizations are opt-in.");
  const pc=personalCharacter(db,guild,user,input.character_id);
  if(input.op==="propose"){
    if(Object.keys(input).some(key=>!["op","key","character_id","source_event","request","title","terms","target_key","community_key","commitment_key","information_key","duration_minutes"].includes(key)))
      throw new Error("Closed owner proposal required; no supplied acceptance or authority.");
    return inviteOrganization(db,guild,{target_key:"",community_key:"",commitment_key:"",information_key:"",duration_minutes:0,...input,character_id:pc.id},user);
  }
  if(Object.keys(input).some(key=>!["op","key","character_id","expected_revision"].includes(key))||!["confirm","decline"].includes(input.op))
    throw new Error("Explicit owner confirmation/decline and exact revision required.");
  const key=cityKey(input.key),row=db.getCityRecord(guild,"organization_request",key);
  if(row?.subject_key!==pc.id||!["pending","consented"].includes(row.status)||stateRevision(row)!==input.expected_revision) throw new Error("Current owned proposal required.");
  if(input.op==="confirm"){
    knownSource(db,guild,pc,row.source_event);
    if(db.getSimulationClock(guild).minute>=row.data.expires_minute) throw new Error("Request expired in fictional time; propose fresh terms.");
  }
  return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{...row,key,status:input.op==="confirm"?"consented":"declined",data:{...row.data,confirmed_by:input.op==="confirm"?user:null}});
    cityAudit(db,guild,"organization_owner_response",key,row,after,user);return after;
  });
}
export function reviewOrganization(db,guild,input,reviewer){
  if(db.getCityCalendar(guild).flags.player_organizations!==true) throw new Error("Player organizations are opt-in.");
  if(Object.keys(input).some(key=>!["kind","key","op","expected_revision"].includes(key))||!["approve","reject"].includes(input.op)) throw new Error("Closed human review required; terms cannot change after confirmation.");
  const row=db.getCityRecord(guild,"organization_request",cityKey(input.key));
  if(!row||stateRevision(row)!==input.expected_revision||!["pending","consented"].includes(row.status)) throw new Error("Current request revision required.");
  const pc=db.getCharacter(row.subject_key),p=row.data;
  if(input.op==="approve"){
    if(row.status!=="consented"||pc?.owner_user_id!==p.confirmed_by) throw new Error("Actual owner's explicit confirmation required before world effects.");
    if(!["active","guest","reserve"].includes(pc.status)) throw new Error("Retired/dead ownership needs an explicit human succession decision.");
    personalCharacter(db,guild,p.confirmed_by,pc.id);knownSource(db,guild,pc,row.source_event);
    if(db.getSimulationClock(guild).minute>=p.expires_minute) throw new Error("Owner request expired; no absent or stale assent.");
  }
  return db.transaction(()=>{
    let result=null;
    if(input.op==="approve"){
      const key=`owner-world:${motivationKey(row.record_key)}`;
      const event=indexWorldEvent(db,guild,{key,source_id:row.record_key,kind:"owner_request_review",title:"Human-reviewed explicitly confirmed owner request",
        visibility:"character",subject_key:pc.id,details:{request:row.record_key,reviewer,owner:p.confirmed_by}},reviewer);
      if(p.request==="found"){
        result=updateCityCivic(db,guild,{kind:"community",key,source_event:event.event_key,data:{name:p.title,capacity:0,members:[],priorities:[p.terms],shared_history:[]}},reviewer);
      }else if(p.request==="join") result=requireCityRecord(db,guild,"community",p.target_key);
      else if(p.request==="property"){
        const property=requireCityRecord(db,guild,"property",p.target_key);
        result=updateCityCivic(db,guild,{kind:"property",key,source_event:event.event_key,data:{location:property.data.location,claim_type:"possession",claimant:`character:${pc.id}`,
          terms:"Owner-confirmed claim proposal; competing claims preserved; no automatic title.",validity:"disputed",domain:"mundane"}},reviewer);
      }else{
        const member=membership(db,guild,pc,p.community_key),community=requireCityRecord(db,guild,"community",p.community_key);
        if(p.request==="staff"){
          if(member.data.role!=="founder") throw new Error("Staffing requires explicit organizational authority, not ordinary membership.");
          const commitment=requireCityRecord(db,guild,"commitment",p.commitment_key);
          if(!commitment.data.participants.includes(`npc:${p.target_key}`)||commitment.data.terms!==`staff:${p.community_key}`
            ||db.getSimulationClock(guild).minute>=commitment.data.end) throw new Error("Actual NPC staffing agreement required; invitation is not acceptance.");
          actorSource(db,guild,{actor_type:"npc",actor_key:p.target_key,information_key:p.information_key,source_event:commitment.source_event},{requireResources:false});
          result=updateCityCivic(db,guild,{kind:"community",key:p.community_key,source_event:event.event_key,data:{...community.data,members:[...new Set([...community.data.members,p.target_key])]}},reviewer);
        }else if(p.request==="plan") result=updateCityCivic(db,guild,{kind:"history",key,source_event:event.event_key,
          data:{title:p.title,summary:p.terms,preserves_contradictions:true,source_events:[row.source_event,event.event_key]}},reviewer);
        else result=manageLongProject(db,guild,p.confirmed_by,{op:"create",key,source_event:event.event_key,character_id:pc.id,title:p.title,participants:[pc.id],
          phases:[{key:"initiative",title:p.title,duration_minutes:p.duration_minutes,requires:[],prerequisites:[event.event_key]}],strict_consent:true});
      }
      if(["found","join"].includes(p.request)){
        const prior=db.getCityRecord(guild,"community_membership",`${pc.id}:${result.record_key}`);
        db.saveCityRecord(guild,{kind:"community_membership",key:`${pc.id}:${result.record_key}`,visibility:"character",subject_key:pc.id,actor_key:`community:${result.record_key}`,
          source_event:event.event_key,data:{community_key:result.record_key,role:prior?.data.role==="founder"||p.request==="found"?"founder":"member",request:row.record_key,authority:"Explicit participation; no AI votes or PC resource authority."}});
      }
    }
    const after=db.saveCityRecord(guild,{...row,key:row.record_key,status:input.op==="approve"?"approved":"rejected",data:{...p,reviewed_by:reviewer,
      result:result?{kind:result.kind,key:result.record_key}:null}});
    cityAudit(db,guild,"organization_review",row.record_key,row,after,reviewer);return after;
  });
}
export function organizationInbox(db,guild,user){
  const pc=personalCharacter(db,guild,user);
  return {character_id:pc.id,requests:db.characterContinuity(guild,pc.id,{kind:"organization_request",limit:50}).map(row=>({...row,expected_revision:stateRevision(row)})),
    communities:db.characterContinuity(guild,pc.id,{kind:"community_membership",limit:50}).filter(row=>row.status==="active").map(row=>({
      key:row.data.community_key,role:row.data.role,name:db.getCityRecord(guild,"community",row.data.community_key)?.data.name||"Historical community"})),
    guidance:"No inferred joining, votes, contracts, NPC appointments, personal funds or retirement succession. GM adjudication and explicit owner decisions remain required."};
}
