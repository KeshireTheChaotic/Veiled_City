import {ACTION_TYPES,MAJOR_IMPACTS} from './action-catalog.js';

export const npcActionSchema={
  type:"object",additionalProperties:false,
  properties:{
    actor_type:{type:"string",enum:["npc","faction"]},actor_key:{type:"string"},type:{type:"string",enum:ACTION_TYPES},goal_key:{type:"string"},
    target_type:{type:"string",enum:["npc","faction","location","entity","institution","community","audience",""]},target_key:{type:"string"},location_key:{type:"string"},
    rationale:{type:"string"},hypothesis:{type:"string"},information_key:{type:"string"},rumor_id:{type:"string"},obligation_id:{type:"string"},
    delay_ticks:{type:"integer",minimum:0,maximum:525600},delay_minutes:{type:"integer",minimum:0,maximum:525600},
    significance:{type:"string",enum:["routine",...MAJOR_IMPACTS]},public_hook:{type:"string"},private_user_id:{type:"string"}
  },
  required:["actor_type","actor_key","type","goal_key","target_type","target_key","location_key","rationale","hypothesis","information_key",
    "rumor_id","obligation_id","delay_ticks","delay_minutes","significance","public_hook","private_user_id"]
};
