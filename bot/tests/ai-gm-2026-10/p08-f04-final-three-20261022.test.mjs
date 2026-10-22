import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {VeiledDB} from '../../src/db.js';
import {reconcileOpeningCohortStatus,runOpeningCohort} from '../../src/opening-cohort-runner.js';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {createP08ThreeFixture} from './p08-final-three-fixture.mjs';

function seedDeliveredCohort(db,guild,session){
  const turn=db.beginTurnAttempt({guildId:guild,sessionId:session.id,messageId:'cohort-delivered',actorPrincipal:'__opening_cohort__',audience:'party'});
  const rows=[];
  for(let ordinal=0;ordinal<2;ordinal++){
    const payload=`safe-public-opening-${ordinal}`,payloadHash=`payload-hash-${ordinal}`;
    const row=db.enqueuePublication(guild,{turnId:turn.turn_id,surface:'channel',ordinal,visibility:'party',channelId:'channel-safe',payload,payloadHash});
    rows.push(db.updatePublication(row.id,{status:'delivered',discordMessageId:`discord-receipt-${ordinal}`,channelId:'channel-safe'}));
  }
  db.updateTurnAttempt(turn.turn_id,{stage:'committed',committed:'yes',nativeCommitId:'cohort-fixture'});
  const source=indexWorldEvent(db,guild,{key:`cohort-fixture-source-${session.id}`,kind:'native_opening_cohort_job',title:'Deterministic cohort fixture',source_id:'native:opening-cohort',
    session_id:session.id,scene:'scene-fixture',visibility:'gm',details:{fixture:true}},'native:opening-cohort').event_key;
  db.saveCityRecord(guild,{kind:'opening_cohort_job',key:session.id,status:'pending',visibility:'gm',source_event:source,
    data:{version:1,session:session.id,scene:'scene-fixture',roster_revision:4,input_fingerprint:'input-fingerprint-fixture',
      attempt_id:'attempt-fixture',turn_id:turn.turn_id,attempts:1,plan:{version:1},evidence:{}}});
  return {turnId:turn.turn_id,receipts:rows.map(row=>({id:row.id,message:row.discord_message_id,channel:row.channel_id,payload_hash:row.payload_hash}))};
}

test('two SQLite connections reconcile stale and mixed publication callbacks from durable receipts',()=>{
  const f=createP08ThreeFixture();let second;
  try{
    const {db,guild,session,dbPath}=f,fixture=seedDeliveredCohort(db,guild,session),schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url));
    second=new VeiledDB(dbPath,schema);
    const staleFromFirst=db.getCityRecord(guild,'opening_cohort_job',session.id);
    const staleFromSecond=second.getCityRecord(guild,'opening_cohort_job',session.id);
    const receipt=second.listTurnPublications(guild,fixture.turnId)[0];
    second.updatePublication(receipt.id,{status:'uncertain',discordMessageId:null,channelId:'channel-safe'});
    const mixed=reconcileOpeningCohortStatus(second,guild,staleFromSecond,'delivered',{...staleFromSecond.data,evidence:{transport_acknowledged:true}});
    assert.equal(mixed.status,'uncertain','one uncertain destination prevents an all-delivered cohort claim');
    const liveParts=second.listTurnPublications(guild,fixture.turnId);
    second.updatePublication(liveParts[0].id,{status:'delivered',discordMessageId:'discord-receipt-0',channelId:'channel-safe'});
    const current=second.getCityRecord(guild,'opening_cohort_job',session.id);
    const complete=reconcileOpeningCohortStatus(second,guild,current,'uncertain',{...current.data});
    assert.equal(complete.status,'delivered','all durable Discord receipts promote the cohort to delivered');
    const late=reconcileOpeningCohortStatus(db,guild,staleFromFirst,'needs_review',{...staleFromFirst.data,hold_code:'late-callback'});
    assert.equal(late.status,'delivered','a stale asynchronous failure cannot downgrade a completed cohort');
    assert.deepEqual(db.listTurnPublications(guild,fixture.turnId).map(row=>row.discord_message_id),fixture.receipts.map(row=>row.message));
    assert.deepEqual(db.listTurnPublications(guild,fixture.turnId).map(row=>row.payload_hash),fixture.receipts.map(row=>row.payload_hash));
  }finally{second?.close();f.close();}
});

test('Director pause after delivery preserves status, receipts, and exactly-once authoring',async()=>{
  const f=createP08ThreeFixture();
  try{
    const {db,guild,session}=f,fixture=seedDeliveredCohort(db,guild,session);db.setDirectorPaused(guild,true);
    let plans=0,writes=0;
    const row=await runOpeningCohort({db,guild:{id:guild},gm:{planAssembly:async()=>{plans++;},authorOpeningCohort:async()=>{writes++;}}});
    assert.equal(row.status,'delivered');
    assert.equal(row.data.turn_id,fixture.turnId);
    assert.equal(plans,0);assert.equal(writes,0);
    for(let cycle=0;cycle<2;cycle++){
      db.setDirectorPaused(guild,false);db.setDirectorPaused(guild,true);
      const again=await runOpeningCohort({db,guild:{id:guild},gm:{planAssembly:async()=>{plans++;},authorOpeningCohort:async()=>{writes++;}}});
      assert.equal(again.status,'delivered');
    }
    assert.equal(plans,0);assert.equal(writes,0);
    assert.deepEqual(db.listTurnPublications(guild,fixture.turnId).map(row=>row.discord_message_id),fixture.receipts.map(row=>row.message));
  }finally{f.close();}
});
