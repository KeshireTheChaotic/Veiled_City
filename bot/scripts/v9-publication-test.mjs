/** V9-05: delivery certainty is separate from committed game effects. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PermissionFlagsBits} from 'discord.js';
import {VeiledDB} from '../src/db.js';
import {queueTurnPublications,deliverTurnOutbox,reconcilePublication,notSent} from '../src/publication-outbox.js';
import {postPlayMessage,sendPlayerPrivate} from '../src/publishing.js';
import {captureDeclaration} from '../src/player-language.js';
import {prepareRollRequest,publishRollAmendment} from '../src/roll-requests.js';
import {configureCityFlags,cityContext} from '../src/city-core.js';
import {contributeRoll} from '../src/roll-collaboration.js';
import {rollRevision} from '../src/roll-requests.js';
import {publishRollPartyDisclosure} from '../src/roll-sharing.js';
import {nativeFixture,pvpTerms} from './v9-fixtures.mjs';
import {materializeNativeNotices,publishPvpNotices,resyncNativeNotice} from '../src/native-publications.js';
import {renderNativeNotice,noticeHash} from '../src/native-notice.js';
import {currentScene,recordScenePresence} from '../src/scene-continuity.js';
import {indexWorldEvent} from '../src/city-calendar.js';
import {proposePvp,reviewPvp,respondPvp,choosePvp,rollPvp,progressPvp,authorPvpNarrative,reviewPvpNarrative,sharePvpNarrative} from '../src/narrative-pvp.js';
import {handleCommand} from '../src/commands.js';
import {prepareAuthorizedTurnOutput} from '../src/pvp-output.js';

function fixture(t,text='Native receipt notice'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vc-v9-publish-'));
  const db=new VeiledDB(path.join(dir,'test.sqlite'),path.resolve('sql/schema.sql'));
  t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
  db.ensureCampaign('g');db.configureCampaign('g',{playChannelId:'play'});
  const session=db.startSession('g','Transport fixture');db.upsertPlayer('g','observer','Observer');
  const pc=db.createCharacter('g','observer','Observer',{location:'terminal'});
  db.updateCharacterData(pc.id,data=>{data.location='terminal';});
  db.assignCharacter(session.id,'observer',pc.id);db.setPresence(session.id,'observer','present');
  db.setSimulationEntity('g','location','terminal',{name:'Terminal'});
  db.upsertNpcProfile('g',{npcKey:'announcer',displayName:'Announcer'});
  db.setSimulationEntity('g','npc','announcer',{location_key:'terminal',visibility:'party'});
  const nativeResult=body=>{
    const scene=currentScene(db,'g'),beats=[];
    for(let offset=0;offset<body.length;offset+=1200){
      const quote=body.slice(offset,offset+1200),key=`transport-${offset}-${Buffer.from(body).toString('hex').slice(0,40)}-${body.length}`;
      const source=indexWorldEvent(db,'g',{key,kind:'observation',source_id:'human_gm',title:'Synthetic publicly recorded NPC words',
        visibility:'party',truth_status:'observed',session_id:session.id,scene:scene.key,location_key:'terminal',
        details:{npc_key:'announcer',quote}},'offline-gm');
      db.upsertNpcKnowledge('g',{npcKey:'announcer',knowledgeKey:key,content:quote,sourceRef:source.event_key,beliefState:'known'});
      beats.push({op:'quote',source_ref:source.event_key,knowledge_key:key,source_span:quote});
    }
    const result={narration:'Unverified fixture draft',gm_world_parts:[{version:2,kind:'npc_composition',entity_key:'announcer',tone:'plain',beats}]};
    prepareAuthorizedTurnOutput(db,'g',result,{mode:'party'});return result;
  };
  const turn=db.beginTurnAttempt({guildId:'g',sessionId:session.id,messageId:'m',actorPrincipal:'u',audience:'party'});
  queueTurnPublications(db,{guild:{id:'g'},session,scope:{mode:'party'},turnId:turn.turn_id,result:nativeResult(text)});
  return {db,turn:turn.turn_id,session,nativeResult};
}
test('P01 successful party send returns explicit acknowledged IDs',async t=>{
  const {db,turn}=fixture(t);const guild={id:'g',channels:{fetch:async()=>({id:'play',isTextBased:()=>true,send:async()=>({id:'msg',channelId:'play'})})}};
  const publication=db.listTurnPublications('g',turn)[0];
  const r=await postPlayMessage({db,guild,content:publication.payload,publication});
  assert.equal(r.ok,true);assert.equal(r.messageId,'msg');assert.equal(r.channelId,'play');
});
test('P02 ambiguous send never automatically retries or advances dependent chunks',async t=>{
  const {db,turn}=fixture(t,'x'.repeat(4200));let calls=0;
  await deliverTurnOutbox(db,'g',turn,async()=>{calls++;throw new Error('connection lost after send');});
  assert.equal(db.listTurnPublications('g',turn)[0].status,'uncertain');
  await deliverTurnOutbox(db,'g',turn,async()=>{calls++;return {messageId:'later',channelId:'play'};});
  assert.equal(calls,1);
});
test('P03 concurrent callbacks cannot duplicate an in-flight native publication',async t=>{
  const {db,turn}=fixture(t);let calls=0,release;
  const gate=new Promise(r=>release=r);
  const send=async()=>{calls++;await gate;return {messageId:'msg',channelId:'play'};};
  const a=deliverTurnOutbox(db,'g',turn,send);await new Promise(r=>setImmediate(r));
  const b=deliverTurnOutbox(db,'g',turn,send);await new Promise(r=>setImmediate(r));
  const inFlight=db.listTurnPublications('g',turn)[0].status;release();await Promise.all([a,b]);
  assert.equal(inFlight,'delivering');
  assert.equal(calls,1);assert.equal(db.listTurnPublications('g',turn)[0].status,'delivered');
});
test('P04 partial private DM records acknowledged chunks and uncertainty',async t=>{
  const {db}=fixture(t);let calls=0;
  const guild={id:'g',members:{fetch:async()=>({send:async()=>{if(++calls===2)throw Error('lost');return {id:'first',channelId:'dm'};}})}};
  const r=await sendPlayerPrivate({db,guild,userId:'u',content:'x'.repeat(4200)});
  assert.equal(r.ok,false);assert.equal(r.certainty,'uncertain');assert.equal(r.messages[0].messageId,'first');assert.equal(calls,2);
});
test('P05 retry cannot silently change payload under a saved identity',t=>{
  const {db,turn,session,nativeResult}=fixture(t);
  assert.throws(()=>queueTurnPublications(db,{guild:{id:'g'},session,scope:{mode:'party'},turnId:turn,result:nativeResult('different')}),/immutable|identity|payload/i);
});
test('P06 acknowledged send with lost receipt persistence is uncertain, never resent',async t=>{
  const {db,turn}=fixture(t);const update=db.updatePublication.bind(db);let lost=true,calls=0;
  db.updatePublication=(id,data)=>{if(data.status==='delivered'&&lost){lost=false;throw Error('receipt persistence lost');}return update(id,data);};
  await deliverTurnOutbox(db,'g',turn,async()=>{calls++;return {messageId:'actual',channelId:'play'};});
  assert.equal(db.listTurnPublications('g',turn)[0].status,'uncertain');
  await deliverTurnOutbox(db,'g',turn,async()=>{calls++;return {};});assert.equal(calls,1);
});
function requestFixture(t,{long=false}={}){
  const f=fixture(t),{db}=f;configureCityFlags(db,'g',{roll_requests:true,roll_collaboration:true},'gm');
  const s=db.getActiveSession('g');db.upsertPlayer('g','u','Owner');
  const pc=db.createCharacter('g','u','Billy',{traits:{Knowledge:2},resources:{hope:3}});
  db.assignCharacter(s.id,'u',pc.id);db.setPresence(s.id,'u','present');
  const source=captureDeclaration(db,'g','u',pc.id,'roll-source','I try inspecting the terminal.'+(long?' Additional context.'.repeat(190):''));
  const row=prepareRollRequest(db,'g',{source_event:source.event_key,character_id:pc.id,trait:'Knowledge',kind:'action',
    modifier_keys:[],difficulty_source:'',adjudication:'Inspect',operation:'inspect'},'gm');
  return {...f,row,pc,s};
}
test('P07 private roll amendment is durably delivering before callback; lost ack never repeats',async t=>{
  const {db,row}=requestFixture(t);let calls=0;
  await assert.rejects(()=>publishRollAmendment(db,'g',row,async()=>{
    calls++;assert.equal(db.listCityRecords('g',{kind:'roll_publication',includeGM:true})[0].status,'delivering');
    throw Error('connection lost');
  }));
  await assert.rejects(()=>publishRollAmendment(db,'g',row,async()=>{calls++;return {ok:true,messageId:'msg',channelId:'dm'};}));
  assert.equal(calls,1);assert.equal(db.listCityRecords('g',{kind:'roll_publication',includeGM:true})[0].status,'uncertain');
});
test('P08 multi-chunk amendment stores each actual message and never repeats acknowledged chunks',async t=>{
  const {db,row}=requestFixture(t,{long:true});const sent=[];
  await publishRollAmendment(db,'g',row,async(user,text,sid,pc,meta)=>{
    assert(meta?.publication?.id);assert(text.length<=2000);sent.push(text);
    return {ok:true,messageId:`msg-${sent.length}`,channelId:'dm'};
  });
  const receipt=db.listCityRecords('g',{kind:'roll_publication',includeGM:true})[0];
  assert(receipt.data.turn_id);const parts=db.listTurnPublications('g',receipt.data.turn_id);
  assert(parts.length>2);assert(parts.every(p=>p.status==='delivered'&&p.discord_message_id));
  await publishRollAmendment(db,'g',row,async()=>assert.fail('duplicate'));
});
test('P09 actual Discord PvP proposal privately notifies both affected owners without consenting',()=>nativeFixture(async f=>{
  const sent=[],replies=[],intent=f.accepted();
  const guild={id:f.guild,members:{fetch:async user=>({send:async content=>{sent.push({user,content});return {id:`dm-${sent.length}`,channelId:`dm-${user}`};}})}};
  const i={id:'proposal-interaction',guildId:f.guild,guild,user:{id:f.pcs[0].owner_user_id,username:'Jaxon'},
    commandName:'vc-roll',isChatInputCommand:()=>true,options:{getSubcommand:()=> 'pvp',getString:()=>JSON.stringify({op:'propose',
      accepted_intent:intent.record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs)})},
    reply:async p=>replies.push(p),followUp:async p=>replies.push(p)};
  await handleCommand(i,{db:f.db,gm:{}});
  assert.deepEqual(new Set(sent.map(s=>s.user)),new Set(f.pcs.slice(0,2).map(p=>p.owner_user_id)));
  assert(sent.every(s=>s.content.length<=2000));
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_consent',includeGM:true}).length,0);
  assert.equal(f.db.listCityRecords(f.guild,{kind:'pvp_terms_review',includeGM:true}).length,1,'only initiating explicit review, not notification, records seen');
  const before=sent.length;await handleCommand(i,{db:f.db,gm:{}});assert.equal(sent.length,before);
}));
test('P10 unknown private-channel failure cannot fall back to DM after any send attempt',async t=>{
  const {db}=fixture(t);db.upsertPlayer('g','u','Owner');db.setPrivateChannel('g','u','private');let calls=0,dms=0;
  const guild={id:'g',channels:{fetch:async()=>({id:'private',isTextBased:()=>true,send:async()=>{
    if(++calls===2)throw Error('lost private ack');return {id:'first',channelId:'private'};
  }})},members:{fetch:async()=>{dms++;throw Error('should not fetch DM');}}};
  const r=await sendPlayerPrivate({db,guild,userId:'u',content:'x'.repeat(4200)});
  assert.equal(r.certainty,'uncertain');assert.equal(dms,0);assert.equal(r.messages.length,1);
});
test('P11 reviewed per-part recovery verifies exact message or explicit absence, never forces a retry',async t=>{
  const {db,turn}=fixture(t);await deliverTurnOutbox(db,'g',turn,async()=>{throw Error('unknown');});
  const row=db.listTurnPublications('g',turn)[0];
  await assert.rejects(()=>reconcilePublication(db,'g',row.id,{actor:'u',decision:'confirmed_not_sent',reason:'x'}),/GM/);
  await assert.rejects(()=>reconcilePublication(db,'g',row.id,{actor:'gm',gm:true,decision:'delivered',reason:'x',
    message:{id:'fake',channelId:'play',content:'wrong',author:{bot:true,id:'bot'},verifiedBotId:'bot'}}),/verify/i);
  await reconcilePublication(db,'g',row.id,{actor:'gm',gm:true,decision:'delivered',reason:'Fetched exact bot message',
    message:{id:'actual',channelId:'play',content:row.payload,author:{bot:true,id:'bot'},verifiedBotId:'bot'}});
  await deliverTurnOutbox(db,'g',turn,async()=>assert.fail('already delivered'));
  assert.equal(db.getPublication('g',row.id).discord_message_id,'actual');
});
test('P12 independently acknowledged private chunks survive partial failure/retry and exact current-owner checks',async t=>{
  const {db,row,pc}=requestFixture(t,{long:true});const sent=[];let fail=true;
  const send=async(u,text,sid,char,meta)=>{
    const part=meta.publication;if(part.ordinal===1&&fail){fail=false;throw notSent('before network');}
    sent.push(part.ordinal);return {ok:true,messageId:`part-${part.ordinal}`,channelId:'dm'};
  };
  await assert.rejects(()=>publishRollAmendment(db,'g',row,send),/recovery/);
  await publishRollAmendment(db,'g',row,send);assert.equal(sent.filter(n=>n===0).length,1);
  assert.equal(new Set(sent).size,sent.length);
  const receipt=db.listCityRecords('g',{kind:'roll_publication',includeGM:true})[0];
  const part=db.listTurnPublications('g',receipt.data.turn_id)[0];db.updatePublication(part.id,{status:'uncertain'});
  db.setPresence(db.getActiveSession('g').id,'u','absent');
  await assert.rejects(()=>reconcilePublication(db,'g',part.id,{actor:'gm',gm:true,decision:'confirmed_not_sent',reason:'review'}));
  assert.equal(db.getPublication('g',part.id).status,'uncertain');assert.equal(db.getCharacter(pc.id).data.resources.hope,3);
});
test('P13 actual native party-share ack loss is held and never rerolls or repeats resources',async t=>{
  const {db,row,pc}=requestFixture(t);let q=contributeRoll(db,'g','u',{op:'roll',request:row.record_key,expected_revision:rollRevision(row),key:'roll'},{rng:()=>6});
  q=contributeRoll(db,'g','u',{op:'share',request:q.record_key,expected_revision:rollRevision(q),key:'share',scope:'party',confirm:true});
  const before=db.getCharacter(pc.id).data.resources;let sends=0;
  await assert.rejects(()=>publishRollPartyDisclosure(db,'g',q,async()=>{
    sends++;assert.equal(db.listCityRecords('g',{kind:'roll_party_publication',includeGM:true})[0].status,'delivering');throw Error('lost ack');
  }));
  await assert.rejects(()=>publishRollPartyDisclosure(db,'g',q,async()=>{sends++;return {}; }));
  assert.equal(sends,1);assert.deepEqual(db.getCharacter(pc.id).data.resources,before);
});
test('P14 delivery metadata and private native notice cannot enter generic civic memory',async t=>{
  const {db,row}=requestFixture(t);await publishRollAmendment(db,'g',row,async()=>({ok:true,messageId:'msg',channelId:'dm'}));
  const notice=db.listCityRecords('g',{kind:'native_notice',includeGM:true})[0];
  assert(notice);assert(!cityContext(db,'g',notice.record_key).records.some(r=>r.kind==='native_notice'));
});
test('P15 older failed outbox history without non-send proof is held, not silently retried',async t=>{
  const {db,turn}=fixture(t),row=db.listTurnPublications('g',turn)[0];
  db.updatePublication(row.id,{status:'failed',lastFailure:'Old connection failure; delivery outcome unknown'});
  let sends=0;await deliverTurnOutbox(db,'g',turn,async()=>{sends++;return {messageId:'duplicate',channelId:'play'};});
  assert.equal(sends,0);assert.equal(db.getPublication('g',row.id).status,'uncertain');
});
test('P16 a native roll disclosure cannot publish raw cross-PC reactions or unrelated private clauses',async t=>{
  const {db,row}=requestFixture(t),source=db.getWorldEvent('g',row.source_event);
  // The real authenticated declaration is immutable; use a fresh declaration/request, never rewrite the earlier source.
  const authored=captureDeclaration(db,'g','u',row.subject_key,'mixed-source',
    'I try inspecting the terminal. Choso apologizes for losing. My SECRET contact is X.');
  let q=prepareRollRequest(db,'g',{...row.data.input,source_event:authored.event_key},'gm');
  q=contributeRoll(db,'g','u',{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:'mixed-roll'},{rng:()=>6});
  q=contributeRoll(db,'g','u',{op:'share',request:q.record_key,expected_revision:rollRevision(q),key:'mixed-share',scope:'party',confirm:true});
  const sent=[];await publishRollPartyDisclosure(db,'g',q,async text=>{sent.push(text);return {messageId:'native-total',channelId:'play'};});
  assert(!sent.join('').includes('Choso apologizes for losing.'));assert(!sent.join('').includes('SECRET'));
  assert(!JSON.stringify(db.getWorldEvent('g',q.data.party_disclosure.source_event).details).includes('SECRET'));
  assert.match(sent.join(''),/Native total/);assert.equal(db.getWorldEvent('g',source.event_key).details.text,source.details.text);
});
test('P17 response failure after native contribute leaves a durable unsent roll notice',async t=>{
  const {db,row}=requestFixture(t);
  const json={op:'roll',request:row.record_key,expected_revision:rollRevision(row),key:'committed-before-reply'};
  const i={id:'lost-interaction-reply',guildId:'g',guild:{id:'g'},user:{id:'u',username:'Owner'},commandName:'vc-roll',
    isChatInputCommand:()=>true,options:{getSubcommand:()=> 'contribute',getString:()=>JSON.stringify(json)},
    reply:async()=>{throw Object.assign(Error('expired acknowledgment'),{code:10062});}};
  await assert.rejects(()=>handleCommand(i,{db,gm:{}}));
  const q=db.getCityRecord('g','roll_request',row.record_key);assert.equal(q.status,'resolved');
  const publications=db.listCityRecords('g',{kind:'roll_publication',includeGM:true});
  assert(publications.some(p=>p.data.turn_id&&db.listTurnPublications('g',p.data.turn_id).some(r=>r.status==='pending')));
});
test('P18 native result transaction reserves recoverable notification identity before any adapter runs',async t=>{
  const {db,row,pc}=requestFixture(t);
  const q=contributeRoll(db,'g','u',{op:'roll',request:row.record_key,expected_revision:rollRevision(row),key:'native-crash-window'},{rng:()=>6});
  const before=db.getCharacter(pc.id).data.resources;
  const receipts=db.listCityRecords('g',{kind:'roll_publication',includeGM:true});
  assert(receipts.some(p=>p.status==='queued'&&p.data.request===q.record_key));
  await publishRollAmendment(db,'g',q,async()=>({ok:true,messageId:'recovered',channelId:'dm'}));
  assert.deepEqual(db.getCharacter(pc.id).data.resources,before);
});
test('P19 a different real roll with equal totals cannot certify this party disclosure',async t=>{
  const {db,row}=requestFixture(t);
  const roll=q=>contributeRoll(db,'g','u',{op:'roll',request:q.record_key,expected_revision:rollRevision(q),key:`dice-${q.record_key}`},{rng:()=>6});
  let q=roll(row);const s=captureDeclaration(db,'g','u',row.subject_key,'second','I try opening a different case.');
  const other=roll(prepareRollRequest(db,'g',{...row.data.input,source_event:s.event_key},'gm'));
  q=contributeRoll(db,'g','u',{op:'share',request:q.record_key,expected_revision:rollRevision(q),key:'share-proof',scope:'party',confirm:true});
  q=db.saveCityRecord('g',{...q,key:q.record_key,data:{...q.data,roll_id:other.data.roll_id}});let sends=0;
  const scene=currentScene(db,'g');
  assert.throws(()=>renderNativeNotice(db,'g',{kind:'roll_party',ref:q.record_key,revision:noticeHash([q.status,q.data]),session:scene.session_id,scene:scene.key}));
  await assert.rejects(()=>publishRollPartyDisclosure(db,'g',q,async()=>{sends++;return {messageId:'bad',channelId:'play'};}));
  assert.equal(sends,0);
});
test('P20 actual approved PvP clause projection uses party outbox once, never the withheld loser response',()=>nativeFixture(async f=>{
  let p=proposePvp(f.db,f.guild,f.pcs[0].owner_user_id,{accepted_intent:f.accepted().record_key,opponent:f.pcs[1].id,terms:pvpTerms(f.pcs,{audience:'bilateral_author_projection'})});
  for(const pc of f.pcs.slice(0,2)){reviewPvp(f.db,f.guild,pc.owner_user_id,p.record_key);p=respondPvp(f.db,f.guild,pc.owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,decision:'accept',interaction_id:`accept-${pc.id}`});}
  const input=(i,extra={})=>{const v=progressPvp(f.db,f.guild,f.pcs[i].owner_user_id,p.record_key);return {proposal:p.record_key,expected_revision:p.data.terms_hash,round:v.round,expected_window_revision:v.window_revision,interaction_id:`op-${i}-${v.window_revision}`,...extra};};
  for(let i=0;i<2;i++)choosePvp(f.db,f.guild,f.pcs[i].owner_user_id,input(i,{trait:'Agility',attempt:'I try my own feint.'}));
  rollPvp(f.db,f.guild,f.pcs[0].owner_user_id,input(0),{rng:()=>8});
  const r=rollPvp(f.db,f.guild,f.pcs[1].owner_user_id,input(1),{rng:()=>3});
  const n=authorPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{proposal:p.record_key,expected_revision:p.data.terms_hash,
    resolution:r.resolution.receipt,role:'success',subject_character:f.pcs[0].id,text:'I achieve only my agreed success.',template:'stake_success',interaction_id:'author'});
  const op={proposal:p.record_key,narrative:n.record_key,expected_revision:p.data.terms_hash};
  reviewPvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,op);sharePvpNarrative(f.db,f.guild,f.pcs[0].owner_user_id,{...op,interaction_id:'own-share'});
  reviewPvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,op);
  const projection=sharePvpNarrative(f.db,f.guild,f.pcs[1].owner_user_id,{...op,interaction_id:'other-share'});
  const before=f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),sent=[];
  const privateSend=async()=>({ok:true,messageId:'private',channelId:'dm'}),partySend=async(text,sid,meta)=>{assert(meta.publication.id);sent.push(text);return {messageId:'party',channelId:'play'};};
  await publishPvpNotices(f.db,f.guild,p.record_key,privateSend,partySend,{projection:projection.record_key});
  await publishPvpNotices(f.db,f.guild,p.record_key,privateSend,partySend,{projection:projection.record_key});
  assert.equal(sent.length,1);assert.equal(sent[0],projection.data.text);assert(!sent[0].includes('apologizes'));
  assert.deepEqual(f.pcs.map(pc=>f.db.getCharacter(pc.id).data.resources),before);
  materializeNativeNotices(f.db,f.guild); // stale older queued versions are held; not rewritten as current consent.
  const own=f.db.listCityRecords(f.guild,{kind:'pvp_round_receipt',includeGM:true}).find(row=>row.subject_key===f.pcs[0].id);
  f.db.saveCityRecord(f.guild,{...own,key:own.record_key,data:{...own.data,result:{...own.data.result,total:999}}});
  const proposal=f.db.getCityRecord(f.guild,'pvp_proposal',p.record_key),view=progressPvp(f.db,f.guild,f.pcs[0].owner_user_id,p.record_key),scene=currentScene(f.db,f.guild);
  assert.throws(()=>renderNativeNotice(f.db,f.guild,{kind:'pvp_status',ref:p.record_key,revision:noticeHash([proposal.status,proposal.data,view]),
    user:f.pcs[0].owner_user_id,character:f.pcs[0].id,session:scene.session_id,scene:scene.key}));
}));
test('P21 native resync is authenticated, read-only about mechanics, and cannot enlarge a reserved audience',t=>{
  const {db,row,pc}=requestFixture(t),reserved=db.listCityRecords('g',{kind:'roll_publication',includeGM:true})[0];
  assert.throws(()=>resyncNativeNotice(db,'g',reserved.kind,reserved.record_key),/GM/);
  const before=db.getCharacter(pc.id).data.resources;
  const r=resyncNativeNotice(db,'g',reserved.kind,reserved.record_key,{gm:true,actor:'gm'});
  assert(r.data.turn_id);assert(db.listTurnPublications('g',r.data.turn_id).every(p=>p.target_user_id==='u'&&p.target_character_id===pc.id&&p.status==='pending'));
  assert.equal(db.getCityRecord('g','roll_request',row.record_key).status,row.status);
  assert.deepEqual(db.getCharacter(pc.id).data.resources,before);
});
test('P22 changed disclosure request scope cannot keep authorizing another character to read the attempt',t=>{
  const {db,row,pc,s}=requestFixture(t);configureCityFlags(db,'g',{scene_continuity:true},'gm');db.upsertPlayer('g','helper','Helper');
  const helper=db.createCharacter('g','helper','Helper',{traits:{Strength:1},resources:{hope:2}});
  db.assignCharacter(s.id,'helper',helper.id);db.setPresence(s.id,'helper','present');db.setSimulationEntity('g','location','room',{});
  indexWorldEvent(db,'g',{key:'scene',kind:'arrival',title:'Shared room',source_id:'gm',visibility:'party',location_key:'room'},'gm');
  for(const who of [pc,helper])recordScenePresence(db,'g',{entity_type:'character',entity_key:who.id,location_key:'room',source_event:'scene',accepted_by:who.owner_user_id,visibility:'party'},'gm');
  const q=contributeRoll(db,'g','u',{op:'disclose',request:row.record_key,expected_revision:rollRevision(row),key:'disclose',character_id:helper.id});
  const scene=currentScene(db,'g'),notice={kind:'roll_private',ref:q.record_key,revision:noticeHash([q.status,q.data]),
    user:'helper',character:helper.id,session:s.id,scene:scene.key};
  assert.match(renderNativeNotice(db,'g',notice),/Owner-shared attempt/);
  const source=db.getWorldEvent('g',q.data.disclosures[0].source_event);
  db.saveWorldEvent('g',{...source,key:source.event_key,details:{...source.details,request:'different-request'}});
  assert.throws(()=>renderNativeNotice(db,'g',notice));
});

test('P23 private channel permission changes between chunks stop delivery without a DM replay',async t=>{
  const {db}=requestFixture(t);db.setPrivateChannel('g','u','private');let exposed=false,sends=0,dms=0;
  const channel={id:'private',isTextBased:()=>true,
    permissionsFor:subject=>({has:flag=>subject.id==='everyone'&&flag===PermissionFlagsBits.ViewChannel&&exposed}),
    send:async()=>{sends++;exposed=true;return {id:'first',channelId:'private'};}};
  const guild={id:'g',roles:{everyone:{id:'everyone'},cache:new Map()},channels:{fetch:async()=>channel},
    members:{cache:new Map(),fetch:async()=>{dms++;return {send:async()=>assert.fail('private fallback replay')};}}};
  const result=await sendPlayerPrivate({db,guild,userId:'u',content:'x'.repeat(4200)});
  assert.equal(sends,1);assert.equal(dms,0);assert.equal(result.ok,false);
  assert.equal(result.certainty,'uncertain');assert.deepEqual(result.messages,[{messageId:'first',channelId:'private'}]);
});
