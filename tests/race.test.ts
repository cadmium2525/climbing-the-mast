import assert from 'node:assert/strict';
import test from 'node:test';
import { CHECKPOINTS, formatTime, MOON_HEIGHT, MoonRace } from '../src/race.ts';
import { BASE_HEIGHT, ClimbSimulation, LIMB_CONFIG, LIMB_IDS, type LimbId } from '../src/simulation.ts';

const makeRace = () => {
  const sim = new ClimbSimulation();
  const race = new MoonRace(sim);
  return { sim, race };
};

const advance = (race: MoonRace, seconds: number) => {
  for (let frame = 0; frame < Math.round(seconds * 120) && !race.completed; frame++) {
    race.tick(1 / 120);
    race.sim.step(1 / 120);
    race.afterStep();
  }
};

const moveHold = (race: MoonRace, id: LimbId) => {
  const sim = race.sim;
  const previousY = sim.limbs[id].pos.y;
  assert.equal(sim.beginDrag(id), true);
  sim.moveDrag(id, { x: LIMB_CONFIG[id].lane, y: sim.body.y + LIMB_CONFIG[id].restOffset + 0.55 });
  advance(race, 0.7);
  if (race.completed) return;
  const success = sim.endDrag(id);
  assert.equal(success, true, `${id} should reach its intended hold`);
  race.recordGrip(id, previousY, success);
  advance(race, 0.6);
};

const shiftStance = (sim: ClimbSimulation, height: number) => {
  const delta = BASE_HEIGHT + height - sim.body.y;
  sim.body.y += delta;
  for (const id of LIMB_IDS) {
    sim.limbs[id].pos.y += delta;
    sim.limbs[id].target.y += delta;
  }
  sim.height = height;
  sim.maxHeight = Math.max(sim.maxHeight, height);
};

/** Direct grips isolate combination rules; full real drag/physics coverage is above. */
const grip = (race: MoonRace, id: LimbId, amount = 0.2) => {
  const limb = race.sim.limbs[id];
  const previousY = limb.pos.y;
  limb.pos.y += amount;
  limb.target.y = limb.pos.y;
  limb.gripped = true;
  race.recordGrip(id, previousY, true);
};
const alternating: LimbId[] = ['leftHand', 'leftFoot', 'rightHand', 'rightFoot'];

test('time formatting is stable at minute boundaries and accepts only finite nonnegative time', () => {
  assert.equal(formatTime(0), '0:00.00');
  assert.equal(formatTime(9.819), '0:09.81');
  assert.equal(formatTime(59.999), '0:59.99');
  assert.equal(formatTime(60), '1:00.00');
  assert.equal(formatTime(125.12), '2:05.12');
  assert.equal(formatTime(-2), '0:00.00');
  assert.equal(formatTime(Infinity), '0:00.00');
});

test('the opening screen cannot start a timer, rescue, story, or completion', () => {
  const { sim, race } = makeRace();
  race.tick(20);
  race.afterStep();
  assert.equal(race.time, 0);
  assert.equal(race.falls, 0);
  assert.equal(race.event, null);
  assert.equal(race.completed, false);
  assert.equal(sim.status, 'ready');
  assert.equal(race.progress, 0);
});

test('active timer counts real elapsed seconds, with caller-controlled pause', () => {
  const { sim, race } = makeRace();
  race.start();
  race.tick(2.7); // Do not clamp the clock to the short physics delta.
  sim.step(2.7);
  race.afterStep();
  assert.equal(race.elapsed, 2.7);
  for (let frame = 0; frame < 120; frame++) {
    sim.step(1 / 120); // Caller does not tick while paused.
    race.afterStep();
  }
  assert.equal(race.elapsed, 2.7);
  for (const invalid of [0, -1, NaN, Infinity]) race.tick(invalid);
  assert.equal(race.elapsed, 2.7);
  race.tick(1.3);
  assert.equal(race.time, 4);
});

test('idling for minutes does not climb, boost, or finish the route', () => {
  const { sim, race } = makeRace();
  race.start();
  advance(race, 240);
  assert.equal(sim.height, 0);
  assert.equal(race.progress, 0);
  assert.equal(race.boosts, 0);
  assert.equal(race.completed, false);
  assert.deepEqual(race.splits, []);
});

test('real alternating elastic drags reach the moon and freeze the final result', () => {
  const { sim, race } = makeRace();
  race.start();
  for (let cycle = 0; cycle < 30 && !race.completed; cycle++) {
    for (const id of alternating) {
      if (race.completed) break;
      moveHold(race, id);
    }
  }
  assert.equal(race.completed, true, `reached only ${sim.height} m`);
  assert.equal(race.retired, false);
  assert.equal(sim.status, 'ended');
  assert.equal(sim.height, MOON_HEIGHT);
  assert.equal(sim.maxHeight, MOON_HEIGHT);
  assert.equal(race.progress, 1);
  assert.equal(race.checkpoint, CHECKPOINTS[2]);
  assert.equal(race.splits.length, 5);
  assert.ok(race.splits.every((split, index) => split <= race.time && (index === 0 || split >= race.splits[index - 1])));
  assert.ok(race.boosts > 0);
  assert.equal(race.falls, 0);
  assert.equal(race.event?.kind, 'finish');
  const finalTime = race.time;
  const finalY = sim.body.y;
  race.tick(30);
  sim.step(0.1);
  race.afterStep();
  race.start();
  assert.equal(race.time, finalTime);
  assert.equal(sim.body.y, finalY);
  assert.equal(sim.status, 'ended');
});

test('only four alternating upward hand/foot grips give one boost', () => {
  const { sim, race } = makeRace();
  race.start();
  grip(race, 'leftHand');
  grip(race, 'rightHand');
  assert.equal(race.combo, 1);
  assert.equal(race.boosts, 0);
  grip(race, 'leftFoot');
  grip(race, 'leftHand');
  assert.equal(race.combo, 3);
  const bodyBefore = sim.body.y;
  const endpoints = Object.fromEntries(LIMB_IDS.map(id => [id, { pos: sim.limbs[id].pos.y, target: sim.limbs[id].target.y }]));
  grip(race, 'rightFoot');
  assert.equal(race.combo, 0);
  assert.equal(race.boosts, 1);
  assert.ok(Math.abs(sim.body.y - bodyBefore - 0.8) < 1e-10);
  for (const id of LIMB_IDS) {
    const intentionalGrip = id === 'rightFoot' ? 0.2 : 0;
    assert.ok(Math.abs(sim.limbs[id].pos.y - endpoints[id].pos - intentionalGrip - 0.8) < 1e-10);
    assert.ok(Math.abs(sim.limbs[id].target.y - endpoints[id].target - intentionalGrip - 0.8) < 1e-10);
  }
  assert.equal(race.event?.kind, 'boost');
  race.afterStep();
  assert.equal(race.boosts, 1);
});

test('failures, tiny moves, repeated holds and lowering reset combinations', () => {
  const { sim, race } = makeRace();
  race.start();
  grip(race, 'leftHand');
  race.recordGrip('leftFoot', sim.limbs.leftFoot.pos.y, false);
  assert.equal(race.combo, 0);
  grip(race, 'rightHand', 0.1);
  assert.equal(race.combo, 0);
  grip(race, 'rightHand', 0.2);
  assert.equal(race.combo, 1);
  const saved = sim.limbs.rightHand.pos.y;
  sim.limbs.rightHand.pos.y -= 0.2;
  race.recordGrip('rightHand', saved, true);
  assert.equal(race.combo, 0);
  // Returning to an already credited point cannot rebuild the combo.
  grip(race, 'rightHand', 0.2);
  assert.equal(race.combo, 0);
  assert.equal(race.boosts, 0);
});

test('a fourth uplift cannot boost with another dragging limb or fewer than three holds', () => {
  for (const unsafe of ['dragging', 'unsupported']) {
    const { sim, race } = makeRace();
    race.start();
    for (const id of alternating.slice(0, 3)) grip(race, id);
    sim.limbs.leftHand.gripped = false;
    if (unsafe === 'dragging') sim.limbs.leftHand.dragging = true;
    else sim.limbs.leftFoot.gripped = false;
    grip(race, 'rightFoot');
    assert.equal(race.boosts, 0);
    assert.equal(race.combo, 0);
    assert.equal(sim.body.y, BASE_HEIGHT);
    sim.limbs.leftHand.gripped = true;
    sim.limbs.leftHand.dragging = false;
    sim.limbs.leftFoot.gripped = true;
    race.afterStep();
    assert.equal(race.boosts, 0, 'an unsafe combo must not bank a delayed boost');
  }
});

test('checkpoints save the furthest progress and take event priority over story changes', () => {
  const { sim, race } = makeRace();
  race.start();
  race.tick(10);
  shiftStance(sim, 12.2);
  race.afterStep();
  assert.equal(race.checkpoint, 12);
  assert.equal(race.stage, 2);
  assert.deepEqual(race.splits, [10, 10]);
  assert.equal(race.event?.kind, 'checkpoint');
  assert.equal(race.completed, false);
  shiftStance(sim, 2);
  race.afterStep();
  assert.equal(race.checkpoint, 12);
  assert.equal(race.stage, 2);
  assert.equal(race.splits.length, 2);
});

test('unsupported falls rescue to the last checkpoint with five seconds and preserve max height', () => {
  for (const checkpoint of [0, 6, 12, 18]) {
    const { sim, race } = makeRace();
    race.start();
    shiftStance(sim, checkpoint + 1);
    race.afterStep();
    const best = sim.maxHeight;
    for (const id of LIMB_IDS) {
      sim.beginDrag(id);
      sim.moveDrag(id, { x: 5, y: sim.limbs[id].pos.y });
      assert.equal(sim.endDrag(id), false);
    }
    advance(race, 3);
    assert.equal(race.falls, 1);
    assert.equal(race.penalties, 5);
    assert.equal(race.time, race.elapsed + 5);
    assert.equal(race.completed, false);
    assert.equal(race.retired, false);
    assert.equal(sim.status, 'playing');
    assert.equal(sim.supportCount, 4);
    assert.ok(Math.abs(sim.height - checkpoint) < 1e-8);
    assert.ok(sim.maxHeight >= best);
    assert.equal(race.combo, 0);
    assert.equal(race.event?.kind, 'rescue');
    const eventId = race.event?.id;
    advance(race, 2);
    assert.equal(race.falls, 1);
    assert.equal(race.event?.id, eventId);
  }
});

test('retiring freezes the timer and never counts as a moon arrival', () => {
  const { sim, race } = makeRace();
  race.start();
  race.tick(7.5);
  shiftStance(sim, 8);
  race.afterStep();
  race.retire();
  race.tick(20);
  race.afterStep();
  race.retire();
  assert.equal(race.retired, true);
  assert.equal(race.completed, false);
  assert.equal(race.time, 7.5);
  assert.equal(race.falls, 0);
  assert.equal(sim.status, 'ended');
  assert.equal(race.splits.length, 1);
});

test('reset clears the race and physical stance and accepts a fresh start', () => {
  const { sim, race } = makeRace();
  race.start();
  race.tick(5);
  for (const id of alternating) grip(race, id);
  shiftStance(sim, 10);
  race.afterStep();
  race.retire();
  const previousEvent = race.event!.id;
  race.reset();
  assert.equal(sim.status, 'ready');
  assert.equal(sim.body.y, BASE_HEIGHT);
  assert.equal(sim.maxHeight, 0);
  assert.equal(race.time, 0);
  assert.equal(race.penalties, 0);
  assert.equal(race.falls, 0);
  assert.equal(race.boosts, 0);
  assert.equal(race.combo, 0);
  assert.equal(race.stage, 0);
  assert.equal(race.checkpoint, 0);
  assert.equal(race.event, null);
  assert.deepEqual(race.splits, []);
  assert.equal(race.retired, false);
  assert.equal(race.completed, false);
  race.start();
  shiftStance(sim, 4.2);
  race.afterStep();
  assert.equal(race.event?.kind, 'story');
  assert.ok(race.event!.id > previousEvent, 'event ids remain unique across replays');
});
