import {hopeCap} from './pc-resources.js';
/** Pinned native death eligibility; feature-specific mappings remain required. */
export function assertDeathEligibility(snapshot,move){
  const data=snapshot.data,r=data?.resources;
  if(!Number.isSafeInteger(r?.hp?.max)||r.hp.max<1||r.hp.max>12||r.hp.current!==r.hp.max||!Number.isSafeInteger(r.stress?.current)||!Number.isSafeInteger(r.stress?.max)||r.stress.max<1||r.stress.current<0||r.stress.current>r.stress.max||!Number.isSafeInteger(data.level)||data.level<1||data.level>10||hopeCap(data)<1||!Number.isSafeInteger(r.hope)||r.hope<0||r.hope>hopeCap(data))throw new Error('Verified final HP, Stress, level and Hope slots required before native death dice');
  const sources=[...(data.inventory||[]),...(data.domain_cards||[]),...(data.features||[]),...(data.transformations||[]),data.transformation].filter(v=>v&&(typeof v==='string'||v.active!==false&&v.equipped!==false));
  const special=new Set(['Hallowed Heroplate','Reliquary of the Sightless Saint','Won’t Stay Dead',"Won't Stay Dead",'Reanimated']);
  if(sources.some(v=>typeof v==='object'&&v.death_move||move==='risk_it_all'&&special.has(typeof v==='string'?v:v.name)))throw new Error('Owned death feature requires a supported native mapping/review before dice');
}
