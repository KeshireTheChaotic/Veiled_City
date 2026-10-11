/** PVP30a-t: native clause authority, not whole-paragraph disclosure or semantic guessing. */
import assert from "node:assert/strict";
import test from "node:test";
import { nativeFixture, pvpTerms } from "./v9-fixtures.mjs";
import { proposePvp, reviewPvp, respondPvp, choosePvp, rollPvp, continuePvp, progressPvp,
  authorPvpNarrative, reviewPvpNarrative, sharePvpNarrative } from "../src/narrative-pvp.js";
import { draftPvpNarrative, ratifyPvpClause, reviewPvpScope, validatePvpClause, pvpProjection,
  assertPvpOutput } from "../src/pvp-authorship.js";
import { cityContext } from "../src/city-core.js";
import { handleCommand } from "../src/commands.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { validateNarrativeClaims } from "../src/narrative-integrity.js";
import { queueTurnPublications } from "../src/publication-outbox.js";
import { publishJournal, postJournalEntry } from "../src/publishing.js";
import { fakeInteraction } from "./contract-fixtures.mjs";

function resolved(f,mode="single_roll_duel"){
  const p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,
    opponent:f.pcs[1].id,terms:pvpTerms(f.pcs,{audience:"bilateral_author_projection",mode})});
  for(const pc of f.pcs.slice(0,2)){reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);
    respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:"accept",interaction_id:pc.id});}
  const op=i=>{const s=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);
    return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:s.round,expected_window_revision:s.window_revision,
      interaction_id:`${i}:${s.round}:${s.window_revision}`};};
  let result;
  for(let n=0;n<(mode==="three_strikes"?3:1);n++){
    for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,{...op(i),trait:"Agility",attempt:"I try my own feint."});
    for(let i=0;i<2;i++){let at=0;const faces=i?[3,2]:[9,7];result=rollPvp(f.db,f.guild,f.pcs[i].owner_user_id,op(i),{rng:()=>faces[at++]});}
    if(n<2&&mode==="three_strikes")for(let i=0;i<2;i++)continuePvp(f.db,f.guild,f.pcs[i].owner_user_id,op(i));
  }
  const base={proposal:p.record_key,expected_revision:p.data.terms_hash,resolution:result.resolution.receipt,
    role:"success",subject_character:f.pcs[0].id,text:"I achieve only my agreed success.",interaction_id:"own-clause",template:"stake_success"};
  return {p,base,result};
}
const rows=(f,kind)=>f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:100});
function journalFixture(f){
  const sends=[];
  f.db.configureChannels(f.guild,{journalChannelId:"journal"});
  const channel={id:"journal",isTextBased:()=>true,send:async text=>{sends.push(text);return {id:"sent"};}};
  return {sends,guild:{id:f.guild,channels:{fetch:async()=>channel}}};
}
test("PVP30aa journal cannot launder raw cross-actor prose during or after session",()=>nativeFixture(async f=>{
  resolved(f);const {sends,guild}=journalFixture(f),raw="Choso apologizes for losing.";
  await assert.rejects(()=>publishJournal({db:f.db,guild,session:f.session,recap:raw}),/PvP|clause|source/i);
  await assert.rejects(()=>postJournalEntry({db:f.db,guild,content:raw}),/PvP|clause|source/i);
  const ended=f.db.endSession(f.guild,"");
  await assert.rejects(()=>publishJournal({db:f.db,guild,session:ended,recap:raw}),/PvP|clause|source/i);
  await assert.rejects(()=>postJournalEntry({db:f.db,guild,content:raw}),/PvP|clause|source/i);
  assert.deepEqual(sends,[]);
}));
test("PVP30aa session end quarantines unsupported recap, not shared campaign memory",()=>nativeFixture(async f=>{
  resolved(f);const {sends,guild}=journalFixture(f),interaction=fakeInteraction({sub:"end"});
  Object.assign(interaction,{id:"end-source-review",guildId:f.guild,guild,commandName:"vc-session",isChatInputCommand:()=>true});
  interaction.user.username="GM";
  await handleCommand(interaction,{db:f.db,gm:{summarizeSession:async()=>"Choso apologizes for losing."}});
  assert(!f.db.getActiveSession(f.guild));
  assert(!JSON.stringify(f.db.factsFor(f.guild,"",{includeGM:false,limit:100})).includes("apologizes"));
  assert(!JSON.stringify(f.db.getSession(f.session.id)).includes("apologizes"));
  assert(!JSON.stringify(sends).includes("apologizes"));
  assert(!JSON.stringify(interaction.deliveries).includes("apologizes"));
  assert.equal(rows(f,"pvp_output_quarantine").filter(r=>r.data.origin==="session-recap").length,1);
}));
test("FH40 P0 actual manual World Director cannot invent participant injury through generic events",()=>nativeFixture(async f=>{
  resolved(f);const {guild}=journalFixture(f),pc=f.pcs[1],before=structuredClone(f.db.getCharacter(pc.id).data.resources);
  const interaction=fakeInteraction({sub:"run"});
  Object.assign(interaction,{id:"director-unreceipted-harm",guildId:f.guild,guild,commandName:"vc-director",isChatInputCommand:()=>true});
  interaction.user.username="GM";
  await handleCommand(interaction,{db:f.db,gm:{runWorldDirector:async()=>({act:true,confidence:100,
    public_narration:"Choso's shin is bruised.",narrative_claims:[],private_messages:[],
    events:[{type:"resource_delta",key:"hp",amount:1,target_character_id:pc.id}],
    relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],simulation_updates:[],gm_notes:""})}});
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before,"No native incoming attack/reaction/damage receipt exists; safe prose is not native effect authority.");
}));
test("FH40 P0 private self-target GM turn cannot invent injury behind safe output",()=>nativeFixture(async f=>{
  const {captureWorldInput}=await import("../src/autonomous-world.js"),{commitGmTurn}=await import("../src/turn-orchestration.js");
  resolved(f);const pc=f.pcs[1],before=structuredClone(f.db.getCharacter(pc.id).data.resources),text="I wait.";
  const scope={mode:"private",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"private-unreceipted-harm",text,{privateScene:true});
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"private-unreceipted-harm",actorPrincipal:pc.owner_user_id,
    sessionId:f.session.id,audience:"private"});
  try{commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:{respond:true,narration:"Choso's shin is bruised.",
    narrative_claims:[],events:[{type:"resource_delta",key:"hp",amount:1,target_character_id:pc.id}]},scope,speaker:pc.name,label:"private injury",
    meta:{messageId:"private-unreceipted-harm",turnId:turn.turn_id,triggerText:text,privateScene:true}});}
  catch(error){assert(["NARRATIVE_PVP","STATE_MUTATION_REJECTED","NARRATIVE_INTEGRITY"].includes(error.code),error.message);}
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before,"A current owner's wait declaration does not authorize an injury.");
}));
function draft(f,base,text,reviewers=[]){return draftPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,
  {...base,template:undefined,text,reviewers,interaction_id:`draft:${text}`});}
function published(f,n,base){
  const op={proposal:base.proposal,expected_revision:base.expected_revision,narrative:n.record_key};
  reviewPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,op);
  sharePvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...op,interaction_id:`share0:${n.record_key}`});
  reviewPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,op);
  return sharePvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...op,interaction_id:`share1:${n.record_key}`});
}
for(const [id,text] of [
  ["a","Choso apologizes for losing."],["b","Choso feels ashamed."],["c","Choso runs away."],
  ["d","Choso's shin is bruised."],["e",'Choso says, "I surrender."'],
  ["g","Only my account: Choso apologizes for losing."],["n","Choso permanently forfeits his coat."]
])test(`PVP30${id} unverified prose is never an owned material clause`,()=>nativeFixture(f=>{
  const {base}=resolved(f),before=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,text}),/scope|own|boundary/i);
  assert.equal(rows(f,"pvp_narrative_clause").length,0);assert.equal(rows(f,"pvp_public_projection").length,0);
  assert.equal(rows(f,"pvp_narrative_draft")[0].status,"needs_scope_review");
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution),before);
}));
test("PVP30f mixed sentence stays private; separately proven own clause survives",()=>nativeFixture(f=>{
  const {base}=resolved(f),n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base);
  const d=draft(f,base,`${base.text} Choso apologizes for losing.`);
  const p=published(f,n,base);assert(!p.data.text.includes("apologizes"));assert.equal(d.status,"needs_scope_review");
  assert.equal(rows(f,"pvp_narrative_clause").length,1);
}));
test("PVP30h subject/template/extra claim forgery cannot override authenticated principal",()=>nativeFixture(f=>{
  const {base}=resolved(f);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,subject_character:f.pcs[1].id}),/own|subject/i);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,template:"injury"}),/scope|boundary/i);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,claims:[{safe:true}]}),/closed/i);
}));
test("PVP30i exact affected-owner ratification is separate from preview and disclosure",()=>nativeFixture(f=>{
  const {base}=resolved(f),text="Choso apologizes for losing.",d=draft(f,base,text,[f.pcs[1].id]);
  const input={proposal:base.proposal,expected_revision:base.expected_revision,resolution:base.resolution,draft:d.record_key,
    template:"reaction_apology",start:0,end:text.length,source_span:text,interaction_id:"choso-ratification"};
  assert.throws(()=>ratifyPvpClause(f.db,f.guild,f.pcs[0].owner_user_id,input),/own|exact|template/i);
  const c=ratifyPvpClause(f.db,f.guild,f.pcs[1].owner_user_id,input);
  assert.equal(c.data.owning_user,f.pcs[1].owner_user_id);assert.equal(c.subject_key,f.pcs[1].id);
  assert.equal(c.data.source_span,text);assert.equal(c.data.start,0);assert.equal(c.data.end,text.length);
  assert.equal(validatePvpClause(f.db,f.guild,c.record_key).record_key,c.record_key);
  assert.equal(rows(f,"pvp_public_projection").length,0);
}));
test("PVP30j withheld response is intentional and terminal native result remains unchanged",()=>nativeFixture(f=>{
  const {base}=resolved(f),before=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution);
  const n=authorPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...base,template:"withhold",role:"withhold",
    subject_character:f.pcs[1].id,text:"",interaction_id:"withhold"});assert.equal(n.status,"withheld");
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution),before);
}));
test("PVP30k scope review is audited, invited and cannot authorize character prose",()=>nativeFixture(f=>{
  const {base}=resolved(f),d=draft(f,base,"Choso is ashamed.",["gm"]);
  const op={proposal:base.proposal,expected_revision:base.expected_revision,draft:d.record_key,
    decision:"request_rewrite",rationale:"Separate the affected owner's clause.",interaction_id:"gm-review"};
  assert.throws(()=>reviewPvpScope(f.db,f.guild,"gm",op),/GM/i);
  const r=reviewPvpScope(f.db,f.guild,"gm",op,{gm:true});assert.equal(r.status,"request_rewrite");
  assert.equal(r.data.reviewer,"gm");assert(r.data.text_hash);assert.equal(rows(f,"pvp_narrative_clause").length,0);
}));
test("PVP30l GM cannot approve/ratify another PC or certify arbitrary scenery",()=>nativeFixture(f=>{
  const {base}=resolved(f),d=draft(f,base,"Choso apologizes for losing.",["gm"]);
  const op={proposal:base.proposal,expected_revision:base.expected_revision,draft:d.record_key,
    decision:"approve",rationale:"I am GM.",interaction_id:"false-override"};
  assert.throws(()=>reviewPvpScope(f.db,f.guild,"gm",op,{gm:true}),/authoriz|decision|neutral/i);
  assert.throws(()=>reviewPvpScope(f.db,f.guild,"gm",{...op,decision:"neutral_environment"},{gm:true}),/neutral|scope/i);
}));
test("PVP30m use-time proof detects source retraction and source mutation",()=>nativeFixture(f=>{
  const {base}=resolved(f),n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base),c=validatePvpClause(f.db,f.guild,n.data.clauses[0]);
  const s=f.db.getWorldEvent(f.guild,c.source_event);
  f.db.saveWorldEvent(f.guild,{...s,key:s.event_key,details:{...s.details,raw_text:"Choso apologized."}});
  assert.throws(()=>validatePvpClause(f.db,f.guild,c.record_key),/source|span|hash/i);
  f.db.saveWorldEvent(f.guild,{...s,key:s.event_key});indexWorldEvent(f.db,f.guild,{key:s.event_key,status:"retracted"},base.author);
  assert.throws(()=>published(f,n,base),/source|active|clause/i);
}));
test("PVP30o whole-paragraph approvals never certify a draft or legacy private_account",()=>nativeFixture(f=>{
  const {base}=resolved(f),d=draft(f,base,"Choso apologizes for losing.",[f.pcs[1].id]);
  for(const pc of f.pcs.slice(0,2))assert.throws(()=>sharePvpNarrative(f.db,f.guild,pc.owner_user_id,
    {proposal:base.proposal,expected_revision:base.expected_revision,narrative:d.record_key,interaction_id:pc.id}),/clause|author|draft/i);
  const old=f.db.saveCityRecord(f.guild,{kind:"pvp_authored_narrative",key:"unsafe-legacy",status:"private_account",visibility:"party",source_event:d.source_event,
    data:{...base,author:f.pcs[0].owner_user_id,clauses:[],text:"Choso apologizes for losing."}});
  assert.throws(()=>published(f,old,base),/clause|author|legacy/i);assert.equal(rows(f,"pvp_public_projection").length,0);
}));
test("PVP30p Discord narrate/review/share cannot turn raw apology into canonical output",()=>nativeFixture(async f=>{
  const {base}=resolved(f),sent=[];
  for(const op of ["narrate","narrative-review","share"]){
    const i={id:`adapter-${op}`,guildId:f.guild,guild:{id:f.guild},user:{id:f.pcs[0].owner_user_id,username:"Jaxon"},
      isChatInputCommand:()=>true,commandName:"vc-roll",options:{getSubcommand:()=>"pvp",getString:()=>JSON.stringify(
        op==="narrate"?{op,...base,text:"Choso apologizes for losing."}:{op,proposal:base.proposal,
          expected_revision:base.expected_revision,narrative:rows(f,"pvp_narrative_draft")[0]?.record_key||"missing"})},
      reply:async p=>{sent.push(p);},followUp:async p=>{sent.push(p);}};
    await handleCommand(i,{db:f.db,gm:{}});
  }
  assert(sent.every(p=>p.ephemeral&&p.content.length<=2000));assert.equal(rows(f,"pvp_public_projection").length,0);
  assert.equal(rows(f,"pvp_narrative_clause").length,0);
}));
test("PVP30q AI output and stale public projections cannot launder unproven reactions",()=>nativeFixture(f=>{
  const {base}=resolved(f);
  assert.throws(()=>assertPvpOutput(f.db,f.guild,{narration:"Choso apologizes for losing."},{mode:"party",actorUserId:f.pcs[0].owner_user_id}),/PvP|clause/i);
  f.db.saveCityRecord(f.guild,{kind:"pvp_public_projection",key:"forged",status:"approved",visibility:"party",
    source_event:f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution).source_event,
    data:{proposal:base.proposal,resolution:base.resolution,text:"Choso apologizes for losing."}});
  assert.throws(()=>pvpProjection(f.db,f.guild,"forged"),/clause|projection/i);
  assert(!JSON.stringify(cityContext(f.db,f.guild,"apologizes")).includes("apologizes"));
  const result={narration:"Choso apologizes for losing.",narrative_claims:[]},scope={mode:"party",actorUserId:f.pcs[0].owner_user_id};
  assert.throws(()=>validateNarrativeClaims(f.db,f.guild,result,scope),/PvP|clause/i);
  assert.throws(()=>queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,turnId:"forged-turn"}),/PvP|clause/i);
}));
test("PVP30r restart/replay preserves exact claim and publication without new effects",()=>nativeFixture(f=>{
  const {base}=resolved(f),before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  const n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base),p=published(f,n,base);f.restart();
  assert.equal(authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base).record_key,n.record_key);
  assert.equal(published(f,n,base).record_key,p.record_key);assert.equal(rows(f,"pvp_narrative_clause").length,1);
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
}));
test("PVP30s role or scene switch invalidates clauses before projection",()=>nativeFixture(f=>{
  const {base}=resolved(f),n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base);
  f.db.assignCharacter(f.session.id,f.pcs[0].owner_user_id,f.pcs[2].id);
  assert.throws(()=>validatePvpClause(f.db,f.guild,n.data.clauses[0]),/owner|principal|controlled/i);
}));
test("PVP30t both modes retain immutable outcomes while unsupported narration is pending",()=>nativeFixture(f=>{
  const {base}=resolved(f,"three_strikes"),r=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution);
  assert.throws(()=>authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...base,text:"Choso apologizes for losing."}),/scope|own|boundary/i);
  assert.equal(progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,base.proposal).status,"resolved");
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_resolution_receipt",base.resolution),r);
}));
test("PVP30q cross-actor AI narration cannot bypass proof through Billy's unrelated turn",()=>nativeFixture(f=>{
  resolved(f);
  const result={narration:"Choso apologizes for losing.",narrative_claims:[]};
  const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id};
  // The recipient-visible surface, not the triggering author's membership, determines the agency threat.
  assert.throws(()=>validateNarrativeClaims(f.db,f.guild,result,scope),/PvP|clause/i);
}));
test("PVP30q actual outbox cannot enqueue cross-actor unverified apology",()=>nativeFixture(f=>{
  resolved(f);
  const result={narration:"Choso apologizes for losing.",narrative_claims:[]};
  const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id};
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"cross-actor-turn",actorPrincipal:scope.actorUserId,
    sessionId:f.session.id,audience:"party"});
  assert.throws(()=>queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,turnId:turn.turn_id}),/PvP|clause/i);
  assert.equal(f.db.listTurnPublications(f.guild,turn.turn_id).length,0);
}));

test("PVP30w high-level Billy movement survives quarantined cross-actor paragraph",()=>nativeFixture(async f=>{
  const {captureWorldInput}=await import("../src/autonomous-world.js");
  const {commitGmTurn}=await import("../src/turn-orchestration.js");
  resolved(f);const source="I enter the annex.",scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id};
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  f.db.setSimulationEntity(f.guild,"location","annex",{name:"Annex",parent_location_key:"terminal"});
  f.db.saveCityRecord(f.guild,{kind:"autonomous_entity",key:"location:annex",visibility:"party",
    source_event:rows(f,"pvp_proposal")[0].source_event,status:"active",data:{kind:"location",key:"annex",name:"Annex"}});
  captureWorldInput(f.db,f.guild,scope.actorUserId,scope.actorCharacterId,"mixed-move",source);
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"mixed-move",actorPrincipal:scope.actorUserId,
    sessionId:f.session.id,audience:"party"});
  const result={respond:true,narration:"Billy enters. Choso apologizes for losing.",narrative_claims:[],
    player_summary:"Choso apologizes for losing.",context_memories:[],
    player_intents:[{type:"move",source_span:source,target_name:"Annex",target_key:"annex",destination:"interior",
      operation:"",utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"Open local entry."}],
    scene_actions:[{kind:"move",entity_ref:"annex",source_span:source,zone:"interior"}]};
  const before=f.db.getCityRecord(f.guild,"pvp_resolution_receipt",f.db.getCityRecord(f.guild,"pvp_proposal",
    rows(f,"pvp_proposal")[0].record_key).data.resolution_receipt);
  const committed=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:"Billy",label:"mixed",
    meta:{messageId:"mixed-move",turnId:turn.turn_id,triggerText:source}});
  assert(committed.world.some(r=>r.status==="arrived"));assert.equal(f.db.getCharacter(f.pcs[2].id).data.location,"annex");
  const publications=f.db.listTurnPublications(f.guild,turn.turn_id);
  assert(publications.some(r=>/annex/i.test(r.payload)));assert(!JSON.stringify(publications).includes("apologizes"));
  assert(!result.player_summary.includes("apologizes"));assert(rows(f,"pvp_output_quarantine").length);
  assert.deepEqual(f.db.getCityRecord(f.guild,"pvp_resolution_receipt",before.record_key),before);
}));

test("PVP30ad forged prepared flag is not an output capability",()=>nativeFixture(f=>{
  resolved(f);const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id};
  assert.throws(()=>validateNarrativeClaims(f.db,f.guild,{narration:"Choso apologizes for losing.",narrative_claims:[],
    approved:true,prepared:true,approved_parts:[{kind:"owner_clause",verified:true}]},scope),/PvP|clause/i);
}));

test("PVP30ai restart source revocation holds saved output before transport",()=>nativeFixture(async f=>{
  const {prepareAuthorizedTurnOutput}=await import("../src/pvp-output.js");
  const {deliverTurnOutbox}=await import("../src/publication-outbox.js");
  const {captureWorldInput}=await import("../src/autonomous-world.js");
  resolved(f);const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id};
  const source=captureWorldInput(f.db,f.guild,scope.actorUserId,scope.actorCharacterId,"revoked-output","I wait.");
  const result={narration:"Choso apologizes for losing.",narrative_claims:[]};
  prepareAuthorizedTurnOutput(f.db,f.guild,result,scope,{sourceRef:source.event_key});
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"revoked-output",actorPrincipal:scope.actorUserId,
    sessionId:f.session.id,audience:"party"});
  queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,turnId:turn.turn_id});
  indexWorldEvent(f.db,f.guild,{key:source.event_key,status:"retracted"},scope.actorUserId);f.restart();
  let sends=0;const out=await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>{sends++;return {messageId:"sent"};});
  assert.equal(sends,0);assert.equal(out[0].ok,false);
}));

test("PVP30ab unsupported model facts cannot become shared state behind safe output",()=>nativeFixture(async f=>{
  const {commitGmTurn}=await import("../src/turn-orchestration.js");
  resolved(f);const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id};
  const result={respond:true,narration:"Choso apologizes for losing.",narrative_claims:[],
    events:[{type:"fact",key:"forged-apology",value:"Choso apologizes for losing.",visibility:"party"}]};
  assert.throws(()=>commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:"Billy",label:"bad fact"}),
    /PvP|source|authoriz|proof/i);
  assert(!JSON.stringify(f.db.contextFacts(f.guild,{scope:"gm",limit:100})).includes("apologizes"));
}));

for(const mode of ["party","private"])test(`PVP30y/PVP30z actual ${mode} director output is prepared and delivered only through saved parts`,
()=>nativeFixture(async f=>{
  const {GMService}=await import("../src/gm.js"),{ContentIndex}=await import("../src/content.js");
  const {FakeResponses}=await import("./contract-fixtures.mjs"),{applyAuthoritativeMutation}=await import("../src/state.js");
  const {queueDirectorPublications,deliverTurnOutbox}=await import("../src/publication-outbox.js");
  const path=await import("node:path");resolved(f);
  const scope={mode,actorUserId:mode==="private"?f.pcs[2].owner_user_id:null,actorCharacterId:mode==="private"?f.pcs[2].id:null};
  const ai=new FakeResponses([{act:true,public_narration:"Choso apologizes for losing.",narrative_claims:[],
    private_messages:[{discord_user_id:f.pcs[2].owner_user_id,content:"Choso apologizes for losing."}],events:[],
    relationships:[],handouts:[],npc_memories:[],npc_knowledge:[],npc_goals:[],simulation_updates:[],ai_intents:[],confidence:100,gm_notes:""}]);
  const gm=new GMService({db:f.db,content:new ContentIndex(path.resolve("../content")),ai,config:{gmModel:"fixture",maxRecentMessages:5,maxContentChunks:1}});
  const result=await gm.runWorldDirector({guildId:f.guild,layer:"manual",trigger:{scope:mode,
    actor_user_id:scope.actorUserId,actor_character_id:scope.actorCharacterId}});
  applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,scope});
  const turnId=queueDirectorPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,key:`test:${mode}`});
  const sent=[];await deliverTurnOutbox(f.db,f.guild,turnId,async row=>{sent.push(row);return {messageId:`sent-${sent.length}`};});
  assert(sent.length);assert(sent.every(r=>!r.payload.includes("apologizes")));
  if(mode==="private")assert(sent.every(r=>r.target_user_id===scope.actorUserId));
  assert.equal(ai.requests.length,1);
}));

test("PVP30aa voice refuses raw cross-actor narration before any synthesis",()=>nativeFixture(async f=>{
  const {VoiceNarrator}=await import("../src/voice.js");resolved(f);let calls=0;
  const voice=new VoiceNarrator({voiceEnabled:true},{db:f.db,getConnection:()=>({}),synthesize:async()=>{calls++;return Buffer.alloc(0);}});
  const result=await voice.narrate({id:f.guild},"Choso apologizes for losing.",{force:true});
  assert.equal(result.reason,"unverified_output");assert.equal(calls,0);
}));

test("PVP30ag unrelated native scene retains ordinary narration",()=>nativeFixture(f=>{
  resolved(f);const director=f.db.getDirectorState(f.session.id);
  f.db.setDirectorState(f.session.id,{scene_number:director.scene_number+1});
  assert.doesNotThrow(()=>validateNarrativeClaims(f.db,f.guild,{narration:"Rain falls on the pavement.",narrative_claims:[]},
    {mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id}));
}));

test("PVP30ai voice repeat must revalidate revoked owner clause before replaying cached audio",()=>nativeFixture(async f=>{
  const {VoiceNarrator}=await import("../src/voice.js"),{prepareAuthorizedTurnOutput,deliveredPartyOutput}=await import("../src/pvp-output.js");
  const {deliverTurnOutbox}=await import("../src/publication-outbox.js");
  const {base}=resolved(f),n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,base);published(f,n,base);
  const scope={mode:"party",actorUserId:f.pcs[2].owner_user_id,actorCharacterId:f.pcs[2].id},result={narration:"untrusted draft"};
  prepareAuthorizedTurnOutput(f.db,f.guild,result,scope);
  const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:"voice-replay",actorPrincipal:scope.actorUserId,
    sessionId:f.session.id,audience:"party"});
  queueTurnPublications(f.db,{guild:{id:f.guild},session:f.session,result,scope,turnId:turn.turn_id});
  await deliverTurnOutbox(f.db,f.guild,turn.turn_id,async()=>({messageId:"offline-voice-publication"}));
  const text=deliveredPartyOutput(f.db,f.guild,turn.turn_id);
  const voice=new VoiceNarrator({voiceEnabled:true,voiceMode:"on",voiceMaxCharsPerTurn:4000,voiceMaxQueue:5},
    {db:f.db,getConnection:()=>({}),synthesize:async()=>Buffer.from("offline-fake-audio")});
  voice.ffmpegAvailable=true;voice._enqueueReserved=()=>{};let replays=0;voice._enqueue=()=>{replays++;return true;};
  assert.equal((await voice.narrate({id:f.guild},text,{force:true,turnId:turn.turn_id})).ok,true);
  indexWorldEvent(f.db,f.guild,{key:n.source_event,status:"retracted"},f.pcs[0].owner_user_id);
  assert.throws(()=>voice.repeat(f.guild),/source|clause|proof|authoriz|revok/i);
  assert.equal(replays,0);
}));

test("OBS21 native NPC description inquiry must not be swallowed by unrelated PC PvP protection",()=>nativeFixture(async f=>{
  const {captureWorldInput}=await import("../src/autonomous-world.js"),{commitGmTurn}=await import("../src/turn-orchestration.js");
  resolved(f);f.db.upsertNpcProfile(f.guild,{npcKey:"station-attendant",displayName:"Station Attendant",
    publicIdentity:"The station attendant wears a blue coat.",portrayal:"An ordinary station attendant.",source:"gm"});
  f.db.setSimulationEntity(f.guild,"npc","station-attendant",{name:"Station Attendant",location_key:"terminal"});
  // v9.3.2: establish selected fields through the authenticated GM command, not profile prose.
  const {fakeInteraction}=await import("./contract-fixtures.mjs");
  const description=fakeInteraction({sub:"scene-description",json:{entity_type:"npc",entity_key:"station-attendant",
    location_key:"terminal",visibility:"party",facts:{coat:"blue"}}});
  Object.assign(description,{guildId:f.guild,id:"obs21-gm-description",commandName:"vc-gm",isChatInputCommand:()=>true});
  description.user.username="Synthetic GM";
  await handleCommand(description,{db:f.db,gm:{}});
  const pc=f.pcs[2],text="What does the station attendant look like?",scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,"npc-description-question",text);
  const result={respond:true,narration:"The station attendant wears a blue coat.",narrative_claims:[],player_intents:[{
    type:"observe",source_span:text,target_name:"Station Attendant",target_key:"station-attendant",destination:"unspecified",
    operation:"appearance",utterance:"",excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"NPC description inquiry."}]};
  commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"NPC inquiry",
    meta:{messageId:"npc-description-question",triggerText:text}});
  assert.match(result.narration,/station attendant/i);
  assert.match(result.narration,/blue coat/i);
  assert(!result.narration.includes("apologizes"));
}));
