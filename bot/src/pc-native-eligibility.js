export {hopeCap} from './frameworks/daggerheart/public.js';
/** Execution eligibility is separate from conversational understanding and read-only owner ancestry. */
import {validatePcDeathOutcome} from "./pc-death.js";
function fail(message){throw Object.assign(new Error(message),{code:"PC_NATIVE_ELIGIBILITY",expected:true});}
function standingRecovery(pc,db,guild){
  if(!db||pc?.data.death_state?.status!=="recovered")return false;
  const outcome=validatePcDeathOutcome(db,guild,`${pc.data.death_state.request}:outcome`);
  return outcome.status==="resolved"&&outcome.data.character===pc.id&&outcome.data.move==="risk_it_all"
    &&outcome.data.allocation?.hp===0&&outcome.data.allocation.after.data.resources.hp.current===pc.data.resources.hp.current;
}
export function assertPcCanAct(pc,db=null,guild=pc?.guild_id){
  const state=pc?.data.death_state?.status,hp=pc?.data.resources?.hp;
  if(!pc||!["active","reserve","guest"].includes(pc.status)||["unconscious","dead","journey_ended","blaze_pending","allocate_recovery"].includes(state)
    ||hp?.max>0&&hp.current>=hp.max&&!standingRecovery(pc,db,guild))fail("PC cannot act while unconscious, dead or awaiting their native death workflow.");
  return pc;
}
export function assertPcAttackable(pc,db=null,guild=pc?.guild_id){
  const hp=pc?.data.resources?.hp;
  if(!Number.isSafeInteger(hp?.max)||hp.max<1||hp.max>12||!Number.isSafeInteger(hp.current)||hp.current<0||hp.current>hp.max)
    fail("Verified initialized PC HP required before native attack dice.");
  if(!pc||!["active","reserve","guest"].includes(pc.status)||pc.data.death_state?.status==="unconscious"
    ||pc.data.resources?.hp?.max>0&&pc.data.resources.hp.current>=pc.data.resources.hp.max&&!standingRecovery(pc,db,guild))
    fail("PC cannot be attacked while unconscious, dead or awaiting their native death workflow.");
  return pc;
}
