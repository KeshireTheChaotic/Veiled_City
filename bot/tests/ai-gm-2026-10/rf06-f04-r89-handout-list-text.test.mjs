import assert from 'node:assert/strict';
import test from 'node:test';
import {handoutListText} from '../../src/frameworks/discord/public.js';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';

initializeRuntimeFrameworks();

const rows=[{id:'12345678-record',title:'Blue Ledger',kind:'casefile',authority:'public_record',visibility:'party'}];

function interaction({guild,user,manageGuild}){
  const replies=[];let permissionChecks=0;
  return {replies,get permissionChecks(){return permissionChecks;},
    value:{id:`interaction-r89-${user}`,guildId:guild,commandName:'vc',user:{id:user,username:user},member:{displayName:user,roles:{cache:{has:()=>false}}},
      memberPermissions:{has:()=>{permissionChecks++;return manageGuild;}},guild:{id:guild},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
      options:{getSubcommandGroup:()=> 'handout',getSubcommand:()=> 'list'},
      async reply(payload){replies.push(payload);this.replied=true;}}};
}

function database(guild,user){
  const db=new VeiledDB(':memory:','sql/schema.sql');
  db.ensureCampaign(guild);db.upsertPlayer(guild,user,user);const character=db.createCharacter(guild,user,`${user} Character`);
  return {db,character};
}

test('handout list text preserves original labels, empty state and clipping',()=>{
  assert.equal(handoutListText(rows),'• `12345678` **Blue Ledger** — casefile / public_record / party');
  assert.equal(handoutListText([]),'No visible handouts/evidence are recorded.');
  const long=[{...rows[0],title:'x'.repeat(2200)}];
  const full='• `12345678` **'+'x'.repeat(2200)+'** — casefile / public_record / party';
  assert.equal(handoutListText(long),full.slice(0,1950));
});

test('GM handout list command retains character/filter arguments and ephemeral reply',async()=>{
  const guild='r89-gm-list',user='gm';const {db,character}=database(guild,user);const calls=[];db.listHandoutsFor=(...args)=>{calls.push(args);return rows;};
  const mock=interaction({guild,user,manageGuild:true});
  try{
    assert.equal(await handleCommand(mock.value,{db,gm:null}),true);
    assert.deepEqual(calls,[[guild,user,{characterId:character.id,includeGM:true,limit:40}]]);
    assert.equal(mock.permissionChecks,2);
    assert.deepEqual(mock.replies,[{content:handoutListText(rows),flags:64}]);
  }finally{db.close();}
});

test('player handout list retains private audience filter without widening visibility',async()=>{
  const guild='r89-player-list',user='player';const {db,character}=database(guild,user);const calls=[];db.listHandoutsFor=(...args)=>{calls.push(args);return rows;};
  const mock=interaction({guild,user,manageGuild:false});
  try{
    assert.equal(await handleCommand(mock.value,{db,gm:null}),true);
    assert.deepEqual(calls,[[guild,user,{characterId:character.id,includeGM:false,limit:40}]]);
    assert.deepEqual(mock.replies,[{content:handoutListText(rows),flags:64}]);
  }finally{db.close();}
});
