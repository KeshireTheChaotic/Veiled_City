import test from 'node:test';
import assert from 'node:assert/strict';
import {createReservationFixture} from './rf06-reservation-fixture.mjs';
import {inspectGmReactionInvitation,submitGmReactionInvitation} from '../../src/gm-native-rolls.js';
import {nativeGmNotice} from '../../src/gm-arbitration-output.js';
import {typedRollProof} from '../../src/typed-roll-proof.js';

test('original group owner roll and condition roll back with failed reservation, then replay saved outcome',()=>{
 const {db,guild,user,pc,execution}=createReservationFixture();
 try{
  db.setCityCalendar(guild,{...db.getCityCalendar(guild),flags:{...db.getCityCalendar(guild).flags,roll_collaboration:true}});
  const child=execution.data.children[0].decision,scope={mode:'private',actorUserId:user,actorCharacterId:pc.id};
  const {terms}=inspectGmReactionInvitation(db,guild,user,child);
  const input={op:'gm-reaction-roll',request:child,revision:terms.revision};
  let calls=0;
  const options={interactionId:'r66-roll',authoredText:JSON.stringify(input),rng:sides=>{assert.equal(sides,12);return ++calls%2?1:2;}};
  const tables=db.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>row.name);
  const snapshot=()=>Object.fromEntries(tables.map(name=>[name,db.db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}" ORDER BY rowid`).all()]));
  const before=snapshot();
  db.db.exec("CREATE TEMP TRIGGER r66_abort BEFORE INSERT ON city_records WHEN NEW.kind='gm_arbitration_publication' BEGIN SELECT RAISE(ABORT,'r66 reservation failure'); END");
  assert.throws(()=>submitGmReactionInvitation(db,guild,user,input,options),/r66 reservation failure/);
  assert.equal(calls,2);assert.deepEqual(snapshot(),before);
  db.db.exec('DROP TRIGGER r66_abort');
  const result=submitGmReactionInvitation(db,guild,user,input,options);
  assert.equal(calls,4);assert.equal(result.status,'resolved');
  assert.equal(typedRollProof(db,guild,result).outcome,'failure');
  const effects=db.listCityRecords(guild,{kind:'gm_group_feature_effect',includeGM:true});assert.equal(effects.length,1);assert.equal(effects[0].status,'resolved');
  const conditions=db.getCharacter(pc.id).data.conditions||[];
  assert.equal(conditions.filter(c=>c.name==='Movement limited'&&c.active!==false).length,1);
  const notices=db.listCityRecords(guild,{kind:'gm_arbitration_publication',includeGM:true});assert.equal(notices.length,1);assert.equal(notices[0].status,'queued');assert.equal(notices[0].data.user,user);
  assert.ok(nativeGmNotice(db,guild,child,scope)?.text);
  assert.equal(db.getCityRecord(guild,'gm_group_feature_execution',execution.record_key).status,'resolved');
  const after=snapshot();
  assert.deepEqual(submitGmReactionInvitation(db,guild,user,input,options),result);assert.equal(calls,4);assert.deepEqual(snapshot(),after);
 }finally{db.close();}
});
