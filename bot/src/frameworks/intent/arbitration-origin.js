import {jsonHash as hash} from '../../kernel/json-hash.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {intentNarrativeContext} from './contracts/narrative-context.js';
const {buildNarrativeContext,narrativeSourceVisible}=intentNarrativeContext;
import {intentSessionScene} from './contracts/session-scene.js';
const {scenePresence}=intentSessionScene;

export function createArbitrationOrigins({nativeActorControl}){
const origins=new WeakMap();
const deepFreeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v);}return v;};
function createArbitrationOrigin(db,guild,scope,sourceRef){
  if(db.getCityCalendar(guild).flags.gm_discretion!==true)throw fail('gm_discretion_disabled');
  if(db.getCityRecord(guild,'gm_authority','campaign')?.data.gm_authority_mode==='manual')throw fail('manual_gm_authority');
  const ctx=buildNarrativeContext(db,guild,scope,sourceRef),origin=Object.freeze(Object.create(null));
  const eligible=ctx.packet.npcs.filter(n=>!n.human_controlled&&nativeActorControl(db,guild,'npc',n.key).owner_control_type==='ai_world').map(n=>{
    const presence=scenePresence(db,guild,'npc',n.key),entity=db.getSimulationEntity(guild,'npc',n.key),profile=db.getNpcProfile(guild,n.key);
    return {key:n.key,snapshot:hash([entity,profile,presence,db.listNpcProxies(ctx.binding.session)]),
      objectives:db.listNpcGoals(guild,n.key,{status:'active',limit:8}).filter(g=>narrativeSourceVisible(db,guild,g.source,scope)).map(g=>g.goal_key),
      source_refs:n.speaker_brief?.speech_source_refs||[],
      intents:Object.fromEntries(['speak','walk','prepare','attack','exceptional_action','reaction','feature','set_allies','clear_allies'].map(op=>[op,`npc-intent:${hash([sourceRef,n.key,op])}`]))};
  });
  origins.set(origin,deepFreeze({guild,scope:structuredClone(scope),binding:structuredClone(ctx.binding),eligible}));return origin;
}
function inspectArbitrationOrigin(db,guild,origin){
  const saved=origins.get(origin);if(!saved||saved.guild!==guild)throw fail('native_origin_required');
  const fresh=createArbitrationOrigin(db,guild,saved.scope,saved.binding.source),current=origins.get(fresh);
  if(hash(saved)!==hash(current))throw fail('origin_source_owner_scene_or_control_changed');return saved;
}
return {createArbitrationOrigin,inspectArbitrationOrigin};
}
