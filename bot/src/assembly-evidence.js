import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
/** Native prose acceptance is observable; semantic fulfillment is not inferred from prose or model claims. */
export function assemblyCoverageEvidence(plan,sessionId){
  const contract=plan?.assembly_contract?.version===2?plan.assembly_contract:null,
    goal=typeof plan?.convergence_goal==='string'?plan.convergence_goal:null;
  return {dramatic_coverage:'unverified',coverage_reason:'semantic_coverage_not_natively_proven',
    dramatic_intent_revision:contract&&goal!==null?hash([sessionId,contract.input_fingerprint,goal]):null};
}
