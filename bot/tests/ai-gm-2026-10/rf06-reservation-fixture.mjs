import assert from 'node:assert/strict';
import {VeiledDB} from '../../src/db.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {captureWorldInput,indexWorldEvent} from '../../src/frameworks/world/public.js';
import {currentScene,recordScenePresence} from '../../src/frameworks/session/public.js';
import {persistPlayerIntents,connectUnifiedArbitration} from '../../src/framework-to-framework/daggerheart--intent/public.js';
import {createArbitrationOrigin,buildSceneIntentBoard} from '../../src/scene-intent-board.js';
import {adjudicateSceneBoard} from '../../src/gm-unified-arbitration.js';
import {executeUnifiedGmActions,inspectGmReactionInvitation,withdrawGmReactionInvitation} from '../../src/gm-native-rolls.js';
import {nativeGmNotice} from '../../src/gm-arbitration-output.js';
import {reserveGmArbitrationNotice} from '../../src/native-publications.js';
import {EncounterLibrary} from '../../src/frameworks/daggerheart/public.js';
// Load the production provider modules before the original startup bindings.
import '../../src/gm.js';
import '../../src/commands.js';
import '../../src/state.js';

initializeRuntimeFrameworks();
export function createReservationFixture(){
 const db=new VeiledDB(':memory:','sql/schema.sql'),guild='rf06-r65',user='owner-r65';
 try{
  db.ensureCampaign(guild);db.upsertPlayer(guild,user,'Owner');
  db.setCityCalendar(guild,{flags:{gm_discretion:true,narrative_authority:true,playable_narration:true,narrative_encounters:true,scene_continuity:true,roll_requests:true}});
  const session=db.startSession(guild,'Reservation qualification','already_together');
  const pc=db.createCharacter(guild,user,'Witness',{location:'crossing',traits:{Instinct:1}});
  db.updateCharacterData(pc.id,data=>{data.location='crossing';});
  db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');
  db.setSimulationEntity(guild,'location','crossing',{name:'Crossing',visibility:'party'});
  db.upsertNpcProfile(guild,{npcKey:'saint',displayName:'Traffic Saint'});
  db.setSimulationEntity(guild,'npc','saint',{name:'Traffic Saint',location_key:'crossing',visibility:'party'});
  const scene=currentScene(db,guild),scope={mode:'party',actorUserId:user,actorCharacterId:pc.id};
  const source=indexWorldEvent(db,guild,{key:'r65-placement',kind:'gm_selected_description',source_id:'gm',title:'Established crossing',session_id:session.id,scene:scene.key,location_key:'crossing',visibility:'party',details:{}},'gm');
  for(const [type,key] of [['character',pc.id],['npc','saint']])recordScenePresence(db,guild,{source_event:source.event_key,entity_type:type,entity_key:key,location_key:'crossing',zone:'crossing',range:'Melee',visibility:'party',...(type==='character'?{accepted_by:user}:{})},type==='character'?user:'gm');
  const library=new EncounterLibrary('../content'),template=library.findAdversary('Traffic Saint');assert.ok(template);
  const encounter=db.createEncounter(guild,session.id,{status:'active',tier:template.tier,pc_count:2,base_bp:8,budget_bp:8});
  const [combatant]=db.initializeCombatants(encounter.id,[{base_name:template.name,display_name:'Traffic Saint',role:template.type,tier:template.tier,hp_max:template.hp,stress_max:template.stress}]);
  db.saveCityRecord(guild,{kind:'encounter_binding',key:encounter.id,status:'active',source_event:source.event_key,visibility:'gm',data:{combatants:[{actor:'saint',id:combatant.id}]}});
  db.changeFear(guild,3);
  const text='What happens at the crossing?',messageId='r65-opportunity';
  const input=captureWorldInput(db,guild,user,pc.id,messageId,text);assert.ok(input);
  const rows=persistPlayerIntents(db,guild,[{type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation:'current_situation',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Owner asks the current situation.'}],scope,{messageId});assert.equal(rows.length,1);
  const origin=createArbitrationOrigin(db,guild,scope,input.event_key);
  const board=buildSceneIntentBoard(db,guild,origin,rows,[{actor_key:'saint',operation:'feature',target_refs:[pc.id],objective_ref:'',source_refs:[],dependencies:[]}]);
  const entry=board.data.entries.find(e=>e.actor.type==='npc');assert.ok(entry);
  const [decision]=adjudicateSceneBoard(db,guild,origin,board,[{intent_ref:entry.intent_ref,disposition:'native_feature_resolution',rule_basis_refs:['srd:reaction-rolls'],difficulty:14,trait:'Instinct',stakes_kind:'native_feature',stakes:'Movement restricted on failure.',reason:'Exact All Lanes Stop feature.',difficulty_reason:'Source feature difficulty.',feature_ref:'adversary:traffic-saint:all-lanes-stop',experience_ref:'',advantage:false,disadvantage:false}],{library,connectUnifiedArbitration});
  assert.equal(decision.status,'gm_action_ready',JSON.stringify(decision));
  const [execution]=executeUnifiedGmActions(db,guild,[decision],{library});assert.equal(execution.kind,'gm_group_feature_execution',JSON.stringify(execution));
  return {db,guild,user,pc,execution};
 }catch(error){db.close();throw error;}
}
