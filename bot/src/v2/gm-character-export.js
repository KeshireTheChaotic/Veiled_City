import {createHash} from 'node:crypto';
import {buildGmHooksExport,buildGmPrivateExport,buildGmCanonExport,safeStem} from './character-packages.js';
import {characterExportFiles} from './character-export-formats.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Private native export preparation. check must establish fresh human GM
 * authority; this service neither grants it nor approves exported suggestions.
 */
export function createGmCharacterExport({repository,readCharacter=(_campaign,actor)=>repository.getCharacter(actor)}){
 if([repository?.getCharacter,repository?.withValidationSnapshot,repository?.readGmCharacterExportFacets,readCharacter].some(f=>typeof f!=='function'))throw new TypeError('Complete GM export readers required');
 function capture(campaignId,characterId){return repository.withValidationSnapshot(()=>{
  const character=readCharacter(campaignId,characterId);if(character?.id!==characterId||character.guild_id!==campaignId)throw new Error('Current campaign character required');
  return {character,facets:repository.readGmCharacterExportFacets(campaignId,characterId)};
 });}
 function prepare({campaignId,characterId,format='json'},{check}){
  if(![campaignId,characterId].every(v=>typeof v==='string'&&v.length>0&&v.length<=256)||typeof check!=='function')throw new Error('Native GM export scope required');
  check();const snapshot=capture(campaignId,characterId),revision=hash(snapshot),{character:c,facets:f}=snapshot;
  const current=()=>{check();if(hash(capture(campaignId,characterId))!==revision)throw new Error('GM export source changed');};
  const source={listCharacterGmHooks:()=>f.hooks,characterPrivateFacts:()=>f.facts,characterPrivateClocks:()=>f.clocks,characterPrivateThreads:()=>f.threads,characterPrivateReferences:()=>f.references,listRelationships:()=>f.relationships,listCanon:()=>f.canon,listCanonConflicts:()=>f.conflicts,listCanonProposals:()=>f.proposals};
  const stem=safeStem(c.name),payloads=[['GM_HOOKS',buildGmHooksExport(c,source,campaignId)],['GM_PRIVATE',buildGmPrivateExport(source,campaignId,c)],['GM_CANON',buildGmCanonExport(source,campaignId,c)]];
  const files=payloads.flatMap(([prefix,payload])=>characterExportFiles(`${prefix}_${stem}`,payload,{GM_HOOKS:'hooks',GM_PRIVATE:'private',GM_CANON:'canon'}[prefix],format));
  if(files.reduce((sum,f)=>sum+f.bytes,0)>2_000_000)throw new Error('Bounded GM character export required');current();
  return Object.freeze({files:Object.freeze(files),hash:hash(files),revision,check:current});
 }
 return Object.freeze({prepare});
}
