import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,barrier} from './p10-fixture.mjs';
import {handleCommand} from '../../src/commands.js';
import {openingErrorCode,openingDiagnostic} from '../../src/frameworks/operations/public.js';
import {sessionOpeningStatus} from '../../src/session-opening-runner.js';
function interaction(f,user,sub,onReply=()=>{}){
 const replies=[];return {id:`command-${sub}-${user}`,guildId:'g',guild:f.guild,commandName:'vc-session',user:{id:user,username:user},member:{displayName:user},
  memberPermissions:{has:()=>user==='gm'},options:{getSubcommand:()=>sub,getSubcommandGroup:()=>null,getString:()=>null,getUser:()=>null},
  isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,isModalSubmit:()=>false,
  async reply(payload){replies.push(payload);onReply();},async followUp(payload){replies.push(payload);},replies};
}
test('actual start and during-planner present commands ACK promptly, drain private entries and publish one shared opening',async()=>{
 const f=fixture({active:false});try{
  const entered=barrier(),release=barrier(),ackA=barrier(),ackB=barrier();let planners=0;const metrics=[];
  f.gm.metrics={record:(stage,record)=>metrics.push({stage,...record})};
  f.gm.planAssembly=async()=>{planners++;const result=f.currentPlan();if(planners===1){entered.resolve();await release.promise;}return result;};
  const start=interaction(f,'gm','start'),work=handleCommand(start,f);await entered.promise;
  assert.ok(start.replies.length>0);for(const user of ['a','b']){f.db.upsertPlayer('g',user,user);f.db.createCharacter('g',user,`Character ${user}`,{entry_hooks:[`OWNER_${user}_THREAD`]});}
  const a=interaction(f,'a','present',ackA.resolve),wa=handleCommand(a,f);await ackA.promise;
  const b=interaction(f,'b','present',ackB.resolve),wb=handleCommand(b,f);await ackB.promise;assert.equal(f.sends.length,0);release.resolve();
  await Promise.all([work,wa,wb]);
  const session=f.db.getActiveSession('g'),job=f.db.getCityRecord('g','session_opening_job',session.id);
  assert.equal(job.status,'completed',JSON.stringify(job.data));assert.equal(planners,2);assert.equal(job.data.diagnostic.planner_invocations,2);
  assert.equal(f.sends.filter(s=>s.target==='table').length,1);for(const user of ['a','b'])assert.equal(f.sends.filter(s=>s.target===`dm-${user}`).length,1);
  assert.equal(f.db.getPartyState('g').established,false);assert.ok(metrics.some(m=>m.stage==='opening_plan'&&m.durationMs>=0));
  assert.ok(metrics.some(m=>m.stage==='opening_authoring'&&m.durationMs>=0));assert.equal(job.data.diagnostic.provider_calls,'UNMEASURED');
  assert.ok(!JSON.stringify(start.replies).includes('OWNER_a_THREAD'));
  const before=f.sends.length,repeat=interaction(f,'a','present');repeat.id='present-again-a';await handleCommand(repeat,f);assert.equal(f.sends.length,before);
 }finally{f.close();}
});
test('closed error and status projections cannot retain provider code/body, and fallback stays explicit',()=>{
 assert.equal(openingErrorCode({code:'SECRET_PROVIDER_CANARY',message:'prompt body'}),'OPENING_AUTHORING_ERROR');
 const row={status:'needs_narrative_review',data:{attempts:1,context:{input_fingerprint:'abc'},slots:[{audience:'private',narrative_status:'FALLBACK_DELIVERED'}]}};
 const envelope=openingDiagnostic(row,{code:openingErrorCode({message:'SECRET_PROVIDER_CANARY'}),stage:'opening_plan',durationMs:25,plannerInvocations:1});
 assert.ok(!JSON.stringify(envelope).includes('CANARY'));assert.ok(sessionOpeningStatus(row).includes('FALLBACK_DELIVERED'));assert.equal(envelope.duration_ms,25);
});
