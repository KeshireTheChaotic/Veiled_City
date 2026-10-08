/** Strict model proposal schemas for simulation updates and bounded NPC action intents. */
import { ACTION_TYPES, MAJOR_IMPACTS } from "./simulation.js";
import { intentArraySchema } from "./ai-intent-contracts.js";

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

export const npcActionSchema={
  type:"object",additionalProperties:false,
  properties:{
    actor_type:{type:"string",enum:["npc","faction"]},actor_key:{type:"string"},type:{type:"string",enum:ACTION_TYPES},goal_key:{type:"string"},
    target_type:{type:"string",enum:["npc","faction","location","entity",""]},target_key:{type:"string"},location_key:{type:"string"},
    rationale:{type:"string"},hypothesis:{type:"string"},information_key:{type:"string"},rumor_id:{type:"string"},obligation_id:{type:"string"},
    delay_ticks:{type:"integer",minimum:0,maximum:525600},delay_minutes:{type:"integer",minimum:0,maximum:525600},
    significance:{type:"string",enum:["routine",...MAJOR_IMPACTS]},public_hook:{type:"string"},private_user_id:{type:"string"}
  },
  required:["actor_type","actor_key","type","goal_key","target_type","target_key","location_key","rationale","hypothesis","information_key",
    "rumor_id","obligation_id","delay_ticks","delay_minutes","significance","public_hook","private_user_id"]
};

export const npcDirectorSchema={type:"object",additionalProperties:false,
  properties:{actions:{type:"array",maxItems:4,items:npcActionSchema},ai_intents:intentArraySchema},required:["actions","ai_intents"]};

export const SIMULATION_PROMPT=[
  "city_action proposes an institution intent only: key is stable intent identity; data_json has institution,type,jurisdiction,source_event,report_keys. It cannot grant jurisdiction, transfer unknown information, choose PC actions, or bypass GM review.",
  "PERSISTENT SIMULATION REVIEW: simulation_updates is empty on ordinary turns. Emit updates only for established meaningful consequences.",
  "Each update has kind,key,actor_type,actor_key,content,status,source_type,confidence,importance,data_json. data_json is a JSON object, never executable code.",
  "residue: key is the location key. On scene exit record participants,actions,witnesses,evidence,traces,casualties,damage,exposure,threats,escaped as arrays.",
  "Residue evidence contains only discoverable physical evidence left at that location. Never copy private knowledge or GM secrets into discoverable evidence.",
  "location: key is a location key; data_json may include wards,entrances,rituals,contamination,police_attention,control,witnesses,hazards,incidents.",
  "obligation: key is an existing obligation ID or empty for a new promise. data_json includes debtor and creditor as type:key, and explicit terms in content.",
  "Only established promises, invitations, oaths, bargains, or customs create obligations; courtesy alone never does. Status active,fulfilled,violated,transferred,called_in,forgiven; transfers need transferred_to.",
  "rumor: subject in key, content is the rumor; record origin/current holders,distortion,credibility. Rumors remain subjective and never create canon.",
  "awareness: key is the information key; record who learned the content and source_type. Never infer awareness merely from an objective campaign fact.",
  "faction_memory/faction_goal: actor_type=faction; actor_key is the faction key. Goals have priority,progress,horizon,dependencies,acceptable_methods in data_json.",
  "voice: preserve compact NPC address,formality,humor,verbal_habits,emotional_tells,boundaries,mannerisms independently of factual memories.",
  "reconcile_memory: key is old memory ID; status challenged or superseded; content is the newly established evidence/correction. Preserve the old record.",
  "NPC source types distinguish witnessed,told_by_npc,faction_report,rumor,document,supernatural_impression. Hearsay and supernatural impressions are not omniscience.",
  "Do not duplicate autonomous offscreen actions in World Director events; the dedicated NPC Director resolves those mechanically with finite resources.",
  "removed=true means an NPC is no longer available to act. Destroyed locations and reviewed faction policies are authoritative simulation state.",
  "Campaign-tier irreversible changes require human GM review. Never kill named NPCs, destroy major sites, transform factions, reveal defining secrets, or cause supernatural disasters through ordinary event prose."
].join("\n");
