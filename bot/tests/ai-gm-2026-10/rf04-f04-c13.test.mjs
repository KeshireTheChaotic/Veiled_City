import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as cohortRunner from '../../src/opening-cohort-runner.js';
import * as openingEntry from '../../src/opening-entry.js';
import * as recovery from '../../src/session-opening-recovery.js';
import * as openingRunner from '../../src/session-opening-runner.js';

const source=file=>readFile(new URL(`../../src/${file}`,import.meta.url),'utf8');

test('owning public APIs and compatibility readers retain the expected exports',async()=>{
  const [worldApi,sessionApi,operationsApi,calendarCompat,entryCompat,metricsCompat]=await Promise.all([
    source('frameworks/world/public.js'),source('frameworks/session/public.js'),source('frameworks/operations/public.js'),
    source('city-calendar.js'),source('opening-entry-evidence.js'),source('operational-metrics.js'),
  ]);
  assert.match(worldApi,/indexWorldEvent/);
  assert.match(sessionApi,/opening-entry-evidence\.js/);
  assert.match(operationsApi,/operational-metrics\.js/);
  assert.match(calendarCompat,/frameworks\/world\/public\.js/);
  assert.match(entryCompat,/frameworks\/session\/opening-entry-evidence\.js/);
  assert.match(metricsCompat,/frameworks\/operations\/operational-metrics\.js/);
});

test('the four Session-opening workflows load with their existing exports',()=>{
  for(const [name,module] of Object.entries({cohortRunner,openingEntry,recovery,openingRunner}))
    assert.ok(Object.keys(module).length>0,`${name} exports`);
});

test('changed imports use World, Session and Operations public APIs only',async()=>{
  const expectations={
    'opening-cohort-runner.js':[[/indexWorldEvent\}\s*from\s*'\.\/frameworks\/world\/public\.js'/,/from\s*'\.\/city-calendar\.js'/],[/operationalMetrics\}\s*from\s*'\.\/frameworks\/operations\/public\.js'/,/from\s*'\.\/operational-metrics\.js'/]],
    'opening-entry.js':[[/openingEntryAuthoringCode\}\s*from\s*'\.\/frameworks\/session\/public\.js'/,/from\s*'\.\/opening-entry-evidence\.js'/]],
    'session-opening-recovery.js':[[/indexWorldEvent\}\s*from\s*'\.\/frameworks\/world\/public\.js'/,/from\s*'\.\/city-calendar\.js'/]],
    'session-opening-runner.js':[[/operationalMetrics\}\s*from\s*'\.\/frameworks\/operations\/public\.js'/,/from\s*'\.\/operational-metrics\.js'/]],
  };
  for(const [file,checks] of Object.entries(expectations)){
    const text=await source(file);
    for(const [present,absent] of checks){assert.match(text,present,file);assert.doesNotMatch(text,absent,file);}
  }
});
