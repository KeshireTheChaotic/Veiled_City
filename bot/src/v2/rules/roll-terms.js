import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const traits=['agility','strength','finesse','instinct','presence','knowledge'];
/** Native ordinary roll terms. A model cannot supply the sheet or modifier evidence readers.
 * Experience/helper/feature eligibility stays with its native validator; this reader never spends.
 */
export function createRollTermsReader({readActorSnapshot,inspectModifier,readMandatoryRefs}){
  if([readActorSnapshot,inspectModifier,readMandatoryRefs].some(fn=>typeof fn!=='function'))throw new TypeError('Native sheet and mandatory modifier authorities required');
  function capture(source,adjudication){
    if(!adjudication||Object.keys(adjudication).sort().join(',')!=='actorId,campaignId,difficulty,id,modifierRefs,revision,sceneId,sourceRef,sourceRevision,stakes,status,trait'||!id(adjudication.id)||!id(adjudication.revision)||adjudication.status!=='accepted'||adjudication.campaignId!==source.campaign||adjudication.sceneId!==source.scene||adjudication.sourceRef!==source.id||adjudication.sourceRevision!==source.revision||!source.actors.includes(adjudication.actorId))throw new Error('Native adjudication source required');
    const actor=readActorSnapshot(source.campaign,adjudication.actorId),name=adjudication.trait?.toLowerCase(),keys=Object.keys(actor?.data?.traits??{}).filter(k=>k.toLowerCase()===name);
    if(!traits.includes(name)||keys.length!==1||actor.actorId!==adjudication.actorId||actor.ownerUserId!==source.principal||actor.status!=='active'||!id(actor.controlRevision)||!Number.isSafeInteger(actor.data.traits[keys[0]]))throw new Error('Exact current native sheet trait required');
    const refs=adjudication.modifierRefs,mandatory=readMandatoryRefs(source,adjudication,actor);
    if(!Array.isArray(refs)||refs.length>64||refs.some(r=>!id(r))||new Set(refs).size!==refs.length||!Array.isArray(mandatory)||mandatory.length>64||mandatory.some(r=>!id(r))||new Set(mandatory).size!==mandatory.length||mandatory.some(r=>!refs.includes(r)))throw new Error('Complete unique native modifier references required');
    const modifiers=refs.map(ref=>{
      const m=inspectModifier(source,adjudication,ref,actor);
      if(!m||Object.keys(m).sort().join(',')!=='amount,evidenceHash,id,kind,revision,stackKey'||m.id!==ref||!id(m.stackKey)||!id(m.revision)||!['flat','experience','advantage','disadvantage'].includes(m.kind)||!Number.isSafeInteger(m.amount)||['advantage','disadvantage'].includes(m.kind)&&m.amount!==1||m.kind==='experience'&&(m.amount<0||m.amount>20)||typeof m.evidenceHash!=='string'||!/^[a-f0-9]{64}$/.test(m.evidenceHash))throw new Error('Native source-qualified roll modifier required');
      return structuredClone(m);
    });
    if(new Set(modifiers.map(m=>m.stackKey)).size!==modifiers.length)throw new Error('Duplicate canonical native modifier effect');
    if(modifiers.filter(m=>m.kind!=='experience').length>20)throw new Error('Bounded native modifier-source list required');
    const sum=kind=>modifiers.filter(m=>m.kind===kind).reduce((n,m)=>n+m.amount,0),terms={modifier:actor.data.traits[keys[0]]+sum('flat'),experience:sum('experience'),advantage:sum('advantage'),disadvantage:sum('disadvantage')};
    if(!Object.values(terms).every(Number.isSafeInteger))throw new Error('Native roll arithmetic overflow');
    const material={version:1,adjudication:{ref:adjudication.id,revision:adjudication.revision,hash:hash(adjudication)},actorId:actor.actorId,ownerUserId:actor.ownerUserId,controlRevision:actor.controlRevision,trait:{name:keys[0],value:actor.data.traits[keys[0]]},mandatoryRefs:[...mandatory],modifiers};
    return Object.freeze({...terms,termProof:Object.freeze({...material,hash:hash(material)})});
  }
  function inspect(source,adjudication){const first=capture(source,adjudication);if(JSON.stringify(capture(source,adjudication))!==JSON.stringify(first))throw new Error('Native sheet or modifier evidence changed');return first;}
  return Object.freeze({inspect});
}
