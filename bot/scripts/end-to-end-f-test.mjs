/** AI project proposal -> authenticated commands -> actual resolved downtime -> delegated continuation; mediation never rerolls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { configureCityFlags } from "../src/city-core.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { configureDelegation, continueLongProjects, stateRevision } from "../src/ai-intents.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { manageLongProject, projectPhaseRevision } from "../src/long-projects.js";
import { handleCommand } from "../src/commands.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-end-to-end-f-")),file=path.join(temp,"test.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);configureCityFlags(db,guild,{long_projects:true,conflict_mediation:true});
  for(const user of ["one","two"]) db.upsertPlayer(guild,user,user);
  const one=db.createCharacter(guild,"one","One",{}),two=db.createCharacter(guild,"two","Two",{});
  indexWorldEvent(db,guild,{key:"source",title:"Known research lead",source_id:"gm",visibility:"party"});
  configureDelegation(db,guild,{mode:"routine_delegated",allow:["project.propose","project.advance"],max_operations:4,max_cost:0,expires_minute:10000},"gm");
  const payload={source_event:"source",op:"propose",character_id:one.id,title:"Research the lead",participants:[one.id,two.id],npc_collaborators:[],result_ids:[],
    phases:[{key:"study",title:"Study records",duration_minutes:2880,requires:[],prerequisites:["source"]}]};
  const intent={version:1,feature:"project",target_key:"",expected_revision:"absent",policy_revision:1,source_prerequisites:[],payload};
  const receipt=applyAuthoritativeMutation(db,{guildId:guild,aiIntents:[intent],provenance:{messageId:"proposal"}}).intents[0];
  assert.equal(receipt.status,"accepted",receipt.data.diagnostic);const draft=receipt.data.result,key=draft.record_key;
  assert.equal(db.getCityRecord(guild,"long_project",key),null,"proposal is not consent or work");
  async function command(user,json,sub="long-project"){
    const interaction=fakeInteraction({gm:false,sub,json});Object.assign(interaction,{id:`${user}:${JSON.stringify(json)}`,commandName:"vc-downtime",isChatInputCommand:()=>true});
    interaction.user={id:user,username:user};await handleCommand(interaction,{db,gm:{}});return interaction;
  }
  await command("one",{op:"accept-proposal",key,character_id:one.id,expected_revision:stateRevision(draft)});
  let project=db.getCityRecord(guild,"long_project",key);assert(project,"real command reaches long-project handler");
  const cycle=db.openDowntime(guild,{});
  const submissions=[one,two].map((c,i)=>db.addDowntimeProject(cycle.id,guild,{userId:i?"two":"one",characterId:c.id,title:"Study records"}));
  assert.throws(()=>manageLongProject(db,guild,"one",{op:"consent",key,character_id:one.id,project_id:submissions[0].id,decision:"accept",phase_revision:"stale"}),/revision/);
  for(const [i,c] of [one,two].entries()) await command(i?"two":"one",{op:"consent",key,character_id:c.id,project_id:submissions[i].id,
    decision:"accept",phase_revision:projectPhaseRevision(project)});
  assert.equal(db.getCityRecord(guild,"long_project",key).status,"active");
  assert.equal(continueLongProjects(db,guild)[0].status,"blocked","consent is not success or elapsed time");
  for(const result of submissions) db.updateDowntimeProject(result.id,{status:"completed",progress:4,result:"Existing GM-adjudicated research result"});
  db.resolveDowntimeCycle(cycle.id,"Actual resolved submissions");db.advanceSimulationClock(guild,{minutes:2880});
  db.close();db=new VeiledDB(file,schema);
  const completed=continueLongProjects(db,guild)[0];assert.equal(completed.status,"accepted",completed.data.diagnostic);
  assert.equal(db.getCityRecord(guild,"long_project",key).status,"completed");assert.equal(continueLongProjects(db,guild).length,0);
  assert(submissions.every(row=>db.downtimeResultClaimed(guild,row.id)));
  const changes=db.db.prepare("SELECT total_changes() n").get().n;
  await command("one",{},"long-project-status");assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);
  console.log("End-to-end F PASS: AI proposal, real authenticated command/consent, phase revisions, multi-day restart, actual resolved results once and zero-write project inbox; zero paid calls.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
