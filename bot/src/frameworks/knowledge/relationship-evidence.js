/** Original directional relationship evidence classification; no storage or authority grant. */
export function createRelationshipEvidenceRules(){
 const inferredSource=source=>!['gm','human_gm','hook_import','external_character_creator'].includes(source)&&!String(source).startsWith('seed');
 function relationshipEvidence(row){
  let data={};try{data=JSON.parse(row?.provenance_json||"{}");}catch{/* Preserve malformed legacy originals as uncertain. */}
  return data.epistemic||{kind:inferredSource(row?.source)?"hypothesis":"testimony",source_refs:[],
    perspective:`${row?.from_type||"unknown"}:${row?.from_key||"legacy"}`,authority:"Directional interpretation; never PC feelings, debt or agreement"};
 }
 return {inferredSource,relationshipEvidence};
}
