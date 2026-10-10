/** H02 pending referents use current owner clarification without granting access by grounding alone. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VeiledDB } from '../src/db.js';
import { captureAuthoredTurnEnvelope } from '../src/authored-turn-envelope.js';
import { proposeIntents, acceptIntentForAdjudication, resolvePendingReferent } from '../src/typed-intents.js';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-h02-'));
const db=new VeiledDB(path.join(dir,'fixture.sqlite'),path.resolve('sql/schema.sql'));
const guild='h02-fixture';
try{
  db.ensureCampaign(guild);const session=db.startSession(guild,'H02');db.upsertPlayer(guild,'owner','Owner');
  const pc=db.createCharacter(guild,'owner','Jaxon',{});db.assignCharacter(session.id,'owner',pc.id);db.setPresence(session.id,'owner','present');
  const scope={mode:'party',actorUserId:'owner',actorCharacterId:pc.id},raw='I enter the store.';
  const envelope=captureAuthoredTurnEnvelope(db,guild,'owner',pc.id,'ambiguous',raw);
  const value={version:2,proposal_id:'',source_event:envelope.source_event,start:0,end:raw.length,source_span:raw,
    actor_character_id:pc.id,sequence_index:0,dependencies:[],type:'move',operation:'enter',
    target:{kind:'location',key:null,phrase:'the store',grounding:'ambiguous'},framing:'immediate',destination_scope:'interior',
    attempted_action:raw,desired_outcome:null,authored_outcome_claim:null,temporal_relation:'sequential'};
  const proposal=proposeIntents(db,guild,[value],scope,{messageId:'ambiguous'})[0];
  const awaiting=acceptIntentForAdjudication(db,guild,proposal,scope,{targetCandidates:['laundromat','copy-shop']});
  assert.equal(awaiting.status,'awaiting_referent');assert.equal(db.listCityRecords(guild,{kind:'typed_intent'}).length,0);
  assert.throws(()=>resolvePendingReferent(db,guild,awaiting.record_key,'unlisted',scope,{messageId:'confirm'}),/candidate/i);
  captureAuthoredTurnEnvelope(db,guild,'owner',pc.id,'confirm','Yes, the laundromat.');
  const accepted=resolvePendingReferent(db,guild,awaiting.record_key,'laundromat',scope,{messageId:'confirm'});
  assert.equal(accepted.status,'accepted_for_adjudication');assert.equal(accepted.data.target_key,'laundromat');
  assert.equal(accepted.data.clarified_from,awaiting.record_key);assert.equal(accepted.source_event.includes('authored-turn:'),true);
  assert.equal(db.getCityRecord(guild,'semantic_intent_proposal',awaiting.record_key).status,'clarified');
  assert.equal(accepted.data.destination,'interior','grounding preserves the requested route and does not substitute exterior access');
  console.log('H02 referent movement PASS: pending ambiguity, new-source clarification, owner/scene binding and route preservation.');
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
