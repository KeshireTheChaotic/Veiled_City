import './compose-startup.mjs';
import {VeiledDB} from '../../src/db.js';
import {runOpeningCohort} from '../../src/opening-cohort-runner.js';
import {assemblyInputs} from '../../src/assembly-context.js';
import {openingCohortNarrativeCandidate} from '../../src/opening-cohort-state.js';
import {authorNarrativeRequests} from '../../src/narrative-authority.js';

const [dbPath,schemaPath]=process.argv.slice(2),db=new VeiledDB(dbPath,schemaPath),guildId='guild-correction';
let started=false,releasePlanner;const gate=new Promise(resolve=>{releasePlanner=resolve;});
process.on('message',message=>{
  if(message?.type==='start')started=true;
  if(message?.type==='release')releasePlanner();
});
process.send({type:'ready'});
while(!started)await new Promise(resolve=>process.once('message',message=>{if(message?.type==='start')resolve();}));
let plannerCalls=0;
const guild={id:guildId,channels:{fetch:async id=>id==='play-channel'?{id,isTextBased:()=>true,send:async()=>({id:`worker-${process.pid}`,channelId:id})}:null}};
const gm={
  async planAssembly(){plannerCalls++;process.send({type:'planner-start'});await gate;
    const session=db.getActiveSession(guildId),inputs=assemblyInputs(db,guildId,session);
    return {public_opening:'',character_entries:inputs.characters.map(row=>({discord_user_id:row.user,character_name:row.name,
      hook_source_refs:row.sources.slice(0,1).map(source=>source.id),private_hook:''}))};},
  async authorOpeningCohort(id,key){const {candidate,source}=openingCohortNarrativeCandidate(db,id,key),scope={mode:'party',actorUserId:null,actorCharacterId:null};
    return authorNarrativeRequests({db,guild:id,result:candidate,scope,sourceRef:source.event_key,budget:{used:false},generate:async()=>({
      narrative_units:[{id:'worker-scene',kind:'scene',text:'A blue paper lantern sways above the wet stones.',subject_key:'',location_key:'',visibility:'party',
        epistemic:'observation',source_refs:[],receipt_kind:'',receipt_ref:''}],fiction_delta:[]})});}
};
try{
  const result=await runOpeningCohort({db,guild,gm});
  process.send({type:'result',status:result?.status||null,plannerCalls,turnId:result?.data?.turn_id||null});
}catch(error){process.send({type:'error',error:String(error?.stack||error),plannerCalls});process.exitCode=1;}
finally{db.close();}
