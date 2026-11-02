import {createHash} from 'node:crypto';
const hash=text=>createHash('sha256').update(text).digest('hex');
/** Read-only adapter over committed private import/review storage. Deliberately
 * marks even public/party canon GM-private: approval is not audience delivery.
 * Native planning policy still explicitly authorizes each reference.
 */
export function createPrivatePlanningRepository(store){
  if(typeof store?.readPlanningRecord!=='function')throw new TypeError('Committed private planning store required');
  function read(campaign,ref){
    const row=store.readPlanningRecord(campaign,ref);if(!row)return null;
    const body=JSON.stringify(row.value),contentHash=hash(body);
    if(body.length>16000)throw new Error('Private planning record exceeds context bound');
    return {metadata:{id:ref,campaignId:campaign,revision:String(row.revision),status:'active',kind:row.kind,scope:'campaign',sceneId:null,
      visibility:'gm',disclosure:'private',recipientIds:[],knownBy:[],sourceRefs:[],contentHash},body};
  }
  return Object.freeze({
    metadata(campaign,ref){return read(campaign,ref)?.metadata??null;},
    readText(campaign,ref,revision){const row=read(campaign,ref);return row&&row.metadata.revision===revision?{revision,text:row.body}:null;}
  });
}
