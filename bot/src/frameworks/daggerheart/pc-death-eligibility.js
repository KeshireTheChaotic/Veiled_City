/** Daggerheart final-HP and owner-held death-feature eligibility; no state access or outcome authority. */
import {hopeCap} from './pc-resources.js';

export function createPcDeathEligibility({fail}){
  if(typeof fail!=='function')throw new TypeError('PC death eligibility requires its established failure constructor.');

  function assertFinalHp(pc){
    const r=pc.data.resources;
    if(!Number.isSafeInteger(r?.hp?.max)||r.hp.max<1||r.hp.max>12||r.hp.current!==r.hp.max||!Number.isSafeInteger(r.stress?.current)
      ||!Number.isSafeInteger(r.stress?.max)||r.stress.max<1||r.stress.current<0||r.stress.current>r.stress.max
      ||!Number.isSafeInteger(pc.data.level)||pc.data.level<1||pc.data.level>10||hopeCap(pc.data)<1
      ||!Number.isSafeInteger(r.hope)||r.hope<0||r.hope>hopeCap(pc.data))fail('Verified final HP, Stress, level and Hope slots required before native death dice.');
  }

  function assertDeathMapping(pc,move){
    const sources=[...(pc.data.inventory||[]),...(pc.data.domain_cards||[]),...(pc.data.features||[]),...(pc.data.transformations||[]),pc.data.transformation]
      .filter(v=>v&&(typeof v==='string'||v.active!==false&&v.equipped!==false));
    const special=new Set(['Hallowed Heroplate','Reliquary of the Sightless Saint','Won’t Stay Dead',"Won't Stay Dead",'Reanimated']);
    if(sources.some(v=>typeof v==='object'&&v.death_move||move==='risk_it_all'&&special.has(typeof v==='string'?v:v.name)))
      fail('Owned death feature requires a supported native mapping/review before dice; vanilla options are not silently discarded.');
  }

  return Object.freeze({assertFinalHp,assertDeathMapping});
}
