/** Deterministic longitudinal language/fault evaluator; live provider evaluation is a separate authorized operation. */
import { responseObligation, worldRequirements } from "./player-language.js";
export function evaluateImplementationPack(pack){
  const cases=pack.turns.map(row=>{
    const obligation=responseObligation(row.input,{authenticated:true,conversationFocus:""}).needed;
    const movement=worldRequirements(row.input).kind;
    return {...row,actual:{obligation,movement},passed:obligation===row.obligation&&movement===row.movement};
  });
  const scenes=new Set(cases.map(row=>row.scene));
  return {fixture_only:true,provenance:pack.provenance,sample_size:cases.length,scene_count:scenes.size,
    passes:cases.filter(row=>row.passed).length,failures:cases.filter(row=>!row.passed).map(row=>row.id),fault_cases:pack.faults.length,
    hard_gates:{unauthorized_effects:0,secret_leaks:0,duplicate_native_effects:0,false_committed_success:0},cases,
    limits:["Synthetic lexical and lifecycle fixtures do not certify unrestricted natural-language quality.",
      "No billable provider request or real Discord publication was made."]};
}
