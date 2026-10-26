/** Original World capabilities for NPC subjective evidence and goal lifecycle; no copied native policy. */
export function createNpcWorldMotivationConsumer(){
 let source=null;const keys=["cityObject","cityKey","cityInteger","cityAudit","requireCitySource","activeCityProxy","assertNpcAvailability","assertWorldActorControl","nativeWorldOperationAllows","nativeWorldCoordinatorReady","inspectWorldInformationTransfer"];
 const current=()=>{if(!source)throw Object.assign(new Error('NPC World motivation sources have not been composed.'),{code:'NPC_WORLD_MOTIVATION_COMPOSITION'});return source;};
 return Object.freeze({bind(native){if(keys.some(k=>typeof native?.[k]!=='function'))throw new TypeError('Complete native World motivation functions required.');if(source&&keys.some(k=>source[k]!==native[k]))throw new Error('NPC World motivation source replacement forbidden.');source=Object.freeze(Object.fromEntries(keys.map(k=>[k,native[k]])));return this;},
 cityObject(...args){return current().cityObject(...args);},
 cityKey(...args){return current().cityKey(...args);},
 cityInteger(...args){return current().cityInteger(...args);},
 cityAudit(...args){return current().cityAudit(...args);},
 requireCitySource(...args){return current().requireCitySource(...args);},
 activeCityProxy(...args){return current().activeCityProxy(...args);},
 assertNpcAvailability(...args){return current().assertNpcAvailability(...args);},
 assertWorldActorControl(...args){return current().assertWorldActorControl(...args);},
 nativeWorldOperationAllows(...args){return current().nativeWorldOperationAllows(...args);},
 nativeWorldCoordinatorReady(...args){return current().nativeWorldCoordinatorReady(...args);},
 inspectWorldInformationTransfer(...args){return current().inspectWorldInformationTransfer(...args);}
 });
}
export const npcWorldMotivation=createNpcWorldMotivationConsumer();
