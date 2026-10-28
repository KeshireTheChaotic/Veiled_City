/** D00 red-first structural integration audit for the retained v7 delta. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const failures=[];
const read=name=>fs.readFileSync(new URL(`../src/${name}`,import.meta.url),"utf8");
function check(id,fn){try{fn();console.log(`${id} PASS`);}catch(error){failures.push({id,error:error.message});}}
check("F08-roll-request-identity-includes-accepted-action",()=>{
  assert(/input.accepted_intent\s*\?cityKey/.test(read("roll-requests.js")),"typed identity must precede the explicit legacy adapter");
});
check("F10-publisher-consumes-native-adjudications",()=>{
  assert(/mutation\.nativeAdjudications/.test(read("roll-requests.js")),"publisher only scans legacy mutation intents");
});
check("F11-component-interactions-dispatched",()=>{
  const commands=read("commands.js"),index=read("index.js");
  assert(/isButton\(|isStringSelectMenu\(|isModalSubmit\(/.test(commands+index),"no component dispatcher exists");
});
check("F12-scene-windows-wired-to-live-orchestration",()=>{
  const live=read("turn-orchestration.js")+read("state.js")+read("index.js");
  assert(/coordinateTypedActionWindows\(db,guildId,typedIntents,actionPlan\)/.test(live),"live state must call the coordination bridge");
});
check("F13-consequence-reconciliation-is-strict",()=>{
  assert(/reconcileConsequences\([^;]+strict:true/s.test(read("turn-orchestration.js")),"production reconciliation remains permissive");
});
if(failures.length){console.error(`V7_DELTA_RED ${JSON.stringify(failures)}`);process.exit(1);}
console.log("v7 delta integration baseline PASS.");
