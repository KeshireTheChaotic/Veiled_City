import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openKnowledgeStore,knowledgeHash} from '../../src/v2/knowledge-store.js';
import {createKnowledgeAuthority} from '../../src/v2/knowledge-authority.js';
import {createKernel,createMemoryJournal,TOOL_NAMES} from '../../src/v2/kernel.js';

const source={id:'m',campaign:'c',scene:'s',principal:'p',revision:'1',actors:['pc'],recipients:['p'],text:'I heard a rumor.'};
const evidence=(id='e',body='The witness claims the mayor fled.')=>({id,campaignId:'c',status:'committed',revision:'1',authority:'native_testimony',record:{id:'r',kind:'testimony',body,status:'active',scope:'scene',sceneId:'s',visibility:'recipients',recipientIds:['p'],knownBy:['pc'],sourceRefs:[],disclosure:'observed'}});
function fixture(t,filename){
  const store=openKnowledgeStore(filename);t.after(()=>store.close());
  const events=new Map();let request=null,current=true;
  const authority={authenticate:()=>source,revalidate:()=>current};
  const knowledge=createKnowledgeAuthority({store,sourceAuthority:authority,readEvidence:(c,id)=>events.get(id),readCanonRequest:()=>request});
  return {store,events,knowledge,authority,request:r=>request=r,revoke:()=>current=false};
}
function disk(){return join(mkdtempSync(join(tmpdir(),'vk2-knowledge-')),'knowledge.sqlite');}
function cleanup(t,path){t.after(()=>{const dir=resolve(dirname(path)),root=resolve(tmpdir());assert.ok(dir.startsWith(root+'\\')||dir.startsWith(root+'/'));rmSync(dir,{recursive:true,force:true});});}

test('native revisions survive reopening and replay cannot roll back a correction or retraction',t=>{
  const path=disk(),f=fixture(t,path);cleanup(t,path);f.events.set('e',evidence());
  const first=f.knowledge.establish('c','e');assert.equal(first.contentHash,knowledgeHash(evidence().record.body));
  f.events.set('e2',evidence('e2','The witness withdrew the claim.'));
  f.knowledge.establish('c','e2','1');const retract=evidence('e3','Withdrawn.');retract.record.status='retracted';f.events.set('e3',retract);
  f.knowledge.establish('c','e3','2');assert.deepEqual(f.knowledge.establish('c','e'),first);
  const reopened=openKnowledgeStore(path);try{
    assert.equal(reopened.metadata('c','r').revision,'3');assert.equal(reopened.metadata('c','r').status,'retracted');
    assert.deepEqual(reopened.history('c','r').map(r=>r.revision),['1','2','3']);assert.equal(reopened.readText('c','r','1'),null);
    assert.equal(reopened.history('c','r')[0].body,evidence().record.body);
  }finally{reopened.close();}
});
test('competing stores enforce revision comparison and immutable native evidence',t=>{
  const path=disk(),a=fixture(t,path),b=fixture(t,path);cleanup(t,path);a.events.set('e',evidence());a.knowledge.establish('c','e');
  b.events.set('e2',evidence('e2','Correction'));b.knowledge.establish('c','e2','1');
  a.events.set('e3',evidence('e3','Stale'));assert.throws(()=>a.knowledge.establish('c','e3','1'),/revision conflict/);
  a.events.get('e').record.body='Changed immutable evidence';assert.throws(()=>a.knowledge.establish('c','e'),/Immutable evidence/);
  assert.equal(a.store.history('c','r').length,2);
});
test('a legacy database is refused without creating v2 tables',t=>{
  const path=disk();cleanup(t,path);let db=new DatabaseSync(path);db.exec('CREATE TABLE campaigns(id TEXT); INSERT INTO campaigns VALUES (\'preserved\')');db.close();
  assert.throws(()=>openKnowledgeStore(path),/Dedicated/);db=new DatabaseSync(path);
  try{assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name),['campaigns']);assert.equal(db.prepare('SELECT id FROM campaigns').get().id,'preserved');}finally{db.close();}
});
test('generic model proposals persist separately and never establish truth or expose native acceptance',t=>{
  const f=fixture(t),kernel=createKernel({authority:f.authority,journal:createMemoryJournal(),knowledge:f.knowledge});
  const tools=kernel.bind(kernel.intake({}));assert.deepEqual(Object.keys(tools),TOOL_NAMES);
  const input={source_ref:'m',kind:'fact',claim:'The mayor is guilty.'},a=tools.knowledge_propose(input);
  assert.equal(a.status,'proposed');assert.deepEqual(tools.knowledge_propose(input),a);
  assert.equal(f.store.proposal('c',a.proposal_ref).authorship,'model_proposal');assert.equal(f.store.metadata('c','r'),null);
  assert.equal(tools.knowledge_propose({...input,visibility:'public'}).status,'blocked');
  f.revoke();assert.equal(tools.knowledge_propose(input).code,'source_authority_changed');
});
test('canon suggestions require exact private owner authorship and acceptance requires separate human review',t=>{
  const f=fixture(t),input={source_ref:'m',kind:'canon_proposal',claim:'My family built this tower.'};
  assert.equal(f.knowledge.propose(source,input).status,'blocked');
  f.request({sourceRef:'m',principal:'p',sourceRevision:'1',private:true,ownerConfirmed:true,claim:input.claim,subjectRef:null});
  assert.equal(f.knowledge.propose(source,input).status,'proposed');assert.equal(f.knowledge.propose(source,{...input,claim:'Different'}).status,'blocked');
  const e=evidence();e.record.kind='canon';e.authority='human_canon_review';f.events.set('e',e);
  assert.throws(()=>f.knowledge.establish('c','e'),/human canon review/);e.humanGmAuthorized=true;e.reviewRef='review';
  assert.equal(f.knowledge.establish('c','e').kind,'canon');
});
test('identity, disclosure acknowledgement and native evidence authority fail closed',t=>{
  const f=fixture(t),e=evidence();f.events.set('e',e);e.record.kind='identity';e.authority='native_identity';
  assert.throws(()=>f.knowledge.establish('c','e'),/Independent/);e.independentGmOrigin=true;
  e.record.disclosure='acknowledged';assert.throws(()=>f.knowledge.establish('c','e'),/delivered/);
  e.delivery={status:'uncertain',messageId:'msg',recipientIds:['p']};assert.throws(()=>f.knowledge.establish('c','e'),/delivered/);
  e.delivery.status='delivered';e.delivery.recipientIds=['other'];assert.throws(()=>f.knowledge.establish('c','e'),/delivered/);
  e.delivery.recipientIds=['p'];e.campaignId='other';assert.throws(()=>f.knowledge.establish('c','e'),/native knowledge/);
  e.campaignId='c';assert.equal(f.knowledge.establish('c','e').kind,'identity');
});
test('corrections cannot promote testimony, broaden its audience or revive retracted claims',t=>{
  const f=fixture(t);f.events.set('e',evidence());f.knowledge.establish('c','e');const next=evidence('e2');f.events.set('e2',next);
  next.record.kind='fact';next.authority='native_fact';assert.throws(()=>f.knowledge.establish('c','e2','1'),/Correction/);
  next.record.kind='testimony';next.authority='native_testimony';next.record.recipientIds=['p','other'];assert.throws(()=>f.knowledge.establish('c','e2','1'),/Correction/);
  next.record.recipientIds=['p'];next.record.status='retracted';f.knowledge.establish('c','e2','1');
  f.events.set('e3',evidence('e3'));assert.throws(()=>f.knowledge.establish('c','e3','2'),/Retracted/);
});
test('evidence changing between validation and append leaves no accepted record',t=>{
  const f=fixture(t);let calls=0;const e=evidence();
  const authority=createKnowledgeAuthority({store:f.store,sourceAuthority:f.authority,readEvidence:()=>{if(++calls===2)e.record.body='Changed';return e;}});
  assert.throws(()=>authority.establish('c','e'),/evidence changed/);assert.equal(f.store.metadata('c','r'),null);
});
