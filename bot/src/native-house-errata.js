/** Immutable source loading and capability wiring for native owner errata. */
import fs from 'node:fs';
import {compileNativeFeatures,nativeFeatureRuleContext} from './frameworks/daggerheart/public.js';
import {jsonHash as hash} from './kernel/json-hash.js';
import {arbitrationFailure as fail} from './gm-arbitration-contract.js';
import {createNativeHouseErrata} from './frameworks/daggerheart/house-errata.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const data=freeze(JSON.parse(fs.readFileSync(new URL('./frameworks/daggerheart/native-house-errata.json',import.meta.url),'utf8')));
const signal=fs.readFileSync(new URL('../../content/CARDS/DOMAINS/SIGNAL.md',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const native=createNativeHouseErrata({data,signal,compileNativeFeatures,nativeFeatureRuleContext,hash,fail});
export const {compileNativeHouseErrata,nativeHouseErratum,nativeFeatureReviewContract}=native;
