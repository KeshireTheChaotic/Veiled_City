/** SEM04/05/07: semantic proposals are private nonbinding inputs, not lexical commitments, canon or knowledge. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {nativeFixture} from './v9-fixtures.mjs';
import {captureArcCandidate,personalArc} from '../src/personal-continuity.js';
import {seedNpcCognition} from '../src/npc-cognition.js';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {FakeResponses} from './contract-fixtures.mjs';
import {captureWorldInput} from '../src/autonomous-world.js';
import {POST_TURN_REVIEW_CATEGORIES} from '../src/director.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {stateRevision} from '../src/ai-intents.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {applyCanonProposalDrafts} from '../src/state.js';
import fs from 'node:fs';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

function commit(f,out){return commitGmTurn({db:f.db,guild:{id:f.guild},session:f.session,result:out.result,scope:out.scope,
  speaker:out.pc.name,label:'Semantic proposal fixture',meta:{messageId:out.id}});}

function intent(text,operation='conversational',framing='immediate'){
  return {type:'other',source_span:text,target_name:'',target_key:'',destination:'unspecified',operation,utterance:'',
    excluded_targets:[],framing,resolution:'conversational',reason:'Nonbinding semantic interpretation only.'};
}
function response(text,operation,framing){
  const state_review=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(key=>[key,{decision:'no_change',reason:'No outcome.',confidence:100}]));
  state_review.scene={decision:'continue',label:'',reason:'Same scene.',confidence:100};
  return {respond:true,narration:'What would you like to do next?',world_additions:[],scene_actions:[],world_conflicts:[],
    narrative_interpretation:null,player_intents:[intent(text,operation,framing)],context_memories:[],authored_candidates:null,
    narrative_claims:[],gm_world_parts:[],private_messages:[],events:[],handouts:[],relationships:[],npc_memories:[],
    npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,state_review};
}
async function generate(f,text,{operation='conversational',framing='immediate',privateScene=true,id='semantic',drafts=[],outputs=null}={}){
  const pc=f.pcs[0],scope={mode:privateScene?'private':'party',actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,id,text,{privateScene});
  const raw=response(text,operation,framing);raw.canon_proposals=drafts;
  const ai=new FakeResponses(outputs||[raw]),gm=new GMService({db:f.db,content:new ContentIndex(path.resolve(process.env.VC_SEMANTIC_FIXTURE_CONTENT||'../content')),ai,
    config:{gmModel:'offline',routineGmModel:'offline',maxRecentMessages:3,maxContentChunks:1,contextInputBudget:100000}});
  const result=await gm.runTurn({guildId:f.guild,actorUserId:pc.owner_user_id,actorName:pc.name,messageText:text,messageId:id,
    actorAssignment:f.db.controlledAssignment(f.session.id,pc.owner_user_id),scope:scope.mode});
  return {result,scope,ai,pc,id};
}

test('SEM04 pre-GM word matching cannot create candidates from quoted, conditional or reported desires',()=>nativeFixture(f=>{
  const pc=f.pcs[0];f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  for(const [i,text] of ['She said "I promise to return."','If I wish for a crown, would it work?','The notice reads: I vow to serve.'].entries())
    assert.equal(captureArcCandidate(f.db,f.guild,pc.owner_user_id,pc.id,`quote-${i}`,text),null);
  assert.equal(f.db.characterContinuity(f.guild,pc.id,{kind:'arc_candidate'}).length,0);
}));

test('SEM05 ordinary quotation/question about canon does not force a proposal or another provider request',()=>nativeFixture(async f=>{
  const out=await generate(f,'Would saying "submit this as campaign canon" create a proposal?',{framing:'hypothetical'});
  assert.equal(out.ai.requests.length,1);assert.deepEqual(out.result.canon_proposals,[]);
  assert.equal(f.db.listCanonProposals(f.guild,{status:'pending'}).length,0);
}));

test('SEM07 descriptive court/ghost/veil words do not grant traits; explicit bounded dossier attributes do',()=>nativeFixture(f=>{
  const dossiers=[{name:'Court Clerk',role:'Basketball court clerk',public:'A green coat; ghost stories on the wall.'},
    {name:'Quiet Specialist',role:'Archivist',decision_profile:{contract_honor:76,hospitality_reciprocity:67,veil_awareness:'aware'}}];
  seedNpcCognition({db:f.db,guildId:f.guild,content:{read:()=>JSON.stringify(dossiers)},incremental:true});
  const clerk=f.db.getNpcProfile(f.guild,'court-clerk').decision_profile;
  assert.equal(clerk.contract_honor,50);assert.equal(clerk.hospitality_reciprocity,50);assert.equal(clerk.veil_awareness,'limited');
  const specialist=f.db.getNpcProfile(f.guild,'quiet-specialist').decision_profile;
  assert.equal(specialist.contract_honor,76);assert.equal(specialist.hospitality_reciprocity,67);assert.equal(specialist.veil_awareness,'aware');
}));

test('SEM04 authentic non-keyword goal uses real combined GM, preview rollback, private candidate and owner confirmation',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  const out=await generate(f,'My priority is finding a safe home.',{operation:'personal_commitment_candidate'});
  assert.equal(out.ai.requests.length,1);assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc_candidate'}).length,0);
  const candidate=commit(f,out).personalCandidates[0];assert(candidate);assert.equal(candidate.visibility,'character');
  assert.equal(candidate.status,'pending');assert.equal(candidate.data.nonbinding,true);
  assert.equal(candidate.data.statement,'My priority is finding a safe home.');
  assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc'}).length,0,'Candidate is not an owned commitment or arc.');
  assert.throws(()=>personalArc(f.db,f.guild,f.pcs[1].owner_user_id,{op:'confirm',key:candidate.record_key,expected_revision:stateRevision(candidate)}),/candidate/);
  f.restart();assert.equal(commit(f,out).personalCandidates[0].record_key,candidate.record_key);
  personalArc(f.db,f.guild,out.pc.owner_user_id,{op:'confirm',key:candidate.record_key,arc_key:'home',expected_revision:stateRevision(candidate)});
  assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc'}).length,1);
  assert.deepEqual(f.db.getCharacter(out.pc.id).data.resources,out.pc.data.resources);
}));

test('SEM04 typed quoted/conditional/reported goals and nested quoted substring cannot create an owned candidate',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  for(const [index,framing] of ['quoted','conditional','reported'].entries()){
    const out=await generate(f,'I wish for a crown.',{operation:'personal_commitment_candidate',framing,id:`framing-${index}`});
    assert.equal(commit(f,out).personalCandidates.length,0);
  }
  const text='She said "I wish for a crown."',raw=response(text,'personal_commitment_candidate','immediate');
  raw.player_intents[0].source_span='I wish for a crown.';
  const out=await generate(f,text,{id:'nested-quote',outputs:[raw]});
  assert.equal(commit(f,out).personalCandidates.length,0);assert.equal(out.ai.requests.length,1);
  assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc_candidate'}).length,0);
}));

for(const changed of ['source','world-source','owner','scene'])test(`SEM04 current ${changed} proof is required at owner confirmation`,()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  const out=await generate(f,'I seek a safe home.',{operation:'personal_commitment_candidate'}),candidate=commit(f,out).personalCandidates[0];
  if(changed==='source')indexWorldEvent(f.db,f.guild,{key:candidate.source_event,status:'retracted'},'offline-gm');
  if(changed==='world-source'){
    const accepted=f.db.getCityRecord(f.guild,'typed_intent',candidate.data.proof.accepted_intent);
    indexWorldEvent(f.db,f.guild,{key:accepted.data.world_source_event,status:'retracted'},'offline-gm');
  }
  if(changed==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,out.pc.id);
  if(changed==='scene')f.db.setDirectorState(f.session.id,{scene_number:2,scene_label:'Elsewhere'});
  assert.throws(()=>personalArc(f.db,f.guild,out.pc.owner_user_id,{op:'confirm',key:candidate.record_key,expected_revision:stateRevision(candidate)}));
  assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc'}).length,0);
}));

const canonValue='Night doors open at ten.';
const draft={key:'terminal.doors',value:canonValue,visibility:'party',reason:'Explicit current private owner proposal, not canon.'};
test('SEM05 private typed request queues exact source-bound canon proposal once; only native human review promotes it',()=>nativeFixture(async f=>{
  const out=await generate(f,`Please submit "${canonValue}" as campaign canon.`,{operation:'proposal_campaign_canon',drafts:[draft]});
  const mutation=commit(f,out),proposal=mutation.canonProposals[0].row;
  assert.equal(proposal.status,'pending');assert.equal(proposal.source_message_id,out.id);assert.equal(out.ai.requests.length,1);
  assert.equal(f.db.currentCanon(f.guild,draft.key),undefined);
  assert(f.db.getCityRecord(f.guild,'canon_proposal_source',proposal.id));
  f.restart();assert.equal(commit(f,out).canonProposals[0].row.id,proposal.id);
  f.db.resolveCanonProposal(f.guild,proposal.id,{actorId:'offline-gm'});
  assert.equal(f.db.currentCanon(f.guild,draft.key).value,canonValue);
  indexWorldEvent(f.db,f.guild,{key:f.db.getCityRecord(f.guild,'canon_proposal_source',proposal.id).source_event,status:'retracted'},'offline-gm');
  assert.equal(f.db.currentCanon(f.guild,draft.key).value,canonValue,'Retraction does not erase legitimate already committed canon.');
}));

test('SEM05 model-only canon drafts and mismatched values cannot bypass native typed private request',()=>nativeFixture(async f=>{
  for(const [id,text,operation] of [['unrequested','I wonder about local custom.','conversational'],
    ['mismatched','Please submit the old door color.','proposal_campaign_canon']]){
    const out=await generate(f,text,{id,operation,drafts:[draft]});
    const mutation=commit(f,out);assert.equal(mutation.canonProposals[0].ok,false);assert.equal(mutation.canonProposals[0].blocked,true);
  }
  assert.equal(f.db.listCanonProposals(f.guild,{status:'pending'}).length,0);assert.equal(f.db.currentCanon(f.guild,draft.key),undefined);
}));

test('SEM05 missing payload retries only from the typed request, never a canon word alone',()=>nativeFixture(async f=>{
  const text=`Please submit ${canonValue} as canon.`,first=response(text,'proposal_campaign_canon','immediate'),second=structuredClone(first);
  second.canon_proposals=[draft];
  const out=await generate(f,text,{outputs:[first,second]});assert.equal(out.ai.requests.length,2);
  assert.equal(commit(f,out).canonProposals[0].row.status,'pending');
}));

for(const changed of ['source','owner','scene'])test(`SEM05 pending canon ${changed} change cannot be promoted after restart`,()=>nativeFixture(async f=>{
  const out=await generate(f,`Please submit ${canonValue} as canon.`,{operation:'proposal_campaign_canon',drafts:[draft]});
  const proposal=commit(f,out).canonProposals[0].row;f.restart();
  if(changed==='source')indexWorldEvent(f.db,f.guild,{key:f.db.getCityRecord(f.guild,'canon_proposal_source',proposal.id).source_event,status:'retracted'},'offline-gm');
  if(changed==='owner')f.db.db.prepare('UPDATE characters SET owner_user_id=? WHERE id=?').run(f.pcs[1].owner_user_id,out.pc.id);
  if(changed==='scene')f.db.setDirectorState(f.session.id,{scene_number:2,scene_label:'Elsewhere'});
  assert.throws(()=>f.db.resolveCanonProposal(f.guild,proposal.id,{actorId:'offline-gm'}));
  assert.equal(f.db.currentCanon(f.guild,draft.key),undefined);
  assert.equal(f.db.resolveCanonProposal(f.guild,proposal.id,{resolution:'reject',actorId:'offline-gm'}).status,'rejected');
}));

test('SEM07 existing profiles remain exact history; malformed dossier traits roll back instead of inferring',()=>nativeFixture(f=>{
  const original=f.db.upsertNpcProfile(f.guild,{npcKey:'old-profile',displayName:'Old Profile',activityTier:'active',
    decisionProfile:{veil_awareness:'aware',contract_honor:89},source:'historical'});
  seedNpcCognition({db:f.db,guildId:f.guild,content:{read:()=>JSON.stringify([{name:'Old Profile',role:'Different',decision_profile:{veil_awareness:'limited'}}])}});
  assert.deepEqual(f.db.getNpcProfile(f.guild,'old-profile'),original);
  assert.throws(()=>seedNpcCognition({db:f.db,guildId:f.guild,incremental:true,
    content:{read:()=>JSON.stringify([{name:'Invalid',decision_profile:{hp:100}}])}}),/Closed explicit/);
  assert.equal(f.db.getNpcProfile(f.guild,'invalid'),null);
}));

test('SEM05 missing proof, changed terms and widened audience never acquire historical compatibility',()=>nativeFixture(async f=>{
  const out=await generate(f,`Please submit ${canonValue} as canon.`,{operation:'proposal_campaign_canon',drafts:[{...draft,visibility:'gm'}]});
  const proposal=commit(f,out).canonProposals[0].row;
  assert.throws(()=>f.db.resolveCanonProposal(f.guild,proposal.id,{visibility:'party',actorId:'offline-gm'}),/source|audience/i);
  f.db.db.prepare('DELETE FROM city_records WHERE guild_id=? AND kind=? AND record_key=?')
    .run(f.guild,'canon_proposal_source',proposal.id);
  assert.throws(()=>f.db.resolveCanonProposal(f.guild,proposal.id,{actorId:'offline-gm'}),/source|audience/i);
  assert.equal(f.db.currentCanon(f.guild,draft.key),undefined);
}));

test('SEM04 a modified candidate cannot replace the exact owner statement under an unchanged source proof',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  const out=await generate(f,'I seek a safe home.',{operation:'personal_commitment_candidate'}),candidate=commit(f,out).personalCandidates[0];
  const changed=f.db.saveCityRecord(f.guild,{...candidate,key:candidate.record_key,data:{...candidate.data,statement:'I surrender my choices.'}});
  assert.throws(()=>personalArc(f.db,f.guild,out.pc.owner_user_id,{op:'confirm',key:changed.record_key,expected_revision:stateRevision(changed)}),/source|candidate/i);
  assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc'}).length,0);
}));

for(const stale of ['scene','source','expiry'])test(`SEM04 original current owner can reject a ${stale}-stale optional candidate without establishing fiction`,()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  const out=await generate(f,'I seek a safe home.',{operation:'personal_commitment_candidate'}),candidate=commit(f,out).personalCandidates[0];
  if(stale==='scene')f.db.setDirectorState(f.session.id,{scene_number:2});
  if(stale==='source')indexWorldEvent(f.db,f.guild,{key:candidate.source_event,status:'retracted'},'offline-gm');
  if(stale==='expiry')f.db.advanceSimulationClock(f.guild,{minutes:1441});
  const rejected=personalArc(f.db,f.guild,out.pc.owner_user_id,{op:'reject',key:candidate.record_key,expected_revision:stateRevision(candidate)});
  assert.equal(rejected.status,'rejected');assert.equal(f.db.characterContinuity(f.guild,out.pc.id,{kind:'arc'}).length,0);
  assert.deepEqual(f.db.getCharacter(out.pc.id).data.resources,out.pc.data.resources);
}));

test('SEM05 linked canon conflict cannot bypass source retraction through its direct native resolution',()=>nativeFixture(async f=>{
  f.db.proposeCanon(f.guild,{key:draft.key,value:'Earlier established door hours.',visibility:'party',sourceType:'gm'});
  const out=await generate(f,`Please submit ${canonValue} as canon.`,{operation:'proposal_campaign_canon',drafts:[draft]});
  const proposal=commit(f,out).canonProposals[0].row;
  const conflict=f.db.resolveCanonProposal(f.guild,proposal.id,{actorId:'offline-gm'}).conflict;
  indexWorldEvent(f.db,f.guild,{key:f.db.getCityRecord(f.guild,'canon_proposal_source',proposal.id).source_event,status:'retracted'},'offline-gm');
  assert.throws(()=>f.db.resolveCanonConflict(f.guild,conflict.id,{resolution:'proposed',actorId:'offline-gm'}),/source/i);
  assert.equal(f.db.currentCanon(f.guild,draft.key).value,'Earlier established door hours.');
}));

test('SEM05 real typed proposal cannot be reused by another owner, public scope or another message',()=>nativeFixture(async f=>{
  const out=await generate(f,`Please submit ${canonValue} as canon.`,{operation:'proposal_campaign_canon',drafts:[draft]});
  const native=commit(f,out),typedIntents=native.typedIntents;
  for(const [scope,messageId] of [[{...out.scope,actorUserId:f.pcs[1].owner_user_id,actorCharacterId:f.pcs[1].id},out.id],
    [{...out.scope,mode:'party'},out.id],[out.scope,'another-source']]){
    const rows=applyCanonProposalDrafts(f.db,f.guild,f.session.id,[{...draft,key:'forged-scope'}],scope,{messageId,typedIntents});
    assert.equal(rows[0].ok,false);assert.equal(rows[0].blocked,true);
  }
  assert.equal(f.db.currentCanon(f.guild,'forged-scope'),undefined);
  assert.equal(f.db.listCanonProposals(f.guild,{status:'pending'}).length,1);
}));

test('SEM04/05 old pre-GM/canon lexical decision call sites are retired; source, parsing and security adapters remain',()=>{
  const entry=fs.readFileSync('src/index.js','utf8'),gm=fs.readFileSync('src/gm.js','utf8'),npc=fs.readFileSync('src/npc-cognition.js','utf8');
  assert(!entry.includes('captureArcCandidate'));assert(!gm.includes('looksLikeExplicitCanonProposalRequest'));
  assert(!npc.includes('contractAware'));assert(!npc.includes('veilAware'));
  assert(entry.includes('return routeGameplayIntake(text)'));
  for(const [module,names] of [['player-language',['captureDeclaration','interpretAuthoredText']],
    ['message-span-ledger',['serializeSpanLedger','messageSpans']],['scene-entry',['reviewSceneEntry','configureEntryPolicy']],
    ['dialogue-continuity',['captureDialogue','interpretDialogue']],['continuity-routing',['formatDiscovery','discoveryDeliveryProof']]]){
    const source=fs.readFileSync(`src/${module}.js`,'utf8');for(const name of names)assert(source.includes(`function ${name}(`));
  }
});

test('SEM04/05 historical owner-confirmed arcs and imported human-review canon proposals remain readable and reviewable',()=>nativeFixture(f=>{
  const pc=f.pcs[0];f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,personal_arcs:true}});
  const arc=personalArc(f.db,f.guild,pc.owner_user_id,{op:'state',key:'old-arc',type:'vow',statement:'I will preserve my home.'});
  const old=f.db.upsertCanonProposal(f.guild,pc.id,null,{key:'old.setting',value:'An imported setting detail.',visibility:'gm',reason:'Imported'},
    {source:'gm_hook',proposedByUserId:pc.owner_user_id,proposedByCharacterId:pc.id});
  f.db.resolveCanonProposal(f.guild,old.id,{actorId:'offline-gm'});
  assert.deepEqual(f.db.getCityRecord(f.guild,'arc',arc.record_key),arc);
  assert.equal(f.db.currentCanon(f.guild,'old.setting').value,'An imported setting detail.');
}));

test('SEM04/05/07 isolated legacy-authority mutations are caught by the retained behavioral regressions',()=>{
  const fixtures=[{file:'personal-continuity.js',pattern:'pre-GM word matching',
    from:'  if(!acceptedIntent||typeof message!=="string"||message.length>4000)return null;',
    to:'  if(/\\bI (vow|wish|promise)\\b/i.test(message))return {legacy_inferred_candidate:true};\n  if(!acceptedIntent||typeof message!=="string"||message.length>4000)return null;'},
  {file:'gm.js',pattern:'ordinary quotation/question',
    from:"      if(privateMode && result.player_intents.some(intent=>intent.type==='other'\n        &&intent.operation==='proposal_campaign_canon'&&intent.framing==='immediate'&&intent.resolution==='conversational')){",
    to:'      if(privateMode && /canon/i.test(messageText)){'},
  {file:'npc-cognition.js',pattern:'descriptive court/ghost/veil',from:'decisionProfile:dossierDecisionProfile(npc.decision_profile),',
    to:'decisionProfile:dossierDecisionProfile(npc.decision_profile||{contract_honor:/court/i.test(npc.role)?75:50}),'}];
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-semantic-mutations-'));
  try{
    fs.cpSync('src',path.join(dir,'src'),{recursive:true});fs.cpSync('sql',path.join(dir,'sql'),{recursive:true});fs.mkdirSync(path.join(dir,'scripts'));
    fs.mkdirSync(path.join(dir,'node_modules'));fs.cpSync('node_modules/openai',path.join(dir,'node_modules/openai'),{recursive:true});
    fs.writeFileSync(path.join(dir,'package.json'),'{"type":"module"}');
    for(const name of ['v96-semantic-proposals-test.mjs','v9-fixtures.mjs','contract-fixtures.mjs','offline-guard.mjs'])
      fs.copyFileSync(`scripts/${name}`,path.join(dir,'scripts',name));
    fs.mkdirSync(path.join(dir,'content'));
    const env={...process.env,OPENAI_API_KEY:'offline-dummy',DISCORD_TOKEN:'offline-dummy',VC_SEMANTIC_FIXTURE_CONTENT:path.join(dir,'content')};
    delete env.NODE_TEST_CONTEXT; // A separate runner, not Node's recursively inherited test-child context.
    const runChild=pattern=>spawnSync(process.execPath,['--import','./scripts/offline-guard.mjs','--test',`--test-name-pattern=${pattern}`,
      'scripts/v96-semantic-proposals-test.mjs'],{cwd:dir,encoding:'utf8',env});
    const baseline=runChild(fixtures.map(fixture=>fixture.pattern).join('|'));
    assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);assert.match(baseline.stdout,/tests 3/);
    for(const fixture of fixtures){
      const target=path.join(dir,'src',fixture.file),original=fs.readFileSync(target,'utf8').replaceAll('\r\n','\n');
      assert.equal(original.split(fixture.from).length,2,'Mutation must match exactly one retired authority boundary.');
      fs.writeFileSync(target,original.replace(fixture.from,fixture.to));
      const run=runChild(fixture.pattern);
      assert.notEqual(run.status,0,`${fixture.file}: ${run.stdout} ${run.stderr}`);assert.match(run.stdout+run.stderr,/AssertionError|Unexpected model call/,fixture.file);
      assert.match(run.stdout,/tests 1/,'Exactly the intended behavioral regression must execute.');
      fs.writeFileSync(target,original);
    }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
