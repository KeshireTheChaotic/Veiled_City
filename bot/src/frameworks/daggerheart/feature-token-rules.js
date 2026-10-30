/** Native token operations over existing city records and world events.
 * Only the host's source/actor/trigger validator derives amounts and scope.
 * Preparing a token does not authorize a roll, PC decision or public disclosure.
 */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
import {nativeResourcePlan} from './feature-operation-plans.js';

export function createFeatureTokenRules({authorize,inspectCause,indexWorldEvent}){
  if([authorize,inspectCause,indexWorldEvent].some(fn=>typeof fn!=='function'))throw new TypeError('Native token source/trigger capabilities required.');
  const prepared=new WeakMap();
  const issuer='native:feature-token';
  const balanceKey=terms=>`feature-token-balance:${hash([terms.actor,terms.pool])}`;
  const receiptKey=terms=>`feature-token:${hash([terms.actor,terms.pool,terms.feature,terms.occurrence])}`;

  function termsFor(db,guild,input){
    if(!input||Object.keys(input).sort().join()!=='actor,cause,feature'
      ||Object.values(input).some(value=>typeof value!=='string'||!value||value.length>200))throw fail('feature_token_closed_input');
    const terms=authorize(db,guild,input);
    if(!terms||Object.keys(terms).sort().join()!=='actor,amount,cap,cause,feature,feature_hash,location,occurrence,operation,pool,scene,session,source_hash,template_hash'
      ||['actor','pool','cause','feature','feature_hash','source_hash','template_hash','location','occurrence','scene','session'].some(key=>typeof terms[key]!=='string'||!terms[key])
      ||terms.feature!==input.feature||terms.actor!==input.actor||terms.cause!==input.cause
      ||!['gain','spend','clear'].includes(terms.operation)||!Number.isSafeInteger(terms.amount)||terms.amount<0
      ||!Number.isSafeInteger(terms.cap)||terms.cap<1||terms.cap>100||terms.amount>terms.cap
      ||terms.operation==='clear'&&terms.amount!==0)throw fail('feature_token_native_terms');
    const cause=inspectCause(db,guild,terms.cause,{historical:false});
    if(!cause||cause.scene!==terms.scene||cause.session!==terms.session||typeof cause.source_event!=='string'||!cause.source_event)throw fail('feature_token_current_cause');
    return {...structuredClone(terms),cause_hash:hash(cause),cause_source:cause.source_event};
  }

  function inspectFeatureTokenReceipt(db,guild,key,{seen=new Set()}={}){
    if(seen.has(key)||seen.size>=1000)throw fail('feature_token_receipt_cycle_or_depth');
    seen.add(key);
    const row=db.getCityRecord(guild,'native_feature_token_receipt',key),v=row?.data,event=row&&db.getWorldEvent(guild,row.source_event);
    if(row?.status!=='committed'||row.visibility!=='gm'||v?.version!==1||key!==receiptKey(v.terms)
      ||event?.status!=='active'||event.kind!=='native_feature_token_operation'||event.source_id!==issuer||event.visibility!=='gm'
      ||event.scene!==v.terms.scene||event.session_id!==v.terms.session||event.location_key!==v.terms.location||event.details.payload_hash!==hash(v)
      ||event.details.input_source!==v.terms.cause_source||hash(inspectCause(db,guild,v.terms.cause,{historical:true}))!==v.terms.cause_hash)
      throw fail('feature_token_receipt_ancestry');
    const previous=v.previous?inspectFeatureTokenReceipt(db,guild,v.previous,{seen}).data:null;
    const {cause_hash,cause_source,...savedTerms}=v.terms;
    const historical=authorize(db,guild,{actor:savedTerms.actor,feature:savedTerms.feature,cause:savedTerms.cause},{historical:true});
    if(hash(historical)!==hash(savedTerms))throw fail('feature_token_historical_source_changed');
    if(previous&&(previous.terms.actor!==v.terms.actor||previous.terms.pool!==v.terms.pool)
      ||v.before!==(previous?.after??0))throw fail('feature_token_previous_balance');
    const delta=v.terms.operation==='clear'?-v.before:v.terms.operation==='gain'?v.terms.amount:-v.terms.amount;
    const plan=nativeResourcePlan({current:v.before,max:v.terms.cap},delta,{overflow:v.terms.operation==='gain'?'cap':'hold'});
    if(v.after!==plan.after||v.delta!==plan.delta)throw fail('feature_token_receipt_arithmetic');
    return row;
  }

  function currentBalance(db,guild,terms){
    const row=db.getCityRecord(guild,'native_feature_token_balance',balanceKey(terms));
    if(!row)return {value:0,receipt:null};
    const receipt=inspectFeatureTokenReceipt(db,guild,row.data?.receipt);
    if(row.status!=='active'||row.visibility!=='gm'||row.data.actor!==terms.actor||row.data.pool!==terms.pool
      ||row.source_event!==receipt.source_event||row.data.value!==receipt.data.after
      ||receipt.data.terms.actor!==terms.actor||receipt.data.terms.pool!==terms.pool)throw fail('feature_token_balance_projection');
    return {value:row.data.value,receipt:receipt.record_key};
  }

  function preflightFeatureToken(db,guild,input){
    const terms=termsFor(db,guild,input),prior=db.getCityRecord(guild,'native_feature_token_receipt',receiptKey(terms));
    if(prior){inspectFeatureTokenReceipt(db,guild,prior.record_key);return {status:'already_committed',receipt:prior.record_key};}
    const balance=currentBalance(db,guild,terms),delta=terms.operation==='clear'?-balance.value:terms.operation==='gain'?terms.amount:-terms.amount;
    const plan=nativeResourcePlan({current:balance.value,max:terms.cap},delta,{overflow:terms.operation==='gain'?'cap':'hold'});
    const token=Object.freeze(Object.create(null));prepared.set(token,{guild,input:structuredClone(input),terms,balance,plan});
    return {status:'ready',token};
  }

  function commitFeatureToken(db,guild,token){
    const saved=prepared.get(token);if(!saved||saved.guild!==guild)throw fail('feature_token_native_preparation_required');
    return db.transaction(()=>{
      const key=receiptKey(saved.terms),prior=db.getCityRecord(guild,'native_feature_token_receipt',key);
      if(prior)return inspectFeatureTokenReceipt(db,guild,key); // Historical replay never revalidates a live actor or spends again.
      const terms=termsFor(db,guild,saved.input),balance=currentBalance(db,guild,terms);
      if(hash(terms)!==hash(saved.terms)||hash(balance)!==hash(saved.balance))throw fail('feature_token_preparation_changed');
      const data={version:1,terms,before:saved.plan.before,after:saved.plan.after,delta:saved.plan.delta,previous:balance.receipt};
      const event=indexWorldEvent(db,guild,{key:`${key}:source`,kind:'native_feature_token_operation',source_id:issuer,
        title:'Source-qualified GM token operation',session_id:terms.session,scene:terms.scene,location_key:terms.location,
        visibility:'gm',details:{input_source:terms.cause_source,payload_hash:hash(data)}},issuer);
      if(event?.status!=='active'||event.visibility!=='gm'||event.details?.payload_hash!==hash(data))throw fail('feature_token_event_changed');
      const receipt=db.saveCityRecord(guild,{kind:'native_feature_token_receipt',key,status:'committed',visibility:'gm',source_event:event.event_key,data});
      db.saveCityRecord(guild,{kind:'native_feature_token_balance',key:balanceKey(terms),status:'active',visibility:'gm',source_event:event.event_key,
        data:{actor:terms.actor,pool:terms.pool,value:data.after,receipt:key}});
      return receipt;
    });
  }

  return Object.freeze({preflightFeatureToken,commitFeatureToken,inspectFeatureTokenReceipt});
}
