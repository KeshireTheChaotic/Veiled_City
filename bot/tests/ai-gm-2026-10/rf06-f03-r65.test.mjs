import test from 'node:test';
import assert from 'node:assert/strict';
import {createReservationFixture} from './rf06-reservation-fixture.mjs';
import {inspectGmReactionInvitation,withdrawGmReactionInvitation} from '../../src/gm-native-rolls.js';
import {nativeGmNotice} from '../../src/gm-arbitration-output.js';
import {reserveGmArbitrationNotice} from '../../src/native-publications.js';

test('original owner withdrawal rolls back on reservation failure and queues a real owned notice on retry',()=>{
 const {db,guild,user,pc,execution}=createReservationFixture();
 try{
  const child=execution.data.children[0].decision,privateScope={mode:'private',actorUserId:user,actorCharacterId:pc.id};
  const projection=nativeGmNotice(db,guild,child,privateScope);assert.ok(projection?.text);assert.ok(projection.revision);
  const invitation=inspectGmReactionInvitation(db,guild,user,child),command={op:'gm-reaction-withdraw',request:child,revision:invitation.terms.revision},options={interactionId:'r65-withdraw',authoredText:JSON.stringify(command)};
  assert.throws(()=>nativeGmNotice(db,guild,child,{...privateScope,actorUserId:'other-owner'}),/private_notice_recipient/);
  const tables=db.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
  const snapshot=()=>Object.fromEntries(tables.map(name=>[name,db.db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}" ORDER BY rowid`).all()]));
  const before=snapshot();
  const stale={...command,revision:'stale'};
  assert.throws(()=>withdrawGmReactionInvitation(db,guild,user,stale,{...options,authoredText:JSON.stringify(stale)}),/reaction_withdrawal_revision/);
  assert.deepEqual(snapshot(),before);
  db.db.exec("CREATE TEMP TRIGGER r65_abort BEFORE INSERT ON city_records WHEN NEW.kind='gm_arbitration_publication' BEGIN SELECT RAISE(ABORT,'r65 reservation failure'); END");
  assert.throws(()=>withdrawGmReactionInvitation(db,guild,user,command,options),/r65 reservation failure/);
  assert.deepEqual(snapshot(),before);
  db.db.exec('DROP TRIGGER r65_abort');
  const terminal=withdrawGmReactionInvitation(db,guild,user,command,options);assert.equal(terminal.status,'withdrawn');
  const notices=db.listCityRecords(guild,{kind:'gm_arbitration_publication',includeGM:true});assert.equal(notices.length,1);
  const notice=notices[0];assert.equal(notice.status,'queued');assert.equal(notice.subject_key,pc.id);assert.equal(notice.data.user,user);
  assert.equal(db.getCityRecord(guild,'gm_group_feature_execution',execution.record_key).status,'resolved');
  assert.equal(db.listCityRecords(guild,{kind:'native_notice',includeGM:true}).length,0);
  const after=snapshot();
  assert.deepEqual(withdrawGmReactionInvitation(db,guild,user,command,options),terminal);
  assert.deepEqual(reserveGmArbitrationNotice(db,guild,child),notice);
  assert.ok(nativeGmNotice(db,guild,child,privateScope)?.text);
  assert.deepEqual(snapshot(),after);
 }finally{db.close();}
});
