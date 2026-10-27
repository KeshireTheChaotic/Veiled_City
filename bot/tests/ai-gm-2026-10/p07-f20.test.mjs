import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {authorNarrativeRequests,establishNarrativeUnits} from '../../src/narrative-authority.js';
import {bindDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {worldDirectorBridgeBeats} from '../../src/world-narrative-bridge.js';
import {worldInputKey} from '../../src/autonomous-world.js';
import {captureWorldInput} from '../../src/autonomous-world.js';
import {captureAuthoredTurnEnvelope} from '../../src/authored-turn-envelope.js';

async function establishedUnits(f,count,sourceRef){
  if(!count){const current=f.makeDirector();return {rows:[],source:current.source};}
  const scope={...f.scope,actorUserId:'owner-a',actorCharacterId:f.pcs[0].id},
    input={version:8,kind:'narrative_request',operation:'describe_scene',source_refs:[]};
  const narrative_units=Array.from({length:count},(_,i)=>({id:`unit-${i}`,kind:'scene',text:`The station's old indicator settles on amber ${i}.`,
    subject_key:'',location_key:'p07-station',visibility:'party',epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}));
  const result={gm_world_parts:[input]};
  await authorNarrativeRequests({db:f.db,guild:f.guild,result,scope,sourceRef,budget:{used:false},
    generate:async()=>({fiction_delta:[],narrative_units})});
  const rows=establishNarrativeUnits(f.db,f.guild,input,scope,sourceRef);
  assert.equal(rows.length,count,'each counted beat must have a real accepted native narrative unit');
  const directorSourceRef=bindDirectorNarrativeSource(f.db,f.guild,{act:false},f.scope,'manual',
    {scope:'party',event_refs:rows.map(row=>row.source_event)},null);
  return {rows,source:f.db.getWorldEvent(f.guild,directorSourceRef)};
}

test('native Director beat cap reports only validated established candidates omitted at capacities 0, 1, 3 and 4',async()=>{
  for(const capacity of [0,1,3,4]){
    const f=createP07NativeFixture();
    try{
      const authored=[];
      for(const [i,pc] of f.pcs.entries()){
        const messageId=`f20-${capacity}-${i}`;
        authored.push(f.acceptSpeech(i?'owner-b':'owner-a',pc,messageId,i?'The station needs repairs.':'The pump is still humming.'));
      }
      const sourceRef=worldInputKey(`f20-${capacity}-0`,f.pcs[0].id),
        {rows,source}=await establishedUnits(f,capacity,sourceRef);
      const projection=worldDirectorBridgeBeats(f.db,f.guild,source,f.scope);
      assert.equal(projection.beats.length,Math.min(4,capacity+2),`capacity ${capacity}: preserve established beats and use only remaining optional room`);
      assert.equal(projection.omitted,Math.max(0,capacity+2-4),`capacity ${capacity}: count only valid candidates omitted by the cap`);
      assert.equal(projection.held,0);
      assert.equal(rows.length,capacity);
      assert.deepEqual(projection.beats.slice(0,capacity).map(beat=>beat.kind),Array(capacity).fill('established_world_change'));
      assert.ok(projection.beats.every(beat=>beat.execution_authority===false&&beat.publication_authority===false));
    } finally {f.close();}
  }
});

test('eight valid source-bound scene proofs fill four beats and report four valid omissions',async()=>{
  const f=createP07NativeFixture();
  try{
    captureWorldInput(f.db,f.guild,'owner-a',f.pcs[0].id,'f20-eight','I inspect the station lights.');
    captureAuthoredTurnEnvelope(f.db,f.guild,'owner-a',f.pcs[0].id,'f20-eight','I inspect the station lights.');
    const sourceRef=worldInputKey('f20-eight',f.pcs[0].id),{source,rows}=await establishedUnits(f,8,sourceRef);
    assert.equal(rows.length,8);
    const projection=worldDirectorBridgeBeats(f.db,f.guild,source,f.scope);
    assert.equal(projection.beats.length,4);
    assert.equal(projection.omitted,4);
    assert.equal(projection.held,0);
  } finally {f.close();}
});
