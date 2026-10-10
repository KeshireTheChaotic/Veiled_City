/** D00-H05 Discord message-boundary regressions. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { splitDiscordText } from "../src/discord/chunking.js";

const failures=[];
function check(id,fn){try{fn();console.log(`${id} PASS`);}catch(error){failures.push({id,error:error.message});}}
check("S2-01-assembly-whole-payload-under-discord-limit",()=>{
  const compactStatus="x".repeat(1900);
  const delivery="Choso Calesh: DM, Tyrell Williams: DM, Billy Corgie: DM";
  const reply=`Convergence scene launched in the play channel.\n\n${compactStatus}\n\nPrivate hook delivery: ${delivery}`;
  const parts=splitDiscordText(reply);
  assert(parts.length>1,"Oversize assembly reply should use follow-up parts");
  assert(parts.every(part=>part.length<=1900));
});
check("S2-02-session-end-does-not-send-unbounded-recap",()=>{
  const source=fs.readFileSync(new URL("../src/commands.js",import.meta.url),"utf8");
  assert(!source.includes("await interaction.editReply(`**Session ${s.session_number} ended.**\\n\\n${recap}`)"),
    "session end sends the full recap in one editReply");
});
check("S2-03-dm-fallback-uses-common-chunker",()=>{
  const source=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
  assert(!/member\.send\(text\)/.test(source),"DM fallback sends unbounded text directly");
});
if(failures.length){console.error(`MESSAGE_CONTRACT_RED ${JSON.stringify(failures)}`);process.exit(1);}
console.log("Session 2 Discord message contract PASS.");
