import {createHash} from 'node:crypto';
import {buildPlayerExport,safeStem} from './character-packages.js';
import {characterExportFiles} from './character-export-formats.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
/** Native owner export only. This never grants actor knowledge or imports sheet state.
 * A root may supply the canonical current character projection to include native resources.
 */
export function createOwnerCharacterExport({repository,readCharacter=(_campaign,actor)=>repository.getCharacter(actor)}){
 if([repository?.getCharacter,repository?.withValidationSnapshot,repository?.playerFactsFor,repository?.playerExportRelationships,readCharacter].some(fn=>typeof fn!=='function'))throw new TypeError('Complete native owner export readers required');
 function capture(campaign,owner,actor){
  return repository.withValidationSnapshot(()=>{
   const legacy=repository.getCharacter(actor);
   if(legacy?.id!==actor||legacy.guild_id!==campaign||legacy.owner_user_id!==owner)throw new Error('Current owner character export required');
   const character=readCharacter(campaign,actor);
   if(character?.id!==actor||character.guild_id!==campaign||character.owner_user_id!==owner)throw new Error('Canonical owner character export required');
   return {character,facts:repository.playerFactsFor(campaign,owner,{characterId:actor,limit:200}),relationships:repository.playerExportRelationships(campaign,owner,actor)};
  });
 }
 function prepare({campaignId,ownerUserId,characterId,format='json'},{check}){
  if(![campaignId,ownerUserId,characterId].every(id)||typeof check!=='function')throw new Error('Native owner export scope required');
  check();const snapshot=capture(campaignId,ownerUserId,characterId),revision=hash(snapshot);
  const current=()=>{check();if(hash(capture(campaignId,ownerUserId,characterId))!==revision)throw new Error('Character export inputs changed');};
  const payload=buildPlayerExport({playerFactsFor:()=>snapshot.facts,listRelationships:()=>snapshot.relationships},campaignId,snapshot.character);
  const text=JSON.stringify(payload,null,2)+'\n';if(Buffer.byteLength(text,'utf8')>2_000_000)throw new Error('Bounded character export required');current();
  const files=characterExportFiles(`CHARACTER_${safeStem(snapshot.character.name)}`,payload,'player',format);if(files.reduce((sum,f)=>sum+f.bytes,0)>2_000_000)throw new Error('Bounded character export required');
  return Object.freeze({text,name:`CHARACTER_${safeStem(snapshot.character.name)}.json`,files:Object.freeze(files),hash:hash(files),revision,check:current});
 }
 return Object.freeze({prepare});
}
