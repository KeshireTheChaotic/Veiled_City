/** H01 exact UTF-16 occurrence binding and fail-closed per-clause recovery. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VeiledDB } from '../src/db.js';
import { captureAuthoredTurnEnvelope } from '../src/authored-turn-envelope.js';
import { proposeIntents, recoverPlayerIntents } from '../src/typed-intents.js';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-h01-'));
const db=new VeiledDB(path.join(dir,'fixture.sqlite'),path.resolve('sql/schema.sql'));
const guild='h01-fixture';
const legacy=(span,patch={})=>({type:'interact',source_span:span,target_name:'',target_key:'',destination:'unspecified',
  operation:'inspect',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',reason:'',...patch});
try{
  db.ensureCampaign(guild);const session=db.startSession(guild,'H01');db.upsertPlayer(guild,'owner','Owner');
  const pc=db.createCharacter(guild,'owner','Jaxon',{});db.assignCharacter(session.id,'owner',pc.id);db.setPresence(session.id,'owner','present');
  const scope={mode:'party',actorUserId:'owner',actorCharacterId:pc.id};
  const raw='I check the door. I check the door. I wave to Choso.';
  const envelope=captureAuthoredTurnEnvelope(db,guild,'owner',pc.id,'h01-message',raw);
  const review=recoverPlayerIntents([legacy('I check the door.'),legacy('I check the door.'),legacy('invented action')],raw,scope);
  assert.equal(review.intents.length,2);assert.equal(review.diagnostics[0].category,'unmatched_source_span');
  const overlap=recoverPlayerIntents([legacy('I check the door.'),legacy('check the door.')],raw,scope);
  assert.equal(overlap.intents.length,1);assert.equal(overlap.diagnostics[0].category,'overlapping_source_span');
  const starts=[raw.indexOf('I check'),raw.indexOf('I check',1+raw.indexOf('I check'))];
  const proposals=proposeIntents(db,guild,starts.map((start,index)=>({version:2,proposal_id:'',source_event:envelope.source_event,
    start,end:start+'I check the door.'.length,source_span:'I check the door.',actor_character_id:pc.id,sequence_index:index,
    dependencies:[],type:'interact',operation:'inspect',target:{kind:'object',key:'door',phrase:'door',grounding:'known'},
    framing:'immediate',destination_scope:'none',attempted_action:'I check the door.',desired_outcome:null,
    authored_outcome_claim:null,temporal_relation:'sequential'})),scope,{messageId:'h01-message'});
  assert.notEqual(proposals[0].record_key,proposals[1].record_key,'identical text occurrences retain distinct identities');
  const fields=['actor_character_id','attempted_action','authored_outcome_claim','dependencies','desired_outcome','destination_scope',
    'end','framing','operation','proposal_id','sequence_index','source_event','source_span','start','target','temporal_relation','type','version'];
  const clean=Object.fromEntries(fields.map(field=>[field,proposals[0].data[field]]));
  const invalid=proposeIntents(db,guild,[{...clean,proposal_id:'',start:999,end:1002,sequence_index:4}],scope,
    {messageId:'h01-message'})[0];
  assert.equal(invalid.status,'unmatched_source_span');
  assert(!JSON.stringify(invalid.data).includes('invented action'),'diagnostic does not persist fabricated private text');
  assert.throws(()=>proposeIntents(db,guild,[{...clean,proposal_id:'',actor_character_id:'other',sequence_index:5}],scope,
    {messageId:'h01-message'}),/actor|principal/i,'actor forgery remains fatal');
  console.log('H01 source recovery PASS: exact occurrences, partial quarantine, bounded diagnostics and actor authority.');
}finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
