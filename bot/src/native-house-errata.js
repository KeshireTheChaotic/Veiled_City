/** Immutable source loading and capability wiring for native owner errata. */
import fs from 'node:fs';
import {compileNativeFeatures,nativeFeatureRuleContext} from './native-feature-catalog.js';
import {sceneFictionHash as hash} from './scene-fiction-context.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createNativeHouseErrata} from './frameworks/daggerheart/public.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const data=freeze(JSON.parse(fs.readFileSync(new URL('./native-house-errata.json',import.meta.url),'utf8')));
const signal=fs.readFileSync(new URL('../../content/CARDS/DOMAINS/SIGNAL.md',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const native=createNativeHouseErrata({data,signal,compileNativeFeatures,nativeFeatureRuleContext,hash,fail});
export const {compileNativeHouseErrata,nativeHouseErratum,nativeFeatureReviewContract}=native;
