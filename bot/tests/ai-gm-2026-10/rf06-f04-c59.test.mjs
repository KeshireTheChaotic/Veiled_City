import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLevelupDraftFormatter} from '../../src/frameworks/discord/public.js';
import {connectCharacterAdvancement} from '../../src/framework-to-framework/character--daggerheart/public.js';
const draft=()=>({id:'1234567890',from_level:1,to_level:2,choices:{},status:'draft'});
const rules=()=>connectCharacterAdvancement({classDomains:{},traits:[],normalizeClassName:x=>x});
test('composition requires only original display callbacks and empty draft calls neither',()=>{
  for(const value of [null,{}, {tierAchievement(){}}])assert.throws(()=>createLevelupDraftFormatter(value),TypeError);
  const events=[],format=createLevelupDraftFormatter({tierAchievement(){events.push('tier');},legalAdvancements(){events.push('legal');}});assert.equal(format.name,'formatLevelupDraft');assert.equal(format.length,2);assert.equal(format(null,null),'No pending level-up draft.');assert.deepEqual(events,[]);
});
test('actual existing advancement callbacks retain exact unselected level2 text and owner choice prompt',()=>{
  const format=createLevelupDraftFormatter(rules()),d=draft(),c={name:'Mara'},before=structuredClone({d,c});assert.equal(format(d,c),'**Level Up — Mara 1 → 2**\nTier achievement: new Experience +2; +1 Proficiency; none\nLegal advancements: traits, hp, stress, experience, domain, evasion\nUse `/vc-level level-choose` to choose two advancements and the mandatory domain card.\nDraft ID: `12345678`');assert.deepEqual({d,c},before);
});
test('selected plan and actual level5 display retains original mandatory card and cleared marks text',()=>{
  const d={...draft(),from_level:4,to_level:5,status:'ready',choices:{plan:{advancements:['hp','traits'],automatic_domain_card:{name:'Ward',domain:'Codex',level:5}}}},before=structuredClone(d),text=createLevelupDraftFormatter(rules())(d);
  assert.ok(text.includes('**Level Up — Character 4 → 5**'));assert.ok(text.includes('Tier achievement: new Experience +2; +1 Proficiency; clear marked traits'));assert.ok(text.includes('Legal advancements: traits, hp, stress, experience, domain, evasion, subclass, proficiency, multiclass'));assert.ok(text.includes('Selected: hp + traits\nMandatory card: Ward (Codex 5)\nStatus: **ready**'));assert.deepEqual(d,before);
});
test('original callback order/arguments and exact callback errors propagate without rule translation',()=>{
  const events=[],error=new Error('native display'),format=createLevelupDraftFormatter({tierAchievement(level){events.push(['tier',level]);return {new_experience:false,proficiency:0,clear_trait_marks:false};},legalAdvancements(level){events.push(['legal',level]);return ['custom'];}});assert.ok(format(draft()).includes('Tier achievement: none\nLegal advancements: custom'));assert.deepEqual(events,[['tier',2],['legal',2]]);
  assert.throws(()=>createLevelupDraftFormatter({tierAchievement(){throw error;},legalAdvancements(){assert.fail('must not run');}})(draft()),e=>e===error);
});
test('original malformed plan errors, character fallback and1900UTF16limit retained',()=>{
  const format=createLevelupDraftFormatter(rules());assert.ok(format(draft(),{name:''}).startsWith('**Level Up — Character'));assert.throws(()=>format({...draft(),choices:{plan:{}}}),TypeError);const d=draft();assert.equal(format(d,{name:'x'.repeat(2100)}).length,1900);
});
test('root binds original composed callbacks and retains planning/confirmation callers unchanged',()=>{
  const s=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');assert.ok(s.includes('const formatLevelupDraft=createLevelupDraftFormatter({tierAchievement,legalAdvancements});'));assert.ok(!s.includes('function formatLevelupDraft('));assert.equal((s.match(/formatLevelupDraft\((?:draft|ready),c\)/g)||[]).length,2);assert.ok(s.includes('legal_advancements:legalAdvancements(from+1),tier_achievement:tierAchievement(from+1)'));assert.ok(s.includes('applyLevelupToData'));
});
