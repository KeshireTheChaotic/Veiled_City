export const simulationUpdateSchema={
  type:"object",additionalProperties:false,
  properties:{
    kind:{type:"string",enum:["voice","location","residue","obligation","rumor","awareness","faction_memory","faction_goal","reconcile_memory","city_action"]},
    key:{type:"string"},actor_type:{type:"string",enum:["npc","faction","character"]},actor_key:{type:"string"},
    content:{type:"string"},status:{type:"string"},source_type:{type:"string"},confidence:{type:"integer",minimum:0,maximum:100},
    importance:{type:"integer",minimum:0,maximum:100},data_json:{type:"string"}
  },
  required:["kind","key","actor_type","actor_key","content","status","source_type","confidence","importance","data_json"]
};
