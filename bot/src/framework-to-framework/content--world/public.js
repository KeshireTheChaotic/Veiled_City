import {contentWorldSource} from '../../frameworks/content/public.js';
import {requireCitySource,cityObject,cityKey,cityAudit,indexWorldEvent} from '../../frameworks/world/public.js';
export function connectContentWorldSource(){return contentWorldSource.bind({requireCitySource,cityObject,cityKey,cityAudit,indexWorldEvent});}

import {contentWorldSeedDrafts} from '../../frameworks/content/public.js';
import {addSeedDraft,reviewSeedDraft} from '../../frameworks/world/public.js';
export function connectContentWorldSeedDrafts(){return contentWorldSeedDrafts.bind({addSeedDraft,reviewSeedDraft});}
