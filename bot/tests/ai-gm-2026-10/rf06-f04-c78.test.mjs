import assert from 'node:assert/strict';
import test from 'node:test';
import {VeiledDB} from '../../src/db.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';
import {connectDiscordCaseboardReads} from '../../src/framework-to-framework/discord--persistence/public.js';
import {splitDiscordText} from '../../src/frameworks/discord/public.js';

initializeRuntimeFrameworks();

function makeInteraction({guild,user,id,failFirstEdit=false}){
  const acknowledgements=[],edits=[],followups=[];
  const interaction={guildId:guild,commandName:'vc',id,user:{id:user,username:user},member:{displayName:user},
    replied:false,deferred:false,isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommandGroup:()=> 'intel',getSubcommand:()=> 'caseboard',getString:()=>null},
    async deferReply(payload){acknowledgements.push(payload);this.deferred=true;},
    async reply(){assert.fail('caseboard must preserve its native deferred acknowledgement');},
    async editReply(payload){edits.push(payload);if(failFirstEdit&&edits.length===1)throw new Error('R78 delivery failure');this.replied=true;},
    async followUp(payload){followups.push(payload);}};
  return {interaction,acknowledgements,edits,followups};
}

test('caseboard preserves current owner, guild and active-status visibility through its read boundary',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r78-guild',otherGuild='r78-other',ownerA='owner-a',ownerB='owner-b';
  try{
    db.ensureCampaign(guild);db.ensureCampaign(otherGuild);
    db.upsertPlayer(guild,ownerA,'Owner A');db.upsertPlayer(guild,ownerB,'Owner B');
    const publicNote=`Public lead ${'p'.repeat(1250)}`,partyNote=`Party lead ${'q'.repeat(1250)}`;
    const rows=[
      {id:'public',label:'Public thread',visibility:'public',notes:publicNote},
      {id:'party',label:'Party thread',visibility:'party',notes:partyNote},
      {id:'a',label:'Owner A thread',visibility:'player',subjectUserId:ownerA,notes:'Private lead A'},
      {id:'b',label:'Owner B thread',visibility:'player',subjectUserId:ownerB},
      {id:'gm',label:'GM hidden thread',visibility:'gm',notes:'GM hidden notes'},
      {id:'closed',label:'Resolved thread',visibility:'party',status:'resolved'},
      {id:'character',label:'Character-only thread',visibility:'character',subjectCharacterId:'pc-a'}
    ];
    for(const [index,row] of rows.entries()){
      db.upsertThread(guild,row);
      db.db.prepare('UPDATE threads SET updated_at=? WHERE guild_id=? AND id=?')
        .run(`2026-01-01 00:00:0${8-index}`,guild,row.id);
    }
    db.upsertThread(otherGuild,{id:'other',label:'Other guild thread',visibility:'public'});
    const before=JSON.stringify(db.db.prepare('SELECT * FROM threads ORDER BY guild_id,id').all());
    const calls=[],original=db.listVisibleActiveThreads.bind(db);
    db.listVisibleActiveThreads=(...args)=>{calls.push(args);return original(...args);};
    for(const [user,privateLine] of [[ownerA,'• **Owner A thread**: Private lead A'],[ownerB,'• **Owner B thread**']]){
      const delivery=makeInteraction({guild,user,id:`r78-${user}`});
      assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
      assert.deepEqual(calls.at(-1),[guild,user]);
      assert.equal(delivery.acknowledgements.length,1);assert.equal(delivery.acknowledgements[0].flags,64);
      const expected=splitDiscordText(`• **Public thread**: ${publicNote}\n• **Party thread**: ${partyNote}\n${privateLine}`,1900);
      assert.equal(delivery.edits.length,1);assert.equal(delivery.edits[0].content,expected[0]);
      assert.deepEqual(delivery.followups.map(row=>row.content),expected.slice(1));
      assert.ok(delivery.followups.length>0);
      assert.ok([...delivery.edits,...delivery.followups].every(row=>row.content.length<=1900));
      assert.ok([...delivery.edits,...delivery.followups].every(row=>row.allowedMentions.parse.length===0));
      assert.ok(delivery.followups.every(row=>row.flags===64));
      const delivered=[...delivery.edits,...delivery.followups].map(row=>row.content).join('\n');
      assert.doesNotMatch(delivered,/GM hidden|Resolved thread|Other guild|Character-only/);
      assert.doesNotMatch(delivered,user===ownerA?/Owner B thread/:/Owner A thread/);
    }
    assert.equal(JSON.stringify(db.db.prepare('SELECT * FROM threads ORDER BY guild_id,id').all()),before);
    assert.equal(db.db.prepare('SELECT count(*) n FROM operation_receipts').get().n,0);
  }finally{db.close();}
});

test('caseboard retains private empty fallback and the original delivery error response',async()=>{
  const db=new VeiledDB(':memory:','sql/schema.sql'),guild='r78-empty',user='owner-empty';
  try{
    db.ensureCampaign(guild);db.upsertPlayer(guild,user,'Empty owner');
    const empty=makeInteraction({guild,user,id:'r78-empty'});
    assert.equal(await handleCommand(empty.interaction,{db,gm:null}),true);
    assert.equal(empty.acknowledgements[0].flags,64);
    assert.equal(empty.edits[0].content,'No active recorded threads.');
    assert.equal(empty.followups.length,0);
    const failed=makeInteraction({guild,user,id:'r78-failure',failFirstEdit:true});
    assert.equal(await handleCommand(failed.interaction,{db,gm:null}),true);
    assert.equal(failed.acknowledgements.length,1);assert.equal(failed.acknowledgements[0].flags,64);
    assert.equal(failed.edits.length,2);assert.equal(failed.edits[1].content,'⚠️ R78 delivery failure');
    assert.equal(failed.followups.length,0);
  }finally{db.close();}
});

test('caseboard store exposes only the original reader and preserves its receiver and result/error identity',()=>{
  const rows=[{id:'thread'}],failure=new Error('reader failure'),calls=[];
  const db={listVisibleActiveThreads(...args){assert.equal(this,db);calls.push(args);return rows;},write(){assert.fail('not a read capability');}};
  const store=connectDiscordCaseboardReads(db);
  assert.ok(Object.isFrozen(store));assert.deepEqual(Object.keys(store),['listVisibleActiveThreads']);
  assert.equal(store.listVisibleActiveThreads('guild','owner'),rows);assert.deepEqual(calls,[['guild','owner']]);
  db.listVisibleActiveThreads=function(){assert.equal(this,db);throw failure;};
  assert.throws(()=>store.listVisibleActiveThreads('guild','owner'),error=>error===failure);
  assert.throws(()=>connectDiscordCaseboardReads({}),TypeError);
});
