/** Session receipt composition through its fixed native World event consumer. */
import {createOpeningAttendance,sessionWorldEvents} from './frameworks/session/public.js';
const attendance=createOpeningAttendance({indexWorldEvent:(...args)=>sessionWorldEvents.indexWorldEvent(...args)});
export function registerOpeningAttendance(...args){return attendance.registerOpeningAttendance(...args);}
export function carryOpeningAttendance(...args){return attendance.carryOpeningAttendance(...args);}
export function inspectOpeningEntryOpportunity(...args){return attendance.inspectOpeningEntryOpportunity(...args);}
export function prepareOpeningEntryOpportunity(...args){return attendance.prepareOpeningEntryOpportunity(...args);}
