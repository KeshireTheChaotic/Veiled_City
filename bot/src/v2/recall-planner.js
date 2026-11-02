// Native retrieval policy only. These weights never establish identity, facts or canon.
const weights=Object.freeze({mention:3,interaction:5,return:6,lead:7,gm_reuse:1});
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const refs=v=>Array.isArray(v)&&v.length<=256&&v.every(id)&&new Set(v).size===v.length;
const tick=v=>Number.isSafeInteger(v)&&v>=0;
export function decayedRecallWeight(weight,created,current){
  if(!Number.isFinite(weight)||weight<0||!tick(created)||!tick(current)||current<created)return 0;
  return Math.max(0,weight-Math.floor((current-created)/6));
}

/** Readers return canonical native causes, never model scores or projection events.
 * A cause has one immutable ID/tick; all audience projections use that same ID.
 * Native adapters must authenticate owner interaction or independent GM origin.
 */
export function createRecallPlanner({contextAuthority,readCandidates,readCauses,readPins,readClock}){
  if(typeof contextAuthority?.entitled!=='function'||[readCandidates,readCauses,readPins,readClock].some(fn=>typeof fn!=='function'))throw new TypeError('Native recall readers required');
  function select(source,{focus=[],actorId=null,limit=32}={}){
    if(!refs(focus)||!Number.isSafeInteger(limit)||limit<1||limit>64)throw new TypeError('Bounded recall selection required');
    const current=readClock(source.campaign),candidates=readCandidates(source),causes=readCauses(source),pins=readPins(source);
    if(!tick(current)||!refs(candidates)||!Array.isArray(causes)||causes.length>4096||!Array.isArray(pins)||pins.length>4096)throw new Error('Recall snapshot unavailable');
    const entitled=ref=>contextAuthority.entitled(source,ref,{actorId});
    const eligible=candidates.filter(entitled),scores=new Map(eligible.map(ref=>[ref,{score:0,last:null,pinned:false}]));
    const seen=new Map();
    for(const cause of causes){
      if(!cause||!id(cause.id)||cause.campaignId!==source.campaign||cause.status!=='committed'||cause.authority!=='native_recall'
        ||!Object.hasOwn(weights,cause.kind)||!tick(cause.tick)||cause.tick>current||!refs(cause.targetRefs)||!refs(cause.sourceRefs)||!cause.sourceRefs.length
        ||cause.independentlyAuthenticated!==true)continue;
      const fingerprint=JSON.stringify(cause);
      if(seen.has(cause.id)){
        if(seen.get(cause.id)!==fingerprint)throw new Error('Conflicting canonical recall cause');
        continue;
      }
      seen.set(cause.id,fingerprint);
      if(!cause.sourceRefs.every(entitled))continue;
      for(const target of cause.targetRefs){const row=scores.get(target);if(!row)continue;
        row.score+=decayedRecallWeight(weights[cause.kind],cause.tick,current);row.last=Math.max(row.last??0,cause.tick);
      }
    }
    for(const pin of pins){
      if(pin?.campaignId!==source.campaign||pin.status!=='active'||pin.authority!=='native_recall_pin'||!id(pin.id)
        ||!refs(pin.targetRefs)||!refs(pin.sourceRefs)||!pin.sourceRefs.length||!pin.sourceRefs.every(entitled))continue;
      for(const target of pin.targetRefs){const row=scores.get(target);if(row)row.pinned=true;}
    }
    // Retirement removes only default prompt selection. Focus/pins restore recall;
    // the underlying identity/history and epistemic kind are never mutated.
    return [...scores].filter(([ref,row])=>focus.includes(ref)||row.pinned||row.last===null||current-row.last<6||row.score>=3)
      .sort(([a,x],[b,y])=>Number(focus.includes(b))-Number(focus.includes(a))||Number(y.pinned)-Number(x.pinned)||y.score-x.score||(y.last??-1)-(x.last??-1)||a.localeCompare(b))
      .slice(0,limit).map(([ref])=>ref);
  }
  return Object.freeze({select});
}
