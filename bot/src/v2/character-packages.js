// Ported v3.3.3 JSON fields; native entitlement is enforced by character-package-service.js.
export function safeText(v){
  return v==null?"":String(v);
}
export function safeStem(name){
  const s=safeText(name).normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
  return s||"Character";
}

function factView(row){return {category:row.category,key:row.fact_key,content:row.content,visibility:row.visibility,session_id:row.session_id,source:row.source,created_at:row.created_at};}
function clockView(row){return {key:row.clock_key,label:row.label,value:row.value,max_value:row.max_value,visibility:row.visibility,updated_at:row.updated_at};}
function threadView(row){return {id:row.id,label:row.label,status:row.status,visibility:row.visibility,notes:row.notes,updated_at:row.updated_at};}
function referenceView(row){return {kind:row.kind,key:row.entity_key,name:row.display_name,summary:row.summary,visibility:row.visibility,updated_at:row.updated_at};}
function canonView(row){return {key:row.canon_key,value:row.value,visibility:row.visibility,status:row.status,session_id:row.session_id,source_type:row.source_type,source_id:row.source_id,provenance:row.provenance,created_at:row.created_at};}
function relationshipView(row){return {id:row.id,from_type:row.from_type,from_key:row.from_key,from_label:row.from_label,to_type:row.to_type,to_key:row.to_key,to_label:row.to_label,relationship_type:row.relationship_type,score:row.score,visibility:row.visibility,note:row.note,source:row.source,updated_at:row.updated_at};}

// These are GM infrastructure fields, not player-authored background or sheet mechanics.
const gmOnlyFields=new Set(['gm_hooks','imported_gm_hooks','gm_private','gm_secrets','hidden_hooks',
  'gm_relationships','hidden_relationships','canon_suggestions','canon_proposals','pending_conflicts','private_narrative','native_canon']);
export function playerCharacterProjection(value){
  if(Array.isArray(value))return value.map(playerCharacterProjection).filter(item=>item!==undefined);
  if(!value||typeof value!=='object')return value;
  if(['gm','gm_private'].includes(value.visibility)||['gm','gm_private'].includes(value.export_meta?.visibility))return undefined;
  return Object.fromEntries(Object.entries(value).filter(([key])=>!gmOnlyFields.has(key))
    .map(([key,item])=>[key,playerCharacterProjection(item)]).filter(([,item])=>item!==undefined));
}

export function buildPlayerExport(db,guildId,character){
  const d=playerCharacterProjection(character.data||{});
  const known=db.playerFactsFor(guildId,character.owner_user_id||"",{characterId:character.id,limit:200}).map(factView);
  return {
    ...d,
    name:character.name,
    export_meta:{
      schema:"veiled-city-character-export-v3.3.3",
      visibility:"player_safe",
      character_id:character.id,
      status:character.status,
      is_guest:Boolean(character.is_guest),
      exported_at:new Date().toISOString()
    },
    campaign_knowledge:known,
    relationships:db.listRelationships(guildId,{includeGM:false,characterId:character.id,userId:character.owner_user_id||""}).filter(r=>r.from_key===character.id||r.to_key===character.id||r.source_character_id===character.id).map(relationshipView)
  };
}

export function buildGmHooksExport(character,db=null,guildId=null){
  const d=character.data||{};
  return {
    export_meta:{schema:"veiled-city-gm-hooks-v3.3.3",visibility:"gm_private",character_id:character.id,name:character.name,exported_at:new Date().toISOString()},
    character:{name:character.name,level:d.level??1,class:d.class||"",subclass:d.subclass||"",ancestry:d.ancestry||"",community:d.community||"",domains:d.domains||[]},
    background:d.background||"",
    home:d.home||"",
    person:d.person||"",
    obligation:d.obligation||"",
    opening_status:d.opening_status||"",
    goals:d.goals||[],
    unresolved_incident:d.unresolved_incident||"",
    gm_hooks:d.gm_hooks||[],
    hook_permissions:d.hook_permissions||[],
    faction_connections:d.faction_connections||[],
    entry_hooks:d.entry_hooks||[],
    exit_hooks:d.exit_hooks||[],
    notes:d.notes||"",
    imported_gm_hooks:(db&&guildId)?db.listCharacterGmHooks(guildId,character.id,{includeResolved:true,includeCanonSuggestions:true}).map(h=>({key:h.hook_key,title:h.title,type:h.hook_type,premise:h.premise,permission:h.permission,suggested_entry:h.suggested_entry,status:h.status,payload:h.payload,source:h.source,updated_at:h.updated_at})):[]
  };
}

export function buildGmPrivateExport(db,guildId,character){
  const owner=character.owner_user_id||"";
  const facts=db.characterPrivateFacts(guildId,character.id,owner).map(factView);
  const clocks=db.characterPrivateClocks(guildId,character.id,owner).map(clockView);
  const threads=db.characterPrivateThreads(guildId,character.id,owner).map(threadView);
  const references=db.characterPrivateReferences(guildId,character.id,owner).map(referenceView);
  return {
    export_meta:{schema:"veiled-city-gm-private-v3.3.3",visibility:"gm_private",character_id:character.id,name:character.name,exported_at:new Date().toISOString()},
    character:{name:character.name,status:character.status,owner_user_id:character.owner_user_id||null},
    private_facts:facts,
    private_clocks:clocks,
    private_threads:threads,
    private_references:references,
    relationships:db.listRelationships(guildId,{includeGM:true,characterId:character.id,userId:owner}).filter(r=>r.from_key===character.id||r.to_key===character.id||r.source_character_id===character.id).map(relationshipView)
  };
}

function characterCanonMatch(row,character){
  const name=safeText(character.name).toLowerCase();
  const slug=safeStem(character.name).toLowerCase();
  const compact=slug.replaceAll("_","");
  const key=safeText(row.canon_key).toLowerCase().replace(/[^a-z0-9_.-]+/g,"_");
  const keyCompact=key.replace(/[^a-z0-9]/g,"");
  const value=safeText(row.value).toLowerCase();
  return row.source_id===character.id || key.includes(slug) || (compact.length>=5&&keyCompact.includes(compact)) || (name.length>=4&&value.includes(name));
}
export function buildGmCanonExport(db,guildId,character){
  const canon=db.listCanon(guildId,{includeGM:true,limit:1000}).filter(r=>characterCanonMatch(r,character)).map(canonView);
  const keys=new Set(canon.map(r=>r.key));
  const conflicts=db.listCanonConflicts(guildId).filter(r=>keys.has(r.canon_key)||characterCanonMatch(r,character)).map(r=>({
    id:r.id,key:r.canon_key,existing_value:r.existing_value,proposed_value:r.proposed_value,proposed_visibility:r.proposed_visibility,status:r.status,created_at:r.created_at
  }));
  const proposals=db.listCanonProposals(guildId,{status:"all",characterId:character.id,limit:100}).map(r=>({
    id:r.id,key:r.canon_key,proposed_value:r.proposed_value,proposed_visibility:r.proposed_visibility,reason:r.reason,status:r.status,current_value:r.current_value||null,canon_event_id:r.canon_event_id||null,canon_conflict_id:r.canon_conflict_id||null,resolution_value:r.resolution_value||"",resolution_note:r.resolution_note||"",created_at:r.created_at,resolved_at:r.resolved_at||null
  }));
  return {
    export_meta:{schema:"veiled-city-gm-canon-v3.3.3",visibility:"gm_private",character_id:character.id,name:character.name,exported_at:new Date().toISOString()},
    canon,
    pending_conflicts:conflicts,
    canon_proposals:proposals
  };
}
