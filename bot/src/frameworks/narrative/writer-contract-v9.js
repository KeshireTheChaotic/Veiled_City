/** Immutable provider contract for native v9 narrative acts. */
import {NARRATIVE_ACT_KINDS} from './narrative-act-kinds-v9.js';
import {narrativeFictionDeltaV9Schema} from './gm-fiction-schema.js';
import {nativeClauseSchema} from './native-clause-schema-v9.js';

const str=maxLength=>({type:'string',maxLength});
const closed=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const actProperties={
  // Same id rule the narrative unit validator enforces; models otherwise emit ids such as "act:scene:1".
  id:{...str(64),pattern:'^[a-z][a-z0-9-]{0,63}$'},task_id:str(160),kind:{type:'string',enum:NARRATIVE_ACT_KINDS.filter(k=>k!=='gm_internal_note')},
  speaker_key:str(160),location_key:str(160),text:str(1800),source_refs:{type:'array',maxItems:8,items:str(160)}
};
export const narrativeResponseV9Schema=closed({version:{type:'integer',enum:[9]},acts:{type:'array',maxItems:8,
  items:{anyOf:[closed(actProperties),closed({...actProperties,construction:nativeClauseSchema})]}},fiction_delta:narrativeFictionDeltaV9Schema});
export const NARRATIVE_V9_INSTRUCTIONS='Return version:9, acts and fiction_delta. Each act answers a native task_id from audience_v9.task_ids. '
  +'Write as an imaginative, responsive GM: lived-in sensory detail, distinct NPC voices, meaningful dialogue and playable complications. '
  +'Let NPCs pursue their own wants within their knowledge; ordinary invention uses the native worldbuilding path when persistence is needed. '
  +'A place you describe that a player could go to next (a building, doorway, passage, street) and that is not yet a native location must be added to fiction_delta as a location '
  +'with a stable key, a plain name and parent_location_key set to the current location, and the act describing it must use that key as its location_key; '
  +'players can only travel to persisted places. Persisting a place the GM narrates (now or earlier) is not creating it because the owner named it. '
  +'When creative_brief.requested_places lists an unestablished destination, independently invent its name and description, include the exact requested phrase as one alias, and describe it at that adjacent location; this establishes a future target and never moves the character in the current turn. '
  +'Respond naturally to indirect invitations, leave PC decisions and feelings open, and allow player-to-player conversation room to breathe. '
  +'Adapt rhythm and detail to the scene; an ending need not be a menu, cliffhanger or compulsory question. '
  +'The server alone chose the audience and viewpoint BEFORE this request. Do not set visibility, owners, grants or outcomes. '
  +'Use independent scene_description, entitled player_perception, local npc_speech/npc_offer/npc_allegation, actionable lead, or artifact_text. '
  +'Use lead for a concrete clue or lead the characters can investigate; keep uncertainty explicit and do not turn a suspicion into objective fact. '
  +'speaker_key is an actual native local NPC key (empty for scenery/perception/artifact). artifact_text is ONLY the nonbinding printed words of a local sign. '
  +'NPC offers/questions do not select a player response; allegations are attributed testimony, not truth or binding history. '
  +'No dice, Difficulty, costs, Hope/Fear, success, injury, custody, consent, player reaction or private disclosure is created by prose. '
  +'Never impersonate a player/proxy. Act text never contains a player character name or alias (such acts are held): use a pronoun or a description instead; '
  +'npc_speech may only open with the name as a direct address ("Name, ..."). References for NPC factual recall must be native actor-known AND audience-entitled. '
  +'Task completion is native and based on actual accepted output; no answered/safe claim. Generated prose retains residual semantic risk.';
export const NATIVE_CLAUSE_INSTRUCTIONS='For ambiguous weather/PC aliases, physical sensory POV or a known-PC NPC question, use construction with text:"". '
  +'Only closed native primitives are supported; no free text within a construction. Native rendering discards no prose: nonempty text with construction is held. '
  +'A construction cannot establish PC reactions, emotions, agreement or surrender. Ordinary nonambiguous prose keeps the existing safeguards.';
