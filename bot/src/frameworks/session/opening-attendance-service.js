import {createOpeningAttendance} from './opening-attendance.js';
import {sessionWorldEvents} from './contracts/world-events.js';
import {sessionOpeningAttendanceSource} from './contracts/opening-sources.js';

const attendance=createOpeningAttendance({indexWorldEvent:(...args)=>sessionWorldEvents.indexWorldEvent(...args)});

export function registerOpeningAttendance(...args){return attendance.registerOpeningAttendance(...args);}
export function carryOpeningAttendance(...args){return attendance.carryOpeningAttendance(...args);}
export function inspectOpeningEntryOpportunity(...args){return attendance.inspectOpeningEntryOpportunity(...args);}
export function prepareOpeningEntryOpportunity(...args){return attendance.prepareOpeningEntryOpportunity(...args);}

sessionOpeningAttendanceSource.bind({inspectOpeningEntryOpportunity});
