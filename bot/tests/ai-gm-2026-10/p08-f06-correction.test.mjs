import test from 'node:test';
import assert from 'node:assert/strict';
import {openingCohortStatus} from '../../src/opening-cohort-runner.js';
import {disposableCampaign} from './p08-correction-fixture.mjs';

test('acknowledged cohort status does not claim dramatic fulfillment',()=>{
  const {db,close}=disposableCampaign();
  try{
    db.startSession('guild-correction','coverage','auto');
    const status=openingCohortStatus({status:'delivered',data:{evidence:{transport_acknowledged:true,native_narrative_accepted:true,
      dramatic_coverage:'unverified',hook_selected:false,hook_revealed:false}}});
    assert.match(status,/transport acknowledged/);
    assert.match(status,/dramatic fulfillment remains unverified/);
    assert.equal(db.getSimulationClock('guild-correction').tick,0);
  }finally{close();}
});
