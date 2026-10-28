import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GMService} from '../../src/gm.js';
import {VeiledDB} from '../../src/db.js';
import {npcDirectorSchema} from '../../src/framework-to-framework/intent--world/public.js';
import {npcActionSchema,ACTION_TYPES,MAJOR_IMPACTS,SIMULATION_PROMPT,simulationUpdateSchema} from '../../src/frameworks/world/public.js';
import {intentArraySchema} from '../../src/frameworks/intent/public.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
function fixture(t,respond=()=>({output_text:'{"actions":[],"ai_intents":[]}'})){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vc-rf05-c23-'));
  const db=new VeiledDB(path.join(directory,'offline.sqlite'),path.join(root,'bot/sql/schema.sql'));
  const guild='c23-guild';db.ensureCampaign(guild);db.startSession(guild,'Offline Director opportunity','manual');
  const requests=[],metrics=[];
  const ai={responses:{async create(request){requests.push(request);return respond(request,requests.length);}}};
  const gm=new GMService({db,content:{root:path.join(root,'content')},ai,srd:{},
    config:{gmModel:'offline-configured-director',openaiMaxRetries:0},metrics:{record(...args){metrics.push(args);},incident(){}}});
  t.after(()=>{db.db.close();fs.rmSync(directory,{force:true,recursive:true});});
  const state=()=>JSON.stringify({mutations:db.db.prepare('SELECT * FROM mutation_ledger').all(),
    events:db.listWorldEvents(guild,{includeGM:true,limit:100}),records:db.listCityRecords(guild,{includeGM:true,limit:100}),
    simulation:db.listSimulationRecords(guild,{limit:100}),characters:db.listGuildCharacters(guild)});
  return {db,guild,gm,requests,metrics,state};
}

test('one pair-owned proposal schema preserves exact World and Intent contract references and field order',()=>{
  assert.equal(npcDirectorSchema.type,'object');assert.equal(npcDirectorSchema.additionalProperties,false);
  assert.deepEqual(Object.keys(npcDirectorSchema.properties),['actions','ai_intents']);
  assert.deepEqual(npcDirectorSchema.required,['actions','ai_intents']);
  assert.equal(npcDirectorSchema.properties.actions.type,'array');assert.equal(npcDirectorSchema.properties.actions.maxItems,4);
  assert.equal(npcDirectorSchema.properties.actions.items,npcActionSchema);
  assert.equal(npcDirectorSchema.properties.ai_intents,intentArraySchema);
  assert.equal(npcActionSchema.properties.type.enum,ACTION_TYPES);
  assert.deepEqual(npcActionSchema.properties.significance.enum,['routine',...MAJOR_IMPACTS]);
  assert.equal(typeof SIMULATION_PROMPT,'string');assert.equal(simulationUpdateSchema.type,'object');
});

test('actual GM planning and structured transport receive the composed schema without native execution',async t=>{
  const f=fixture(t),before=f.state();
  const result=await f.gm.planNpcActions({guildId:f.guild,layer:'scene',query:'Native scene opportunity',candidates:[]});
  assert.deepEqual(result,{actions:[],ai_intents:[]});assert.equal(f.requests.length,1);
  const req=f.requests[0];
  assert.equal(req.model,'offline-configured-director');assert.equal(req.max_output_tokens,2400);
  assert.equal(req.text.format.name,'npc_director');assert.equal(req.text.format.strict,true);
  assert.equal(req.text.format.schema.properties.actions.items,npcActionSchema);
  assert.equal(req.text.format.schema.properties.ai_intents,intentArraySchema);
  assert.ok(req.input.includes('AI MANAGEMENT (GM-private planning only, not actor knowledge)'));
  assert.ok(req.input.includes('Actor-specific packets: []'));
  assert.equal(f.state(),before);
});

test('identical in-flight native opportunity plans share one mocked provider request and return separate proposals',async t=>{
  let entered,release;
  const requested=new Promise(resolve=>{entered=resolve;}),barrier=new Promise(resolve=>{release=resolve;});
  const f=fixture(t,async()=>{entered();await barrier;return {output_text:'{"actions":[],"ai_intents":[]}'};}),before=f.state();
  const input={guildId:f.guild,layer:'scene',query:'Same current opportunity',candidates:[],cycleKey:'native-opportunity-one'};
  const first=f.gm.planNpcActions(input);await requested;
  const second=f.gm.planNpcActions(input);release();
  const [a,b]=await Promise.all([first,second]);
  assert.equal(f.requests.length,1);assert.deepEqual(a,b);assert.notEqual(a,b);
  a.actions.push({proposal_only:true});assert.deepEqual(b.actions,[]);
  assert.equal(f.gm.npcPlanFlights.size,0);assert.equal(f.state(),before);
});

test('explicit provider refusal remains one request with no invented proposal or native mutation',async t=>{
  const f=fixture(t,()=>({output:[{content:[{type:'refusal',refusal:'offline refusal'}]}]})),before=f.state();
  await assert.rejects(f.gm.planNpcActions({guildId:f.guild,layer:'scene',query:'Refusal boundary',candidates:[]}),{code:'STRUCTURED_PROVIDER_REFUSAL'});
  assert.equal(f.requests.length,1);assert.equal(f.state(),before);
});

test('malformed JSON retains the existing two-attempt repair and configured model without native commitment',async t=>{
  const f=fixture(t,(_req,attempt)=>({output_text:attempt===1?'broken json':'{"actions":[],"ai_intents":[]}'})),before=f.state();
  const result=await f.gm.planNpcActions({guildId:f.guild,layer:'scene',query:'Structured response repair',candidates:[]});
  assert.deepEqual(result,{actions:[],ai_intents:[]});assert.equal(f.requests.length,2);
  assert.ok(f.requests.every(req=>req.model==='offline-configured-director'));
  assert.ok(f.requests[1].max_output_tokens>=f.requests[0].max_output_tokens);
  assert.equal(f.state(),before);
});

test('retired schema path has no runtime caller; the actual GM imports only the exact pair public API',()=>{
  assert.equal(fs.existsSync(path.join(root,'bot/src/simulation-schema.js')),false);
  const gm=fs.readFileSync(path.join(root,'bot/src/gm.js'),'utf8');
  assert.match(gm,/import \{ npcDirectorSchema \} from "\.\/framework-to-framework\/intent--world\/public\.js"/);
  const bridge=fs.readFileSync(path.join(root,'bot/src/framework-to-framework/intent--world/public.js'),'utf8');
  
});
