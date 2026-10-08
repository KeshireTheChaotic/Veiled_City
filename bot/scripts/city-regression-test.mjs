/** Living City deterministic migration, time, provenance, review and privacy regressions. No live API calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { VeiledDB } from "../src/db.js";
import { calendarStatus, configureCalendar, indexWorldEvent, scheduleCityEvent, reviewCityEvent } from "../src/city-calendar.js";
import { buildCommands, handleCommand } from "../src/commands.js";

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"vc-city-"));
const db=new VeiledDB(path.join(temp,"test.sqlite"),path.resolve("sql/schema.sql"));
const started=performance.now(), guild="city-a";
try{
  db.ensureCampaign(guild);db.ensureCampaign("city-b");
  assert.equal(calendarStatus(db,guild).mode,"relative");
  assert.equal(calendarStatus(db,guild).datetime,null);
  assert(buildCommands().some(command=>command.name==="vc-city"));
  configureCalendar(db,guild,{epoch:"2030-01-01T00:00:00Z",timezone:"UTC"});
  const frozen=calendarStatus(db,guild);
  assert.equal(calendarStatus(db,guild).minute,frozen.minute,"reading/host uptime cannot advance time");
  assert.throws(()=>configureCalendar(db,guild,{epoch:"2031-01-01T00:00:00Z"}),/epoch/);
  scheduleCityEvent(db,guild,{key:"hearing",title:"Tuesday 09:00 hearing",due_at:"2030-01-01T09:00:00Z"});
  scheduleCityEvent(db,guild,{key:"hearing",title:"Ignored retry",due_minute:50});
  db.advanceSimulationClock(guild,{ticks:12});
  assert.equal(db.getCitySchedule(guild,"hearing").status,"scheduled","opportunities are not minutes");
  db.advanceSimulationClock(guild,{minutes:539});
  assert.equal(db.getCitySchedule(guild,"hearing").status,"scheduled");
  const before=db.snapshotCampaign(guild,{label:"Before due"});
  db.advanceSimulationClock(guild,{minutes:1});db.advanceSimulationClock(guild,{minutes:0});
  assert.equal(db.getCitySchedule(guild,"hearing").status,"fired");
  assert.equal(db.listWorldEvents(guild,{includeGM:true}).filter(row=>row.event_key==="schedule:hearing").length,1);
  assert.equal(db.listWorldEvents(guild).length,0);
  assert.equal(db.listWorldEvents("city-b",{includeGM:true}).length,0);
  const deadline=db.getWorldEvent(guild,"schedule:hearing");
  assert(db.getMutation(guild,deadline.source_id));
  assert.throws(()=>indexWorldEvent(db,"city-b",{key:"leak",title:"Leak",source_kind:"event",source_id:deadline.event_key}),/Source/);
  assert.throws(()=>indexWorldEvent(db,guild,{key:"leak",title:"Leak",source_kind:"event",source_id:deadline.event_key,visibility:"party"}),/visibility/);
  indexWorldEvent(db,guild,{key:"claim",title:"Witness interpretation",source_kind:"gm",source_id:"Witness notes",truth_status:"asserted"});
  indexWorldEvent(db,guild,{key:"claim",status:"retracted"});
  assert.equal(db.getWorldEvent(guild,"claim").status,"retracted");
  assert.equal(db.listCanon(guild,{includeGM:true}).length,0);
  scheduleCityEvent(db,guild,{key:"major",title:"Review major proposal",due_minute:1,major:true});
  db.advanceSimulationClock(guild,{minutes:1});
  assert.equal(db.getCitySchedule(guild,"major").status,"scheduled");
  reviewCityEvent(db,guild,{key:"major",decision:"defer"},"gm");
  db.advanceSimulationClock(guild,{minutes:1});
  assert.equal(db.getCitySchedule(guild,"major").status,"scheduled");
  reviewCityEvent(db,guild,{key:"major",decision:"reject"},"gm");
  assert.equal(db.getCitySchedule(guild,"major").status,"cancelled");
  scheduleCityEvent(db,guild,{key:"notice",title:"Known appointment",due_minute:1,visibility:"party",hook:"The agreed consultation is due."});
  db.advanceSimulationClock(guild,{minutes:1});
  const hook=db.getSimulationRecord(guild,`city-hook:${guild}:notice`);
  assert.equal(hook.status,"ready");
  db.advanceSimulationClock(guild,{minutes:1});
  assert.equal(db.getSimulationRecord(guild,hook.id).status,"ready","unpublished hooks remain retryable without regenerating mutations");
  db.restoreSnapshot(guild,before.id);
  assert.equal(db.getCitySchedule(guild,"hearing").status,"scheduled");
  db.advanceSimulationClock(guild,{minutes:1});
  assert.equal(db.getCitySchedule(guild,"hearing").status,"fired");
  const backup=db.createBackup(guild);assert(backup.state.tables.world_events.length);
  db.restoreBackup(guild,backup.id);
  assert.equal(db.getCitySchedule(guild,"hearing").status,"fired");
  const interaction={id:"city-denied",commandName:"vc-city",guildId:guild,guild:{id:guild},user:{id:"player",username:"Player"},
    memberPermissions:{has:()=>false},member:{roles:{cache:{has:()=>false}}},isChatInputCommand:()=>true,
    options:{getSubcommand:()=>"status"},reply:async payload=>{assert(payload.ephemeral);assert.match(payload.content,/GM\/admin/);}};
  await handleCommand(interaction,{db,gm:null});
  for(let i=0;i<25;i++) scheduleCityEvent(db,guild,{key:`backlog-${i}`,title:"Bounded deadline",due_minute:0});
  db.advanceSimulationClock(guild,{minutes:0});
  assert.equal(db.dueCitySchedules(guild).length,5);
  db.advanceSimulationClock(guild,{minutes:0});
  assert.equal(db.dueCitySchedules(guild).length,0);
  const time=performance.now()-started;
  console.log(`Living City regressions PASS; ${time.toFixed(1)}ms; calendar/event processing uses 0 model calls; due budget 20.`);
}finally{
  db.close();fs.rmSync(temp,{recursive:true,force:true});
}
