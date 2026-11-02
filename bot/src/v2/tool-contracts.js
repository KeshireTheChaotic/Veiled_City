const text={type:'string'};
const object=(properties,required)=>({type:'object',properties,required,additionalProperties:false});
const definitions=[
  {name:'context_read',description:'Optionally retrieve audience-authorized context. Reference lookup never grants access.',parameters:object({topic:text,focus:text,cursor:text},['topic'])},
  {name:'action_propose',description:'Propose a meaningful consequence for native rules validation. A proposal is not a successful effect.',parameters:object({source_ref:text,actor_ref:text,action:object({kind:text,parameters:{type:'object',additionalProperties:true}},['kind','parameters']),expected_revision:text,reason:text},['source_ref','actor_ref','action'])},
  {name:'state_inspect',description:'Inspect a native receipt within this source and audience.',parameters:object({receipt_ref:text},['receipt_ref'])},
  {name:'knowledge_propose',description:'Suggest sourced knowledge or a canon proposal for native review; never establish truth by assertion.',parameters:object({source_ref:text,kind:{type:'string',enum:['testimony','observation','identity','memory','fact','canon_proposal']},claim:text,subject_ref:text,evidence_refs:{type:'array',items:text,maxItems:32}},['source_ref','kind','claim'])}
];
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export const GENERIC_TOOL_CONTRACTS=freeze(definitions);
