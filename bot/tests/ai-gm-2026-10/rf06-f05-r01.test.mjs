import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerCommands} from '../../src/frameworks/discord/command-registration.js';
import {registerCommands as publicRegister} from '../../src/frameworks/discord/public.js';

function fixture(error=null){
  const calls=[],logs=[];
  class Rest{
    constructor(options){calls.push(['construct',options]);}
    setToken(token){calls.push(['token',token]);return this;}
    async put(route,payload){calls.push(['put',route,payload]);if(error)throw error;}
  }
  const routes={applicationGuildCommands:(app,guild)=>`guild:${app}:${guild}`,applicationCommands:app=>`global:${app}`};
  return {calls,logs,options:{Rest,routes,log:message=>logs.push(message)}};
}

test('public registration has one implementation and executable delegates without dispatcher import',()=>{
  assert.equal(publicRegister,registerCommands);
  const entry=readFileSync(new URL('../../src/register-commands.js',import.meta.url),'utf8');
  assert.match(entry,/import ['"]dotenv\/config['"]/);
  assert.match(entry,/await registerCommands\(\)/);
  assert.doesNotMatch(entry,/from ['"]\.\/commands\.js['"]|new REST|\.put\(/);
  const implementation=readFileSync(new URL('../../src/frameworks/discord/command-registration.js',import.meta.url),'utf8');
  const imports=[...implementation.matchAll(/from ['"]([^'"]+)['"]/g)].map(match=>match[1]);
  assert.deepEqual(imports,['discord.js','./command-definitions.js','./command-schema.js']);
});

test('missing token or application ID fails before client construction, routes or logging',async()=>{
  for(const env of [{},{DISCORD_TOKEN:'synthetic'},{DISCORD_CLIENT_ID:'app'}]){
    const f=fixture();
    await assert.rejects(registerCommands({...f.options,env}),{message:'Set DISCORD_TOKEN and DISCORD_CLIENT_ID in .env.'});
    assert.deepEqual(f.calls,[]);assert.deepEqual(f.logs,[]);
  }
});

test('guild registration sends actual split command definitions once with REST v10 and exact token',async()=>{
  const f=fixture();
  await registerCommands({...f.options,env:{DISCORD_TOKEN:'synthetic',DISCORD_CLIENT_ID:'app',DISCORD_GUILD_ID:'guild'}});
  assert.deepEqual(f.calls.slice(0,2),[['construct',{version:'10'}],['token','synthetic']]);
  assert.equal(f.calls.length,3);assert.equal(f.calls[2][1],'guild:app:guild');
  const commands=f.calls[2][2].body;
  assert.ok(commands.length>1);assert.ok(commands.every(command=>command.name.startsWith('vc-')));
  assert.equal(new Set(commands.map(command=>command.name)).size,commands.length);
  assert.ok(commands.some(command=>command.name==='vc-session'));
  assert.ok(commands.some(command=>command.name==='vc-character'));
  assert.deepEqual(f.logs,[`Registered ${commands.length} root command(s) to guild guild.`]);
});

test('absent or empty guild selects global route and preserves global success text',async()=>{
  for(const guildId of [undefined,'']){
    const f=fixture();
    await registerCommands({...f.options,env:{DISCORD_TOKEN:'synthetic',DISCORD_CLIENT_ID:'app',DISCORD_GUILD_ID:guildId}});
    assert.equal(f.calls.length,3);assert.equal(f.calls[2][1],'global:app');
    assert.deepEqual(f.logs,[`Registered ${f.calls[2][2].body.length} global root command(s). Global propagation can take longer.`]);
  }
});

test('transport failure propagates same error without retry or success log',async()=>{
  const error=new Error('synthetic transport failure'),f=fixture(error);
  await assert.rejects(registerCommands({...f.options,env:{DISCORD_TOKEN:'synthetic',DISCORD_CLIENT_ID:'app'}}),actual=>actual===error);
  assert.equal(f.calls.filter(call=>call[0]==='put').length,1);assert.deepEqual(f.logs,[]);
});

test('route failure propagates before transport with no fallback registration',async()=>{
  const f=fixture(),error=new Error('synthetic route failure');
  f.options.routes.applicationGuildCommands=()=>{throw error;};
  await assert.rejects(registerCommands({...f.options,env:{DISCORD_TOKEN:'synthetic',DISCORD_CLIENT_ID:'app',DISCORD_GUILD_ID:'guild'}}),actual=>actual===error);
  assert.equal(f.calls.filter(call=>call[0]==='put').length,0);assert.deepEqual(f.logs,[]);
});
