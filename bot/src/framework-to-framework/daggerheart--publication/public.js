import {createMechanicalOutcomeProjection} from '../../frameworks/daggerheart/public.js';
import {createNativeOutcomeConsumer} from '../../frameworks/publication/public.js';
/** Exact committed mechanical receipts flow to publication; no rules copied or third framework imported. */
export function connectNativeOutcomes({capabilities,consumer=createNativeOutcomeConsumer()}){return consumer.bind(createMechanicalOutcomeProjection({capabilities}));}

import {publicationNativeFear} from '../../frameworks/publication/public.js';
import {renderFearEffect,validateFearEffect} from '../../frameworks/daggerheart/public.js';
export function connectPublicationNativeFear(){return publicationNativeFear.bind({renderFearEffect,validateFearEffect});}
