import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {downtimeStatusText,relationshipLine} from '../../src/frameworks/discord/public.js';

test('downtime empty-cycle short circuit and original empty notes/projects text retained',()=>{
  assert.equal(downtimeStatusText(null,null),'No open downtime cycle.');
  assert.equal(downtimeStatusText({label:'Interlude',status:'open'},[]),'**Interlude** — open\nNo submitted projects.');
  assert.equal(downtimeStatusText({label:'Interlude',status:'closed',notes:'Owner notes'},[]),'**Interlude** — closed\nOwner notes\nNo submitted projects.');
});
test('downtime exact ordered project text and original raw values remain unmodified',()=>{
  const cycle={label:'Interlude',status:'open',notes:'**Quoted** notes'},projects=[{id:'1234567890',title:'Archive',project_type:'research',progress:0,max_progress:4,status:'pending'},{id:'abcdefghij',title:'Practice',project_type:'training',progress:3,max_progress:3,status:'done'}],before=structuredClone({cycle,projects});
  assert.equal(downtimeStatusText(cycle,projects),'**Interlude** — open\n**Quoted** notes\n• `12345678` **Archive** [research] — 0/4 — pending\n• `abcdefgh` **Practice** [training] — 3/3 — done');
  assert.deepEqual({cycle,projects},before);
});
test('downtime original UTF16 limit and malformed-input errors retained',()=>{
  const cycle={label:'Long',status:'open',notes:'x'.repeat(2000)};
  assert.equal(downtimeStatusText(cycle,[]),('**Long** — open\n'+cycle.notes+'\nNo submitted projects.').slice(0,1900));
  assert.throws(()=>downtimeStatusText({},null),TypeError);
  assert.throws(()=>downtimeStatusText({},[{}]),TypeError);
  const error=new Error('iterator');assert.throws(()=>downtimeStatusText({},{map(){throw error;}}),e=>e===error);
});
test('relationship exact labels/fallbacks/signed zero/notes and raw markdown retained',()=>{
  const row={id:'1234567890',from_key:'a',to_key:'b',from_label:'Archivist',to_label:'Witness',relationship_type:'trust',score:0,note:'Private **note**'},before=structuredClone(row);
  assert.equal(relationshipLine(row),'• `12345678` **Archivist** — trust (+0) → **Witness** — Private **note**');
  assert.equal(relationshipLine({...row,from_label:'',to_label:null,score:-2,note:''}),'• `12345678` **a** — trust (-2) → **b**');
  assert.deepEqual(row,before);
});
test('relationship original coercion/missing-field/error behavior retained without new validation',()=>{
  assert.equal(relationshipLine({id:'short',score:'3'}),'• `short` **undefined** — undefined (+3) → **undefined**');
  assert.equal(relationshipLine({id:'short',score:NaN}),'• `short` **undefined** — undefined (NaN) → **undefined**');
  assert.throws(()=>relationshipLine(null),TypeError);assert.throws(()=>relationshipLine({id:3}),TypeError);
  const error=new Error('id getter');assert.throws(()=>relationshipLine({get id(){throw error;}}),e=>e===error);
});
test('root keeps original audience filtering, private replies and sanctioned relationship mutations',()=>{
  const s=readFileSync(new URL('../../src/commands.js',import.meta.url),'utf8');
  assert.ok(s.includes("import {downtimeStatusText,relationshipLine} from './frameworks/discord/public.js'"));
  assert.ok(!s.includes('function downtimeStatusText('));assert.ok(!s.includes('function relationshipLine('));
  assert.ok(s.includes('downtimeStatusText(cycle,visibleDowntimeProjects(db,cycle,interaction.user.id,isGM(db,interaction)))'));
  assert.ok(s.includes('rows.slice(0,30).map(relationshipLine).join("\\n").slice(0,1950)'));
  assert.ok(s.includes("sanctionedWorldMutation(db,interaction,isGM,'relationship',()=>db.adjustRelationship"));
  assert.ok(s.includes('owned.has(r.character_id)'));
});
