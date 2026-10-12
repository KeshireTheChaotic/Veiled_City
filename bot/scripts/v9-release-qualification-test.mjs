/** V9-08 qualification is mandatory, offline, and tied to native production adapters. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {handleCommand} from '../src/commands.js';
import {progressPvp} from '../src/narrative-pvp.js';
import {fearRevision} from '../src/pvp-fear-moves.js';
import {captureWorldInput} from '../src/autonomous-world.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
import {rollRevision} from '../src/roll-requests.js';
import {configureCityFlags} from '../src/city-core.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';

test('REL01 all release security, observability and historical reproduction gates are mandatory',()=>{
  const source=fs.readFileSync(new URL('./validate-offline.mjs',import.meta.url),'utf8');
  for(const suite of ['d08-window-security-test','d08-observability-test','v9-baseline-regressions-test',
    'v9-action-consent-test','v9-pvp-agreement-test','v9-pvp-authorship-test','v9-pvp-rounds-test',
    'v9-observation-compatibility-test','v9-npc-observation-test','v9-pvp-hope-fear-test',
    'v94-pc-effect-authority-test','v94-pvp-profile-test','v94-pvp-attack-test','v94-pvp-reaction-test',
    'v94-pvp-damage-test','v94-pc-death-test','v94-pc-recovery-test','v94-pvp-multiplayer-test','v94-pvp-qualification-test',
    'v9-continuation-test','v9-roll-truth-test','v9-publication-test','v9-roll-ux-test','v9-discord-hardening-test',
    'v9-release-qualification-test','v95-protected-narrative-test','v95-autonomous-fear-test','v95-pvp-ux-test',
    'v95-operational-metrics-test'])assert(source.includes(`"${suite}"`),`${suite} must not be an optional/skipped release gate`);
});

async function entropy(faces,run){const original=crypto.randomInt;let n=0;
  crypto.randomInt=(min,max)=>{const v=faces[n++];assert(Number.isInteger(v)&&v>=min&&v<max,'offline native entropy exhausted');return v;};syncBuiltinESMExports();
  try{return await run();}finally{crypto.randomInt=original;syncBuiltinESMExports();assert.equal(n,faces.length);}}
function adapter(f){let serial=0;const privateSent=[],partySent=[];
  const guild={id:f.guild,members:{fetch:async user=>{assert(f.pcs.some(pc=>pc.owner_user_id===user));return {send:async p=>{
    privateSent.push({user,text:typeof p==='string'?p:p.content});return {id:`dm-${privateSent.length}`,channelId:`dm-${user}`};}};}},
    channels:{fetch:async id=>{assert.equal(id,'release-table');return {id,isTextBased:()=>true,send:async p=>{
      partySent.push(typeof p==='string'?p:p.content);return {id:`table-${partySent.length}`,channelId:id};}};}}};
  f.db.configureCampaign(f.guild,{playChannelId:'release-table'});
  async function call(actor,op,input={},sub='pvp',faces=null,group='roll'){
    const user=actor==='gm'?'gm':f.pcs[actor].owner_user_id,delivered=[],ack=[];
    const i={id:`release-ui-${serial++}`,commandName:`vc-${group}`,guildId:f.guild,guild,user:{id:user,username:user},
      memberPermissions:{has:()=>actor==='gm'},isChatInputCommand:()=>true,
      options:{getSubcommand:()=>sub,getString:k=>k==='json'?JSON.stringify(op===null?input:{op,...input}):input[k]??null},
      deferReply:async p=>{assert.equal(p.ephemeral,true);ack.push(p);i.deferred=true;},
      reply:async p=>{assert(!i.deferred);delivered.push(p);},editReply:async p=>delivered.push(p),
      followUp:async p=>{assert.equal(p.ephemeral,true);delivered.push(p);}};
    const run=()=>handleCommand(i,{db:f.db,gm:{content:{root:'../content'}}});
    if(faces)await entropy(faces,run);else await run();assert.equal(ack.length,group==='roll'?1:0);
    assert(delivered.length);assert(delivered.every(p=>p.content.length<=2000));return {i,delivered};
  }
  return {guild,call,privateSent,partySent};
}
const records=(f,kind)=>f.db.listCityRecords(f.guild,{kind,includeGM:true,limit:300});
async function deliver(f,turn,sent){
  const r=await deliverTurnOutbox(f.db,f.guild,turn,async row=>{sent.push(row.payload);return {messageId:`replay-${sent.length}`,channelId:'release-table'};});
  assert(r.every(item=>item.ok));
}
test('REL02 four-owner production replay: decline, both modes, double Fear, author/withhold/share, independent compound and private menu',()=>nativeFixture(async f=>{
  const x=adapter(f),{call}=x,initial=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources);
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},'gm');
  f.db.setSimulationEntity(f.guild,'location','terminal',{name:'Terminal'});f.db.changeClock(f.guild,'inspection-deadline',0,{max:6,visibility:'party'});
  async function propose(label,mode){const a=f.accepted(0,`I attempt a harmless ${label} with Choso.`,f.pcs[1].id);
    await call(0,'propose',{accepted_intent:a.record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs,{mode,audience:'bilateral_author_projection'})});
    const p=records(f,'pvp_proposal').find(p=>p.data.accepted_intent===a.record_key);assert(p);return p;}
  const declined=await propose('declined shin tap','single_roll_duel');
  await call(1,'review',{proposal:declined.record_key});await call(1,'respond',{proposal:declined.record_key,expected_revision:declined.data.terms_hash,decision:'decline'});
  assert.equal(f.db.getCityRecord(f.guild,'pvp_proposal',declined.record_key).status,'declined');assert.equal(records(f,'pvp_round_receipt').length,0);
  let lastRoll;
  for(const mode of ['single_roll_duel','three_strikes']){
    const p=await propose(mode,mode);for(const i of [0,1]){await call(i,'review',{proposal:p.record_key});await call(i,'respond',{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:'accept'});}
    const input=i=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision};};
    const winners=mode==='single_roll_duel'?[0]:[0,1,0,1,0];
    for(const [round,winner] of winners.entries()){
      for(const i of [0,1])await call(i,'choose',{...input(i),trait:'Agility',attempt:'I attempt only my own harmless feint.'});
      for(const i of [0,1]){
        const faces=mode==='single_roll_duel'?(i===0?[3,10]:[2,8]):round===0?(i===0?[12,11]:[3,3]):i===winner?[9,2]:[4,1];
        lastRoll={actor:i,input:input(i)};await call(i,'roll',lastRoll.input,'pvp',faces);
      }
      if(mode==='single_roll_duel'){
        const ts=records(f,'pvp_fear_trigger').filter(t=>t.data.proposal===p.record_key).sort((a,b)=>a.data.trigger_ordinal-b.data.trigger_ordinal);assert.equal(ts.length,2);
        await call('gm','fear-context',{move_kind:'clock_advance',target_key:'inspection-deadline',location_key:'terminal',visibility:'party',subject_key:null});
        const c=records(f,'pvp_fear_context').at(0);assert(c);
        for(const trigger of ts){const t=f.db.getCityRecord(f.guild,'pvp_fear_trigger',trigger.record_key);
          await call('gm','fear-select',{trigger:t.record_key,expected_revision:t.data.revision,context:c.record_key,expected_target_revision:fearRevision(f.db.getClock(f.guild,'inspection-deadline')),affected_actions:[]});
          const selected=f.db.getCityRecord(f.guild,'pvp_fear_trigger',t.record_key);assert.equal(selected.status,'move_selected');
          await call('gm','fear-apply',{trigger:t.record_key,expected_revision:selected.data.revision,decision:selected.data.decision});
        }assert.equal(f.db.getClock(f.guild,'inspection-deadline').value,2);
      }
      if(round<winners.length-1)for(const i of [0,1])await call(i,'continue',input(i));
    }
    const finished=f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key),r=f.db.getCityRecord(f.guild,'pvp_resolution_receipt',finished.data.resolution_receipt);assert.equal(r.data.winner,f.pcs[0].id);
    if(mode==='three_strikes')assert.deepEqual(Object.values(r.data.scores).sort(),[2,3]);
    const base={proposal:p.record_key,expected_revision:p.data.terms_hash,resolution:r.record_key},clauseCount=records(f,'pvp_narrative_clause').length;
    await call(0,'narrate',{...base,role:'success',subject_character:f.pcs[0].id,text:'Choso apologizes for losing.'});
    assert.equal(records(f,'pvp_narrative_clause').length,clauseCount);assert(!x.partySent.join('').includes('apologizes'));
    await call(0,'narrate',{...base,role:'success',subject_character:f.pcs[0].id,text:'I achieve only my agreed success.',template:'stake_success'});
    await call(1,'narrate',{...base,role:mode==='single_roll_duel'?'withhold':'reaction',subject_character:f.pcs[1].id,
      text:mode==='single_roll_duel'?'':'I glare.',template:mode==='single_roll_duel'?'withhold':'reaction_glare'});
    const authored=records(f,'pvp_authored_narrative').filter(n=>n.data.proposal===p.record_key);
    assert(authored.some(n=>n.status===(mode==='single_roll_duel'?'withheld':'clauses_authorized')&&n.subject_key===f.pcs[1].id));
    for(const n of authored.filter(n=>n.status!=='withheld'))for(const i of n.subject_key===f.pcs[0].id?[0,1]:[1,0]){
      const share={proposal:p.record_key,expected_revision:p.data.terms_hash,narrative:n.record_key};
      await call(i,'narrative-review',share);const response=await call(i,'share',share);
      assert(!response.delivered.some(p=>p.content.startsWith('⚠')),response.delivered.map(p=>p.content).join('\n'));
    }
    assert(x.partySent.join('').includes('I achieve only my agreed success.'));
    if(mode==='single_roll_duel')assert(!x.partySent.join('').includes('I glare.'));else assert(x.partySent.join('').includes('I glare.'));
    assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),initial);assert.equal(f.db.getCampaign(f.guild).fear,0);
    assert.deepEqual(f.db.getCityRecord(f.guild,'pvp_resolution_receipt',r.record_key),r,'disclosure/authorship must not rewrite the saved winner or stakes');
  }
  f.restart();await call(lastRoll.actor,'roll',lastRoll.input,'pvp',[]);assert.equal(records(f,'pvp_round_receipt').length,12);
  // All four owners participate through real adapters; unknown PC information is nonblocking.
  configureCityFlags(f.db,f.guild,{scene_continuity:true},'gm');
  const scene=currentScene(f.db,f.guild),presence=indexWorldEvent(f.db,f.guild,{key:'release-presence',kind:'observation',title:'At the terminal',source_id:'gm',
    session_id:f.session.id,scene:scene.key,visibility:'party',location_key:'terminal'},'gm');
  for(const pc of f.pcs)recordScenePresence(f.db,f.guild,{entity_type:'character',entity_key:pc.id,location_key:'terminal',zone:'floor',range:'Melee',source_event:presence.event_key,accepted_by:pc.owner_user_id,visibility:'party'},'gm');
  f.db.upsertNpcProfile(f.guild,{npcKey:'station-attendant',displayName:'Station Attendant',publicIdentity:'Choso apologizes for losing.'});
  f.db.setSimulationEntity(f.guild,'npc','station-attendant',{location_key:'terminal'});
  recordScenePresence(f.db,f.guild,{entity_type:'npc',entity_key:'station-attendant',location_key:'terminal',zone:'floor',range:'Melee',source_event:presence.event_key,visibility:'party'},'gm');
  await call('gm',null,{entity_type:'npc',entity_key:'station-attendant',location_key:'terminal',visibility:'party',facts:{coat:'blue'}},'scene-description',null,'gm');
  for(const [actor,target,name,expected] of [[2,f.pcs[0].id,'Jaxon',/not.*established|cannot.*see/i],[1,f.pcs[3].id,'Tyrell',/not.*established|cannot.*see/i],[3,'station-attendant','Station Attendant',/blue coat/i]]){
    const pc=f.pcs[actor],text=`What does ${name} look like?`,id=`release-observe-${actor}`,scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
    captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text);const t=f.db.beginTurnAttempt({guildId:f.guild,messageId:id,actorPrincipal:pc.owner_user_id,sessionId:f.session.id,audience:'party'});
    const result={respond:true,narration:'Choso apologizes for losing.',narrative_claims:[],player_intents:[{type:'observe',source_span:text,target_name:name,target_key:target,
      operation:'appearance',destination:'unspecified',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'Ordinary information request.'}]};
    commitGmTurn({db:f.db,guild:x.guild,session:f.session,result,scope,speaker:pc.name,label:'Release observation',meta:{messageId:id,turnId:t.turn_id,triggerText:text}});
    assert.match(result.narration,expected);assert(!result.narration.includes('apologizes'));await deliver(f,t.turn_id,x.partySent);
  }
  // Billy's independent authorized native action must survive the exact cross-actor unsafe paragraph.
  const pc=f.pcs[2],scope={mode:'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id},id='release-compound',text='I read the shipping terminal. I enter the booth.';
  f.db.setSimulationEntity(f.guild,'location','booth',{name:'Booth',parent_location_key:'terminal'});
  f.db.upsertReference(f.guild,{kind:'location',key:'booth',name:'Booth',summary:'Open adjacent booth.',visibility:'party'});
  f.db.upsertRulesRuling(f.guild,{key:'release-inspection',createdBy:'gm',ruling:'Obscured shipping text requires a Knowledge roll, Difficulty 10.'});
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text);const turn=f.db.beginTurnAttempt({guildId:f.guild,messageId:id,actorPrincipal:pc.owner_user_id,sessionId:f.session.id,audience:'party'});
  const base={target_name:'',target_key:'',destination:'unspecified',utterance:'',excluded_targets:[],framing:'immediate',reason:''};
  const result={respond:true,narration:'Choso apologizes for losing.',narrative_claims:[],player_intents:[
    {...base,type:'interact',source_span:'I read the shipping terminal.',operation:'read',resolution:'roll_required',native_adjudication:{risk:'Obscured text',stakes:'No information on failure',saved_ruling_key:'release-inspection',override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],trait:'Knowledge',kind:'action',difficulty:10,modifier_keys:[],attack_source:'',explanation:'Reviewed obscured text.'}},
    {...base,type:'move',source_span:'I enter the booth.',target_name:'Booth',target_key:'booth',destination:'interior',operation:'enter',resolution:'auto',depends_on:[0]}],scene_actions:[{kind:'move',entity_ref:'booth',source_span:'I enter the booth.',zone:'interior'}]};
  const committed=commitGmTurn({db:f.db,guild:x.guild,session:f.session,result,scope,speaker:pc.name,label:'Release shipping investigation',meta:{messageId:id,turnId:turn.turn_id,triggerText:text}});
  assert.equal(f.db.getCharacter(pc.id).data.location,'terminal');const q=f.db.getCityRecord(f.guild,'roll_request',committed.nativeAdjudications[0].roll_request_ref);
  const menu=await call(2,null,{request:q.record_key},'menu'),controls=menu.delivered[0].components.flatMap(r=>r.toJSON().components),button=controls.find(c=>c.label==='Roll now');assert(button);
  const component={id:'release-roll-button',guildId:f.guild,guild:x.guild,user:{id:pc.owner_user_id},customId:button.custom_id,isChatInputCommand:()=>false,isButton:()=>true,isStringSelectMenu:()=>false,
    update:async p=>assert(p.content.length<=2000)};
  await entropy([9,2],()=>handleCommand(component,{db:f.db,gm:{}}));assert.equal(f.db.getCharacter(pc.id).data.location,'booth');
  const rolled=f.db.getCityRecord(f.guild,'roll_request',q.record_key),resources=f.db.getCharacter(pc.id).data.resources;
  await call(2,'share',{request:q.record_key,expected_revision:rollRevision(rolled),key:'release-dice-share',scope:'party',confirm:true},'contribute');
  await deliver(f,turn.turn_id,x.partySent);assert(!x.partySent.join('').includes('apologizes'));assert(!x.partySent.join('').includes('SECRET'));
  assert(x.privateSent.some(s=>s.user===pc.owner_user_id&&s.text.includes('Knowledge')));
  await assert.rejects(()=>handleCommand(component,{db:f.db,gm:{}}));assert.deepEqual(f.db.getCharacter(pc.id).data.resources,resources);
  assert.equal(records(f,'pc_effect_receipt').length,0);assert.equal(records(f,'pvp_fear_effect_receipt').length,2);
  assert(f.pcs.every(pc=>f.db.getCharacter(pc.id).data.resources.hp.current===0));
}));
