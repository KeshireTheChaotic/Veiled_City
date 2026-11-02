import assert from 'node:assert/strict';
import test from 'node:test';
import {npcProxyAssignmentsText} from '../../src/frameworks/discord/public.js';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';

initializeRuntimeFrameworks();

const proxyRows=[
  {npc_name:'Ada Gray',status:'active',control_level:'tactical',discord_user_id:'owner-1'},
  {npc_name:'Milo Reed',status:'offered',control_level:'portrayal',discord_user_id:'owner-2'}
];

test('NPC proxy assignment text preserves labels, GM mentions and empty output',()=>{
  assert.equal(npcProxyAssignmentsText(proxyRows.map(proxy=>({proxy,showUserId:true}))),[
    '**NPC Proxy Assignments**',
    '• **Ada Gray** — active — Tactical — <@owner-1>',
    '• **Milo Reed** — offered — Portrayal only — <@owner-2>'
  ].join('\n'));
  assert.equal(npcProxyAssignmentsText(proxyRows.slice(0,1).map(proxy=>({proxy,showUserId:false}))),[
    '**NPC Proxy Assignments**',
    '• **Ada Gray** — active — Tactical'
  ].join('\n'));
  assert.equal(npcProxyAssignmentsText([]),'No active/offered NPC proxy assignments are visible to you.');
});

test('GM status command retains query, per-row GM checks, and ephemeral mentions',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r88-gm-status',session=db.startSession(guild,'Status fixture');
  const calls=[],replies=[];let permissionChecks=0;
  db.listNpcProxies=(sessionId,filters)=>{calls.push([sessionId,filters]);return proxyRows;};
  const interaction={id:'interaction-r88-gm',guildId:guild,commandName:'vc',user:{id:'gm',username:'GM'},member:{displayName:'GM',roles:{cache:{has:()=>false}}},memberPermissions:{has:()=>{permissionChecks++;return true;}},guild:{id:guild},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
    options:{getSubcommandGroup:()=> 'npc',getSubcommand:()=> 'status'},
    async reply(payload){replies.push(payload);this.replied=true;}};
  try{
    assert.equal(await handleCommand(interaction,{db,gm:null}),true);
    assert.deepEqual(calls,[[session.id,{statuses:['offered','active']}]]);
    assert.equal(permissionChecks,proxyRows.length+2,'one global command dispatch check plus the query and per-row GM checks');
    assert.deepEqual(replies,[{content:npcProxyAssignmentsText(proxyRows.map(proxy=>({proxy,showUserId:true}))),flags:64}]);
  }finally{db.close();}
});

test('player status command retains user-scoped query and omits owner mentions',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r88-player-status',session=db.startSession(guild,'Status fixture');
  const calls=[],replies=[];
  db.listNpcProxies=(sessionId,filters)=>{calls.push([sessionId,filters]);return proxyRows.slice(0,1);};
  const interaction={id:'interaction-r88-player',guildId:guild,commandName:'vc',user:{id:'player-1',username:'Player'},member:{displayName:'Player',roles:{cache:{has:()=>false}}},memberPermissions:{has:()=>false},guild:{id:guild},
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
    options:{getSubcommandGroup:()=> 'npc',getSubcommand:()=> 'status'},
    async reply(payload){replies.push(payload);this.replied=true;}};
  try{
    assert.equal(await handleCommand(interaction,{db,gm:null}),true);
    assert.deepEqual(calls,[[session.id,{userId:'player-1',statuses:['offered','active']}]]);
    assert.deepEqual(replies,[{content:'**NPC Proxy Assignments**\n• **Ada Gray** — active — Tactical',flags:64}]);
  }finally{db.close();}
});
