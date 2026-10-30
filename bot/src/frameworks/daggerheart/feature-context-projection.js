/** Project only verified template rules already obtained behind current native actor/audience binding.
 * This is GM-private prompt material. It cannot be used as an effect or publication receipt.
 */
export function projectFeatureRuleContexts(binding,rows,{environment=false}={}){
  if(!binding||!Array.isArray(rows))return [];
  const exposed=new Map((binding.features||[]).map(feature=>[feature.key,feature.hash]));
  return rows.filter(row=>row.visibility==='gm'&&row.execution_authorized===false&&row.publication_authorized===false
    &&row.catalog_status==='supported'&&row.native_handler?.endsWith('_context')
    &&exposed.get(row.feature)===row.feature_hash
    &&(!binding.template_hash||binding.template_hash===row.template_hash))
    .map(row=>Object.freeze({feature_ref:row.feature,source_ref:row.source_ref,text:row.printed_rule,
      source_hash:row.source_hash,template_hash:row.template_hash,visibility:'gm',
      trigger_kind:row.trigger_kind,target_policy:row.target_policy,roll_protocol:row.roll_protocol,costs:row.costs,
      house_rules:row.house_rules,precedence:row.precedence,
      ...(environment?{receipt_kind:'native_environment_feature_context',receipt_ref:binding.instance}:{}),
      authority:row.authority,execution_authorized:false,publication_authorized:false}));
}
