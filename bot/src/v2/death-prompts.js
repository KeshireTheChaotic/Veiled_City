import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID,randomBytes} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),id=v=>typeof v==='string'&&v.length>0&&v.length<=256;
const moves={risk_it_all:'Risk It All',avoid_death:'Avoid Death',blaze_of_glory:'Blaze of Glory'};
export function deathPromptPayload(message){
  if(typeof message?.content!=='string'||!Array.isArray(message.components)||message.embeds?.length||message.attachments?.size)throw new Error('Exact native death prompt payload required');
  return {content:message.content,components:message.components.map(row=>{const r=row.toJSON?.()??row;if(r.type!==1||!Array.isArray(r.components))throw new Error('Native death button row required');return {type:1,components:r.components.map(button=>{const b=button.toJSON?.()??button;if(b.type!==2)throw new Error('Native death button required');return {type:2,style:b.style,label:b.label,custom_id:b.custom_id??b.customId,disabled:b.disabled===true,emoji:b.emoji??null,url:b.url??null};})};})};
}
export function openDeathPromptStore(filename=':memory:',{clock=()=>Date.now()}={}){
  const db=new DatabaseSync(filename);try{db.exec('PRAGMA busy_timeout=5000');if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().some(r=>r.name!=='vk3_death_prompts'))throw new Error('Dedicated death prompt database required');db.exec('CREATE TABLE IF NOT EXISTS vk3_death_prompts(id TEXT PRIMARY KEY,data TEXT NOT NULL)');}catch(e){db.close();throw e;}
  const get=ref=>{const r=db.prepare('SELECT data FROM vk3_death_prompts WHERE id=?').get(ref);return r?JSON.parse(r.data):null;};
  function tx(check,fn){if(typeof check!=='function')throw new Error('Native death prompt authority required');db.exec('BEGIN IMMEDIATE');try{check();const value=fn();check();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
  function issue({terms,channelId,expiresAt},{check,reuse=false,replace=null}){
    if(!terms||!['death_review','death_choice','death_allocation'].includes(terms.purpose)||!['campaignId','sceneId','actorId','ownerUserId','controlRevision','requestRef'].every(k=>id(terms[k]))||!id(channelId)||!Number.isSafeInteger(expiresAt)||expiresAt<=clock()||expiresAt>clock()+900000||!Number.isSafeInteger(terms.level)||!Number.isSafeInteger(terms.hopeCap)||!Array.isArray(terms.allowedMoves)||terms.allowedMoves.some(move=>!Object.hasOwn(moves,move)))throw new Error('Current bounded native death prompt terms required');
    return tx(check,()=>{
      let replacement=null;
      if(replace){
        const old=get(replace.ref),approval=typeof replace.readApproval==='function'?structuredClone(replace.readApproval()):null;
        if(!old||approval?.kind!=='owner_requested_death_prompt_refresh'||!id(approval.interactionId)||approval.promptRef!==old.id||approval.requestRef!==terms.requestRef||approval.campaignId!==terms.campaignId||approval.sceneId!==terms.sceneId||approval.actorId!==terms.actorId||approval.ownerUserId!==terms.ownerUserId||approval.oldTermsHash!==old.termsHash||approval.termsHash!==hash(terms)||typeof approval.commandHash!=='string'||!/^[a-f0-9]{64}$/.test(approval.commandHash)||hash(replace.readApproval())!==hash(approval))throw new Error('Explicit current owner prompt refresh evidence required');
        if(old.status==='superseded'){if(hash(old.supersession?.approval)!==hash(approval))throw new Error('Immutable prompt supersession conflict');return get(old.supersession.promptRef);}
        if(old.terms.campaignId!==terms.campaignId||old.terms.requestRef!==terms.requestRef||old.terms.purpose!==terms.purpose||old.terms.actorId!==terms.actorId||old.terms.ownerUserId!==terms.ownerUserId||old.delivery?.status!=='delivered'||old.delivery.messageId!==old.messageId||old.publication&&old.publication.status!=='delivered'||old.expiresAt>clock()&&old.status!=='revoked'&&old.termsHash===hash(terms))throw new Error('Only stale confirmed-delivered owner controls can be replaced; uncertainty remains held');
        replacement={old,approval};
      }
      if(reuse){
        const prior=db.prepare('SELECT data FROM vk3_death_prompts').all().map(r=>JSON.parse(r.data)).filter(r=>r.status!=='superseded'&&r.terms.campaignId===terms.campaignId&&r.terms.requestRef===terms.requestRef&&r.terms.purpose===terms.purpose);
        if(replacement&&!(prior.length===1&&prior[0].id===replacement.old.id))throw new Error('Duplicate owner controls require native reconciliation');
        if(prior.length&&!replacement){const row=prior[0];if(prior.length!==1||row.termsHash!==hash(terms)||row.channelId!==channelId)throw new Error('Existing death prompts require native reconciliation');return {...row,status:row.expiresAt<=clock()?'expired':row.status};}
      }
      const allocation=terms.purpose==='death_allocation';
      if(allocation&&(!Number.isSafeInteger(terms.budget)||terms.budget<1||terms.budget>12||!Array.isArray(terms.allowedAllocations)||terms.allowedAllocations.length<1||terms.allowedAllocations.length>13||terms.allowedAllocations.some(a=>!Number.isSafeInteger(a.hp)||!Number.isSafeInteger(a.stress)||a.hp<0||a.stress<0||a.hp>terms.markedHp||a.stress>terms.markedStress||a.hp+a.stress!==terms.budget||a.decision!==`allocate:${a.hp}:${a.stress}`)))throw new Error('Bounded native recovery splits required');
      const decisions=allocation?terms.allowedAllocations.map(a=>a.decision):terms.purpose==='death_review'?['reviewed']:Object.keys(moves),options=decisions.map(decision=>({decision,customId:`vk2death:${randomBytes(24).toString('hex')}`,label:allocation?(()=>{const a=terms.allowedAllocations.find(a=>a.decision===decision);return `Clear ${a.hp} HP, ${a.stress} Stress`;})():decision==='reviewed'?'I reviewed these risks':moves[decision],disabled:!allocation&&decision!=='reviewed'&&!terms.allowedMoves.includes(decision)}));
      const content=allocation?`Your saved Hope recovery clears ${terms.budget} marked slots. You have ${terms.markedHp} marked HP and ${terms.markedStress} marked Stress. Choose the exact split to clear. No allocation is selected automatically.`:`Your death move is your choice.\nRisk It All: Fear means death; matching dice clear all HP and Stress; Hope requires your explicit allocation of the Hope die across marked HP/Stress.\nAvoid Death: you become unconscious; a Hope die at or below your level permanently removes one Hope slot. Losing the last slot ends your journey.\nBlaze of Glory: one independently proposed, GM-approved final action is an automatic Critical, then you die.\nLevel ${terms.level}; permanent Hope slots ${terms.hopeCap}. No automatic choice, allocation, scar description or extra Fear move.${terms.allowedMoves.length<3?' An owned death feature requires native review for disabled options.':''}`;
      const components=[];for(let i=0;i<options.length;i+=5)components.push({type:1,components:options.slice(i,i+5).map(o=>({type:2,style:2,label:o.label,custom_id:o.customId,disabled:o.disabled}))});
      const payload={content,components},row={id:randomUUID(),terms:structuredClone(terms),termsHash:hash(terms),channelId,expiresAt,options,payload,payloadHash:hash(deathPromptPayload(payload)),status:'awaiting_delivery',messageId:null,...(replacement?{supersedes:replacement.old.id}:{})};db.prepare('INSERT INTO vk3_death_prompts VALUES(?,?)').run(row.id,JSON.stringify(row));
      if(replacement)db.prepare('UPDATE vk3_death_prompts SET data=? WHERE id=?').run(JSON.stringify({...replacement.old,status:'superseded',supersession:{promptRef:row.id,approval:replacement.approval}}),replacement.old.id);return row;
    });
  }
  function acknowledge(ref,{check,readDelivery}){return tx(check,()=>{
    const row=get(ref);if(!row||!['awaiting_delivery','delivering','uncertain','active'].includes(row.status)||row.expiresAt<=clock()||typeof readDelivery!=='function')throw new Error('Current native death prompt delivery required');const proof=structuredClone(readDelivery(ref));
    if(proof?.status!=='delivered'||proof.campaignId!==row.terms.campaignId||proof.channelId!==row.channelId||!id(proof.messageId)||proof.payloadHash!==row.payloadHash||JSON.stringify(proof.recipientIds)!==JSON.stringify([row.terms.ownerUserId])||row.messageId&&row.messageId!==proof.messageId)throw new Error('Exact private delivered death risks required');
    if(row.publication&&(proof.attemptId!==row.publication.attemptId||proof.audienceFingerprint!==row.publication.audienceFingerprint||!row.publication.response||proof.messageId!==row.publication.response.messageId))throw new Error('Exact claimed death delivery response required');
    if(JSON.stringify(readDelivery(ref))!==JSON.stringify(proof))throw new Error('Death prompt delivery changed');const after={...row,status:'active',messageId:proof.messageId,delivery:proof,...(row.publication?{publication:{...row.publication,status:'delivered'}}:{})};db.prepare('UPDATE vk3_death_prompts SET data=? WHERE id=?').run(JSON.stringify(after),ref);return after;
  });}
  function claim(ref,{check,audienceFingerprint}){return tx(check,()=>{
    const row=get(ref);if(!row||row.status!=='awaiting_delivery'||row.publication||row.expiresAt<=clock()||typeof audienceFingerprint!=='string'||!/^[a-f0-9]{64}$/.test(audienceFingerprint))throw new Error('Current unattempted death prompt required; no resend permitted');
    const after={...row,status:'delivering',publication:{attemptId:randomUUID(),audienceFingerprint,status:'delivering',response:null}};db.prepare('UPDATE vk3_death_prompts SET data=? WHERE id=?').run(JSON.stringify(after),ref);return after;
  });}
  function recordResponse(ref,attemptId,{check,readResponse}){return tx(check,()=>{
    const row=get(ref),response=typeof readResponse==='function'?structuredClone(readResponse(ref)):null;
    if(!row||!['delivering','uncertain'].includes(row.status)||row.publication?.attemptId!==attemptId||response?.attemptId!==attemptId||response.campaignId!==row.terms.campaignId||response.channelId!==row.channelId||response.promptRef!==ref||response.audienceFingerprint!==row.publication.audienceFingerprint||!id(response.messageId)||row.publication.response&&hash(row.publication.response)!==hash(response)||hash(readResponse(ref))!==hash(response))throw new Error('Immutable native death send response required');
    const after={...row,publication:{...row.publication,response}};db.prepare('UPDATE vk3_death_prompts SET data=? WHERE id=?').run(JSON.stringify(after),ref);return after;
  });}
  function markUncertain(ref,attemptId,{check}){return tx(check,()=>{
    const row=get(ref);if(!row||row.publication?.attemptId!==attemptId)throw new Error('Saved death send attempt required');if(['active','revoked','superseded'].includes(row.status))return row;
    const after={...row,status:'uncertain',publication:{...row.publication,status:'uncertain'}};db.prepare('UPDATE vk3_death_prompts SET data=? WHERE id=?').run(JSON.stringify(after),ref);return after;
  });}
  const visible=row=>row?{...row,status:row.status==='superseded'?'superseded':row.expiresAt<=clock()?'expired':row.status}:null;
  function readPrompt(token){for(const raw of db.prepare('SELECT data FROM vk3_death_prompts').all()){const row=JSON.parse(raw.data),option=row.options.find(o=>o.customId===token);if(option)return {...visible(row),...option,customId:token};}return null;}
  return Object.freeze({issue,ensure:(input,options)=>issue(input,{...options,reuse:true}),refresh:(ref,input,{check,readApproval})=>issue(input,{check,reuse:true,replace:{ref,readApproval}}),acknowledge,claim,recordResponse,markUncertain,read:ref=>visible(get(ref)),readPrompt,revoke(ref,{check}){return tx(check,()=>{const row=get(ref);if(!row||row.status==='superseded')throw new Error('Current native death prompt required');db.prepare('UPDATE vk3_death_prompts SET data=? WHERE id=?').run(JSON.stringify({...row,status:'revoked'}),ref);});},close:()=>db.close()});
}
