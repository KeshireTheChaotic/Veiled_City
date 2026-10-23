/** Exact existing source-keyed native feature trigger conditions. Prose cannot supply these facts. */
export function nativeFeatureTriggerEligible(feature,p){
  if(feature?.feature_key==='adversary:static-wraith:feedback')return !!p?.device;
  if(feature?.feature_key==='adversary:pale-court-knight:blood-rush')return p?.phase==='after_damage'&&p.receipt?.data?.hp_marks>=2;
  if(feature?.feature_key==='adversary:aster-vale-catastrophe-analyst:bad-branch')return p?.phase==='on_pc_action'
    &&p.proof?.outcome==='success'&&p.request?.data?.result?.duality==='Fear';
  return false;
}
