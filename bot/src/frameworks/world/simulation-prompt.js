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
