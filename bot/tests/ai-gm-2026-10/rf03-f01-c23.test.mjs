import test from 'node:test';
import assert from 'node:assert/strict';
import {createGmRulingContract} from '../../src/frameworks/daggerheart/gm-ruling-contract.js';
const candidate=()=>({version:1,disposition:'standard_action_roll',context_refs:['scene-c23'],capability:{kind:'mundane',ref:''},effect_class:'attempt_only',trait:'Knowledge',difficulty:12,risk:'The fragile latch might jam.',stakes:'Learn the mechanism or fail to learn it.',explanation:'A careful inspection of the established mechanism.',difficulty_reason:'Its worn components require care.',saved_ruling_key:'',override_refs:[],raw_refs:['srd:action-rolls'],house_refs:[],homebrew_refs:[],modifier_keys:[]});
test('native contract validates the unchanged closed candidate without modifying it or creating authority',()=>{
 const native=createGmRulingContract(),input=candidate(),before=structuredClone(input);assert.equal(native.validateGmRulingProposal(input),input);assert.deepEqual(input,before);assert.equal('receipt' in input,false);assert.equal('gm' in input,false);assert.equal(native.gmRulingSchema.additionalProperties,false);
});
test('structural contract accepts an unverified capability proposal without pretending its existence or use is authorized',()=>{
 const native=createGmRulingContract(),input=candidate();input.capability={kind:'unverified',ref:'proposed-feature-c23'};input.disposition='needs_review';input.explanation='The GM may interpret this uncertain proposal through the existing native review.';assert.equal(native.validateGmRulingProposal(input),input);assert.equal(input.disposition,'needs_review');
});
test('historical narrative no-roll form retains nullable trait and Difficulty rather than forcing a player roll',()=>{
 const native=createGmRulingContract(),input=candidate();Object.assign(input,{disposition:'narrative_no_roll',trait:null,difficulty:null,risk:'none',stakes:'none'});assert.equal(native.validateGmRulingProposal(input),input);assert.throws(()=>native.validateGmRulingProposal({...input,gm:true}),/Closed versioned/);assert.throws(()=>native.validateGmRulingProposal({...input,receipt:'forged'}),/Closed versioned/);
});
test('native schema preserves exact integer ranges, trait vocabulary and distinct bounded source references',()=>{
 const native=createGmRulingContract();for(const patch of [{difficulty:101},{difficulty:-1},{difficulty:1.5},{trait:'InventedTrait'},{version:2},{context_refs:['same','same']},{context_refs:Array.from({length:9},(_,i)=>'source-'+i)}])assert.throws(()=>native.validateGmRulingProposal({...candidate(),...patch}),/Closed versioned/);for(const difficulty of [0,100])assert.equal(native.validateGmRulingProposal({...candidate(),difficulty}).difficulty,difficulty);
});
test('nested structural fields remain closed while existing creative explanations stay ordinary text',()=>{
 const native=createGmRulingContract(),input=candidate();input.explanation='A passing courier can identify a chime from the market while autonomous factions continue pursuing their own goals.';assert.equal(native.validateGmRulingProposal(input).explanation,input.explanation);assert.throws(()=>native.validateGmRulingProposal({...input,capability:{...input.capability,approved:true}}),/Closed versioned/);const missing={...input};delete missing.stakes;assert.throws(()=>native.validateGmRulingProposal(missing),/Closed versioned/);
});
test('actual shared provider and actual typed-intent consumer use the same native contract with all historical closed forms intact',async()=>{
 const provider=await import('../../src/gm-ruling-schema.js'),consumer=await import('../../src/typed-intents.js'),forms=consumer.playerIntentSchema.items.anyOf,gmForms=forms.filter(f=>f.properties.gm_ruling),historic=forms.filter(f=>!f.properties.gm_ruling);assert.equal(gmForms.length,4);assert.equal(historic.length,8);for(const form of gmForms){assert.equal(form.properties.gm_ruling,provider.gmRulingSchema);assert.equal(form.properties.native_adjudication,undefined);assert.equal(form.additionalProperties,false);}assert.equal(provider.validateGmRulingProposal(candidate()).version,1);assert.ok(historic.some(f=>f.properties.native_adjudication));assert.ok(historic.some(f=>!f.properties.native_adjudication&&!f.properties.depends_on&&!f.properties.coordination));
});
test('actual GM ruling provider retains the exact same contract exports used by its native validation capability',async()=>{
 const a=await import('../../src/gm-ruling-schema.js'),b=await import('../../src/gm-action-ruling.js');assert.equal(a.gmRulingSchema,b.gmRulingSchema);assert.equal(a.validateGmRulingProposal,b.validateGmRulingProposal);assert.equal(b.validateGmRulingProposal(candidate()).effect_class,'attempt_only');
});
