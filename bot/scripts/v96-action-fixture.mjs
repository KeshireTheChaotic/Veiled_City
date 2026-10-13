/** Shared sanitized ordinary-action fixture; only temporary nativeFixture databases are accepted by callers. */
import {createHash} from "node:crypto";
import {captureWorldInput} from "../src/autonomous-world.js";
import {indexWorldEvent} from "../src/city-calendar.js";
import {currentScene} from "../src/scene-continuity.js";
import {applyAuthoritativeMutation} from "../src/state.js";

export function actionFixture(f,text="I improvise a distraction with the file cart.",{privateScene=false}={}){
  const pc=f.pcs[0],messageId=`v96-${createHash("sha256").update(text).digest("hex").slice(0,12)}`,scene=currentScene(f.db,f.guild);
  const scope={mode:privateScene?"private":"party",actorUserId:pc.owner_user_id,actorCharacterId:pc.id};
  captureWorldInput(f.db,f.guild,pc.owner_user_id,pc.id,messageId,text,{privateScene});
  f.db.setCityCalendar(f.guild,{flags:{...f.db.getCityCalendar(f.guild).flags,gm_discretion:true,roll_requests:true,roll_collaboration:true}});
  const evidence=indexWorldEvent(f.db,f.guild,{key:"visible-cart",kind:"observation",title:"An accessible file cart",
    source_id:"human_gm",truth_status:"observed",visibility:privateScene?"character":"party",subject_key:privateScene?pc.id:null,
    location_key:"terminal",session_id:scene.session_id,scene:scene.key,
    details:{description:"A file cart stands within reach; the attendant may notice a disruption."}},"human_gm");
  const ruling={version:1,disposition:"standard_action_roll",context_refs:[evidence.event_key],
    capability:{kind:"mundane",ref:""},effect_class:"attempt_only",trait:"Finesse",difficulty:15,
    risk:"The attendant may notice.",stakes:"The diversion may fail and draw attention.",
    explanation:"Use ordinary physical improvisation; the roll cannot compel an NPC response.",
    difficulty_reason:"The visible cart is accessible, but the nearby attendant may notice the noise.",
    saved_ruling_key:"",override_refs:[],raw_refs:[],house_refs:[],homebrew_refs:[],modifier_keys:[]};
  const intent={type:"interact",source_span:text,target_name:"",target_key:"",destination:"unspecified",
    operation:"improvise_diversion",utterance:"",excluded_targets:[],framing:"immediate",resolution:"roll_required",
    reason:"Meaningful scene uncertainty.",gm_ruling:ruling};
  const result={narration:"The attempted diversion awaits a native roll.",player_intents:[intent],narrative_claims:[]};
  return {pc,messageId,scope,evidence,ruling,intent,result,run:()=>applyAuthoritativeMutation(f.db,{guildId:f.guild,
    sessionId:f.session.id,scope,narrative:result,provenance:{messageId}})};
}
