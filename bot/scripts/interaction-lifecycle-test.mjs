/** Offline interaction lifetime regressions using native campaign storage and synthetic Discord delivery. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { handleCommand } from "../src/commands.js";
import { acknowledgeRules, interactionResponseExpired } from "../src/discord/interaction-lifecycle.js";
import { postStateError } from "../src/publishing.js";

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-interaction-"));
const db=new VeiledDB(path.join(tmp,"test.sqlite"),path.resolve("sql/schema.sql"));
const guild="lifetime-guild",events=[];
db.ensureCampaign(guild);
const upsert=db.upsertPlayer.bind(db);
db.upsertPlayer=(...args)=>{events.push("database");return upsert(...args);};
let sequence=0,calls=0;
const gm={answerRulesQuestion:async()=>{events.push("model");calls++;return {classification:"RAW",answer:"Fixture answer",sources:[]};}};
function interaction({sub="ask",legacy=false,isGm=true,id=`interaction-${++sequence}`,ackError=null,editError=null}={}){
  const item={id,commandName:legacy?"vc":"vc-rules",guildId:guild,guild:{id:guild},
    user:{id:"gm-user",username:"Fixture GM"},member:{displayName:"Fixture GM",roles:{cache:{has:()=>false}}},
    memberPermissions:{has:()=>isGm},createdTimestamp:Date.now()-25,deferred:false,replied:false,
    token:"DO_NOT_LOG_TOKEN",isChatInputCommand:()=>true,isRepliable:()=>true,
    options:{getSubcommand:()=>sub,getSubcommandGroup:()=>legacy?"rules":null,
      getString:name=>({question:"DO_NOT_LOG_QUESTION",key:"fixture-rule",ruling:"Saved fixture ruling"})[name]||null},
    acknowledgements:[],edits:[],replies:[],
    deferReply:async payload=>{events.push("ack");item.acknowledgements.push(payload);if(ackError)throw ackError;item.deferred=true;},
    editReply:async payload=>{item.edits.push(payload);if(editError)throw editError;},
    reply:async payload=>{item.replies.push(payload);assert(!item.deferred,"Attempted second acknowledgement");item.replied=true;}
  };
  return item;
}
function discordError(code){return Object.assign(new Error(`Discord fixture ${code}`),{code});}
try{
  for(const legacy of [false,true]){
    events.length=0;
    const ask=interaction({legacy});
    await handleCommand(ask,{db,gm});
    assert.deepEqual(events,["ack","database","model"]);
    assert.deepEqual(ask.acknowledgements,[{ephemeral:false}]);
    assert.equal(ask.replies.length,0);assert.equal(ask.edits.length,1);
    assert.match(ask.edits[0],/Fixture answer/);
  }
  const listing=interaction({sub:"rulings"});
  await handleCommand(listing,{db,gm});
  assert.deepEqual(listing.acknowledgements,[{ephemeral:true}]);
  assert.match(listing.edits[0].content,/No saved/);
  const denied=interaction({sub:"ruling",isGm:false});
  await handleCommand(denied,{db,gm});
  assert.match(denied.edits[0].content,/permission required/);
  assert.equal(db.searchRulesRulings(guild,"").length,0);

  let saves=0;
  const save=db.upsertRulesRuling.bind(db);
  db.upsertRulesRuling=(...args)=>{saves++;return save(...args);};
  const ruling=interaction({sub:"ruling"});
  await handleCommand(ruling,{db,gm});
  const replay=interaction({sub:"ruling",id:ruling.id});
  await handleCommand(replay,{db,gm});
  assert.equal(saves,1);assert.equal(db.searchRulesRulings(guild,"").length,1);
  assert.deepEqual(replay.acknowledgements,[{ephemeral:true}]);
  assert.match(replay.edits[0].content,/Already applied/);assert.equal(replay.replies.length,0);

  for(const code of [10062,40060]){
    events.length=0;
    const error=discordError(code),expired=interaction({ackError:error});
    expired.createdTimestamp=Date.now()-5000;
    const before=calls;
    await assert.rejects(handleCommand(expired,{db,gm}),received=>received===error);
    assert.deepEqual(events,["ack"]);assert.equal(calls,before);
    assert.equal(expired.edits.length+expired.replies.length,0);
    assert(interactionResponseExpired(expired,error));
    assert.equal(error.interaction_diagnostic.phase,"acknowledgement");
    assert(error.interaction_diagnostic.ack_started_age_ms>=5000);
  }
  const failedDelivery=interaction({editError:discordError(10062)});
  await assert.rejects(handleCommand(failedDelivery,{db,gm}),error=>error.code===10062);
  assert.equal(failedDelivery.edits.length,1);assert.equal(failedDelivery.replies.length,0);

  const original=new Error("Original provider failure"),failedFallback=interaction({editError:discordError(10062)});
  await assert.rejects(handleCommand(failedFallback,{db,gm:{answerRulesQuestion:async()=>{throw original;}}}),error=>error===original);
  assert.equal(failedFallback.edits.length,1);assert.equal(failedFallback.replies.length,0);
  assert(interactionResponseExpired(failedFallback,original));
  assert.equal(original.interaction_diagnostic.response_error.code,"10062");
  assert.equal(original.interaction_diagnostic.phase,"error-response");
  let audit;
  const nativeAudit=db.audit.bind(db);
  db.audit=(...args)=>{audit=args[5];return nativeAudit(...args);};
  await postStateError({db,guild:{id:guild},error:original,context:"interaction:vc-rules"});
  assert.equal(audit.error,"Original provider failure");
  assert.equal(audit.interaction.response_error.code,"10062");
  assert.doesNotMatch(JSON.stringify(audit),/DO_NOT_LOG/);

  const acknowledged=interaction();acknowledged.deferred=true;
  await handleCommand(acknowledged,{db,gm});
  assert.equal(acknowledged.acknowledgements.length,0);assert.equal(acknowledged.edits.length,1);
  const shared=interaction();
  await Promise.all([acknowledgeRules(shared,"ask"),acknowledgeRules(shared,"ask")]);
  assert.equal(shared.acknowledgements.length,1);
  assert(interactionResponseExpired(shared,discordError(10015)));

  let release,entered;
  const paused=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});
  const first=interaction({sub:"ruling"}),edit=first.editReply;
  first.editReply=async payload=>{entered();await paused;return edit(payload);};
  const executing=handleCommand(first,{db,gm});
  await started;
  const duplicate=interaction({sub:"ruling",id:first.id});
  const queued=handleCommand(duplicate,{db,gm});
  await Promise.resolve();
  assert.equal(duplicate.acknowledgements.length,1,"Acknowledgement must not wait for the delivery queue");
  release();await Promise.all([executing,queued]);
  assert.equal(saves,2);assert.match(duplicate.edits[0].content,/Already applied/);
  console.log("Interaction lifecycle PASS: early acknowledgement, privacy, terminal failures, original error diagnostics and replay conservation.");
}finally{
  db.db.close();
  fs.rmSync(tmp,{recursive:true,force:true});
}
