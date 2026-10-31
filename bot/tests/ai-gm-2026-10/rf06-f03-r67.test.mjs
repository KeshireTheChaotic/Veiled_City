import test from 'node:test';
import assert from 'node:assert/strict';
import {createGmNoticeReservationSource} from '../../src/frameworks/publication/public.js';
import {createNativeGmNoticeReservationConsumer} from '../../src/frameworks/daggerheart/public.js';

test('fixed Native–Publication reservation ports preserve exact synchronous forwarding',()=>{
 const source=createGmNoticeReservationSource(),consumer=createNativeGmNoticeReservationConsumer();
 assert.throws(()=>consumer.reserveGmArbitrationNotice({},'guild','decision'),error=>error.code==='NATIVE_GM_NOTICE_RESERVATION_COMPOSITION');
 const args=[{},'qualified-guild','qualified-decision'],receipt=Object.freeze({status:'queued'});
 let actual;
 const failure=Object.assign(new Error('original publication failure'),{code:'ORIGINAL_RESERVATION_FAILURE'});
 const original=(...values)=>{actual=values;if(values[2]==='throws')throw failure;return receipt;};
 source.bind({reserveGmArbitrationNotice:original});
 consumer.bind({reserveGmArbitrationNotice:source.reserveGmArbitrationNotice});
 assert.equal(consumer.reserveGmArbitrationNotice(...args),receipt);
 assert.deepEqual(actual,args);
 assert.throws(()=>consumer.reserveGmArbitrationNotice({},'qualified-guild','throws'),error=>error===failure);
 assert.throws(()=>source.bind({reserveGmArbitrationNotice:()=>null}),/replacement forbidden/);
 assert.throws(()=>consumer.bind({reserveGmArbitrationNotice:()=>null}),/replacement forbidden/);
});
