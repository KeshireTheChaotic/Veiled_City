/** Typed NPC group decisions and strategy lifecycle use native domains, independent evidence, dissent and revocable policy. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureDelegation, stateRevision } from "../src/ai-intents.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { runStrategyOpportunity } from "../src/simulation-strategy.js";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-d-")),db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
try{
  const guild="d";db.ensureCampaign(guild);configureCityFlags(db,guild,{emergent_groups:true,strategies:true});
  indexWorldEvent(db,guild,{key:"source",title:"Known threat",source_id:"gm"});
  db.setSimulationEntity(guild,"location","room",{});
  for(const key of ["first","second","dissenter"]){db.upsertNpcProfile(guild,{npcKey:key,displayName:key,decisionProfile:{group_policy:key==="dissenter"?"decline":"consider"}});
    db.setSimulationEntity(guild,"npc",key,{location_key:"room"});
    db.upsertNpcKnowledge(guild,{npcKey:key,knowledgeKey:"threat",content:"Known threat",sourceRef:"source",confidence:85});}
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["group.propose","group.respond","strategy.propose","strategy.run"],
    max_operations:4,max_cost:4,expires_minute:100},"gm");
  const commit=(feature,payload,target_key="",before=null,origin="fixture")=>applyAuthoritativeMutation(db,{guildId:guild,
    aiIntents:[{version:1,feature,payload,target_key,expected_revision:stateRevision(before),policy_revision:1,source_prerequisites:[]}],
    provenance:{messageId:origin}}).intents[0];
  const proposal={source_event:"source",op:"propose",operation:"form",group_key:"watch",name:"Neighborhood Watch",members:["first","second","dissenter"],
    from_groups:[],shared_projects:[],member:"first",decision:"",information_key:"threat",reason:"Known threat motivates cooperation"};
  const formed=commit("group",proposal);assert.equal(formed.status,"accepted",formed.data.diagnostic);
  const key=formed.data.result.record_key;
  let row=db.getCityRecord(guild,"group_transition",key);
  const refused=commit("group",{...proposal,op:"respond",member:"dissenter",decision:"accept"},key,row,"forced");
  assert.equal(refused.status,"blocked");
  for(const member of proposal.members){row=db.getCityRecord(guild,"group_transition",key);
    const result=commit("group",{...proposal,op:"respond",member,decision:member==="dissenter"?"decline":"accept"},key,row,member);
    assert.equal(result.status,"accepted",result.data.diagnostic);}
  assert.deepEqual(db.getCityRecord(guild,"community","watch").data.members,["first","second"]);
  assert.equal(db.getCityRecord(guild,"group_transition",key).data.responses.dissenter.decision,"decline");
  db.upsertNpcGoal(guild,{npcKey:"first",goalKey:"watch",objective:"Observe threat",acceptableMethods:["observe"]});
  const plan={actor_type:"npc",actor_key:"first",information_key:"threat",source_event:"source",op:"propose",goal_key:"watch",cost_ceiling:1,
    deadline_minute:100,steps:[{key:"look",requires:[],action:{type:"observe",target_type:"",target_key:"",location_key:"room",information_key:"threat",reason:"Observe locally"}}],
    alternatives:[],assumptions:[]};
  const planned=commit("strategy",plan);assert.equal(planned.status,"accepted",planned.data.diagnostic);
  const strategy=planned.data.result.record_key;
  assert.equal(runStrategyOpportunity(db,guild,1,{excludedActors:new Set(["npc:first"])}).length,0);
  const result=runStrategyOpportunity(db,guild,1)[0];assert.equal(result.status,"accepted",result.data.diagnostic);
  const actionId=db.getCityRecord(guild,"strategy",strategy).data.steps[0].action_id;assert(actionId);
  const resources=structuredClone(db.getSimulationEntity(guild,"npc","first").state.resources);
  configureDelegation(db,guild,{mode:"manual",allow:[],max_operations:1,max_cost:0,expires_minute:null},"gm");
  assert.equal(runStrategyOpportunity(db,guild,1)[0].status,"blocked");
  assert.deepEqual(db.getSimulationEntity(guild,"npc","first").state.resources,resources);
  console.log("End-to-end D PASS: sourced typed groups, independent responses/dissent, native strategies, actor exclusion and revocation; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
