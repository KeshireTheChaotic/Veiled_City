#!/usr/bin/env node
/** AF07 local-only qualification harness. It uses a disposable SQLite campaign and never connects Discord. */
import {mkdtempSync,rmSync,rmdirSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {parse as parseDotenv} from 'dotenv';
import {Client,GatewayIntentBits} from 'discord.js';
import {VeiledDB} from '../src/db.js';
import {GMService} from '../src/gm.js';
import {commitGmTurn} from '../src/turn-orchestration.js';
import {createChatGptClient} from '../src/frameworks/ai-provider/public.js';
import {currentScene,recordCharacterArrival,recordScenePresence} from '../src/frameworks/session/public.js';
import {indexWorldEvent,worldInputKey,captureWorldInput} from '../src/frameworks/world/public.js';
import {jsonHash} from '../src/kernel/json-hash.js';
import {EncounterLibrary} from '../src/frameworks/daggerheart/public.js';
import {createArbitrationOrigin,arbitrationPromptBoard} from '../src/scene-intent-board.js';
import {initializeRuntimeFrameworks} from '../src/application/composition/public.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const contentRoot=resolve(root,'..','content');
const schema=join(root,'sql','schema.sql');
const feature='adversary:aster-vale-contractor:flashbang';

function blank(schema){
  if(schema.anyOf)return blank(schema.anyOf[0]);
  if(schema.type==='object')return Object.fromEntries(schema.required.map(key=>[key,blank(schema.properties[key])]));
  if(schema.type==='array')return [];
  if(schema.type==='string')return schema.enum?.[0]??'fixture';
  if(schema.type==='integer')return schema.minimum??0;
  if(schema.type==='boolean')return false;
  if(schema.type==='null')return null;
  return null;
}

function seed(directory){
  const db=new VeiledDB(join(directory,'campaign.sqlite'),schema),guild='af07-disposable';
  db.ensureCampaign(guild,{name:'AF07 disposable Codex qualification'});
  db.setCityCalendar(guild,{flags:{scene_continuity:true,roll_requests:true,gm_discretion:true,narrative_authority:true,playable_narration:true,narrative_camera:true,dialogue_history:true,narrative_encounters:true}});
  db.upsertPlayer(guild,'owner-af07','AF07 Owner');
  db.upsertPlayer(guild,'owner-af07-b','AF07 Owner B');
  const pc=db.createCharacter(guild,'owner-af07','AF07 PC',{location:'af07-room'});
  const pcB=db.createCharacter(guild,'owner-af07-b','AF07 PC B',{location:'af07-room'});
  db.updateCharacterData(pc.id,data=>{data.location='af07-room';});
  db.updateCharacterData(pcB.id,data=>{data.location='af07-room';});
  db.setSimulationEntity(guild,'location','af07-room',{name:'AF07 Test Room',aliases:['test room'],visibility:'party'});
  const session=db.startSession(guild,'AF07 disposable scene','already_together');
  db.assignCharacter(session.id,'owner-af07',pc.id);db.setPresence(session.id,'owner-af07','present');
  db.assignCharacter(session.id,'owner-af07-b',pcB.id);db.setPresence(session.id,'owner-af07-b','present');
  const scene=currentScene(db,guild);
  db.upsertNpcProfile(guild,{npcKey:'af07-contractor',displayName:'Aster Vale Contractor',role:'contractor',publicIdentity:'Aster Vale Contractor'});
  db.setSimulationEntity(guild,'npc','af07-contractor',{name:'Aster Vale Contractor',location_key:'af07-room',visibility:'party',status:'active'});
  const arrival=indexWorldEvent(db,guild,{key:'af07:npc-arrival',kind:'arrival',title:'A contractor is present',source_id:'fixture',session_id:session.id,scene:scene.key,
    location_key:'af07-room',visibility:'party',truth_status:'established',details:{entity_type:'npc',entity_key:'af07-contractor',observers:[]}},'fixture');
  recordScenePresence(db,guild,{source_event:arrival.event_key,entity_type:'npc',entity_key:'af07-contractor',location_key:'af07-room',visibility:'party',state:'actually_present'},'fixture');
  recordCharacterArrival(db,guild,db.getCharacter(pc.id),'owner-af07','af07:pc-arrival');
  recordCharacterArrival(db,guild,db.getCharacter(pcB.id),'owner-af07-b','af07:pc-b-arrival');
  const library=new EncounterLibrary(contentRoot);
  const actor=library.findAdversary('Aster Vale Contractor');
  const encounter=db.createEncounter(guild,session.id,{tier:1,pc_count:2,difficulty:'standard',style:'balanced',base_bp:0,budget_bp:0,objective:'A contractor acts in the room.',environment_name:'AF07 Test Room',
    composition:[{name:actor.name,type:actor.type,quantity:1}]});
  db.setEncounterStatus(encounter.id,'active');
  const combatants=db.initializeCombatants(encounter.id,[{base_name:actor.name,display_name:actor.name,role:actor.type,tier:Number(actor.tier),difficulty:Number(actor.difficulty),
    major_threshold:7,severe_threshold:12,hp_max:Number(actor.hp),stress_max:Number(actor.stress),notes:actor.standard||''}]);
  const bindingSource=indexWorldEvent(db,guild,{key:'af07:encounter-source',kind:'encounter_binding',title:'AF07 encounter fixture',source_id:'fixture',session_id:session.id,scene:scene.key,
    location_key:'af07-room',visibility:'gm',truth_status:'established',details:{}},'fixture');
  db.saveCityRecord(guild,{kind:'encounter_binding',key:encounter.id,status:'active',source_event:bindingSource.event_key,visibility:'gm',data:{combatants:[{actor:'af07-contractor',id:combatants[0].id}],roster:[pc.id,pcB.id].sort()}});
  return {db,guild,session,pc,npc:'af07-contractor',scene,close(){db.close();}};
}

export function createAf07MockAi({fixture,messageId}){
  let calls=0;
  return {get calls(){return calls;},responses:{async create(request){
    calls++;
    const output=blank(request.text.format.schema);
    const actor=fixture.npc,pcId=fixture.pc.id;
    const origin=createArbitrationOrigin(fixture.db,fixture.guild,{mode:'party',actorUserId:'owner-af07',actorCharacterId:pcId},worldInputKey(messageId,pcId));
    const board=arbitrationPromptBoard(fixture.db,fixture.guild,origin);
    const candidate=board.npc_candidates.find(item=>item.actor_key===actor);
    const intentRef=candidate?.intent_refs?.feature;
    output.respond=true;output.narration='The contractor snaps a flash charge toward the PC; the owner still controls the reaction.';
    output.authored_candidates=null;
    output.player_intents=[{type:'other',source_span:'What is happening in this room?',target_name:'',target_key:'',destination:'unspecified',operation:'current_situation',utterance:'',excluded_targets:[],framing:'immediate',resolution:'conversational',reason:'A question about the present scene.'}];
    output.unified_arbitration={version:1,npc_intents:[{actor_key:actor,operation:'feature',target_refs:[pcId],objective_ref:'',source_refs:[],dependencies:[]}],decisions:[{
      intent_ref:intentRef,disposition:'native_feature_resolution',rule_basis_refs:['srd:reaction-rolls'],difficulty:12,trait:'Instinct',stakes_kind:'native_feature',
      stakes:'The PC owner makes the reaction roll; no result or choice is assumed.',reason:'One source-backed Flashbang use.',difficulty_reason:'The feature sets Difficulty 12.',feature_ref:feature,experience_ref:'',advantage:false,disadvantage:false
    }]};
    return {output_text:JSON.stringify(output),output:[],usage:{}};
  }}};
}

export async function runAf07Scenario({ai,aiFactory,live=false}={}){
  if(live&&process.env.AI_AUTH_MODE&&process.env.AI_AUTH_MODE!=='chatgpt')throw new Error('Live mode requires AI_AUTH_MODE=chatgpt.');
  if(live&&String(process.env.OPENAI_API_KEY||'').trim())throw new Error('Refusing API-key mode; this runner permits Codex sign-in only.');
  if(!live&&!ai&&!aiFactory)throw new Error('A mocked AI client is required unless --live-codex is explicitly supplied.');
  let liveContext=null,discordClient=null;
  if(live){
    liveContext=await developmentPreflight();
    discordClient=await connectDiscordWithoutMessageIntents(liveContext.discordToken);
  }
  const directory=mkdtempSync(join(root,'.af07-disposable-'));
  let fixture;
  try{
    initializeRuntimeFrameworks();
    fixture=seed(directory);
    const messageId='af07:gm-input',message='What is happening in this room?';
    captureWorldInput(fixture.db,fixture.guild,'owner-af07',fixture.pc.id,messageId,message);
    const client=ai||aiFactory?.({fixture,messageId})||(await import('../src/frameworks/ai-provider/public.js')).createChatGptClient();
    const config=live?liveContext.modelConfig:{gmModel:'gpt-5',routineGmModel:'gpt-5',reasoningEffort:'low',openaiMaxRetries:0};
    const service=new GMService({db:fixture.db,content:{root:contentRoot,read:()=>'',search:()=>[]},config:{...config,gmTurnDeadlineMs:120000,
      structuredRetryMaxTokens:6000,maxContentChunks:0,maxRecentMessages:10,playableObservationFastPath:false},ai:client});
    const result=await service.runTurn({guildId:fixture.guild,actorUserId:'owner-af07',actorName:'AF07 Owner',messageText:message,actorAssignment:{character_id:fixture.pc.id},
      scope:'party',messageId,engagement:{respond:true,engagement_kind:'uncertain'}});
    const mutation=commitGmTurn({db:fixture.db,guild:{id:fixture.guild},session:fixture.session,result,scope:{mode:'party',actorUserId:'owner-af07',actorCharacterId:fixture.pc.id},
      speaker:'af07-qualification',label:'AF07 disposable Codex qualification',meta:{messageId,triggerText:message},content:{root:contentRoot}});
    const executions=fixture.db.listCityRecords(fixture.guild,{kind:'gm_group_feature_execution',includeGM:true,limit:20});
    return {ok:true,live,turnCommitted:true,gmNativeActions:mutation.gmNativeActions?.length||0,
      gmNativeActionKinds:(mutation.gmNativeActions||[]).map(row=>({kind:row.kind||null,status:row.status||null,operation:row.data?.native?.operation||row.operation||null})),
      unifiedDecisions:mutation.unifiedArbitration?.length||0,groupFeatureExecutions:executions.length,
      databaseWasTemporary:true,developmentDatabaseReadOnly:live?liveContext.database:null,
      discordConnected:!!discordClient,discordMessageIntents:false,discordMessagesProcessed:false};
  }finally{
    try{fixture?.close();}
    finally{
      try{
        for(const name of ['campaign.sqlite','campaign.sqlite-wal','campaign.sqlite-shm']){
          const file=join(directory,name);if(existsSync(file))rmSync(file,{force:true});
        }
        rmdirSync(directory);
      }catch{}
    }
    discordClient?.destroy();
  }
}

async function developmentPreflight(){
  const envPath=join(root,'.env');
  if(!existsSync(envPath))throw new Error('Development .env is unavailable.');
  const env=parseDotenv((await import('node:fs')).readFileSync(envPath));
  if(env.AI_AUTH_MODE!=='chatgpt'||String(env.OPENAI_API_KEY||'').trim()||String(process.env.OPENAI_API_KEY||'').trim())
    throw new Error('Development environment must select Codex ChatGPT mode and contain no API key.');
  const databasePath=resolve(root,env.DATABASE_PATH||'./data/veiled_city.sqlite');
  if(!existsSync(databasePath)||!env.DISCORD_TOKEN)throw new Error('Development database or Discord configuration is unavailable.');
  if(databasePath===root||databasePath.startsWith(root+'\\')===false&&databasePath.startsWith(root+'/')===false)
    throw new Error('Configured database is outside the development checkout.');
  const database=new DatabaseSync(databasePath,{readOnly:true});
  let counts;
  try{
    database.exec('PRAGMA query_only=ON;');
    const campaignCount=database.prepare('SELECT COUNT(*) AS n FROM campaigns').get().n;
    const activeSessionCount=database.prepare("SELECT COUNT(*) AS n FROM sessions WHERE status='active'").get().n;
    counts={campaigns:campaignCount,activeSessions:activeSessionCount,readOnly:true};
  }finally{database.close();}
  if(!counts.campaigns||!counts.activeSessions)throw new Error('Development database has no active campaign and session.');
  return {discordToken:env.DISCORD_TOKEN,database:counts,modelConfig:{gmModel:env.OPENAI_GM_MODEL||'gpt-6.1-sol',
    routineGmModel:env.OPENAI_ROUTINE_GM_MODEL||env.OPENAI_ROUTER_MODEL||env.OPENAI_GM_MODEL||'gpt-6-luna',
    reasoningEffort:env.OPENAI_REASONING_EFFORT||'low',openaiMaxRetries:0}};
}

async function connectDiscordWithoutMessageIntents(token){
  const client=new Client({intents:[GatewayIntentBits.Guilds]});
  let timeout;
  const ready=new Promise((resolveReady,reject)=>{
    timeout=setTimeout(()=>reject(new Error('Discord ready timeout.')),30000);
    client.once('ready',()=>{clearTimeout(timeout);resolveReady();});
    client.once('error',error=>{clearTimeout(timeout);reject(error);});
  });
  try{await client.login(token);await ready;return client;}
  catch(error){clearTimeout(timeout);client.destroy();throw error;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.slice(2).join(' ')!=='--live-codex'){
    console.error('No action taken. Re-run with --live-codex to make one Codex-backed qualification request.');process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(await runAf07Scenario({live:true}),null,2));}
    catch(error){
      const marker=Number.isInteger(error?.status)?`status ${error.status}`:error?.name||'Error';
      console.error(`AF07 qualification failed (${marker}); no credential or guild details were emitted.`);process.exitCode=1;
    }
  }
}
