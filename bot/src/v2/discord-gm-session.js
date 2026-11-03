import {createHash} from 'node:crypto';
import {MessageFlags} from 'discord.js';
import {createNativeSessionSetup} from './native-session-setup.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Routes observed human GM commands: `session start`, private `pc-bootstrap-preview`
 * exact `pc-bootstrap-review` and `session end`. Each uses a private acknowledgement, a durable closed
 * claim, fresh GM authority and a fixed native effect. Nothing is published to the table
 * and nothing is retried after an uncertain effect or reply.
 * `bootstrap` ({readSource, actionStore}) is optional; without it those ops are not claimed.
 */
export function createDiscordGmSession({client,sceneStore,gmAuthority,interactionReceipts,bootstrap=null,characters=null,onError=()=>{}}){
  if(typeof client?.on!=='function'||typeof interactionReceipts?.claim!=='function'||typeof gmAuthority?.authorize!=='function'||bootstrap&&(typeof bootstrap.readSource!=='function'||typeof bootstrap.actionStore?.initializePcFromReviewedSource!=='function')||characters&&typeof characters.getCharacter!=='function')throw new TypeError('Native GM session dependencies required');
  const setup=createNativeSessionSetup({sceneStore,gmAuthority}),pending=new Map(),controller=new AbortController();let closed=false;
  const report=(error,id,stage)=>{try{onError(error,{interactionId:id,stage});}catch{}};
  const inRoll=e=>e.commandName==='vc-roll'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='roll';
  /** Returns {kind, ref} for a claimed GM command, else null. */
  function route(e){
    try{
      if(e?.isChatInputCommand?.()!==true)return null;
      if(e.commandName==='vc-session'||e.commandName==='vc'&&e.options.getSubcommandGroup(false)==='session'){const sub=e.options.getSubcommand();if(sub==='start')return {kind:'session',ref:'session-start',raw:[e.options.getString('title')??'',e.options.getString('assembly')??'auto']};if(sub==='end')return {kind:'end',ref:'session-end',raw:[]};}
      if((bootstrap||characters)&&inRoll(e)&&e.options.getSubcommand()==='effect'){
        const raw=e.options.getString('json',true);if(typeof raw!=='string'||raw.length>4096)return null;const input=JSON.parse(raw);
        if(characters&&input?.op==='pc-register')return {kind:'register',ref:`pc-register:${input.actor}`,raw};
        if(!bootstrap)return null;
        if(input?.op==='pc-bootstrap-preview'||input?.op==='pc-bootstrap-review')return {kind:input.op==='pc-bootstrap-preview'?'preview':'review',ref:`${input.op}:${input.actor}`,raw};
      }
    }catch{}
    return null;
  }
  async function reply(e,content,check){const id=e.id;interactionReceipts.claimReply(id,{check});try{await e.editReply({content,allowedMentions:{parse:[]}});interactionReceipts.finishReply(id,'delivered',{check});}catch(error){interactionReceipts.finishReply(id,'uncertain',{check});report(error,id,'reply');}}
  const describe=s=>`PC ${s.actorId} (owner ${s.ownerUserId}), level ${s.level}: HP ${s.hp.current}/${s.hp.max}, Armor ${s.armorSlots.current}/${s.armorSlots.max}, Stress ${s.stress.current}/${s.stress.max}, Hope ${s.hope}/${s.hopeCap}. snapshotHash ${hash(s)}`;
  /** Registers an existing native character to its repository owner in the sole active scene.
   * Rebinding or replacing an existing registration is refused here and needs native review.
   */
  function register(proof,repository){
    const c=proof.campaignId,actorId=proof.targetRef,character=repository.getCharacter(actorId);
    const check=()=>{
      gmAuthority.check(proof);const sessions=sceneStore.activeSessions(c),scenes=sessions.length===1?sceneStore.activeScenes(c,sessions[0].id):[];
      if(sessions.length!==1||scenes.length!==1)throw new Error('Exactly one active scene required to register a character');
      if(character?.id!==actorId||character.guild_id!==c||typeof character.owner_user_id!=='string'||!character.owner_user_id||!['active','reserve','guest'].includes(character.status)||repository.getCharacter(actorId)?.owner_user_id!==character.owner_user_id)throw new Error('Native character with a registered owner required');
      const existing=sceneStore.readers.readActor(c,actorId);if(existing&&existing.status==='active'&&!(existing.sceneId===scenes[0].id&&existing.ownerUserId===character.owner_user_id&&existing.controlRole==='owner'))throw new Error('Existing character registration requires native review');
      return scenes[0];
    };
    const scene=check();
    return sceneStore.commitSnapshot({campaignId:c,principal:proof.principal,sourceRef:`pc-register:${proof.sourceRef}`,records:[{kind:'actor',data:{id:actorId,campaignId:c,sceneId:scene.id,kind:'pc',status:'active',ownerUserId:character.owner_user_id,controllerUserId:character.owner_user_id,controlRole:'owner'},expectedRevision:null}]},{check});
  }
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
      else if(r.kind==='register'){if(proof.operation!=='pc_register')throw new Error('Registration authority required');receipt=register(proof,characters);text='Character registered to its owner in the active scene. No resources, movement, proxy or attendance were set.';}
      else if(r.kind==='preview'){if(proof.operation!=='pc_bootstrap_preview')throw new Error('Preview authority required');const source=bootstrap.readSource(c,actor);receipt=source;text=`Review this before approving (private). ${describe(source)}. Approve with op pc-bootstrap-review, actor and that snapshotHash. This grants no PC control.`;}
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
