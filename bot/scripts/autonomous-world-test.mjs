/** Synthetic autonomous world/agency/privacy/replay regression; no production DB or external calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { applyAuthoritativeMutation, previewAuthoritativeMutation } from "../src/state.js";
import { captureWorldInput, applyAutonomousWorld, configureWorldAuthority, retconAutonomousEntity } from "../src/autonomous-world.js";
import { stateRevision } from "../src/ai-intents.js";
import { resolvePlaceReference } from "../src/location-language.js";
import { prepareSceneEntry } from "../src/scene-entry.js";
import { worldRequirements, hasCharacterInvitation } from "../src/player-language.js";
import { scenePresence } from "../src/scene-continuity.js";
import { configureCityFlags } from "../src/city-core.js";
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-autonomous-world-")),file=path.join(dir,"world.sqlite");
let db=new VeiledDB(file,path.resolve("sql/schema.sql"));
const guild="contract";db.ensureCampaign(guild);db.ensureCampaign("other");
const session=db.startSession(guild,"Ordinary world");db.upsertPlayer(guild,"owner","Owner");db.upsertPlayer(guild,"second","Second");
const pc=db.createCharacter(guild,"owner","Tyrell",{}),other=db.createCharacter(guild,"second","Other",{});
for(const [user,c] of [["owner",pc],["second",other]]){db.assignCharacter(session.id,user,c.id);db.setPresence(session.id,user,"present");}
const scope={mode:"party",actorUserId:"owner",actorCharacterId:pc.id};
const location=(key,name=key,parent="",visibility="party")=>({kind:"location",key,name,summary:"A modest ordinary public place.",parent_location_key:parent,visibility});
const action=(kind,entity_ref,source_span,zone="")=>({kind,entity_ref,source_span,zone});
const input=(id,text,result,sc=scope)=>{
  captureWorldInput(db,guild,sc.actorUserId,sc.actorCharacterId,id,text,{privateScene:sc.mode==="private"});
  const player_intents=Object.hasOwn(result,"player_intents")?result.player_intents:(result.scene_actions||[])
    .filter(row=>text.includes(row.source_span)).map(row=>({type:row.kind==="move"?"move":row.kind==="local_zone"?"local_zone":
      row.kind==="introduce_npc"?"interact":"search",source_span:row.source_span,
      target_name:row.entity_ref,target_key:row.entity_ref,destination:row.kind==="local_zone"?"zone":
        row.zone==="interior"?"interior":row.zone==="exterior"?"exterior":"unspecified",
      operation:row.kind,utterance:"",excluded_targets:[],framing:"immediate",resolution:"auto",reason:"Current typed routing fixture."}));
  const narrative=Object.hasOwn(result,"player_intents")||player_intents.length?{...result,player_intents}:result;
  return {guildId:guild,sessionId:session.id,narrative,scope:sc,provenance:{messageId:id}};
};
try{
  const search="I look for an open public place, keeping out of the light, not Hollow Street.";
  assert.deepEqual(worldRequirements(search).exclude_locations,["Hollow Street"]);
  assert.equal(worldRequirements(search).movement,"none");
  const finding={world_additions:[location("laundromat","All-Night Laundromat")],scene_actions:[action("reveal_nearby_place","laundromat",search)]};
  const findInput=input("find",search,finding);
  previewAuthoritativeMutation(db,findInput);assert.equal(db.getSimulationEntity(guild,"location","laundromat"),null);
  applyAuthoritativeMutation(db,findInput);assert.equal(db.getCharacter(pc.id).data.location,undefined,"R01/R02: search never moves the PC");
  assert.equal(db.listCityRecords(guild,{kind:"world_conflict",includeGM:true}).length,0);
  const badExcluded=input("exclude",search,{world_additions:[location("hollow-street","Hollow Street")],player_intents:[{
    type:"search",source_span:search,target_name:"",target_key:"",destination:"unspecified",operation:"search",utterance:"",
    excluded_targets:["Hollow Street"],framing:"immediate",resolution:"auto",reason:""}]});
  assert.throws(()=>applyAuthoritativeMutation(db,badExcluded),/excluded/);
  assert.equal(db.getSimulationEntity(guild,"location","hollow-street"),null);
  const enter="I enter the diner.";
  const claims=[{actor:"",entity_type:"character",entity:pc.id,action:"movement",prior:"",proposed:"diner",visibility:"party",
    source_ref:"",source_span:"You arrive at the diner.",mutation_index:-1,certainty:"committed"}];
  const entering={world_additions:[location("diner","Diner")],scene_actions:[action("move","diner",enter)],
    narration:"You arrive at the diner.",narrative_claims:claims};
  const enterInput=input("enter",enter,entering);applyAuthoritativeMutation(db,enterInput);
  assert.equal(db.getCharacter(pc.id).data.location,"diner","R03: unknown diner can be created and entered with flags off");
  assert.equal(scenePresence(db,guild,"character",pc.id).location_key,"diner");
  const events=db.listCityRecords(guild,{kind:"autonomous_entity",includeGM:true}).length;
  db.close();db=new VeiledDB(file,path.resolve("sql/schema.sql"));
  applyAuthoritativeMutation(db,enterInput);assert.equal(db.listCityRecords(guild,{kind:"autonomous_entity",includeGM:true}).length,events,"R04 restart replay");
  const upstairs="I go upstairs.";
  applyAuthoritativeMutation(db,input("upstairs",upstairs,{scene_actions:[action("local_zone","diner",upstairs,"upstairs")]}));
  assert.equal(db.getCharacter(pc.id).data.location,"diner");assert.equal(scenePresence(db,guild,"character",pc.id).data.zone,"upstairs","R06");
  const clerk="I ask the clerk who runs the place.";
  const npc={kind:"npc",key:"mara",name:"Mara",summary:"A diner clerk.",location_key:"diner",visibility:"party",
    occupation:"Clerk",public_identity:"An ordinary local worker",portrayal:"Dry wit; short practical sentences"};
  applyAuthoritativeMutation(db,input("clerk",clerk,{world_additions:[npc],scene_actions:[action("introduce_npc","mara",clerk)]}));
  assert.equal(db.getNpcProfile(guild,"mara").display_name,"Mara");assert.equal(scenePresence(db,guild,"npc","mara").location_key,"diner","R07");
  assert.equal(db.listNpcKnowledge(guild,"mara",{limit:100}).length,0,"R09: no omniscient knowledge");
  applyAuthoritativeMutation(db,input("clerk-again",clerk,{world_additions:[npc],scene_actions:[action("introduce_npc","mara",clerk)]}));
  assert.equal(db.listNpcProfiles(guild,{limit:100}).filter(p=>p.display_name==="Mara").length,1,"R08/R15 identity dedup");
  applyAuthoritativeMutation(db,input("clerk-third",clerk,{scene_actions:[action("introduce_npc","mara",clerk)]}));
  assert.equal(db.getNpcProfile(guild,"mara").activity_tier,"supporting","Repeated legitimate appearances promote continuity without human review");
  const proxy=db.upsertNpcProxy(guild,session.id,{npcName:"Mara",userId:"second",status:"active"});
  assert.throws(()=>applyAuthoritativeMutation(db,input("proxy",clerk,{scene_actions:[action("introduce_npc","mara",clerk)]})),/proxy|control\/status/);
  db.releaseNpcProxy(proxy.id);
  assert.equal(resolvePlaceReference(db,guild,pc.id,"my diner",{user:"owner"}).location.entity_key,"diner","R05 possessive/qualified place identity");
  const encounter=db.createEncounter(guild,session.id,{status:"active",tier:1,pc_count:2,base_bp:6,budget_bp:6});
  const combatText="I enter the Combat Shop.";
  assert.throws(()=>applyAuthoritativeMutation(db,input("combat",combatText,{world_additions:[location("combat-shop","Combat Shop","diner")],
    scene_actions:[action("move","combat-shop",combatText)]})),/combat rules/);
  assert.equal(db.getSimulationEntity(guild,"location","combat-shop"),null,"R14 combat denial rolls back proposed place and movement");
  db.setEncounterStatus(encounter.id,"ended");
  const canon=db.proposeCanon(guild,{key:"mystery.answer",value:"Locked answer",visibility:"gm"}).event;
  const conflicting={world_conflicts:[{canon_key:"mystery.answer",current_event_id:canon.id,proposed_value:"Different answer",reason:"Explicitly conflicting durable answer"}],narration:"Rain taps against the glass."};
  applyAuthoritativeMutation(db,input("conflict","I look around.",conflicting));
  assert.equal(db.currentCanon(guild,"mystery.answer").value,"Locked answer");assert.equal(db.listCanonConflicts(guild).length,1,"R10");
  assert.throws(()=>applyAuthoritativeMutation(db,input("not-conflict","I look around.",{world_conflicts:[{canon_key:"absent",current_event_id:"absent",proposed_value:"New",reason:"Missing"}]})),/specific current/);
  const privateScope={...scope,mode:"private"};
  const privateText="I enter the Quiet Shop.";
  applyAuthoritativeMutation(db,input("private",privateText,{world_additions:[location("quiet-shop","Quiet Shop","diner","character")],
    scene_actions:[action("move","quiet-shop",privateText)]},privateScope));
  assert.equal(scenePresence(db,guild,"character",pc.id).visibility,"character");
  assert.equal(db.getReference(guild,"location","quiet-shop").subject_character_id,pc.id,"R11");
  const privateIdentity=db.getCityRecord(guild,"autonomous_entity","location:quiet-shop");
  retconAutonomousEntity(db,guild,{op:"retcon",kind:"location",key:"quiet-shop",expected_revision:stateRevision(privateIdentity),
    summary:"A small public shop with a blue awning.",reason:"Correct the scene description."},"gm");
  assert.equal(db.getSimulationEntity(guild,"location","quiet-shop").state.description,"A small public shop with a blue awning.");
  assert.equal(db.getReference(guild,"location","quiet-shop").visibility,"character","Human retcon preserves original privacy");
  assert.equal(db.getSimulationEntity("other","location","quiet-shop"),null,"Guild isolation");
  applyAuthoritativeMutation(db,input("secret-place","I look around.",{world_additions:[location("hidden-world-only","Hidden World Only","quiet-shop","gm")]},privateScope));
  const secretIdentity=db.getCityRecord(guild,"autonomous_entity","location:hidden-world-only");
  assert.equal(db.getWorldEvent(guild,secretIdentity.source_event).visibility,"gm","R19: creation provenance cannot leak a GM-only identity");
  assert.equal(db.getReference(guild,"location","hidden-world-only")??null,null);
  assert.throws(()=>applyAuthoritativeMutation(db,input("publish-private","I look around.",{world_additions:[location("private-leak","Private Leak","quiet-shop")]},privateScope)),/cannot publish/);
  const forge={...scope,actorUserId:"second"};
  assert.throws(()=>applyAutonomousWorld(db,guild,{world_additions:[location("forged")]},forge,{messageId:"forged"}),/owned/);
  db.setPresence(session.id,"owner","absent");
  assert.throws(()=>applyAutonomousWorld(db,guild,{world_additions:[location("absent")]},scope,{messageId:"absent"}),/attendance/);db.setPresence(session.id,"owner","present");
  const wrongShape=input("schema","I look around.",{world_additions:[{...location("bad-schema","Bad Schema","quiet-shop"),money:100}]});
  assert.throws(()=>applyAuthoritativeMutation(db,wrongShape),/Closed bounded/);assert.equal(db.getSimulationEntity(guild,"location","bad-schema"),null,"R16");
  for(const [id,addition] of [["blank-name",location("blank-name","","quiet-shop")],
    ["blank-summary",{...location("blank-summary","Blank Summary","quiet-shop"),summary:""}],
    ["non-normalized-key",location("not normalized","Not Normalized","quiet-shop")]]){
    assert.throws(()=>applyAuthoritativeMutation(db,input(id,"I look around.",{world_additions:[addition]})),/Closed bounded/,
      "Malformed optional world additions are rejected at the closed schema boundary before any write.");
    assert.equal(db.getSimulationEntity(guild,"location",addition.key),null);
  }
  const unsourced=input("atomic","I look around.",{world_additions:[location("rollback","Rollback","quiet-shop")],
    scene_actions:[action("move","rollback","I look around.")],player_intents:[]});
  assert.throws(()=>applyAuthoritativeMutation(db,unsourced),/typed intent authorization/);assert.equal(db.getSimulationEntity(guild,"location","rollback"),null,"Atomic rollback");
  const hypothetical='Someone says: "I enter the Diner."';
  assert.throws(()=>applyAuthoritativeMutation(db,input("quoted",hypothetical,{scene_actions:[action("move","diner","I enter the Diner.")]})),/Quoted/);
  assert.equal(hasCharacterInvitation('**I look up at the rain and sigh, "I need work, PantryQueue isn\'t pulling in enough money..."**'),true);
  assert.equal(hasCharacterInvitation('OOC: I need work.'),false);
  configureWorldAuthority(db,guild,{gm_authority_mode:"manual"},"gm");
  assert.throws(()=>applyAuthoritativeMutation(db,input("manual","I look around.",{world_additions:[location("manual","Manual","quiet-shop")]})),/explicitly uses manual/);
  configureWorldAuthority(db,guild,{gm_authority_mode:"autonomous"},"gm");
  configureCityFlags(db,guild,{scene_continuity:true,natural_language:true});
  const legacy=prepareSceneEntry(db,guild,"owner",pc.id,"legacy","I enter the Corner Cafe.");
  db.saveCityRecord(guild,{...legacy,key:legacy.record_key,status:"pending"});
  captureWorldInput(db,guild,"owner",pc.id,"legacy-followup","That cafe.");
  assert.equal(db.getCityRecord(guild,"scene_entry",legacy.record_key).status,"awaiting_adjudication");
  applyAuthoritativeMutation(db,input("legacy-followup","That cafe.",{world_additions:[location("corner-cafe","Corner Cafe","quiet-shop")],
    scene_actions:[action("move","corner-cafe","I enter the Corner Cafe.")]}));
  assert.equal(db.getCityRecord(guild,"scene_entry",legacy.record_key).status,"resolved","Legacy current declaration can resolve through native AI-GM adjudication");
  const stale=prepareSceneEntry(db,guild,"owner",pc.id,"stale","I enter the Other Cafe.");
  db.updateCharacterData(pc.id,data=>{data.location="diner";});
  captureWorldInput(db,guild,"owner",pc.id,"after-stale","I look around.");
  assert.equal(db.getCityRecord(guild,"scene_entry",stale.record_key).status,"expired","Stale request cannot auto-move a PC");
  assert.deepEqual(db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  console.log("Autonomous world PASS: creation/search/arrival/local-zone/NPC continuity, atomic preview/rollback, restart replay, dedup, canon conflict, privacy/guild/owner/attendance/schema/manual controls.");
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
