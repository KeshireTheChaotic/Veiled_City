import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {characterExportFixture} from './helpers/character-export-fixture.mjs';import {gmCharacterExportFixture} from './helpers/gm-character-export-fixture.mjs';
import {characterExportFiles} from '../../src/v2/character-export-formats.js';
const files=f=>f.replies.filter(r=>r.files).flatMap(r=>r.files);
function docx(buffer){const result=spawnSync('python',['-c',"import sys,io,zipfile,json,xml.etree.ElementTree as E\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nassert z.testzip() is None\nfor n in z.namelist():\n if n.endswith('.xml') or n.endswith('.rels'): E.fromstring(z.read(n))\nr=E.fromstring(z.read('word/document.xml'))\nprint(json.dumps({'entries':z.namelist(),'text':''.join(r.itertext())}))"],{input:buffer});assert.equal(result.status,0,result.stderr?.toString());return JSON.parse(result.stdout);}
test('omitted owner format delivers DOCX with current resources and no private fields',async t=>{
 const f=characterExportFixture(t);await f.dispatch(f.event('default-docx',{format:null}));assert.equal(files(f).length,1);assert.equal(files(f)[0].name,'CHARACTER_Mira.docx');const payload=docx(files(f)[0].attachment);assert.ok(payload.entries.includes('[Content_Types].xml'));assert.match(payload.text,/Hope: 3/);assert.match(payload.text,/HP: 2\/6/);assert.equal(payload.text.includes('CANARY'),false);assert.equal(f.inferenceCalls,0);
});
test('owner all formats have exact names and independently valid ZIP/XML without raw GM canaries',async t=>{
 const f=characterExportFixture(t);await f.dispatch(f.event('all',{format:'all'}));assert.deepEqual(files(f).map(x=>x.name),['CHARACTER_Mira.json','CHARACTER_Mira.md','CHARACTER_Mira.docx']);
 const [json,markdown,word]=files(f);assert.equal(JSON.parse(json.attachment).export_meta.visibility,'player_safe');assert.match(markdown.attachment.toString(),/PLAYER SAFE/);assert.equal(files(f).map(x=>x.attachment.toString()).join('').includes('CANARY'),false);docx(word.attachment);assert.deepEqual(f.replies.find(r=>r.files).allowedMentions,{parse:[]});
});
test('GM default all formats retain private hooks, source payloads and pending suggestions across all nine attachments',async t=>{
 const f=gmCharacterExportFixture(t);await f.dispatch(f.event('gm-default',{format:null}));const all=files(f);assert.equal(all.length,9);assert.deepEqual(all.map(x=>x.name),['GM_HOOKS_Mira.json','GM_HOOKS_Mira.md','GM_HOOKS_Mira.docx','GM_PRIVATE_Mira.json','GM_PRIVATE_Mira.md','GM_PRIVATE_Mira.docx','GM_CANON_Mira.json','GM_CANON_Mira.md','GM_CANON_Mira.docx']);
 assert.match(all[1].attachment.toString(),/GM imported hook/);assert.match(all[1].attachment.toString(),/source payload=/);assert.match(docx(all[2].attachment).text,/GM imported hook/);assert.match(all[4].attachment.toString(),/GM-FACT-CANARY/);assert.match(docx(all[5].attachment).text,/GM-FACT-CANARY/);assert.match(all[7].attachment.toString(),/PENDING/);assert.match(docx(all[8].attachment).text,/PENDING/);assert.equal(f.replies[0].defer.flags,64);assert.equal(f.inferenceCalls,0);
});
test('explicit Markdown and DOCX variants preserve per-command scopes',async t=>{
 const owner=characterExportFixture(t);await owner.dispatch(owner.event('md',{format:'markdown'}));assert.deepEqual(files(owner).map(x=>x.name),['CHARACTER_Mira.md']);
 const gm=gmCharacterExportFixture(t);await gm.dispatch(gm.event('docx',{format:'docx'}));assert.equal(files(gm).length,3);assert.ok(files(gm).every(x=>x.name.endsWith('.docx')));for(const f of files(gm))docx(f.attachment);
});
test('lost all-format upload response cannot resend nine private attachments on cold replay',async t=>{
 const f=gmCharacterExportFixture(t);await f.dispatch(f.event('lost-all',{format:null,failReply:true}));assert.equal(files(f).length,9);f.restart();await f.dispatch(f.event('lost-all',{format:null}));assert.equal(files(f).length,9);
});
test('format substitution during final GM refresh suppresses delivery',async t=>{
 const f=gmCharacterExportFixture(t),e=f.event('substitution',{format:'docx'}),get=e.options.getString;f.gmHook(n=>{if(n===2)e.options.getString=k=>k==='format'?'all':get(k);});await f.dispatch(e);assert.equal(files(f).length,0);
});
test('serializer escapes XML metacharacters and drops forbidden control characters while refusing unsupported formats',()=>{
 const payload={name:'Mira <&> "',background:'A\u0001 <tag>& story',export_meta:{status:'active'},resources:{}},file=characterExportFiles('CHARACTER_Test',payload,'player','docx')[0],parsed=docx(Buffer.from(file.base64,'base64'));
 assert.match(parsed.text,/<tag>& story/);assert.equal(parsed.text.includes('\u0001'),false);assert.throws(()=>characterExportFiles('x',payload,'player','exe'),/Supported/);assert.throws(()=>characterExportFiles('x',payload,'unknown','json'),/Supported/);assert.ok(Object.isFrozen(file));
});
