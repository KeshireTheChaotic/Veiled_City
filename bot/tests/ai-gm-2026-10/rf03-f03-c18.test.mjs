import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createFearReservationWriter} from '../../src/frameworks/daggerheart/fear-reservation-writer.js';
import {createPreRollFearRules} from '../../src/frameworks/daggerheart/pre-roll-fear-rules.js';
import {createPreRollFearRecoveryRules} from '../../src/frameworks/daggerheart/pre-roll-fear-recovery-rules.js';
import {fearReservationHash as hash,inspectFearReservation} from '../../src/frameworks/daggerheart/fear-reservation-proof.js';

function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'vc-fear-c18-')),file=join(dir,'fear.sqlite');let sql=new DatabaseSync(file),visible=true,principalRevision='r1',incoming=null,rollCalls=0,validatedParts=0,failDebit=false;
  t.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true});});
  sql.exec("CREATE TABLE records(kind TEXT,key TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE events(key TEXT PRIMARY KEY,body TEXT); CREATE TABLE mutations(id INTEGER PRIMARY KEY,body TEXT); CREATE TABLE campaign(fear INTEGER); INSERT INTO campaign VALUES(3);");
  const guild='guild-c18',binding={scene:'scene-c18',session:'session-c18',location:'tower-c18',source:'owner-source-c18'},scope={mode:'private',actorUserId:'owner-c18',actorCharacterId:'pc-c18'};
  const pc={id:'pc-c18',guild_id:guild,owner_user_id:'owner-c18',data:{location:binding.location}};
  const db={
    getCityRecord(_g,kind,key){const r=sql.prepare('SELECT body FROM records WHERE kind=? AND key=?').get(kind,key??'');return r?JSON.parse(r.body):null;},
    saveCityRecord(_g,input){const row={...input,record_key:input.key,subject_key:input.subject_key??null};sql.prepare('INSERT OR REPLACE INTO records VALUES(?,?,?)').run(input.kind,input.key,JSON.stringify(row));return row;},
    getWorldEvent(_g,key){const r=sql.prepare('SELECT body FROM events WHERE key=?').get(key??'');return r?JSON.parse(r.body):null;},
    recordMutation(_g,v){const row={actor_type:v.actorType,actor_id:v.actorId,source_layer:v.sourceLayer,session_id:v.sessionId,mutation_type:v.mutationType,entity_key:v.entityKey,visibility:v.visibility,after_json:JSON.stringify(v.after),...v};const result=sql.prepare('INSERT INTO mutations(body) VALUES(?)').run(JSON.stringify(row));return {...row,id:Number(result.lastInsertRowid)};},
    getMutation(_g,id){const r=sql.prepare('SELECT body FROM mutations WHERE id=?').get(id);return r?{...JSON.parse(r.body),id}:null;},
    getCampaign(){return sql.prepare('SELECT fear FROM campaign').get();},
    changeFear(_g,delta){if(failDebit)throw Error('injected debit failure');sql.prepare('UPDATE campaign SET fear=fear+?').run(delta);return this.getCampaign().fear;},
    getCharacter(id){return id===pc.id?structuredClone(pc):null;},
    pendingFearReservationKeys(){return sql.prepare("SELECT key FROM records WHERE kind='pre_roll_fear_interrupt'").all().map(r=>r.key);},
    ownedRollRequests(){return [this.getCityRecord(guild,'roll_request','request-c18')];},
    listCityRecords(_g,{kind}){return sql.prepare('SELECT body FROM records WHERE kind=?').all(kind).map(r=>JSON.parse(r.body));},
    listTurnPublications(){return parts.map(p=>({...p}));},incomingAttackForNativeDecision(){return incoming;},
    transaction(fn){sql.exec('BEGIN IMMEDIATE');try{const value=fn();sql.exec('COMMIT');return value;}catch(e){sql.exec('ROLLBACK');throw e;}}
  };
  const event=(_db,_g,v)=>{const row={...v,event_key:v.key,status:v.status??'active'};sql.prepare('INSERT OR REPLACE INTO events VALUES(?,?)').run(row.event_key,JSON.stringify(row));return row;};
  const save=(kind,key,data,status='active',extra={})=>db.saveCityRecord(guild,{kind,key,data,status,...extra});
  const npcSource=event(db,guild,{key:'npc-source-c18',details:{action:'standard attack'}});
  const entry={intent_ref:'npc-intent-c18',actor:{type:'npc',key:'npc-c18'},operation:'attack',dependencies:[],target_refs:[pc.id],source_ref:npcSource.event_key,source_hash:hash(npcSource.details)};
  const board=save('scene_intent_board','board-c18',{origin:binding,entries:[entry]});
  const request=save('roll_request','request-c18',{owner_user_id:pc.owner_user_id,input:{accepted_intent:'accepted-c18'},scene:binding.scene,session_id:binding.session,kind:'action'},'pending',{source_event:binding.source,subject_key:pc.id});
  const parts=[],writer=createFearReservationWriter({indexWorldEvent:event});let recovery;
  const rules=createPreRollFearRules({sources:{inspectArbitrationOrigin:()=>({binding,scope}),consentAction:()=>({row:{source_event:binding.source,data:{actor:pc.id}},principal:{kind:'owner'}}),historicalActionSource:()=>({}),conversationPrincipal:()=>({kind:'owner',revision:principalRevision}),currentScene:()=>({key:binding.scene,session_id:binding.session}),narrativeSourceVisible:()=>visible},mechanics:{incomingAttackEvidence:()=>true,incomingRollProjection:()=>({}),assertPreRollFearDeathTerminal:(...args)=>recovery.assertPreRollFearDeathTerminal(...args),inspectPvpAttackRequest:()=>{throw Error('PvP not part of this source fixture');},inspectUnrolledInterruptRequest:(_d,_g,r)=>r.status==='pending'&&!r.data.result,validatePcDeathOutcome:(_d,_g,key)=>db.getCityRecord(guild,'death_proof',key)},publication:{revalidateOutputPublication:()=>{validatedParts++;}},writeFearReservation:writer.writeFearReservation});
  recovery=createPreRollFearRecoveryRules({validatePcDeathOutcome:(_d,_g,key)=>db.getCityRecord(guild,'death_proof',key),inspectPreRollFear:rules.inspectPreRollFear,assertPreRollFearAcknowledged:rules.assertPreRollFearAcknowledged,rollArbitratedIncomingAttack:()=>{rollCalls++;return {record_key:'roll-receipt-c18'};},writeFearReservation:writer.writeFearReservation});
  const reserve=()=>rules.reservePreRollFear(db,guild,'origin-c18',board,{npc_intent_ref:entry.intent_ref,request_ref:request.record_key},{intent_ref:entry.intent_ref,disposition:'gm_attack_roll',feature_ref:'standard_attack'});
  function acknowledge(row,status='delivered'){
    const b=row.data.binding,notice=save('native_notice','notice-c18',{kind:'pre_roll_fear',ref:row.record_key,user:b.owner,character:b.character,revision:hash(b)},'pending',{source_event:row.source_event});
    save('pre_roll_fear_publication',`pre-roll-fear-publication:${hash(row.record_key)}`,{turn_id:'turn-c18',kind:'pre_roll_fear',ref:row.record_key,revision:hash(b),user:b.owner,character:b.character,notice:notice.record_key},'pending',{source_event:row.source_event});
    parts.push({id:'part-c18',status,attempt_count:1,payload_hash:'payload-c18',discord_message_id:status==='delivered'?'discord-c18':null,channel_id:'private-channel-c18',visibility:'character',target_character_id:b.character,target_user_id:b.owner});
    save('pvp_output_publication','part-c18',{parts:['output-c18']});save('pvp_output_part','output-c18',{kind:'native_notice',ref:notice.record_key});
  }
  const interaction={id:'gm-interaction-c18',guildId:guild,user:{id:'gm-c18'}},review=key=>recovery.recoverPreRollFear(db,interaction,{op:'pre-roll-fear-review',key},()=>true);
  return {guild,db,pc,scope,binding,board,request,rules,recovery,writer,reserve,save,event,parts,acknowledge,review,interaction,setVisible:v=>visible=v,setPrincipal:v=>principalRevision=v,setFailure:v=>failDebit=v,setIncoming:v=>incoming=v,rolls:()=>rollCalls,verifiedParts:()=>validatedParts,reopen(){sql.close();sql=new DatabaseSync(file);}};
}

test('one existing Fear is reserved with immutable native ancestry, not paid or rolled during planning',t=>{
  const f=fixture(t),row=f.reserve();assert.equal(row.status,'awaiting_announcement');assert.equal(f.db.getCampaign().fear,3);assert.equal(f.rolls(),0);
  assert.equal(inspectFearReservation(f.db,f.guild,row.record_key).binding.base_cost,1);
  f.rules.bindPreRollFearBoard(f.db,f.guild,row);assert.equal(f.rules.preRollFearOpportunity(f.db,f.guild,f.board).key,row.record_key);
  f.reopen();assert.deepEqual(f.reserve(),row);
});
test('acknowledgment requires exact private recipient and source-qualified native notice before debit',t=>{
  const f=fixture(t),row=f.reserve();assert.throws(()=>f.rules.commitPreRollFearCost(f.db,f.guild,row.record_key,row.data.binding.decision),/acknowledged/);
  f.acknowledge(row,'uncertain');assert.throws(()=>f.rules.assertPreRollFearAcknowledged(f.db,f.guild,row.record_key),/acknowledged/);
  f.parts[0].status='delivered';f.parts[0].discord_message_id='discord-c18';f.parts[0].target_user_id='someone-else';assert.throws(()=>f.rules.assertPreRollFearAcknowledged(f.db,f.guild,row.record_key),/acknowledged/);
  f.parts[0].target_user_id=f.pc.owner_user_id;assert.equal(f.rules.assertPreRollFearAcknowledged(f.db,f.guild,row.record_key).row.status,'awaiting_announcement');assert.equal(f.verifiedParts(),1);
  const cost=f.db.transaction(()=>f.rules.commitPreRollFearCost(f.db,f.guild,row.record_key,row.data.binding.decision));assert.deepEqual(cost,{before:3,after:2});
  assert.throws(()=>f.rules.commitPreRollFearCost(f.db,f.guild,row.record_key,row.data.binding.decision),/unused native spotlight/);assert.equal(f.db.getCampaign().fear,2);
});
test('outer native transaction rolls reservation transition back when exact debit fails',t=>{
  const f=fixture(t),row=f.reserve();f.acknowledge(row);f.setFailure(true);
  assert.throws(()=>f.db.transaction(()=>f.rules.commitPreRollFearCost(f.db,f.guild,row.record_key,row.data.binding.decision)),/injected debit failure/);
  assert.equal(inspectFearReservation(f.db,f.guild,row.record_key).row.status,'awaiting_announcement');assert.equal(f.db.getCampaign().fear,3);
  assert.equal(f.db.getWorldEvent(f.guild,`${row.record_key}:state:executing`),null);
});
test('candidate filtering and current inspection reject invisible or stale request, source and owner',t=>{
  const f=fixture(t);assert.equal(f.rules.preRollFearCandidates(f.db,f.guild,'origin-c18').length,1);
  f.setVisible(false);assert.equal(f.rules.preRollFearCandidates(f.db,f.guild,'origin-c18').length,0);assert.throws(f.reserve,/audience required/);f.setVisible(true);
  const row=f.reserve();f.setPrincipal('changed');assert.throws(()=>f.rules.inspectPreRollFear(f.db,f.guild,row.record_key),/owner, source or scene/);f.setPrincipal('r1');
  f.db.saveCityRecord(f.guild,{...f.request,data:{...f.request.data,changed:true}});assert.throws(()=>f.rules.inspectPreRollFear(f.db,f.guild,row.record_key),/snapshot changed/);
  f.db.saveCityRecord(f.guild,f.request);f.event(null,null,{key:'npc-source-c18',status:'revoked',details:{action:'standard attack'}});assert.throws(()=>f.rules.inspectPreRollFear(f.db,f.guild,row.record_key),/NPC source revoked/);
});
test('ordinary cancellation only releases unused unsent permission and replay does not refund Fear',t=>{
  const f=fixture(t),row=f.reserve();assert.throws(()=>f.rules.assertPreRollFearRollAllowed(f.db,f.guild,f.request),/stays unrolled/);
  const done=f.rules.cancelPreRollFear(f.db,f.guild,'origin-c18',row.record_key);assert.equal(done.status,'cancelled');assert.equal(f.db.getCampaign().fear,3);
  assert.doesNotThrow(()=>f.rules.assertPreRollFearRollAllowed(f.db,f.guild,f.request));assert.deepEqual(f.rules.cancelPreRollFear(f.db,f.guild,'origin-c18',row.record_key),done);
});
test('reviewed recovery distinguishes uncertain, acknowledged but unused, and committed interruption',t=>{
  const f=fixture(t),row=f.reserve();f.acknowledge(row,'uncertain');let review=f.review(row.record_key);assert.equal(review.can_cancel,false);assert.equal(review.delivery_review_required,true);
  const cancel=r=>f.recovery.recoverPreRollFear(f.db,f.interaction,{op:'pre-roll-fear-cancel',key:row.record_key,expected_revision:r,reason:'Withdraw unused spotlight.'},()=>true);
  assert.throws(()=>cancel(review.revision),/uncertain or active delivery/);
  f.parts[0].status='delivered';f.parts[0].discord_message_id='discord-c18';review=f.review(row.record_key);assert.equal(review.can_cancel,true);
  assert.throws(()=>cancel('stale'),/revision changed/);assert.equal(cancel(review.revision).status,'cancelled');
  f.reopen();assert.equal(cancel('old').status,'cancelled');assert.equal(f.db.getCampaign().fear,3);assert.equal(f.rolls(),0);
});
test('authenticated GM recovery cannot resume cancelled permission or reverse committed effects',t=>{
  const f=fixture(t),row=f.reserve();assert.throws(()=>f.recovery.recoverPreRollFear(f.db,f.interaction,{op:'pre-roll-fear-review',key:row.record_key},()=>false),/authenticated GM/);
  f.acknowledge(row);f.db.transaction(()=>f.rules.commitPreRollFearCost(f.db,f.guild,row.record_key,row.data.binding.decision));const review=f.review(row.record_key);assert.equal(review.effect_committed,true);assert.equal(review.can_cancel,false);
  assert.throws(()=>f.recovery.recoverPreRollFear(f.db,f.interaction,{op:'pre-roll-fear-cancel',key:row.record_key,expected_revision:review.revision,reason:'Cannot refund'},()=>true),/cannot be cancelled/);assert.equal(f.db.getCampaign().fear,2);
});
test('settlement preserves dead PC agency and emits review without changing original owner action',t=>{
  const f=fixture(t),row=f.reserve();f.acknowledge(row);f.db.transaction(()=>f.rules.commitPreRollFearCost(f.db,f.guild,row.record_key,row.data.binding.decision));
  const attack=f.save('pc_incoming_attack','incoming-c18',{offer:{input:{ruling:`ai-decision:${row.data.binding.decision}`,npc:'npc-c18'}}},'resolved',{subject_key:f.pc.id});
  f.save('gm_arbitration_decision',row.data.binding.decision,{native:{opportunity:{pre_roll_fear:row.record_key}}});
  f.save('pc_effect_receipt','incoming-c18:damage',{after:{hp:{current:6,max:6}}},'resolved');
  assert.equal(f.rules.settlePreRollFearForIncoming(f.db,f.guild,attack.record_key).status,'executing');
  f.save('pc_death_move_request','incoming-c18:death',{},'resolved');f.save('death_proof','incoming-c18:death:outcome',{result:'dead'},'resolved',{subject_key:f.pc.id,source_event:'death-source-c18'});
  const done=f.rules.settlePreRollFearForIncoming(f.db,f.guild,attack.record_key);assert.equal(done.status,'completed');assert.equal(f.db.getCityRecord(f.guild,'pre_roll_fear_action_review',`${row.record_key}:action-review`).status,'needs_review');
  assert.deepEqual(f.db.getCityRecord(f.guild,'roll_request',f.request.record_key),f.request);assert.equal(f.db.getCampaign().fear,2);
  assert.deepEqual(f.rules.settlePreRollFearForIncoming(f.db,f.guild,attack.record_key),done);
});
test('death terminal guard requires exact affected owner native outcome',t=>{
  const f=fixture(t),attack={record_key:'incoming-c18',subject_key:f.pc.id};f.save('pc_effect_receipt','incoming-c18:damage',{after:{hp:{current:6,max:6}}});
  assert.throws(()=>f.recovery.assertPreRollFearDeathTerminal(f.db,f.guild,attack),/death move remains pending/);
  f.save('pc_death_move_request','incoming-c18:death',{},'resolved');f.save('death_proof','incoming-c18:death:outcome',{},'resolved',{subject_key:'other-pc'});
  assert.throws(()=>f.recovery.assertPreRollFearDeathTerminal(f.db,f.guild,attack),/not terminal/);
});
test('all actual Fear providers cold-import with unchanged APIs',async()=>{
  const a=await import('../../src/pre-roll-fear.js'),b=await import('../../src/pre-roll-fear-recovery.js'),c=await import('../../src/fear-reservations.js');
  assert.equal(typeof a.commitPreRollFearCost,'function');assert.equal(typeof a.reservePreRollFear,'function');assert.equal(typeof b.recoverPreRollFear,'function');assert.equal(typeof c.writeFearReservation,'function');assert.equal(c.fearReservationHash('c18'),hash('c18'));
});
