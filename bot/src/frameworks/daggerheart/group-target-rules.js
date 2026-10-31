/** Source-qualified area/cohort planning for the existing group-reaction workflow.
 * Read-only plans do not spend, roll, move, disclose or establish a suppressed area.
 */
import {jsonHash as hash} from '../../kernel/json-hash.js';
import {nativeArbitrationFailure as fail} from './native-failure.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function assertExactGroupCohort(selected,eligible,{all=false}={}){
  if(!Array.isArray(selected)||!Array.isArray(eligible)||!selected.length||!all&&selected.length!==1
    ||selected.some(key=>typeof key!=='string'||!key)||new Set(selected).size!==selected.length
    ||new Set(eligible).size!==eligible.length||selected.some(key=>!eligible.includes(key))
    ||all&&hash([...selected].sort())!==hash([...eligible].sort()))throw fail('group_feature_exact_target_cohort');
}

export function createGroupTargetRules({currentScene,scenePresence,narrativeSourceVisible,nativeActorControl,rangeBands}){
  if([currentScene,scenePresence,narrativeSourceVisible,nativeActorControl].some(fn=>typeof fn!=='function')||!Array.isArray(rangeBands))
    throw new TypeError('Native scene, actor control, audience and range capabilities required.');
  function planNativeAreaCohort(db,guild,origin,actorKey,areaRef){
    if(typeof actorKey!=='string'||!actorKey||typeof areaRef!=='string'||!areaRef||areaRef.length>200)
      throw fail('group_area_source_locators');
    const scene=currentScene(db,guild),binding=origin.binding,scope=origin.scope,
      actor=scenePresence(db,guild,'npc',actorKey),area=db.getCityRecord(guild,'scene_presence',areaRef);
    const currentPresence=row=>row?.status==='active'&&row.data.scene===scene.key&&row.data.session_id===scene.session_id
      &&row.location_key===binding.location&&row.data.state==='actually_present';
    const visibleSource=row=>{const source=db.getWorldEvent(guild,row?.source_event);
      if(source?.status!=='active'||source.scene!==scene.key||source.session_id!==scene.session_id||source.location_key!==binding.location
        ||!narrativeSourceVisible(db,guild,source.event_key,scope))throw fail('group_area_current_audience_source');
      return {ref:source.event_key,hash:hash(source)};};
    if(binding?.scene!==scene.key||binding.session!==scene.session_id||!currentPresence(actor)||!currentPresence(area)
      ||area.data.entity_type!=='hazard'||!area.data.zone||area.data.zone==='scene'
      ||nativeActorControl(db,guild,'npc',actorKey).owner_control_type!=='ai_world')throw fail('group_area_current_native_area');
    // A distinct established local zone supplies the footprint, never the whole location by default.
    const range=area.data.zone===actor.data.zone?'Melee':area.data.range;
    if(!rangeBands.includes(range)||rangeBands.indexOf(range)>rangeBands.indexOf('Close'))throw fail('group_area_native_close_range');
    const actorSource=visibleSource(actor),areaSource=visibleSource(area),targets=[];
    for(let offset=0;;offset+=100){
      const page=db.listCityRecords(guild,{kind:'scene_presence',status:'active',includeGM:true,limit:100,offset});
      for(const row of page){
        if(row.data.scene!==scene.key||row.location_key!==binding.location||row.data.zone!==area.data.zone
          ||!['character','npc','adversary'].includes(row.data.entity_type)||row.data.state==='departed')continue;
        if(!currentPresence(row)||row.data.entity_type==='adversary')throw fail('group_area_unresolved_actor_presence');
        const source=visibleSource(row),key=row.data.entity_key,kind=row.data.entity_type;
        if(kind==='character'){
          const pc=db.getCharacter(key);
          if(pc?.guild_id!==guild||!pc.owner_user_id||!db.roster(scene.session_id).some(r=>r.character_id===key&&['present','late','guest'].includes(r.presence)))
            throw fail('group_area_current_pc_owner');
          targets.push({kind,key,owner:pc.owner_user_id,presence:row.record_key,presence_hash:hash(row),source});
        }else{
          const control=nativeActorControl(db,guild,'npc',key);
          if(control.owner_control_type!=='ai_world')throw fail('group_area_npc_controller_not_native');
          targets.push({kind,key,control_hash:hash(control),presence:row.record_key,presence_hash:hash(row),source});
        }
      }
      if(page.length<100)break;
    }
    if(new Set(targets.map(t=>`${t.kind}:${t.key}`)).size!==targets.length)throw fail('group_area_duplicate_actor_presence');
    targets.sort((a,b)=>`${a.kind}:${a.key}`.localeCompare(`${b.kind}:${b.key}`));
    return freeze({version:1,scene:scene.key,session:scene.session_id,location:binding.location,actor:actorKey,
      actor_hash:hash(actor),actor_source:actorSource,area:areaRef,area_hash:hash(area),area_source:areaSource,zone:area.data.zone,range,targets,
      execution_authorized:false,publication_authorized:false});
  }
  return Object.freeze({planNativeAreaCohort});
}
