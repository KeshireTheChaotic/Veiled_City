import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const nonempty=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const strings=value=>Array.isArray(value)&&value.length>0&&value.every(nonempty)&&new Set(value).size===value.length;
const fail=()=>{throw new Error('Current authenticated scene source required');};

/**
 * Native gateway only: event.userId must come from the authenticated transport,
 * never a model tool or player JSON. Readers return current server-owned records.
 * This authorizes conversation/control, not consent, spending or successful effects.
 */
export function createSourceAuthority({readMessage,readSession,readScene,readActor,readChannel,sourceRegistry=null}){
  if([readMessage,readSession,readScene,readActor,readChannel].some(fn=>typeof fn!=='function'))throw new TypeError('Complete current native readers required');
  const issued=new Map();
  if(sourceRegistry!==null&&(typeof sourceRegistry.get!=='function'||typeof sourceRegistry.put!=='function'))throw new TypeError('Native source registry required');
  const getIssued=id=>issued.get(id)??sourceRegistry?.get(id);
  function inspect(event){
    if(!event||Object.keys(event).sort().join(',')!=='actorId,campaignId,messageId,userId'
      ||!Object.values(event).every(nonempty))fail();
    const message=readMessage(event.campaignId,event.messageId);
    if(!message||message.id!==event.messageId||message.campaignId!==event.campaignId||message.userId!==event.userId
      ||message.deleted!==false||!nonempty(message.revision)||!nonempty(message.channelId)
      ||typeof message.text!=='string'||!message.text.trim()||message.text.length>16000)fail();
    const channel=readChannel(event.campaignId,message.channelId);
    if(!channel||channel.id!==message.channelId||channel.campaignId!==event.campaignId||channel.permissionsVerified!==true
      ||!['party','private'].includes(channel.kind)||!nonempty(channel.revision)||!nonempty(channel.sceneId)
      ||!strings(channel.recipientIds)||!strings(channel.writerIds)||!channel.writerIds.includes(event.userId)
      ||!channel.recipientIds.includes(event.userId))fail();
    if(channel.kind==='private'&&(channel.ownerUserId!==event.userId||channel.recipientIds.length!==1||channel.recipientIds[0]!==event.userId))fail();
    const scene=readScene(event.campaignId,channel.sceneId);
    if(!scene||scene.id!==channel.sceneId||scene.campaignId!==event.campaignId||scene.status!=='active'
      ||!nonempty(scene.sessionId)||!nonempty(scene.revision)||!Array.isArray(scene.participants))fail();
    const session=readSession(event.campaignId,scene.sessionId);
    if(!session||session.id!==scene.sessionId||session.campaignId!==event.campaignId||session.status!=='active'||!nonempty(session.revision))fail();
    const actor=readActor(event.campaignId,event.actorId);
    if(!actor||actor.id!==event.actorId||actor.campaignId!==event.campaignId||actor.sceneId!==scene.id||actor.status!=='active'
      ||!['pc','npc'].includes(actor.kind)||!nonempty(actor.controlRevision)||actor.controllerUserId!==event.userId
      ||!['owner','proxy'].includes(actor.controlRole))fail();
    if(actor.controlRole==='owner'&&(actor.kind!=='pc'||actor.ownerUserId!==event.userId))fail();
    if(actor.controlRole==='proxy'&&(actor.proxyAuthorized!==true||!nonempty(actor.delegationRef)))fail();
    const assignment=scene.participants.filter(p=>p.userId===event.userId&&p.actorId===event.actorId);
    if(assignment.length!==1||!['present','late','guest'].includes(assignment[0].presence))fail();
    const recipients=[...channel.recipientIds].sort();
    const revision=digest([message.revision,channel.id,channel.revision,channel.kind,recipients,[...channel.writerIds].sort(),
      channel.ownerUserId??null,scene.id,scene.revision,session.id,session.revision,actor.id,actor.kind,actor.controlRole,
      actor.controllerUserId,actor.ownerUserId??null,actor.controlRevision,actor.delegationRef??null,assignment[0].presence]);
    const proof={id:`source:${digest([event.campaignId,event.messageId,event.actorId])}`,principal:event.userId,
      campaign:event.campaignId,scene:scene.id,revision,actors:[actor.id],recipients,text:message.text};
    return {proof,control:{actorId:actor.id,role:actor.controlRole,kind:actor.kind,delegationRef:actor.delegationRef??null}};
  }
  function authenticate(event){
    const {proof,control}=inspect(event),prior=getIssued(proof.id);
    if(prior&&prior.fingerprint!==digest(proof))fail();
    if(!prior){const entry={event:structuredClone(event),fingerprint:digest(proof),control:Object.freeze(control)};sourceRegistry?.put(proof.id,entry);issued.set(proof.id,entry);}
    return structuredClone(proof);
  }
  function revalidate(source){
    try{
      const prior=getIssued(source?.id);
      if(!prior)return false;
      const {proof}=inspect(prior.event);
      return digest(proof)===prior.fingerprint&&Object.keys(proof).every(key=>JSON.stringify(proof[key])===JSON.stringify(source[key]));
    }catch{return false;}
  }
  return Object.freeze({authenticate,revalidate,eventForReference(ref){
    const prior=getIssued(ref);if(!prior)fail();const {proof}=inspect(prior.event);if(digest(proof)!==prior.fingerprint)fail();return structuredClone(prior.event);
  },inspectReference(ref,revision){
    const prior=getIssued(ref);if(!prior)fail();const {proof}=inspect(prior.event);
    if(proof.revision!==revision||digest(proof)!==prior.fingerprint)fail();return structuredClone(proof);
  },inspectControl(source){
    if(!revalidate(source))fail();return Object.freeze(structuredClone(getIssued(source.id).control));
  }});
}
