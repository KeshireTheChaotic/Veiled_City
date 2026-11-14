import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {inspectR0Coverage} from '../../tooling/veilkeeper2/r0-phase-contract.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),read=name=>JSON.parse(fs.readFileSync(new URL('../../../docs/veilkeeper2/'+name+'.json',import.meta.url),'utf8')),audit=read('R0_PHASE_ACCEPTANCE'),map=read('R0_PHASE_PRESERVATION_MAP'),graph=read('R0_SOURCE_RECEIPT_GRAPH'),refs=read('R0_VERIFIED_REFERENCES');
test('actual R0 inventory covers every immutable source file and resolved public endpoint at both revisions',()=>{
 for(const version of audit.versions){const files=execFileSync('git',['ls-tree','-r','--name-only',version.revision,'bot/src'],{cwd:root,encoding:'utf8'}).trim().split('\n'),rows=map.entries.filter(r=>r.source.revision===version.revision),modules=rows.filter(r=>r.id.startsWith('module:')),g=graph.versions.find(v=>v.revision===version.revision);
  assert.deepEqual(modules.map(r=>r.source.file).sort(),files.sort());assert.equal(modules.length,version.sourceFiles);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);assert.equal(g.publics.length,version.publics);assert.equal(rows.filter(r=>r.id.startsWith('public:')).length,g.publics.length);assert.ok(g.publics.every(r=>['definition','namespace','external'].includes(r.resolution.status)));assert.equal(g.commands.length,219);assert.ok(g.commands.every(r=>r.branches.length));assert.equal(g.schema.tables.length,55);assert.equal(g.legacyTests.length,version.legacyTestArtifacts);assert.ok(g.legacyTests.every(r=>r.status==='inventory-only-not-executed'));
 }
 assert.equal(audit.status,'complete');assert.equal(audit.legacyDeletionAuthorized,false);assert.equal(audit.deletions,0);
});
test('actual opaque record and injected contracts remain blockers with exact source locations',()=>{
 assert.equal(graph.blockers.length,audit.blockers);assert.ok(graph.blockers.length>0);assert.deepEqual(inspectR0Coverage({expected:map.entries.map(r=>r.id),entries:map.entries,blockers:graph.blockers}).errors,[]);
 for(const g of graph.versions){const blockers=graph.blockers.filter(b=>b.source.revision===g.revision),dynamic=g.recordUses.filter(r=>r.kind===null);assert.equal(blockers.filter(b=>b.id.startsWith('record:')).length,dynamic.length);assert.equal(blockers.filter(b=>b.id.startsWith('binding:')).length,g.bindings.length);}
});
test('all handoff citations have exact corrected locations at both revisions without hiding the original errors',()=>{
 assert.equal(refs.length,270);for(const r of refs){assert.match(r.verified.fileSha256,/^[a-f0-9]{64}$/);if(r.verified.start){assert.ok(r.verified.end>=r.verified.start);assert.match(r.verified.rangeSha256,/^[a-f0-9]{64}$/);}}
 assert.equal(refs.filter(r=>r.correction).length,29);assert.equal(refs.filter(r=>r.correction?.includes('moved')).length,5);
});
