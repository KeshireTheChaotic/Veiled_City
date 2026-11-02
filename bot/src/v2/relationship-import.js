const types=new Set(['character','npc','faction','location','entity','obligation']);
const relations=new Set(['trust','debt','fear','hostility','affection','respect','authority','obligation','family','ally','rival','contact','important_person','home','suspicion','protective','other']);
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
/** Native target resolution does not create entities, reciprocal feelings or consent. */
export function prepareImportedRelationships(prepared,character,resolve){
  const rows=[],holds=[],proofs=[];let count=0;
  for(const [hookIndex,hook] of prepared.content.hooks.entries()){
    if(hook.targets===undefined)continue;
    if(!Array.isArray(hook.targets))throw new Error('Relationship targets must be an array');
    for(const [targetIndex,target] of hook.targets.entries()){
      if(++count>4096)throw new Error('Too many imported relationship targets');
      if(!target||typeof target!=='object'||Array.isArray(target))throw new Error('Structured relationship target required');
      const type=String(target.type||'entity'),label=String(target.label||target.key||'').trim();
      if(!types.has(type)||!label)throw new Error('Valid relationship type and label required');
      if(hook.type==='canon_suggestion'){holds.push({hookIndex,targetIndex,reason:'canon_review_required'});continue;}
      const query=Object.freeze({type,key:target.key??null,label});
      const native=resolve?.(prepared.campaignId,query);
      if(!native){holds.push({hookIndex,targetIndex,reason:'target_unresolved'});continue;}
      if(native.campaignId!==prepared.campaignId||native.type!==type||native.status!=='active'||!id(native.id)||!id(native.revision)||!id(native.label))throw new Error('Current campaign relationship target required');
      const snapshot=JSON.stringify(native);proofs.push({query,snapshot});
      const relationshipType=relations.has(target.relationship_type||'contact')?target.relationship_type||'contact':'other';
      rows.push({from_type:'character',from_key:character.id,from_label:character.name,to_type:type,to_key:native.id,to_label:native.label,
        relationship_type:relationshipType,score:Math.max(-5,Math.min(5,Number(target.score)||0)),visibility:'gm',
        note:String(target.note||hook.premise||'Imported GM-only concept hook.'),source:'external_character_creator',source_character_id:character.id,
        provenance:{source_ref:prepared.sourceRef,source_revision:prepared.sourceRevision,imported_by:prepared.importedBy,hook_index:hookIndex,target_index:targetIndex,target_revision:native.revision},
        authority:'gm_private_connection',consent_authority:false,pc_choice_authority:false,publication_authority:false});
    }
  }
  return {rows,holds,check(){for(const {query,snapshot} of proofs)if(JSON.stringify(resolve(prepared.campaignId,query))!==snapshot)throw new Error('Relationship target changed');}};
}
