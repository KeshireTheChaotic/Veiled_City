import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {featureDisposition,executableNativeFeatures,inspectNativeFeatureOccurrence} from '../../src/native-feature-catalog.js';
import {environmentProposalContract} from '../../src/native-environment-capabilities.js';
import {validateMaintenanceMemoryFact} from '../../src/native-environment-scene.js';
import {matchesArbitrationSchema,unifiedArbitrationSchema} from '../../src/gm-arbitration-contract.js';

const FEATURE='environment:veil-anchor-chamber:maintenance-memory';
const sources=()=>({
  adversaries:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ADVERSARIES/adversaries.json',import.meta.url),'utf8')),
  environments:JSON.parse(fs.readFileSync(new URL('../../../content/GM_PRIVATE/ENVIRONMENTS/environments.json',import.meta.url),'utf8'))
});

test('Maintenance Memory keeps exact source and grants only its zero-cost native adapter',()=>{
  const input=sources(),inspection=inspectNativeFeatureOccurrence(FEATURE,input),disposition=featureDisposition(FEATURE,input),feature=disposition.feature;
  assert.equal(inspection.status,'verified_source');assert.equal(inspection.execution_authorized,false);
  assert.equal(disposition.status,'supported');assert.equal(feature.native_handler,'environment_maintenance_memory');
  assert.equal(feature.type,'Action');assert.equal(feature.trigger_kind,'spotlight_action');
  assert.equal(feature.target_policy,'none');assert.equal(feature.roll_protocol,'none');assert.deepEqual(feature.costs,[]);
  assert.match(inspection.printed_rule,/historical scene associated with the Anchor.s creation/);
  assert.ok(executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const contract=environmentProposalContract(feature);
  assert.equal(contract.handler,'environment_maintenance_memory');assert.equal(contract.transport,8);
  assert.equal(contract.entry,'environment_actions');assert.equal(contract.kind,'historical_memory');
  assert.equal(contract.fear,0);assert.deepEqual(contract.required,['version','feature_ref','environment','detail']);
});

test('historical memory requires one exact current established GM fact and rejects a missing anchor',()=>{
  const fact={id:'fact-1',content:'The Anchor was built around the first recovered name.',category:'metaplot',source:'human_gm',visibility:'party',
    provenance_json:JSON.stringify({epistemic:{kind:'established',source_refs:['ruling-1'],perspective:'gm:gm-1'}})},
    ruling={event_key:'ruling-1',status:'active',kind:'gm_fact_ruling',source_id:'gm-1',visibility:'party',details:{reviewed_by:'gm-1',fact_id:'fact-1'}},
    db={getFact:(_guild,id)=>id==='fact-1'?fact:null,getWorldEvent:(_guild,id)=>id==='ruling-1'?ruling:null,
      db:{prepare:()=>({all:()=>[{id:5,after_json:JSON.stringify(fact)}]})}},scope={mode:'party'};
  const proof=validateMaintenanceMemoryFact(db,'guild','fact-1',scope),hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(proof.content,fact.content);assert.equal(proof.fact_hash,hash(fact));
  assert.equal(proof.source_ref,'ruling-1');assert.equal(proof.source_hash,hash(ruling));
  assert.throws(()=>validateMaintenanceMemoryFact({getFact:()=>null},'guild','missing',scope),{code:'GM_ARBITRATION'});
  assert.throws(()=>validateMaintenanceMemoryFact(null,'guild',' ',{mode:'party'}),{code:'GM_ARBITRATION'});
  const privateFact={...fact,visibility:'character',subject_character_id:'owner-1'},privateDb={...db,getFact:()=>privateFact};
  assert.throws(()=>validateMaintenanceMemoryFact(privateDb,'guild','fact-1',scope),{code:'GM_ARBITRATION'});
});

test('version 8 schema accepts only the closed historical-memory action while earlier versions stay unchanged',()=>{
  const action={version:1,feature_ref:FEATURE,environment:'veil-anchor-chamber',detail:{kind:'historical_memory',category:'',property:'fact-1',service:'',value:''}};
  const packet={version:8,npc_intents:[],decisions:[],pre_roll_fear:[],environment_profiles:[{version:1,environment:'veil-anchor-chamber',location:'anchor-room'}],environment_actions:[action]};
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,packet),true);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...packet,version:7}),false);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...packet,environment_actions:[{...action,feature_ref:'invented'}]}),false);
  assert.equal(matchesArbitrationSchema(unifiedArbitrationSchema,{...packet,environment_actions:[{...action,detail:{...action.detail,service:'city-grid'}}]}),false);
});

test('source drift locally holds Maintenance Memory and forged native contract fields grant no route',()=>{
  const input=sources(),actor=input.environments.find(row=>row.name==='Veil Anchor Chamber');
  actor.features[1]+=' altered';assert.equal(featureDisposition(FEATURE,input).status,'needs_rules_review');
  assert.ok(!executableNativeFeatures('environment',input).some(row=>row.feature_key===FEATURE));
  const actual=featureDisposition(FEATURE,sources()).feature;
  assert.equal(environmentProposalContract({...actual,native_handler:'invented'}),null);
  assert.equal(environmentProposalContract({...actual,costs:[{resource:'fear',amount:1}]}),null);
  assert.equal(environmentProposalContract({...actual,trigger_kind:'passive'}),null);
  assert.equal(environmentProposalContract({...actual,target_policy:'acting_pc'}),null);
  assert.equal(environmentProposalContract({...actual,roll_protocol:'difficulty'}),null);
  assert.equal(environmentProposalContract({...actual,status:'review_only'}),null);
});
