import {createHash} from 'node:crypto';
import {buildGmHooksExport,buildGmPrivateExport,buildGmCanonExport,safeStem} from './character-packages.js';
import {characterExportFiles} from './character-export-formats.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Private native export preparation. check must establish fresh human GM
 * authority; this service neither grants it nor approves exported suggestions.
 */
export function createGmCharacterExport({repository,readCharacter=(_campaign,actor)=>repository.getCharacter(actor),hookStore=null}){
 if([repository?.getCharacter,repository?.withValidationSnapshot,repository?.readGmCharacterExportFacets,readCharacter].some(f=>typeof f!=='function'))throw new TypeError('Complete GM export readers required');
 function capture(campaignId,characterId){return repository.withValidationSnapshot(()=>{
  const character=readCharacter(campaignId,characterId);if(character?.id!==characterId||character.guild_id!==campaignId)throw new Error('Current campaign character required');
  const native=hookStore?{hooks:hookStore.listCharacterGmHooks(campaignId,characterId,{includeResolved:true,includeCanonSuggestions:true}),relationships:hookStore.listRelationships(campaignId,{includeGM:true,characterId}),proposals:hookStore.proposals(campaignId,characterId),narrative:hookStore.readNarrative(campaignId,characterId)}:null;
  if(native)native.canon=[...new Set(native.proposals.map(p=>p.canon_key))].map(key=>hookStore.currentCanon(campaignId,key)).filter(row=>row?.character_id===characterId);
  return {character,facets:repository.readGmCharacterExportFacets(campaignId,characterId),native};
 });}
 function prepare({campaignId,characterId,format='json'},{check}){
  if(![campaignId,characterId].every(v=>typeof v==='string'&&v.length>0&&v.length<=256)||typeof check!=='function')throw new Error('Native GM export scope required');
  check();const snapshot=capture(campaignId,characterId),revision=hash(snapshot),{character:c,facets:f}=snapshot;
  const current=()=>{check();if(hash(capture(campaignId,characterId))!==revision)throw new Error('GM export source changed');};
  const n=snapshot.native,hookKeys=new Set(n?.hooks.map(h=>h.hook_key)??[]),edgeKey=r=>JSON.stringify([r.from_type,r.from_key,r.to_type,r.to_key,r.relationship_type,r.visibility,r.source_character_id]),edgeKeys=new Set(n?.relationships.map(edgeKey)??[]);
  const source={listCharacterGmHooks:()=>[...f.hooks.filter(h=>!hookKeys.has(h.hook_key)),...n?.hooks??[]],characterPrivateFacts:()=>f.facts,characterPrivateClocks:()=>f.clocks,characterPrivateThreads:()=>f.threads,characterPrivateReferences:()=>f.references,listRelationships:()=>[...f.relationships.filter(r=>!edgeKeys.has(edgeKey(r))),...n?.relationships??[]],listCanon:()=>f.canon,listCanonConflicts:()=>f.conflicts,listCanonProposals:()=>[...f.proposals,...n?.proposals??[]]};
  const stem=safeStem(c.name),payloads=[['GM_HOOKS',buildGmHooksExport(c,source,campaignId)],['GM_PRIVATE',buildGmPrivateExport(source,campaignId,c)],['GM_CANON',buildGmCanonExport(source,campaignId,c)]];
  if(n?.narrative)payloads[1][1].private_narrative=n.narrative;
  // Keep independently reviewed native canon source-bound instead of silently
  // replacing legacy canon with the same key from a different authority store.
  if(n?.canon.length)payloads[2][1].native_canon=n.canon;
  const files=payloads.flatMap(([prefix,payload])=>characterExportFiles(`${prefix}_${stem}`,payload,{GM_HOOKS:'hooks',GM_PRIVATE:'private',GM_CANON:'canon'}[prefix],format));
  if(files.reduce((sum,f)=>sum+f.bytes,0)>2_000_000)throw new Error('Bounded GM character export required');current();
  return Object.freeze({files:Object.freeze(files),hash:hash(files),revision,check:current});
 }
 return Object.freeze({prepare});
}
