function fail(){throw Object.assign(new Error("PvP output needs current independently verified clauses and audience proof."),{code:"NARRATIVE_PVP"});}
function records(db,guild,kind){
  const out=[];
  for(let offset=0;offset<10000;offset+=100){
    const page=db.listCityRecords(guild,{kind,includeGM:true,limit:100,offset});out.push(...page);
    if(page.length<100)return out;
  }
  fail(); // No silent truncation of a security boundary.
}
function protectedAgreements(db,guild){return [...records(db,guild,"pvp_proposal"),...records(db,guild,"pvp_encounter_contract")];}

export {fail,records,protectedAgreements};
