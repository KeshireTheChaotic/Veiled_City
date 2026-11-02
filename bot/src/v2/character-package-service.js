import {createHash} from 'node:crypto';
import {buildPlayerExport,buildGmHooksExport,buildGmPrivateExport,buildGmCanonExport,playerCharacterProjection} from './character-packages.js';
import {normalizeGmHookImport} from './gm-hook-package.js';

const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=()=>{throw new Error('Current character package authority required');};
const scopes=['player','hooks','private','canon'];
/** Native command boundary, never an AI capability. The repository supplies scoped
 * legacy-compatible readers; its revision must cover every export input.
 */
export function createCharacterPackageService({authenticate,readCharacter,readRevision,repository}){
  if([authenticate,readCharacter,readRevision].some(fn=>typeof fn!=='function')||!repository)throw new TypeError('Native character package dependencies required');
  function authorize(event,characterId,scope,operation){
    const proof=authenticate(event);
    if(!proof||!id(proof.principal)||!id(proof.campaign)||!id(proof.sourceRef)||!id(proof.revision)||!id(characterId)||!scopes.includes(scope)
      ||!['owner','human_gm'].includes(proof.role))fail();
    const character=readCharacter(proof.campaign,characterId);
    if(!character||character.id!==characterId||character.guild_id!==proof.campaign
      ||proof.role!=='human_gm'&&(scope!=='player'||character.owner_user_id!==proof.principal))fail();
    const revision=readRevision(proof.campaign,characterId);if(!id(revision))fail();
    const terms=hash([proof,character,revision,scope,operation]);
    return {proof,character:structuredClone(character),check(){
      const next=authenticate(event),current=readCharacter(proof.campaign,characterId);
      if(hash([next,current,readRevision(proof.campaign,characterId),scope,operation])!==terms)fail();
    }};
  }
  function exportPackage(event,{characterId,scope='player'}){
    const access=authorize(event,characterId,scope,'export'),{proof,character}=access;
    let payload;
    if(scope==='player')payload=buildPlayerExport(repository,proof.campaign,character);
    else if(scope==='hooks')payload=buildGmHooksExport(character,repository,proof.campaign);
    else if(scope==='private')payload=buildGmPrivateExport(repository,proof.campaign,character);
    else payload=buildGmCanonExport(repository,proof.campaign,character);
    access.check();return structuredClone(payload);
  }
  function prepareImport(event,{characterId,scope,payload}){
    const access=authorize(event,characterId,scope,'import');
    // Bound and normalize JSON before parsing. Package labels do not grant authority.
    const serialized=JSON.stringify(payload);if(!serialized||serialized.length>2_000_000)throw new Error('Bounded JSON character package required');
    const packet=JSON.parse(serialized);if(!packet||typeof packet!=='object'||Array.isArray(packet))throw new Error('Character package object required');
    const schema=packet.schema??packet.export_meta?.schema;
    let content;
    if(scope==='hooks')content=normalizeGmHookImport(packet);
    else{
      const expected={player:'veiled-city-character-export-v3.3.3',private:'veiled-city-gm-private-v3.3.3',canon:'veiled-city-gm-canon-v3.3.3'}[scope];
      if(schema!==expected)throw new Error('Unsupported character package schema');
      if(scope==='player'&&packet.export_meta?.visibility!=='player_safe'||scope!=='player'&&packet.export_meta?.visibility!=='gm_private')throw new Error('Character package scope mismatch');
      content=scope==='player'?playerCharacterProjection(packet):packet;
    }
    const result={version:1,campaignId:access.proof.campaign,characterId,sourceRef:access.proof.sourceRef,sourceRevision:access.proof.revision,
      importedBy:access.proof.principal,scope,visibility:scope==='player'?'owner':'gm',status:'awaiting_native_validation',content,
      executionAuthority:false,publicationAuthority:false,canonAuthority:false};
    result.id=`character-import:${hash(result)}`;access.check();return result;
  }
  return Object.freeze({exportPackage,prepareImport});
}
