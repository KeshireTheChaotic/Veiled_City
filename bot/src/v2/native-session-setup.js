import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Fixed native creation from an observed human declaration. Opening is a scene
 * occasion only; owner registration/attendance and fictional position stay separate.
 */
export function createNativeSessionSetup({sceneStore,gmAuthority}){
  if(typeof sceneStore?.activeSessions!=='function'||typeof sceneStore?.commitSnapshot!=='function'||typeof gmAuthority?.check!=='function'||typeof gmAuthority?.readDeclaration!=='function')throw new TypeError('Native session store and human GM authority required');
  function start(proof){
    const declaration=gmAuthority.readDeclaration(proof);
    if(proof?.kind!=='native_human_gm_authority'||proof.role!=='human_gm'||proof.operation!=='session_start'||declaration.operation!=='session_start'||declaration.targetRef!==proof.targetRef||hash(declaration.payload)!==proof.snapshotHash||declaration.snapshotHash!==proof.snapshotHash)throw new Error('Exact observed human session-start declaration required');
    const campaignId=proof.campaignId,sessionId=proof.targetRef,sceneId=`${sessionId}:opening`,session={id:sessionId,campaignId,status:'active',title:declaration.payload.title,assembly:declaration.payload.assembly,setup:{interactionId:proof.interactionId,principal:proof.principal,sourceRef:proof.sourceRef,sourceRevision:proof.sourceRevision,snapshotHash:proof.snapshotHash}},scene={id:sceneId,campaignId,sessionId,status:'active',participants:[]};
    const check=()=>{gmAuthority.check(proof);if(hash(gmAuthority.readDeclaration(proof))!==hash(declaration))throw new Error('Native session declaration changed');const active=sceneStore.activeSessions(campaignId),own=sceneStore.readers.readSession(campaignId,sessionId);if(active.length>1||!own&&active.length)throw new Error('Existing active session requires native lifecycle review');};
    const receipt=sceneStore.commitSnapshot({campaignId,principal:proof.principal,sourceRef:`session-start:${proof.sourceRef}`,records:[{kind:'session',data:session,expectedRevision:null},{kind:'scene',data:scene,expectedRevision:null}]},{check});
    return {session:sceneStore.readers.readSession(campaignId,sessionId),scene:sceneStore.readers.readScene(campaignId,sceneId),receipt};
  }
  /** Ends the single active session and closes its active scenes in one transaction.
   * Nothing is deleted: pending actions, rolls and prompts stay in their own stores, and
   * closing the scenes only withholds proofs bound to them until a native review.
   */
  function end(proof){
    const declaration=gmAuthority.readDeclaration(proof);
    if(proof?.kind!=='native_human_gm_authority'||proof.role!=='human_gm'||proof.operation!=='session_end'||declaration.operation!=='session_end'||declaration.targetRef!==proof.targetRef||declaration.snapshotHash!==proof.snapshotHash)throw new Error('Exact observed human session-end declaration required');
    const campaignId=proof.campaignId,strip=({revision,...data})=>data;let active;
    const check=()=>{gmAuthority.check(proof);if(hash(gmAuthority.readDeclaration(proof))!==hash(declaration))throw new Error('Native session declaration changed');active=sceneStore.activeSessions(campaignId);if(target?sceneStore.readers.readSession(campaignId,target.id)?.status!=='ended'&&(active.length!==1||active[0].id!==target.id):active.length!==1)throw new Error('Exactly one active session required to end');};
    let target=null;check();const session=active[0];target=session;const scenes=sceneStore.activeScenes(campaignId,session.id);
    const receipt=sceneStore.commitSnapshot({campaignId,principal:proof.principal,sourceRef:`session-end:${proof.sourceRef}`,records:[{kind:'session',data:{...strip(session),status:'ended'},expectedRevision:Number(session.revision)},...scenes.map(s=>({kind:'scene',data:{id:s.id,campaignId:s.campaignId,sessionId:s.sessionId,status:'closed',participants:s.participants},expectedRevision:Number(s.revision)}))]},{check});
    return {session:sceneStore.readers.readSession(campaignId,session.id),closedScenes:scenes.map(s=>s.id),receipt};
  }
  return Object.freeze({start,end});
}
