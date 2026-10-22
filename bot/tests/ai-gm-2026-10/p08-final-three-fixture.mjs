import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {currentScene,recordScenePresence} from '../../src/scene-continuity.js';
import {indexWorldEvent} from '../../src/city-calendar.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const botRoot=path.resolve(here,'../..');
export function createP08ThreeFixture({owners=2}={}){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'veiled-p08-three-'));
  const dbPath=path.join(directory,'campaign.sqlite');
  let db=new VeiledDB(dbPath,path.join(botRoot,'sql','schema.sql'));
  const guild='p08-final-three-guild';db.ensureCampaign(guild);
  db.setCityCalendar(guild,{flags:{playable_narration:true,narrative_authority:true,narrative_camera:true,scene_continuity:true}});
  const location='harbor-desk';db.setSimulationEntity(guild,'location',location,{name:'Harbor Desk',place_type:'public',visibility:'party'});
  const session=db.startSession(guild,'Final corrections','auto');
  const pcs=[];
  for(let index=0;index<owners;index++){
    const user=`owner-${String.fromCharCode(97+index)}`,name=`Mara ${String.fromCharCode(65+index)}`;
    db.upsertPlayer(guild,user,name);const pc=db.createCharacter(guild,user,name,{location,background:`PRIVATE_THREAD_${user}`,entry_hooks:[`PLAYER_THREAD_${user}`]});
    db.setPresence(session.id,user,'present');db.assignCharacter(session.id,user,pc.id);
    const scene=currentScene(db,guild),arrival=indexWorldEvent(db,guild,{key:`fixture-arrival-${user}`,kind:'arrival',title:'Owner-authorized arrival',
      source_id:`player:${user}`,visibility:'party',session_id:session.id,scene:scene.key,location_key:location,truth_status:'observed',
      details:{entity_type:'character',entity_key:pc.id,author:user}},user);
    recordScenePresence(db,guild,{source_event:arrival.event_key,entity_type:'character',entity_key:pc.id,location_key:location,
      state:'actually_present',visibility:'party',accepted_by:user},user);
    pcs.push({user,name,pc});
  }
  return {db,guild,session,pcs,location,directory,dbPath,
    close(){try{db.close();}finally{fs.rmSync(directory,{recursive:true,force:true});}},
    get dbPath(){return dbPath;},
    reopen(){db.close();db=new VeiledDB(dbPath,path.join(botRoot,'sql','schema.sql'));return db;},
    get db(){return db;}};
}
