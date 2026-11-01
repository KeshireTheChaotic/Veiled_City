import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {intentContext,intentKnowledgeContext,intentSessionScene,intentWorldOperations,intentWorldProjects,intentNativeEncounter,intentKnowledgeMaintenance} from '../../src/frameworks/intent/public.js';
import {intentContext as compatibility} from '../../src/ai-intents.js';
import {connectIntentKnowledgeContext} from '../../src/framework-to-framework/intent--knowledge/public.js';
import {stateRevision} from '../../src/kernel/state-revision.js';

function bind(port,overrides={},extras={}){
  const functions={};for(const [name,d] of Object.entries(Object.getOwnPropertyDescriptors(port)))if(name!=='bind'&&typeof d.value==='function')functions[name]=()=>[];
  port.bind({...functions,...overrides,...extras});
}
const occupant=i=>({data:{entity_type:'npc',entity_key:`npc-${i}`}});
bind(intentSessionScene,{sceneView:()=>({occupants:Array.from({length:40},(_,i)=>occupant(i))})});
bind(intentWorldOperations,{nativeWorldOperationCatalog:()=>['original-operation']});
bind(intentWorldProjects,{projectPhaseRevision:()=> 'phase-original'});
bind(intentNativeEncounter,{encounterProposalContext:()=>[]},{EncounterLibrary:class{}});
bind(intentKnowledgeMaintenance,{reconcileHistory:()=>({original:true})});

function fixture({scene=false,oversized=false}={}){
 const reads=[],policy={mode:'manual',revision:7,allow:['dialogue.interpret'],max_operations:1,max_cost:0,expires_minute:null};
 const flags={scene_continuity:scene,roll_requests:false,memory_consolidation:false};
 const entry={record_key:'entry',status:'pending',data:{audience:'gm',content:oversized?'x'.repeat(25000):'private source'}};
 const db={getActiveSession:()=>({id:'session'}),getCityCalendar:()=>({flags}),getCityRecord:()=>({data:policy}),
   listCityRecords(guild,options){reads.push([guild,options]);if(options.kind==='scene_entry')return [entry];
     if(options.kind==='long_project')return [{record_key:'project',data:{}}];
     if(options.kind==='group_transition')return [{record_key:'group',source_event:'secret-source',data:{members:['one','two','three','four','five']}}];return [];},
   listNpcProfiles:()=>[],listNpcGoals:()=>[],getNpcProfile:(guild,key)=>({npc_key:key}),
   listNpcKnowledge(guild,key){return [{knowledge_key:`private-${key}`,belief_state:'believed',content:`known only to ${key}`}];},
   listNpcMemories:()=>[],contextFacts(){throw new Error('Global facts reached NPC context');}};
 return {db,reads,policy,flags,entry};
}

test('extracted context preserves original body and public compatibility identity',async()=>{
 assert.equal(intentContext,compatibility);
 const source=await readFile(new URL('../../src/frameworks/intent/context-reader.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('export function intentContext')).replace('planContext(db,guild,','new ContextPlanner(db).plan(guild,');
 assert.equal(createHash('sha256').update(body.replace(/\r\n/g,'\n')).digest('hex'),'024ca2141bfd62db186f114652e04b5e269a536b8a0f5e68833909de8f875eeb');
});
test('fixed Knowledge planner and actual context retain NPC isolation, limits and fingerprints',()=>{
 assert.throws(()=>intentKnowledgeContext.planContext({},'g',{}),{code:'INTENT_KNOWLEDGE_CONTEXT_COMPOSITION'});
 assert.equal(connectIntentKnowledgeContext(),intentKnowledgeContext);connectIntentKnowledgeContext();
 const {db,reads,policy,flags,entry}=fixture({scene:true});const packet=intentContext(db,'g');
 assert.equal(packet.policy,policy);assert.equal(packet.flags,flags);
 assert.equal(packet.scene.occupants.length,32);assert.equal(packet.scene.targets.length,32);
 assert.equal(packet.scene_entries[0].expected_revision,stateRevision(entry));
 assert.equal(packet.project_targets[0].phase_revision,'phase-original');
 assert.equal(packet.group_actor_packets.length,4);
 for(const row of packet.group_actor_packets){assert.ok(JSON.stringify(row.packet).includes(`known only to ${row.member}`));assert.ok(!JSON.stringify(row.packet).includes('known only to five'));}
 assert.deepEqual(reads.find(([,options])=>options.kind==='scene_entry'),['g',{kind:'scene_entry',includeGM:true,limit:30}]);
 assert.deepEqual(packet.roll_declarations,[]);assert.deepEqual(packet.roll_requests,[]);
});
test('oversized private record is omitted whole while policy and later bounded records survive',()=>{
 const {db,policy}=fixture({oversized:true});const packet=intentContext(db,'g');
 assert.equal(packet.policy,policy);assert.deepEqual(packet.scene_entries,[]);
 assert.equal(packet.context_metrics.omissions.scene_entries,1);assert.equal(packet.scene,null);
 assert.equal(packet.project_targets[0].record_key,'project');
 assert.ok(!JSON.stringify(packet).includes('x'.repeat(100)));
});
