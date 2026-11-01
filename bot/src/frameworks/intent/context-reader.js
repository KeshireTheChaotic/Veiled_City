import {stateRevision} from '../../kernel/state-revision.js';
import {delegationPolicy} from './delegation-policy.js';
import {intentSessionScene} from './contracts/session-scene.js';
import {intentWorldOperations} from './contracts/world-operations.js';
import {intentKnowledgeMaintenance} from './contracts/knowledge-maintenance.js';
import {intentNativeEncounter} from './contracts/native-encounter.js';
import {intentWorldProjects} from './contracts/world-projects.js';
import {intentKnowledgeContext} from './contracts/knowledge-context.js';
const {sceneView}=intentSessionScene;
const {nativeWorldOperationCatalog}=intentWorldOperations;
const {reconcileHistory}=intentKnowledgeMaintenance;
const {encounterProposalContext}=intentNativeEncounter;
const {projectPhaseRevision}=intentWorldProjects;
const {planContext}=intentKnowledgeContext;
export function intentContext(db,guild){
  const scene=db.getActiveSession(guild)&&db.getCityCalendar(guild).flags.scene_continuity===true?sceneView(db,guild,{gm:true}):null;
  const packet={policy:delegationPolicy(db,guild),flags:db.getCityCalendar(guild).flags,native_world_operations:nativeWorldOperationCatalog(db,guild),
    scene_entries:db.listCityRecords(guild,{kind:"scene_entry",includeGM:true,limit:30})
      .filter(row=>["pending","awaiting_adjudication"].includes(row.status)).slice(0,8).map(row=>({...row,expected_revision:stateRevision(row)})),
    roll_declarations:db.getCityCalendar(guild).flags.roll_requests===true?db.listWorldEvents(guild,{includeGM:true,limit:100})
      .filter(row=>["player_declaration","roll_contribution"].includes(row.kind)&&row.status==="active"&&row.session_id===db.getActiveSession(guild)?.id)
      .slice(0,12).map(row=>({...row,expected_revision:stateRevision(row)})):[],
    roll_requests:db.getCityCalendar(guild).flags.roll_requests===true?db.listCityRecords(guild,{kind:"roll_request",includeGM:true,limit:12})
      .map(row=>({...row,expected_revision:stateRevision(row)})):[],
    scene:scene?{...scene,occupants:scene.occupants.slice(0,32),targets:scene.occupants.slice(0,32).map(row=>({
      entity_type:row.data.entity_type,entity_key:row.data.entity_key,expected_revision:stateRevision(row)}))}:null,
    goal_targets:db.listNpcProfiles(guild,{limit:32}).flatMap(npc=>db.listNpcGoals(guild,npc.npc_key,{limit:8})
      .map(row=>({actor_type:"npc",actor_key:npc.npc_key,goal_key:row.goal_key,expected_revision:stateRevision(row),state:row}))).slice(0,32),
    receipts:db.listCityRecords(guild,{kind:"ai_intent",includeGM:true,limit:12}).map(row=>({...row,expected_revision:stateRevision(row)})),
    causal_targets:["consequence","consequence_subscription"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)}))),
    planning_targets:["group_transition","strategy"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)}))),
    personal_targets:["arc","arc_candidate"].flatMap(kind=>db.listCityRecords(guild,{kind,includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)}))),
    organization_requests:db.listCityRecords(guild,{kind:"organization_request",includeGM:true,limit:8}).map(row=>({...row,expected_revision:stateRevision(row)})),
    owner_replies:db.getCityCalendar(guild).flags.natural_language===true?db.listCityRecords(guild,{kind:"consent_reply",includeGM:true,limit:8}):[],
    setup_targets:db.getCityCalendar(guild).flags.narrative_setups===true?db.listCityRecords(guild,{kind:"story_setup",status:"open",includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row)})):[],
    reconciliation:reconcileHistory(db,guild),
    encounter_actors:encounterProposalContext(db,guild),
    influence_actions:db.getCityCalendar(guild).flags.audience_influence===true?db.listSimulationRecords(guild,{kind:"action",status:"completed",limit:12})
      .filter(row=>row.data.result?.information_source&&["contact","negotiate","spread_rumor","suppress_rumor"].includes(row.data.type)):[],
    evidence_targets:db.getCityCalendar(guild).flags.evidence_custody===true?db.listHandoutsFor(guild,"",{includeGM:true,limit:12})
      .filter(row=>row.metadata.evidence).map(row=>({handout_id:row.id,title:row.title,evidence:row.metadata.evidence,expected_revision:stateRevision(row.metadata.evidence)})):[],
    encounter_proposals:db.listCityRecords(guild,{kind:"encounter_proposal",status:"pending",includeGM:true,limit:8}),
    reviewed_templates:db.listCityRecords(guild,{kind:"seed_template",includeGM:true,limit:8}),
    project_targets:db.listCityRecords(guild,{kind:"long_project",includeGM:true,limit:8})
      .map(row=>({...row,expected_revision:stateRevision(row),phase_revision:projectPhaseRevision(row)})),
    group_actor_packets:db.listCityRecords(guild,{kind:"group_transition",status:"pending",includeGM:true,limit:4})
      .flatMap(row=>row.data.members.slice(0,4).map(member=>({proposal:row.record_key,member,
        packet:planContext(db,guild,{actorType:"npc",actorKey:member,query:row.source_event,maxTokens:400})}))),
    target_revision_rule:"Use the supplied state fingerprint; absent for a new target. Proposals are not effects."};
  const bounded={policy:packet.policy,flags:packet.flags,target_revision_rule:packet.target_revision_rule},omissions={};
  let chars=JSON.stringify(bounded).length;
  for(const [field,value] of Object.entries(packet)){
    if(field in bounded) continue;
    if(Array.isArray(value)){
      bounded[field]=[];
      for(const row of value){const size=JSON.stringify(row).length+1;if(chars+size>23500){omissions[field]=(omissions[field]||0)+1;continue;}
        bounded[field].push(row);chars+=size;}
    }else if(chars+JSON.stringify(value).length<23500){bounded[field]=value;chars+=JSON.stringify(value).length;}
    else omissions[field]=1;
  }
  bounded.context_metrics={max_chars:24000,estimated_chars:chars,omissions,authority:"Whole scoped records omitted; permission fields are never stripped."};
  return bounded;
}
