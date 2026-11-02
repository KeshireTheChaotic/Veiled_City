import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {expansionStatus} from '../../src/application/workflows/expansion-status.js';
import {EXPANSION_FEATURES} from '../../src/frameworks/narrative/public.js';

const root=new URL('../../src/',import.meta.url);
const source=path=>fs.readFileSync(fileURLToPath(new URL(path,root)),'utf8');

test('Application assembles the original GM-only expansion status from read-only sources',()=>{
  const guild='guild-expansion-status',calls=[];
  const flags={roll_collaboration:true,roll_requests:'true'};
  const records={roll_request:2,scene_presence:1};
  const db=new Proxy({}, {get(_target,name){
    if(name==='getCityCalendar')return id=>{calls.push(['getCityCalendar',id]);return {flags};};
    if(name==='schemaVersion')return ()=>{calls.push(['schemaVersion']);return 460;};
    if(name==='cityRecordCounts')return id=>{calls.push(['cityRecordCounts',id]);return records;};
    throw new Error(`unexpected database access: ${String(name)}`);
  }});

  const result=expansionStatus(db,guild);
  assert.deepEqual(calls,[['getCityCalendar',guild],['schemaVersion'],['cityRecordCounts',guild]]);
  assert.deepEqual(result.features,Object.entries(EXPANSION_FEATURES).map(([flag,contract])=>({
    flag,enabled:flags[flag]===true,default:false,...contract
  })));
  assert.deepEqual(result,{visibility:'gm',schema_version:460,features:result.features,records,
    bounds:{director_actions:{round:1,scene:3,downtime:4},institution_actions:2,materialized_density_candidates:32,density_packets:4,
      density_packet_characters:12000,density_total_characters:24000,consequence_event_window:50,consequence_subscriptions:20},
    recovery:'Disabling flags stops new extension opportunities, not already queued native actions. Review/cancel queued actions; preserve evidence. Backup before upgrades; explicit snapshots restore state.',
    authority:'Recorded configuration/counts only, not proof of narrative quality or live deployment; no reads advance time.'});
  assert.equal(result.features.find(feature=>feature.flag==='roll_requests').enabled,false);
});

test('expansion read failures preserve identity and stop subsequent database reads',()=>{
  const failure=new Error('campaign read failed'),calls=[];
  const db={getCityCalendar(){calls.push('calendar');throw failure;},schemaVersion(){calls.push('schema');},cityRecordCounts(){calls.push('counts');}};
  let caught;try{expansionStatus(db,'guild');}catch(error){caught=error;}
  assert.equal(caught,failure);
  assert.deepEqual(calls,['calendar']);
});

test('story command retains its GM guard and private response around the Application workflow',()=>{
  const path='story-commands.js',text=source(path);
  assert.equal(fs.existsSync(fileURLToPath(new URL(path,root))),true);
  assert.match(text,/import\s*\{\s*expansionStatus\s*\}\s*from\s*["']\.\/application\/workflows\/expansion-status\.js["']/);
  assert.equal(text.includes('./expansion-contracts.js'),false);
  assert.equal(fs.existsSync(fileURLToPath(new URL('expansion-contracts.js',root))),false);
  assert.ok(text.indexOf('ManageGuild')<text.indexOf('expansionStatus(db,guild)'));
  assert.match(text,/ephemeral:true,allowedMentions:\{parse:\[\]\}/);
});
