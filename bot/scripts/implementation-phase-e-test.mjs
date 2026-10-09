/** Phase E contracts: longitudinal fixtures, privacy-safe metrics and behavior-locked pipeline interfaces. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateImplementationPack } from "../src/evaluation-harness.js";
import { OperationalMetrics } from "../src/operational-metrics.js";
import { TurnPipeline } from "../src/turn-pipeline.js";

const pack=JSON.parse(fs.readFileSync(new URL("./fixtures/implementation-evaluation.json",import.meta.url),"utf8"));
const report=evaluateImplementationPack(pack);assert.equal(report.sample_size,12);assert.equal(report.scene_count,3);assert.deepEqual(report.failures,[]);
const metrics=new OperationalMetrics(),order=[];
const stages=Object.fromEntries(["capture","generate","validate","commit","publish"].map(name=>[name,async value=>{order.push(name);return {...value,[name]:true};}]));
const complete=await new TurnPipeline({metrics,stages}).execute({turn:true});
assert.deepEqual(order,["capture","generate","validate","commit","publish"]);assert.equal(complete.publish,true);
for(const fault of pack.faults){
  const seen=[],faultMetrics=new OperationalMetrics(),faultStages=Object.fromEntries(["capture","generate","validate","commit","publish"].map(name=>[name,async value=>{
    seen.push(name);if(name===fault.stage)throw Object.assign(new Error("injected"),{code:`FAULT_${name.toUpperCase()}`});return value;} ]));
  await assert.rejects(()=>new TurnPipeline({metrics:faultMetrics,stages:faultStages}).execute({}),new RegExp("injected"));
  assert.equal(seen.at(-1),fault.stage,"pipeline stops at the failed authority boundary");
}
metrics.record("model_request",{durationMs:25,inputChars:100,inputTokens:20,outputTokens:10});
const serialized=JSON.stringify(metrics.snapshot());assert(!serialized.includes("player secret"));assert(serialized.includes("Aggregate counts"));
console.log(`Implementation Phase E PASS: ${report.sample_size} turns across ${report.scene_count} scenes, ${report.fault_cases} fault stages, privacy-safe metrics and pipeline boundaries; zero live calls.`);
