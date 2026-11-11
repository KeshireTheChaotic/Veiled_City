import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createOllamaProvider} from '../../src/v2/ollama-provider.js';
import {createCallBudget} from '../../src/v2/provider-budget.js';
import {conversationFixture} from '../../tests/veilkeeper2/helpers/conversation-fixture.mjs';

// Explicit opt-in, new artifact directory each run, one call per case, no retries or sends.
if(process.env.VK2_CONVERSATION_EVAL!=='1')throw new Error('Set VK2_CONVERSATION_EVAL=1 for synthetic local-model evaluation');
const root=fileURLToPath(new URL('../../../',import.meta.url)),label=process.argv[2],profile=process.argv[3]??'plain';
if(!/^[a-z0-9-]{1,64}$/.test(label??''))throw new Error('Unique evaluation label required');
if(!['plain','thinking'].includes(profile))throw new Error('Evaluation profile must be plain or thinking');
const directory=join(root,'.reports','conversation-'+label);mkdirSync(directory); // EEXIST intentionally prevents overwrite/retry.
const config=JSON.parse(readFileSync(join(root,'bot/src/v2/model-config.json'),'utf8'));
const model=process.argv[4]??config.model;
if(!/^[a-zA-Z0-9_.:/-]{1,128}$/.test(model))throw new Error('Explicit local evaluation model required');
const suite=process.argv[5]??'development';if(!['development','holdout'].includes(suite))throw new Error('Explicit development or holdout suite required');
const fixturePath='bot/tests/veilkeeper2/fixtures/'+(suite==='holdout'?'conversation-holdout-cases.json':'conversation-cases.json');
const cases=JSON.parse(readFileSync(join(root,fixturePath),'utf8'));
const paths=['bot/src/v2/model-gateway.js','bot/src/v2/conversation-instructions.js','bot/src/v2/conversation-input.js','bot/src/v2/ollama-provider.js','bot/src/v2/prose-material-review.js','bot/src/v2/context-authority.js','bot/src/v2/tool-contracts.js',fixturePath,'bot/tests/veilkeeper2/helpers/conversation-fixture.mjs','bot/scripts/veilkeeper2/conversation-quality.mjs'];
const settings={thinking:profile==='thinking',maxOutputTokens:profile==='thinking'?4096:768};
const localProvider=createOllamaProvider({model,baseUrl:config.baseUrl,timeoutMs:90000,...settings});
const artifact={startedAt:new Date().toISOString(),model,label,profile,settings,suite,scope:'Real local Ollama; synthetic scene data and transport. No live Discord or human acceptance. Regex flags are diagnostic, never semantic clearance.',limits:{callsPerCase:1,maxCases:cases.length,retries:0,cloudFallback:false,discordCalls:0,sends:0},hashes:paths.map(file=>({file,sha256:createHash('sha256').update(readFileSync(join(root,file))).digest('hex')})),results:[]};
const save=()=>writeFileSync(join(directory,'result.json'),JSON.stringify(artifact,null,2)+'\n');save();
try{
  const read=async(path,options)=>{const response=await fetch(new URL(path,config.baseUrl),{...options,signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Local model metadata unavailable');return response.json();};
  const [version,show,tags]=await Promise.all([read('/api/version'),read('/api/show',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model})}),read('/api/tags')]);
  artifact.backend={version:version.version,modelDigest:tags.models?.find(m=>m.name===model)?.digest??null,details:show.details,parameters:show.parameters,templateHash:createHash('sha256').update(show.template??'').digest('hex')};save();
}catch(e){artifact.preflightError=e.message;save();throw e;}
for(const scenario of cases){
  const calls=[],budget=createCallBudget(localProvider,{maxCalls:1});
  const f=conversationFixture(scenario,{async generate(input){
    const call={instructions:input.instructions,context:input.context,tools:input.tools?.map(t=>t.name)??[]};calls.push(call);
    const out=await budget.generate(input);call.response=out;return out;
  }}),started=performance.now();let result;
  try{
    const response=await f.app.respond(f.event),publication=f.app.inspectPublication(response.publication.id),review=f.app.reviewPublication(response.publication.id);
    result={id:scenario.id,input:scenario.utterance,rubric:scenario.rubric,status:'draft_received',output:publication.text,metrics:response.metrics,screening:review.segments,sent:publication.sent};
  }catch(e){result={id:scenario.id,input:scenario.utterance,rubric:scenario.rubric,status:'failed',error:e.code??e.message};}
  result.elapsedMs=Math.round(performance.now()-started);result.callsUsed=budget.used;
  result.privateBodyRead=f.textReads.includes('private');result.packetLeaked=JSON.stringify(f.requests).includes(f.canary);result.calls=calls;
  artifact.results.push(result);save();console.log(JSON.stringify({...result,calls:undefined,screening:undefined}));
}
artifact.finishedAt=new Date().toISOString();save();
console.log(JSON.stringify({artifact:resolve(directory,'result.json'),cases:artifact.results.length,semanticAcceptance:'requires_review'}));
if(artifact.results.some(r=>r.status==='failed'||r.privateBodyRead||r.packetLeaked))process.exitCode=1;
