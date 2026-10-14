/** Default-off API experiments use injected transport only. No real model quality or latency claims. */
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import OpenAI from 'openai';
import {nativeFixture} from './v9-fixtures.mjs';
import {FakeResponses} from './contract-fixtures.mjs';
import {GMService} from '../src/gm.js';
import {ContentIndex} from '../src/content.js';
import {OperationalMetrics} from '../src/operational-metrics.js';
import {shadowEngagement} from '../src/engagement-shadow.js';
import {routineReplayVariant} from './session5-replay-variants.mjs';

test('LAT02 pinned SDK raw dedicated endpoint works with injected offline fetch and zero hidden retry',async()=>{
  let requests=0;const client=new OpenAI({apiKey:'offline-dummy',fetch:async(url,options)=>{
    requests++;assert.equal(new URL(url).pathname,'/v1/decisions');assert.equal(options.method,'POST');
    const body=JSON.parse(options.body);assert.equal(body.model,'gpt-6-luna');assert.equal(body.questions[0].name,'engagement');
    return new Response(JSON.stringify({answers:[{name:'engagement',type:'choice',choice:'respond',confidence:.99}]}),{headers:{'content-type':'application/json'}});
  }});
  const result=await shadowEngagement(client,'synthetic routing input',{enabled:true});assert.equal(result.respond,true);assert.equal(requests,1);
});
test('LAT02 refusal, malformed, unsupported client and errors remain nonauthorizing fallback',async()=>{
  for(const response of [{answers:[{type:'refusal'}]},{answers:[{name:'engagement',type:'choice',choice:'ignore',confidence:.1}]},{gm:true,respond:false},new Error('secret')]){
    const ai={decisions:{create:async()=>{if(response instanceof Error)throw response;return response;}}};
    assert.equal((await shadowEngagement(ai,'input',{enabled:true})).respond,null);
  }
  assert.equal((await shadowEngagement({},'input',{enabled:true})).status,'unavailable');
  assert.equal((await shadowEngagement({post:()=>assert.fail('disabled')},'input',{})).status,'disabled');
});
for(const [text,respond] of [['I ask the attendant about work.',true],['Anyone around?',true],['I need work...',true],['Nice shoes, Choso.',false],['OOC: back in a minute.',false],['How does Armor work?',false]])
  test(`LAT02 shadow never changes existing semantic route: ${text}`,()=>nativeFixture(async f=>{
    const metrics=new OperationalMetrics(),ai=new FakeResponses([{respond,reason:'synthetic baseline'}]);
    let shadowCalls=0;ai.decisions={create:async()=>{shadowCalls++;return {answers:[{name:'engagement',type:'choice',choice:respond?'ignore':'respond',confidence:.99}]};}};
    const gm=new GMService({db:f.db,ai,metrics,content:new ContentIndex(path.resolve('../content')),config:{routerModel:'offline',routerDecisionsShadow:true}});
    const pc=f.pcs[0],message={id:'route',content:text,author:{id:pc.owner_user_id,username:'synthetic'}};
    assert.equal(await gm.shouldRespond({guildId:f.guild,message,mode:'active'}),respond);
    const expectedCalls=text.startsWith('OOC:')?0:1; // Existing explicit-silence native path stays zero-provider-call.
    assert.equal(ai.requests.length,expectedCalls);assert.equal(shadowCalls,expectedCalls);
    if(expectedCalls)assert.equal(metrics.snapshot(f.guild).stages.router_shadow_disagree.count,1);
    assert.equal(await gm.shouldRespond({guildId:f.guild,message,mode:'active',directMention:true}),true);assert.equal(ai.requests.length,expectedCalls);assert.equal(shadowCalls,expectedCalls);
  }));
test('LAT03 offline routine variants preserve complete schema/budget; hard adjudication and runtime default stay unchanged',()=>{
  const req={model:'gpt-6-luna',reasoning:{effort:'low'},input:'synthetic',text:{format:{schema:{complete:true}}}};
  assert.equal(routineReplayVariant(req,{variant:'B',operation:'scene_description'}).reasoning.effort,'none');
  assert.equal(routineReplayVariant(req,{variant:'B',operation:'damage'}).reasoning.effort,'low');
  assert.equal(req.reasoning.effort,'low');assert.deepEqual(routineReplayVariant(req,{variant:'B',operation:'scene_description'}).text,req.text);
});
