/** Audience-isolated nonmechanical scene framing. Authorship proves provenance, NOT semantic truth or PC/world effects. */
import {createHash} from 'node:crypto';
import {sceneAuthoringContext} from './frameworks/narrative/public.js';
import {narrativeWorldPrimitives} from './frameworks/narrative/public.js';
const {indexWorldEvent}=narrativeWorldPrimitives;
import {hasPcReference} from './fresh-npc-authoring.js';
import {quoteNpcWords} from './frameworks/narrative/public.js';
import {materialParaphrases} from './narrative-integrity.js';
export {freshSceneRequestSchema,freshSceneResponseSchema} from './gm-fiction-schema.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const issuer='native:fresh-scene-authoring';
export const FRESH_SCENE_INSTRUCTIONS='Write one expressive environmental description using ONLY this audience-isolated packet. '
  +'Describe ordinary ephemeral atmosphere and the provided visible evidence, not characters. No PC/NPC dialogue, actions, reactions, '
  +'thoughts, knowledge, injury, resources, dice, custody, travel, consent, secrets or special powers. Do not establish a new hazard, '
  +'locked access, equipment failure, encounter, obligation or other durable/consequential change. No second-person assertions. '
  +'Do not claim that missing evidence is absent. This is nonmechanical scene framing, not proof of new facts or outcomes. '
  +'Return exactly {"description":"..."}. This authoring stage does not verify unrestricted semantic safety.';
function fail(code='SCENE_AUTHORING_SCOPE'){throw Object.assign(new Error('Fresh scenery needs current native viewpoint, source, audience and isolated authoring provenance.'),{code,expected:true});}
function pcTripwire(db,guild,text){
  const tokens=new Set(String(text).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]);
  return hasPcReference(db,guild,text)||db.listGuildCharacters(guild).some(pc=>{
    const first=String(pc.name).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.[0];return first&&tokens.has(first);
  });
}
function envelope(db,guild,input,scope,sourceRef){
  if(!input||Object.keys(input).sort().join()!=='fact_refs,kind,version'||input.version!==6||input.kind!=='scene_fresh_request'
    ||!Array.isArray(input.fact_refs)||input.fact_refs.length>6||new Set(input.fact_refs).size!==input.fact_refs.length
    ||input.fact_refs.some(ref=>typeof ref!=='string'||!ref||ref.length>200))fail();
  const view=sceneAuthoringContext(db,guild,scope,sourceRef,input.fact_refs);
  if(!view.location_name||view.location_name.length>160||/[\r\n\x00-\x1f`*_<>\[\]\\]/u.test(view.location_name)
    ||pcTripwire(db,guild,view.location_name))fail();
  return {version:1,issuer,policy:'ephemeral_scene_framing_v1',request:input,scope:{...scope},origin:sourceRef,
    state:view.state,location_name:view.location_name,evidence:view.evidence};
}
function words(db,guild,text){
  if(typeof text!=='string'||!text.trim()||text.length>1400||/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(text)
    ||pcTripwire(db,guild,text)||/\b(?:you|your|yours|yourself)\b/i.test(text)||materialParaphrases(text).length)fail('SCENE_AUTHORING_WORDS');
  // Tripwires are defense in depth, not a universal semantic classifier. The isolated packet and native effects gate are primary.
}
const recordKey=binding=>`scene-fresh:${hash(binding)}`;
export function renderFreshScenePart(db,guild,key,scope){
  const row=db.getCityRecord(guild,'scene_fresh_authoring',key),data=row?.data,source=row&&db.getWorldEvent(guild,row.source_event);
  if(!data||row.status!=='authored'||row.visibility!=='gm'||source?.status!=='active'||source.kind!=='native_fresh_scene_description'
    ||source.source_id!==issuer||hash(source.details)!==hash(data)||data.semantic_verification!==false)fail();
  const {description,semantic_verification,...binding}=data;
  if(key!==recordKey(binding)||hash(envelope(db,guild,data.request,scope,data.origin))!==hash(binding))fail();
  words(db,guild,description);
  return '**Surroundings — nonmechanical scene framing, not character outcomes or new durable changes:**\n'+quoteNpcWords(description);
}
export function findFreshScenePart(db,guild,input,scope,sourceRef){
  const key=recordKey(envelope(db,guild,input,scope,sourceRef));renderFreshScenePart(db,guild,key,scope);
  return db.getCityRecord(guild,'scene_fresh_authoring',key);
}
export function hasFreshSceneResponse(db,guild,result,scope,sourceRef){
  for(const input of result.gm_world_parts||[]){
    if(input?.version!==6)continue;
    try{if(findFreshScenePart(db,guild,input,scope,sourceRef))return true;}
    catch(error){if(!['SCENE_DESCRIPTION','SCENE_AUTHORING_SCOPE','SCENE_AUTHORING_WORDS'].includes(error.code))throw error;}
  }
  return false;
}
function hold(db,guild,input,scope,sourceRef,reason){
  if(!sourceRef||!db.getWorldEvent(guild,sourceRef))return;
  const key=`scene-authoring-hold:${hash([input,scope,sourceRef,reason])}`;
  db.saveCityRecord(guild,{kind:'scene_authoring_hold',key,status:'needs_scope_review',visibility:'gm',source_event:sourceRef,
    data:{version:1,reason,canonical:false,scope:{...scope}}});
}
export async function authorFreshSceneRequests({db,guild,result,scope,sourceRef,budget,generate}){
  if(result.respond===false||result.act===false)return;
  for(const input of (result.gm_world_parts||[]).filter(p=>p?.version===6)){
    let attemptKey;
    try{
      const binding=envelope(db,guild,input,scope,sourceRef),key=recordKey(binding);
      if(db.getCityRecord(guild,'scene_fresh_authoring',key)){renderFreshScenePart(db,guild,key,scope);continue;}
      attemptKey=`scene-authoring-attempt:${hash([sourceRef,scope])}`;
      if(budget.used||db.getCityRecord(guild,'scene_authoring_attempt',attemptKey)
        ||db.getCityRecord(guild,'npc_authoring_attempt',`npc-authoring-attempt:${hash([sourceRef,scope])}`))fail('SCENE_AUTHORING_BUDGET');
      budget.used=true;
      // No player text, PCs, sheets, GM notes, arbitrary location summaries or hidden evidence enter the writer.
      const packet={version:1,setting_token:'scene_1',audience:scope.mode==='private'?'private':'party',
        public_location_name:binding.location_name,visible_environment:binding.evidence};
      db.saveCityRecord(guild,{kind:'scene_authoring_attempt',key:attemptKey,status:'authoring',visibility:'gm',source_event:sourceRef,
        data:{version:1,authoring:key,packet_hash:hash(packet)}});
      const answer=await generate(packet);
      if(!answer||Object.keys(answer).join()!=='description')fail('SCENE_AUTHORING_WORDS');words(db,guild,answer.description);
      if(hash(envelope(db,guild,input,scope,sourceRef))!==hash(binding))fail();
      const data={...binding,description:answer.description,semantic_verification:false};
      db.transaction(()=>{
        const source=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_fresh_scene_description',title:'Ephemeral scene framing, not new facts',
          source_id:issuer,session_id:binding.state.scene.session_id,scene:binding.state.scene.key,visibility:'gm',details:data},issuer);
        db.saveCityRecord(guild,{kind:'scene_fresh_authoring',key,status:'authored',visibility:'gm',source_event:source.event_key,data});
        db.saveCityRecord(guild,{...db.getCityRecord(guild,'scene_authoring_attempt',attemptKey),key:attemptKey,status:'authored'});
      });
    }catch(error){
      if(!['SCENE_DESCRIPTION','SCENE_AUTHORING_SCOPE','SCENE_AUTHORING_WORDS','SCENE_AUTHORING_BUDGET','SCENE_AUTHORING_PROVIDER'].includes(error.code))throw error;
      const row=attemptKey&&db.getCityRecord(guild,'scene_authoring_attempt',attemptKey);
      if(row)db.saveCityRecord(guild,{...row,key:attemptKey,status:'needs_scope_review'});
      hold(db,guild,input,scope,sourceRef,error.code);
    }
  }
}
