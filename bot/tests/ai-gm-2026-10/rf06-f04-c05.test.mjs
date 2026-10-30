import test from 'node:test';
import assert from 'node:assert/strict';
import {formatSheet,encounterSummary} from '../../src/frameworks/discord/command-record-text.js';
import {formatSheet as publicSheet,encounterSummary as publicEncounter} from '../../src/frameworks/discord/public.js';

test('public views use one implementation and missing records keep existing responses',()=>{
  assert.equal(publicSheet,formatSheet);assert.equal(publicEncounter,encounterSummary);
  assert.equal(formatSheet(null),'No character found.');assert.equal(encounterSummary(null),'No planned or active encounter.');
});
test('zero resources and mixed experience formats render without inventing default resources',()=>{
  const pc={name:'Mara',status:'guest',is_guest:true,data:{class:'Rogue',subclass:'Nightwalker',ancestry:'Human',community:'Slyborne',level:2,domains:['Grace','Midnight'],resources:{hp:{current:0,max:5},stress:{current:0,max:6},hope:0,armor:{current:0,max:2}},experiences:['Night Watch',{name:'Archivist',modifier:0}]}},before=structuredClone(pc);
  assert.equal(formatSheet(pc),'**Mara** — Rogue (Nightwalker)\nHuman • Slyborne • Level 2\nDomains: Grace, Midnight\nHP 0/5 • Stress 0/6 • Hope 0 • Armor 0/2\nExperiences: Night Watch; Archivist +0\nStatus: guest (guest)');assert.deepEqual(pc,before);
});
test('partial sheet retains unknown/unset labels and default stress maximum',()=>{
  assert.equal(formatSheet({name:'Newcomer',status:'reserve'}),'**Newcomer** — Class unset\nAncestry unset • Community unset • Level 1\nDomains: —\nHP ?/? • Stress ?/6 • Hope ? • Armor ?/?\nStatus: reserve');
});
function encounter(){return {encounter_number:3,status:'planned',pc_count:2,tier:1,style:'standard',difficulty:'hard',base_bp:5,budget_bp:7,spent_bp:6,adjustments:[{delta:2,label:'terrain'},{delta:-1,label:'support'}],composition:[{name:'Crowd',type:'Minion',tier:1,quantity:2,unit_count:8,spent_bp:2},{name:'Watch',type:'Standard',tier:1,quantity:1,spent_bp:4}],environment_name:'Station',objective:'Hold the gate',notes:'Synthetic plan'};}
test('encounter display retains group/body counts, adjustments and budget remainder without mutation',()=>{
  const e=encounter(),before=structuredClone(e),text=encounterSummary(e);
  assert.match(text,/Encounter #3 — PLANNED/);assert.match(text,/remaining \*\*1\*\*/);assert.match(text,/Adjustments: \+2 terrain; -1 support/);
  assert.match(text,/2 group\(s\) \/ 8 bodies/);assert.match(text,/1× — 4 BP/);assert.match(text,/Notes: Synthetic plan/);assert.deepEqual(e,before);
});
test('long encounter text preserves existing 1900-character truncation',()=>{
  const e=encounter();e.notes='long-note '.repeat(500);assert.equal(encounterSummary(e).length,1900);
});
