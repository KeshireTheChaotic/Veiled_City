import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPrivatePlanner} from '../../src/v2/private-planner.js';
import {createModelGateway} from '../../src/v2/model-gateway.js';
import {createContextAuthority} from '../../src/v2/context-authority.js';
import {createOfflinePublicationQueue} from '../../src/v2/publication-queue.js';
const digest=text=>createHash('sha256').update(text).digest('hex');
function fixture(){
  const source={id:'m',revision:'1',principal:'p',campaign:'c',scene:'s',recipients:['p'],text:'Who hired the driver?'};
  const proof={sourceRef:'m',sourceRevision:'1',principal:'p',campaignId:'c',sceneId:'s',revision:'1',purpose:'secret_dependent',recordRefs:['secret']};
  const row={id:'secret',campaignId:'c',revision:'1',status:'active',kind:'canon',scope:'scene',sceneId:'s',sourceRefs:[],contentHash:digest('The official secretly hired the driver.'),visibility:'gm',disclosure:'private',recipientIds:[],knownBy:[]};
  const state={valid:true,body:'The official secretly hired the driver.',reads:0,requests:[],after:()=>{}};
  const sourceAuthority={revalidate:()=>state.valid},records={metadata:(_c,id)=>id==='secret'?row:null,readText:()=>{state.reads++;return {revision:row.revision,text:state.body};}};
  const planner=createPrivatePlanner({sourceAuthority,authorize:()=>proof,records,provider:{generate:async request=>{state.requests.push(request);state.after();return {text:'PRIVATE: propose a visible unmarked vehicle; keep the official unrevealed.'};}}});
  return {source,proof,row,state,planner,sourceAuthority,records};
}
test('private planning uses explicit native scope and returns a frozen non-publishable proposal',async()=>{
  const f=fixture(),handle=await f.planner.plan(f.source),result=f.planner.inspect(handle);
  assert.equal(f.state.requests[0].context.visibility,'gm_private');assert.equal(f.state.requests[0].context.records[0].kind,'canon');
  assert.equal(result.status,'private_proposal');assert.equal(result.executionAuthority,false);assert.equal(result.publicationAuthority,false);
  assert.equal(result.metrics.modelCalls,1);assert.equal(JSON.stringify(handle),'{}');assert.ok(Object.isFrozen(result));
  assert.throws(()=>f.planner.inspect({}),/unissued/);
});
test('wrong native principal/campaign/source grants fail before bodies or inference',async()=>{
  for(const key of ['principal','campaignId','sceneId','sourceRef','sourceRevision']){
    const f=fixture();f.proof[key]='other';await assert.rejects(f.planner.plan(f.source),/not_authorized/);assert.equal(f.state.reads,0);assert.equal(f.state.requests.length,0);
  }
});
test('private closure must explicitly authorize every ancestor and excludes pending canon proposals',async()=>{
  const f=fixture();f.row.sourceRefs=['hidden-parent'];await assert.rejects(f.planner.plan(f.source),/source_unavailable/);assert.equal(f.state.reads,0);
  f.row.sourceRefs=['secret'];await assert.rejects(f.planner.plan(f.source),/source_unavailable/);
  f.row.sourceRefs=[];f.row.kind='canon_proposal';await assert.rejects(f.planner.plan(f.source),/source_unavailable/);assert.equal(f.state.reads,0);
});
test('body substitution, changed scope during inference and later correction invalidate private plans',async()=>{
  const f=fixture();f.state.body='Substituted secret';await assert.rejects(f.planner.plan(f.source),/source_changed/);assert.equal(f.state.requests.length,0);
  const g=fixture();g.state.after=()=>{g.proof.revision='2';};await assert.rejects(g.planner.plan(g.source),/authority_changed/);
  const h=fixture(),handle=await h.planner.plan(h.source);h.row.revision='2';assert.throws(()=>h.planner.inspect(handle),/source_changed/);
});
test('private plan handles cannot enter the audience gateway or publication queue',async()=>{
  const f=fixture(),handle=await f.planner.plan(f.source);
  const context=createContextAuthority({sourceAuthority:f.sourceAuthority,records:f.records,readActor:()=>null});
  const requests=[],gateway=createModelGateway({contextAuthority:context,provider:{generate:async r=>{requests.push(r);return {text:'The driver waits.'};}}});
  const queue=createOfflinePublicationQueue({gateway,contextAuthority:context});
  assert.throws(()=>queue.queue(handle),/unissued_model_draft/);await assert.rejects(gateway.generate(handle),/authority/);
  const grant=context.issue(f.source,['secret']),publicDraft=await gateway.generate(grant);queue.queue(publicDraft);
  assert.deepEqual(requests[0].context.records,[]);assert.equal(JSON.stringify(requests).includes('official secretly'),false);
  assert.throws(()=>f.planner.inspect(publicDraft),/unissued_private_plan/);
});
test('aborted planning makes zero calls and source revocation prevents later private inspection',async()=>{
  const f=fixture(),abort=new AbortController();abort.abort();await assert.rejects(f.planner.plan(f.source,{signal:abort.signal}));assert.equal(f.state.reads,0);
  const handle=await f.planner.plan(f.source);f.state.valid=false;assert.throws(()=>f.planner.inspect(handle),/authority_changed/);
});
