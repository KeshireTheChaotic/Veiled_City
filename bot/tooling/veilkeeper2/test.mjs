// Explicit opt-in selector: never discovers or executes inherited suites.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import {hash} from './source-audit.mjs';
const bot=fileURLToPath(new URL('../../',import.meta.url));
const output=new URL('../../../docs/veilkeeper2/',import.meta.url);
const paths=['tooling/veilkeeper2/source-audit.mjs','tooling/veilkeeper2/inventory.mjs','tooling/veilkeeper2/test.mjs','tests/veilkeeper2/r0-audit.test.mjs'];
const inputs=paths.map(path=>({path,sha256:hash(fs.readFileSync(new URL('../../'+path,import.meta.url)))}));
const started=new Date().toISOString();
const result=spawnSync(process.execPath,['--test','tests/veilkeeper2/r0-audit.test.mjs'],{cwd:bot,encoding:'utf8'});
fs.writeFileSync(new URL('R0_TEST_OUTPUT.txt',output),(result.stdout??'')+(result.stderr??''));
fs.writeFileSync(new URL('R0_TEST_EVIDENCE.json',output),JSON.stringify({run_id:started,started,ended:new Date().toISOString(),command:'node --test tests/veilkeeper2/r0-audit.test.mjs',node:process.version,inputs,exitCode:result.status,signal:result.signal,error:result.error?.message??null},null,2)+'\n');
console.log(result.stdout);
if(result.stderr)console.error(result.stderr);
process.exitCode=result.status??1;
