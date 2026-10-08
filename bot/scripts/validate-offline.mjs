/** Required suites run in network-denied child processes with dummy credentials. */
import { spawnSync } from "node:child_process";
const suites=["quality-check","format-check","check-source","validate-command-schema","offline-smoke-test","production-regression-test",
  "refactor-regression-test","operations-regression-test","npc-cognition-regression-test","audit-regression-test","simulation-regression-test",
  "seed-data-regression-test","city-regression-test","city-core-regression-test","city-civic-regression-test","city-depth-regression-test","narrative-contract-test",
  "context-conversation-test","story-continuity-test"];
for(const suite of suites){
  const result=spawnSync(process.execPath,["--import","./scripts/offline-guard.mjs",`scripts/${suite}.mjs`],{stdio:"inherit",
    env:{...process.env,OPENAI_API_KEY:"offline-dummy",DISCORD_TOKEN:"offline-dummy"}});
  if(result.error) throw result.error;
  if(result.status!==0) process.exit(result.status||1);
}
console.log("Required validation PASS: network denied; zero live API requests or billable tokens.");
