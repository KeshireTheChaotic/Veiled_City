import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const escape=value=>Array.from(value,c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');

/** Best-effort material assertion screening, not a complete semantic validator.
 * Balanced dialogue is testimony, not an objective effect. No decision here commits state.
 * Names and evidence checks must be supplied by native audience/control readers, never AI tools.
 */
export function createProseMaterialReview({readControlledNames=()=>[],readIndependentSpeakers=()=>[],authorizeMaterial=()=>false}={}){
  if(typeof readControlledNames!=='function'||typeof readIndependentSpeakers!=='function'||typeof authorizeMaterial!=='function')throw new TypeError('Native prose review dependencies required');
  function review(text,audience,{receiptDependencies=[]}={}){
    if(typeof text!=='string'||!text.trim()||text.length>20000)throw new Error('Bounded prose required');
    const names=readControlledNames(audience);
    if(!Array.isArray(names)||names.length>128||names.some(n=>typeof n!=='string'||!n.trim()||n.length>256))throw new Error('Native controlled character names required');
    const speakers=readIndependentSpeakers(audience);
    if(!Array.isArray(speakers)||speakers.length>128||speakers.some(n=>typeof n!=='string'||!n.trim()||n.length>256))throw new Error('Native independent speaker names required');
    const independent=speakers.filter(n=>!names.some(controlled=>controlled.toLowerCase()===n.toLowerCase()));
    const speaker=independent.map(escape).join('|'),speech='(?:says|said|claims|insists|warns|asks|replies|adds|whispers|lies|murmurs)';
    const attribution=independent.length?new RegExp(`\\b(?:${speaker})\\s+${speech}\\s*[,.:]?\\s*$`,'i'):null;
    const trailingAttribution=independent.length?new RegExp(`^[,.:!?\\s]*(?:${speaker})\\s+${speech}\\b`,'i'):null;
    const subject=`(?:you|${names.length?names.map(escape).join('|'):'(?!)'})`;
    const agency=new RegExp(`\\b${subject}\\s+(?:(?:have|has|had)\\s+)?(?:agree(?:s|d)?|accept(?:s|ed)?|obey(?:s|ed)?|pocket(?:s|ed)?|swear(?:s)?|swore|decid(?:e[sd]?|ed)|consent(?:s|ed)?|trust(?:s|ed)?|promise(?:s|d)?|say|says|said|follow(?:s|ed)?|open(?:s|ed)?|enter(?:s|ed)?|buy|buys|bought|pay|pays|paid|spend(?:s)?|spent)\\b`,'i');
    const feelings=new RegExp(`\\b${subject}\\s+(?:feel(?:s)?|felt|believe(?:s|d)?|realiz(?:e[sd]?|ed))\\s+(?:that\\b|loyal|love|trust|afraid|terrified|certain|compelled|obliged|grateful)`,'i');
    // Observed failures: invented PC blocking, gestures and emotions in otherwise ordinary dialogue.
    // This is deliberately targeted screening; it is not semantic clearance of unflagged prose.
    const movement=new RegExp(`\\b${subject}\\s+(?:crouch(?:es|ed)?|lean(?:s|ed)?|kneel(?:s|ed)?|knelt|step(?:s|ped)?|walk(?:s|ed)?|nod(?:s|ded)?|smil(?:e[sd]?|ed)|smirk(?:s|ed)?|laugh(?:s|ed)?|touch(?:es|ed)?|pull(?:s|ed)?|push(?:es|ed)?|reach(?:es|ed)?|sit(?:s)?\\s+down|sat\\s+down|stand(?:s)?\\s+(?:back\\s+)?up|stood\\s+(?:back\\s+)?up|cross(?:es|ed)?\\s+(?:your|their|his|her)\\s+arms|look(?:s|ed)?\\s+(?:at|toward|away)|turn(?:s|ed)?\\s+(?:back|toward|to))\\b`,'i');
    const emotion=new RegExp(`\\b${subject}\\s+(?:are|is|was|were)\\s+(?:nervous|frustrated|afraid|terrified|relieved|grateful|loyal|in\\s+love|determined)\\b`,'i');
    const mechanics=/\b(?:(?:gain|gains|gained|lose|loses|lost|spend|spends|spent|restore|restores|restored|mark|marks|marked|clear|clears|cleared)\s+\d+\s+(?:Hope|Fear|Stress|HP|hit points?|armor|gold|coins?)|(?:take|takes|took|deal|deals|dealt)\s+\d+\s+(?:points? of\s+)?damage|(?:roll|rolls|rolled)\s+(?:a\s+)?\d+\s+(?:with\s+)?(?:Hope|Fear)|(?:dice|roll result)\s+(?:show|shows|is|was)\s+\d+)\b/i;
    return Object.freeze(text.split(/\n[\t ]*\n+/).filter(t=>t.trim()).map((body,index)=>{
      // Leave unmatched quotes visible to screening; never grant an exemption from an opening quote.
      const narration=body.replace(/"[^"\n]*"|“[^”\n]*”/g,(match,offset)=>attribution?.test(body.slice(0,offset))||trailingAttribution?.test(body.slice(offset+match.length))?' '.repeat(match.length):match);
      const candidates=[];
      for(const [kind,pattern] of [['pc_agency',agency],['pc_agency',movement],['pc_inner_state',feelings],['pc_inner_state',emotion],['mechanical_result',mechanics]]){
        for(const match of narration.matchAll(new RegExp(pattern.source,'gi'))){
          const before=narration.slice(0,match.index);
          if(kind==='pc_agency'&&/(?:if|unless|whether|when|once|do|did|would|could|should|will|can|may|might)\s+$/i.test(before))continue;
          if(kind==='pc_agency'&&/^[^.!]*\?/.test(narration.slice(match.index)))continue;
          candidates.push(Object.freeze({kind,excerpt:body.slice(match.index,match.index+match[0].length),offset:match.index}));
        }
      }
      const issues=candidates.filter(candidate=>{
        try{const decision=authorizeMaterial(Object.freeze({...candidate,text:body,audience,receiptDependencies}));if(decision&&typeof decision.then==='function'){Promise.resolve(decision).catch(()=>{});return true;}return decision!==true;}catch{return true;}
      });
      return Object.freeze({id:`segment:${hash([audience,body,index])}`,index,text:body,status:issues.length?'withheld':'screened',issues:Object.freeze(issues)});
    }));
  }
  return Object.freeze({review});
}
