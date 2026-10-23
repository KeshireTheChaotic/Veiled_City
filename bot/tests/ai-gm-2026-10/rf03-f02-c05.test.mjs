import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDeviceUseIssue} from '../../src/frameworks/daggerheart/device-use-eligibility.js';

const pc=inventory=>({data:{inventory}});
const use=(operation='use_device',type='interact',target='device:lamp')=>({data:{type,operation,target_key:target}});

test('disabled electronic device keeps the existing reset-required hold',()=>{
  assert.equal(nativeDeviceUseIssue(pc([{id:'device:lamp',disabled_by:'effect:jammed'}]),use()),'NATIVE_DEVICE_RESET_REQUIRED');
});

test('usable or absent device does not add a hold',()=>{
  assert.equal(nativeDeviceUseIssue(pc([{id:'device:lamp'}]),use()),null);
  assert.equal(nativeDeviceUseIssue(pc([]),use()),null);
  assert.equal(nativeDeviceUseIssue(null,use()),null);
});

test('other PC interactions bypass the device-specific rule',()=>{
  const disabled=pc([{id:'device:lamp',disabled_by:'effect:jammed'}]);
  assert.equal(nativeDeviceUseIssue(disabled,use('inspect')) ,null);
  assert.equal(nativeDeviceUseIssue(disabled,use('use_device','move')),null);
  assert.equal(nativeDeviceUseIssue(disabled,use('use_device','interact','device:other')),null);
});
