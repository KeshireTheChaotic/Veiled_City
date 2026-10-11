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
