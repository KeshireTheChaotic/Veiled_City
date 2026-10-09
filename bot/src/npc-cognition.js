/**
 * Persistent NPC cognition utilities for Veiled City.
 *
 * NPC memory/knowledge are subjective state. They may be incomplete, mistaken,
 * second-hand, or secret and therefore must never replace objective campaign
 * facts/canon. Retrieval is deterministic and salience-ranked so long-running
 * campaigns provide only the memories/knowledge relevant to the current scene.
 */

import { clusterContext } from "./memory-clusters.js";
import { sceneView, npcEvidenceActive } from "./scene-continuity.js";

function words(value){
  return new Set(String(value||"").toLowerCase().match(/[a-z0-9']{3,}/g)||[]);
}

function overlapScore(a,b){
  let score=0;
  for(const token of a) if(b.has(token)) score++;
  return score;
}

export function normalizeNpcKey(value){
  return String(value||"")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function parseJson(value,fallback){
  try{return JSON.parse(value||"");}catch{return fallback;}
}

function memoryRank(row,queryTokens,tick){
  const textTokens=words([
    row.content,row.subject_type,row.subject_key,row.source_type,
    ...(parseJson(row.tags_json,[])||[])
  ].join(" "));
  const overlap=overlapScore(queryTokens,textTokens);
  const importance=Number(row.importance||0);
  const confidence=Number(row.confidence||0);
  // Major memories endure; mundane details fade through fictional opportunities,
  // never because players were away from Discord for real-world days.
  const age=Math.max(0,tick-Number(row.created_tick||0));
  const recency=Math.max(0,20-age*(importance>=80?0.05:0.5));
  const reinforcement=Math.min(10,Number(row.recall_count||0)*1.5);
  return (importance*0.45+confidence*0.2+recency+reinforcement+overlap*12+Math.abs(Number(row.sentiment)||0)*3)*(row.status==="challenged"?0.75:1);
}

function knowledgeRank(row,queryTokens){
  const overlap=overlapScore(queryTokens,words([row.knowledge_key,row.content,row.belief_state,row.source_type].join(" ")));
  const stateWeight={known:20,suspected:12,rumor:8,doubted:4,unknown:2}[row.belief_state]||0;
  return Number(row.confidence||0)*0.35+stateWeight+overlap*14;
}

function profileRank(profile,queryTokens,goalPriority=0,{worldDirector=false,proxyNpcKey=""}={}){
  const haystack=words([
    profile.npc_key,profile.display_name,profile.role,profile.public_identity,profile.portrayal,
    JSON.stringify(profile.decision_profile||{}),JSON.stringify(profile.capabilities||[])
  ].join(" "));
  let score=overlapScore(queryTokens,haystack)*16;
  const name=String(profile.display_name||"").toLowerCase();
  const key=String(profile.npc_key||"").toLowerCase();
  const query=[...queryTokens].join(" ");
  if(name&&query.includes(name)) score+=120;
  if(key&&query.includes(key.replaceAll("-"," "))) score+=80;
  if(proxyNpcKey&&key===proxyNpcKey) score+=150;
  if(worldDirector) score+=Math.min(50,Number(goalPriority||0)*0.5);
  if(profile.activity_tier==="active") score+=worldDirector?30:5;
  if(profile.activity_tier==="supporting") score+=worldDirector?15:2;
  return score;
}

/**
 * Retrieve a compact cognition packet for NPCs relevant to the current scene.
 * Returned state is GM-private and must never be copied wholesale to player
 * output. The packet preserves the distinction between memories and beliefs.
 */
export function retrieveNpcCognition(db,guildId,{
  query="",
  actorAssignment=null,
  worldDirector=false,
  npcKey="",
  maxNpcs=4,
  memoriesPerNpc=7,
  knowledgePerNpc=8,
  goalsPerNpc=4,
  recordRecall=true
}={}){
  const density=db.getCityCalendar(guildId).flags.activity_density===true;
  const profiles=npcKey?[db.getNpcProfile(guildId,npcKey)].filter(Boolean):density
    ?db.densityActorSelection(guildId,query).filter(row=>row.type==="npc").map(row=>db.getNpcProfile(guildId,row.actor_key))
    :db.listNpcProfiles(guildId,{limit:500});
  if(!profiles.length) return [];
  const queryTokens=words(query);
  const tick=db.getSimulationClock(guildId).tick;
  const proxyNpcKey=actorAssignment?.npc_proxy
    ?normalizeNpcKey(actorAssignment.npc_name||actorAssignment.npc_key||"")
    :"";
  const candidates=profiles.map(profile=>{
    const goals=db.listNpcGoals(guildId,profile.npc_key,{status:"active",limit:20});
    const topPriority=goals.reduce((m,g)=>Math.max(m,Number(g.priority||0)),0);
    const memorySignal=db.listNpcMemories(guildId,profile.npc_key,{status:"retrievable",limit:120,queryTokens:[...queryTokens]})
      .reduce((best,row)=>Math.max(best,overlapScore(queryTokens,words(`${row.content} ${(row.tags||[]).join(" ")}`))*18),0);
    const knowledgeSignal=db.listNpcKnowledge(guildId,profile.npc_key,{limit:120,queryTokens:[...queryTokens]})
      .reduce((best,row)=>Math.max(best,overlapScore(queryTokens,words(`${row.knowledge_key} ${row.content}`))*18),0);
    const goalSignal=goals.reduce((best,row)=>Math.max(best,overlapScore(queryTokens,words(`${row.title} ${row.objective}`))*16),0);
    const score=profileRank(profile,queryTokens,topPriority,{worldDirector,proxyNpcKey})+memorySignal+knowledgeSignal+goalSignal;
    return {profile,goals,score};
  }).filter(x=>worldDirector||x.score>0||x.profile.npc_key===proxyNpcKey);

  candidates.sort((a,b)=>b.score-a.score||String(a.profile.display_name).localeCompare(String(b.profile.display_name)));
  const selected=candidates.slice(0,Math.max(1,Math.min(8,Number(maxNpcs)||4)));
  const recalled=[];
  const packets=selected.map(({profile,goals})=>{
    const goalTokens=words(goals.map(goal=>goal.objective).join(" "));
    const memoryTokens=new Set([...queryTokens,...goalTokens]);
    const memories=db.listNpcMemories(guildId,profile.npc_key,{status:"retrievable",limit:160,queryTokens:[...memoryTokens]})
      .map(row=>({...row,_query_match:density?overlapScore(queryTokens,words(`${row.content} ${row.subject_key}`)):0,_score:memoryRank(row,memoryTokens,tick)}))
      .sort((a,b)=>b._query_match-a._query_match||b._score-a._score||String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0,Math.max(1,Math.min(20,Number(memoriesPerNpc)||7)))
      .map(row=>{const {_score,_query_match,...clean}=row; recalled.push(clean.id);
        const source=db.getWorldEvent(guildId,clean.source_ref);
        const corrections=db.npcMemoryCorrections(guildId,profile.npc_key,clean.id).map(item=>({id:item.id,content:item.content,
          source_ref:item.source_ref,source_status:db.getWorldEvent(guildId,item.source_ref)?.status||"unverified"}));
        return {...clean,source_status:source?.status||"unverified",evidence_active:npcEvidenceActive(db,guildId,profile.npc_key,clean.source_ref),corrections};});
    const knowledge=db.listNpcKnowledge(guildId,profile.npc_key,{limit:160,queryTokens:[...memoryTokens]})
      .map(row=>({...row,_score:knowledgeRank(row,queryTokens)}))
      .sort((a,b)=>b._score-a._score||String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0,Math.max(1,Math.min(20,Number(knowledgePerNpc)||8)))
      .map(({_score,...row})=>({...row,evidence_active:npcEvidenceActive(db,guildId,profile.npc_key,row.knowledge_key)}));
    const scene=db.getCityCalendar(guildId).flags.scene_continuity===true&&db.getActiveSession(guildId)
      ?sceneView(db,guildId,{observer_type:"npc",observer_key:profile.npc_key}):null;
    return {
      npc_key:profile.npc_key,
      display_name:profile.display_name,
      role:profile.role,
      public_identity:profile.public_identity,
      portrayal:profile.portrayal,
      activity_tier:profile.activity_tier,
      decision_profile:profile.decision_profile,
      knowledge_boundaries:profile.knowledge_boundaries,
      capabilities:profile.capabilities,
      persistent_state:db.getSimulationEntity(guildId,"npc",profile.npc_key)?.state||{},
      goals:goals.slice(0,Math.max(1,Math.min(10,Number(goalsPerNpc)||4))),
      knowledge,
      memories,
      continuity_authority:"Dialogue quotations establish only what was said. Interpretations, promises, refusals and tactical history are actor-owned, not canon/consent, future decisions or new adversary features. De-escalation and retreat remain valid. Corrections preserve original memories; consider active corrective testimony without imposing one global belief. Retracted, superseded or unverified sources are historical testimony, not authority for new consequences. Tactical history grants no new feature, bonus or immunity; preparations require existing sourced goal/review/resource services.",
      memory_clusters:clusterContext(db,guildId,"npc",profile.npc_key,query),
      scene_observations:scene?{...scene,occupants:scene.occupants.slice(0,16)}:null
    };
  });
  let size=2;
  const bounded=density?packets.filter(packet=>{const length=JSON.stringify(packet).length+1;
    if(length>12000||size+length>24000) return false;size+=length;return true;}).slice(0,4):packets;
  if(recordRecall&&recalled.length) db.markNpcMemoriesRecalled(bounded.flatMap(packet=>packet.memories.map(memory=>memory.id)));
  return bounded;
}

/**
 * One-time deterministic bootstrap from packaged GM NPC dossiers plus campaign
 * reference/relationship state. It deliberately does not infer knowledge from
 * arbitrary global facts; mentioning an NPC in a fact does not make them know it.
 */
export function seedNpcCognition({db,content,guildId,actorId="system",incremental=false}){
  const seedKey="npc_cognition_v1";
  const prior=db.getSeedRun(guildId,seedKey);
  if(prior&&!incremental) throw new Error(`NPC cognition seed already completed at ${prior.completed_at}. It is intentionally one-time.`);

  let dossiers=[];
  const raw=content.read("GM_PRIVATE/NPCS/npcs.json");
  if(raw.trim()){
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed)) throw new Error("GM_PRIVATE/NPCS/npcs.json must contain an array.");
    dossiers=parsed;
  }

  const counts={profiles:0,memories:0,knowledge:0,goals:0,references:0,relationships:0};
  db.transaction(()=>{
    for(const npc of dossiers){
      const key=normalizeNpcKey(npc.name);
      if(!key) continue;
      if(incremental&&db.getNpcProfile(guildId,key)) continue;
      const lensText=[npc.role,npc.public,npc.want,npc.secret,...(npc.knows||[]),...(npc.does_not||[])].join(" ").toLowerCase();
      const contractAware=/contract|concord|court|hospitality|oath|compact|covenant/.test(lensText);
      const veilAware=/veil|anchor|threshold|occult|supernatural|spirit|ghost|choir|court|green/.test(lensText);
      db.upsertNpcProfile(guildId,{
        npcKey:key,
        displayName:npc.name,
        role:npc.role||"",
        publicIdentity:npc.public||"",
        portrayal:npc.public||"",
        activityTier:"supporting",
        decisionProfile:{
          risk_tolerance:50,
          violence_threshold:50,
          honesty:50,
          loyalty:50,
          patience:50,
          ambition:50,
          compassion:50,
          lawfulness:50,
          collateral_aversion:75,
          contract_honor:contractAware?75:50,
          hospitality_reciprocity:contractAware?75:50,
          veil_awareness:veilAware?"aware":"limited",
          supernatural_ethics:"unspecified"
        },
        knowledgeBoundaries:npc.does_not||[],
        capabilities:npc.leverage?[npc.leverage]:[],
        source:"gm_dossier"
      });
      counts.profiles++;
      if(String(npc.want||"").trim()){
        db.upsertNpcGoal(guildId,{
          npcKey:key,goalKey:"seed.primary",title:"Primary agenda",objective:npc.want,
          horizon:"near",priority:80,progress:0,status:"active",
          dependencies:[],acceptableMethods:[],rationale:"Seeded from packaged GM dossier.",source:"gm_dossier"
        });
        counts.goals++;
      }
      for(let i=0;i<(npc.knows||[]).length;i++){
        const item=String(npc.knows[i]||"").trim(); if(!item) continue;
        db.upsertNpcKnowledge(guildId,{
          npcKey:key,knowledgeKey:`seed.known.${i+1}`,content:item,beliefState:"known",
          confidence:95,sourceType:"seed",sourceRef:"GM_PRIVATE/NPCS/npcs.json",isSecret:false
        });
        counts.knowledge++;
      }
      for(let i=0;i<(npc.does_not||[]).length;i++){
        const item=String(npc.does_not[i]||"").trim(); if(!item) continue;
        db.upsertNpcKnowledge(guildId,{
          npcKey:key,knowledgeKey:`seed.unknown.${i+1}`,content:item,beliefState:"unknown",
          confidence:100,sourceType:"seed",sourceRef:"GM_PRIVATE/NPCS/npcs.json",isSecret:true
        });
        counts.knowledge++;
      }
      if(String(npc.secret||"").trim()){
        db.upsertNpcKnowledge(guildId,{
          npcKey:key,knowledgeKey:"seed.self_secret",content:npc.secret,beliefState:"known",
          confidence:100,sourceType:"seed",sourceRef:"GM_PRIVATE/NPCS/npcs.json",isSecret:true
        });
        counts.knowledge++;
        db.addNpcMemory(guildId,{
          npcKey:key,memoryType:"secret",content:npc.secret,subjectType:"npc",subjectKey:key,
          sentiment:0,importance:85,confidence:100,sourceType:"seed",
          sourceRef:"GM_PRIVATE/NPCS/npcs.json",tags:["seed","self-secret"]
        });
        counts.memories++;
      }
    }

    for(const ref of db.listReferences(guildId,"npc",{publicOnly:false})){
      const key=normalizeNpcKey(ref.display_name||ref.entity_key);
      if(!key) continue;
      const existingProfile=db.getNpcProfile(guildId,key);
      if(incremental&&existingProfile) continue;
      if(!existingProfile){
        db.upsertNpcProfile(guildId,{
          npcKey:key,displayName:ref.display_name||ref.entity_key,role:"",
          publicIdentity:ref.summary||"",portrayal:ref.summary||"",activityTier:"active",
          decisionProfile:{},knowledgeBoundaries:[],capabilities:[],source:"campaign_reference"
        });
        counts.profiles++;
      } else {
        db.upsertNpcProfile(guildId,{
          npcKey:key,displayName:existingProfile.display_name,role:existingProfile.role,
          publicIdentity:existingProfile.public_identity||ref.summary||"",portrayal:existingProfile.portrayal||ref.summary||"",activityTier:"active",
          decisionProfile:existingProfile.decision_profile,knowledgeBoundaries:existingProfile.knowledge_boundaries,
          capabilities:existingProfile.capabilities,source:existingProfile.source
        });
      }
      if(String(ref.summary||"").trim()){
        db.addNpcMemory(guildId,{
          npcKey:key,memoryType:"semantic",content:ref.summary,subjectType:"npc",subjectKey:key,
          importance:45,confidence:90,sourceType:"seed",sourceRef:"reference_entries",
          tags:["seed","campaign-reference"],dedupe:true
        });
        counts.memories++; counts.references++;
      }
    }

    for(const rel of db.listRelationships(guildId,{includeGM:true})){
      // Bulk import must not launder an old model interpretation into a new NPC
      // profile or trusted seeded memory. Preserve the original for GM review.
      if(rel.epistemic?.kind==="hypothesis"||rel.evidence_active===false)continue;
      for(const side of ["from","to"]){
        if(rel[`${side}_type`]!=="npc") continue;
        const raw=rel[`${side}_label`]||rel[`${side}_key`];
        const key=normalizeNpcKey(String(raw||"").replace(/^npc:/,""));
        const otherSide=side==="from"?"to":"from";
        const other=rel[`${otherSide}_label`]||rel[`${otherSide}_key`];
        if(!key) continue;
        if(!db.getNpcProfile(guildId,key)){
          db.upsertNpcProfile(guildId,{
            npcKey:key,displayName:String(raw||key),activityTier:"active",
            decisionProfile:{},knowledgeBoundaries:[],capabilities:[],source:"relationship_state"
          });
          counts.profiles++;
        }
        db.addNpcMemory(guildId,{
          npcKey:key,memoryType:"relational",
          content:`${rel.relationship_type}: ${other}${rel.note?` — ${rel.note}`:""}`,
          subjectType:rel[`${otherSide}_type`]||"entity",subjectKey:String(rel[`${otherSide}_key`]||""),
          sentiment:Math.max(-5,Math.min(5,Number(rel.score)||0)),importance:55,confidence:90,
          sourceType:"seed",sourceRef:`relationship:${rel.id}`,tags:["seed","relationship"],dedupe:true
        });
        counts.memories++; counts.relationships++;
      }
    }

    if(!prior) db.recordSeedRun(guildId,seedKey,{actorId,summary:counts});
    db.recordMutation(guildId,{
      actorType:"human_gm",actorId,sourceLayer:"seed",mutationType:"npc_cognition_seed",
      entityKey:seedKey,visibility:"gm",confidence:100,
      rationale:"One-time NPC cognition bootstrap from packaged GM dossiers and existing campaign reference/relationship state.",
      after:counts,payload:{seed_key:seedKey}
    });
  });
  return counts;
}
