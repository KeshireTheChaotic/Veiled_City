/** Audience-filtered actor-relative portrayal. Public fiction never receives unrestricted GM dossiers. */
import {portrayalPacket} from './portrayal.js';
import {scenePresence,npcEvidenceActive} from './scene-continuity.js';
import {activeCityProxy} from './city-constraints.js';
import {narrativeSourceVisible} from './scene-fiction-context.js';
import {narrativeNpcVisibility} from './frameworks/narrative/public.js';
const {actorEvidenceVisible}=narrativeNpcVisibility;
const entitled=(db,guild,npc,row,scope)=>actorEvidenceVisible(db,guild,npc,row,scope)
  ||!row.is_secret&&row.source_ref&&npcEvidenceActive(db,guild,npc,row.source_ref)
    &&narrativeSourceVisible(db,guild,row.source_ref,scope);
export function npcAddresses(db,guild,npc,scope,location){
  if(activeCityProxy(db,guild,npc))return [];
  const knowledge=db.listNpcKnowledge(guild,npc,{limit:200});
  return db.listGuildCharacters(guild).flatMap(pc=>{
    if(!['active','reserve','guest'].includes(pc.status))return [];
    const p=scenePresence(db,guild,'character',pc.id),source=p&&db.getWorldEvent(guild,p.source_event);
    if(p?.status!=='active'||p.data.state!=='actually_present'||p.location_key!==location||pc.data.location!==location
      ||source?.status!=='active'||source.details.owner_user_id&&source.details.owner_user_id!==pc.owner_user_id
      ||!narrativeSourceVisible(db,guild,p.source_event,scope))return [];
    const names=[pc.name,...(Array.isArray(pc.data.aliases)?pc.data.aliases:[])];
    return knowledge.filter(k=>k.belief_state==='known'&&names.includes(k.content)&&entitled(db,guild,npc,k,scope))
      .flatMap(k=>[k.content,...(k.content===pc.name&&pc.name.includes(' ')?[pc.name.split(/\s+/).at(-1)]:[])])
      .map(name=>({character:pc.id,name,authority:'native_actor_known_name_and_current_visible_presence'}));
  });
}
export function speakerBrief(db,guild,npc,scope,location,query=''){
  if(activeCityProxy(db,guild,npc))return null;
  const knowledge=db.listNpcKnowledge(guild,npc,{limit:100}).filter(k=>entitled(db,guild,npc,k,scope)&&k.belief_state!=='unknown'),
    memories=db.listNpcMemories(guild,npc,{status:'active',limit:100}).filter(m=>entitled(db,guild,npc,m,scope)),
    rank=rows=>rows.sort((a,b)=>Number(query.toLowerCase().includes(b.content.toLowerCase()))-Number(query.toLowerCase().includes(a.content.toLowerCase()))).slice(0,3)
      .map(r=>({text:r.content.slice(0,300),source_ref:r.source_ref,belief:r.belief_state||r.source_type})),
    portrayal=portrayalPacket(db,guild,npc,{publicVoice:true}),
    goals=db.listNpcGoals(guild,npc,{status:'active',limit:8}).filter(g=>narrativeSourceVisible(db,guild,g.source,scope)).slice(0,1)
      .map(g=>({objective:g.objective.slice(0,300),source_ref:g.source})),
    relationships=db.listRelationships(guild,{characterId:scope.actorCharacterId,userId:scope.actorUserId})
      .filter(r=>r.from_type==='npc'&&r.from_key===npc&&['public','party'].includes(r.visibility)).slice(0,2)
      .map(r=>({target:r.to_key,type:r.relationship_type}));
  return {direction:portrayal?.direction||{},knowledge:rank(knowledge),memories:rank(memories),goals,relationships,
    speech_source_refs:[...new Set([...knowledge.filter(k=>k.belief_state==='known'),...memories].map(k=>k.source_ref))].slice(0,8),
    addresses:npcAddresses(db,guild,npc,scope,location),
    guidance:'Answer, offer, disagree, decline or speculate in this voice. Beliefs are subjective; no forced player response.'};
}
/** Only the literal native-known leading address is exempted, never the rest of a PC clause. */
export function withoutVerifiedVocative(db,guild,u,ctx){
  if(u.kind!=='npc_speech')return u.text;
  for(const {name} of npcAddresses(db,guild,u.subject_key,ctx.scope,u.location_key||ctx.binding.location)){
    for(const prefix of [`${name},`,`Mr. ${name},`,`Ms. ${name},`,`Mx. ${name},`])
      if(u.text.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()))return u.text.slice(prefix.length).trim();
  }
  return u.text;
}
