/** Registry-only critical gate audit. Does not execute suites or erase historical assertions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('scripts/validate-offline.mjs','utf8'),prefix=source.slice(source.indexOf('const suites='),source.indexOf('const report='));
const inventory=argv=>new Function('process',`${prefix};return {suites,extendedSuiteInventory,validationProfile};`)({argv});
test('critical profile keeps acceptance and native/security gates; extended retains every registration',()=>{
  const critical=inventory([]),extended=inventory(['--extended']);
  assert(critical.suites.length<extended.suites.length);assert.deepEqual(extended.suites,extended.extendedSuiteInventory);
  const acceptance=JSON.parse(fs.readFileSync('scripts/fixtures/i-heard-you-acceptance.json','utf8'));
  for(const row of acceptance)for(const id of row.suites)assert(critical.suites.includes(id),`${row.id}: ${id}`);
  for(const id of ['h05-discord-delivery-test','d08-observability-test','legacy-authority-migration-test','pre-roll-fear-recovery-test'])
    assert(critical.suites.includes(id),`mandatory security/native gate: ${id}`);
  for(const id of extended.suites)assert(fs.existsSync(`scripts/${id}.mjs`),id);
});
