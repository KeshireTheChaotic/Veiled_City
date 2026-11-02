import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveSchema,migrationAdditions} from '../../tooling/veilkeeper2/schema-audit.mjs';

test('extracts direct and loop schema additions without executing migration code',()=>{
  const source=`class Store { migrateSchema(){
    dangerousExternalCall();
    const add=()=>{};
    for(const [name,def] of [['archived','INTEGER NOT NULL DEFAULT 0'],['source','TEXT']]) add('facts',name,def);
    add('facts','confidence','INTEGER DEFAULT 100');
  } }`;
  const extracted=migrationAdditions(source);
  assert.equal(extracted.unresolved.length,0);assert.equal(extracted.additions.length,3);
  const result=effectiveSchema('CREATE TABLE facts(id TEXT PRIMARY KEY, source TEXT);',source);
  assert.equal(result.additions.filter(a=>!a.alreadyInBaseSchema).length,2);
  assert.deepEqual(result.tables[0].columns.map(c=>c.name),['id','source','archived','confidence']);
});
test('unresolved migration expressions stop schema claims rather than dropping columns',()=>{
  const source="class Store { migrateSchema(){ add('facts',unknown(),'TEXT'); } }";
  assert.equal(migrationAdditions(source).unresolved.length,1);
  assert.throws(()=>effectiveSchema('CREATE TABLE facts(id TEXT);',source),/Unresolved schema additions/);
});
test('migration identifiers cannot escape the isolated schema statement',()=>{
  assert.throws(()=>effectiveSchema('CREATE TABLE facts(id TEXT);',`class Store { migrateSchema(){ add('facts; DROP TABLE facts','x','TEXT'); } }`),/Invalid migration identifier/);
});
