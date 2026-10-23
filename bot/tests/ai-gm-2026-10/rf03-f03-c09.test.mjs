import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createActionConsentTerms} from '../../src/frameworks/daggerheart/action-consent-terms.js';

function fail(message){throw Object.assign(new Error(message),{code:'SCENE_ACTION_WINDOW'});}
const native=createActionConsentTerms({fail});
const window={record_key:'window:scene-7',data:{revision:4}};
const accepted={record_key:'intent:accepted-2',data:{actor:'pc:aya',source_hash:'source-hash',scene:'scene-7',session_id:'session-3'},
  source_event:'event:owner-action',visibility:'character',subject_key:'pc:aya'};
const input={reads:['world:door','pc:aya'],writes:['world:door'],required_participants:['pc:zo','pc:aya'],
  operation:'open',location_key:'loc:archive'};

test('native consent term projection retains exact source, audience, limits and sorted canonical arrays',()=>{
  assert.deepEqual(native.termsFor(window,accepted,input),{
    window:'window:scene-7',window_revision:4,accepted_intent:'intent:accepted-2',actor:'pc:aya',
    source_event:'event:owner-action',source_hash:'source-hash',operation:'open',reads:['pc:aya','world:door'],
    writes:['world:door'],location_key:'loc:archive',required_participants:['pc:aya','pc:zo'],scene:'scene-7',
    session_id:'session-3',source_audience:'character',source_subject:'pc:aya'
  });
});

test('equivalent unordered terms retain a stable consent digest',()=>{
  const reordered={...input,reads:[...input.reads].reverse(),writes:[...input.writes].reverse(),
    required_participants:[...input.required_participants].reverse()};
  assert.deepEqual(native.termsFor(window,accepted,input),native.termsFor(window,accepted,reordered));
});

test('invalid or duplicate resources and participants retain the established domain hold',()=>{
  for(const patch of [
    {reads:['invalid resource']},
    {writes:Array.from({length:33},(_,i)=>`world:r${i}`)},
    {reads:['world:x','world:x']},
    {required_participants:[]},
    {required_participants:Array.from({length:13},(_,i)=>`pc:${i}`)},
    {required_participants:['pc:aya','pc:aya']},
    {operation:''},
    {location_key:''}
  ])assert.throws(()=>native.termsFor(window,accepted,{...input,...patch}),e=>e.code==='SCENE_ACTION_WINDOW'
    &&e.message==='Consent needs bounded exact resources and participants.');
});

test('existing provider delegates term construction to the Daggerheart implementation',()=>{
  const provider=fs.readFileSync(new URL('../../src/action-consent.js',import.meta.url),'utf8');
  assert.match(provider,/createActionConsentTerms\(\{fail\}\)/);
  assert.match(provider,/const \{termsFor\}=createActionConsentTerms/);
});
