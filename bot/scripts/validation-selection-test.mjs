/** CI pruning preserves every unique regression and falls back to full qualification for shared inputs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectValidationSuites} from './validation-selection.mjs';
const source=fs.readFileSync('scripts/validate-offline.mjs','utf8'),prefix=source.slice(source.indexOf('const suites='),source.indexOf('const report=')),
  inventory=new Function('process',`${prefix};return suites;`)({argv:[]});
test('docs-only selects static/registry/reporter gates without removing historical registrations',()=>{
  const r=selectValidationSuites(inventory,['README.md','docs/Active_Implementation/NO_DEFERRALS_LEDGER.md','manifest.json']);
  assert.equal(r.mode,'focused');assert.equal(r.suites.length,7);
  for(const id of ['quality-check','format-check','check-source','validate-command-schema','critical-validation-profile-test',
    'v95-validation-reporter-test','validation-selection-test'])assert(r.suites.includes(id));
  assert(inventory.includes('v9-pvp-authorship-test'));assert(inventory.includes('d08-window-security-test'));
});
test('registered test-only changes run the exact behavioral suite and historical assertion guard',()=>{
  const r=selectValidationSuites(inventory,['bot/scripts/v95-protected-narrative-test.mjs']);
  assert.equal(r.mode,'focused');assert(r.suites.includes('v95-protected-narrative-test'));
  assert(r.suites.includes('v95-deprecation-coverage-test'));assert.equal(r.suites.length,9);
});
test('shared code, fixtures, rules, workflows, unknown or deleted tests always run every current critical suite',()=>{
  for(const file of ['bot/src/db.js','bot/sql/schema.sql','bot/scripts/fixtures/case.json','content/GM/rules.md',
    '.github/workflows/offline-validation.yml','bot/package-lock.json','bot/scripts/unknown-test.mjs',
    'bot/scripts/validation-selection.mjs','bot/scripts/validate-offline.mjs']){
    const r=selectValidationSuites(inventory,[file]);assert.equal(r.mode,'full',file);assert.deepEqual(r.suites,inventory,file);
  }
  for(const paths of [null,undefined,['../outside.md'],['/absolute.md']])assert.deepEqual(selectValidationSuites(inventory,paths).suites,inventory);
  const dirty=selectValidationSuites(inventory,['README.md'],{clean:false});
  assert.equal(dirty.reason,'uncommitted_inputs');assert.deepEqual(dirty.suites,inventory,'HEAD-only diff must not hide local executable edits');
});
