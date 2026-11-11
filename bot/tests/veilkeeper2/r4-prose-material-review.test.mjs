import test from 'node:test';
import assert from 'node:assert/strict';
import {createProseMaterialReview} from '../../src/v2/prose-material-review.js';
import {createOfflinePublicationQueue} from '../../src/v2/publication-queue.js';
const audience=Object.freeze({campaign:'c',scene:'s',source_ref:'source',revision:'1',recipients:Object.freeze(['u'])});
const policy=options=>createProseMaterialReview({readControlledNames:()=>['Mercer','Rook'],readIndependentSpeakers:()=>['The clerk','Rook'],...options});

test('direct address, sensory second person, NPC counteroffers and open choices are not agency theft',()=>{
  for(const text of ['The clerk says, “Mercer, you’re asking the wrong questions.”','You can see lamplight moving under the door.','You feel cold rain on your hands.','The clerk refuses. “I can offer a room, if you can repair the lock.”','Would you agree to those terms?','If you accept, the clerk will explain.','You agree to that?']){
    const segments=policy().review(text,audience);assert.equal(segments[0].status,'screened',text);assert.equal(segments[0].issues.length,0);
  }
});

test('explicit PC choices, inner states, invented dice and material expenditures are held individually',()=>{
  const cases=[['Mercer obeys, pockets the relic and swears loyalty.','pc_agency'],['You feel loyal to the mayor.','pc_inner_state'],['You spend 2 Hope.','mechanical_result'],['You take 3 damage.','mechanical_result'],['You rolled 19 with Hope.','mechanical_result'],['Rook says, “I accept.”','pc_agency']];
  for(const [text,kind] of cases){const result=policy().review(text,audience)[0];assert.equal(result.status,'withheld',text);assert.ok(result.issues.some(i=>i.kind===kind),text);}
});

test('independent NPC testimony can lie without establishing an objective PC choice or effect',()=>{
  assert.equal(policy().review('The clerk claims, “You agreed to pay me, and you gained 2 Hope.”',audience)[0].status,'screened');
  for(const text of ['“You agree and spend 2 Hope.”','The clerk claims, “You agree and spend 2 Hope.','Rook says, “You agree and spend 2 Hope.”'])assert.equal(policy().review(text,audience)[0].status,'withheld',text);
});

test('each material assertion needs its own native authorization; thrown and asynchronous decisions grant nothing',()=>{
  const text='You spend 2 Hope and spend 3 Fear.';
  const review=policy({authorizeMaterial:c=>c.kind==='mechanical_result'&&c.excerpt==='spend 2 Hope'}).review(text,audience)[0];
  assert.equal(review.status,'withheld');assert.ok(review.issues.some(i=>i.excerpt==='spend 3 Fear'));
  assert.equal(policy({authorizeMaterial:()=>{throw new Error('private diagnostic');}}).review('You take 3 damage.',audience)[0].status,'withheld');
  assert.equal(policy({authorizeMaterial:()=>Promise.reject(new Error('private rejected callback'))}).review('You take 3 damage.',audience)[0].status,'withheld');
  assert.equal(policy({authorizeMaterial:c=>c.kind==='mechanical_result'&&c.excerpt==='take 3 damage'}).review('You take 3 damage.',audience)[0].status,'screened');
});

function queue(){
  let current=true;const draft={},native={grant:{},text:'Rain taps the glass.\n\nYou agree to pay.\n\nThe clerk waits.',traceId:'trace'};
  const q=createOfflinePublicationQueue({gateway:{inspect:()=>{if(!current)throw new Error('source revoked');return native;}},contextAuthority:{audience:()=>audience,dependencyManifest:()=>({version:1,campaignId:audience.campaign,sceneId:audience.scene,sourceRef:audience.source_ref,sourceRevision:audience.revision,recipientIds:audience.recipients,actorId:null,actorRevision:null,records:[]})},materialReview:policy()});
  return {q,id:q.queue(draft).id,revoke:()=>{current=false;}};
}

test('withholding one material paragraph preserves independent siblings without a publication grant',()=>{
  const f=queue(),review=f.q.review(f.id);assert.equal(review.heldCount,1);assert.equal(review.candidateText,'Rain taps the glass.\n\nThe clerk waits.');assert.equal(review.status,'requires_semantic_review');assert.equal(review.sent,false);assert.equal(review.knowledgeAcknowledged,false);
  assert.equal(f.q.inspect(f.id).status,'awaiting_review');assert.match(f.q.inspect(f.id).text,/You agree/);assert.ok(Object.isFrozen(review.segments));
});

test('local repair replaces only the held paragraph, retaining sibling identities and private original diagnostics',()=>{
  const f=queue(),initial=f.q.review(f.id),held=initial.segments[1];
  const repaired=f.q.repair(f.id,held.id,'The clerk offers terms and waits for your answer.');
  assert.equal(repaired.heldCount,0);assert.equal(repaired.retiredCount,1);assert.equal(repaired.segments[0].id,initial.segments[0].id);assert.equal(repaired.segments[2].id,initial.segments[2].id);assert.notEqual(repaired.segments[1].id,held.id);assert.doesNotMatch(repaired.candidateText,/You agree/);assert.match(f.q.inspect(f.id).text,/You agree/);
  assert.throws(()=>f.q.repair(f.id,held.id,'Stale replacement'),/current withheld/);
  assert.throws(()=>f.q.repair(f.id,repaired.segments[0].id,'Rewrite a safe sibling'),/current withheld/);
});

test('revoked audiences cannot inspect or repair segments and unresolved replacements remain held',()=>{
  const f=queue(),held=f.q.review(f.id).segments[1],again=f.q.repair(f.id,held.id,'You accept the job.');assert.equal(again.heldCount,1);assert.equal(again.retiredCount,1);
  f.revoke();assert.throws(()=>f.q.review(f.id),/revoked/);assert.throws(()=>f.q.repair(f.id,again.segments[1].id,'The clerk waits.'),/revoked/);
});

test('failure reviewing the complete repaired result preserves original fragments and retirement history',()=>{
  let rejectRepair=true;const native=policy(),text='Rain taps the glass.\n\nYou agree to pay.\n\nThe clerk waits.';
  const q=createOfflinePublicationQueue({gateway:{inspect:()=>({grant:{},text,traceId:'t'})},contextAuthority:{audience:()=>audience,dependencyManifest:()=>({version:1,campaignId:audience.campaign,sceneId:audience.scene,sourceRef:audience.source_ref,sourceRevision:audience.revision,recipientIds:audience.recipients,actorId:null,actorRevision:null,records:[]})},materialReview:{review:(body,scope)=>{if(rejectRepair&&body.startsWith('Rain')&&body.includes('An alternative'))throw new Error('final review unavailable');return native.review(body,scope);}}});
  const id=q.queue({}).id,held=q.review(id).segments[1];
  assert.throws(()=>q.repair(id,held.id,'An alternative remains open.'),/final review unavailable/);rejectRepair=false;
  const after=q.review(id);assert.equal(after.retiredCount,0);assert.equal(after.heldCount,1);assert.equal(after.segments[1].id,held.id);
});

test('failed or asynchronous native repair commits cannot replace a candidate',()=>{
  const f=queue(),before=f.q.review(f.id),held=before.segments[1];let invoked=0;
  assert.throws(()=>f.q.repair(f.id,held.id,'The clerk waits.',{commit:()=>{throw new Error('storage failed');}}),/storage failed/);assert.deepEqual(f.q.review(f.id),before);
  assert.throws(()=>f.q.repair(f.id,held.id,'The clerk waits.',{commit:async()=>{invoked++;}}),/Synchronous/);assert.equal(invoked,0);
  assert.throws(()=>f.q.repair(f.id,held.id,'The clerk waits.',{commit:()=>Promise.reject(new Error('async storage failure'))}),/Synchronous/);assert.deepEqual(f.q.review(f.id),before);
  assert.throws(()=>f.q.repair(f.id,held.id,held.text),/current withheld/);
});
