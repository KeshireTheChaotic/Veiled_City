/** Regression tests for the v3.6.0 maintainability/security refactor. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { splitDiscordText } from "../src/discord/chunking.js";
import { VeiledDB } from "../src/db.js";
import { assertGmOnlyChannel, assertPlayerPrivateChannel } from "../src/discord/privacy.js";
import { PermissionFlagsBits } from "discord.js";
import { loadConfig } from "../src/config.js";

function testChunking(){
  for(const n of [1901,3800,5000]){
    const source="x".repeat(n);
    const chunks=splitDiscordText(source,1900);
    assert.equal(chunks.join(""),source,`chunk reconstruction failed for ${n}`);
    assert.ok(chunks.every(c=>c.length<=1900),`oversize chunk for ${n}`);
  }
  const source=("alpha beta gamma\n".repeat(400))+"tail";
  assert.equal(splitDiscordText(source,1900).join(""),source,"natural-boundary chunking must be lossless");
}

function testFactFiltering(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-refactor-"));
  const dbPath=path.join(dir,"test.sqlite");
  const schema=path.resolve("sql/schema.sql");
  const db=new VeiledDB(dbPath,schema);
  const guild="guild-refactor";
  db.ensureCampaign(guild);
  db.addFact(guild,{key:"old-target",content:"needle-from-the-oldest-fact",visibility:"gm",source:"test"});
  for(let i=0;i<510;i++) db.addFact(guild,{key:`new-${i}`,content:`newer fact ${i}`,visibility:"party",source:"test"});
  const rows=db.listFactsForGM(guild,{search:"needle-from-the-oldest-fact",limit:10});
  assert.equal(rows.length,1,"GM fact search must filter before LIMIT");
  assert.equal(rows[0].fact_key,"old-target");
  db.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
}

function testConfigValidation(){
  const previous={...process.env};
  Object.assign(process.env,{
    DISCORD_TOKEN:"test",DISCORD_CLIENT_ID:"test",OPENAI_API_KEY:"test",
    MAX_RECENT_MESSAGES:"not-a-number"
  });
  assert.throws(()=>loadConfig(),/MAX_RECENT_MESSAGES must be a finite number/i);
  process.env.MAX_RECENT_MESSAGES="28";
  process.env.ENCOUNTER_AFTERMATH_MODE="bogus";
  assert.throws(()=>loadConfig(),/ENCOUNTER_AFTERMATH_MODE must be one of/i);
  for(const key of Object.keys(process.env)) if(!(key in previous)) delete process.env[key];
  Object.assign(process.env,previous);
}

function permissionSet({view=false,send=false,manage=false,admin=false}={}){
  return {has(flag){
    if(flag===PermissionFlagsBits.ManageGuild) return manage;
    if(flag===PermissionFlagsBits.Administrator) return admin;
    if(flag===PermissionFlagsBits.ViewChannel) return view;
    if(flag===PermissionFlagsBits.SendMessages) return send;
    return false;
  }};
}

function testPrivacyValidation(){
  const everyone={id:"everyone",name:"@everyone",permissions:permissionSet()};
  const playerRole={id:"player-role",name:"Player",permissions:permissionSet()};
  const gmRole={id:"gm-role",name:"GM",permissions:permissionSet()};
  const bot={id:"bot",permissions:permissionSet()};
  const player={id:"player",permissions:permissionSet(),roles:{cache:new Map([[playerRole.id,playerRole]])}};
  const roles=new Map([[everyone.id,everyone],[playerRole.id,playerRole],[gmRole.id,gmRole]]);
  const members=new Map([[bot.id,bot],[player.id,player]]);
  const guild={roles:{everyone,cache:roles},members:{me:bot,cache:members}};
  const visible=new Map([[everyone.id,false],[playerRole.id,false],[gmRole.id,true],[bot.id,true],[player.id,true]]);
  const channel={
    toString:()=>"#private",
    isTextBased:()=>true,
    permissionOverwrites:{cache:new Map()},
    permissionsFor(subject){return permissionSet({view:visible.get(subject?.id)===true,send:visible.get(subject?.id)===true});}
  };
  assert.equal(assertGmOnlyChannel({guild,channel,gmRoleId:gmRole.id}),true);
  assert.equal(assertPlayerPrivateChannel({guild,channel,userId:player.id,gmRoleId:gmRole.id}),true);
  visible.set(everyone.id,true);
  assert.throws(()=>assertGmOnlyChannel({guild,channel,gmRoleId:gmRole.id}),/visible to @everyone/i);
}

testChunking();
testFactFiltering();
testPrivacyValidation();
testConfigValidation();
console.log("Veilkeeper v4.0.0 refactor regression test: PASS");
