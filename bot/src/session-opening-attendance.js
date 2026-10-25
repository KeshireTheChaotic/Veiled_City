/** Original World-source composition; adapter adoption remains RF04-F05. */
import {createOpeningAttendance} from './frameworks/session/public.js';
import {indexWorldEvent} from './city-calendar.js';
const attendance=createOpeningAttendance({indexWorldEvent:(...args)=>indexWorldEvent(...args)});
export function registerOpeningAttendance(...args){return attendance.registerOpeningAttendance(...args);}
export function carryOpeningAttendance(...args){return attendance.carryOpeningAttendance(...args);}
export function inspectOpeningEntryOpportunity(...args){return attendance.inspectOpeningEntryOpportunity(...args);}
export function prepareOpeningEntryOpportunity(...args){return attendance.prepareOpeningEntryOpportunity(...args);}
