/** Native environmental grammar. A GM fact/category/safety label alone never certifies arbitrary prose or PC clauses. */
const nouns={window:{article:'A',qualities:['rain-streaked','clear','clouded'],relations:['overlooks','faces']},
  door:{article:'A',qualities:['wooden','painted','weathered'],relations:['faces','borders']},
  sign:{article:'A',qualities:['faded','painted','lit'],relations:['faces','stands beside']},
  floor:{article:'The',qualities:['wet','tiled','scuffed'],relations:['borders']},
  lamp:{article:'A',qualities:['dim','bright','faint'],relations:['stands beside']}};
const targets=['the alley','the street','the entry','the corridor','the wall','the counter'];
export function environmentalText(fact){
  let p;try{p=JSON.parse(fact?.provenance_json||'{}');}catch{return null;}
  const input=p.scene_observation;
  if(!input||Object.keys(input).sort().join()!=='quality,relation,subject,target,version'||input.version!==1
    ||!Object.hasOwn(nouns,input.subject)||!nouns[input.subject].qualities.includes(input.quality)
    ||!nouns[input.subject].relations.includes(input.relation)||!targets.includes(input.target))return null;
  const text=`${nouns[input.subject].article} ${input.quality} ${input.subject} ${input.relation} ${input.target}.`;
  return fact.content===text?text:null;
}
