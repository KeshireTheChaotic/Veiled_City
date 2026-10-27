import './compose-startup.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {retrieveNpcCognition} from '../../src/frameworks/npc/public.js';
test('stale density entry and malformed tags do not erase an independent NPC motive or rumor',()=>{
 const profile={npc_key:'courier',display_name:'Courier',activity_tier:'active'};
 const db={getCityCalendar:()=>({flags:{activity_density:true}}),densityActorSelection:()=>[{type:'npc',actor_key:'missing'},{type:'npc',actor_key:'courier'}],getNpcProfile:(_g,k)=>k==='courier'?profile:null,
 getSimulationClock:()=>({tick:8}),listNpcGoals:()=>[{objective:'Find the missing parcel',priority:70}],listNpcMemories:()=>[{id:'m',content:'A stranger took the parcel.',tags:{bad:true},tags_json:'{}',source_ref:'rumor',importance:50}],
 listNpcKnowledge:()=>[{knowledge_key:'rumor',belief_state:'rumor',content:'The parcel is cursed.',confidence:30}],getWorldEvent:()=>({status:'active'}),npcMemoryCorrections:()=>[],getSimulationEntity:()=>null};
 const result=retrieveNpcCognition(db,'g',{query:'parcel',worldDirector:true,recordRecall:false});
 assert.equal(result.length,1);assert.equal(result[0].goals[0].priority,70);assert.equal(result[0].knowledge[0].belief_state,'rumor');assert.match(result[0].continuity_authority,/not canon/);
});
