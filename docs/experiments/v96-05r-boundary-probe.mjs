/** Isolated architecture probe, NOT production code or phase qualification. Never import during normal validation. */
import {registerHooks} from 'node:module';
if(process.env.VC_V96_05R_PROBE!=='strict'&&process.env.VC_V96_05R_PROBE!=='profile')
  throw Error('Explicit isolated probe mode required. No production mutation is performed.');
const mode=process.env.VC_V96_05R_PROBE;
console.log(`V96_05R_ARCHITECTURE_PROBE mode=${mode}; memory-only source transform; not a production fix.`);
function once(source,from,to){
  if(source.split(from).length!==2)throw Error(`Probe source anchor mismatch: ${from.slice(0,70)}`);
  return source.replace(from,to);
}
registerHooks({load(url,context,nextLoad){
  const result=nextLoad(url,context);
  if(!url.endsWith('/bot/src/pvp-output.js')&&!url.endsWith('/bot/src/gm-world-narrative.js'))return result;
  let source=String(result.source).replace(/\r\n/g,'\n');
  if(mode==='strict'&&url.endsWith('/bot/src/pvp-output.js')){
    source=once(source,'  if(!proposals.length&&!queries.length&&!worldParts.length)return result;','  // PROBE ONLY: require preparation in every ordinary scene.');
    source=once(source,'    const proposals=protectedPvpScope(db,guild,audienceScope(scope,surface));if(!proposals.length)continue;',
      '    const proposals=protectedPvpScope(db,guild,audienceScope(scope,surface));if(!proposals.length){if((result.narrative_claims||[]).length)continue;fail();}');
    source=once(source,'  const proof=prepared.get(result);if(!proof)return;',
      '  const proof=prepared.get(result);if(!proof)fail();');
    source=once(source,'  }else if(protectedPvpScope(db,guild,{mode:row.visibility==="party"?"party":"private",recipientUserId:row.target_user_id}).length)fail();',
      '  }else fail();');
  }
  if(mode==='profile'&&url.endsWith('/bot/src/gm-world-narrative.js')){
    source=once(source,'function project(input){','function project(input,db,guild){');
    source=once(source,'  closed(input);\n  // Deliberately no arbitrary name/profile/fact/prose interpolation.',
      '  closed(input);\n  if(input.kind==="npc_dialogue"){const text=db.getNpcProfile(guild,input.entity_key)?.public_identity||"";return `An NPC says (not proof of a PC outcome): “${text}”\\n${input.acts.map(act=>dialogue[act]).join(" ")}`;}\n  // PROBE ONLY: deliberately test why profile scope is not clause permission.');
    source=source.replaceAll('text:project(input)','text:project(input,db,guild)');
    source=once(source,'d.text!==project(d.input)','d.text!==project(d.input,db,guild)');
  }
  if(mode==='profile'&&url.endsWith('/bot/src/pvp-output.js')){
    const anchor='visibility:publication.visibility,character:publication.target_character_id||null}});';
    source=once(source,anchor,anchor+`\n  console.log('V96_PROFILE_SCOPE_PAYLOAD '+JSON.stringify({proof:db.getCityRecord(guild,'pvp_output_publication',publication.id)?.status,surface:publication.surface,payload}));`);
  }
  return {...result,source};
}});
