import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openKnowledgeStore} from '../../src/v2/knowledge-store.js';import {createKnowledgeAuthority} from '../../src/v2/knowledge-authority.js';
const source={id:'message',campaign:'campaign',scene:'scene',principal:'owner',revision:'1',actors:['pc'],recipients:['owner'],text:'A private statement.'};
const event=(id='event',body='The witness claims a tunnel exists.')=>({id,campaignId:'campaign',status:'committed',revision:'1',authority:'native_testimony',record:{id:'testimony',kind:'testimony',body,status:'active',scope:'scene',sceneId:'scene',visibility:'recipients',recipientIds:['owner'],knownBy:['pc'],sourceRefs:[],disclosure:'observed'}});
function fixture(t){const dir=mkdtempSync(join(tmpdir(),'vk2-knowledge-authority-')),file=join(dir,'knowledge.sqlite'),store=openKnowledgeStore(file),db=new DatabaseSync(file,{readOnly:true});t.after(()=>{db.close();store.close();rmSync(dir,{recursive:true,force:true});});return {store,count:()=>db.prepare('SELECT count(*) n FROM vk2_knowledge_proposals').get().n};}

test('native evidence revoked at transaction entry cannot become accepted knowledge',t=>{
 const f=fixture(t),e=event(),store={...f.store,append(input,options){e.status='revoked';return f.store.append(input,options);}},knowledge=createKnowledgeAuthority({store,sourceAuthority:{revalidate:()=>true},readEvidence:()=>e});
 assert.throws(()=>knowledge.establish('campaign','event'),/evidence changed/);assert.equal(f.store.metadata('campaign','testimony'),null);assert.equal(f.store.evidence('campaign','event'),null);
});
test('native evidence changed at final commit check rolls back head history and evidence receipt together',t=>{
 const f=fixture(t),e=event();let checks=0;const store={...f.store,append(input,options){return f.store.append(input,{check(){if(++checks===2)e.record.body='Unproved replacement';options?.check?.();}});}},knowledge=createKnowledgeAuthority({store,sourceAuthority:{revalidate:()=>true},readEvidence:()=>e});
 assert.throws(()=>knowledge.establish('campaign','event'),/evidence changed/);assert.equal(checks,2);assert.equal(f.store.metadata('campaign','testimony'),null);assert.deepEqual(f.store.history('campaign','testimony'),[]);assert.equal(f.store.evidence('campaign','event'),null);
});
test('failed correction or retraction preserves the original testimony instead of silently replacing memory',t=>{
 for(const status of ['active','retracted']){const f=fixture(t);let e=event(),checks=0,changing=false;const store={...f.store,append(input,options){return f.store.append(input,{check(){if(changing&&++checks===2)e.revision='revoked-revision';options?.check?.();}});}},knowledge=createKnowledgeAuthority({store,sourceAuthority:{revalidate:()=>true},readEvidence:()=>e});const original=knowledge.establish('campaign','event');e=event('correction','The witness withdraws the claim.');e.record.status=status;changing=true;
 assert.throws(()=>knowledge.establish('campaign','correction','1'),/evidence changed/);assert.deepEqual(f.store.metadata('campaign','testimony'),original);assert.equal(f.store.history('campaign','testimony').length,1);assert.equal(f.store.evidence('campaign','correction'),null);}
});
test('source revocation during proposal transaction returns blocked and leaves no private proposal',t=>{
 for(const at of ['entry','final']){const f=fixture(t);let current=true,checks=0;const store={...f.store,propose(input,options){if(at==='entry')current=false;return f.store.propose(input,{check(){if(++checks===2)current=false;options?.check?.();}});}},knowledge=createKnowledgeAuthority({store,sourceAuthority:{revalidate:()=>current},readEvidence:()=>null}),result=knowledge.propose(source,{source_ref:source.id,kind:'testimony',claim:'A rumor, not a fact.'});assert.equal(result.status,'blocked');assert.equal(result.code,'source_authority_changed');assert.equal(f.count(),0);}
});
test('owner withdrawal of a private canon request during persistence leaves no suggestion',t=>{
 const f=fixture(t),input={source_ref:source.id,kind:'canon_proposal',claim:'My family founded the clinic.'},request={sourceRef:source.id,principal:source.principal,sourceRevision:source.revision,private:true,ownerConfirmed:true,claim:input.claim,subjectRef:null};let checks=0;const store={...f.store,propose(input,options){return f.store.propose(input,{check(){if(++checks===2)request.ownerConfirmed=false;options?.check?.();}});}},knowledge=createKnowledgeAuthority({store,sourceAuthority:{revalidate:()=>true},readEvidence:()=>null,readCanonRequest:()=>request});
 const result=knowledge.propose(source,input);assert.equal(result.status,'blocked');assert.equal(result.code,'explicit_private_owner_request_required');assert.equal(f.count(),0);
});
test('stable native evidence and private proposals still replay once without stronger epistemic authority',t=>{
 const f=fixture(t),e=event(),knowledge=createKnowledgeAuthority({store:f.store,sourceAuthority:{revalidate:()=>true},readEvidence:()=>e}),saved=knowledge.establish('campaign','event');assert.deepEqual(knowledge.establish('campaign','event'),saved);assert.equal(f.store.history('campaign','testimony').length,1);
 const input={source_ref:source.id,kind:'fact',claim:'An unverified model claim.'},proposal=knowledge.propose(source,input);assert.deepEqual(knowledge.propose(source,input),proposal);assert.equal(f.count(),1);assert.equal(f.store.proposal('campaign',proposal.proposal_ref).effectsCommitted,false);assert.equal(f.store.metadata('campaign','testimony').kind,'testimony');
});
