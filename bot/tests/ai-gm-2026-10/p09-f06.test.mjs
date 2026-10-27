import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeNativeScenes} from '../../src/application/composition/public.js';
initializeNativeScenes();
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeAttackPassives} from '../../src/native-feature-passives.js';
import {motivationKey} from '../../src/frameworks/npc/public.js';

const adversaries=JSON.parse(readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8'));
const template=adversaries.find(row=>row.name==='Pale Court Thrall');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function encounterFixture({allyCount=0,proxied=[],defeated=[],otherZone=[]}={}){
  const session={id:'session-p09-f06'},scene='session-p09-f06:1',location='loc-p09-f06',targetKey='pc-p09-f06';
  const actors=Array.from({length:allyCount},(_,i)=>`thrall-${i+1}`),combatants=[{actor:'thrall-attacker',id:'combatant-attacker'},
    ...actors.map((actor,i)=>({actor,id:`combatant-${i+1}`}))];
  const presences=[{type:'character',key:targetKey,actor_key:`character:${targetKey}`,location_key:location,source_event:'presence-target',
    data:{scene,entity_type:'character',entity_key:targetKey,zone:'zone-a',state:'actually_present',hidden:false,known_to:[],blocks:[]}},
  ...['thrall-attacker',...actors].map((actor,i)=>({type:'npc',key:actor,actor_key:`npc:${actor}`,location_key:location,
    source_event:`presence-${actor}`,data:{scene,entity_type:'npc',entity_key:actor,zone:i>0&&otherZone.includes(actor)?'zone-b':'zone-a',
      state:'actually_present',hidden:false,known_to:[],blocks:[]}}))];
  const presenceMap=new Map(presences.map(row=>[`${row.type}:${row.key}`,row]));
  const events=new Map(presences.map(row=>[row.source_event,{event_key:row.source_event,status:'active'}]));
  const db={
    getActiveSession:()=>session,getDirectorState:()=>({scene_number:1}),
    getCityRecord(_guild,kind,key){if(kind==='scene_presence')return presenceMap.get([...presenceMap.keys()].find(k=>key===`presence:${motivationKey([scene,...k.split(':')])}`))||null;return null;},
    listCityRecords(_guild){return presences;},getWorldEvent(_guild,key){return events.get(key)||null;},
    getSimulationEntity(_guild,type,key){return type==='npc'?{state:{location_key:location,removed:false,status:'active'}}:null;},
    getCharacter:()=>null,roster:()=>[{character_id:targetKey,presence:'present'}],
    getCurrentEncounter:()=>({id:'encounter-p09-f06'}),listCombatants:()=>combatants,
    listNpcProxies:()=>proxied.map(npc_key=>({npc_key,status:'active'}))
  };
  // Use the same native key projection as scene-continuity without depending on database fixtures.
  db.getCityRecord=(_guild,kind,key)=>kind==='scene_presence'
    ?presences.find(row=>key===`presence:${motivationKey([scene,row.type,row.key])}`)||null:null;
  const binding={data:{combatants:combatants.map(row=>({actor:row.actor,id:row.id}))}};
  const liveCombatants=combatants.map((row,i)=>({...row,base_name:template.name,status:defeated.includes(row.actor)?'defeated':'active',
    hp_current:defeated.includes(row.actor)?0:5,hp_max:5}));
  db.listCombatants=()=>liveCombatants;
  const library={findAdversary:name=>name===template.name?template:null};
  return {db,actors,combatant:liveCombatants[0],encounter:{id:'encounter-p09-f06'},binding,library,template,targetKey};
}

function modifier(options){
  const f=encounterFixture(options);
  return nativeAttackPassives(f.db,'guild-p09-f06',{npc:'thrall-attacker',combatant:f.combatant,character:f.targetKey,
    encounter:f.encounter,binding:f.binding,template:f.template,library:f.library})[0].modifier;
}

test('Pack Pressure caps the native same-zone live Thrall modifier at +2',()=>{
  assert.equal(modifier({allyCount:0}),0);
  assert.equal(modifier({allyCount:1}),1);
  assert.equal(modifier({allyCount:2}),2);
  assert.equal(modifier({allyCount:3}),2);
});

test('Pack Pressure excludes human-proxied, defeated, and other-zone Thralls',()=>{
  const f=encounterFixture({allyCount:3,proxied:['thrall-1'],defeated:['thrall-2'],otherZone:['thrall-3']});
  const passive=nativeAttackPassives(f.db,'guild-p09-f06',{npc:'thrall-attacker',combatant:f.combatant,character:f.targetKey,
    encounter:f.encounter,binding:f.binding,template:f.template,library:f.library})[0];
  assert.equal(passive.modifier,0);
  assert.deepEqual(passive.allies,[]);
});
