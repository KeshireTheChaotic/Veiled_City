import {createHash} from 'node:crypto';
import {ChannelType,PermissionFlagsBits as P} from 'discord.js';
import {SESSION_ASSEMBLIES} from './session-occasions.js';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const assemblies=new Set(SESSION_ASSEMBLIES);
/** Native human operation authority, not PC control, canon or inference context.
 * check() validates a short-lived refreshed lease; it is not another Discord
 * fetch. Refresh immediately before use when crossing an asynchronous boundary.
 */
export function createDiscordGmAuthority({client,readPolicy,clock=()=>Date.now(),leaseMs=15000}){
  if(typeof client?.on!=='function'||typeof client?.off!=='function'||typeof client?.guilds?.fetch!=='function'||typeof readPolicy!=='function'||!Number.isSafeInteger(leaseMs)||leaseMs<1||leaseMs>30000)throw new TypeError('Native GM authority dependencies required');
  const observed=new WeakSet(),leases=new Map();let closed=false;const observer=e=>{if(e&&typeof e==='object')observed.add(e);};client.on('interactionCreate',observer);
  const membershipFingerprint=(member,channel)=>hash([member.id,member.guild.id,member.user.bot,[...member.roles.cache.keys()].sort(),String(member.permissions.bitfield),String(channel.permissionsFor(member)?.bitfield)]);
  function declaration(e){
    if(closed||!observed.has(e)||e.client!==client||e.isChatInputCommand?.()!==true||e.user?.bot!==false||![e.id,e.guildId,e.channelId,e.user.id].every(id)||!Number.isSafeInteger(e.createdTimestamp)||clock()-e.createdTimestamp>300000||e.createdTimestamp>clock()+5000)throw new Error('Recent observed human GM command required');
    const sub=e.options.getSubcommand(),group=e.commandName==='vc'?e.options.getSubcommandGroup(false):null;
    if((e.commandName==='vc-session'||e.commandName==='vc'&&group==='session')&&sub==='start'){
      const title=e.options.getString('title')??'',assembly=e.options.getString('assembly')??'auto';if(typeof title!=='string'||title.length>256||!assemblies.has(assembly))throw new Error('Native session title and assembly required');const payload={title,assembly};return {operation:'session_start',targetRef:`session:${hash([e.guildId,e.id])}`,snapshotHash:hash(payload),payload};
    }
    if((e.commandName==='vc-session'||e.commandName==='vc'&&group==='session')&&sub==='end'){const payload={};return {operation:'session_end',targetRef:`session-end:${hash([e.guildId,e.id])}`,snapshotHash:hash(payload),payload};}
    if((e.commandName==='vc-roll'||e.commandName==='vc'&&group==='roll')&&sub==='effect'){
      const raw=e.options.getString('json',true);if(typeof raw!=='string'||raw.length>4096)throw new Error('Bounded native GM review required');const input=JSON.parse(raw);
      if(input?.op==='channel-register'&&Object.keys(input).sort().join(',')==='actor,channel,op'&&id(input.actor)&&/^\d{5,25}$/.test(input.channel))return {operation:'channel_register',targetRef:input.actor,snapshotHash:hash(input)};
      if(input?.op==='draft-publish'&&Object.keys(input).sort().join(',')==='fingerprint,op,source'&&id(input.source)&&/^[a-f0-9]{64}$/.test(input.fingerprint))return {operation:'draft_publish',targetRef:input.source,snapshotHash:hash(input)};
      if(input?.op==='draft-list'&&Object.keys(input).join(',')==='op')return {operation:'draft_list',targetRef:'drafts',snapshotHash:hash(input)};
      if(input?.op==='session-reopen'&&Object.keys(input).sort().join(',')==='op,session'&&id(input.session)){const payload={session:input.session};return {operation:'session_reopen',targetRef:input.session,snapshotHash:hash(payload),payload};}
      if(input?.op==='pc-rebind'&&Object.keys(input).sort().join(',')==='actor,op'&&id(input.actor))return {operation:'pc_rebind',targetRef:input.actor,snapshotHash:hash(input)};
      if(input?.op==='pc-register'&&Object.keys(input).sort().join(',')==='actor,op'&&id(input.actor))return {operation:'pc_register',targetRef:input.actor,snapshotHash:hash(input)};
      if(input?.op==='pc-bootstrap-preview'&&Object.keys(input).sort().join(',')==='actor,op'&&id(input.actor))return {operation:'pc_bootstrap_preview',targetRef:input.actor,snapshotHash:hash(input)};
      if(input?.op==='pc-bootstrap-review'&&Object.keys(input).sort().join(',')==='actor,op,snapshotHash'&&id(input.actor)&&typeof input.snapshotHash==='string'&&/^[a-f0-9]{64}$/.test(input.snapshotHash))return {operation:'pc_bootstrap_review',targetRef:input.actor,snapshotHash:input.snapshotHash};
    }
    throw new Error('Supported explicit native human GM operation required');
  }
  function policyFor(campaignId){const p=structuredClone(readPolicy(campaignId));if(!p||Object.keys(p).sort().join(',')!=='allowAdministrators,campaignId,gmRoleId,gmUserIds,revision'||p.campaignId!==campaignId||!id(p.revision)||p.gmRoleId!==null&&!id(p.gmRoleId)||typeof p.allowAdministrators!=='boolean'||!Array.isArray(p.gmUserIds)||p.gmUserIds.length>1000||p.gmUserIds.some(u=>!id(u))||new Set(p.gmUserIds).size!==p.gmUserIds.length)throw new Error('Current native campaign GM policy required');return p;}
  async function authorize(e,{signal}={}){
    signal?.throwIfAborted();const d=declaration(e),policy=policyFor(e.guildId),identity={interactionId:e.id,campaignId:e.guildId,principal:e.user.id,channelId:e.channelId},signature=hash([identity,d,policy]);
    const current=()=>{signal?.throwIfAborted();if(hash([{interactionId:e.id,campaignId:e.guildId,principal:e.user.id,channelId:e.channelId},declaration(e),policyFor(identity.campaignId)])!==signature)throw new Error('GM declaration or campaign policy changed');};
    const guild=await client.guilds.fetch({guild:identity.campaignId,force:true});if(guild?.id!==identity.campaignId)throw new Error('Current GM guild required');
    const [member,roles,channel]=await Promise.all([guild.members.fetch({user:identity.principal,force:true}),guild.roles.fetch(),guild.channels.fetch(identity.channelId,{force:true})]);current();
    if(member?.id!==identity.principal||member.guild?.id!==identity.campaignId||member.user?.bot!==false||typeof member.roles?.cache?.keys!=='function'||typeof member.permissions?.has!=='function'||typeof roles?.has!=='function'||policy.gmRoleId!==null&&!roles.has(policy.gmRoleId)||channel?.id!==identity.channelId||channel.guildId!==identity.campaignId||channel.type!==ChannelType.GuildText)throw new Error('Fresh human GM membership and channel required');
    const permissions=channel.permissionsFor(member);if(permissions?.has?.(P.ViewChannel)!==true||permissions.has(P.SendMessages)!==true)throw new Error('Current GM command channel access required');
    const admin=member.permissions.has(P.Administrator)||member.permissions.has(P.ManageGuild),configured=policy.gmUserIds.includes(identity.principal)||Boolean(policy.gmRoleId&&member.roles.cache.has(policy.gmRoleId));
    if(!configured&&!(policy.allowAdministrators&&admin))throw new Error('Configured current human GM authority required');
    const proof={id:`native-gm:${hash([identity.campaignId,identity.interactionId])}`,kind:'native_human_gm_authority',role:'human_gm',...identity,operation:d.operation,targetRef:d.targetRef,snapshotHash:d.snapshotHash,sourceRef:`discord-gm:${hash([identity.campaignId,identity.interactionId])}`,sourceRevision:hash([identity,d,policy,[...member.roles.cache.keys()].sort(),String(member.permissions.bitfield),String(permissions.bitfield)]),expiresAt:clock()+leaseMs};
    for(const [key,value] of leases)if(value.proof.expiresAt<=clock())leases.delete(key);if(leases.size>=256)leases.delete(leases.keys().next().value);leases.set(proof.id,{proof:structuredClone(proof),event:e,signature,member,channel,roles,membership:membershipFingerprint(member,channel)});return Object.freeze(proof);
  }
  function check(proof){const entry=leases.get(proof?.id);if(closed||!entry||hash(entry.proof)!==hash(proof)||proof.expiresAt<=clock())throw new Error('Fresh native GM authorization lease required');const e=entry.event,p=policyFor(proof.campaignId);if(hash([{interactionId:e.id,campaignId:e.guildId,principal:e.user.id,channelId:e.channelId},declaration(e),p])!==entry.signature||membershipFingerprint(entry.member,entry.channel)!==entry.membership||p.gmRoleId!==null&&!entry.roles.has(p.gmRoleId))throw new Error('Native GM declaration, membership or policy revoked');return true;}
  async function refresh(proof,options){check(proof);return authorize(leases.get(proof.id).event,options);}
  function bootstrapReview(proof,source){check(proof);if(proof.operation!=='pc_bootstrap_review'||source?.kind!=='native_character_snapshot'||proof.campaignId!==source.campaignId||proof.targetRef!==source.actorId||proof.snapshotHash!==hash(source))throw new Error('Exact explicitly reviewed native PC snapshot required');return Object.freeze({id:proof.id,kind:'human_gm_pc_bootstrap_review',status:'approved',role:'human_gm',principal:proof.principal,campaignId:source.campaignId,actorId:source.actorId,ownerUserId:source.ownerUserId,controlRevision:source.controlRevision,snapshotHash:proof.snapshotHash,sourceRef:proof.sourceRef,sourceRevision:proof.sourceRevision});}
  return Object.freeze({authorize,check,refresh,bootstrapReview,readDeclaration(proof){check(proof);return structuredClone(declaration(leases.get(proof.id).event));},close(){closed=true;leases.clear();client.off('interactionCreate',observer);}});
}
