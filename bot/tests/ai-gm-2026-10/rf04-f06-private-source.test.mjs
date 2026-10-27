import './compose-startup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';
import {conversationPrincipal} from '../../src/conversation-principal.js';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {mintNarrativeAudience,revalidateNarrativeAudience} from '../../src/audience-native-v9.js';
import {audienceSurface} from '../../src/frameworks/narrative/public.js';

test('private narrative context excludes another owner and GM-only facts and revalidates its source',t=>{
 const dir=mkdtempSync(join(tmpdir(),'rf04-private-source-f06-')),file=join(dir,'private.sqlite'),
  schema=fileURLToPath(new URL('../../sql/schema.sql',import.meta.url)),db=new VeiledDB(file,schema),guild='private-context-f06';
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 db.ensureCampaign(guild);
 db.setCityCalendar(guild,{flags:{narrative_authority:true,playable_narration:true,narrative_camera:true,narrative_encounters:true}});
 db.upsertPlayer(guild,'ada-f06','Ada');db.upsertPlayer(guild,'noor-f06','Noor');
 const ada=db.createCharacter(guild,'ada-f06','Ada',{pronouns:'she/her'}),noor=db.createCharacter(guild,'noor-f06','Noor',{pronouns:'they/them'}),
  session=db.startSession(guild,'Private context isolation','already_together');
 db.assignCharacter(session.id,'ada-f06',ada.id);db.setPresence(session.id,'ada-f06','present');
 db.assignCharacter(session.id,'noor-f06',noor.id);db.setPresence(session.id,'noor-f06','present');
 const scope={mode:'private',actorUserId:'ada-f06',actorCharacterId:ada.id},principal=conversationPrincipal(db,guild,'ada-f06',ada.id),
  privateSource=indexWorldEvent(db,guild,{key:'ada-private-narrative-f06',kind:'ai_gm_input',title:'Ada private narrative source',
   source_id:'player:ada-f06',visibility:'character',subject_key:ada.id,session_id:session.id,
   scene:`${session.id}:1`,details:{author:'ada-f06',character_id:ada.id,revision:principal.revision,text:'Ada considers the sealed letter.'}},'ada-f06');
 db.addFact(guild,{category:'fact',key:'ada-only-f06',content:'Ada alone recognizes the wax mark.',visibility:'character',
  subjectCharacterId:ada.id,sessionId:session.id,source:'gm',provenance:{scene_location:null}});
 db.addFact(guild,{category:'fact',key:'noor-only-f06',content:'Noor secretly carries the blue key.',visibility:'character',
  subjectCharacterId:noor.id,sessionId:session.id,source:'gm',provenance:{scene_location:null}});
 db.addFact(guild,{category:'fact',key:'gm-only-f06',content:'The sealed letter was planted by the hidden patron.',visibility:'gm',
  sessionId:session.id,source:'gm',provenance:{scene_location:null}});

 const characterBefore=[db.getCharacter(ada.id).data,db.getCharacter(noor.id).data],
  context=buildNarrativeContext(db,guild,scope,privateSource.event_key),serialized=JSON.stringify(context.packet),
  grant=mintNarrativeAudience(context);
 assert.equal(context.packet.audience.mode,'private');
 assert.equal(context.packet.audience.subject_key,ada.id);
 assert.match(serialized,/Ada alone recognizes the wax mark/);
 assert.doesNotMatch(serialized,/Noor secretly carries the blue key/);
 assert.doesNotMatch(serialized,/planted by the hidden patron/);
 assert.equal(grant.proof.audience,'player_private');
 assert.equal(grant.proof.recipient_user_id,'ada-f06');
 assert.equal(grant.proof.recipient_character_id,ada.id);
 assert.deepEqual(audienceSurface(grant.authority,grant.grant),{kind:'private_user',recipient_user_id:'ada-f06',publish:true});
 assert.deepEqual(revalidateNarrativeAudience(db,guild,grant.proof,scope).proof,grant.proof);

 const noorScope={mode:'private',actorUserId:'noor-f06',actorCharacterId:noor.id};
 assert.throws(()=>buildNarrativeContext(db,guild,noorScope,privateSource.event_key),
  error=>error.code==='SCENE_FICTION'&&error.diagnostic?.category==='authenticated_source');
 indexWorldEvent(db,guild,{key:privateSource.event_key,status:'retracted'});
 assert.throws(()=>revalidateNarrativeAudience(db,guild,grant.proof,scope),
  error=>error.code==='SCENE_FICTION'&&error.diagnostic?.category==='authenticated_source');
 assert.deepEqual([db.getCharacter(ada.id).data,db.getCharacter(noor.id).data],characterBefore);
});
