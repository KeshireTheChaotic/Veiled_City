import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { applyAuthoritativeMutation, applyCanonProposalDrafts } from "../src/state.js";
import { KeyedSerialQueue } from "../src/serial-queue.js";
import { VoiceNarrator } from "../src/voice.js";
import { loadConfig } from "../src/config.js";
import { GMService } from "../src/gm.js";
import { validatePostTurnStateReview, queueDirectorAfterPartyTurn, describeBlockedAction } from "../src/director.js";
import { buildSessionRosterReport, chunkRosterReport } from "../src/roster.js";

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-prod-test-"));
const db=new VeiledDB(path.join(tmp,"test.sqlite"),path.resolve("./sql/schema.sql"));
const guild="guild-prod";
const u1="1001", u2="1002";
db.ensureCampaign(guild);
db.upsertPlayer(guild,u1,"Player One");
db.upsertPlayer(guild,u2,"Player Two");
const c1=db.createCharacter(guild,u1,"One",{resources:{hp:{current:3,max:3},stress:{current:0,max:6},hope:2,armor:{current:0,max:0}}});
const c2=db.createCharacter(guild,u2,"Two",{resources:{hp:{current:3,max:3},stress:{current:0,max:6},hope:2,armor:{current:0,max:0}}});
const session=db.startSession(guild,"Production Test","already_together");
db.setPresence(session.id,u1,"present");
db.setPresence(session.id,u2,"present");
db.assignCharacter(session.id,u1,c1.id);
db.assignCharacter(session.id,u2,c2.id);

// 0) GM session roster reports player→character mappings and distinguishes proxy roles/offers.
const u3="1003", u4="1004";
db.upsertPlayer(guild,u3,"Proxy Player");
db.upsertPlayer(guild,u4,"Unassigned Player");
db.setPresence(session.id,u3,"present");
db.setPresence(session.id,u4,"present");
db.setPresence(session.id,u2,"absent","proxy",u3,"Proxying while absent");
db.assignCharacter(session.id,u2,c2.id,{role:"primary",controlPolicy:"proxy",proxyUserId:u3});
db.upsertNpcProxy(guild,session.id,{npcName:"Mara Voss",userId:u3,controlLevel:"tactical",status:"active",playerPacket:{}});
db.upsertNpcProxy(guild,session.id,{npcName:"Jonas Reed",userId:u4,controlLevel:"portrayal",status:"offered",playerPacket:{}});
const rosterLines=buildSessionRosterReport(db,guild,session);
const rosterText=rosterLines.join("\n");
assert.match(rosterText,/<@1001> \(Player One\) → \*\*One\*\*/);
assert.match(rosterText,/<@1003> → \*\*Two\*\* — PC proxy for <@1002>/);
assert.match(rosterText,/<@1003> → \*\*Mara Voss\*\* — NPC proxy/);
assert.match(rosterText,/Pending NPC Proxy Offers/);
assert.match(rosterText,/<@1004> ⇢ \*\*Jonas Reed\*\*/);
assert.match(rosterText,/2 present players? .*no active PC\/guest character assignment|present players have no active PC\/guest character assignment/i);
const rosterChunks=chunkRosterReport(rosterLines,300);
assert(rosterChunks.length>1,"large roster report did not split into multiple Discord-safe chunks");
assert(rosterChunks.every(x=>x.length<=300),"roster chunk exceeded requested size");
// Restore player two for director cadence tests below; proxy-specific coverage above remains authoritative.
db.setPresence(session.id,u2,"present","offscreen",null,"");
db.assignCharacter(session.id,u2,c2.id,{role:"primary",controlPolicy:"player_only"});
db.setPresence(session.id,u3,"absent","offscreen",null,"");
db.setPresence(session.id,u4,"absent","offscreen",null,"");

// 1) Authoritative mutation is atomic: an early valid event must roll back if a later event fails.
const factsBefore=db.db.prepare("SELECT COUNT(*) n FROM facts WHERE guild_id=?").get(guild).n;
assert.throws(()=>applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"party",actorUserId:u1,actorCharacterId:c1.id},
  events:[
    {type:"fact",key:"atomic.fact",value:"Must roll back",visibility:"party",target_user_id:"",target_character_id:"",amount:0,note:"",status:""},
    {type:"resource_delta",key:"hp",amount:-1,target_character_id:"missing-character",target_user_id:"",value:"",visibility:"party",note:"",status:""}
  ]
}),/Authoritative state mutation rejected/);
assert.equal(db.db.prepare("SELECT COUNT(*) n FROM facts WHERE guild_id=?").get(guild).n,factsBefore,"atomic rollback left a fact behind");

// 2) Private clocks are namespaced and character-scoped; private resource changes can only hit the actor.
const privateResult=applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"private",actorUserId:u1,actorCharacterId:c1.id},
  events:[
    {type:"clock_delta",key:"danger",amount:1,value:"Private danger",visibility:"party",target_user_id:u2,target_character_id:c2.id,note:"",status:""},
    {type:"resource_delta",key:"stress",amount:1,value:"",visibility:"character",target_user_id:u1,target_character_id:c1.id,note:"",status:""}
  ]
});
assert.equal(privateResult.events.length,2);
const pc=db.db.prepare("SELECT * FROM clocks WHERE guild_id=? AND clock_key=?").get(guild,`private:${c1.id}:danger`);
assert(pc,"private clock was not namespaced");
assert.equal(pc.visibility,"character");
assert.equal(pc.subject_character_id,c1.id);
assert.equal(db.getCharacter(c1.id).data.resources.stress.current,1);
assert.equal(db.getCharacter(c2.id).data.resources.stress.current,0);
const blockedResource=applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"private",actorUserId:u1,actorCharacterId:c1.id},
  events:[{type:"resource_delta",key:"stress",amount:1,value:"",visibility:"character",target_user_id:u2,target_character_id:c2.id,note:"",status:""}]
});
assert.equal(blockedResource.events[0].blocked,true);
assert.equal(db.getCharacter(c2.id).data.resources.stress.current,0);
const blockedExposure=applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"private",actorUserId:u1,actorCharacterId:c1.id},
  events:[{type:"veil_exposure_delta",key:"",amount:1,value:"",visibility:"gm",target_user_id:"",target_character_id:"",note:"",status:""}]
});
assert.equal(blockedExposure.events[0].blocked,true);
assert.equal(db.getCampaign(guild).veil_exposure,0);
const blockedCanon=applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"private",actorUserId:u1,actorCharacterId:c1.id},
  events:[{type:"canon",key:"secret.answer",amount:0,value:"hidden truth",visibility:"character",target_user_id:"",target_character_id:c1.id,note:"",status:""}]
});
assert.equal(blockedCanon.events[0].blocked,true);
assert.equal(db.currentCanon(guild,"secret.answer"),undefined);
const canonNotice=describeBlockedAction(blockedCanon.events[0]);
assert.match(canonNotice.player,/did not write.*global canon/i);
assert.doesNotMatch(canonNotice.player,/hidden truth|secret\.answer/i,"player block notice leaked blocked canon detail");
assert.match(canonNotice.gm,/secret\.answer/);
// A blocked private mutation is refused without discarding other valid private consequences in the same atomic turn.
const mixedPrivate=applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"private",actorUserId:u1,actorCharacterId:c1.id},
  events:[
    {type:"fact",key:"private.safe.fact",amount:0,value:"The actor learned a permitted private fact.",visibility:"character",target_user_id:u1,target_character_id:c1.id,note:"",status:""},
    {type:"canon",key:"private.blocked.canon",amount:0,value:"Must not become global canon.",visibility:"character",target_user_id:u1,target_character_id:c1.id,note:"",status:""}
  ]
});
assert.equal(mixedPrivate.events[0].ok,true);
assert.equal(mixedPrivate.events[1].blocked,true);
assert(db.factsFor(guild,u1,{characterId:c1.id}).some(f=>f.fact_key.includes("private.safe.fact")),"valid private fact was discarded with blocked canon");
assert.equal(db.currentCanon(guild,"private.blocked.canon"),undefined);

// Explicit private player canon requests are durable proposals, not canon-ledger writes.
const playerProposalResults=applyCanonProposalDrafts(db,guild,session.id,[{
  key:"character.two.species",value:"Two is literally a frog.",visibility:"party",reason:"Player explicitly requested this as campaign canon."
}],{mode:"private",actorUserId:u1,actorCharacterId:c1.id},{channelId:"private-chan-1",messageId:"private-msg-1"});
assert.equal(playerProposalResults.length,1);
assert.equal(playerProposalResults[0].ok,true);
assert.equal(playerProposalResults[0].row.status,"pending");
assert.equal(playerProposalResults[0].row.source,"player_private_scene");
assert.equal(playerProposalResults[0].row.proposed_by_user_id,u1);
assert.equal(playerProposalResults[0].row.proposed_by_character_id,c1.id);
assert.equal(playerProposalResults[0].row.source_channel_id,"private-chan-1");
assert.equal(playerProposalResults[0].row.source_message_id,"private-msg-1");
assert.equal(db.currentCanon(guild,"character.two.species"),undefined,"player proposal incorrectly mutated canon");
const queuedPlayerProposal=db.listCanonProposals(guild,{status:"pending",characterId:c1.id,limit:20}).find(r=>r.id===playerProposalResults[0].row.id);
assert(queuedPlayerProposal,"private player canon proposal did not appear in /vc-canon proposals backing queue");
assert.equal(queuedPlayerProposal.proposer_display_name,"Player One");
const duplicateProposal=applyCanonProposalDrafts(db,guild,session.id,[{key:"character.two.species",value:"Two is literally a frog.",visibility:"party",reason:"Repeated request."}],{mode:"private",actorUserId:u1,actorCharacterId:c1.id},{channelId:"private-chan-1",messageId:"private-msg-2"});
assert.equal(duplicateProposal[0].row.id,playerProposalResults[0].row.id,"exact repeated player proposal created a duplicate queue row");

assert.throws(()=>applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"party",actorUserId:u1,actorCharacterId:c1.id},
  events:[{type:"canon",key:"bad.visibility",amount:0,value:"should reject",visibility:"character",target_user_id:"",target_character_id:c1.id,note:"",status:""}]
}),/Canon visibility must be public, party, or gm/);
assert.throws(()=>db.proposeCanon(guild,{key:"bad.lowlevel",value:"reject",visibility:"character"}),/Canon visibility must be public, party, or gm/);
// Defensive read filtering also protects upgraded databases that may contain legacy malformed visibility values.
const legacyCanonId="legacy-character-canon";
db.db.prepare("INSERT INTO canon_events(id,guild_id,canon_key,value,visibility,status) VALUES(?,?,?,?,?,?)").run(legacyCanonId,guild,"legacy.private","legacy secret","character","current");
assert.equal(db.listCanon(guild,{includeGM:false}).some(r=>r.id===legacyCanonId),false);
assert.equal(db.listCanon(guild,{includeGM:true}).some(r=>r.id===legacyCanonId),true);

// Private reference writes cannot overwrite party-visible NPC/location rows with the same logical key.
db.upsertReference(guild,{kind:"npc",key:"mara",name:"Mara",summary:"party-visible baseline",visibility:"party",sessionId:session.id});
applyAuthoritativeMutation(db,{
  guildId:guild,sessionId:session.id,scope:{mode:"private",actorUserId:u1,actorCharacterId:c1.id},
  events:[{type:"npc_update",key:"Mara",amount:0,value:"private-only observation",visibility:"party",target_user_id:"",target_character_id:"",note:"",status:""}]
});
const publicMara=db.db.prepare("SELECT * FROM reference_entries WHERE guild_id=? AND kind='npc' AND entity_key=?").get(guild,"mara");
assert.equal(publicMara.summary,"party-visible baseline");
const privateMara=db.db.prepare("SELECT * FROM reference_entries WHERE guild_id=? AND kind='npc' AND entity_key LIKE ?").get(guild,`private:${c1.id}:%`);
assert(privateMara,"private NPC reference was not namespaced");
assert.equal(privateMara.visibility,"character");
assert.equal(privateMara.subject_character_id,c1.id);

// 3) Mandatory post-turn review is exhaustive and cross-validates emitted mutations.
const reviewBase={
  facts_clues:{decision:"no_change",reason:"No new fact."},resources:{decision:"no_change",reason:"No resource consequence."},clocks:{decision:"no_change",reason:"No clock changed."},threads:{decision:"no_change",reason:"No thread changed."},references:{decision:"no_change",reason:"No reference changed."},relationships:{decision:"no_change",reason:"No relationship changed."},handouts:{decision:"no_change",reason:"No handout."},canon:{decision:"no_change",reason:"No canon."},veil_exposure:{decision:"no_change",reason:"No exposure change."},scene:{decision:"continue",label:"",reason:"Same scene."}
};
validatePostTurnStateReview({events:[],relationships:[],handouts:[],state_review:reviewBase});
assert.throws(()=>validatePostTurnStateReview({events:[{type:"clock_delta"}],relationships:[],handouts:[],state_review:reviewBase}),/clocks=no_change/);
const changedReview=structuredClone(reviewBase); changedReview.clocks={decision:"changed",reason:"Pressure advanced."};
validatePostTurnStateReview({events:[{type:"clock_delta"}],relationships:[],handouts:[],state_review:changedReview});

// 4) Director cadence fires only after all present player roles act; scene transitions supersede the round cadence.
let pending=queueDirectorAfterPartyTurn(db,session,u1,reviewBase);
assert.equal(pending,null);
pending=queueDirectorAfterPartyTurn(db,session,u2,reviewBase);
assert.equal(pending.layer,"round");
assert.equal(db.getPendingDirectorPass(session.id).layer,"round");
// A real scene boundary on the same cadence supersedes the pending round pass so the world director moves only once.
const sceneReview=structuredClone(reviewBase); sceneReview.scene={decision:"transition",label:"Lantern Office",reason:"The group leaves the street and enters the office."};
pending=queueDirectorAfterPartyTurn(db,session,u1,sceneReview);
assert.equal(pending.layer,"scene");
assert.equal(pending.scene_label,"Lantern Office");
assert.equal(db.getPendingDirectorPass(session.id).layer,"scene");
db.completeDirectorPass(session.id,"scene",{sceneLabel:pending.scene_label});
assert.equal(db.getDirectorState(session.id).scene_label,"Lantern Office");
// A later completed player cadence still advances the round counter independently.
pending=queueDirectorAfterPartyTurn(db,session,u1,reviewBase);
assert.equal(pending,null);
pending=queueDirectorAfterPartyTurn(db,session,u2,reviewBase);
assert.equal(pending.layer,"round");
db.completeDirectorPass(session.id,"round");
assert.equal(db.getDirectorState(session.id).round_number,2);

// 5) GM turn handling retries an inconsistent mandatory post-turn review and private director context sees private transcript.
const noChangeReview={
  facts_clues:{decision:"no_change",reason:"none"},resources:{decision:"no_change",reason:"none"},clocks:{decision:"no_change",reason:"none"},threads:{decision:"no_change",reason:"none"},references:{decision:"no_change",reason:"none"},relationships:{decision:"no_change",reason:"none"},handouts:{decision:"no_change",reason:"none"},canon:{decision:"no_change",reason:"none"},veil_exposure:{decision:"no_change",reason:"none"},scene:{decision:"continue",label:"",reason:"same scene"}
};
let turnCalls=0;
const fakeTurnAI={responses:{create:async(req)=>{
  turnCalls++;
  const bad=structuredClone(noChangeReview);
  if(turnCalls===1) bad.clocks={decision:"changed",reason:"claimed without mutation"};
  return {output_text:JSON.stringify({respond:true,narration:"Test narration.",private_messages:[],events:[],handouts:[],relationships:[],canon_proposals:[],state_review:bad})};
}}};
const fakeContent={read:()=>"",search:()=>[]};
const gmConfig={openaiKey:"x",gmModel:"test",routerModel:"test",maxRecentMessages:20,maxContentChunks:4,structuredRetryMaxTokens:3000,reasoningEffort:"",downtimeModel:"test",downtimeMaxOutputTokens:1200};
const gmSvc=new GMService({db,content:fakeContent,config:gmConfig,ai:fakeTurnAI});
const reviewed=await gmSvc.runTurn({guildId:guild,actorUserId:u1,actorName:"One",actorAssignment:db.activeAssignment(session.id,u1),messageText:"I inspect the door.",scope:"party"});
assert.equal(turnCalls,2,"inconsistent post-turn review did not trigger corrective retry");
assert.equal(reviewed.state_review.scene.decision,"continue");

let proposalTurnCalls=0;
const fakeProposalAI={responses:{create:async(req)=>{
  proposalTurnCalls++;
  const proposals=proposalTurnCalls===1?[]:[{key:"character.two.species",value:"Two is literally a frog.",visibility:"party",reason:"Explicit player request for campaign canon."}];
  return {output_text:JSON.stringify({respond:true,narration:"I will leave canon approval to the GM.",private_messages:[],events:[],handouts:[],relationships:[],canon_proposals:proposals,state_review:noChangeReview})};
}}};
const proposalSvc=new GMService({db,content:fakeContent,config:gmConfig,ai:fakeProposalAI});
const proposalTurn=await proposalSvc.runTurn({guildId:guild,actorUserId:u1,actorName:"One",actorAssignment:db.activeAssignment(session.id,u1),messageText:"Two is literally a frog as campaign canon. Inform the GM.",scope:"private"});
assert.equal(proposalTurnCalls,2,"explicit private canon request without a proposal did not trigger structured corrective retry");
assert.equal(proposalTurn.canon_proposals.length,1);
assert.equal(proposalTurn.state_review.canon.decision,"no_change","canon proposal incorrectly counted as an authoritative canon mutation");

db.addMessage({guildId:guild,sessionId:session.id,userId:u1,speakerName:"One",characterId:c1.id,visibility:"character",subjectCharacterId:c1.id,content:"PRIVATE_DIRECTOR_SENTINEL"});
let directorInput="";
const fakeDirectorAI={responses:{create:async(req)=>{directorInput=String(req.input||"");return {output_text:JSON.stringify({act:false,public_narration:"",private_messages:[],events:[],handouts:[],relationships:[],gm_notes:"No move."})};}}};
const directorSvc=new GMService({db,content:fakeContent,config:gmConfig,ai:fakeDirectorAI});
await directorSvc.runWorldDirector({guildId:guild,layer:"scene",trigger:{scope:"private",actor_user_id:u1,actor_character_id:c1.id,scene_label:"Back Room",reason:"Moved rooms"}});
assert.match(directorInput,/PRIVATE_DIRECTOR_SENTINEL/,"private scene director did not receive acting character private context");

// Downtime world director must work with no active session and must be driven by explicit fictional downtime data.
const downtimeGuild="guild-downtime-director";
db.configureCampaign(downtimeGuild,{playChannelId:"play-downtime"});
let downtimePrompt="";
const fakeDowntimeAI={responses:{create:async(req)=>{downtimePrompt=String(req.input||"");return {output_text:JSON.stringify({act:false,public_narration:"",private_messages:[],events:[],handouts:[],relationships:[],gm_notes:"World remains stable."})};}}};
const downtimeSvc=new GMService({db,content:fakeContent,config:gmConfig,ai:fakeDowntimeAI});
await downtimeSvc.runWorldDirector({guildId:downtimeGuild,layer:"downtime",cycle:{id:"dt-1",label:"Three quiet weeks",status:"resolving"},projects:[{id:"p-1",title:"Research the seal"}],trigger:{cycle_label:"Three quiet weeks"}});
assert.match(downtimePrompt,/EXTENDED IN-GAME MECHANICAL DOWNTIME DIRECTOR PASS/);
assert.match(downtimePrompt,/never by real-world elapsed time/i);
assert.match(downtimePrompt,/Three quiet weeks/);

// 6) Keyed GM queue preserves invocation order even when the first task is slower.
const queue=new KeyedSerialQueue();
const order=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const q1=queue.enqueue("guild",async()=>{order.push("a:start");await delay(35);order.push("a:end");return "a";});
const q2=queue.enqueue("guild",async()=>{order.push("b:start");await delay(1);order.push("b:end");return "b";});
assert.deepEqual(await Promise.all([q1,q2]),["a","b"]);
assert.deepEqual(order,["a:start","a:end","b:start","b:end"]);

// 7) Voice capacity is reserved before TTS and narration synthesis remains invocation-ordered.
const fakeConnection={joinConfig:{channelId:"voice-1"},destroy(){},subscribe(){}};
const voiceConfig={
  voiceEnabled:true,voiceMode:"narrative",voiceName:"cedar",voiceModel:"test",voiceInstructions:"",voiceSpeed:1,
  voiceMaxCharsPerTurn:12000,voiceMaxQueue:1,voiceRepeatCooldownMs:8000,openaiKey:"test"
};
const v1=new VoiceNarrator(voiceConfig,{getConnection:()=>fakeConnection});
v1.ffmpegAvailable=true;
v1._enqueueReserved=(gid,buffers)=>{const st=v1._state(gid);for(const b of buffers) st.queue.push(Buffer.from(b));};
let release;
const gate=new Promise(r=>{release=r;});
let synthCalls=0;
v1._synthesize=async text=>{synthCalls+=1;await gate;return Buffer.from(text);};
const guildObj={id:"voice-guild"};
const first=v1.narrate(guildObj,"first narration");
await Promise.resolve();
const rejected=await v1.narrate(guildObj,"second narration");
assert.equal(rejected.ok,false);
assert.equal(rejected.reason,"queue_full");
assert.equal(synthCalls,1,"queue-full narration still invoked TTS");
release();
assert.equal((await first).ok,true);
assert.equal(synthCalls,1);

const v2=new VoiceNarrator({...voiceConfig,voiceMaxQueue:2},{getConnection:()=>fakeConnection});
v2.ffmpegAvailable=true;
v2._enqueueReserved=(gid,buffers)=>{const st=v2._state(gid);for(const b of buffers) st.queue.push(Buffer.from(b));};
const synthOrder=[];
v2._synthesize=async text=>{synthOrder.push(`start:${text}`);if(text.includes("first")) await delay(25);synthOrder.push(`end:${text}`);return Buffer.from(text);};
await Promise.all([v2.narrate(guildObj,"first"),v2.narrate(guildObj,"second")]);
assert.deepEqual(synthOrder,["start:first","end:first","start:second","end:second"]);
const s2=v2._state(guildObj.id);
s2.queue=[];
s2.lastBuffers=[Buffer.from("cached")];
// Repeat semantics do not need a real decoder/player in this regression. Keep the
// queue path deterministic so @discordjs/voice does not register a live AudioPlayer
// and keep Node's global audio-cycle timer running after PASS.
v2._enqueue=(gid,buffers)=>{
  const st=v2._state(gid);
  const room=v2._availableSlots(st);
  if(buffers.length>room) return false;
  for(const b of buffers) st.queue.push(Buffer.from(b));
  return true;
};
assert.throws(()=>v2.repeat(guildObj.id,{requesterUserId:u1,requesterChannelId:null}),/Join Veilkeeper's current voice channel/);
assert.equal(v2.repeat(guildObj.id,{requesterUserId:u1,requesterChannelId:"voice-1"}).segments,1);
assert.throws(()=>v2.repeat(guildObj.id,{requesterUserId:u1,requesterChannelId:"voice-1"}),/cooldown/);

// A non-GM player may join an idle bot but cannot relocate an existing guild voice connection.
const v3=new VoiceNarrator(voiceConfig,{getConnection:()=>fakeConnection});
await assert.rejects(
  v3.join({id:"voice-guild",voiceAdapterCreator:{}},{id:"voice-2",isVoiceBased:()=>true},{allowMove:false}),
  /GM\/admin must move/
);

// Tear down real @discordjs/voice AudioPlayers created by the repeat/playback regression.
// An active AudioPlayer is registered with @discordjs/voice's global audio-cycle timer;
// leaving it active makes Node remain alive after all assertions have passed.
v1.destroy();
v2.destroy();
v3.destroy();
await new Promise(resolve=>setImmediate(resolve));

// 8) Voice environment validation fails fast for invalid production settings.
const saved={...process.env};
try{
  process.env.DISCORD_TOKEN="x"; process.env.DISCORD_CLIENT_ID="x"; process.env.OPENAI_API_KEY="x";
  process.env.VOICE_MODE="invalid";
  assert.throws(()=>loadConfig(),/VOICE_MODE must be one of/);
  process.env.VOICE_MODE="narrative";
  process.env.VOICE_SPEED="9";
  assert.throws(()=>loadConfig(),/VOICE_SPEED must be between/);
}finally{
  for(const k of Object.keys(process.env)) if(!(k in saved)) delete process.env[k];
  for(const [k,v] of Object.entries(saved)) process.env[k]=v;
}

db.close();
fs.rmSync(tmp,{recursive:true,force:true});
console.log("Veilkeeper v3.5.4 production regression test: PASS");
