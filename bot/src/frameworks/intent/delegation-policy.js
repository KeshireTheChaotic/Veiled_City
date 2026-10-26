/** Existing campaign execution preferences; no grant or autonomous authority. */
export function delegationPolicy(db,guild){
  return db.getCityRecord(guild,"ai_delegation","campaign")?.data||{mode:"manual",revision:0,allow:[],max_operations:1,max_cost:0,expires_minute:null};
}
