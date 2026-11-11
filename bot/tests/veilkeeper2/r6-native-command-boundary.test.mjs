import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCommands} from '../../src/frameworks/discord/command-definitions.js';
import {validateCommandSchema} from '../../src/frameworks/discord/command-schema.js';
import {buildNativeCommands} from '../../src/v2/command-definitions.js';
import {registerNativeCommands} from '../../src/v2/register-commands.js';
const legacy=()=>JSON.parse(JSON.stringify(buildCommands()));
test('native overlay retains every baseline declaration except its explicitly added fields',()=>{
  const base=legacy(),native=buildNativeCommands(),gm=new Set(['session-reopen','register-character','rebind-character','bootstrap-preview','bootstrap-review','drafts','publish-draft']),player=new Set(['death-review','death-refresh','death-reconcile']);
  assert.deepEqual(validateCommandSchema(native),[]);assert.equal(native.length,base.length);
  for(const command of native){
    if(command.name==='vc-session')for(const sub of command.options)if(['absent','leave'].includes(sub.name))sub.options=sub.options.filter(o=>o.name!=='character');
    if(command.name==='vc-gm')command.options=command.options.filter(s=>!gm.has(s.name));
    if(command.name==='vc-player')command.options=command.options.filter(s=>!player.has(s.name));
  }
  assert.deepEqual(native,base);assert.deepEqual(legacy(),base);
});
test('native generation cannot mutate another generated schema or add operations to legacy registration',()=>{
  const base=legacy(),first=buildNativeCommands();first.find(c=>c.name==='vc-gm').options.length=0;
  assert.ok(buildNativeCommands().find(c=>c.name==='vc-gm').options.some(s=>s.name==='bootstrap-review'));assert.deepEqual(legacy(),base);
  assert.equal(base.find(c=>c.name==='vc-player').options.some(s=>s.name==='death-review'),false);
  assert.equal(base.find(c=>c.name==='vc-session').options.find(s=>s.name==='absent').options.some(o=>o.name==='character'),false);
});
function registration(){
  const env={VK2_NATIVE:'1',VK2_ALLOWED_GUILD_ID:'1467249344947159291',DISCORD_GUILD_ID:'1467249344947159291',DISCORD_CLIENT_ID:'1555295975042457702',DISCORD_TOKEN:'fake-test-token'},calls=[],logs=[];
  class Rest{constructor(options){calls.push(['construct',options]);}setToken(token){assert.equal(token,env.DISCORD_TOKEN);return this;}async put(route,body){calls.push(['put',route,body]);}}
  const routes={applicationGuildCommands:(app,guild)=>`guild-only/${app}/${guild}`,applicationCommands(){throw new Error('Global registration forbidden');}};
  return {env,calls,logs,options:{env,Rest,routes,log:value=>logs.push(value)}};
}
test('native registration uses only the explicitly allowed guild and the v2 schema',async()=>{
  const f=registration(),result=await registerNativeCommands(f.options);assert.deepEqual(result,{guildId:f.env.DISCORD_GUILD_ID,count:24});assert.equal(f.calls.length,2);assert.equal(f.calls[1][1],`guild-only/${f.env.DISCORD_CLIENT_ID}/${f.env.DISCORD_GUILD_ID}`);assert.deepEqual(f.calls[1][2],{body:buildNativeCommands()});assert.equal(f.logs.length,1);assert.equal(f.logs[0].includes(f.env.DISCORD_TOKEN),false);
});
test('missing opt-in, mismatched guilds and incomplete native config fail before REST construction',async()=>{
  for(const patch of [{VK2_NATIVE:undefined},{VK2_ALLOWED_GUILD_ID:'99999'},{DISCORD_GUILD_ID:undefined},{DISCORD_CLIENT_ID:'bad'},{DISCORD_TOKEN:undefined}]){const f=registration();await assert.rejects(registerNativeCommands({...f.options,env:{...f.env,...patch}}));assert.deepEqual(f.calls,[]);assert.deepEqual(f.logs,[]);}
});
test('native env-file loading is explicit, follows opt-in and cannot bypass the allowed guild',async()=>{
  const f=registration();f.env.VK2_ENV_FILE='D:/native-test/.env';delete f.env.DISCORD_TOKEN;let loads=0;
  const options={...f.options,loadEnvFile:file=>{assert.equal(file,f.env.VK2_ENV_FILE);loads++;f.env.DISCORD_TOKEN='loaded-test-token';}};await registerNativeCommands(options);assert.equal(loads,1);
  await assert.rejects(registerNativeCommands({...options,env:{...f.env,VK2_NATIVE:undefined}}),/VK2_NATIVE/);assert.equal(loads,1);
  const g=registration();g.env.VK2_ENV_FILE='D:/native-test/.env';await assert.rejects(registerNativeCommands({...g.options,loadEnvFile:()=>{g.env.DISCORD_GUILD_ID='99999';}}),/matching/);assert.deepEqual(g.calls,[]);
});
test('uncertain registration is surfaced without retry or a success log',async()=>{
  const f=registration();let attempts=0;class Rest{setToken(){return this;}async put(){attempts++;throw new Error('Transport interrupted');}}
  await assert.rejects(registerNativeCommands({...f.options,Rest}),/Transport interrupted/);assert.equal(attempts,1);assert.deepEqual(f.logs,[]);
});
