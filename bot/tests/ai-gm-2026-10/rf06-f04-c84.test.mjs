import assert from 'node:assert/strict';
import test from 'node:test';
import {VeiledDB} from '../../src/db.js';
import '../../src/ai-intents.js';
import {initializeRuntimeFrameworks} from '../../src/application/composition/runtime-initializers.js';
import {handleCommand} from '../../src/commands.js';
import {pendingDeliveryLines,heldNativeNoticeLines,chunkDiscordLines} from '../../src/frameworks/discord/public.js';

initializeRuntimeFrameworks();

function request({guild,id,gm=true,limit=null,failFirstReply=false,events=[]}){
  const replies=[],followups=[];
  const interaction={guildId:guild,commandName:'vc',id,user:{id:'actor',username:'Actor'},member:{displayName:'Actor'},
    memberPermissions:{has:()=>gm},replied:false,deferred:false,
    isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,
    options:{getSubcommandGroup:()=> 'gm',getSubcommand:()=> 'delivery-status',getString:()=>null,
      getInteger(){assert.ok(gm,'GM guard must precede option access');return limit;}},
    async reply(payload){events.push('reply');replies.push(payload);if(failFirstReply&&replies.length===1)throw new Error('R84 reply failed');this.replied=true;},
    async followUp(payload){events.push('follow-up');followups.push(payload);}};
  return {interaction,replies,followups};
}
function fixture(guild){const db=new VeiledDB(':memory:','sql/schema.sql');db.ensureCampaign(guild);return db;}

test('delivery diagnostic text preserves original empty, ordinal, clipping and held-source wording without mutation',()=>{
  const rows=[{turn_id:'123456789abcdef',id:'part',ordinal:0,surface:'play',status:'uncertain',attempt_count:2,last_failure:'F'.repeat(170)}],before=JSON.stringify(rows);
  assert.deepEqual(pendingDeliveryLines(rows),['**Pending/uncertain turn delivery**',
    `• turn \`12345678\` part \`part\` (1) · play · **uncertain** · attempts 2 · ${'F'.repeat(160)}`]);
  assert.equal(JSON.stringify(rows),before);assert.deepEqual(pendingDeliveryLines([]),['No pending turn delivery rows.']);
  assert.deepEqual(heldNativeNoticeLines([{kind:'roll_publication',record_key:'held',status:'needs_review'}]),
    ['Native notice roll_publication `held`: **needs_review**; no send performed. Current source/audience proof required.']);
  assert.deepEqual(heldNativeNoticeLines([]),[]);
});

test('actual GM diagnostic preserves ordered reads, limit/private chunks and untouched saved outbox rows',async()=>{
  const guild='r84-display',db=fixture(guild);
  try{
    const session=db.startSession(guild,'Diagnostic fixture','already_together'),turn=db.beginTurnAttempt({guildId:guild,messageId:'r84-message',actorPrincipal:'gm:fixture',sessionId:session.id,audience:'party'});
    const expectedRows=[];
    for(let i=0;i<15;i++){
      const row=db.enqueuePublication(guild,{turnId:turn.turn_id,surface:'play',ordinal:i,payload:`SYNTHETIC PAYLOAD SECRET ${i}`,payloadHash:`r84-${i}`}),status=i%2?'uncertain':'pending';
      db.db.prepare('UPDATE publication_outbox SET status=?,attempt_count=?,last_failure=?,created_at=? WHERE id=?')
        .run(status,i+1,'Z'.repeat(200),new Date(Date.UTC(2026,0,1)+i*60000).toISOString(),row.id);
      expectedRows.push({id:row.id,status,attempt:i+1,ordinal:i});
    }
    const source=db.saveWorldEvent(guild,{key:'r84-held-source',kind:'fixture',title:'Held diagnostic fixture',status:'active',truth_status:'asserted',visibility:'gm',source_kind:'fixture',source_id:'r84',tick:0,minute:0,details:{}});
    db.saveCityRecord(guild,{kind:'roll_publication',key:'r84-held',status:'needs_review',visibility:'gm',source_event:source.event_key,data:{hold_code:'SYNTHETIC_LEGACY_FIXTURE'}});
    const before=JSON.stringify(db.db.prepare('SELECT * FROM publication_outbox ORDER BY ordinal').all()),events=[],calls=[];
    for(const [method,label] of [['reservedNativeNotices','materialize'],['listPendingPublications','pending'],['heldNativeNotices','held']]){
      const original=db[method].bind(db);db[method]=(...args)=>{events.push(label);calls.push([label,args]);return original(...args);};
    }
    const delivery=request({guild,id:'r84-display',limit:12,events});
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    assert.deepEqual(events.slice(0,4),['materialize','pending','held','reply']);
    assert.deepEqual(calls.find(([label])=>label==='pending')[1],[guild,{limit:12}]);
    const lines=['**Pending/uncertain turn delivery**',...expectedRows.slice(0,12).map(r=>
      `• turn \`${turn.turn_id.slice(0,8)}\` part \`${r.id}\` (${r.ordinal+1}) · play · **${r.status}** · attempts ${r.attempt} · ${'Z'.repeat(160)}`),
      'Native notice roll_publication `r84-held`: **needs_review**; no send performed. Current source/audience proof required.'];
    const expected=chunkDiscordLines(lines);assert.ok(expected.length>1);assert.equal(delivery.replies.length,1);
    assert.equal(delivery.replies[0].content,expected[0]);assert.deepEqual(delivery.followups.map(r=>r.content),expected.slice(1));
    assert.ok([...delivery.replies,...delivery.followups].every(r=>r.flags===64&&r.allowedMentions===undefined));
    assert.doesNotMatch([...delivery.replies,...delivery.followups].map(r=>r.content).join('\n'),/SYNTHETIC PAYLOAD SECRET/);
    assert.equal(JSON.stringify(db.db.prepare('SELECT * FROM publication_outbox ORDER BY ordinal').all()),before);
    assert.equal(db.getCityRecord(guild,'roll_publication','r84-held').status,'needs_review');
  }finally{db.close();}
});

test('non-GM guard remains before limit, materialization and diagnostic readers',async()=>{
  const guild='r84-denied',db=fixture(guild);
  try{
    for(const method of ['reservedNativeNotices','listPendingPublications','heldNativeNotices'])db[method]=()=>assert.fail('permission guard must precede '+method);
    const delivery=request({guild,id:'r84-denied',gm:false});
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    assert.equal(delivery.replies[0].content,'⚠️ GM/admin permission required.');assert.equal(delivery.replies[0].flags,64);
  }finally{db.close();}
});

test('pending formatting failure remains before the held-notice query',async()=>{
  const guild='r84-order',db=fixture(guild),failure=new Error('R84 row display unavailable');
  try{
    const events=[],row={get turn_id(){events.push('format');throw failure;}};
    db.reservedNativeNotices=()=>{events.push('materialize');return [];};
    db.listPendingPublications=()=>{events.push('pending');return [row];};
    db.heldNativeNotices=()=>assert.fail('held query moved before pending formatting');
    const delivery=request({guild,id:'r84-order',events});
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    assert.deepEqual(events,['materialize','pending','format','reply']);assert.equal(delivery.replies[0].content,'⚠️ R84 row display unavailable');
  }finally{db.close();}
});

test('private diagnostic reply failure stays in command catch without repeating original reads',async()=>{
  const guild='r84-reply',db=fixture(guild);
  try{
    const events=[];
    for(const [method,label] of [['reservedNativeNotices','materialize'],['listPendingPublications','pending'],['heldNativeNotices','held']]){
      const original=db[method].bind(db);db[method]=(...args)=>{events.push(label);return original(...args);};
    }
    const delivery=request({guild,id:'r84-reply',failFirstReply:true,events});
    assert.equal(await handleCommand(delivery.interaction,{db,gm:null}),true);
    assert.deepEqual(events,['materialize','pending','held','reply','reply']);
    assert.equal(delivery.replies[1].content,'⚠️ R84 reply failed');assert.equal(delivery.replies[1].flags,64);
  }finally{db.close();}
});
