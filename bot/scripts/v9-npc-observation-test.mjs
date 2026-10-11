/** Real command/turn/outbox adapters; selected native GM facts, never NPC paragraph passthrough. */
import test from "node:test";
import assert from "node:assert/strict";
import { nativeFixture } from "./v9-fixtures.mjs";
import { fakeInteraction } from "./contract-fixtures.mjs";
import { handleCommand } from "../src/commands.js";
import { captureWorldInput } from "../src/autonomous-world.js";
import { commitGmTurn } from "../src/turn-orchestration.js";
import { indexWorldEvent } from "../src/city-calendar.js";
import { revalidateOutputPublication } from "../src/pvp-output.js";

export async function describe(f,input,{gm=true,id="native-description"}={}){
  const interaction=fakeInteraction({gm,sub:"scene-description",json:input});
  Object.assign(interaction,{guildId:f.guild,id,commandName:"vc-gm",isChatInputCommand:()=>true});
  interaction.user.username="Synthetic GM";
  await handleCommand(interaction,{db:f.db,gm:{}});
  return interaction;
}
function npc(f){
  f.db.upsertNpcProfile(f.guild,{npcKey:"station-attendant",displayName:"Station Attendant",
    publicIdentity:"The station attendant wears a blue coat. Choso apologizes for losing.",source:"gm"});
  f.db.setSimulationEntity(f.guild,"npc","station-attendant",{name:"Station Attendant",location_key:"terminal"});
}
function query(f,target="station-attendant",operation="appearance",id="npc-question"){
  const pc=f.pcs[2],text="What does the station attendant look like?";
  const scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text);
  const result={respond:true,narration:"Choso apologizes for losing.",narrative_claims:[],player_intents:[{
    type:"observe",source_span:text,target_name:"Station Attendant",target_key:target,destination:"unspecified",
    operation,utterance:"",excluded_targets:[],framing:"immediate",resolution:"conversational",reason:"An inquiry."}]};
  const attempt=f.db.beginTurnAttempt({guildId:f.guild,messageId:id,actorPrincipal:pc.owner_user_id,
    sessionId:f.session.id,audience:"party"});
  const committed=commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result,scope,speaker:pc.name,label:"NPC inquiry",
    meta:{messageId:id,triggerText:text,turnId:attempt.turn_id}});
  return {result,committed};
}
const selected={entity_type:"npc",entity_key:"station-attendant",location_key:"terminal",visibility:"party",facts:{coat:"blue"}};
test("FH47/FH48 native GM selected NPC coat survives actual turn, not embedded PC agency",()=>nativeFixture(async f=>{
  npc(f);await describe(f,selected);
  const {result}=query(f);assert.match(result.narration,/Station Attendant.*blue coat/i);
  assert(!result.narration.includes("apologizes"));
}));
test("FH48 NPC public identity without selected evidence does not become canon",()=>nativeFixture(f=>{
  npc(f);const {result}=query(f);assert(!result.narration.includes("blue coat"));
  assert(!result.narration.includes("apologizes"));assert.match(result.narration,/not established|cannot currently/i);
}));
test("FH47 role authentication cannot be supplied through JSON",()=>nativeFixture(async f=>{
  npc(f);const reply=await describe(f,{...selected,gm:true},{gm:false});
  assert(reply.deliveries.some(d=>/permission/i.test(d.content)));
  assert.equal(f.db.listCityRecords(f.guild,{kind:"world_visible_fact",includeGM:true}).length,0);
}));
test("FH49 revoked NPC description cannot replay through queued output",()=>nativeFixture(async f=>{
  npc(f);await describe(f,selected);query(f);
  const proof=f.db.listCityRecords(f.guild,{kind:"world_visible_fact",includeGM:true})[0];assert(proof);
  const pending=f.db.listPendingPublications(f.guild,{limit:50});assert(pending.length);
  const rows=f.db.listTurnPublications(f.guild,pending[0].turn_id);
  indexWorldEvent(f.db,f.guild,{key:proof.source_event,status:"retracted"},"gm");
  assert.throws(()=>revalidateOutputPublication(f.db,f.guild,rows[0]),/proof|authoriz|source/i);
}));
test("FH50 native selected scenery projects without arbitrary paragraph",()=>nativeFixture(async f=>{
  f.db.setSimulationEntity(f.guild,"location","terminal",{name:"Terminal"});
  await describe(f,{entity_type:"location",entity_key:"terminal",location_key:"terminal",visibility:"party",facts:{weather:"rain"}});
  const {result}=query(f,"terminal","appearance");assert.match(result.narration,/rain/i);assert(!result.narration.includes("apologizes"));
}));
test("NPC absent/GM-only description remains unknown instead of remote or private perception",()=>nativeFixture(async f=>{
  npc(f);await describe(f,{...selected,visibility:"gm"});
  assert(!query(f).result.narration.includes("blue coat"));
  f.db.setSimulationEntity(f.guild,"npc","station-attendant",{location_key:"elsewhere"});
  assert.match(query(f,"station-attendant","appearance","absent-question").result.narration,/cannot currently/i);
}));
