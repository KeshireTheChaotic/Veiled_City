/** Original typed proposal validation and independent-clause recovery; no native execution. */
export function createPlayerIntentValidation({validateGmRulingProposal}){
function error(message,diagnostic={}){
  return Object.assign(new Error(message),{code:'PLAYER_INTENT',diagnostic});
}

function occurrenceOffsets(source,span){
  const rows=[];
  if(typeof span!=='string'||!span)return rows;
  for(let start=source.indexOf(span);start>=0;start=source.indexOf(span,start+Math.max(1,span.length)))
    rows.push({start,end:start+span.length});
  return rows;
}

function validatePlayerIntents(intents,source,scope={}){
  if(!Array.isArray(intents)||intents.length>12)throw error('Bounded model-derived intent list required.');
  if(typeof source!=='string'||source.length>4000)throw error('Current authenticated message required.');
  const seen=new Set(),occurrenceCursor=new Map();
  for(const [i,intent] of intents.entries()){
    const keys=Object.keys(intent||{}).sort().join(','),legacy='destination,excluded_targets,framing,operation,reason,resolution,source_span,target_key,target_name,type,utterance';
    const forms=[legacy,`${legacy},depends_on`,`${legacy},native_adjudication`,`${legacy},depends_on,native_adjudication`,
      `${legacy},coordination`,`${legacy},depends_on,coordination`,`${legacy},native_adjudication,coordination`,
      `${legacy},depends_on,native_adjudication,coordination`]
      .flatMap(value=>[value,`${value},gm_ruling`]).map(value=>value.split(',').sort().join(','));
    if(!intent||!forms.includes(keys))
      throw error('Closed semantic intent schema required.',{index:i});
    for(const [field,max] of [['source_span',1200],['target_key',160],['target_name',160],['operation',100],['utterance',1000],['reason',400]])
      if(typeof intent[field]!=='string'||intent[field].length>max)throw error('Bounded semantic intent fields required.',{index:i,field});
    if(!Array.isArray(intent.excluded_targets)||intent.excluded_targets.length>8||intent.excluded_targets.some(x=>typeof x!=='string'||x.length>160))
      throw error('Invalid excluded destination constraints.',{index:i});
    if(intent.depends_on&&(!Array.isArray(intent.depends_on)||new Set(intent.depends_on).size!==intent.depends_on.length
      ||intent.depends_on.some(dep=>!Number.isSafeInteger(dep)||dep<0||dep>=i)))
      throw error('Dependencies must name unique earlier action indices.',{index:i});
    for(const [field,allowed] of [['type',['move','local_zone','observe','search','interact','speak','roll','consent','other']],
      ['framing',['immediate','hypothetical','conditional','quoted','reported']],
      ['resolution',['auto','roll_required','blocked','needs_clarification','conversational']],
      ['destination',['exterior','interior','zone','unspecified']]])
      if(!allowed.includes(intent[field]))throw error('Unknown semantic intent enumeration.',{index:i,field});
    const occurrences=occurrenceOffsets(source,intent.source_span),ordinal=occurrenceCursor.get(intent.source_span)||0;
    const occurrence=occurrences[ordinal];
    if(!occurrence)throw error('Intent span must occur in the current authored message.',{
      index:i,category:'unmatched_source_span',nearby_offsets:{start:0,end:source.length}
    });
    occurrenceCursor.set(intent.source_span,ordinal+1);
    if(intent.type==='speak'&&(!intent.utterance||!intent.source_span.includes(intent.utterance)))
      throw error('A spoken utterance must be authored verbatim in its own source span.',{index:i});
    const id=`${intent.type}:${occurrence.start}:${occurrence.end}`;
    if(seen.has(id))throw error('An action cannot be applied twice from the same source span.',{index:i});
    seen.add(id);
    // The model identifies quotation/agency, but native refuses execution on any non-immediate framing.
    if(intent.framing!=='immediate'&&intent.resolution==='auto')throw error('Non-immediate intent cannot authorize an automatic effect.',{index:i});
    if(['roll','consent'].includes(intent.type)&&intent.resolution==='auto')
      throw error('Model interpretation cannot authorize dice, spending or binding consent.',{index:i});
    if(intent.gm_ruling){
      validateGmRulingProposal(intent.gm_ruling);
      if(intent.native_adjudication||intent.framing!=='immediate'
        ||intent.resolution==='auto'&&intent.gm_ruling.disposition!=='narrative_no_roll'
        ||intent.resolution==='roll_required'&&intent.gm_ruling.disposition!=='standard_action_roll'
        ||intent.resolution==='conversational')throw error('GM ruling must match a single immediate disposition.',{index:i});
    }else if(intent.resolution==='roll_required'){
      const a=intent.native_adjudication;
      if(!a||Object.keys(a).sort().join(',')!==['attack_source','difficulty','explanation','homebrew_refs','house_refs','kind',
        'modifier_keys','override_refs','raw_refs','risk','saved_ruling_key','stakes','trait'].sort().join(',')
        ||!Number.isSafeInteger(a.difficulty)||a.difficulty<0||a.difficulty>100||!a.risk?.trim()||!a.stakes?.trim()
        ||!a.explanation?.trim())throw error('Roll-required intent needs a complete grounded native adjudication.',{index:i});
    }else if(intent.native_adjudication)throw error('Native roll adjudication belongs only to roll-required intent.',{index:i});
    if(intent.coordination){
      const c=intent.coordination,fields=['beat_key','consent_refs','location_key','operation','reads','reason','required_participants','writes'];
      if(Object.keys(c).sort().join(',')!==fields.sort().join(',')||!c.beat_key.trim()||!c.location_key.trim()||!c.operation.trim()
        ||!['combat_spotlight','cooperative_operation','contested_resource','reaction_opportunity','direct_pc_conflict','gm_declared_beat'].includes(c.reason)
        ||![c.reads,c.writes].every(values=>Array.isArray(values)&&values.length<=32&&new Set(values).size===values.length
          &&values.every(value=>/^[a-z][a-z0-9_-]*:[^\s]{1,180}$/i.test(value)))
        ||![c.required_participants,c.consent_refs].every(values=>Array.isArray(values)&&values.length<=12
          &&new Set(values).size===values.length&&values.every(value=>typeof value==='string'&&value.length>0&&value.length<=160)))
        throw error('Coordination needs a bounded explicit shared beat, resources, location and consent references.',{index:i});
    }
    if(scope.mode==='private'&&scope.actorCharacterId==null)throw error('Private typed intent requires a controlled character.',{index:i});
  }
  return intents;
}

/** Quarantine malformed optional clauses while retaining only independently source-valid intents. */
function recoverPlayerIntents(intents,source,scope={}){
  if(!Array.isArray(intents)||intents.length>12)throw error('Bounded model-derived intent list required.');
  const cursor=new Map(),preliminary=[],diagnostics=[];
  for(const [index,intent] of intents.entries()){
    try{
      const standalone={...intent};delete standalone.depends_on;
      validatePlayerIntents([standalone],source,scope);
      const offsets=occurrenceOffsets(source,intent.source_span),ordinal=cursor.get(intent.source_span)||0;
      const occurrence=offsets[ordinal];cursor.set(intent.source_span,ordinal+1);
      if(!occurrence)throw error('Intent span must occur in the current authored message.',{
        index,category:'unmatched_source_span',nearby_offsets:{start:0,end:source.length}
      });
      if(preliminary.some(row=>occurrence.start<row.end&&occurrence.end>row.start)){
        diagnostics.push({index,category:'overlapping_source_span',nearby_offsets:occurrence});continue;
      }
      preliminary.push({index,intent,start:occurrence.start,end:occurrence.end});
    }catch(cause){
      if(cause.code!=='PLAYER_INTENT')throw cause;
      diagnostics.push({index,category:cause.diagnostic?.category||'invalid_optional_proposal',
        nearby_offsets:cause.diagnostic?.nearby_offsets||{start:0,end:source.length}});
    }
  }
  const accepted=[],indexMap=new Map();
  for(const row of preliminary){
    const dependencies=row.intent.depends_on||[];
    if(dependencies.some(dep=>!indexMap.has(dep))){
      diagnostics.push({index:row.index,category:'dependency_unavailable',nearby_offsets:{start:row.start,end:row.end}});continue;
    }
    indexMap.set(row.index,accepted.length);
    accepted.push(dependencies.length?{...row.intent,depends_on:dependencies.map(dep=>indexMap.get(dep))}:{...row.intent});
  }
  return {intents:accepted,diagnostics};
}
return {validatePlayerIntents,recoverPlayerIntents};
}
