/** Sanitized owner-authored v9 fixtures; temporary SQLite only, no real campaign IDs or model calls. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeiledDB } from "../src/db.js";
import { captureAuthoredTurnEnvelope } from "../src/authored-turn-envelope.js";
import { proposeIntents, acceptIntentForAdjudication } from "../src/typed-intents.js";

export async function nativeFixture(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"vc-v9-"));
  let db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
  const guild="v9-synthetic";
  try{
    db.ensureCampaign(guild);db.setCityCalendar(guild,{flags:{autonomous_pvp_fear:false}});const session=db.startSession(guild,"Four players at terminal");
    const pcs=["Jaxon","Choso","Billy","Tyrell"].map((name,i)=>{
      const user=`player-${i}`;db.upsertPlayer(guild,user,name);
      const pc=db.createCharacter(guild,user,name,{traits:{Agility:2,Strength:1,Finesse:3,Instinct:1,Presence:0,Knowledge:2},
        resources:{hope:2,hp:{current:0,max:6},stress:{current:2,max:6},armor:{current:0,max:3}}});
      db.updateCharacterData(pc.id,data=>{data.location="terminal";});
      db.assignCharacter(session.id,user,pc.id);db.setPresence(session.id,user,"present");return db.getCharacter(pc.id);
    });
    let sequence=0;
    const accepted=(actor=0,text="I attempt a harmless shin tap.",target=pcs[1].id,overrides={})=>{
      const pc=pcs[actor],messageId=`synthetic-${sequence++}`,scope={mode:"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
      const envelope=captureAuthoredTurnEnvelope(db,guild,pc.owner_user_id,pc.id,messageId,text);
      const proposal=proposeIntents(db,guild,[{version:2,proposal_id:"",source_event:envelope.source_event,start:0,end:text.length,
        source_span:text,actor_character_id:pc.id,sequence_index:0,dependencies:[],type:"interact",operation:"contest",
        target:{kind:"character",key:target,phrase:"Choso",grounding:"known"},framing:"immediate",destination_scope:"none",
        attempted_action:text,desired_outcome:null,authored_outcome_claim:null,temporal_relation:"sequential",...overrides}],scope,{messageId})[0];
      return acceptIntentForAdjudication(db,guild,proposal,scope);
    };
    return await run({get db(){return db;},guild,session,pcs,accepted,restart(){
      db.close();db=new VeiledDB(path.join(dir,"fixture.sqlite"),path.resolve("sql/schema.sql"));
    }});
  }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
}
export function pvpTerms(pcs,overrides={}){
  return {version:2,objective:"Break the tension with a harmless contest.",mode:"single_roll_duel",
    stakes:pcs.slice(0,2).map(pc=>({character:pc.id,best:`${pc.name} may describe their own harmless success.`,
      worst:`${pc.name} does not achieve their objective; their reaction remains theirs.`,tie:"Neither achieves the objective."})),
    boundaries:["no_death","no_permanent_maiming","no_involuntary_item_loss","no_HP_armor_stress_damage",
      "no_forced_player_dialogue","no_private_information_disclosure","no_forced_player_control"],
    traits:pcs.slice(0,2).map(pc=>({character:pc.id,allowed:["Agility","Finesse"]})),option_policy:"base_trait_only",
    hope_policy:"no_pvp_hope_generation",fear_policy:"immediate_contextual_fear",authorship:"winner_own_success_loser_own_response",
    audience:"private",tie_policy:"stalemate",stop_policy:"neutral_withdrawal",stall_policy:"wait_no_forfeit",
    expires_minute:1000,...overrides};
}
