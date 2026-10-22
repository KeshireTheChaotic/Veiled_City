import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fork} from 'node:child_process';
import {VeiledDB} from '../../src/db.js';
import {assemblyHookSources,assemblyWriterBrief} from '../../src/assembly-context.js';
import {initialCameraAcknowledged} from '../../src/opening-cohort-runner.js';
import {GMService} from '../../src/gm.js';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {scheduleSessionOpening} from '../../src/session-opening.js';
import {runSessionOpening} from '../../src/session-opening-runner.js';
import {runOpeningCohort} from '../../src/opening-cohort-runner.js';
import {assemblyInputs} from '../../src/assembly-context.js';
import {assemblyNarrativeCandidate} from '../../src/pvp-output.js';
import {openingCohortNarrativeCandidate} from '../../src/opening-cohort-state.js';
import {authorNarrativeRequests} from '../../src/narrative-authority.js';

const here=dirname(fileURLToPath(import.meta.url));
const schema=join(here,'..','..','sql','schema.sql');
async function fixture(t){
  const dir=await mkdtemp(join(tmpdir(),'vc-p08-completion-'));
  const path=join(dir,'campaign.sqlite');
  const db=new VeiledDB(path,schema);db.ensureCampaign('guild');
  t.after(()=>{try{db.close();}catch{};return rm(dir,{recursive:true,force:true});});
  return {db,path};
}
function startBoundedChild(path,args,{timeoutMs=7000}={}){
  const child=fork(path,args,{stdio:['ignore','ignore','ignore','ipc']});
  let resolveReady,rejectReady,resolveDone,rejectDone,readySeen=false,settled=false;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
  done.catch(()=>{});
  const timer=setTimeout(()=>finish(new Error('Child IPC watchdog expired.')),timeoutMs);
  const finish=(error,value)=>{
    if(settled)return;settled=true;clearTimeout(timer);
    if(error){if(!readySeen)rejectReady(error);try{child.kill();}catch{};rejectDone(error);}else resolveDone(value);
  };
  child.on('message',value=>{
    if(value?.ready){readySeen=true;resolveReady();return;}
    if(value?.error){finish(new Error(value.error));return;}
    if(typeof value?.claimed==='boolean')finish(null,value);
  });
  child.once('error',error=>finish(error));
  child.once('disconnect',()=>{if(!settled)finish(new Error('Child disconnected before a result.'));});
  child.once('exit',(code,signal)=>{if(!settled)finish(new Error(`Child exited without a result (code=${code}, signal=${signal}).`));});
  return {ready,done,start:()=>child.send({start:true}),kill:()=>{try{child.kill();}catch{}}};
}

test('contradictory and nested authority labels fail closed while owner text survives',async t=>{
  const {db}=await fixture(t),pc=db.createCharacter('guild','owner','Mara',{
    entry_hooks:[
      {text:'A legitimate obligation remains.',visibility:'public'},
      {text:'GM_CANARY_A',visibility:'party',audience:'gm_private'},
      {text:'GM_CANARY_B',visibility:'gm_private',audience:'party'},
      {text:'GM_CANARY_C',visibility:'public',export_meta:{visibility:'gm_only'}},
      {text:'GM_CANARY_D',visibility:'party',notes:{audience:'hidden',text:'secret'}},
      {text:'GM_CANARY_E',visibility:'party',nested:{deep:{gm_private:true}}}
    ]});
  const sources=assemblyHookSources(db,'guild',pc.id),all=JSON.stringify(sources);
  assert.match(all,/legitimate obligation/);
  for(const canary of ['GM_CANARY_A','GM_CANARY_B','GM_CANARY_C','GM_CANARY_D','GM_CANARY_E'])assert.doesNotMatch(all,new RegExp(canary));
});

test('initial acknowledged camera accepts original rosters of zero or one, never two',()=>{
  const session={id:'session'},opening={status:'completed',data:{origin:{roster:[]},attempt_source:'attempt',origin_hash:'origin'}};
  const attempt={record_key:'turn',source_event:'attempt',data:{job:'session',origin_hash:'origin',turn:'turn'}};
  const db={getCityRecord:()=>opening,listCityRecords:(_guild,{kind})=>kind==='session_opening_turn'?[attempt]:[],
    getWorldEvent:()=>({status:'active',kind:'native_session_opening_attempt',session_id:'session',visibility:'gm',details:{job:'session',origin_hash:'origin'}}),
    listTurnPublications:()=>[{status:'delivered',discord_message_id:'ack',visibility:'party'}]};
  const delivery={data:{turn_id:'turn',scope:{mode:'party',actorCharacterId:null,actorUserId:null},evidence:{narrative_verified:true}}};
  db.listCityRecords=(_guild,{kind})=>kind==='session_opening_turn'?[attempt]:kind==='assembly_delivery'?[delivery]:[];
  assert.equal(initialCameraAcknowledged(db,'guild',session),opening);
  opening.data.origin.roster=[{user:'a',character:'pc-a'}];
  assert.equal(initialCameraAcknowledged(db,'guild',session),opening);
  opening.data.origin.roster.push({user:'b',character:'pc-b'});
  assert.equal(initialCameraAcknowledged(db,'guild',session),null);
});

test('writer brief carries an audience-authorized cue or a scene-specific open invitation',async t=>{
  const {db}=await fixture(t),session=db.startSession('guild','Brief test','auto');
  db.getDirectorState=sessionId=>({scene_number:2,scene_label:'The shuttered conservatory'});
  db.openingDirectorSources=()=>[];
  db.openingOpportunityRequests=()=>[];
  const plan={assembly_contract:{version:2,input_fingerprint:'fingerprint'}};
  const brief=assemblyWriterBrief(db,'guild',session.id,{mode:'party',actorUserId:null,actorCharacterId:null},plan);
  assert.match(brief.public_throughline,/visible detail already established for this audience/);
  assert.match(brief.public_throughline,/cause and all PC responses open/);
  assert.equal(brief.dramatic_intent.objective.includes('GM_CANARY'),false);
});

test('actual planner request includes the source-scoped read-only NPC and faction agenda',async()=>{
  const session={id:'session',assembly_mode:'auto',assembly_phase:'assembly'},goal={title:'Find the missing ledger',objective:'Learn who moved it',horizon:'near',priority:60,source:'native_npc_goal'};
  const faction={id:'faction-goal',data:{title:'Keep the bridge closed',objective:'Divert the night market'}};
  const db={getActiveSession:()=>session,getSession:()=>session,getPartyState:()=>({established:false,members:[]}),roster:()=>[],
    getDirectorState:()=>({scene_number:1,scene_label:'Rain Market'}),getAssemblyPlan:()=>null,densityActorSelection:()=>[
      {type:'npc',actor_key:'porter'},{type:'faction',actor_key:'glass-union'}],
    listNpcGoals:()=>[goal],listSimulationRecords:()=>[faction],listFactsForGM:()=>[],factsFor:()=>[],listCanon:()=>[],
    listCharacterGmHooks:()=>[],getCityRecord:()=>null,openingDirectorSources:()=>[],getCharacter:()=>null};
  const gm=Object.create(GMService.prototype);gm.db=db;gm.config={assemblyModel:'offline',assemblyMaxOutputTokens:20,maxContentChunks:1};
  gm.searchContent=()=>[];let requestText='';gm.requestStructured=async request=>{requestText=request.input;throw new Error('captured');};
  await assert.rejects(gm.planAssembly({guildId:'guild'}),/captured/);
  assert.match(requestText,/Source-scoped read-only world agenda/);
  assert.match(requestText,/Learn who moved it/);
  assert.match(requestText,/Divert the night market/);
  assert.match(requestText,/Native Director opportunity hints/);
  const ownerWriterPacket=assemblyWriterBrief(db,'guild','session',{mode:'party',actorUserId:null,actorCharacterId:null},
    {assembly_contract:{version:2,input_fingerprint:'fingerprint'}});
  assert.doesNotMatch(JSON.stringify(ownerWriterPacket),/Learn who moved it|Divert the night market|world_agenda/);
});

test('two independent SQLite workers cannot both claim the same publication',async t=>{
  const {db,path}=await fixture(t),session=db.startSession('guild','CAS test','auto');
  const turn=db.beginTurnAttempt({guildId:'guild',messageId:'test-turn',actorPrincipal:'gm',sessionId:session.id,audience:'party'});
  const row=db.enqueuePublication('guild',{turnId:turn.turn_id,surface:'party',ordinal:0,visibility:'party',payload:'One scene',payloadHash:'hash'});
  db.close();
  const worker=join(here,'p08-correction-completion-worker.mjs');
  const first=startBoundedChild(worker,[path,schema,row.id]);await first.ready;
  const second=startBoundedChild(worker,[path,schema,row.id]);await second.ready;
  first.start();second.start();
  const outcomes=await Promise.all([first.done,second.done]);
  assert.deepEqual(outcomes.map(x=>x.claimed).sort(),[false,true],JSON.stringify(outcomes));
  const verify=new VeiledDB(path,schema);
  try{assert.equal(verify.getPublication('guild',row.id).status,'delivering');}
  finally{verify.close();}
});

test('authoring ownership compares status, attempt, roster and source revision atomically',async t=>{
  const {db}=await fixture(t);
  const source=indexWorldEvent(db,'guild',{key:'source',kind:'native_opening_cohort_job',title:'Source',source_id:'native:test',visibility:'gm'},'native:test');
  db.saveCityRecord('guild',{kind:'opening_cohort_job',key:'s',status:'prepared',visibility:'gm',source_event:source.event_key,
    data:{attempt_id:'a',roster_revision:'r1',input_fingerprint:'f1'}});
  const first=db.transitionCityRecord('guild',{kind:'opening_cohort_job',key:'s',expectedStatus:'prepared',expectedAttemptId:'a',
    expectedRosterRevision:'r1',expectedInputFingerprint:'f1',status:'authoring',data:{attempt_id:'a',roster_revision:'r1',input_fingerprint:'f1'}});
  assert.equal(first.status,'authoring');
  assert.equal(db.transitionCityRecord('guild',{kind:'opening_cohort_job',key:'s',expectedStatus:'prepared',expectedAttemptId:'a',
    expectedRosterRevision:'r1',expectedInputFingerprint:'f1',status:'authoring',data:first.data}),null);
  assert.equal(db.transitionCityRecord('guild',{kind:'opening_cohort_job',key:'s',expectedStatus:'authoring',expectedAttemptId:'a',
    expectedRosterRevision:'changed',expectedInputFingerprint:'f1',status:'pending',data:first.data}),null);
});

test('zero-to-two and one-to-two openings publish one additive public opportunity with immutable ACKs',async t=>{
  for(const originalOwners of [0,1]){
    const {db}=await fixture(t);db.configureCampaign('guild',{playChannelId:'play'});
    const session=db.startSession('guild',`cohort ${originalOwners}`,'auto');let sent=0;
    const guild={id:'guild',channels:{fetch:async id=>id==='play'?{id,isTextBased:()=>true,send:async()=>({id:`message-${++sent}`,channelId:id})}:null},
      members:{fetch:async userId=>({send:async()=>({id:`dm-${userId}-${++sent}`,channelId:`dm-${userId}`})})}};
    const owners=[];
    for(let i=0;i<originalOwners;i++){
      const user=`owner-${i}`,pc=db.createCharacter('guild',user,`PC ${i}`,{background:`Owner note ${i}`});
      db.upsertPlayer('guild',user,user);db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');owners.push({user,pc});
    }
    const interaction={id:`start-${originalOwners}`,guildId:'guild',user:{id:'gm'}};
    scheduleSessionOpening(db,interaction,session,()=>true);
    const makeResponse=({scope})=>{
      const isOwner=scope.mode==='private',text=isOwner?`The privately addressed notebook belongs only to ${scope.actorUserId}.`
        :'A brass bell rings once above the rain-washed arcade.';
      return {narrative_units:[{id:'scene-note',kind:'scene',text,source_refs:[],visibility:isOwner?'character':'party',
        subject_key:'',location_key:'',receipt_kind:'',receipt_ref:'',epistemic:'observation'}],fiction_delta:[]};
    };
    const gm={async planAssembly({guildId}){
      const current=db.getActiveSession(guildId),inputs=assemblyInputs(db,guildId,current);
      return {public_opening:'',convergence_goal:'Planner-only proposal must not be copied to players.',public_parts:[],
        character_entries:inputs.characters.map(row=>({discord_user_id:row.user,character_name:row.name,
          hook_source_refs:row.sources.slice(0,1).map(source=>source.id),private_hook:''}))};
    },async authorOpeningCohort(guildId,key){
      const {candidate,source}=openingCohortNarrativeCandidate(db,guildId,key),scope={mode:'party',actorUserId:null,actorCharacterId:null};
      return authorNarrativeRequests({db,guild:guildId,result:candidate,scope,sourceRef:source.event_key,budget:{used:false},
        generate:()=>makeResponse({scope})});
    }};
    const authored=async()=>makeResponse({scope:currentScope});
    let currentScope;
    gm.authorAssemblyScene=async(guildId,sessionId,scope)=>{
      currentScope=scope;
      const {candidate,source}=assemblyNarrativeCandidate(db,guildId,sessionId,scope);
      return authorNarrativeRequests({db,guild:guildId,result:candidate,scope,sourceRef:source.event_key,budget:{used:false},generate:authored});
    };
    const opening=await runSessionOpening({db,guild,gm});
    assert.equal(opening.status,'completed');
    const originalJob=db.getCityRecord('guild','session_opening_job',session.id),
      originalAckReceipts=db.listCityRecords('guild',{kind:'assembly_delivery',includeGM:true,limit:20})
        .filter(row=>row.data.session===session.id&&row.data.turn_id)
        .flatMap(row=>db.listTurnPublications('guild',row.data.turn_id).map(pub=>[pub.id,pub.turn_id,pub.status,pub.discord_message_id]))
        .sort((a,b)=>a[0].localeCompare(b[0]));
    assert.ok(originalAckReceipts.some(receipt=>receipt[2]==='delivered'&&receipt[3]),'initial camera has an exact persisted mock ACK');
    for(let i=originalOwners;i<2;i++){
      const user=`owner-${i}`,pc=db.createCharacter('guild',user,`PC ${i}`,{background:`Owner note ${i}`});
      db.upsertPlayer('guild',user,user);db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');owners.push({user,pc});
    }
    const privatePackets=owners.slice(0,2).map(({user,pc})=>assemblyWriterBrief(db,'guild',session.id,
      {mode:'private',actorUserId:user,actorCharacterId:pc.id}));
    for(let i=0;i<2;i++){
      const body=JSON.stringify(privatePackets[i]);assert.match(body,new RegExp(`Owner note ${i}`));
      assert.doesNotMatch(body,new RegExp(`Owner note ${1-i}`));
    }
    const cohort=await runOpeningCohort({db,guild,gm});
    assert.equal(cohort.status,'delivered');
    assert.equal(cohort.data.evidence.transport_acknowledged,true);
    assert.equal(cohort.data.evidence.dramatic_coverage,'unverified');
    const rows=db.listTurnPublications('guild',cohort.data.turn_id);
    assert.equal(rows.length,1);assert.equal(rows[0].status,'delivered');assert.ok(rows[0].discord_message_id);
    assert.equal(rows[0].discord_message_id,`message-${sent}`);
    assert.equal(db.getCityRecord('guild','session_opening_job',session.id).data.attempt_source,originalJob.data.attempt_source);
    const retainedAckReceipts=db.listCityRecords('guild',{kind:'assembly_delivery',includeGM:true,limit:20})
      .filter(row=>row.data.session===session.id&&row.data.turn_id)
      .flatMap(row=>db.listTurnPublications('guild',row.data.turn_id).map(pub=>[pub.id,pub.turn_id,pub.status,pub.discord_message_id]))
      .sort((a,b)=>a[0].localeCompare(b[0]));
    assert.deepEqual(retainedAckReceipts,originalAckReceipts,'cohort leaves every initial publication ACK and identity untouched');
    assert.deepEqual(db.listTurnPublications('guild',rows[0].turn_id).map(row=>row.discord_message_id),[rows[0].discord_message_id]);
    assert.equal(db.getPartyState('guild').established,false);
    for(const row of db.roster(session.id))assert.equal(db.getCharacter(row.character_id).data.location||null,null);
    const privateBodies=owners.map(({user})=>({user,items:db.db.prepare(`SELECT content FROM messages WHERE guild_id=? AND session_id=? AND discord_user_id IS NULL
      AND visibility IN ('player','character') AND (subject_user_id=? OR subject_character_id=?)`).all('guild',session.id,user,owners.find(o=>o.user===user)?.pc.id)}));
    for(const {user,items} of privateBodies)for(const item of items){
      assert.match(item.content,new RegExp(user));
      for(const other of owners.filter(owner=>owner.user!==user))assert.doesNotMatch(item.content,new RegExp(other.user));
    }
  }
});
