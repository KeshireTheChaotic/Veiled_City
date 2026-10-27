import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {GMService} from '../../src/gm.js';
import {applyAuthoritativeMutation} from '../../src/state.js';
import {queueDirectorPublications,deliverTurnOutbox,notSent,reconcilePublication} from '../../src/publication-outbox.js';
import {nativeDirectorNarrativeSource} from '../../src/narrative-director-source.js';

async function acceptedWriterTurn(){
  const f=createP07NativeFixture();
  for(const [i,pc] of f.pcs.entries())f.acceptSpeech(i?'owner-b':'owner-a',pc,`f24-${i}`,
    i?'The station needs repairs.':'The pump is still humming.');
  const director={act:true,public_narration:'',narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],simulation_updates:[],gm_notes:'A quiet but relevant change deserves a grounded response.',confidence:100};
  let providerCalls=0,writerPacket=null;
  const ai={responses:{create:async request=>{
    providerCalls++;
    if(request.text?.format?.name==='world_director_manual')return {output_text:JSON.stringify(director),usage:{}};
    if(request.text?.format?.name==='veiled_city_delegated_narrative_v9'){
      writerPacket=JSON.parse(request.input);
      const task=writerPacket.audience_v9?.task_ids?.[0];
      assert.ok(task,'writer response must answer a server-minted native task');
      return {output_text:JSON.stringify({version:9,acts:[{id:'station-scene',task_id:task,kind:'scene_description',speaker_key:'',
        location_key:'p07-station',text:'Amber light settles over the old station pump, steady enough to make its faint vibration audible.',source_refs:[]}],fiction_delta:[]}),usage:{}};
    }
    throw new Error(`Unexpected provider operation: ${request.text?.format?.name||'untyped'}`);
  }}};
  const service=new GMService({db:f.db,config:{gmModel:'offline-p07',narrativeModel:'offline-p07-writer',gmTurnDeadlineMs:10000,
    structuredRetryMaxTokens:6000,maxContentChunks:0,maxRecentMessages:10,openaiMaxRetries:0},
    content:{root:'',read:()=>'',search:()=>[]},ai});
  try{
    const result=await service.runWorldDirector({guildId:f.guild,layer:'manual',trigger:{scope:'party',reason:'offline acceptance'}});
    assert.equal(providerCalls,2,'one Director request and one existing writer request; no extra model call');
    assert.ok(nativeDirectorNarrativeSource(result));
    assert.equal(writerPacket.director_brief.world_bridge.beats.length,2,'writer sees both currently entitled optional hints');
    assert.ok(writerPacket.director_brief.world_bridge.beats.every(beat=>beat.kind==='pacing_hint'));
    const mutation=applyAuthoritativeMutation(f.db,{guildId:f.guild,sessionId:f.session.id,narrative:result,scope:f.scope,
      source:'world_director_manual',provenance:{actorType:'ai',actorId:'world_director'}});
    assert.ok(mutation);
    const units=f.db.listCityRecords(f.guild,{kind:'narrative_unit',includeGM:true,limit:20})
      .filter(row=>row.status==='accepted_established'&&row.data.binding.source===nativeDirectorNarrativeSource(result));
    assert.equal(units.length,1,'the generated scene act passes native writer validation and is established');
    assert.equal(result.narration,units[0].data.text,'published surface is rendered from accepted native unit output');
    assert.match(result.narration,/Amber light settles/);
    assert.doesNotMatch(result.narration,/\b(?:you|your)\b|\b(?:takes? \d+ damage|spends Hope|spends Fear)\b/i,
      'generated camera fiction leaves PC decisions and mechanics open');
    return {f,result,providerCalls:()=>providerCalls};
  }catch(error){f.close();throw error;}
}

async function queue(f,result,key){
  const turnId=queueDirectorPublications(f.db,{guild:{id:f.guild},session:{id:f.session.id},result,scope:f.scope,key});
  const rows=f.db.listTurnPublications(f.guild,turnId);
  assert.equal(rows.length,1,'one bounded scene output yields one persisted publication chunk');
  return {turnId,row:rows[0]};
}

test('accepted writer output reaches durable outbox; uncertain send waits for exact acknowledgement reconciliation',async()=>{
  const {f,result,providerCalls}=await acceptedWriterTurn();
  try{
    const {turnId,row}=await queue(f,result,'f24-uncertain-cycle'),payload=row.payload;
    f.reopen(); // Crash/restart boundary after commit, before transport acknowledgement.
    let sends=0;
    const uncertain=await deliverTurnOutbox(f.db,f.guild,turnId,async()=>{
      sends++;
      throw new Error('Mock Discord accepted the message but the acknowledgement was lost.');
    });
    assert.equal(uncertain[0].row.status,'uncertain');
    const message={id:'mock-discord-message-24',channelId:(row.channel_id||'mock-discord-channel'),author:{id:'mock-bot',bot:true},
      verifiedBotId:'mock-bot',content:payload};
    await deliverTurnOutbox(f.db,f.guild,turnId,async()=>{sends++;return {messageId:'must-not-send',channelId:(row.channel_id||'mock-discord-channel')};});
    assert.equal(sends,1,'an uncertain row is not automatically resent after restart');
    assert.equal(f.db.getPublication(f.guild,row.id).status,'uncertain');
    await reconcilePublication(f.db,f.guild,row.id,{actor:'offline-gm-review',gm:true,decision:'delivered',
      reason:'Mock lookup verifies the exact bot-authored message and destination.',message});
    assert.equal(f.db.getPublication(f.guild,row.id).status,'delivered');
    await deliverTurnOutbox(f.db,f.guild,turnId,async()=>{sends++;return {messageId:'duplicate',channelId:(row.channel_id||'mock-discord-channel')};});
    assert.equal(sends,1,'verified delivered receipt is exactly once across repeated delivery reads');
    assert.equal(providerCalls(),2,'delivery and recovery never rerun Director or writer generation');
  } finally {f.close();}
});

test('a known not-sent transport failure may retry, then successful delivery is idempotent',async()=>{
  const {f,result,providerCalls}=await acceptedWriterTurn();
  try{
    const {turnId,row}=await queue(f,result,'f24-not-sent-cycle');let sends=0;
    const failed=await deliverTurnOutbox(f.db,f.guild,turnId,async()=>{sends++;throw notSent('Mock transport confirms it did not send.');});
    assert.equal(failed[0].row.status,'failed');
    const retried=await deliverTurnOutbox(f.db,f.guild,turnId,async()=>{
      sends++;return {messageId:'mock-discord-retry',channelId:(row.channel_id||'mock-discord-channel')};
    });
    assert.equal(retried[0].row.status,'delivered');
    await deliverTurnOutbox(f.db,f.guild,turnId,async()=>{sends++;return {messageId:'duplicate',channelId:(row.channel_id||'mock-discord-channel')};});
    assert.equal(sends,2,'only the proven unsent attempt and one accepted retry reached transport');
    assert.equal(providerCalls(),2,'the outbox retry does not rerun model or mechanics');
    assert.equal(f.db.getPublication(f.guild,row.id).discord_message_id,'mock-discord-retry');
  } finally {f.close();}
});
