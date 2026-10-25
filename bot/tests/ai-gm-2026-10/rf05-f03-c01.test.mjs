import test from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetTurnPrompt,partitionRosterContext,referenceContextPlan,referenceSessionContext
} from '../../src/frameworks/ai-provider/public.js';
import {referenceKnowledgeScopedTurnStorage} from '../../src/framework-to-framework/ai-provider--knowledge/public.js';

function fact(overrides={}){
  return {id:'fact-private-1',guild_id:'guild-1',visibility:'player',subject_user_id:'owner-1',
    subject_character_id:null,content:'A sealed letter names the old bridge.',provenance_json:'{"source":"native-record-7"}',
    archived:false,evidence_active:true,...overrides};
}
function sectionsFor(row,nativeFact=fact()){
  return [
    {label:'GM-PRIVATE + ALL KNOWN FACTS',required:true,value:[nativeFact]},
    {label:'SCOPED INTERPRETATION (not authority)',required:true,value:{targeted_sources:[row]}}
  ];
}

test('Knowledge pair aliases only an exact source visible to the current private recipient',()=>{
  const native=fact();
  const source={source_ref:native.id,content:native.content,provenance:native.provenance_json};
  const authorized=referenceKnowledgeScopedTurnStorage(sectionsFor(source,native),{
    guildId:'guild-1',scope:{mode:'private',actorUserId:'owner-1',actorCharacterId:null}
  });
  const targeted=authorized[1].value.targeted_sources[0];
  assert.equal(targeted.content,undefined);
  assert.equal(targeted.provenance,undefined);
  assert.equal(targeted.detail_ref.fact,native.id);
  assert.equal(authorized[0].value[0].content,native.content);

  const unauthorized=referenceKnowledgeScopedTurnStorage(sectionsFor(source,native),{
    guildId:'guild-1',scope:{mode:'private',actorUserId:'other-user',actorCharacterId:'other-pc'},
    factVisibleTo:()=>true
  });
  assert.equal(unauthorized[1].value.targeted_sources[0].detail_ref,undefined);
  assert.equal(unauthorized[1].value.targeted_sources[0].content,native.content);
});

test('mismatched, archived, inactive, wrong-campaign, and different-provenance facts never become references',()=>{
  const native=fact();
  const source={source_ref:native.id,content:native.content,provenance:native.provenance_json};
  const cases=[
    [source,{...native,content:'Changed content'}],
    [source,{...native,archived:true}],
    [source,{...native,evidence_active:false}],
    [source,{...native,guild_id:'guild-2'}],
    [{...source,provenance:'{"source":"different-record"}'},native]
  ];
  for(const [row,record] of cases){
    const projected=referenceKnowledgeScopedTurnStorage(sectionsFor(row,record),{
      guildId:'guild-1',scope:{mode:'private',actorUserId:'owner-1',actorCharacterId:null}
    });
    assert.equal(projected[1].value.targeted_sources[0].detail_ref,undefined);
  }
});

test('session and context plan projections reference only structurally identical retained details',()=>{
  const assembly={beats:[{id:'beat-1',line:'Rain on copper.'}]};
  const session={id:'session-3',assembly_plan_json:JSON.stringify(assembly),title:'Night Shift'};
  const projected=referenceSessionContext(session,assembly);
  assert.equal(projected.assembly_plan_json,undefined);
  assert.deepEqual(projected.assembly_plan_detail,{section:'ASSEMBLY PLAN (GM-PRIVATE; protect per-character hooks)',session_id:'session-3'});
  assert.equal(referenceSessionContext(session,{beats:[]}),session);

  const retained={id:'fact-1',guild_id:'guild-1',visibility:'gm',content:'Only exact details may alias.'};
  const plan={scope:{mode:'private'},actor:{id:'pc-1'},segments:[
    {source:'fact:fact-1',data:retained},{source:'fact:fact-2',data:{content:'other'}}
  ]};
  const result=referenceContextPlan(plan,[retained]);
  assert.equal(result.segments[0].detail_ref,'fact:fact-1');
  assert.equal(result.segments[0].data,undefined);
  assert.deepEqual(result.segments[0].scope,plan.scope);
  assert.deepEqual(result.segments[0].actor,plan.actor);
  assert.deepEqual(result.segments[1],plan.segments[1]);
});

test('roster projection defers only named descriptive strings and retains control and unknown fields',()=>{
  const input=[{character_id:'pc-1',user_id:'u-1',owner_user_id:'u-1',controlled_by:'u-1',
    sheet:{background:'Raised by the canal.',notes:'Keeps a brass key.',agility:2,custom_authority:'native'}}];
  const result=partitionRosterContext(input);
  assert.equal(result.roster[0].sheet.background,undefined);
  assert.equal(result.roster[0].sheet.agility,2);
  assert.equal(result.roster[0].sheet.custom_authority,'native');
  assert.equal(result.roster[0].owner_user_id,'u-1');
  assert.equal(result.roster[0].controlled_by,'u-1');
  assert.equal(result.background.length,2);
  assert.equal(result.background[0].visibility,'gm');
  assert.equal(result.roster[0].sheet_detail_refs[0].content_hash,result.background[0].content_hash);
});

test('whole-turn budget keeps mandatory context and reports exact complete optional-record omissions',()=>{
  const sections=[
    {label:'MANDATORY AUTHORITY',required:true,value:'Native constraints stay intact.'},
    {label:'OPTIONAL NOTES',required:false,priority:1,value:Array.from({length:12},(_,index)=>
      `${index===7?'needletarget ':''}${String(index).padStart(2,'0')}: ${'ordinary scene detail '.repeat(8)}`)}
  ];
  const complete=budgetTurnPrompt(sections,{maxChars:100000,reserveChars:0,query:'needletarget'});
  const compact=budgetTurnPrompt(sections,{maxChars:complete.input.length-1,reserveChars:0,query:'needletarget'});
  assert.equal(compact.input.includes('MANDATORY AUTHORITY:\nNative constraints stay intact.'),true);
  assert.equal(compact.input.includes('needletarget'),true);
  assert.equal(compact.metrics.compacted,true);
  assert.deepEqual(compact.metrics.omissions,[{section:'OPTIONAL NOTES',records:12-
    (compact.input.match(/ordinary scene detail/g)||[]).length/8}]);
  assert.equal(compact.metrics.input_chars,compact.input.length);
});

test('mandatory context overflow fails with an uncommitted diagnostic',()=>{
  assert.throws(()=>budgetTurnPrompt([
    {label:'MANDATORY AUTHORITY',required:true,value:'This entire authority record must remain.'}
  ],{maxChars:12,reserveChars:0}),error=>error.code==='CONTEXT_OVERFLOW'
    &&error.diagnostic.stage==='mandatory_authority'&&error.diagnostic.committed===false);
});
