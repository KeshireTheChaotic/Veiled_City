import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHookProjection,publicationSessionScene,publicationWorldConstraints,publicationNarrativeAuthoring} from '../../src/frameworks/publication/public.js';
const unused=()=>{throw Error('Unexpected lower capability');};
publicationSessionScene.bind({currentScene:db=>db.scene,scenePresence:unused});
publicationWorldConstraints.bind({activeCityProxy:db=>db.proxyActive});
publicationNarrativeAuthoring.bind({findFreshScenePart:unused,renderFreshScenePart:unused,hasPcReference:(db,guild,value)=>db.pcReferences.has(value)});
const party={mode:'party',actorUserId:null,actorCharacterId:null},privateScope={mode:'private',actorUserId:'owner',actorCharacterId:'pc'};
function prepared(){
  const text='The clerk prepares to secure the station.',hook={id:'hook',kind:'hook',status:'ready',data:{action_id:'action',source_context:{session:'session',scene:'scene'},content:text}},action={id:'action',kind:'action',status:'completed',data:{actor_type:'npc',type:'prepare',actor_key:'clerk',goal_key:'secure',result:{success:true},public_hook:text}},mutation={id:'mutation',source_layer:'npc_director',mutation_type:'npc_action:prepare',after_json:JSON.stringify(action)},actor={state:{location_key:'station',visibility:'party'}},goal={objective:'Secure the station'},profile={display_name:'Clerk'},source={status:'active',source_kind:'mutation',source_id:'mutation'};
  const db={scene:{session_id:'session',key:'scene'},proxyActive:false,pcReferences:new Set(),getSimulationRecord:(guild,id)=>id==='hook'?hook:id==='action'?action:null,mutationsForEntity:()=>[mutation],getSimulationEntity:()=>actor,getNpcGoal:()=>goal,getNpcProfile:()=>profile,getCharacter:key=>key==='pc'?{data:{location:'station'}}:null,roster:()=>[{character_id:'pc',presence:'present'}],getWorldEvent:()=>source};
  return {db,hook,action,mutation,actor,goal,profile,source,text};
}
function deadline(){
  const schedule={schedule_key:'deadline',status:'fired',review_status:'approved',data:{visibility:'party',hook:'Rain audit due.'},due_minute:10},hook={id:'city-hook:guild:deadline',kind:'hook',status:'ready',data:{source:'gm_scheduled_notice',world_event:'schedule:deadline',content:'Rain audit due.'}},mutation={source_layer:'city',mutation_type:'scheduled_deadline',actor_id:'fictional_calendar',entity_key:'deadline',before_json:JSON.stringify({schedule_key:'deadline',due_minute:10,data:schedule.data}),after_json:JSON.stringify({status:'fired'})},source={status:'active',kind:'deadline',source_kind:'mutation',source_id:'mutation',event_key:'schedule:deadline',details:{schedule_key:'deadline',deadline_only:true,attendance_not_assumed:true}},clock={minute:10};
  const db={scene:{session_id:'session',key:'scene'},getSimulationRecord:()=>hook,getWorldEvent:()=>source,getCitySchedule:()=>schedule,getMutation:()=>mutation,getSimulationClock:()=>clock};return {db,hook,schedule,mutation,source,clock};
}
const rejected=error=>error.code==='NARRATIVE_PVP'&&error.message==='Native hook needs its exact current NPC outcome and audience.';

test('exact saved NPC preparation returns original closed text/source/revision without modifying records',()=>{
  const f=prepared(),before=structuredClone({hook:f.hook,action:f.action,mutation:f.mutation,actor:f.actor,goal:f.goal});
  const result=nativeHookProjection(f.db,'guild','hook',party);assert.equal(result.text,f.text);assert.equal(result.source,f.source);assert.match(result.revision,/^[0-9a-f]{64}$/);assert.deepEqual({hook:f.hook,action:f.action,mutation:f.mutation,actor:f.actor,goal:f.goal},before);
});
test('NPC source/receipt/proxy/PC/scene/private audience changes each refuse projection',()=>{
  for(const change of [f=>f.action.status='pending',f=>f.mutation.after_json='{}',f=>f.db.proxyActive=true,f=>f.db.pcReferences.add('clerk'),f=>f.hook.data.source_context.scene='other',f=>f.hook.data.target_user_id='owner',f=>f.actor.state.hidden=true,f=>f.source.status='retracted']){const f=prepared();change(f);assert.throws(()=>nativeHookProjection(f.db,'guild','hook',party),rejected);}
  const f=prepared();assert.throws(()=>nativeHookProjection(f.db,'guild','hook',privateScope),rejected);
});
test('raw hook prose or independently changed goal cannot substitute for exact native closed text',()=>{
  let f=prepared();f.hook.data.content='The PC agreed to leave.';assert.throws(()=>nativeHookProjection(f.db,'guild','hook',party),rejected);
  f=prepared();f.goal.objective='Choose your action';assert.throws(()=>nativeHookProjection(f.db,'guild','hook',party),rejected);
});
test('exact native deadline renders time/reference without inferring attendance or agreement',()=>{
  const f=deadline(),result=nativeHookProjection(f.db,'guild',f.hook.id,party);assert.equal(result.source,f.source);assert.match(result.text,/^Native scheduled deadline reached: minute 10; reference [0-9a-f]{16}\. Attendance and agreement are not established\.$/);
});
test('deadline requires due fictional time, approval, exact mutation/source and shared audience',()=>{
  for(const change of [f=>f.clock.minute=9,f=>f.schedule.review_status='pending',f=>f.source.details.attendance_not_assumed=false,f=>f.mutation.actor_id='model',f=>f.hook.data.content='Altered prose',f=>f.hook.data.target_user_id='owner']){const f=deadline();change(f);assert.throws(()=>nativeHookProjection(f.db,'guild',f.hook.id,party),rejected);}
  const f=deadline();assert.throws(()=>nativeHookProjection(f.db,'guild',f.hook.id,privateScope),rejected);
});
test('saved delivered hook remains readable while unsupported hook status does not',()=>{
  const f=prepared();f.hook.status='delivered';assert.equal(nativeHookProjection(f.db,'guild','hook',party).text,f.text);f.hook.status='draft';assert.throws(()=>nativeHookProjection(f.db,'guild','hook',party),rejected);
});
