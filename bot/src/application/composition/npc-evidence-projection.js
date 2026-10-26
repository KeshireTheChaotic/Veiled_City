import {connectNpcNarrativeVisibility} from '../../framework-to-framework/narrative--npc/public.js';
import {connectNpcSessionPrincipal} from '../../framework-to-framework/npc--session/public.js';
import {connectNpcWorldEvidenceEvent} from '../../framework-to-framework/npc--world/public.js';
/** Compose after original Narrative registration, before services; no database/provider work. */
export function initializeNpcEvidenceProjection(){connectNpcSessionPrincipal();connectNpcWorldEvidenceEvent();return connectNpcNarrativeVisibility();}
