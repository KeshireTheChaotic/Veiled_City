import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createP07NativeFixture} from './p07-native-fixture.mjs';
import {declare,intent} from './play-flow-helpers.mjs';
import {autoCompleteOrdinaryMovements} from '../../src/typed-intents.js';
import {applyAutonomousWorld} from '../../src/autonomous-world.js';

for(const locked of [false,true])test(`cross-town public transit ${locked?'preserves locked entry':'allows elapsed travel time'}`,()=>{
 const f=createP07NativeFixture();try{
  f.db.setSimulationEntity(f.guild,'location','archive',{name:'Municipal Archive',visibility:'party',access:'public',travel_minutes:20,locked});
  f.db.upsertReference(f.guild,{kind:'location',key:'archive',name:'Municipal Archive',summary:'A public archive across town.',visibility:'party'});
  const message='I catch a bus to the Municipal Archive.';
  const move=intent(message,{type:'move',operation:'travel',target_key:'archive',target_name:'Municipal Archive',utterance:'',resolution:'auto'});
  const {scope}=declare(f,'bus-trip',message,[move]);
  const result={world_additions:[],scene_actions:[],player_intents:[move]};
  autoCompleteOrdinaryMovements(f.db,f.guild,result,scope);
  result.scene_actions[0].zone='interior';
  const run=()=>applyAutonomousWorld(f.db,f.guild,result,scope,{messageId:'bus-trip'});
  if(locked){assert.throws(run,/accessible local geography/);assert.equal(f.db.getCharacter(f.pcs[0].id).data.location,'p07-station');}
  else{run();assert.equal(f.db.getCharacter(f.pcs[0].id).data.location,'archive');}
 }finally{f.close();}
});
