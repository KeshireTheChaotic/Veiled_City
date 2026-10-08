/** Native inert package/draft/reference/review/export pipeline, privacy, collisions, replay and restart. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { previewContentPackage, importContentPackage, reviewContentPackage, exportContentPackage, validateContentPackage } from "../src/content-packages.js";
import { editSeedDraft } from "../src/seed-drafts.js";
import { stateRevision } from "../src/ai-intents.js";
import { handleCommand } from "../src/commands.js";
import { fakeInteraction } from "./contract-fixtures.mjs";
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-ihy9-")),file=path.join(temp,"fixture.sqlite"),schema=path.resolve("sql/schema.sql");
let db=new VeiledDB(file,schema);
try{
  const guild="contract";db.ensureCampaign(guild);db.startSession(guild,"Lab");db.upsertPlayer(guild,"owner","Owner");
  db.createCharacter(guild,"owner","Private Detective",{});db.upsertNpcProfile(guild,{npcKey:"witness",displayName:"Existing witness",portrayal:"Do not replace"});
  const document={format:"veiled-city-content-package-v1",name:"Synthetic package",version:"1.0",license:"Synthetic test rights",
    sources:[{id:"public",title:"Public source",url:"https://example.com/source",license:"Synthetic"},
      {id:"private",title:"GM_SECRET_SOURCE",url:"https://example.com/private",license:"Synthetic"}],
    entries:[{kind:"npc",key:"witness",visibility:"gm",source_refs:["private"],definition:{name:"Witness",gm_notes:"GM_SECRET"}},
      {kind:"player_material",key:"notice",visibility:"public",source_refs:["public"],definition:{name:"Notice",text:"The bell rings at dusk."}}]};
  const before=db.getNpcProfile(guild,"witness"),writes=db.db.prepare("SELECT total_changes() n").get().n;
  assert(previewContentPackage(db,guild,document).entries[0].collision);assert.equal(db.db.prepare("SELECT total_changes() n").get().n,writes);
  assert.throws(()=>importContentPackage(db,guild,document,"gm"),/rights/);
  assert.throws(()=>validateContentPackage({...document,entries:[{...document.entries[1],definition:{name:"Notice",owner_user_id:"forged"}}]}),/Closed/);
  assert.throws(()=>validateContentPackage({...document,sha256:"forged"}),/digest/);
  const draft=importContentPackage(db,guild,document,"gm",{rightsApproved:true});assert.equal(draft.status,"draft");
  assert.equal(importContentPackage(db,guild,document,"gm",{rightsApproved:true}).record_key,draft.record_key);
  assert.throws(()=>exportContentPackage(db,guild,draft.record_key),/Approved/);
  assert.throws(()=>reviewContentPackage(db,guild,{id:draft.record_key,expected_revision:"old",decision:"approve"},"gm"),/revision/);
  let approved=reviewContentPackage(db,guild,{id:draft.record_key,expected_revision:stateRevision(draft),decision:"approve"},"gm");
  assert(db.getCityRecord(guild,"seed_reference",draft.data.proposal.key));assert.deepEqual(db.getNpcProfile(guild,"witness"),before);
  assert.throws(()=>exportContentPackage(db,guild,draft.record_key),/public-export/);
  approved=reviewContentPackage(db,guild,{id:draft.record_key,expected_revision:stateRevision(approved),decision:"approve",public_export:true},"gm");
  const output=exportContentPackage(db,guild,draft.record_key);assert.equal(output.entries.length,1);assert.equal(output.sources.length,1);
  assert(!JSON.stringify(output).includes("GM_SECRET"));assert.equal(validateContentPackage(output).sha256,output.sha256);
  const changes=db.db.prepare("SELECT total_changes() n").get().n;
  for(const gm of [true,false]){
    const interaction=fakeInteraction({gm,sub:"seed-package-export",json:{id:draft.record_key}});
    Object.assign(interaction,{commandName:"vc-admin",isChatInputCommand:()=>true,id:`export-${gm}`});
    await handleCommand(interaction,{db,gm:{}});assert(interaction.deliveries.length);if(!gm) assert(!interaction.deliveries.some(row=>row.files));
  }
  assert.equal(db.db.prepare("SELECT total_changes() n").get().n,changes);
  const revised=structuredClone(document);revised.version="2";revised.entries[1].definition.text="Contact personal@example.com";
  const sensitive=importContentPackage(db,guild,revised,"gm",{rightsApproved:true});
  reviewContentPackage(db,guild,{id:sensitive.record_key,expected_revision:stateRevision(sensitive),decision:"approve",public_export:true},"gm");
  assert.throws(()=>exportContentPackage(db,guild,sensitive.record_key),/personal/);
  revised.version="3";const editable=importContentPackage(db,guild,revised,"gm",{rightsApproved:true});
  const changed=editSeedDraft(db,guild,editable.record_key,{data:{...revised,version:"4"}},"gm");
  assert.throws(()=>reviewContentPackage(db,guild,{id:changed.record_key,expected_revision:stateRevision(changed),decision:"approve"},"gm"),/changed/);
  db.close();db=new VeiledDB(file,schema);assert.deepEqual(exportContentPackage(db,guild,draft.record_key),output);assert.deepEqual(db.getNpcProfile(guild,"witness"),before);
  console.log("IHY9 PASS: native inert seed draft/reference pipeline; source/hash/rights/public review; collisions preserve live NPC; public secrets/PII refusal; real read-only GM command guard/replay/restart.");
}finally{db.close();fs.rmSync(temp,{recursive:true,force:true});}
