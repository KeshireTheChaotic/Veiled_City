/** Unified GM-private projections and native review adapters; player consent remains exclusively owner-authenticated. */
import { intentContext, delegationPolicy, stateRevision, reviewAiIntent, FEATURE_FLAGS } from "./ai-intents.js";
import { reviewSeedDraft } from "./seed-drafts.js";
import { reviewGoalTransition } from "./simulation-motivation.js";
import { reviewConsequence } from "./city-consequences.js";
import { manageGroup } from "./city-groups.js";
import { manageStrategy } from "./simulation-strategy.js";
import { cityAudit } from "./city-calendar.js";
import { reviewOrganization } from "./owned-community.js";
const REVIEW_KINDS=["ai_intent","goal_transition","consequence","group_transition","strategy","seed_draft","organization_request"];
export function reviewInbox(db,guild,{kind="ai_intent",page=1,status=""}={}){
  if(!REVIEW_KINDS.includes(kind)||!Number.isInteger(page)||page<1||page>10000) throw new Error("Known review kind and bounded page required.");
  const rows=db.listCityRecords(guild,{kind,status,includeGM:true,limit:21,offset:(page-1)*20});
  const policy=delegationPolicy(db,guild),flags=db.getCityCalendar(guild).flags;
  return {visibility:"gm",kind,page,has_more:rows.length>20,items:rows.slice(0,20).map(row=>({...row,expected_revision:stateRevision(row),
    recovery:"Refresh stale sources/policy, defer/reject, or use native GM review. Republish this inbox to repair delivery; never retry effects."})),
    eligibility:Object.entries(FEATURE_FLAGS).map(([feature,flag])=>({feature,enabled:flags[flag]===true,delegation:policy.mode,
      paused:db.isDirectorPaused(guild),expired:policy.expires_minute!==null&&db.getSimulationClock(guild).minute>=policy.expires_minute,
      allowed_operations:policy.allow.filter(op=>op.startsWith(`${feature}.`))})),
    operator_context:intentContext(db,guild),player_consent:"Only authenticated owner commands can establish PC arcs or phase consent."};
}
export function reviewWorkflow(db,guild,input,reviewer){
  if(!input.kind||input.kind==="ai_intent") return reviewAiIntent(db,guild,input,reviewer);
  if(!REVIEW_KINDS.includes(input.kind)) throw new Error("This workflow cannot approve player consent or unknown records.");
  const row=db.getCityRecord(guild,input.kind,input.key);
  if(!row||stateRevision(row)!==input.expected_revision) throw new Error("Current native review item revision required.");
  if(input.decision==="defer") return db.transaction(()=>{
    const after=db.saveCityRecord(guild,{...row,key:row.record_key,data:{...row.data,inbox_deferred_by:reviewer}});
    cityAudit(db,guild,"review_defer",row.record_key,row,after,reviewer);return after;
  });
  if(!["approve","reject"].includes(input.decision)) throw new Error("Native review supports approve/reject/defer; modifications use existing native commands.");
  if(input.kind==="seed_draft") return reviewSeedDraft(db,guild,input.key,input.decision,reviewer);
  if(input.kind==="organization_request") return reviewOrganization(db,guild,{kind:input.kind,key:input.key,op:input.decision==="approve"?"approve":"reject",expected_revision:input.expected_revision},reviewer);
  if(input.kind==="goal_transition") return reviewGoalTransition(db,guild,input,reviewer);
  if(input.kind==="consequence") return reviewConsequence(db,guild,input,reviewer);
  if(input.kind==="group_transition") return manageGroup(db,guild,{key:input.key,op:input.decision},reviewer);
  if(input.kind==="strategy") return manageStrategy(db,guild,{key:input.key,op:input.decision},reviewer);
}
