import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { applyGMEvents } from "../src/state.js";
import { baseBattlePoints, partyTier, livePcRoster, autoBuildComposition, recomputeBudget, EncounterLibrary } from "../src/encounter.js";
import { buildCombatants, hpMarksForDamage } from "../src/combat.js";
import { prepareLevelup, applyLevelupToData, validateConceptDraft } from "../src/character-system.js";
import { GMService, parseStructuredJsonText } from "../src/gm.js";
import { createPlayerExportFiles, createGmExportFiles } from "../src/character-export.js";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"veilkeeper31-"));
const dbPath=path.join(dir,"test.sqlite");
const schema=path.resolve(process.cwd(),"./sql/schema.sql");
const db=new VeiledDB(dbPath,schema);
const guild="guild-test", user="player-a", user2="player-b";
db.ensureCampaign(guild);
db.configureCampaign(guild,{playChannelId:"play",gmRoleId:"gm",responseMode:"assisted"});
db.configureChannels(guild,{rulesChannelId:"rules",caseBoardChannelId:"cases",journalChannelId:"journal",knownNpcsChannelId:"npcs",knownLocationsChannelId:"locations",gmLogChannelId:"gmlog",stateErrorsChannelId:"errors"});
db.upsertPlayer(guild,user,"Tester");
db.upsertPlayer(guild,user2,"Guest Tester");
db.setPrivateChannel(guild,user,"private-a");
const char=db.createCharacter(guild,user,"Test Detective",{class:"Ranger",domains:["Bone","Veil"],home:"Mercer Investigations",gm_hooks:["An impossible cold case"]});
const char2=db.createCharacter(guild,user2,"Test Medium",{class:"Bard",domains:["Grace","Veil"],unresolved_incident:"A ghost knows their name."});
const session=db.startSession(guild,"Smoke Test","crossed_cases");
if(session.assembly_mode!=="crossed_cases"||session.assembly_phase!=="assembly") throw new Error("Assembly session initialization failed.");
db.setPresence(session.id,user,"present");
db.assignCharacter(session.id,user,char.id);
db.setPresence(session.id,user2,"present");
db.assignCharacter(session.id,user2,char2.id);
db.setAssemblyPlan(session.id,{
  public_opening:"Two unrelated investigations converge.",
  convergence_goal:"Discover the shared supernatural link.",
  character_entries:[],
  bonds:[{from_character:"Test Detective",to_character:"Test Medium",reason:"Each holds a clue the other needs."}],
  gm_notes:"test"
});
if(db.getAssemblyPlan(session.id).convergence_goal!=="Discover the shared supernatural link.") throw new Error("Assembly plan persistence failed.");
db.setAssemblyPhase(session.id,"converged");
if(db.getSession(session.id).assembly_phase!=="converged") throw new Error("Assembly phase update failed.");
const party=db.establishParty(guild,session.id,{name:"Test Team",bonds:db.getAssemblyPlan(session.id).bonds});
if(!party.established||party.members.length!==2||!db.partyHasCharacter(guild,char.id)) throw new Error("Persistent party state failed.");

db.addMessage({guildId:guild,sessionId:session.id,userId:user,speakerName:"Test Detective",characterId:char.id,visibility:"character",subjectCharacterId:char.id,content:"I inspect the mark privately."});

const privateResults=applyGMEvents(db,guild,session.id,[
  {type:"clue",key:"private-mark",target_user_id:"",target_character_id:"",amount:0,value:"The mark belongs to a hidden court.",visibility:"party",note:"",status:""},
  {type:"npc_update",key:"Mara Voss",target_user_id:"",target_character_id:"",amount:0,value:"Lantern Office investigator; cautiously cooperative.",visibility:"party",note:"",status:""}
],{mode:"private",actorUserId:user,actorCharacterId:char.id});
if(privateResults.some(x=>x.publish)) throw new Error("Private knowledge was incorrectly marked publishable.");
const privateFacts=db.factsFor(guild,user,{characterId:char.id,includeGM:false});
if(!privateFacts.some(x=>x.fact_key==="private-mark"&&x.visibility==="character")) throw new Error("Private clue scoping failed.");

const partyResults=applyGMEvents(db,guild,session.id,[
  {type:"thread",key:"case-1",target_user_id:"",target_character_id:"",amount:0,value:"Find the missing caller",visibility:"party",note:"Three calls trace to the transit grid.",status:"active"},
  {type:"npc_update",key:"Mara Voss",target_user_id:"",target_character_id:"",amount:0,value:"Lantern Office investigator; cautiously cooperative.",visibility:"party",note:"",status:""},
  {type:"location_update",key:"Hollow Street",target_user_id:"",target_character_id:"",amount:0,value:"A discovered occult street with unstable entrances.",visibility:"party",note:"",status:""}
],{mode:"party",actorUserId:user,actorCharacterId:char.id});
if(partyResults.filter(x=>x.publish).length!==3) throw new Error("Party publishing flags failed.");
if(!db.getPlayerByPrivateChannel(guild,"private-a")) throw new Error("Private channel lookup failed.");
if(db.getCharacter(char.id).data.home!=="Mercer Investigations") throw new Error("Structured character hook preservation failed.");
if(db.listReferences(guild,"npc").length!==1||db.listReferences(guild,"location").length!==1) throw new Error("Reference upsert failed.");
if(db.recentMessagesFor(guild,"other",{characterId:"other",limit:10}).some(x=>x.visibility==="character")) throw new Error("Private message isolation failed.");


// v3.1.2 guest-controlled NPC antagonist proxy.
const npcPacket={
  npc_name:"Doctor Vale",
  public_identity:"An occult researcher known to the party.",
  portrayal:"Controlled, clinical, impatient with uncertainty.",
  current_objective:"Recover the seized correction device without exposing Aster Vale's wider network.",
  known_information:["The device was moved after containment."],
  relationships:["Distrusts Mercer."],
  capabilities:["Occult analysis", "Prepared warding technique"],
  limitations:["Does not know Mercer private-channel discoveries."],
  scene_cues:["Prefers negotiation before escalation."]
};
let npcProxy=db.upsertNpcProxy(guild,session.id,{npcName:"Doctor Vale",userId:user2,controlLevel:"tactical",status:"offered",playerPacket:npcPacket,gmNote:"GM-only packet test"});
if(npcProxy.status!=="offered"||npcProxy.knowledge_id!=="npc:doctor-vale") throw new Error("NPC proxy offer persistence failed.");
npcProxy=db.activateNpcProxy(npcProxy.id,user2);
const npcAssignments=db.npcProxyAssignments(session.id,user2);
if(npcAssignments.length!==1||!npcAssignments[0].npc_proxy||npcAssignments[0].name!=="Doctor Vale") throw new Error("NPC proxy activation/controller mapping failed.");
db.addFact(guild,{category:"clue",key:"vale-private-test",content:"Vale knows a private antagonist-only fact.",visibility:"character",subjectCharacterId:npcProxy.knowledge_id,sessionId:session.id,source:"test"});
if(db.factsFor(guild,user2,{characterId:char2.id,includeGM:false}).some(x=>x.fact_key==="vale-private-test")) throw new Error("NPC-private knowledge leaked into the guest player's PC knowledge.");
if(!db.factsFor(guild,user2,{characterId:npcProxy.knowledge_id,includeGM:false}).some(x=>x.fact_key==="vale-private-test")) throw new Error("NPC-private knowledge was not retrievable by NPC proxy context.");

db.releaseNpcProxy(npcProxy.id);
if(db.npcProxyAssignments(session.id,user2).length!==0) throw new Error("NPC proxy release failed.");

// v3.1.3 multiplayer Battle Point encounter builder persistence.
const encounterLib=new EncounterLibrary(path.resolve(process.cwd(),"../content"));
const combatRoster=livePcRoster(db,session.id);
if(combatRoster.length!==2) throw new Error("Live encounter roster count failed.");
const encounterTier=partyTier(combatRoster);
const encounterBase=baseBattlePoints(combatRoster.length);
if(encounterBase!==8||encounterTier!==1) throw new Error("Battle Point base/tier calculation failed.");
let composition=autoBuildComposition({adversaries:encounterLib.adversaries,tier:encounterTier,budget:encounterBase,pcCount:combatRoster.length,style:"balanced"});
let calc=recomputeBudget({tier:encounterTier,base_bp:encounterBase,difficulty:"standard",custom_adjustment_bp:0,damage_boosted:0,composition});
const encounter=db.createEncounter(guild,session.id,{tier:encounterTier,pc_count:combatRoster.length,difficulty:"standard",style:"balanced",base_bp:encounterBase,budget_bp:calc.budget,spent_bp:calc.spent,objective:"Protect the witness",environment_name:"Occult Crime Scene",composition,adjustments:calc.derived});
if(encounter.base_bp!==8||encounter.pc_count!==2||!encounter.composition.length) throw new Error("Encounter persistence failed.");
if(encounter.composition.some(x=>x.type==="Minion"&&x.unit_count%x.quantity!==0)) throw new Error("Minion group sizing failed.");
const activeEncounter=db.setEncounterStatus(encounter.id,"active");
if(activeEncounter.status!=="active"||db.getCurrentEncounter(session.id).id!==encounter.id) throw new Error("Encounter activation failed.");
const combatants=db.initializeCombatants(encounter.id,buildCombatants(activeEncounter,encounterLib));
if(!combatants.length) throw new Error("Deterministic combatant initialization failed.");
const firstCombatant=combatants[0];
const marks=hpMarksForDamage(firstCombatant,Math.max(1,firstCombatant.major_threshold||1));
const damaged=db.updateCombatant(firstCombatant.id,{hp_current:firstCombatant.hp_current-marks,conditions:["Vulnerable until next spotlight"]});
if(damaged.hp_current>=firstCombatant.hp_current||!damaged.conditions.length) throw new Error("Combatant HP/condition tracking failed.");
db.recordSpotlight(encounter.id,char.id);
if((db.getEncounter(encounter.id).combat_state?.spotlight?.counts?.[char.id]||0)!==1) throw new Error("Spotlight tracking failed.");
if(db.changeFear(guild,2)!==2) throw new Error("Fear tracking failed.");
db.setEncounterStatus(encounter.id,"ended");
if(db.getCurrentEncounter(session.id)) throw new Error("Encounter end/current lookup failed.");
// v3.2 character concept + advancement validation.
const conceptDraft={name:"Example",class:"Ranger",subclass:"Wayfinder",ancestry:"Spirit-Touched",community:"Institutionborne",domains:["Bone","Veil"],traits:{agility:1,strength:0,finesse:1,instinct:2,presence:-1,knowledge:0},experiences:["Private Investigator","Former Detective"],domain_cards:["Card A","Card B"],hook_proposals:[{text:"The old case is unresolved.",classification:"open_question"}]};
if(!validateConceptDraft(conceptDraft).ok) throw new Error("Character concept validation failed.");
const savedDraft=db.createCharacterDraft(guild,user,"Example detective",conceptDraft);
if(!db.latestCharacterDraft(guild,user)?.id===savedDraft.id) throw new Error("Character draft persistence failed.");
const levelChar=db.updateCharacterData(char.id,d=>{d.level=1;d.proficiency=1;d.experiences=[{name:"Private Investigator",modifier:2},{name:"Former Detective",modifier:2}];d.resources={hp:{current:6,max:6},stress:{current:0,max:6},hope:2,armor:{current:0,max:3}};d.domains=["Bone","Veil"];d.domain_cards=[];d.advancement_state={trait_marks:[],slot_usage:{},history:[]};});
const plan=prepareLevelup(levelChar,{advancementOne:"hp",advancementTwo:"stress",domainCard:"Test Bone Card",domain:"Bone",cardLevel:2,tierExperience:"Occult Casework",customCards:{}});
const leveled=applyLevelupToData(levelChar.data,plan);
if(leveled.level!==2||leveled.proficiency!==2||leveled.resources.hp.max!==7||leveled.resources.stress.max!==7) throw new Error("Validated level-up application failed.");
const ld=db.createLevelupDraft(guild,user,char.id,1,2,{plan}); db.updateLevelupDraft(ld.id,{plan},"ready");

// v3.2 canon conflict resolution and rules ruling persistence.
let canon=db.proposeCanon(guild,{key:"npc.test.identity",value:"Known identity",visibility:"party",sessionId:session.id,sourceType:"test",sourceId:"test"});
if(canon.status!=="accepted") throw new Error("Canon establishment failed.");
canon=db.proposeCanon(guild,{key:"npc.test.identity",value:"Contradictory identity",visibility:"party",sessionId:session.id,sourceType:"test",sourceId:"test"});
if(canon.status!=="conflict") throw new Error("Canon conflict detection failed.");
const resolvedCanon=db.resolveCanonConflict(guild,canon.conflict.id,{resolution:"existing",actorId:"gm"});
if(resolvedCanon.value!=="Known identity") throw new Error("Canon conflict resolution failed.");
const ruling=db.upsertRulesRuling(guild,{key:"test-ruling",question:"Test?",ruling:"Use the saved ruling.",createdBy:"gm"});
if(!db.searchRulesRulings(guild,"").some(x=>x.id===ruling.id)) throw new Error("Rules ruling persistence failed.");

// v3.2 snapshot/rollback.
const snap=db.snapshotCampaign(guild,{label:"Before mutation",reason:"offline test",createdBy:"gm"});
db.changeVeilExposure(guild,3);
db.restoreSnapshot(guild,snap.id,{actorId:"gm"});
if(db.getCampaign(guild).veil_exposure!==0) throw new Error("Snapshot rollback failed.");

const autoRelease=db.upsertNpcProxy(guild,session.id,{npcName:"Cicada",userId:user2,controlLevel:"portrayal",status:"active",playerPacket:{current_objective:"Test"}});
if(!db.npcProxyAssignments(session.id,user2).some(x=>x.id===autoRelease.id)) throw new Error("Second NPC proxy activation failed.");
db.endSession(guild,"Smoke test complete.");
if(db.listNpcProxies(session.id,{statuses:["active","offered"]}).length!==0) throw new Error("Session-end NPC proxy auto-release failed.");
const cycle=db.openDowntime(guild,{label:"Test Downtime",sourceSessionId:session.id,openedBy:"gm"});
const project=db.addDowntimeProject(cycle.id,guild,{userId:user,characterId:char.id,type:"research",title:"Research the Mark",objective:"Identify its origin",maxProgress:4,visibility:"party"});
db.updateDowntimeProject(project.id,{progress:2,status:"active",result:"Partial lead."});
if(db.listDowntimeProjects(cycle.id)[0].progress!==2) throw new Error("Downtime project tracking failed.");
db.resolveDowntimeCycle(cycle.id,"Downtime test resolved.");
if(db.getDowntimeCycle(cycle.id).status!=="resolved") throw new Error("Downtime cycle resolution failed.");


// v3.2.3 structured JSON robustness: quoted player text + truncated first response retry.
const quotedDescription=`An orphan called "Rat Princess" says the grave whispers "don't follow"; path C:\\Temp\\veil\nShe carries {chalk} and a key.`;
const roundTrip=parseStructuredJsonText(JSON.stringify({description:quotedDescription}),{label:"quoted-input regression"});
if(roundTrip.description!==quotedDescription) throw new Error("Quoted/backslash/newline JSON round-trip failed.");
let truncatedDetected=false;
try{ parseStructuredJsonText('{"name":"Ryas","notes":"unfinished',{label:"truncated regression"}); }
catch(e){ truncatedDetected=e.code==="STRUCTURED_JSON_TRUNCATED"; }
if(!truncatedDetected) throw new Error("Unexpected-end/truncated JSON was not detected.");
let malformedQuoteDetected=false;
try{ parseStructuredJsonText('{"name":"Ryas","notes":"Known as "Rat Princess"."}',{label:"quoted-output regression"}); }
catch(e){ malformedQuoteDetected=e.code==="STRUCTURED_JSON_INVALID"; }
if(!malformedQuoteDetected) throw new Error("Malformed quoted JSON was not detected.");
let structuredCalls=0;
const retryDraft={
  name:"Ryas",pronouns:"she/her",class:"Ranger",subclass:"Wayfinder",ancestry:"Spirit-Touched",community:"Streetborne",
  domains:["Bone","Veil"],traits:{agility:1,strength:0,finesse:1,instinct:2,presence:-1,knowledge:0},
  resources:{hp:{current:0,max:0},stress:{current:0,max:0},hope:2,armor:{current:0,max:0}},evasion:0,proficiency:1,
  experiences:["Street Survivor","Grave-Touched"],domain_cards:["Untouchable","Threshold Sense"],inventory:[],background:"Orphaned street survivor.",
  home:"The streets",person:"",obligation:"Stay alive",opening_status:"On the run",goals:["Understand the grave resonance"],
  unresolved_incident:"A near-death event left a grave resonance.",faction_connections:[],entry_hooks:["A ghost points her toward the current incident"],exit_hooks:["She disappears into the city"],
  hook_proposals:[{text:"Why does the grave keep noticing her?",classification:"open_question"}],notes:'Known as "Rat Princess".',mechanical_notes:"Verify exact class chassis values."
};
const fakeAI={responses:{create:async(req)=>{
  structuredCalls++;
  if(structuredCalls===1) return {status:"incomplete",incomplete_details:{reason:"max_output_tokens"},output_text:'{"name":"Ryas","notes":"Known as \"Rat Princess\"'};
  if(!String(req.input).includes("STRUCTURED OUTPUT RETRY")) throw new Error("Structured retry instruction missing.");
  if(Number(req.max_output_tokens||0)<3000) throw new Error("Structured retry did not increase output budget.");
  return {status:"completed",output_text:JSON.stringify(retryDraft)};
}}};
const fakeContent={search:()=>[]};
const jsonGM=new GMService({db:null,content:fakeContent,config:{openaiKey:"test",maxContentChunks:8,characterModel:"test-model",characterMaxOutputTokens:1800,structuredRetryMaxTokens:6000},ai:fakeAI});
const generated=await jsonGM.draftCharacterConcept({guildId:"g",userId:"u",userName:"Tester",description:quotedDescription});
if(generated.name!=="Ryas"||structuredCalls!==2) throw new Error("Structured concept retry failed.");

// v3.2.4 live character export: player-safe + GM hooks/private/canon in JSON/Markdown/DOCX.
db.addFact(guild,{category:"secret",key:"export-secret",content:"Character-linked private fact.",visibility:"gm",subjectCharacterId:char.id,source:"test"});
db.proposeCanon(guild,{key:"test_detective.hidden_origin",value:"Test Detective has a hidden origin.",visibility:"gm",sourceType:"test",sourceId:char.id,provenance:"export test"});
const liveCharacter=db.getCharacter(char.id);
const playerExports=createPlayerExportFiles({db,guildId:guild,character:liveCharacter,format:"all"});
if(playerExports.length!==3||!playerExports.some(x=>x.name.endsWith(".docx"))||!playerExports.some(x=>x.name.endsWith(".json"))||!playerExports.some(x=>x.name.endsWith(".md"))) throw new Error("Player all-format export failed.");
if(!playerExports.find(x=>x.name.endsWith(".docx")).buffer.subarray(0,2).equals(Buffer.from("PK"))) throw new Error("Player DOCX export is not a ZIP/OOXML package.");
const gmExports=createGmExportFiles({db,guildId:guild,character:liveCharacter,format:"all"});
if(gmExports.length!==9) throw new Error("GM all-format export should produce nine files.");
for(const prefix of ["GM_HOOKS_Test_Detective","GM_PRIVATE_Test_Detective","GM_CANON_Test_Detective"]){
  for(const ext of ["json","md","docx"]) if(!gmExports.some(x=>x.name===`${prefix}.${ext}`)) throw new Error(`Missing GM export ${prefix}.${ext}`);
}
const gmPrivateJson=JSON.parse(gmExports.find(x=>x.name==="GM_PRIVATE_Test_Detective.json").buffer.toString("utf8"));
if(!gmPrivateJson.private_facts.some(x=>x.key==="export-secret")) throw new Error("GM-private character facts missing from export.");
const gmCanonJson=JSON.parse(gmExports.find(x=>x.name==="GM_CANON_Test_Detective.json").buffer.toString("utf8"));
if(!gmCanonJson.canon.some(x=>x.key==="test_detective.hidden_origin")) throw new Error("Character-associated canon missing from export.");

console.log("Veilkeeper v3.2.4 offline smoke test: PASS");
db.close();
fs.rmSync(dir,{recursive:true,force:true});
