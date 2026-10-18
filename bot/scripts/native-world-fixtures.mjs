/** Legacy producer migration fixture: explicit trusted GM authoring before the unchanged native effect assertions.
 * This is not used by production and never grants authority to a model/player field. Raw bypass negatives call production directly.
 */
import path from 'node:path';
import {ContentIndex} from '../src/content.js';
import {worldAdditionsSchema,establishNarrativeEntity,worldAuthority} from '../src/autonomous-world.js';
import {bindDirectorNarrativeSource} from '../src/narrative-director-source.js';
import {buildNarrativeContext} from '../src/narrative-authority-context.js';
import {matchesArbitrationSchema} from '../src/gm-arbitration-contract.js';
import {applyAuthoritativeMutation,previewAuthoritativeMutation} from '../src/state.js';
const content=new ContentIndex(path.resolve('../content'));
/** Explicit fixture-issued independent GM identity proposals; restores the original gameplay flags. */
export function establishFixtureAdditions(db,{guildId,scope,provenance,narrative}){
  const additions=narrative?.world_additions||[],flags=db.getCityCalendar(guildId).flags;
  if(!matchesArbitrationSchema(worldAdditionsSchema,additions)||worldAuthority(db,guildId).gm_authority_mode==='manual')return;
  if(additions.some(a=>!a.name.trim()||!a.summary.trim()||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.key)))return;
  db.setCityCalendar(guildId,{flags:{...flags,scene_continuity:true,playable_narration:true,narrative_authority:true,narrative_camera:true,narrative_encounters:true}});
  try{
    // A fixture GM opportunity is independently native-minted, not a player's named assertion.
    const source=bindDirectorNarrativeSource(db,guildId,{},scope,'scene',{kind:'fixture_gm_setup',id:provenance.messageId},content);
    for(const a of additions){
      if(db.getSimulationEntity(guildId,a.kind,a.key)||a.visibility==='gm')continue;
      const ctx=buildNarrativeContext(db,guildId,scope,source);
      establishNarrativeEntity(db,guildId,{kind:a.kind,key:a.key,name:a.name,summary:a.summary,aliases:[],
        location_key:a.kind==='npc'?a.location_key:'',parent_location_key:a.kind==='location'?a.parent_location_key:'',role:a.occupation||'ordinary public place'},ctx,{content});
    }
  }finally{db.setCityCalendar(guildId,{flags});}
}
export function applyNativeFixtureMutation(db,input){
  return db.transaction(()=>{establishFixtureAdditions(db,input);return applyAuthoritativeMutation(db,input);});
}
export function previewNativeFixtureMutation(db,input){
  const rollback={};let result;
  try{db.transaction(()=>{establishFixtureAdditions(db,input);result=previewAuthoritativeMutation(db,input);throw rollback;});}
  catch(error){if(error!==rollback)throw error;}return result;
}
