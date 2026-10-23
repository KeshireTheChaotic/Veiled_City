export const isFreshArchitectureTestPath=file=>typeof file==='string'&&/^bot\/tests\/ai-gm-2026-10\/rf\d\d-f\d\d(?:-c\d\d)?\.test\.mjs$/.test(file);
/** Source-backed registration checks. Test paths are metadata, never imported or executed here. */
export function checkBridgeRegistry({registry,report,policy,testPaths=new Set()}){
  const errors=[],add=(code,pair,detail)=>errors.push({code,from:'docs/Implementation_Plans/Framework_Refactor/RF01/BRIDGE_CONTRACTS.json',owner:'tooling',detail:`${pair||'[registry]'}: ${detail}`});
  if(registry?.version!==1||!Array.isArray(registry.pairs)){
    add('INVALID_BRIDGE_REGISTRY',null,'versioned pair array required');return errors;
  }
  const modules=new Map(report.modules.map(m=>[m.path,m])),registered=new Set();
  for(const entry of registry.pairs){
    const pair=entry?.pair,members=typeof pair==='string'?pair.split('--'):[];
    if(members.length!==2||members[0]===members[1]||members.some(m=>!policy.frameworks.includes(m))||[...members].sort().join('--')!==pair){
      add('INVALID_BRIDGE_PAIR',pair,'two distinct alphabetical frameworks required');continue;
    }
    if(registered.has(pair))add('DUPLICATE_BRIDGE_PAIR',pair,'one registry record per pair');registered.add(pair);
    if(!Array.isArray(entry.endpoints)||entry.endpoints.join('--')!==pair)add('INVALID_BRIDGE_ENDPOINTS',pair,'endpoints must match canonical pair');
    if(!Array.isArray(entry.directions)||!entry.directions.length||entry.directions.some(d=>!members.includes(d.from)||!members.includes(d.to)||d.from===d.to||!d.contract))
      add('INVALID_BRIDGE_DIRECTIONS',pair,'explicit endpoint-to-endpoint contract required');
    if(!entry.validation||!entry.lifecycle||!entry.adoption_feature||!Array.isArray(entry.source_evidence)||!entry.source_evidence.length)
      add('INCOMPLETE_BRIDGE_RECORD',pair,'validation, lifecycle, adoption and observed evidence required');
    const pairModules=report.modules.filter(m=>m.role==='pair'&&m.location==='new'&&m.owner===pair);
    if(entry.status==='PROPOSED_NO_API'){
      if(pairModules.length||entry.public_api||entry.consumers?.length||entry.tests?.length)add('PROPOSED_BRIDGE_HAS_IMPLEMENTATION',pair,'proposal cannot claim implementation/consumers/tests');
      continue;
    }
    if(!['CONTRACT_ONLY_UNWIRED','ADOPTED'].includes(entry.status)){add('INVALID_BRIDGE_STATUS',pair,'explicit supported lifecycle status required');continue;}
    const publicPath=`bot/src/framework-to-framework/${pair}/public.js`,api=modules.get(publicPath);
    if(entry.public_api!==publicPath||!api||api.owner!==pair||!api.exports.length||!(policy.publicEntrypoints[pair]||[]).includes(publicPath))
      add('INVALID_BRIDGE_PUBLIC_API',pair,'existing registered exported API required');
    if(!Array.isArray(entry.consumers)||!entry.consumers.length)add('MISSING_BRIDGE_CONSUMER',pair,'actual composition/workflow consumer required');
    for(const consumer of entry.consumers||[]){
      const module=modules.get(consumer);
      if(!module||!['application','bootstrap'].includes(module.role)||!report.edges.some(e=>e.from===consumer&&e.to===publicPath&&!e.error))
        add('INVALID_BRIDGE_CONSUMER',pair,consumer);
    }
    for(const edge of report.edges.filter(e=>e.to===publicPath&&modules.get(e.from)?.owner!==pair))
      if(!(entry.consumers||[]).includes(edge.from))add('UNREGISTERED_BRIDGE_CONSUMER',pair,edge.from);
    if(!Array.isArray(entry.tests)||!entry.tests.length||entry.tests.some(file=>!isFreshArchitectureTestPath(file)||!testPaths.has(file)))
      add('INVALID_BRIDGE_TEST_REFERENCE',pair,'existing fresh feature tests required; execution evidence is separate');
  }
  for(const module of report.modules.filter(m=>m.role==='pair'&&m.location==='new'))
    if(!registered.has(module.owner))add('UNREGISTERED_BRIDGE_PACKAGE',module.owner,module.path);
  return errors;
}
