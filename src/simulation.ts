/** A small, deterministic planar soft-body model. Rendering is deliberately separate. */
export type LimbId = 'leftHand' | 'rightHand' | 'leftFoot' | 'rightFoot';
export type Vec2 = { x: number; y: number };
export type LimbState = {
  id: LimbId;
  pos: Vec2;
  /** The pointer's intended position. The actual limb follows with a spring. */
  target: Vec2;
  gripped: boolean;
  dragging: boolean;
  /** 0 is comfortable; 1 is at the slipping threshold. */
  strain: number;
};

export const LIMB_IDS: readonly LimbId[] = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'];
export const BASE_HEIGHT = 1.6;
export const GRIP_TOLERANCE = 0.46;
export const LIMB_CONFIG: Record<LimbId, { root: Vec2; restOffset: number; reach: number; lane: number }> = {
  leftHand: { root: { x: -0.23, y: 0.30 }, restOffset: 0.72, reach: 1.30, lane: -0.20 },
  rightHand: { root: { x: 0.23, y: 0.30 }, restOffset: 0.72, reach: 1.30, lane: 0.20 },
  leftFoot: { root: { x: -0.15, y: -0.24 }, restOffset: -0.85, reach: 1.28, lane: -0.17 },
  rightFoot: { root: { x: 0.15, y: -0.24 }, restOffset: -0.85, reach: 1.28, lane: 0.17 },
};

const copy = (p: Vec2): Vec2 => ({ x: p.x, y: p.y });
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export class ClimbSimulation {
  body: Vec2 = { x: 0, y: BASE_HEIGHT };
  bodyAngle = 0;
  limbs = {} as Record<LimbId, LimbState>;
  height = 0;
  maxHeight = 0;
  status: 'ready' | 'playing' | 'falling' | 'ended' = 'ready';

  private bodyVelocity: Vec2 = { x: 0, y: 0 };
  private velocities = {} as Record<LimbId, Vec2>;
  private fallStartY: number | null = null;

  constructor() { this.reset(); }

  get supportCount(): number {
    return LIMB_IDS.reduce((count, id) => count + Number(this.limbs[id].gripped), 0);
  }

  /** Limb attachment point, including the torso's current lean. */
  rootFor(id: LimbId): Vec2 {
    const root = LIMB_CONFIG[id].root;
    const cos = Math.cos(this.bodyAngle);
    const sin = Math.sin(this.bodyAngle);
    return {
      x: this.body.x + root.x * cos - root.y * sin,
      y: this.body.y + root.x * sin + root.y * cos,
    };
  }

  reset(): void {
    this.body = { x: 0, y: BASE_HEIGHT };
    this.bodyAngle = 0;
    this.bodyVelocity = { x: 0, y: 0 };
    this.height = 0;
    this.maxHeight = 0;
    this.status = 'ready';
    this.fallStartY = null;
    for (const id of LIMB_IDS) {
      const config = LIMB_CONFIG[id];
      const pos = { x: config.lane, y: BASE_HEIGHT + config.restOffset };
      this.limbs[id] = { id, pos, target: copy(pos), gripped: true, dragging: false, strain: 0 };
      this.velocities[id] = { x: 0, y: 0 };
    }
  }

  start(): void {
    if (this.status === 'ended') this.reset();
    if (this.status === 'ready') this.status = 'playing';
  }

  beginDrag(id: LimbId): boolean {
    if (this.status !== 'playing' && this.status !== 'falling') return false;
    const limb = this.limbs[id];
    if (limb.dragging) return false;
    limb.gripped = false;
    limb.dragging = true;
    limb.target = copy(limb.pos);
    this.velocities[id] = { x: 0, y: 0 };
    return true;
  }

  moveDrag(id: LimbId, target: Vec2): void {
    if (!this.limbs[id].dragging || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
    this.limbs[id].target = copy(target);
  }

  endDrag(id: LimbId): boolean {
    const limb = this.limbs[id];
    if (!limb.dragging || this.status === 'ended') return false;
    limb.dragging = false;
    const config = LIMB_CONFIG[id];
    const root = this.rootFor(id);
    const snapped = { x: config.lane, y: limb.pos.y };
    // Both the actual endpoint and the intended target must be near the pole.
    // A quick fling therefore cannot teleport a hand to a distant hold.
    const canGrip = Math.abs(limb.pos.x) <= GRIP_TOLERANCE
      && Math.abs(limb.target.x) <= GRIP_TOLERANCE
      && limb.pos.y >= 0.12
      && distance(root, limb.target) <= config.reach * 1.025
      && distance(root, snapped) <= config.reach * 1.025;
    limb.gripped = canGrip;
    if (canGrip) {
      limb.pos = snapped;
      limb.target = copy(snapped);
      this.velocities[id] = { x: 0, y: 0 };
      this.status = 'playing';
      this.fallStartY = null;
    }
    return canGrip;
  }

  /** Pointer cancellation releases at the current position, just like lifting a finger. */
  cancelDrags(): void {
    for (const id of LIMB_IDS) if (this.limbs[id].dragging) this.endDrag(id);
  }

  finish(): void {
    this.status = 'ended';
    for (const id of LIMB_IDS) this.limbs[id].dragging = false;
  }

  step(dt: number): void {
    if (this.status === 'ready' || this.status === 'ended' || !Number.isFinite(dt) || dt <= 0) return;
    // Ignore background-tab gaps; a hidden tab must not instantly kill a run.
    let remaining = Math.min(dt, 0.1);
    while (remaining > 0.000001) {
      const step = Math.min(remaining, 1 / 120);
      const active = this.integrate(step);
      remaining -= step;
      if (!active) break;
    }
  }

  private integrate(dt: number): boolean {
    let supports = this.supportCount;
    if (supports === 0) {
      if (this.fallStartY === null) this.fallStartY = this.body.y;
      this.status = 'falling';
      this.bodyVelocity.y -= 9.4 * dt;
      this.bodyVelocity.x *= Math.exp(-0.8 * dt);
      this.bodyAngle += (0.45 + this.bodyAngle * 0.25) * dt;
    } else {
      this.status = 'playing';
      this.fallStartY = null;
      let targetX = 0;
      let targetY = 0;
      let imbalance = 0;
      for (const id of LIMB_IDS) {
        const limb = this.limbs[id];
        if (!limb.gripped) continue;
        const config = LIMB_CONFIG[id];
        targetX += limb.pos.x - config.lane;
        targetY += limb.pos.y - config.restOffset;
        imbalance += id.startsWith('left') ? -1 : 1;
      }
      targetX /= supports;
      targetY /= supports;
      // Three or four holds support the climber without fatigue or a clock.
      // With fewer holds gravity stretches the remaining limbs.
      targetY -= supports === 2 ? 0.14 : supports === 1 ? 1.25 : 0;
      this.bodyVelocity.x += ((targetX - this.body.x) * 22 - this.bodyVelocity.x * 9) * dt;
      this.bodyVelocity.y += ((targetY - this.body.y) * 24 - this.bodyVelocity.y * 10) * dt;
      const lean = clamp(imbalance * 0.075, -0.26, 0.26);
      this.bodyAngle += (lean - this.bodyAngle) * Math.min(1, dt * 6);
    }
    this.body.x += this.bodyVelocity.x * dt;
    this.body.y += this.bodyVelocity.y * dt;

    for (const id of LIMB_IDS) {
      const limb = this.limbs[id];
      const config = LIMB_CONFIG[id];
      const root = this.rootFor(id);
      if (!limb.gripped) {
        const velocity = this.velocities[id];
        const desired = limb.dragging ? limb.target : { x: root.x, y: root.y - config.reach * 0.87 };
        const stiffness = limb.dragging ? 68 : 24;
        const damping = limb.dragging ? 11 : 4.8;
        velocity.x += ((desired.x - limb.pos.x) * stiffness - velocity.x * damping) * dt;
        velocity.y += ((desired.y - limb.pos.y) * stiffness - velocity.y * damping) * dt;
        limb.pos.x += velocity.x * dt;
        limb.pos.y += velocity.y * dt;
        const extent = distance(root, limb.pos);
        const limit = config.reach * 1.09;
        if (extent > limit) {
          const nx = (limb.pos.x - root.x) / extent;
          const ny = (limb.pos.y - root.y) / extent;
          limb.pos.x = root.x + nx * limit;
          limb.pos.y = root.y + ny * limit;
          const outward = Math.max(0, velocity.x * nx + velocity.y * ny);
          velocity.x -= outward * nx;
          velocity.y -= outward * ny;
        }
      }
      const reachRatio = distance(root, limb.pos) / config.reach;
      limb.strain = clamp((reachRatio - 0.65) / 0.43, 0, 1);
      if (limb.gripped && (reachRatio > 1.08 || (supports === 1 && id.endsWith('Foot') && limb.pos.y > this.body.y + 0.34))) {
        limb.gripped = false;
        limb.target = copy(limb.pos);
        this.velocities[id] = copy(this.bodyVelocity);
      }
    }

    this.height = Math.max(0, this.body.y - BASE_HEIGHT);
    this.maxHeight = Math.max(this.maxHeight, this.height);
    supports = this.supportCount;
    if (supports === 0) {
      if (this.fallStartY === null) this.fallStartY = this.body.y;
      this.status = 'falling';
      if (this.body.y <= 0.42 || this.fallStartY - this.body.y > 4.2) {
        this.finish();
        return false;
      }
    }
    return true;
  }
}
