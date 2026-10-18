/** Bounded native GM identity layer. No actor simulation, jurisdiction, resources, ownership or knowledge grant. */
import {sceneFictionFailure as fail} from './scene-fiction-context.js';
import {worldIdentityOrigin} from './world-authorship.js';
export const BACKGROUND_WORLD_KINDS=Object.freeze(['faction','organization','district']);
const normalized=value=>(String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/^the\s+/u,'').match(/[\p{L}\p{N}]+/gu)||[]).join('-');
export function validateBackgroundIdentity(db,guild,definition,content){
  if(definition.location_key||definition.parent_location_key)throw fail('background_identity_only_not_geography');
  if(typeof content?.read!=='function')throw fail('packaged_background_identity_authority_required');
  const reserved=[];
  for(const dir of ['GM_PRIVATE','GM'])for(const category of ['FACTIONS/factions','NPCS/npcs','LOCATIONS/locations']){
    const raw=content.read(`${dir}/${category}.json`);if(!raw.trim())continue;
    const rows=JSON.parse(raw);if(!Array.isArray(rows))throw fail('packaged_identity_shape');
    reserved.push(...rows.flatMap(row=>[row.name,row.key,...(Array.isArray(row.aliases)?row.aliases:[])]));
  }
  for(const kind of ['autonomous_entity','faction','institution','organization','district','world_draft']){
    const rows=db.listCityRecords(guild,{kind,includeGM:true,limit:5000});
    if(rows.length>=5000)throw fail('identity_scan_limit_requires_reconciliation');
    reserved.push(...rows.flatMap(row=>[row.record_key,row.data.key,row.data.name,row.data.data?.name,...(row.data.aliases||[])]));
  }
  for(const kind of ['npc','location','faction'])reserved.push(...db.listSimulationEntities(guild,kind).flatMap(row=>[row.entity_key,row.state.name,...(row.state.aliases||[])]));
  const profiles=db.listNpcProfiles(guild,{limit:5000});if(profiles.length>=5000)throw fail('identity_scan_limit_requires_reconciliation');
  reserved.push(...profiles.flatMap(row=>[row.npc_key,row.display_name]));
  for(const kind of ['npc','location'])reserved.push(...db.listReferences(guild,kind,{publicOnly:false}).flatMap(row=>[row.entity_key,row.display_name]));
  const names=new Set(reserved.filter(Boolean).map(normalized));
  if([definition.key,definition.name,...definition.aliases].some(name=>names.has(normalized(name))))throw fail('protected_or_existing_world_identity');
}
/** GM-context projection only; visibility is not a PC/NPC knowledge-transfer receipt. */
export function backgroundIdentityContext(db,guild,scope,{location=null,limit=8}={}){
  return db.listCityRecords(guild,{kind:'autonomous_entity',includeGM:true,limit:5000})
    .filter(row=>BACKGROUND_WORLD_KINDS.includes(row.data.kind)&&row.data.identity_layer==='background_only'
      &&worldIdentityOrigin(db,guild,row,scope))
    .sort((a,b)=>Number(b.data.anchor_location===location)-Number(a.data.anchor_location===location)||a.record_key.localeCompare(b.record_key))
    .slice(0,Math.max(1,Math.min(8,limit))).map(row=>({ref:row.record_key,kind:row.data.kind,name:row.data.name,aliases:row.data.aliases,
      summary:row.data.summary,source_ref:row.source_event,authority:'identity_only_not_knowledge_resources_or_control'}));
}
