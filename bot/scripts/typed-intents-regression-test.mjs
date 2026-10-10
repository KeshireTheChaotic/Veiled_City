/** Offline release contract: unrestricted verbs, typed origins, memory tiers and safe GM preview/commit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VeiledDB } from '../src/db.js';
import { GMService } from '../src/gm.js';
import { ContentIndex } from '../src/content.js';
import { captureWorldInput } from '../src/autonomous-world.js';
import { commitGmTurn } from '../src/turn-orchestration.js';
import { validatePlayerIntents } from '../src/typed-intents.js';
import { tierWorldAdditions } from '../src/entity-memory.js';
import { POST_TURN_REVIEW_CATEGORIES } from '../src/director.js';
import { FakeResponses } from './contract-fixtures.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vc-typed-intents-'));
const db=new VeiledDB(path.join(temp,'fixture.sqlite'),path.resolve('sql/schema.sql'));
const guild='typed-intent-fixture';
try{
  db.ensureCampaign(guild);
  const session=db.startSession(guild,'Semantic actions');
  db.upsertPlayer(guild,'player','Player');
  const pc=db.createCharacter(guild,'player','Tyrell',{});
  db.assignCharacter(session.id,'player',pc.id);
  db.setPresence(session.id,'player','present');
  const actor=db.controlledAssignment(session.id,'player');
  const emptyReview=()=>{
    const r=Object.fromEntries(POST_TURN_REVIEW_CATEGORIES.map(x=>[x,{decision:'no_change',reason:'No other effects',confidence:90}]));
    r.scene={decision:'continue',label:'',reason:'Same story scene'};
    return r;
  };
  const common={respond:true,narration:'',world_additions:[],scene_actions:[],world_conflicts:[],narrative_interpretation:null,
    player_intents:[],authored_candidates:null,narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
    npc_memories:[],npc_knowledge:[],npc_goals:[],canon_proposals:[],simulation_updates:[],ai_intents:[],decision_advisory:null,
    state_review:emptyReview()};
  const config={openaiApiKey:'offline-dummy',maxRecentMessages:20,maxContentChunks:2,gmModel:'fixture',
    routineGmModel:'fixture',routerModel:'fixture',contextInputBudget:100000,gmTurnDeadlineMs:15000,
    aiOperationDeadlineMs:15000};
  const gm=new GMService({db,content:new ContentIndex(path.resolve('../content')),config,ai:new FakeResponses([])});
  const move=async (id,message,key,name,destination='exterior')=>{
    const intent={type:'move',source_span:message,target_name:name,target_key:key,destination,
      operation:'',utterance:'',excluded_targets:[],framing:'immediate',resolution:'auto',reason:'Ordinary accessible movement'};
    const turn={...common,narration:`${pc.name} reaches ${name} outside.`,player_intents:[intent],
      world_additions:[{kind:'location',key,name,summary:'A public, open neighborhood storefront.',parent_location_key:id==='dash'?'': 'twenty-four-spin',visibility:'party'}],
      state_review:emptyReview()};
    captureWorldInput(db,guild,'player',pc.id,id,message);
    gm.ai=new FakeResponses([turn]);
    const result=await gm.runTurn({guildId:guild,actorUserId:'player',actorName:pc.name,messageText:message,
      actorAssignment:actor,messageId:id});
    assert(result.scene_actions.some(action=>action.kind==='move'&&action.source_span===message&&action.entity_ref===key));
    assert.equal(db.getCharacter(pc.id).data.location||null,id==='dash'?null:'twenty-four-spin',
      'Preview must not commit scene arrival');
    const applied=commitGmTurn({db,guild:{id:guild},session,result,scope:{mode:'party',actorUserId:'player',actorCharacterId:pc.id},
      speaker:pc.name,label:'Typed fixture',meta:{messageId:id}});
    assert(applied.world.some(x=>x.status==='arrived'));
    assert.equal(db.getCharacter(pc.id).data.location,key);
  };
  await move('dash','I bolt from the shadows towards the Twenty-Four Spin.','twenty-four-spin','Twenty-Four Spin');
  await move('shop','I rush into the Night Owl Copy & Parcel.','night-owl-copy-parcel','Night Owl Copy & Parcel','interior');
  assert.equal(db.getSimulationEntity(guild,'location','night-owl-copy-parcel')?.state?.name,'Night Owl Copy & Parcel');
  assert.throws(()=>validatePlayerIntents([{type:'move',source_span:'I arrive.',target_key:'',target_name:'',
    destination:'interior',operation:'',utterance:'',excluded_targets:[],framing:'conditional',resolution:'auto',reason:''}],
    'I arrive.'),/Non-immediate/);
  const incidental={narration:'The rain forms ripples in the gutters.',player_intents:[],scene_actions:[],world_additions:[
    {kind:'location',key:'unused-gutter',name:'Unused Gutter',summary:'Texture only.'}]};
  assert.equal(tierWorldAdditions(incidental,'I look at the rain.').ephemeral.length,1);
  assert.deepEqual(incidental.world_additions,[]);
  const named={narration:'A lit sign says Willow Street Pharmacy.',player_intents:[],scene_actions:[],world_additions:[
    {kind:'location',key:'willow-street-pharmacy',name:'Willow Street Pharmacy',summary:'Open all night.'}]};
  assert.equal(tierWorldAdditions(named,'Where is the nearest pharmacy?').durable.length,1);
  console.log('Typed semantic GM PASS: bolt/rush no verb whitelist, native arrival after preview, source scope, ephemeral/durable memory.');
}finally{
  db.close();fs.rmSync(temp,{recursive:true,force:true});
}
