import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createNativeSessionSetup} from './native-session-setup.js';
import {createNativeDraftPublication} from './native-draft-publication.js';
import {createNativeCharacterRegistration} from './native-character-registration.js';
import {gmCommandInput} from './discord-gm-input.js';
import {createDiscordAudienceReader} from './discord-audience-reader.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Routes observed human GM commands: `session start`, private `pc-bootstrap-preview`
 * exact `pc-bootstrap-review` and `session end`. Each uses a private acknowledgement, a durable closed
 * claim, fresh GM authority and a fixed native effect. Nothing is published to the table
 * and nothing is retried after an uncertain effect or reply.
 * `bootstrap` ({readSource, actionStore}) is optional; without it those ops are not claimed.
 */
export function createDiscordGmSession({client,sceneStore,gmAuthority,interactionReceipts,bootstrap=null,characters=null,drafts=null,audienceReader=null,readGmRoleId=()=>null,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof interactionReceipts?.claim!=='function'||typeof gmAuthority?.authorize!=='function'||bootstrap&&(typeof bootstrap.readSource!=='function'||typeof bootstrap.actionStore?.initializePcFromReviewedSource!=='function')||characters&&typeof characters.getCharacter!=='function'||drafts&&(typeof drafts.recent!=='function'||typeof drafts.begin!=='function'||typeof drafts.finish!=='function'||typeof drafts.uncertain!=='function'))throw new TypeError('Native GM session dependencies required');
  const audiences=audienceReader??createDiscordAudienceReader({client}),setup=createNativeSessionSetup({sceneStore,gmAuthority}),registration=createNativeCharacterRegistration({sceneStore,gmAuthority}),pending=new Map(),controller=new AbortController();let closed=false;
  const publication=drafts?createNativeDraftPublication({sceneStore,gmAuthority,drafts,audiences,readGmRoleId,resolveChannel:async(c,id)=>{const guild=await client.guilds.fetch({guild:c,force:true});return guild.channels.fetch(id,{force:true});}}):null;
  const report=(error,id,stage)=>{try{onError(error,{interactionId:id,stage});}catch{}};
    /** Returns {kind, ref} for a claimed GM command, else null. */
  function route(e){
    try{
      if(e?.isChatInputCommand?.()!==true)return null;
      if(e.commandName==='vc-session'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='session'){const sub=e.options.getSubcommand();if(sub==='start')return {kind:'session',ref:'session-start',raw:[e.options.getString('title')??'',e.options.getString('assembly')??'auto']};if(sub==='end')return {kind:'end',ref:'session-end',raw:[]};}
      const input=gmCommandInput(e);
      if(input){
        const ref=`${input.op}:${input.actor??input.source??input.session??''}`;
        if(input.op==='session-reopen')return {kind:'reopen',ref,raw:input};
        if(drafts&&input.op==='draft-publish')return {kind:'publish',ref,raw:input};
        if(drafts&&input.op==='draft-list')return {kind:'drafts',ref,raw:input};
        if(characters&&(input.op==='pc-register'||input.op==='pc-rebind'))return {kind:input.op==='pc-rebind'?'rebind':'register',ref,raw:input};
        if(bootstrap&&(input.op==='pc-bootstrap-preview'||input.op==='pc-bootstrap-review'))return {kind:input.op==='pc-bootstrap-preview'?'preview':'review',ref,raw:input};
      }
    }catch{}
    return null;
  }
  async function reply(e,content,check){const id=e.id;interactionReceipts.claimReply(id,{check});try{await e.editReply({content,allowedMentions:{parse:[]}});interactionReceipts.finishReply(id,'delivered',{check});}catch(error){interactionReceipts.finishReply(id,'uncertain',{check});report(error,id,'reply');}}
  const describe=s=>`PC ${s.actorId} (owner ${s.ownerUserId}), level ${s.level}: HP ${s.hp.current}/${s.hp.max}, Armor ${s.armorSlots.current}/${s.armorSlots.max}, Stress ${s.stress.current}/${s.stress.max}, Hope ${s.hope}/${s.hopeCap}. snapshotHash ${hash(s)}`;
  async function execute(e,r){
    const id=e.id,bookkeeping=()=>{},alive=()=>{controller.signal.throwIfAborted();if(closed||e.client!==client||e.user?.bot!==false)throw new Error('Native GM command closed');};
    const binding={id,kind:'discord_command',campaignId:String(e.guildId),sceneId:`gm-operation:${id}`,actorId:`human-gm:${e.user?.id}`,principal:String(e.user?.id),channelId:String(e.channelId),requestRef:r.ref,commandHash:hash([e.commandName,r.raw])};
    const claim=interactionReceipts.claim(binding,{check:alive});if(!claim.created)return {handled:true,status:'already_claimed'};let stage='defer';
    try{
      if(e.deferred||e.replied||typeof e.deferReply!=='function'||typeof e.editReply!=='function')throw new Error('Native private acknowledgement required');
      await e.deferReply({flags:MessageFlags.Ephemeral});interactionReceipts.acknowledge(id,'deferred',{check:bookkeeping});alive();stage='decision';
      const proof=await gmAuthority.authorize(e,{signal:controller.signal}),c=proof.campaignId,actor=proof.targetRef;let receipt,text;stage='effects';
      if(r.kind==='session'){const created=setup.start(proof);receipt=created.receipt;text='Session saved. Nothing was announced; owner attendance and opening prose are separate steps.';}
      else if(r.kind==='end'){const ended=setup.end(proof);receipt=ended.receipt;text=`Session ended and ${ended.closedScenes.length} scene(s) closed. Nothing was deleted or announced; pending actions await native review.`;}
      else if(r.kind==='publish'){if(proof.operation!=='draft_publish')throw new Error('Draft publication authority required');receipt=await publication.publish(proof,r.raw,{signal:controller.signal});text='Approved draft sent once to its original audience. It was not acknowledged as knowledge or canon.';}
      else if(r.kind==='drafts'){if(proof.operation!=='draft_list')throw new Error('Draft review authority required');const rows=drafts.recent(c,5);receipt={count:rows.length};text=rows.length?`GM only. Withheld drafts, nothing was sent. Send one with /vc-gm publish-draft (source and fingerprint):\n${rows.map((d,i)=>`${i+1}) ${d.source} fingerprint ${d.fingerprint}: ${String(d.draft.text).slice(0,180)}`).join('\n').slice(0,1700)}`:'No withheld drafts yet.';}

      else if(r.kind==='reopen'){const reopened=setup.reopen(proof);receipt=reopened.receipt;text=`Session reopened with ${reopened.reopenedScenes.length} scene(s). Earlier withheld proofs stay withheld pending native review; nothing was announced.`;}
      else if(r.kind==='rebind'){if(proof.operation!=='pc_rebind')throw new Error('Rebinding authority required');receipt=registration.register(proof,characters,true);text='Control rebound to the repository owner in place. Resources, position and attendance were not changed; earlier controller proofs are invalid.';}
      else if(r.kind==='register'){if(proof.operation!=='pc_register')throw new Error('Registration authority required');receipt=registration.register(proof,characters);text='Character registered to its owner in the active scene. No resources, movement, proxy or attendance were set.';}
      else if(r.kind==='preview'){if(proof.operation!=='pc_bootstrap_preview')throw new Error('Preview authority required');const source=bootstrap.readSource(c,actor);receipt=source;text=`Review this before approving (private). ${describe(source)}. Approve with /vc-gm bootstrap-review using this character and the snapshotHash above. This grants no PC control.`;}
      else{
        if(proof.operation!=='pc_bootstrap_review')throw new Error('Review authority required');
        const {readSource,actionStore}=bootstrap;receipt=actionStore.initializePcFromReviewedSource(c,actor,{check:()=>gmAuthority.check(proof),readSource,inspectReview:()=>gmAuthority.bootstrapReview(proof,readSource(c,actor))});text='Reviewed PC state saved. Later damage and resources are unaffected by a replay.';
      }
      stage='receipt';interactionReceipts.complete(id,{id:`${r.kind}:${proof.sourceRef}`,hash:hash(receipt)},{check:bookkeeping});
      await reply(e,text,bookkeeping);return {handled:true,status:'committed'};
    }catch(error){
      report(error,id,stage);
      try{const row=interactionReceipts.read(id);if(row.ack==='claimed')interactionReceipts.acknowledge(id,'uncertain',{check:bookkeeping});const held=interactionReceipts.hold(id,closed?'closed':stage,{check:bookkeeping});if(!closed&&held.ack==='deferred'&&held.reply==='not_started')await reply(e,'This GM command was not confirmed and needs native review. Nothing was announced.',bookkeeping);}catch(storageError){report(storageError,id,'receipt');}
      return {handled:true,status:'native_review_required'};
    }
  }
  async function handle(e){const r=route(e);if(!r)return false;if(pending.has(e.id))return pending.get(e.id);const job=execute(e,r);pending.set(e.id,job);try{return await job;}finally{pending.delete(e.id);}}
  return Object.freeze({handle,claimsRoute:e=>route(e)!==null,close(){closed=true;controller.abort();}});
}
