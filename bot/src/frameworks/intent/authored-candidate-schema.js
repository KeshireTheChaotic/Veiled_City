const candidateFields={kind:{type:"string",enum:["action","entry","speech"]},source_ref:{type:"string",maxLength:200},
  source_span:{type:"string",maxLength:1500},target:{type:"string",maxLength:160},quote:{type:"string",maxLength:1000}};
const closed=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
export const authoredCandidatesSchema={anyOf:[{type:"null"},{type:"array",maxItems:6,items:{anyOf:[closed(candidateFields),closed({...candidateFields,
  version:{type:'integer',enum:[2]},start:{type:'integer',minimum:0},end:{type:'integer',minimum:1},
  framing:{type:'string',enum:['immediate','hypothetical','conditional','quoted','reported','ooc']}})]}}]};
// Current provider emission only. Persisted/manual five-field recovery remains in the compatibility parser.
export const currentAuthoredCandidatesSchema={anyOf:[{type:'null'},{type:'array',maxItems:6,
  items:authoredCandidatesSchema.anyOf[1].items.anyOf[1]}]};
export const AUTHORED_CANDIDATES_PROMPT="authored_candidates is optional source-span-backed extraction of the current authored message, not world truth. "
  +"Understand fragments, indirect actions, unquoted dialogue and multiword names. Copy source_span as the whole authored clause including speech attribution, and spoken quote exactly; source_ref is the supplied current input_source. "
  +"Do not extract hypothetical/OOC/quoted examples, planning, third-person reported speech or another PC's acts. Entry target must be explicitly named in the span; otherwise preserve an action candidate and resolve ordinary context without claiming arrival. "
  +"Use version=2 with exact original start/end offsets and clause-level framing, matching a player_intents clause. An earlier hypothetical/report does not change a later immediate clause. "
  +"Mixed speech/action uses separate spans. Candidates never authorize rolls, consent, spending, access, travel or presence.";
