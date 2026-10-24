/** Native roll-declaration-review policy; owner/source/continuation services are explicit capabilities. */
import {createHash} from 'node:crypto';
import {StateConflictError} from '../../kernel/errors.js';
export function createRollDeclarationReviewRules({capabilities}){
const {personalCharacter,requireCitySource,adjudicateRollSource,contributeRoll}=capabilities||{};
if([personalCharacter,requireCitySource,adjudicateRollSource,contributeRoll].some(fn=>typeof fn!=='function'))throw new TypeError('Native roll-declaration-review capabilities required');
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0,40);
/** Human review acts on the owner's persisted exact preauthorization, never on a model-supplied user or consent boolean. */
function reviewRollDeclaration(db,guild,input,reviewer,context={}){
  if(!reviewer||reviewer==="ai_policy") throw new StateConflictError("Human feasibility/rules review required.");
  const source=requireCitySource(db,guild,input.source_event),a=source.details.authorization;
  if(source.kind!=="roll_contribution"||source.source_id!==`player:${source.details.author}`||!a
    ||source.visibility!=="character"||source.subject_key!==source.details.character_id||!db.ownerAuthoredSource(guild,source.event_key,source.details.author))
    throw new StateConflictError("An authenticated captured owner authorization is required.");
  const pc=personalCharacter(db,guild,source.details.author,source.subject_key);
  if(context.scope?.mode==="private"&&(context.scope.actorUserId!==pc.owner_user_id||context.scope.actorCharacterId!==pc.id))
    throw new StateConflictError("Private contribution belongs only to its actual author.");
  return db.transaction(()=>{
  const proof=adjudicateRollSource(db,guild,{key:`roll-proof:${hash(source.event_key)}`,character_id:pc.id,kind:"participation",ruling_key:input.ruling_key,
    data:{request:a.request,character_id:pc.id,kind:a.op,description:a.description,experience:a.experience||""}},reviewer);
  return contributeRoll(db,guild,pc.owner_user_id,{...a,proof:proof.event_key});
  });
}

return Object.freeze({reviewRollDeclaration});
}
