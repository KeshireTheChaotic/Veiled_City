import test from 'node:test';
import assert from 'node:assert/strict';
import {handoutMarkdown,handoutSummary} from '../../src/frameworks/publication/handout-text.js';
import {handoutMarkdown as rootMarkdown,handoutSummary as rootSummary} from '../../src/handout.js';
import {handoutMarkdown as publicMarkdown,handoutSummary as publicSummary} from '../../src/frameworks/publication/public.js';
const handout=()=>({id:'12345678-long-id',title:'Station receipt',kind:'document',authority:'partial',visibility:'character',content:'A faded stamp.',case_key:'case-1',npc_key:'clerk',location_key:'station',gm_notes:'secret-not-output',metadata:{secret:'internal-proof'}});

test('root and public handout text exports retain one implementation',()=>{
  assert.equal(rootMarkdown,handoutMarkdown);assert.equal(publicMarkdown,handoutMarkdown);assert.equal(rootSummary,handoutSummary);assert.equal(publicSummary,handoutSummary);
});
test('markdown preserves source-bound artifact labels and selected links without serializing extra metadata',()=>{
  const h=handout(),before=structuredClone(h),text=handoutMarkdown(h);
  assert.ok(text.startsWith('# Station receipt\n**Veiled City Evidence Handout**'));
  assert.match(text,/- Visibility: character/);assert.match(text,/- Case: case-1\n- NPC: clerk\n- Location: station/);assert.match(text,/## Player-Facing Artifact\n\nA faded stamp\./);
  assert.doesNotMatch(text,/secret-not-output|internal-proof/);assert.deepEqual(h,before);
});
test('each authority keeps original distinct disclaimer and summary badge',()=>{
  for(const [authority,fragment] of [['canonical','Only independently established source facts are canonical'],['partial','The artifact is genuine'],['unreliable','The source may be mistaken'],['illustrative','This is an illustrative aid'],['custom','This is an illustrative aid']]){
    const h={...handout(),authority};assert.ok(handoutMarkdown(h).includes(fragment));assert.ok(handoutSummary(h).includes(`Authority: **${authority.toUpperCase()}**`));
  }
});
test('empty artifact content and absent links preserve original placeholders',()=>{
  const h={...handout(),content:'',case_key:null,npc_key:null,location_key:null},text=handoutMarkdown(h);
  assert.match(text,/\(No player-facing text\.\)/);assert.doesNotMatch(text,/- Case:|- NPC:|- Location:/);
});
test('summary preserves 1300-character excerpt, ellipsis and eight-character identifier',()=>{
  const h={...handout(),content:'x'.repeat(1301)},text=handoutSummary(h);
  assert.ok(text.includes('x'.repeat(1300)+'…'));assert.ok(!text.includes('x'.repeat(1301)));assert.ok(text.endsWith('ID: `12345678`'));
});
test('null and numeric content keep original safe string rendering in summary',()=>{
  assert.match(handoutSummary({...handout(),content:null}),/\*\*\n\n\nID:/);
  assert.match(handoutSummary({...handout(),content:0}),/\n0\n\nID:/);
});
