/** Established identity retrieval interest is not World authorship authority. */
export function createEntityMemory({resolvePlaceReference,preflightNpcIdentity,narrativeSourceVisible,worldIdentityOrigin}){
/** Raw combined proposals never establish a new identity. The isolated native GM stage owns fresh invention. */
function tierWorldAdditions(result,_authenticatedPlayerText='',{db,guild,scope={}}={}){
  if(!result||!Array.isArray(result.world_additions))return {durable:[],ephemeral:[]};
  const durable=[],ephemeral=[];
  for(const item of result.world_additions){
    let established=false;
    if(db&&guild&&['location','npc'].includes(item?.kind)){
      const identity=db.getCityRecord(guild,'autonomous_entity',`${item.kind}:${item.key}`),
        ref=db.getReference(guild,item.kind,item.key),row=identity||ref;
      const entitled=row&&(['party','public'].includes(row.visibility)||scope.mode==='private'&&row.visibility==='character'
        &&(row.subject_key||row.subject_character_id)===scope.actorCharacterId);
      const sourced=!identity||narrativeSourceVisible(db,guild,identity.source_event,scope)
        &&(!identity.data.authorship_ref||worldIdentityOrigin(db,guild,identity,scope));
      if(entitled&&sourced){
        if(item.kind==='location'){
          const match=resolvePlaceReference(db,guild,scope.actorCharacterId,item.name,{mode:scope.mode,user:scope.actorUserId});
          established=match.status==='resolved_existing'&&match.location.entity_key===item.key;
        }else{
          const match=preflightNpcIdentity(db,guild,{key:item.key,name:item.name,scope});
          established=match.status==='reuse'&&match.matches.length===1&&match.matches[0].npc_key===item.key;
        }
      }
    }
    if(established)durable.push(item);
    else ephemeral.push({kind:item?.kind,key:item?.key,reason:'Unverified combined proposal: independent native GM creation receipt required.'});
  }
  result.world_additions=durable;
  return {durable,ephemeral};
}

return Object.freeze({tierWorldAdditions});
}
