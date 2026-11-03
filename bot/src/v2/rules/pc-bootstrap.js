import {createHash} from 'node:crypto';
import {incomingDamageOutcome} from './incoming-damage.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
/** Fixed atomic initialization, never a resource patch or replacement. */
export function createPcBootstrap({db,tx}){
  function initialize(campaignId,actorId,{check,readSource,inspectReview}){
    if(typeof check!=='function'||typeof readSource!=='function'||typeof inspectReview!=='function')throw new Error('Reviewed native bootstrap readers required');
    const source=structuredClone(readSource(campaignId,actorId)),review=structuredClone(inspectReview(campaignId,actorId));
    if(!source||Object.keys(source).sort().join(',')!=='actorId,armorSlots,campaignId,controlRevision,deathState,hope,hopeCap,hp,kind,level,ownerUserId,sourceRef,sourceRevision,status,stress'||source.kind!=='native_character_snapshot'||source.campaignId!==campaignId||source.actorId!==actorId||!['campaignId','actorId','ownerUserId','controlRevision','sourceRef','sourceRevision'].every(k=>id(source[k]))||source.status!=='active'||source.deathState!==null||!Number.isSafeInteger(source.level)||source.level<1||source.level>10||!Number.isSafeInteger(source.hopeCap)||source.hopeCap<1||source.hopeCap>6||!Number.isSafeInteger(source.hope)||source.hope<0||source.hope>source.hopeCap||!source.stress||Object.keys(source.stress).sort().join(',')!=='current,max'||![source.stress.current,source.stress.max].every(Number.isSafeInteger)||source.stress.max<1||source.stress.current<0||source.stress.current>source.stress.max||[source.hp,source.armorSlots].some(r=>!r||Object.keys(r).sort().join(',')!=='current,max'))throw new Error('Closed active native PC bootstrap snapshot required; historical state needs migration');
    incomingDamageOutcome({damage:0,major:1,severe:2,hp:source.hp,armorSlots:source.armorSlots,defenses:{resistance:'none',armorReduction:1,armorAllowed:true},useArmor:false});if(source.hp.current===source.hp.max)throw new Error('Final-HP cause and death state require reviewed migration');
    if(review?.kind!=='human_gm_pc_bootstrap_review'||review.status!=='approved'||review.role!=='human_gm'||review.campaignId!==campaignId||review.actorId!==actorId||review.ownerUserId!==source.ownerUserId||review.controlRevision!==source.controlRevision||review.snapshotHash!==hash(source)||!['id','principal','sourceRef','sourceRevision'].every(k=>id(review[k])))throw new Error('Exact native human GM bootstrap review required');
    const guard=()=>{check();if(hash(readSource(campaignId,actorId))!==hash(source)||hash(inspectReview(campaignId,actorId))!==hash(review))throw new Error('Native bootstrap snapshot or review changed');};
    return tx(guard,()=>{
      const receiptId=`pc-bootstrap:${actorId}`,old=db.prepare('SELECT data FROM vk3_action_events WHERE campaign=? AND source=?').get(campaignId,receiptId);
      if(old){const receipt=JSON.parse(old.data);if(receipt.kind!=='reviewed_pc_bootstrap'||hash(receipt.source)!==hash(source)||hash(receipt.review)!==hash(review))throw new Error('Immutable bootstrap receipt conflict');return receipt;}
      if(['vk3_pc_defenses','vk3_action_hope','vk3_pc_life'].some(table=>db.prepare(`SELECT 1 FROM ${table} WHERE campaign=? AND actor=?`).get(campaignId,actorId)))throw new Error('Existing or partial native PC initialization requires reconciliation');
      const identity={campaignId,actorId,ownerUserId:source.ownerUserId},defenses={...identity,controlRevision:source.controlRevision,hp:source.hp,armorSlots:source.armorSlots,revision:1},hope={...identity,hope:source.hope,cap:source.hopeCap,revision:1},life={...identity,controlRevision:source.controlRevision,sourceRef:source.sourceRef,sourceRevision:source.sourceRevision,level:source.level,stress:source.stress,status:'active',deathState:null,revision:1};
      db.prepare('INSERT INTO vk3_pc_defenses VALUES(?,?,?)').run(campaignId,actorId,JSON.stringify(defenses));db.prepare('INSERT INTO vk3_action_hope VALUES(?,?,?)').run(campaignId,actorId,JSON.stringify(hope));db.prepare('INSERT INTO vk3_pc_life VALUES(?,?,?)').run(campaignId,actorId,JSON.stringify(life));
      const receipt={id:receiptId,kind:'reviewed_pc_bootstrap',status:'initialized',source,review,state:{life,defenses,hope},effectsCommitted:true};db.prepare('INSERT INTO vk3_action_events VALUES(?,?,?)').run(campaignId,receiptId,JSON.stringify(receipt));return receipt;
    });
  }
  return Object.freeze({initializePcFromReviewedSource:initialize});
}
