import assert from 'node:assert/strict';
import test from 'node:test';
import { BASE_HEIGHT, ClimbSimulation, LIMB_CONFIG, LIMB_IDS, type LimbId } from '../src/simulation.ts';

const advance = (simulation: ClimbSimulation, seconds: number) => {
  for (let frame = 0; frame < Math.ceil(seconds * 120); frame++) simulation.step(1 / 120);
};

const moveHold = (simulation: ClimbSimulation, id: LimbId, amount = 0.55) => {
  assert.equal(simulation.beginDrag(id), true);
  const config = LIMB_CONFIG[id];
  simulation.moveDrag(id, {
    x: config.lane,
    y: simulation.body.y + config.restOffset + amount,
  });
  advance(simulation, 0.7);
  assert.equal(simulation.endDrag(id), true, `${id} should reach the deliberate target`);
  advance(simulation, 0.6);
};

test('ready and idle climbers cannot gain height, and three holds do not expire', () => {
  const simulation = new ClimbSimulation();
  advance(simulation, 10);
  assert.equal(simulation.body.y, BASE_HEIGHT);
  assert.equal(simulation.status, 'ready');
  simulation.start();
  advance(simulation, 30);
  assert.equal(simulation.maxHeight, 0);
  assert.equal(simulation.supportCount, 4);
  simulation.beginDrag('leftHand');
  advance(simulation, 120);
  assert.equal(simulation.supportCount, 3);
  assert.equal(simulation.status, 'playing');
  assert.ok(Math.abs(simulation.body.y - BASE_HEIGHT) < 1e-8);
  assert.equal(simulation.maxHeight, 0);
});

test('alternating four deliberate holds climbs more than five metres', () => {
  const simulation = new ClimbSimulation();
  simulation.start();
  for (let cycle = 0; cycle < 12; cycle++) {
    for (const id of LIMB_IDS) moveHold(simulation, id);
    assert.equal(simulation.status, 'playing');
    assert.equal(simulation.supportCount, 4);
  }
  assert.ok(simulation.maxHeight > 5, `height was ${simulation.maxHeight}`);
  assert.ok(Number.isFinite(simulation.bodyAngle));
});

test('a limb follows elastically and rejects an impossible grip', () => {
  const simulation = new ClimbSimulation();
  simulation.start();
  const before = { ...simulation.limbs.leftHand.pos };
  simulation.beginDrag('leftHand');
  simulation.moveDrag('leftHand', { x: 5, y: 20 });
  simulation.step(1 / 60);
  assert.ok(simulation.limbs.leftHand.pos.y > before.y);
  assert.ok(simulation.limbs.leftHand.pos.y < 20);
  assert.equal(simulation.endDrag('leftHand'), false);
  assert.equal(simulation.supportCount, 3);
});

test('loss of every hold falls and ends, preserving the best height', () => {
  const simulation = new ClimbSimulation();
  simulation.start();
  for (const id of LIMB_IDS) moveHold(simulation, id);
  const best = simulation.maxHeight;
  for (const id of LIMB_IDS) {
    simulation.beginDrag(id);
    simulation.moveDrag(id, { x: 4, y: simulation.body.y });
    simulation.endDrag(id);
  }
  advance(simulation, 3);
  assert.equal(simulation.status, 'ended');
  assert.ok(simulation.maxHeight >= best);
  assert.ok(simulation.height < best);
  const frozenY = simulation.body.y;
  advance(simulation, 5);
  assert.equal(simulation.body.y, frozenY);
  simulation.reset();
  assert.equal(simulation.status, 'ready');
  assert.equal(simulation.maxHeight, 0);
  assert.equal(simulation.height, 0);
  assert.equal(simulation.supportCount, 4);
  assert.equal(simulation.body.y, BASE_HEIGHT);
});

test('a catch can recover an early unsupported fall', () => {
  const simulation = new ClimbSimulation();
  simulation.start();
  for (const id of LIMB_IDS) simulation.beginDrag(id);
  simulation.step(1 / 60);
  assert.equal(simulation.status, 'falling');
  assert.equal(simulation.endDrag('leftHand'), true);
  assert.equal(simulation.status, 'playing');
  assert.equal(simulation.endDrag('rightHand'), true);
  assert.equal(simulation.endDrag('leftFoot'), true);
  assert.equal(simulation.endDrag('rightFoot'), true);
  advance(simulation, 3);
  assert.equal(simulation.status, 'playing');
  assert.equal(simulation.supportCount, 4);
});

test('invalid deltas and pointer targets cannot corrupt simulation state', () => {
  const simulation = new ClimbSimulation();
  simulation.start();
  simulation.beginDrag('rightHand');
  const target = { ...simulation.limbs.rightHand.target };
  simulation.moveDrag('rightHand', { x: NaN, y: Infinity });
  assert.deepEqual(simulation.limbs.rightHand.target, target);
  for (const delta of [0, -1, NaN, Infinity]) simulation.step(delta);
  assert.equal(simulation.body.y, BASE_HEIGHT);
  simulation.cancelDrags();
  assert.equal(simulation.supportCount, 4);
});

test('a completed stance settles without generating additional idle climbing', () => {
  const simulation = new ClimbSimulation();
  simulation.start();
  for (const id of LIMB_IDS) moveHold(simulation, id);
  advance(simulation, 20);
  const settledY = simulation.body.y;
  const settledBest = simulation.maxHeight;
  advance(simulation, 120);
  assert.ok(Math.abs(simulation.body.y - settledY) < 1e-10);
  assert.ok(Math.abs(simulation.maxHeight - settledBest) < 1e-10);
  assert.equal(simulation.supportCount, 4);
});

test('30, 60 and 120 FPS produce the same deliberate climb', () => {
  const playAt = (fps: number) => {
    const simulation = new ClimbSimulation();
    const wait = (seconds: number) => {
      for (let frame = 0; frame < Math.round(seconds * fps); frame++) simulation.step(1 / fps);
    };
    simulation.start();
    for (let cycle = 0; cycle < 4; cycle++) {
      for (const id of LIMB_IDS) {
        const config = LIMB_CONFIG[id];
        assert.equal(simulation.beginDrag(id), true);
        simulation.moveDrag(id, { x: config.lane, y: simulation.body.y + config.restOffset + 0.55 });
        wait(0.7);
        assert.equal(simulation.endDrag(id), true);
        wait(0.6);
      }
    }
    return simulation;
  };
  const reference = playAt(120);
  for (const fps of [30, 60]) {
    const simulation = playAt(fps);
    assert.equal(simulation.status, 'playing');
    assert.equal(simulation.supportCount, 4);
    assert.ok(Math.abs(simulation.body.y - reference.body.y) < 1e-9);
    assert.ok(Math.abs(simulation.maxHeight - reference.maxHeight) < 1e-9);
  }
});
