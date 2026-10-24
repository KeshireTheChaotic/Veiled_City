/** Native pre-roll Fear announcement eligibility and exact owner-only reservation. Rendering/transport remain with their existing producer. */
export function createPreRollFearNoticeRules({capabilities}){
const {inspectPreRollFear,inspectNativeGmDecision,reserveNativeNotice,noticeHash,held}=capabilities||{};
if([inspectPreRollFear,inspectNativeGmDecision,reserveNativeNotice,noticeHash,held].some(fn=>typeof fn!=='function'))throw new TypeError('Native pre-roll Fear notice capabilities required');
const reservationEvent=binding=>`pre-roll-fear:${binding.request}:state:awaiting_announcement`;
function validated(db,guild,key,scope){
  const inspected=inspectPreRollFear(db,guild,key,{current:true});
  const {row,binding,entry}=inspected||{};
  const checked=binding?.decision&&inspectNativeGmDecision(db,guild,binding.decision),ruling=checked?.row,
    currentEntry=checked?.entry,proposal=ruling?.data?.proposal,native=ruling?.data?.native;
  if(!row||!binding||!entry||!['awaiting_announcement','executing'].includes(row.status)
    ||row.source_event!==reservationEvent(binding)||binding.version!==1||binding.base_cost!==1
    ||binding.owner!==scope?.actorUserId||binding.character!==scope?.actorCharacterId||scope?.mode!=='private'
    ||!Array.isArray(entry.target_refs)||entry.target_refs.length!==1
    ||entry.intent_ref!==binding.entry_ref||entry.actor?.type!=='npc'||entry.actor?.key!==binding.npc||entry.operation!=='attack'
    ||entry.target_refs[0]!==binding.character||!ruling||ruling.status!=='gm_action_ready'
    ||!currentEntry||currentEntry.intent_ref!==binding.entry_ref
    ||ruling.data.board!==binding.board||ruling.data.entry!==binding.entry_ref
    ||ruling.data.entry_hash!==noticeHash(entry)||ruling.data.proposal_hash!==noticeHash(proposal)
    ||!ruling.data.origin||noticeHash(ruling.data.origin)!==noticeHash(binding.origin)
    ||proposal?.disposition!=='gm_attack_roll'||proposal.feature_ref!=='standard_attack'||proposal.experience_ref
    ||proposal.advantage||proposal.disadvantage||native?.operation!=='commit_adversary_attack'
    ||native.input?.npc!==binding.npc||native.input?.character!==binding.character
    ||binding.owner!==db.getCharacter(binding.character)?.owner_user_id)held();
  return {...inspected,ruling};
}

/** Exact owner-only acknowledgment text; this is notice of a reserved decision, not consent or execution. */
function preRollFearAnnouncement(db,guild,key,scope){
  const {row,binding,entry}=validated(db,guild,key,scope);
  const revision=noticeHash(binding);
  return {kind:'pre_roll_fear',ref:key,user:binding.owner,character:binding.character,revision,
    session:binding.session,scene:binding.scene,npc:binding.npc,target:entry.target_refs[0],
    base_cost:binding.base_cost,printed_fear_cost:binding.printed_fear_cost};
}

function reservePreRollFearNotice(db,guild,key){
  const inspected=inspectPreRollFear(db,guild,key,{current:true})||{}, {row,binding}=inspected;
  if(!row||!binding||row.source_event!==reservationEvent(binding)||!['awaiting_announcement','executing'].includes(row.status))held();
  validated(db,guild,key,{mode:'private',actorUserId:binding.owner,actorCharacterId:binding.character});
  const revision=noticeHash(binding);
  return reserveNativeNotice(db,guild,{kind:'pre_roll_fear_publication',
    key:`pre-roll-fear-publication:${noticeHash(key)}`,source:row.source_event,
    notice:{kind:'pre_roll_fear',ref:key,user:binding.owner,character:binding.character,revision}});
}


return Object.freeze({preRollFearAnnouncement,reservePreRollFearNotice,validatePreRollFearNotice:validated});
}
