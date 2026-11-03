import {createHash} from 'node:crypto';
import {gmD20Roll,gmAttackDamage} from './dice.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Native saved-hit/owner-choice adapter. No model-supplied faces or resource
 * patches. Replay is receipt inspection, not another attack against later state.
 */
export function createIncomingDamageAuthority({fearStore,actionStore,sourceAuthority,readActor,readArmorChoice}){
  if(typeof fearStore?.read!=='function'||typeof actionStore?.commitIncomingDamage!=='function'||typeof sourceAuthority?.inspectReference!=='function'||[readActor,readArmorChoice].some(f=>typeof f!=='function'))throw new TypeError('Native incoming damage authority dependencies required');
  function evidence(c,q,choiceRef){
    const row=fearStore.read(c,q),incoming=row?.incoming,t=incoming?.terms,r=incoming?.result;
    if(!t||!r||!['executing','completed'].includes(row.status)||!['awaiting_armor','resolved'].includes(incoming.status)||hash(t)!==incoming.termsHash||r.id!==`${t.id}:roll`||r.termsHash!==incoming.termsHash||r.campaignId!==c||r.requestRef!==q||r.attackRef!==t.id||r.decisionRef!==t.decisionRef||r.reviewRef!==incoming.review?.id||r.choiceRef!==incoming.choices?.at(-1)?.id||r.fearCommitted!==true||r.fear?.amount!==1||![r.fear.before,r.fear.after].every(Number.isSafeInteger)||r.fear.before>12||r.fear.after<0||r.fear.before-r.fear.after!==1||r.roll?.success!==true)throw new Error('Saved committed native hit required');
    const original=sourceAuthority.inspectReference(t.sourceRef,t.sourceRevision),actor=readActor(c,t.actorId),prior=actionStore.readIncomingDamage(c,t.id);
    if(original.campaign!==c||original.scene!==t.sceneId||original.principal!==t.ownerUserId||!original.actors.includes(t.actorId)||actor?.id!==t.actorId||actor.kind!=='pc'||actor.campaignId!==c||actor.sceneId!==t.sceneId||actor.ownerUserId!==t.ownerUserId||actor.controllerUserId!==t.ownerUserId||actor.controlRole!=='owner'||actor.controlRevision!==t.controlRevision||!prior&&(actor.status!=='active'||actor.revision!==t.targetRevision))throw new Error('Current native affected owner and target revision required');
    let i=0;const expected=gmD20Roll({kind:'attack',modifier:t.attackBonus,difficulty:t.evasion,advantage:t.advantage,disadvantage:t.disadvantage},()=>r.roll.faces?.[i++]);
    if(i!==r.roll.faces?.length||JSON.stringify(expected)!==JSON.stringify(r.roll))throw new Error('Native saved attack dice mismatch');
    i=0;const damage=gmAttackDamage(expected,t.damageExpression,()=>r.damage?.dice?.[i++]);
    if(i!==r.damage?.dice?.length||JSON.stringify(damage)!==JSON.stringify(r.damage))throw new Error('Native saved damage dice mismatch');
    const choice=readArmorChoice(c,choiceRef),resultHash=hash(r),proof=choice&&sourceAuthority.inspectReference(choice.sourceRef,choice.sourceRevision);
    if(choice?.id!==choiceRef||choice.kind!=='incoming_armor_choice'||choice.campaignId!==c||choice.sceneId!==t.sceneId||choice.actorId!==t.actorId||choice.ownerUserId!==t.ownerUserId||choice.controlRevision!==t.controlRevision||choice.attackRef!==t.id||choice.termsHash!==incoming.termsHash||choice.resultRef!==r.id||choice.resultHash!==resultHash||typeof choice.useArmor!=='boolean'
      ||proof?.campaign!==c||proof.scene!==t.sceneId||proof.principal!==t.ownerUserId||!proof.actors.includes(t.actorId)||!Array.isArray(proof.recipients)||proof.recipients.length!==1||proof.recipients[0]!==t.ownerUserId)throw new Error('Explicit private affected-owner Armor choice required');
    return {attack:{id:t.id,campaignId:c,sceneId:t.sceneId,actorId:t.actorId,ownerUserId:t.ownerUserId,controlRevision:t.controlRevision,resultRef:r.id,resultHash,termsHash:incoming.termsHash,sourceRef:t.sourceRef,sourceRevision:t.sourceRevision,damage:damage.total,major:t.major,severe:t.severe,defenses:{resistance:t.defenses.resistance,armorReduction:t.defenses.armorReduction,armorAllowed:t.defenses.armorAllowed}},
      choice:{id:choice.id,kind:choice.kind,campaignId:c,sceneId:t.sceneId,attackRef:t.id,actorId:t.actorId,ownerUserId:t.ownerUserId,controlRevision:t.controlRevision,resultRef:r.id,resultHash,termsHash:incoming.termsHash,sourceRef:choice.sourceRef,sourceRevision:choice.sourceRevision,useArmor:choice.useArmor}};
  }
  function commit(c,q,choiceRef){
    const initial=evidence(c,q,choiceRef),fingerprint=hash(initial),prior=actionStore.readIncomingDamage(c,initial.attack.id),state=actionStore.readPcDefenses(c,initial.attack.actorId);
    return actionStore.commitIncomingDamage({campaignId:c,attackRef:initial.attack.id,expectedRevision:prior?.request.expectedRevision??state?.revision},{readAttack:()=>evidence(c,q,choiceRef).attack,readArmorChoice:()=>evidence(c,q,choiceRef).choice,check(){if(hash(evidence(c,q,choiceRef))!==fingerprint)throw new Error('Incoming damage evidence changed');}});
  }
  return Object.freeze({commit});
}
