import {createFunctionPort} from '../../../kernel/function-port.js';
/** Native original Fear effect validation, provided at load by pvp-fear-moves.js; native rules keep every check. */
export const nativeFearEffectSource=createFunctionPort(['validateFearEffect'],{code:'NATIVE_FEAR_EFFECT_SOURCE_COMPOSITION',label:'Native Fear effect source'});