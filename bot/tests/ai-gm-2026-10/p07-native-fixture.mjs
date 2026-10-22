import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {VeiledDB} from '../../src/db.js';
import {indexWorldEvent} from '../../src/city-calendar.js';
import {recordCharacterArrival,recordScenePresence,currentScene} from '../../src/scene-continuity.js';
import {captureWorldInput} from '../../src/autonomous-world.js';
import {captureAuthoredTurnEnvelope} from '../../src/authored-turn-envelope.js';
import {persistPlayerIntents,persistTypedDialogue} from '../../src/typed-intents.js';
import {bindDirectorNarrativeSource,directorBriefForAudience,nativeDirectorNarrativeSource} from '../../src/narrative-director-source.js';
import {buildNarrativeContext} from '../../src/narrative-authority-context.js';
import {GMService} from '../../src/gm.js';

const botRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function createP07NativeFixture(){
  const directory=mkdtempSync(path.join(tmpdir(),'vc-p07-native-'));
  const dbPath=path.join(directory,'campaign.sqlite');let db=new VeiledDB(dbPath,path.join(botRoot,'sql/schema.sql'));
  const guild='p07-source-proof';db.ensureCampaign(guild,{name:'P07 disposable source proof'});
  db.setCityCalendar(guild,{flags:{dialogue_history:true,scene_continuity:true,narrative_authority:true,playable_narration:true,narrative_camera:true}});
  db.upsertPlayer(guild,'owner-a','Owner A');db.upsertPlayer(guild,'owner-b','Owner B');
  const a=db.createCharacter(guild,'owner-a','PC A',{location:'p07-station'});
  const b=db.createCharacter(guild,'owner-b','PC B',{location:'p07-station'});
  for(const pc of [a,b])db.updateCharacterData(pc.id,data=>{data.location='p07-station';});
  const pcs=[db.getCharacter(a.id),db.getCharacter(b.id)];
  db.setSimulationEntity(guild,'location','p07-station',{name:'P07 Station',aliases:['station'],visibility:'party'});
  const session=db.startSession(guild,'P07 disposable native source fixture','already_together');
  for(const [user,pc] of [['owner-a',a],['owner-b',b]]){db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,'present');}
  const scene=currentScene(db,guild);db.upsertNpcProfile(guild,{npcKey:'mara',displayName:'Mara Vale',role:'station attendant',publicIdentity:'Mara Vale'});
  db.setSimulationEntity(guild,'npc','mara',{name:'Mara Vale',location_key:'p07-station',visibility:'party',status:'active'});
  const npcArrival=indexWorldEvent(db,guild,{key:'p07:npc-arrival:mara',kind:'arrival',title:'Mara is present at the station',source_id:'human_gm',
    session_id:session.id,scene:scene.key,location_key:'p07-station',visibility:'party',truth_status:'established',
    details:{entity_type:'npc',entity_key:'mara',observers:[]}},'human_gm');
  recordScenePresence(db,guild,{source_event:npcArrival.event_key,entity_type:'npc',entity_key:'mara',location_key:'p07-station',visibility:'party',state:'actually_present'},'human_gm');
  for(const [user,pc,id] of [['owner-a',pcs[0],'arrival-a'],['owner-b',pcs[1],'arrival-b']])recordCharacterArrival(db,guild,pc,user,id);
  let closed=false;
  return {get db(){return db;},dbPath,guild,session,scene,pcs,scope:{mode:'party',actorUserId:null,actorCharacterId:null},
    acceptSpeech(user,pc,messageId,quote,{privateScene=false,targetKey='mara',targetName='Mara'}={}){
      const address=`I tell ${targetName}: `,message=`${address}${quote}`,start=message.indexOf(address),end=message.length;
      captureWorldInput(db,guild,user,pc.id,messageId,message,{privateScene});
      captureAuthoredTurnEnvelope(db,guild,user,pc.id,messageId,message,{privateScene});
      const intent={type:'speak',source_span:message.slice(start,end),target_key:targetKey,target_name:targetName,operation:'speak',utterance:quote,
        framing:'immediate',resolution:'conversational',destination:'unspecified',reason:'',excluded_targets:[]};
      const scope={mode:privateScene?'private':'party',actorUserId:user,actorCharacterId:pc.id};
      const accepted=persistPlayerIntents(db,guild,[intent],scope,{messageId});
      const dialogue=persistTypedDialogue(db,guild,[intent],scope,{messageId});
      return {accepted,dialogue};
    },
    makeDirector(){
      const trigger={scope:'party',event_refs:[npcArrival.event_key]};const result={act:false};
      const sourceRef=bindDirectorNarrativeSource(db,guild,result,this.scope,'scene',trigger,null);
      const source=db.getWorldEvent(guild,sourceRef),brief=directorBriefForAudience(db,guild,source,this.scope);
      return {sourceRef,source,brief,writer:buildNarrativeContext(db,guild,this.scope,sourceRef,{operation:'describe_scene'})};
    },
    async runWorldDirector(){
      const generated={act:false,public_narration:'',narrative_claims:[],private_messages:[],events:[],handouts:[],relationships:[],
        npc_memories:[],npc_knowledge:[],npc_goals:[],simulation_updates:[],gm_notes:'No additional world move is justified.',confidence:100,
        gm_world_parts:[],decision_advisory:null,ai_intents:[]};
      let providerCalls=0,lastRequest=null;
      const service=new GMService({db,config:{gmModel:'offline-fixture',gmTurnDeadlineMs:10000,structuredRetryMaxTokens:6000,
        maxContentChunks:0,maxRecentMessages:10,openaiMaxRetries:0},content:{root:'',read:()=>'',search:()=>[]},
        ai:{responses:{create:async request=>{providerCalls++;lastRequest=request;return {output_text:JSON.stringify(generated),usage:{}};}}}});
      const result=await service.runWorldDirector({guildId:guild,layer:'manual',trigger:{scope:'party',event_refs:[npcArrival.event_key]}});
      const sourceRef=nativeDirectorNarrativeSource(result),source=db.getWorldEvent(guild,sourceRef),
        brief=directorBriefForAudience(db,guild,source,this.scope),writer=buildNarrativeContext(db,guild,this.scope,sourceRef,{operation:'describe_scene'});
      return {result,providerCalls,lastRequest,sourceRef,source,brief,writer};
    },
    reopen(){db.close();db=new VeiledDB(dbPath,path.join(botRoot,'sql/schema.sql'));return db;},
    close(){if(!closed){closed=true;try{db.close();}finally{rmSync(directory,{recursive:true,force:true});}}}
  };
}
