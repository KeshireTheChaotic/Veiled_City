import {stateRevision} from '../../kernel/state-revision.js';
import {FEATURE_FLAGS,validateIntent} from './ai-intent-contracts.js';
import {delegationPolicy} from './delegation-policy.js';
import {adapters} from './adapter-registry.js';
import {intentWorldPrimitives} from './contracts/world-primitives.js';
import {intentWorldOperations} from './contracts/world-operations.js';
import {intentWorldConstraints} from './contracts/world-constraints.js';
import {intentSessionPrincipal} from './contracts/session-principal.js';
import {intentOrdinaryBinding} from './contracts/ordinary-binding.js';
const {requireCitySource}=intentWorldPrimitives;
const {nativeWorldOperationAllows}=intentWorldOperations;
const {activeCityProxy}=intentWorldConstraints;
const {conversationPrincipal}=intentSessionPrincipal;
const {assertOrdinaryBinding}=intentOrdinaryBinding;
function preflight(db,guild,intent,context){
  if(!validateIntent(intent)) throw new Error("Invalid closed versioned intent contract.");
  assertOrdinaryBinding(db,guild,context.ordinaryEffect,intent,context.origin);
  const privateWorld=context.scope?.mode==="private"&&!['arc','project','discovery','dialogue','organization','setup','roll'].includes(intent.feature)
    &&!(intent.feature==="scene"&&intent.payload.op==="enter");
  if(privateWorld){
    conversationPrincipal(db,guild,context.scope.actorUserId,context.scope.actorCharacterId);
    if(!delegationPolicy(db,guild).private_allow?.includes(`${intent.feature}.${intent.payload.op}`))
      throw new Error("Private world operation needs explicit private_allow delegation.");
    if(intent.payload.actor_type==="character"||intent.payload.actor_type==="npc"&&activeCityProxy(db,guild,intent.payload.actor_key))
      throw new Error("Private world authority does not take over PCs or proxied NPCs.");
    if(intent.feature==="scene"&&!["gm","character","player"].includes(intent.payload.visibility))
      throw new Error("Private scene evidence cannot publish party presence.");
  }
  if(context.scope?.mode==="private"&&intent.feature==="setup"&&intent.payload.character_id!==context.scope.actorCharacterId)
    throw new Error("Private setup invitation belongs to this character only.");
  if(context.scope?.mode==="private"&&intent.feature==="organization"&&intent.payload.character_id!==context.scope.actorCharacterId)
    throw new Error("Private organization invitation belongs to this character only.");
  if(context.scope?.mode==="private"&&intent.feature==="dialogue"){
    const source=requireCitySource(db,guild,intent.payload.source_event);
    if(source.details.author!==context.scope.actorUserId||source.details.character_id!==context.scope.actorCharacterId)
      throw new Error("Private dialogue must belong to this authenticated character.");
  }
  if(db.getCityCalendar(guild).flags[FEATURE_FLAGS[intent.feature]]!==true
    &&!nativeWorldOperationAllows(db,guild,context.nativeWorldGrant,intent.feature,intent.payload.op,intent.payload))
    throw new Error("Feature is disabled or has no qualified native world-operation authority.");
  if(db.isDirectorPaused(guild)) throw new Error("Director is paused.");
  for(const key of new Set([intent.payload.source_event,...intent.source_prerequisites])) requireCitySource(db,guild,key);
  const adapter=adapters.get(intent.feature);if(!adapter) throw new Error("Domain adapter is not available yet.");
  const before=adapter.current(db,guild,intent);
  if(privateWorld&&before&&["public","party"].includes(before.visibility))throw new Error("Public target needs a separately reviewed projection; do not overwrite its private causal history.");
  if(stateRevision(before)!==intent.expected_revision) throw new Error("Stale target revision; propose again from current state.");
  const impact=adapter.impact(db,guild,intent,before,context);
  return {adapter,before,impact,privateWorld};
}
function applyNative(db,guild,intent,key,actor,context,adapter,privateWorld){
  if(!privateWorld)return adapter.apply(db,guild,intent,key,actor,context);
  // Causal annotations remain GM-private. Native world state may change, but this
  // turn is never relabelled party and public observations require separate review.
  const marker=db.privateCausalMarker(guild);
  const result=adapter.apply(db,guild,intent,key,actor,context);
  db.retainPrivateCausality(guild,marker);
  return result;
}
export {preflight,applyNative};
