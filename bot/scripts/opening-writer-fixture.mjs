/** Deterministic replacement provider only; uses the real native v9 authoring path. */
import {GMService} from '../src/gm.js';
export function withOpeningWriter(f,planner={}){
  const service=Object.create(GMService.prototype);service.db=f.db;
  service.config={gmTurnDeadlineMs:5000,assemblyModel:'offline',assemblyMaxOutputTokens:2000};
  service.generateNarrative=async(_guild,packet)=>{
    const sources=packet.assembly_brief?.sources||[],own=sources.map(s=>s.text).join(' ');
    const text=!packet.audience.subject_key?'A rain-streaked noticeboard carries maintenance listings and route-change notices. A service window is open for questions.'
      :/telemetry|invoice/i.test(own)?'A network maintenance listing has a contact number beside a late invoice enquiry notice.'
      :/route|bus card/i.test(own)?'A route-change notice offers an inquiry number beside a sketch of a shifting station entrance.'
      :'A sheltered service window is open for questions. A noticeboard nearby offers local enquiries and optional work listings.';
    return {version:9,acts:[{id:'opening',task_id:packet.audience_v9.task_ids[0],kind:'scene_description',speaker_key:'',
      location_key:packet.place.key,text,source_refs:[]}],fiction_delta:[]};
  };
  return Object.assign(planner,{authorAssemblyScene:(...args)=>{service.db=f.db;return service.authorAssemblyScene(...args);},
    authorOpeningEntry:(...args)=>{service.db=f.db;return service.authorOpeningEntry(...args);}});
}
