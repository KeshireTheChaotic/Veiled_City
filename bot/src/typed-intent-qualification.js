/** Deterministic release gate for typed-intent omission, overreach, privacy and exactly-once failures. */
const blockers=["false_success","mis_scoped_npc_knowledge","unnecessary_rolls","missing_rolls","duplicate_receipts",
  "invalid_cross_player_conflicts","secret_leaks","unauthorized_effects","skipped_security_suites"];
const measured=["semantic_omissions","semantic_overreach","false_refusal",...blockers];

export function qualifyTypedIntentRelease(metrics,validation={}){
  if(!metrics||measured.some(key=>!Number.isSafeInteger(metrics[key])||metrics[key]<0))
    throw new Error("Qualification requires complete nonnegative integer metrics.");
  const required=new Set(validation.required_suites||[]),passed=new Set(validation.passed_suites||[]);
  const missing=[...required].filter(id=>!passed.has(id));
  const failures=blockers.filter(key=>metrics[key]>0).map(key=>({metric:key,count:metrics[key]}));
  if(missing.length)failures.push({metric:"missing_required_suites",count:missing.length,suites:missing});
  return {ready:failures.length===0,metrics:{...metrics},failures,required_suites:[...required],
    fixture_only:true,network:"denied",billable_tokens:0,live_requests:0,
    limits:["Offline synthetic qualification does not certify unrestricted live-model semantic accuracy.",
      "Semantic omissions, overreach and false refusals remain separately reported even when not consequence-authority breaches."]};
}
