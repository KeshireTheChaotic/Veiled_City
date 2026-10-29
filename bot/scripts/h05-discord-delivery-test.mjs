/** H05 Discord UTF-16 payload, interaction follow-up and assembly-part idempotency regression. */
import assert from "node:assert/strict";
import { splitDiscordText } from "../src/discord/chunking.js";
import { deliverInteractionText } from "../src/discord/delivery.js";
import { deliverAssemblyParts } from "../src/application/workflows/assembly-delivery.js";

const longFence=`Intro\n\`\`\`js\n${"const value = '😀';\n".repeat(180)}\`\`\`\nDone`;
const chunks=splitDiscordText(longFence,1900);
assert(chunks.length>1);
for(const chunk of chunks){
  assert(chunk.length<=1900);
  assert.equal((chunk.match(/```/g)||[]).length%2,0,"Each Discord message has balanced code fences");
  const last=chunk.charCodeAt(chunk.length-1);
  assert(!(last>=0xd800&&last<=0xdbff),"A chunk never ends with half a surrogate pair");
}
const mentionChunks=splitDiscordText(`${"x".repeat(1888)}<@123456789012345678> tail`,1900);
assert(mentionChunks.every(chunk=>!chunk.includes("<@")||chunk.includes(">")),"Discord mentions remain intact");

const calls=[];
const interaction={deferred:true,replied:false,
  editReply:async payload=>calls.push(["edit",payload]),followUp:async payload=>calls.push(["follow",payload])};
await deliverInteractionText(interaction,"x".repeat(4200),{ephemeral:true});
assert.equal(calls[0][0],"edit");assert(calls.slice(1).every(row=>row[0]==="follow"));
assert(calls.every(row=>row[1].content.length<=1900));

let plan={public_opening:"p".repeat(2500),character_entries:[{discord_user_id:"u1",character_name:"One",private_hook:"h".repeat(2500)}]};
const sent=[];
const save=next=>{plan=structuredClone(next);};
const first=await deliverAssemblyParts({plan,savePlan:save,
  sendPublic:async content=>{sent.push(`public:${content.length}`);return {id:`p${sent.length}`};},
  sendPrivate:async(user,content)=>{sent.push(`private:${user}:${content.length}`);return {ok:true,via:"dm"};}});
assert.equal(first.failed.length,0);assert(first.delivered.length>=4);
const before=sent.length;
const replay=await deliverAssemblyParts({plan,savePlan:save,
  sendPublic:async content=>{sent.push(`public:${content.length}`);return {id:"duplicate"};},
  sendPrivate:async(user,content)=>{sent.push(`private:${user}:${content.length}`);return {ok:true,via:"dm"};}});
assert.equal(sent.length,before,"Delivered assembly parts are not sent twice");
assert.equal(replay.delivered.length,0);

let interrupted={public_opening:"opening",character_entries:[]},attempts=0;
const saveInterrupted=next=>{interrupted=structuredClone(next);};
const failed=await deliverAssemblyParts({plan:interrupted,savePlan:saveInterrupted,
  sendPublic:async()=>{attempts++;throw new Error("unknown delivery result");},sendPrivate:async()=>({ok:true})});
assert.equal(failed.uncertain.length,1);
await deliverAssemblyParts({plan:interrupted,savePlan:saveInterrupted,
  sendPublic:async()=>{attempts++;return {id:"duplicate"};},sendPrivate:async()=>({ok:true})});
assert.equal(attempts,1,"An ambiguous failed send is not automatically duplicated");

console.log("H05 Discord delivery PASS: bounded UTF-16/fenced chunks, interaction follow-ups and replay-safe assembly parts.");
