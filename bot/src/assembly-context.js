/** Source selection is private planning, not permission to invent a PC action or disclose a GM secret. */
import {createHash} from 'node:crypto';
import {currentScene,scenePresence} from './scene-continuity.js';
export const hookHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const assemblySourceError=message=>Object.assign(new Error(message),{code:'ASSEMBLY_SOURCE',expected:true});
const fields=['entry_hooks','gm_hooks','goals','unresolved_incident','background','obligation','home','person','opening_status'];
const displayed=text=>String(text).replaceAll('@','@\u200b');
export function assemblyHookSources(db,guild,characterId){
  const pc=db.getCharacter(characterId);if(pc?.guild_id!==guild)return [];
  const sources=[];
  for(const field of fields){
    const values=Array.isArray(pc.data[field])?pc.data[field]:[pc.data[field]];
    for(const [index,value] of values.entries()){
      const text=typeof value==='string'?value:value?.text;
      if(!text?.trim()||text.length>1800)continue;
      sources.push({id:`sheet:${characterId}:${field}:${index}:${hookHash(text)}`,character_id:characterId,
        kind:'owner_character_material',field,text,epistemic:'character_material_not_new_outcome'});
    }
  }
  const narrative=db.getCharacterNarrative(guild,characterId,'player');
  if(narrative)for(const [index,text] of narrative.markdown.split(/\n\s*\n/).entries()){
    if(!text.trim()||text.trim().startsWith('#')||text.length>1800)continue;
    sources.push({id:`narrative:${narrative.id}:${index}:${hookHash(text)}`,character_id:characterId,
      kind:'player_narrative',field:'player_narrative',text,epistemic:'character_material_not_new_outcome'});
  }
  return sources.slice(0,24);
}
export function assemblyInputs(db,guild,session){
  const roster=db.roster(session.id).filter(r=>r.character_id&&['present','late','guest'].includes(r.presence))
    .sort((a,b)=>a.character_id.localeCompare(b.character_id));
  const characters=roster.map(r=>{
    const pc=db.getCharacter(r.character_id),assignment=db.activeAssignment(session.id,r.discord_user_id);
    return {character:pc.id,user:r.discord_user_id,owner:pc.owner_user_id,name:pc.name,status:pc.status,
      principal:assignment?.control_revision,control:assignment?.control_policy,location:pc.data.location||null,
      presence:scenePresence(db,guild,'character',pc.id),sources:assemblyHookSources(db,guild,pc.id),
      gm_hooks:db.listCharacterGmHooks(guild,pc.id).sort((a,b)=>a.id.localeCompare(b.id)),
      narratives:db.listCharacterNarratives(guild,{characterIds:[pc.id],includeGM:true}).sort((a,b)=>a.id.localeCompare(b.id))};
  });
  const facts=db.listFactsForGM(guild,{limit:500}).map(f=>({...f})).sort((a,b)=>a.id.localeCompare(b.id));
  const canon=db.listCanon(guild,{includeGM:true,limit:500}),party=db.getPartyState(guild);
  return {version:2,session:session.id,mode:session.assembly_mode,scene:currentScene(db,guild).key,characters,facts,canon,party};
}
export const assemblyInputFingerprint=(db,guild,session)=>hookHash(assemblyInputs(db,guild,session));
export function certifyAssemblyPlan(db,guild,session,plan,{strict=false,fingerprint=null}={}){
  const inputs=assemblyInputs(db,guild,session),entries=plan?.character_entries;
  if(!Array.isArray(entries)||entries.length!==inputs.characters.length)throw assemblySourceError('Exactly one opening entry per checked-in character required.');
  const seen=new Set();
  const normalized=entries.map(entry=>{
    const pc=inputs.characters.find(p=>p.user===entry.discord_user_id&&p.name===entry.character_name);
    if(!pc||pc.owner!==pc.user||seen.has(pc.character)||entry.character_id&&entry.character_id!==pc.character)
      throw assemblySourceError('Assembly roster/recipient mismatch or duplicate opening entry.');
    seen.add(pc.character);
    const refs=entry.hook_source_refs??(strict?[]:pc.sources.slice(0,1).map(s=>s.id));
    if(!Array.isArray(refs)||refs.length>2||new Set(refs).size!==refs.length
      ||refs.some(ref=>!pc.sources.some(s=>s.id===ref))||pc.sources.length&&!refs.length)
      throw assemblySourceError('Opening needs an applicable character-private hook source.');
    return {...entry,character_id:pc.character,hook_source_refs:refs,
      source_diagnostics:{permitted_sources:pc.sources.length,imported_gm_proposals:pc.gm_hooks.length,
        player_narrative:pc.narratives.some(n=>n.scope==='player'),gm_narrative:pc.narratives.some(n=>n.scope==='gm_private'),
        status:pc.sources.length?'source_selected':'missing_entitled_source_gm_proposals_not_disclosed'}};
  });
  const current=hookHash(inputs);
  if(fingerprint&&fingerprint!==current)throw assemblySourceError('Assembly sources changed during generation; retry from current context.');
  return {...plan,character_entries:normalized,assembly_contract:{version:2,input_fingerprint:current,created_at:new Date().toISOString()}};
}
export function assemblyPlanFreshness(db,guild,session,plan){
  if(plan?.assembly_contract?.version!==2)return 'legacy_untracked';
  return plan.assembly_contract.input_fingerprint===assemblyInputFingerprint(db,guild,session)?'current':'stale';
}
export function assemblyHookProjection(db,guild,sessionId,scope){
  if(scope.mode!=='private')return null;
  const session=db.getActiveSession(guild),pc=db.getCharacter(scope.actorCharacterId),plan=db.getAssemblyPlan(sessionId);
  if(!session||session.id!==sessionId||pc?.guild_id!==guild||pc.owner_user_id!==scope.actorUserId
    ||db.activeAssignment(sessionId,scope.actorUserId)?.character_id!==pc.id
    ||!db.roster(sessionId).some(r=>r.character_id===pc.id&&r.discord_user_id===scope.actorUserId&&['present','late','guest'].includes(r.presence)))
    throw assemblySourceError('Current owner and attended character required for hook projection.');
  const entry=plan.character_entries?.find(e=>e.discord_user_id===scope.actorUserId&&(!e.character_id||e.character_id===pc.id));
  const sources=assemblyHookSources(db,guild,pc.id),refs=entry?.hook_source_refs??sources.slice(0,1).map(s=>s.id);
  if(!Array.isArray(refs)||refs.some(ref=>!sources.some(s=>s.id===ref)))throw assemblySourceError('Assembly hook source revoked or changed.');
  const selected=refs.map(ref=>sources.find(s=>s.id===ref));if(!selected.length)return null;
  const text=`**Veilkeeper — private opening thread for ${displayed(pc.name)}**\n`
    +selected.map(s=>`Your character material offers this thread (${s.field}); it is not a newly resolved event:\n> ${displayed(s.text).replaceAll('\n','\n> ')}`).join('\n')
    +'\nWould you like to pursue this lead, ask about it, or take a different approach? No arrival, cooperation, commitment or outcome has been chosen for you.';
  return {text,selected,revision:hookHash([pc.id,pc.owner_user_id,selected])};
}
export function assemblyWriterBrief(db,guild,sessionId,scope){
  const resume=db.getSession(sessionId)?.assembly_phase==='party';
  if(scope.mode==='private'){
    const hook=assemblyHookProjection(db,guild,sessionId,scope);
    return {kind:resume?'private_resume':'private_opening',sources:hook?.selected||[],
      task:`${resume?'Resume the owner character current independent thread.':'Offer a playable ordinary circumstance relevant to this personal thread.'} Do not resolve its mystery, assert an arrival, or decide a PC response.`,
      knowledge:'Only this owner character material is available. Imported GM-only mysteries are not player knowledge.'};
  }
  return {kind:resume?'public_resume':'public_convergence',sources:[],
    task:`${resume?'Frame current scene continuity without asserting new party membership, requiring reunion or inventing intervening PC activity.':'Frame a playable shared opportunity as a camera scene, not established PC presence.'} Ordinary NPC offers, visible surroundings and nonbinding signs are allowed.`,
    knowledge:'Private hooks, private cues and motivations are intentionally excluded. Let the players discover and choose any connection.'};
}
