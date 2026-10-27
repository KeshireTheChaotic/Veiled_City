import {createFunctionPort} from '../../../kernel/function-port.js';

/** Knowledge reads a current World record; the World source retains the rule. */
export const knowledgeWorldRecord=createFunctionPort(['requireCityRecord'],{
 code:'KNOWLEDGE_WORLD_RECORD_COMPOSITION',label:'Knowledge World record source'
});
