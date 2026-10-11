/** PVP12: the post-commit typed roll adapter cannot turn a gated PC conflict into an unrelated native roll. */
import assert from "node:assert/strict";
import { nativeFixture } from "./v9-fixtures.mjs";
import { configureCityFlags } from "../src/city-core.js";
import { captureDeclaration } from "../src/player-language.js";
import { prepareRollRequest } from "../src/roll-requests.js";
import { resolveTypedNativeRolls } from "../src/typed-mechanics.js";

await nativeFixture(f=>{
  configureCityFlags(f.db,f.guild,{roll_requests:true,roll_collaboration:true},"gm");
  const pc=f.pcs[0],source=captureDeclaration(f.db,f.guild,pc.owner_user_id,pc.id,"unrelated-search","I try inspecting the terminal.");
  const request=prepareRollRequest(f.db,f.guild,{source_event:source.event_key,character_id:pc.id,trait:"Knowledge",kind:"action",
    modifier_keys:[],difficulty_source:"",adjudication:"Inspect the terminal."},"gm");
  const before=f.db.getCharacter(pc.id).data.resources;
  const results=resolveTypedNativeRolls(f.db,f.guild,{mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id},
    [{type:"roll",operation:"roll",resolution:"roll_required",framing:"immediate",source_span:"I roll to kick Choso.",target_key:f.pcs[1].id}],"new-pc-conflict");
  assert(!results.some(row=>row.status==="accepted"),"gated PC targeting must not consume a sole unrelated pending request");
  assert.equal(f.db.getCityRecord(f.guild,"roll_request",request.record_key).status,"pending");
  assert.deepEqual(f.db.getCharacter(pc.id).data.resources,before);
});
console.log("PVP12 typed roll adapter PASS: gated PC attempt cannot roll, spend or consume an unrelated native request.");
