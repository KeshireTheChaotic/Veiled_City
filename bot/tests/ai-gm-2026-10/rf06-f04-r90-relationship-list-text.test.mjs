import assert from 'node:assert/strict';
import test from 'node:test';
import {relationshipListText} from '../../src/frameworks/discord/public.js';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';

initializeRuntimeFrameworks();

const listRows=[
  {id:'12345678-ally',from_key:'character',from_label:'Ada Gray',relationship_type:'ally',score:2,to_key:'npc:reed',to_label:'Milo Reed',note:'A trusted contact.'},
  {id:'abcdefgh-rival',from_key:'npc:unrelated',from_label:'Other NPC',relationship_type:'rival',score:-1,to_key:'character',to_label:'Ada Gray',note:''}
];

function database(guild,user){
  const db=new VeiledDB(':memory:','sql/schema.sql');db.ensureCampaign(guild);db.upsertPlayer(guild,user,user);
  const character=db.createCharacter(guild,user,`${user} Character`);
  return {db,character};
}

function commandInteraction({guild,user,manageGuild}){
  const replies=[];let permissionChecks=0;
  return {replies,get permissionChecks(){return permissionChecks;},
    value:{id:`interaction-r90-${user}`,guildId:guild,commandName:'vc',user:{id:user,username:user},member:{displayName:user,roles:{cache:{has:()=>false}}},
      memberPermissions:{has:()=>{permissionChecks++;return manageGuild;}},guild:{id:guild},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
      options:{getSubcommandGroup:()=> 'relationship',getSubcommand:()=> 'list',getString:name=>{assert.equal(name,'character');return null;}},
      async reply(payload){replies.push(payload);this.replied=true;}}};
}

test('relationship list text preserves original line, empty, 30-row and clipping behavior',()=>{
  assert.equal(relationshipListText(listRows.slice(0,1)),'• `12345678` **Ada Gray** — ally (+2) → **Milo Reed** — A trusted contact.');
  assert.equal(relationshipListText([]),'No matching relationships are recorded.');
  const many=Array.from({length:31},(_,index)=>({id:`${index}`,from_label:'A',relationship_type:'r',score:0,to_label:'B',note:''}));
  assert.equal((relationshipListText(many).match(/• /g)||[]).length,30);
  const long=[{...listRows[0],note:'x'.repeat(2200)}];
  const full='• `12345678` **Ada Gray** — ally (+2) → **Milo Reed** — '+'x'.repeat(2200);
  assert.equal(relationshipListText(long),full.slice(0,1950));
});

test('GM relationship list command retains exact filters and ephemeral output',async()=>{
  const guild='r90-gm-list',user='gm';const {db,character}=database(guild,user);const calls=[];
  const matching={...listRows[0],from_key:character.id};const unrelated={...listRows[1]};
  db.listRelationships=(...args)=>{calls.push(args);return [matching,unrelated];};
  const mock=commandInteraction({guild,user,manageGuild:true});
  try{
    assert.equal(await handleCommand(mock.value,{db,gm:null}),true);
    assert.deepEqual(calls,[[guild,{includeGM:true,characterId:character.id,userId:user}]]);
    assert.equal(mock.permissionChecks,3);
    assert.deepEqual(mock.replies,[{content:relationshipListText([matching]),flags:64}]);
  }finally{db.close();}
});

test('player relationship list retains private filters and character scoping',async()=>{
  const guild='r90-player-list',user='player';const {db,character}=database(guild,user);const calls=[];
  const matching={...listRows[0],from_key:character.id};
  db.listRelationships=(...args)=>{calls.push(args);return [matching];};
  const mock=commandInteraction({guild,user,manageGuild:false});
  try{
    assert.equal(await handleCommand(mock.value,{db,gm:null}),true);
    assert.deepEqual(calls,[[guild,{includeGM:false,characterId:character.id,userId:user}]]);
    assert.equal(mock.permissionChecks,3);
    assert.deepEqual(mock.replies,[{content:relationshipListText([matching]),flags:64}]);
  }finally{db.close();}
});
