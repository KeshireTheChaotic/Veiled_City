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
  for(const id of ['narrative-contract-test','v96-semantic-output-p0-test','v9-pvp-authorship-test','v94-pc-effect-authority-test',
    'v94-pvp-damage-test','v94-pc-death-test','v94-pc-recovery-test','v9-pvp-hope-fear-test','v95-autonomous-fear-test',
    'memory-audience-isolation-test','v9-publication-test','historical-archive-test','h05-discord-delivery-test',
    'd08-window-security-test','d08-observability-test','movement-authorization-regression-test','legacy-authority-migration-test',
    'pre-roll-fear-test','pre-roll-fear-recovery-test','pre-roll-fear-integration-test'])
    assert(critical.suites.includes(id),`mandatory security/native gate: ${id}`);
  for(const id of extended.suites)assert(fs.existsSync(`scripts/${id}.mjs`),id);
});
