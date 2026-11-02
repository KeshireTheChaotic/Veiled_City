import assert from 'node:assert/strict';
import test from 'node:test';
import {encounterCombatStateText} from '../../src/frameworks/discord/public.js';
import {VeiledDB} from '../../src/frameworks/persistence/database.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';

initializeRuntimeFrameworks();

function statusInteraction({guild,user,manageGuild}){
  const replies=[];let permissionChecks=0;
  return {replies,get permissionChecks(){return permissionChecks;},
    value:{id:`interaction-r91-${user}`,guildId:guild,commandName:'vc',user:{id:user,username:user},member:{displayName:user,roles:{cache:{has:()=>false}}},
      memberPermissions:{has:()=>{permissionChecks++;return manageGuild;}},guild:{id:guild},isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,replied:false,deferred:false,
      options:{getSubcommandGroup:()=> 'encounter',getSubcommand:()=> 'combatants'},
      async reply(payload){replies.push(payload);this.replied=true;}}};
}

test('combat state message preserves header, empty rows and clipping',()=>{
  assert.equal(encounterCombatStateText({encounterNumber:7,fear:4,spotlight:'Ada Gray: 2',body:'adversary rows'}),[
    '**Encounter #7 Combat State**','Fear: **4/12**','Spotlight actions: Ada Gray: 2','','adversary rows'
  ].join('\n'));
  assert.equal(encounterCombatStateText({encounterNumber:7,fear:0,spotlight:'none',body:'No adversary combatants initialized.'}),[
    '**Encounter #7 Combat State**','Fear: **0/12**','Spotlight actions: none','','No adversary combatants initialized.'
  ].join('\n'));
  const text=encounterCombatStateText({encounterNumber:7,fear:4,spotlight:'none',body:'x'.repeat(2200)});
  assert.equal(text.length,1950);
  assert.equal(text.endsWith('x'),true);
});

test('GM encounter status retains session, combat, roster and fear read order',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r91-gm',session=db.startSession(guild,'Combat status');
  const calls=[],replies=[];const encounter={id:'encounter-r91',status:'active',encounter_number:7,combat_state:{spotlight:{counts:{pc1:2}}}};
  const combatants=[{id:'cmbt-001',display_name:'The Courier',role:'adversary',hp_current:3,hp_max:5,stress_current:1,stress_max:2,status:'active',conditions:['Hidden']}];
  const roster=[{character_id:'pc1',presence:'present',name:'Ada Gray'},{character_id:'pc2',presence:'absent',name:'Absent PC'},{character_id:null,presence:'present',name:'Guest'}];
  db.getCurrentEncounter=sessionId=>{calls.push(['encounter',sessionId]);return encounter;};
  db.listCombatants=encounterId=>{calls.push(['combatants',encounterId]);return combatants;};
  db.roster=sessionId=>{calls.push(['roster',sessionId]);return roster;};
  db.getCampaign=guildId=>{calls.push(['campaign',guildId]);return {fear:4};};
  const mock=statusInteraction({guild,user:'gm',manageGuild:true});
  try{
    assert.equal(await handleCommand(mock.value,{db,gm:{content:{root:'../content'}}}),true);
    assert.deepEqual(calls,[['campaign',guild],['encounter',session.id],['combatants',encounter.id],['roster',session.id],['campaign',guild]]);
    assert.equal(mock.permissionChecks,2);
    assert.deepEqual(mock.replies,[{content:[
      '**Encounter #7 Combat State**','Fear: **4/12**','Spotlight actions: Ada Gray: 2','','`cmbt-001` **The Courier** [adversary] — HP 3/5 • Stress 1/2 • active • Hidden'
    ].join('\n'),flags:64}]);
  }finally{db.close();}
});

test('non-GM remains denied before session and combat reads',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r91-denied';db.ensureCampaign(guild);
  db.getActiveSession=()=>assert.fail('GM guard must precede session lookup');
  const mock=statusInteraction({guild,user:'player',manageGuild:false});
  try{
    assert.equal(await handleCommand(mock.value,{db,gm:{content:{root:'../content'}}}),true);
    assert.equal(mock.replies[0].flags,64);
    assert.match(mock.replies[0].content,/GM\/admin permission required/);
  }finally{db.close();}
});
