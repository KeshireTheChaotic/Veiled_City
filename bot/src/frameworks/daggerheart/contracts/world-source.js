import {createFunctionPort} from '../../../kernel/function-port.js';

/** Native consent reads World's current source without changing its authority. */
export const nativeWorldSource=createFunctionPort(['requireCitySource'],{
 code:'NATIVE_WORLD_SOURCE_COMPOSITION',label:'Native World source'
});
