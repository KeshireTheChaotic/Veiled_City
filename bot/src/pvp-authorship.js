/** Clause-level PvP agency. Closed native templates authorize material; free prose stays private and noncanonical. */
import { createHash } from "node:crypto";
import { pvpOwnerContext } from "./narrative-pvp.js";
import { indexWorldEvent } from "./city-calendar.js";
import { currentScene } from "./scene-continuity.js";

const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const key=(kind,value)=>`${kind}:${hash(value).slice(0,40)}`;
const baseFields=["proposal","expected_revision","resolution","role","subject_character","text","interaction_id"];
const templates={
  stake_success:{role:"success",kind:"own_success",effect:"agreed_stake_only",text:"I achieve only my agreed success."},
  reaction_apology:{role:"reaction",kind:"own_reaction",effect:"voluntary_apology",text:"I apologize."},
  reaction_glare:{role:"reaction",kind:"own_reaction",effect:"voluntary_glare",text:"I glare."},
  withhold:{role:"withhold",kind:"withhold",effect:"none",text:""}
};
function fail(message,extra={}){throw Object.assign(new Error(message),{code:"NARRATIVE_PVP",expected:true,...extra});}
function fields(input,required,optional=[]){
  if(!input||typeof input!=="object"||Array.isArray(input)||required.some(k=>!(k in input))
    ||Object.keys(input).some(k=>![...required,...optional].includes(k)))fail("Closed PvP clause operation fields required.");
}
function terminal(db,guild,user,input){
  const {proposal:p,terms,who}=pvpOwnerContext(db,guild,user,input.proposal);
  const r=db.getCityRecord(guild,"pvp_resolution_receipt",input.resolution||p.data.resolution_receipt);
  if(input.expected_revision!==p.data.terms_hash||!r||r.status!=="resolved"||r.record_key!==p.data.resolution_receipt
    ||r.data.proposal!==p.record_key||r.data.terms_hash!==p.data.terms_hash)fail("Exact terminal PvP result/terms required.");
  return {p,r,t:terms.data.snapshot.terms,who};
}
function event(db,guild,p,who,input,kind,details){
  if(typeof input.interaction_id!=="string"||!input.interaction_id||input.interaction_id.length>100)
    fail("Authenticated narrative interaction required.");
  const data={author:who.user,character_id:who.character,principal_revision:who.principal_revision,
    proposal:p.record_key,terms_hash:p.data.terms_hash,...details};
  const s=indexWorldEvent(db,guild,{key:key("pvp-authorship-source",[guild,who.user,input.interaction_id]),kind,
    title:"Private PvP narrative source",source_id:`player:${who.user}`,session_id:p.data.session_id,scene:p.data.scene,
    visibility:"character",subject_key:who.character,details:data},who.user);
  if(s.status!=="active"||s.kind!==kind||s.scene!==p.data.scene||s.session_id!==p.data.session_id
    ||s.source_id!==`player:${who.user}`||s.visibility!=="character"||s.subject_key!==who.character
    ||hash(s.details)!==hash(data)||!db.ownerAuthoredSource(guild,s.event_key,who.user))
    fail("Immutable exact narrative source replay changed.");
  return s;
}
function sourceActive(db,guild,s,p,who,digest){
  if(!s||s.status!=="active"||s.scene!==p.data.scene||s.session_id!==p.data.session_id||s.visibility!=="character"
    ||s.subject_key!==who.character||s.source_id!==`player:${who.user}`||s.details.author!==who.user
    ||s.details.character_id!==who.character||s.details.principal_revision!==who.principal_revision
    ||s.details.proposal!==p.record_key||s.details.terms_hash!==p.data.terms_hash||hash(s.details)!==digest
    ||!db.ownerAuthoredSource(guild,s.event_key,who.user))fail("Current immutable clause source/hash/principal required.");
}
function template(input,r,who,{ratification=false,name=""}={}){
  const t=templates[input.template];
  if(!t||input.role!==t.role||input.subject_character!==who.character)fail("Own subject and closed role/template boundary required.");
  if(t.role==="success"&&r.data.winner!==who.character)fail("Only verified winner owns the agreed success clause.");
  // No arbitrary success wording/effect is admitted. The only success effect is the unchanged native stake.
  const text=ratification&&input.template==="reaction_apology"?`${name} apologizes for losing.`:t.text;
  if(input.text!==text)fail("Own narrative boundary needs exact template/source; free text needs scope review.");
  return {...t,text};
}
function saveClause(db,guild,{p,r,t,who},s,input,{draft=null,start=0,end=input.text.length}={}){
  const data={version:1,claim_id:key("pvp-claim",[p.record_key,r.record_key,s.event_key,start,end]),
    proposal:p.record_key,terms_hash:p.data.terms_hash,resolution_ref:r.record_key,resolution_hash:hash(r.data),
    role:t.kind,template:input.template,subject_character:who.character,owning_user:who.user,
    principal_revision:who.principal_revision,claim_kind:t.kind,claimed_effect:t.effect,authority_ref:s.event_key,
    authority_hash:hash(s.details),source_event:draft?.source_event||s.event_key,
    source_hash:hash(draft?db.getWorldEvent(guild,draft.source_event).details:s.details),
    source_span:input.text,start,end,audience:"character",
    disclosure_policy:db.getCityRecord(guild,"pvp_terms_revision",p.data.terms_revision).data.snapshot.terms.audience,
    revision:1,draft:draft?.record_key||null,stake_constraint:r.data.allowed_stake||null};
  const k=key("pvp-clause",data),prior=db.getCityRecord(guild,"pvp_narrative_clause",k);
  if(prior){validatePvpClause(db,guild,k);return prior;}
  return db.saveCityRecord(guild,{kind:"pvp_narrative_clause",key:k,status:t.kind==="withhold"?"withheld":"authorized",
    source_event:data.source_event,visibility:"character",subject_key:who.character,data});
}
function bundle(db,guild,p,who,c){
  const k=key("pvp-narrative",[c.record_key]),prior=db.getCityRecord(guild,"pvp_authored_narrative",k);
  return prior||db.saveCityRecord(guild,{kind:"pvp_authored_narrative",key:k,status:c.status==="withheld"?"withheld":"clauses_authorized",
    source_event:c.source_event,visibility:"character",subject_key:who.character,data:{version:2,proposal:p.record_key,
      terms_hash:p.data.terms_hash,resolution:p.data.resolution_receipt,author:who.user,character:who.character,
      clauses:[c.record_key],text:c.data.source_span,authority:"Native receipt plus independently verified owner clause; disclosure separate."}});
}
/** Raw paragraphs never enter canonical material records, even with a plausible own-subject label. */
export function draftPvpNarrative(db,guild,user,input){
  fields(input,baseFields,["template","reviewers"]);
  return db.transaction(()=>{
    const {p,r,who}=terminal(db,guild,user,input);
    if(input.subject_character!==who.character||typeof input.text!=="string"||!input.text.trim()||input.text.length>1200)
      fail("Bounded author-private draft with own subject required.");
    const reviewers=input.reviewers||[];
    if(!Array.isArray(reviewers)||reviewers.length>2||new Set(reviewers).size!==reviewers.length
      ||reviewers.some(v=>v!=="gm"&&!p.data.participants.some(w=>w.character===v&&w.character!==who.character)))
      fail("Explicit scoped draft review invitation required.");
    const s=event(db,guild,p,who,input,"pvp_narrative_draft",{resolution:r.record_key,raw_text:input.text,reviewers});
    return db.saveCityRecord(guild,{kind:"pvp_narrative_draft",key:key("pvp-draft",[s.event_key]),status:"needs_scope_review",
      source_event:s.event_key,visibility:"character",subject_key:who.character,data:{version:1,proposal:p.record_key,
        terms_hash:p.data.terms_hash,resolution:r.record_key,author:user,principal_revision:who.principal_revision,
        text:input.text,text_hash:hash(input.text),source_hash:hash(s.details),reviewers,
        reason:"undecidable_free_text",authority:"Noncanonical private proposal; no character behavior or publication authorized."}});
  });
}
export function authorPvpNarrative(db,guild,user,input){
  fields(input,baseFields,["template"]);
  const c=terminal(db,guild,user,input);
  if(input.subject_character!==c.who.character)fail("Only your own subject/reaction may be authored.");
  let t;
  try{t=template(input,c.r,c.who);}
  catch(error){
    if(error.code!=="NARRATIVE_PVP")throw error;
    // Preserve an ambiguous submission, then report a recoverable scoped rejection (never a material success).
    if(typeof input.text==="string"&&input.text.trim()&&input.text.length<=1200){
      const d=draftPvpNarrative(db,guild,user,input);error.draft=d.record_key;
    }
    throw error;
  }
  return db.transaction(()=>{
    const s=event(db,guild,c.p,c.who,input,"pvp_narrative_clause_authorization",
      {resolution:c.r.record_key,raw_text:input.text,template:input.template,role:input.role});
    const clause=saveClause(db,guild,{...c,t},s,input);
    return bundle(db,guild,c.p,c.who,clause);
  });
}
function currentDraft(db,guild,p,id){
  const d=db.getCityRecord(guild,"pvp_narrative_draft",id),s=d&&db.getWorldEvent(guild,d.source_event);
  const who=p.data.participants.find(w=>w.character===d?.subject_key&&w.user===d?.data.author);
  if(!d||d.status!=="needs_scope_review"||!who||d.data.proposal!==p.record_key||d.data.terms_hash!==p.data.terms_hash
    ||d.data.resolution!==p.data.resolution_receipt||d.data.text_hash!==hash(d.data.text)
    ||s?.details.raw_text!==d.data.text||hash(s?.details.reviewers)!==hash(d.data.reviewers))fail("Exact active private draft required.");
  pvpOwnerContext(db,guild,who.user,p.record_key);sourceActive(db,guild,s,p,who,d.data.source_hash);return d;
}
export function pvpNarrationInbox(db,guild,user,proposal){
  const {proposal:p,who}=pvpOwnerContext(db,guild,user,proposal),drafts=[];
  for(let offset=0;offset<2000;offset+=100){
    const page=db.listCityRecords(guild,{kind:"pvp_narrative_draft",includeGM:true,limit:100,offset});
    for(const d of page)if(d.data.proposal===p.record_key&&d.subject_key===who.character)
      drafts.push({draft:d.record_key,status:d.status,reason:d.data.reason});
    if(page.length<100)break;
  }
  return {proposal, result_status:p.data.resolution_receipt?"result_terminal":"result_pending",
    drafts,authority:"Only your draft metadata. Narration never changes the saved result."};
}
export function reviewPvpDraft(db,guild,user,input,{gm=false}={}){
  fields(input,["proposal","expected_revision","draft"]);
  const p=db.getCityRecord(guild,"pvp_proposal",input.proposal);
  if(!p||input.expected_revision!==p.data.terms_hash)fail("Current private draft scope required.");
  const d=currentDraft(db,guild,p,input.draft);
  const who=gm?null:pvpOwnerContext(db,guild,user,p.record_key).who;
  if(gm?!d.data.reviewers.includes("gm"):d.subject_key!==who.character&&!d.data.reviewers.includes(who.character))
    fail("Explicit author-invited draft preview required.");
  return {draft:d.record_key,text:d.data.text,status:"needs_scope_review",text_hash:d.data.text_hash,
    authority:"NONCANONICAL. Preview is not agency, ratification, or permission to publish."};
}
export function ratifyPvpClause(db,guild,user,input){
  fields(input,["proposal","expected_revision","resolution","draft","template","start","end","source_span","interaction_id"]);
  return db.transaction(()=>{
    const c=terminal(db,guild,user,input),{p,who,r}=c,d=currentDraft(db,guild,p,input.draft);
    if(d.subject_key!==who.character&&!d.data.reviewers.includes(who.character))fail("Author's private exact-clause invitation required.");
    if(!Number.isSafeInteger(input.start)||!Number.isSafeInteger(input.end)||input.start<0||input.end<=input.start
      ||input.end>d.data.text.length||d.data.text.slice(input.start,input.end)!==input.source_span)
      fail("Exact source UTF-16 clause span required; no meaning expansion.");
    const spec={...input,role:"reaction",subject_character:who.character,text:input.source_span};
    const t=template(spec,r,who,{ratification:true,name:db.getCharacter(who.character).name});
    const s=event(db,guild,p,who,input,"pvp_clause_ratification",{resolution:r.record_key,draft:d.record_key,
      raw_text:spec.text,template:input.template,role:spec.role,start:input.start,end:input.end,text_hash:hash(spec.text),draft_hash:d.data.source_hash});
    const clause=saveClause(db,guild,{...c,t},s,spec,{draft:d,start:input.start,end:input.end});
    bundle(db,guild,p,who,clause);return clause;
  });
}
export function validatePvpClause(db,guild,id){
  const c=db.getCityRecord(guild,"pvp_narrative_clause",id),d=c?.data;
  if(!c||d.version!==1||!["authorized","withheld"].includes(c.status)||c.visibility!=="character"
    ||c.subject_key!==d.subject_character||c.record_key!==key("pvp-clause",d))fail("Immutable verified owner clause required; legacy narrative is inert.");
  const {p,r,t,who}=terminal(db,guild,d.owning_user,{proposal:d.proposal,expected_revision:d.terms_hash,resolution:d.resolution_ref});
  if(who.character!==d.subject_character||who.principal_revision!==d.principal_revision||hash(r.data)!==d.resolution_hash
    ||d.stake_constraint!==(r.data.allowed_stake||null)||t.audience!==d.disclosure_policy||d.source_event!==c.source_event)
    fail("Clause receipt/owner/revision/stake changed.");
  const s=db.getWorldEvent(guild,d.authority_ref);sourceActive(db,guild,s,p,who,d.authority_hash);
  if(!["pvp_narrative_clause_authorization","pvp_clause_ratification"].includes(s.kind)
    ||s.details.resolution!==r.record_key||s.details.template!==d.template||s.details.raw_text!==d.source_span)
    fail("Native exact clause authorization required.");
  const source=db.getWorldEvent(guild,d.source_event);
  if(d.draft){const draft=currentDraft(db,guild,p,d.draft);
    if(source.event_key!==draft.source_event||s.kind!=="pvp_clause_ratification"||s.details.draft!==draft.record_key
      ||s.details.start!==d.start||s.details.end!==d.end||s.details.draft_hash!==draft.data.source_hash
      ||s.details.text_hash!==hash(d.source_span))fail("Exact affected-owner ratification ancestry required.");}
  else if(s.event_key!==source.event_key||d.start!==0||d.end!==d.source_span.length)fail("Exact owner source span required.");
  if(source.status!=="active"||hash(source.details)!==d.source_hash
    ||source.details.raw_text.slice(d.start,d.end)!==d.source_span)fail("Clause source/span hash changed or retracted.");
  const verified=template({template:d.template,role:s.details.role,subject_character:who.character,text:d.source_span},r,who,
    {ratification:!!d.draft,name:db.getCharacter(who.character).name});
  if(verified.kind!==d.claim_kind||verified.kind!==d.role||verified.effect!==d.claimed_effect||d.audience!=="character")
    fail("Closed claim/effect boundary changed.");
  return c;
}
function narrative(db,guild,p,id){
  const n=db.getCityRecord(guild,"pvp_authored_narrative",id);
  if(!n||n.status!=="clauses_authorized"||n.data.version!==2||n.data.proposal!==p.record_key
    ||n.data.terms_hash!==p.data.terms_hash||n.data.resolution!==p.data.resolution_receipt||n.visibility!=="character"
    ||!Array.isArray(n.data.clauses)||!n.data.clauses.length||n.data.clauses.length>8)fail("Authorized clause bundle required; raw/legacy drafts cannot publish.");
  const clauses=n.data.clauses.map(id=>validatePvpClause(db,guild,id));
  if(clauses.some(c=>c.data.proposal!==p.record_key||c.subject_key!==n.subject_key||c.data.owning_user!==n.data.author))
    fail("Narrative clause ownership mismatch.");
  const text=clauses.map(c=>c.data.source_span).join("\n");
  if(n.data.text!==text)fail("Projection text must be rendered only from verified clauses.");
  return {n,clauses,text};
}
function disclosure(db,guild,p,n,who,text){
  const a=db.getCityRecord(guild,"pvp_narration_disclosure",key("pvp-share",[n.record_key,who.character]));
  const s=a&&db.getWorldEvent(guild,a.source_event);
  if(a?.status!=="accepted"||a.data.text_hash!==hash(text)||a.data.terms_hash!==p.data.terms_hash)return false;
  sourceActive(db,guild,s,p,who,a.data.source_hash);
  return s.kind==="pvp_narration_disclosure"&&s.details.narrative===n.record_key&&s.details.text_hash===hash(text);
}
export function reviewPvpNarrative(db,guild,user,input){
  fields(input,["proposal","narrative","expected_revision"]);
  const {p,who}=terminal(db,guild,user,input),{n,text}=narrative(db,guild,p,input.narrative);
  const author=p.data.participants.find(w=>w.character===n.subject_key);
  if(n.subject_key!==who.character&&!disclosure(db,guild,p,n,author,text))fail("Author's explicit private review invitation required.");
  db.saveCityRecord(guild,{kind:"pvp_narrative_review",key:`${n.record_key}:${who.character}`,status:"seen",
    visibility:"character",subject_key:who.character,source_event:n.source_event,
    data:{version:2,text_hash:hash(text),terms_hash:p.data.terms_hash,user,principal_revision:who.principal_revision}});
  return {narrative:n.record_key,text,author_character:n.subject_key,authority:"Seen is not reaction consent. Content authority and disclosure are separate."};
}
export function sharePvpNarrative(db,guild,user,input){
  fields(input,["proposal","narrative","expected_revision","interaction_id"]);
  return db.transaction(()=>{
    const {p,t,who}=terminal(db,guild,user,input);
    if(t.audience!=="bilateral_author_projection")fail("PvP audience remains private; no party projection authorized.");
    const {n,text}=narrative(db,guild,p,input.narrative);
    const seen=db.getCityRecord(guild,"pvp_narrative_review",`${n.record_key}:${who.character}`);
    if(seen?.data.text_hash!==hash(text)||seen.data.principal_revision!==who.principal_revision
      ||seen.data.terms_hash!==p.data.terms_hash)fail("Review exact authorized clauses before disclosure.");
    const s=event(db,guild,p,who,input,"pvp_narration_disclosure",{resolution:p.data.resolution_receipt,narrative:n.record_key,text_hash:hash(text)});
    db.saveCityRecord(guild,{kind:"pvp_narration_disclosure",key:key("pvp-share",[n.record_key,who.character]),status:"accepted",
      source_event:s.event_key,visibility:"character",subject_key:who.character,
      data:{narrative:n.record_key,text_hash:hash(text),terms_hash:p.data.terms_hash,source_hash:hash(s.details)}});
    if(!p.data.participants.every(who=>disclosure(db,guild,p,n,who,text)))
      return {status:"awaiting_bilateral_disclosure",narrative:n.record_key};
    const k=key("pvp-projection",[n.record_key,p.data.terms_hash]);
    if(db.getCityRecord(guild,"pvp_public_projection",k))return pvpProjection(db,guild,k);
    return db.saveCityRecord(guild,{kind:"pvp_public_projection",key:k,status:"approved",visibility:"party",source_event:n.source_event,
      data:{version:2,proposal:p.record_key,resolution:p.data.resolution_receipt,narrative:n.record_key,clauses:n.data.clauses,text,
        authority:"Verified per-player clauses only. No raw draft, opposing sealed choice or additional effect."}});
  });
}
export function pvpProjection(db,guild,id){
  const row=db.getCityRecord(guild,"pvp_public_projection",id);
  if(!row||row.status!=="approved"||row.visibility!=="party"||row.data.version!==2)fail("Current verified clause projection required.");
  const p=db.getCityRecord(guild,"pvp_proposal",row.data.proposal),{n,text}=narrative(db,guild,p,row.data.narrative);
  if(row.data.resolution!==p.data.resolution_receipt||text!==row.data.text||hash(row.data.clauses)!==hash(n.data.clauses)
    ||!p.data.participants.every(w=>disclosure(db,guild,p,n,w,text)))fail("Projection clause/current audience proof missing.");
  return row;
}
export function reviewPvpScope(db,guild,user,input,{gm=false}={}){
  fields(input,["proposal","expected_revision","draft","decision","rationale","interaction_id"]);
  if(!gm)fail("Authenticated GM scope review required; never character consent.");
  const p=db.getCityRecord(guild,"pvp_proposal",input.proposal),d=p&&currentDraft(db,guild,p,input.draft);
  if(!d||input.expected_revision!==p.data.terms_hash||!d.data.reviewers.includes("gm"))fail("Author-invited current scope review required.");
  if(!["reject","request_rewrite","request_owner_ratification","neutral_environment"].includes(input.decision))
    fail("Scope decision cannot authorize PC behavior.");
  if(typeof input.rationale!=="string"||!input.rationale.trim()||input.rationale.length>600)fail("Bounded audit rationale required.");
  if(input.decision==="neutral_environment"&&(d.data.text!=="A nearby light flickers."
    ||!db.listCityRecords(guild,{kind:"pvp_round_receipt",includeGM:true,limit:500})
      .some(r=>r.data.proposal===p.record_key&&r.data.terms_hash===p.data.terms_hash&&r.data.result.duality==="Fear")))
    fail("Only closed neutral scenery supported by native Fear can be reviewed; no character scope approval.");
  return db.transaction(()=>{
    const data={version:1,reviewer:user,role:"authenticated_gm",proposal:p.record_key,terms_hash:p.data.terms_hash,
      resolution:p.data.resolution_receipt,draft:d.record_key,text_hash:d.data.text_hash,decision:input.decision,
      rationale:input.rationale,timestamp:new Date().toISOString(),authorizing:false};
    const k=key("pvp-scope-review",[guild,user,input.interaction_id]);
    const prior=db.getCityRecord(guild,"pvp_narrative_scope_review",k);
    if(prior){
      const {audit_ref:unused,...saved}=prior.data;
      if(hash({...saved,timestamp:null})!==hash({...data,timestamp:null}))fail("Scope review replay changed.");return prior;
    }
    const audit=db.recordMutation(guild,{actorType:"human_gm",actorId:user,sourceLayer:"pvp_scope_review",mutationType:input.decision,
      entityKey:d.record_key,visibility:"gm",rationale:input.rationale,payload:data});
    return db.saveCityRecord(guild,{kind:"pvp_narrative_scope_review",key:k,status:input.decision,source_event:d.source_event,
      visibility:"character",subject_key:d.subject_key,data:{...data,audit_ref:typeof audit==="string"?audit:audit?.id||null}});
  });
}
/** Strict PvP output surface: arbitrary generated connective text cannot prove character agency. */
export function assertPvpOutput(db,guild,result,scope={mode:"party"}){
  if(!db.getActiveSession(guild))return;
  const scene=currentScene(db,guild),proposals=db.listCityRecords(guild,{kind:"pvp_proposal",includeGM:true,limit:500})
    .filter(p=>p.data.scene===scene.key&&p.data.session_id===scene.session_id
      &&(!scope.actorUserId||p.data.participants.some(w=>w.user===scope.actorUserId)));
  if(!proposals.length)return;
  const outputs=[result.narration,result.public_narration,result.player_summary,...(result.private_messages||[]).map(m=>m.content)]
    .filter(v=>String(v||"").trim());
  for(const text of outputs){
    if(text==="The agreed contest is complete. Each player controls their own response."
      &&proposals.every(p=>!!p.data.resolution_receipt))continue;
    const projection=db.listCityRecords(guild,{kind:"pvp_public_projection",includeGM:true,limit:500})
      .find(p=>p.data.text===text&&proposals.some(v=>v.record_key===p.data.proposal));
    if(!projection)fail("PvP narration needs independently verified clauses; generated prose requires private scope review.");
    pvpProjection(db,guild,projection.record_key);
  }
}
