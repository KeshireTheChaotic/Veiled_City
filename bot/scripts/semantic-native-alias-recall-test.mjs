import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFixture} from './v9-fixtures.mjs';
import {setup,run,unit} from './narrative-fixtures.mjs';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {deliverTurnOutbox} from '../src/publication-outbox.js';
test('N14 older native identity alias recalls its disclosed fiction but an unproved simulation alias does not',()=>nativeFixture(async f=>{
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,narrative_memory:true,narrative_salience:true}});
  const first=setup(f,{messageId:'alias-origin'}),text='The violet parcel waits beneath the clock.';
  const answer={narrative_units:[unit('porter-answer','npc_speech',text,{subject_key:'violet-porter'})],fiction_delta:[{
    kind:'npc',key:'violet-porter',name:'Nella Wick',summary:'An ordinary local porter.',location_key:'terminal',parent_location_key:'',role:'porter',aliases:['Copperhand']}]};
  const old=await run(f,first,answer);assert(old.rows.some(row=>row.payload.includes(text)));
  const send=async row=>({messageId:'alias-'+row.id,channelId:'offline'});
  await deliverTurnOutbox(f.db,f.guild,old.attempt.turn_id,send);
  assert(f.db.getCityRecord(f.guild,'autonomous_entity','npc:violet-porter'));
  for(let turn=0;turn<6;turn++){
    const x=setup(f,{text:'Describe the counter.',messageId:'alias-new-'+turn}),o=await run(f,x,{fiction_delta:[],
      narrative_units:Array.from({length:8},(_,i)=>unit(`ambient-${turn}-${i}`,'scene',`Amber light falls across numbered folding counter ${turn*8+i}.`))});
    await deliverTurnOutbox(f.db,f.guild,o.attempt.turn_id,send);
  }
  f.restart();const x=setup(f,{text:'What about Copperhand?',messageId:'alias-recall'});
  assert(buildNarrativeContext(f.db,f.guild,x.scope,x.sourceRef).packet.prior_fiction.some(row=>row.text.includes(text)));
  const entity=f.db.getSimulationEntity(f.guild,'npc','violet-porter');
  f.db.setSimulationEntity(f.guild,'npc','violet-porter',{...entity.state,aliases:[...entity.state.aliases,'Hidden Handle']});
  const hidden=setup(f,{text:'What about Hidden Handle?',messageId:'unproved-alias'});
  assert(!buildNarrativeContext(f.db,f.guild,hidden.scope,hidden.sourceRef).packet.prior_fiction.some(row=>row.text.includes(text)));
  const identity=f.db.getCityRecord(f.guild,'autonomous_entity','npc:violet-porter');
  f.db.db.prepare("UPDATE world_events SET status='retracted' WHERE guild_id=? AND event_key=?").run(f.guild,identity.source_event);
  const revoked=setup(f,{text:'What about Copperhand?',messageId:'revoked-native-alias'});
  assert(!buildNarrativeContext(f.db,f.guild,revoked.scope,revoked.sourceRef).packet.prior_fiction.some(row=>row.text.includes(text)));
  assert.equal(f.db.getCityRecord(f.guild,'autonomous_entity','npc:violet-porter').record_key,identity.record_key);
}));
