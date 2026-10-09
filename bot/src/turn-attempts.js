/** Durable message-turn lifecycle helpers; stages describe recovery and never authorize fictional consequences. */

export const TURN_STAGES=["received","routed","captured","pre_director","generating","validated","committed","publishing","delivered","needs_recovery","failed"];
const terminal=new Set(["delivered","failed"]);

export function beginTurnAttempt(db,{guildId,messageId,actorPrincipal,sessionId,audience}){
  if(!guildId||!messageId||!actorPrincipal||!sessionId)throw new Error("Durable turn identity requires guild, message, principal and session.");
  return db.beginTurnAttempt({guildId,messageId,actorPrincipal,sessionId,audience});
}

export function advanceTurnAttempt(db,turnId,stage,changes={}){
  if(!TURN_STAGES.includes(stage))throw new Error(`Unknown turn stage: ${stage}`);
  const prior=db.getTurnAttempt(turnId);if(!prior)throw new Error("Turn attempt not found.");
  if(terminal.has(prior.stage)&&prior.stage!==stage)return prior;
  return db.updateTurnAttempt(turnId,{stage,...changes});
}

export function turnFailureNotice(row,reference){
  const ref=reference?` (${reference})`:"";
  if(row?.committed==="yes")return `⚠️ This turn's campaign effects were committed, but delivery or later processing needs recovery${ref}. Do not repeat the action; a GM can inspect the turn receipt.`;
  if(row?.committed==="unknown")return `⚠️ This turn stopped while commit status was uncertain${ref}. Do not repeat a roll, spend, or consequential action until a GM checks the turn receipt.`;
  return `⚠️ Veilkeeper could not complete this turn${ref}. No generated campaign consequences were committed; the saved message can be retried after the issue is resolved.`;
}

export function isTurnReplay(row){return !!row&&["committed","publishing","delivered","needs_recovery"].includes(row.stage);}
