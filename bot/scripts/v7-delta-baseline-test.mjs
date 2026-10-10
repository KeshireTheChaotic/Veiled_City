/** D00 red-first structural integration audit for the retained v7 delta. */
import assert from "node:assert/strict";
import fs from "node:fs";

const failures=[];
const read=name=>fs.readFileSync(new URL(`../src/${name}`,import.meta.url),"utf8");
function check(id,fn){try{fn();console.log(`${id} PASS`);}catch(error){failures.push({id,error:error.message});}}
check("F08-roll-request-identity-includes-accepted-action",()=>{
  assert(!read("roll-requests.js").includes("cityKey(`roll:${source.event_key}`)"),"request identity aliases every action in one source");
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
  assert(/openActionWindow|joinActionWindow/.test(live),"scene window service is not called by live orchestration");
});
check("F13-consequence-reconciliation-is-strict",()=>{
  assert(/reconcileConsequences\([^;]+strict:true/s.test(read("turn-orchestration.js")),"production reconciliation remains permissive");
});
if(failures.length){console.error(`V7_DELTA_RED ${JSON.stringify(failures)}`);process.exit(1);}
console.log("v7 delta integration baseline PASS.");
