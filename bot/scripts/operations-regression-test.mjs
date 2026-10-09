/** Regression coverage for v3.7.0 operational hardening and GM tooling. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { handleCommand, buildCommands } from "../src/commands.js";
import { applyAuthoritativeMutation } from "../src/state.js";
import { validatePostTurnStateReview, lowConfidenceReviewItems } from "../src/director.js";

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc370-"));
const db=new VeiledDB(path.join(tmp,"test.sqlite"),path.resolve("sql/schema.sql"));
const guild="g370", user="u370";
db.ensureCampaign(guild);
db.upsertPlayer(guild,user,"GM User");
const character=db.createCharacter(guild,user,"Operator",{resources:{hp:{current:3,max:3},stress:{current:0,max:6},hope:2,armor:{current:0,max:0}}});
const session=db.startSession(guild,"Ops","already_together");
db.setPresence(session.id,user,"present");
db.assignCharacter(session.id,user,character.id);
assert(db.doctorData(guild).schemaVersion>=410);

// New command surfaces exist.
const commands=buildCommands();
assert(commands.find(c=>c.name==="vc-director")?.options?.some(o=>o.name==="history"));
assert(commands.find(c=>c.name==="vc-admin")?.options?.some(o=>o.name==="doctor"));
assert(commands.find(c=>c.name==="vc-admin")?.options?.some(o=>o.name==="backup"));
assert(commands.find(c=>c.name==="vc-admin")?.options?.some(o=>o.name==="seed-data"));
assert(!commands.find(c=>c.name==="vc-admin")?.options?.some(o=>o.name==="seed-npc-cognition"));
assert(commands.find(c=>c.name==="vc-gm")?.options?.some(o=>o.name==="overview"));
assert(commands.find(c=>c.name==="vc-gm")?.options?.some(o=>o.name==="npc-state"));
assert(commands.find(c=>c.name==="vc-gm")?.options?.some(o=>o.name==="fact-promote"));

function interaction({id,sub,integers={},strings={},isGm=true}){
  const replies=[];
  return {
    id,commandName:"vc-gm",guildId:guild,guild:{id:guild},user:{id:user,username:"gm"},
    member:{displayName:"GM User",roles:{cache:{has:()=>false}}},memberPermissions:{has:()=>isGm},
    deferred:false,replied:false,isChatInputCommand:()=>true,
    options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getInteger:n=>integers[n]??null,getString:(n,r=false)=>strings[n]??(r?(()=>{throw new Error(`missing ${n}`)})():null),getUser:()=>null},
    reply:async p=>{replies.push(typeof p==="string"?{content:p}:p);},
    editReply:async p=>{replies.push(typeof p==="string"?{content:p}:p);},
    followUp:async p=>{replies.push(typeof p==="string"?{content:p}:p);},
    _replies:replies
  };
}

// Same Discord interaction ID cannot apply a mutating command twice.
const first=interaction({id:"same-interaction",sub:"fear",integers:{delta:2}});
await handleCommand(first,{db,gm:null,voice:null});
assert.equal(db.getCampaign(guild).fear,2);
const second=interaction({id:"same-interaction",sub:"fear",integers:{delta:2}});
await handleCommand(second,{db,gm:null,voice:null});
assert.equal(db.getCampaign(guild).fear,2,"duplicate Discord interaction applied Fear twice");
assert.match(second._replies.map(x=>x.content||"").join("\n"),/Already applied/i);
assert(db.getOperationReceipt(guild,"same-interaction"));
assert(db.listMutationLedger(guild,{limit:20}).some(r=>r.source_interaction_id==="same-interaction"));

// A committed command stays protected when Discord refuses its final reply.
const failedReply=interaction({id:"failed-reply",sub:"fear",integers:{delta:1}});
failedReply.reply=async()=>{throw new Error("Discord delivery failed");};
await assert.rejects(handleCommand(failedReply,{db,gm:null}),/Discord delivery failed/);
assert.equal(db.getCampaign(guild).fear,3);
await handleCommand(interaction({id:"failed-reply",sub:"fear",integers:{delta:1}}),{db,gm:null});
assert.equal(db.getCampaign(guild).fear,3);

// Overlapping deliveries must serialize their receipt lookup and execution.
await Promise.all([
  handleCommand(interaction({id:"concurrent",sub:"fear",integers:{delta:1}}),{db,gm:null}),
  handleCommand(interaction({id:"concurrent",sub:"fear",integers:{delta:1}}),{db,gm:null})
]);
assert.equal(db.getCampaign(guild).fear,4);
db.changeFear(guild,-2); // Preserve the baseline for the existing backup assertions.

// Facts deduplicate exact repeats and support edit/archive/promotion metadata.
const f1=db.addFact(guild,{key:"ops.fact",content:"One durable fact",visibility:"gm",source:"test",provenance:{message:"m1"},confidence:77});
const f2=db.addFact(guild,{key:"ops.fact",content:"One durable fact",visibility:"gm",source:"test",provenance:{message:"m2"},confidence:77});
assert.equal(f1,f2,"exact duplicate fact was inserted twice");
let fact=db.getFact(guild,f1);
assert.equal(fact.confidence,77);
assert.match(fact.provenance_json,/m1/);
fact=db.updateFact(guild,f1,{visibility:"party",content:"Edited durable fact",subjectUserId:null,subjectCharacterId:null});
assert.equal(fact.visibility,"party");
assert.equal(fact.content,"Edited durable fact");
db.archiveFact(guild,f1);
assert.equal(db.listFactsForGM(guild,{search:"Edited durable fact",limit:20}).some(r=>r.id===f1),false,"archived fact remained in active list");

// Logical backups restore authoritative campaign state and survive the restore operation themselves.
db.changeFear(guild,1); // fear 3
const backup=db.createBackup(guild,{label:"Before test mutation",reason:"regression",createdBy:user});
assert(db.listBackups(guild).some(b=>b.id===backup.id));
db.changeFear(guild,4); // fear 7
assert.equal(db.getCampaign(guild).fear,7);
const preview=db.backupPreview(guild,backup.id);
assert(preview.counts.players>=1 && preview.counts.characters>=1);
db.restoreBackup(guild,backup.id,{actorId:user});
assert.equal(db.getCampaign(guild).fear,3,"backup restore did not restore campaign Fear");
assert(db.listBackups(guild).some(b=>b.id===backup.id),"restore deleted the source backup");

// Director controls and history are persistent campaign state.
assert.equal(db.isDirectorPaused(guild),false);
db.setDirectorPaused(guild,true); assert.equal(db.isDirectorPaused(guild),true);
db.setDirectorPaused(guild,false); assert.equal(db.isDirectorPaused(guild),false);
const hist=db.recordDirectorHistory(guild,{sessionId:session.id,layer:"manual",trigger:{why:"test"},acted:false,rationale:"No move warranted."});
assert.equal(db.listDirectorHistory(guild,10)[0].id,hist.id);

// AI provenance is persisted in the authoritative mutation ledger.
const beforeLedger=db.listMutationLedger(guild,{limit:100}).length;
applyAuthoritativeMutation(db,{guildId:guild,sessionId:session.id,scope:{mode:"party",actorUserId:user,actorCharacterId:character.id},source:"ai_gm",provenance:{actorType:"ai",actorId:user,messageId:"msg-370",triggerText:"I inspect the sigil.",rationale:"The sigil is plainly visible.",confidence:91},events:[{type:"fact",key:"sigil.visible",value:"The sigil is cracked.",visibility:"party",target_user_id:"",target_character_id:"",amount:0,note:"Observed directly",status:""}]});
const afterLedger=db.listMutationLedger(guild,{limit:100});
assert(afterLedger.length>beforeLedger);
const aiEntry=afterLedger.find(r=>r.source_message_id==="msg-370");
assert(aiEntry);
assert.equal(aiEntry.confidence,91);
assert.match(aiEntry.trigger_text,/inspect the sigil/i);
assert.match(aiEntry.rationale,/plainly visible/i);

// Confidence alone is not authority: review shape is accepted; native state/rules validators gate effects.
const categories=["facts_clues","resources","clocks","threads","references","relationships","handouts","canon","veil_exposure","npc_cognition"];
const review={};
for(const c of categories) review[c]={decision:"no_change",reason:"No justified change.",confidence:100};
review.scene={decision:"continue",label:"",reason:"Same scene."};
review.clocks={decision:"changed",reason:"Maybe the threat advances.",confidence:40};
assert.equal(validatePostTurnStateReview({events:[{type:"clock_delta"}],relationships:[],handouts:[],state_review:review}),true);
review.clocks={decision:"no_change",reason:"Possible advance is ambiguous; leave for GM review.",confidence:40};
assert.equal(validatePostTurnStateReview({events:[],relationships:[],handouts:[],state_review:review}),true);
const referenceMismatch=structuredClone(review);
referenceMismatch.references={decision:"changed",reason:"A native nearby place was proposed.",confidence:90};
assert.throws(()=>validatePostTurnStateReview({events:[],world_additions:[{kind:"location"}],relationships:[],handouts:[],
  state_review:referenceMismatch}),error=>error.code==="POST_TURN_REVIEW"&&error.diagnostic.category==="references"
  &&error.diagnostic.expected==="no_change");
assert.deepEqual(lowConfidenceReviewItems({state_review:review}),[]);

// Relationship lookup is tuple-based for AI deltas (regression for duplicate method-name shadowing).
const r1=db.upsertRelationship(guild,{fromType:"character",fromKey:character.id,fromLabel:"Operator",toType:"npc",toKey:"npc:test",toLabel:"Test NPC",relationshipType:"trust",score:1,visibility:"party"});
assert.equal(db.findRelationship(guild,{fromType:"character",fromKey:character.id,toType:"npc",toKey:"npc:test",relationshipType:"trust"}).id,r1.id);

const doctor=db.doctorData(guild);
assert.equal(Array.isArray(doctor.orphanAssignments),true);
assert.equal(Array.isArray(doctor.orphanHandouts),true);
assert.equal(Array.isArray(doctor.invalidVisibility),true);

db.close();
fs.rmSync(tmp,{recursive:true,force:true});
console.log("Veilkeeper v4.0.0 operations regression test: PASS");
