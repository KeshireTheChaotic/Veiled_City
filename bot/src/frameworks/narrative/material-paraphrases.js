/** Bounded hand-authored paraphrases are review tripwires, not a claim of general semantic understanding. */
export function materialParaphrases(text,names=[]){
  const escaped=names.filter(Boolean).slice(0,100).map(name=>String(name).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const subject=`(?:you${escaped.length?`|${escaped.join("|")}`:""})`;
  const patterns=[
    ["status",`${subject} (?:is dead|are dead|lies? lifeless|has died|have died|breathes? (?:his|her|their|your) last)`],
    ["damage",`${subject} (?:bleeds?|are bleeding|is bleeding|sustains? (?:an? )?(?:injury|wound)|suffers? (?:an? )?(?:injury|wound)|loses? \\d+ (?:HP|hit points?))`],
    ["movement",`${subject} (?:arrives? at|has entered|have entered|reaches? the|has crossed into|have crossed into)`],
    ["possession",`${subject} (?:pockets?|has acquired|have acquired|takes? possession of|now owns?)`],
    ["obligation",`${subject} (?:is bound to|are bound to|has sworn|have sworn|owes? (?:a debt|allegiance))`],
    ["disclosure",`${subject} (?:now knows?|has learned|have learned|discovers? the truth)`],
    ["dice",`${subject} (?:rolled? a|rolled? an|scored? a|scored? an) \\d+`]
  ];
  const hits=[];
  for(const sentence of String(text||"").split(/(?<=[.!?])\s+|\n/)){
    const quotes=[...sentence.matchAll(/["“][^"”]*["”]/g)];
    for(const [action,expression] of patterns) for(const match of sentence.matchAll(new RegExp(`\\b${expression}\\b`,"gi"))){
      const prefix=sentence.slice(0,match.index).split(/[,;]|\b(?:and|but|while|yet|then)\b/i).at(-1);
      if(/\b(?:might|may|could|perhaps|rumou?r|claims?|as if|imagines?|intends?|hypothes\w*|would|seems?|looks? like)\b/i.test(prefix)) continue;
      if(quotes.some(quote=>match.index>quote.index&&match.index<quote.index+quote[0].length)&&/\b(?:says?|said|claims?)\b/i.test(sentence)) continue;
      if(action==="status"&&/dead to (?:me|you|him|her|them)/i.test(sentence.slice(match.index))) continue;
      if(action==="damage"&&/bleeds? (?:money|secrets|time)\b/i.test(sentence.slice(match.index))) continue;
      hits.push({action,span:match[0]});
    }
  }
  return hits;
}
