import { BASE_HEIGHT, ClimbSimulation, LIMB_IDS, type LimbId } from './simulation';

/** Route distances are metres climbed above the opening stance. */
export const MOON_HEIGHT = 24;
export const CHECKPOINTS = [6, 12, 18] as const;
const STAGE_HEIGHTS = [0, 4, 9, 15, 21] as const;
const BOOST_DISTANCE = 0.8;
const MIN_UPLIFT = 0.15;
type LimbType = 'hand' | 'foot';

export type RaceEvent = {
  id: number;
  kind: 'story' | 'boost' | 'checkpoint' | 'rescue' | 'finish';
  title: string;
  text: string;
};

const STORIES = [
  { title: '竹林を抜けた！', text: 'かぐや「迎えの車、竹だったの？」 次は雲の上へ。' },
  { title: '雲の上でひと休み', text: '地上のおじいさんが手を振っている。たぶん。雲より上！' },
  { title: '宇宙まで来ちゃった', text: 'かぐや「宇宙服より先に、袖を何とかしたい」 月の灯りが近づいてきた。' },
  { title: '月うさぎから入電', text: '「おもち、もうすぐ焼けます」 ラストスパート！' },
] as const;

export function formatTime(seconds: number): string {
  const hundredths = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 100 + 1e-7);
  const minutes = Math.floor(hundredths / 6000);
  const remainder = hundredths % 6000;
  return `${minutes}:${String(Math.floor(remainder / 100)).padStart(2, '0')}.${String(remainder % 100).padStart(2, '0')}`;
}

/** Race rules wrap the original soft-body simulation without changing its controls. */
export class MoonRace {
  readonly sim: ClimbSimulation;
  elapsed = 0;
  penalties = 0;
  falls = 0;
  checkpoint = 0;
  completed = false;
  retired = false;
  combo = 0;
  boosts = 0;
  stage = 0;
  splits: number[] = [];
  event: RaceEvent | null = null;

  private started = false;
  private eventId = 0;
  private previousType: LimbType | null = null;
  private creditedHeight = {} as Record<LimbId, number>;

  constructor(sim: ClimbSimulation) {
    this.sim = sim;
    this.reset();
  }

  get time(): number { return this.elapsed + this.penalties; }
  get progress(): number { return Math.max(0, Math.min(1, this.sim.height / MOON_HEIGHT)); }

  reset(): void {
    this.sim.reset();
    this.elapsed = 0;
    this.penalties = 0;
    this.falls = 0;
    this.checkpoint = 0;
    this.completed = false;
    this.retired = false;
    this.combo = 0;
    this.boosts = 0;
    this.stage = 0;
    this.splits = [];
    this.event = null;
    this.started = false;
    this.previousType = null;
    this.rememberStance();
  }

  start(): void {
    if (this.completed || this.retired || this.started) return;
    this.started = true;
    this.sim.start();
  }

  /** Caller omits tick while hidden or paused; count full active wall time. */
  tick(seconds: number): void {
    if (!this.started || this.completed || this.retired || !Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed += seconds;
  }

  afterStep(): void {
    if (!this.started || this.completed || this.retired) return;
    this.sim.height = Math.max(0, this.sim.body.y - BASE_HEIGHT);
    this.sim.maxHeight = Math.max(this.sim.maxHeight, this.sim.height);

    // Preserve every crossed story split even if a boost crosses two milestones.
    let newStage = this.stage;
    while (newStage + 1 < STAGE_HEIGHTS.length && this.sim.height >= STAGE_HEIGHTS[newStage + 1]) {
      newStage++;
      this.splits.push(this.time);
    }
    const stageChanged = newStage !== this.stage;
    this.stage = newStage;
    const passed = CHECKPOINTS.filter(height => this.sim.height >= height);
    const nextCheckpoint = passed[passed.length - 1] ?? 0;
    const checkpointChanged = nextCheckpoint > this.checkpoint;
    if (checkpointChanged) this.checkpoint = nextCheckpoint;

    if (this.sim.height >= MOON_HEIGHT) {
      this.translate(MOON_HEIGHT - this.sim.height);
      this.sim.height = MOON_HEIGHT;
      this.sim.maxHeight = MOON_HEIGHT;
      this.completed = true;
      this.combo = 0;
      this.splits.push(this.time);
      this.sim.finish();
      this.emit('finish', 'おかえり、かぐや姫！', '月うさぎ「おもち、間に合いました！」 月への帰宅タイムが確定しました。');
      return;
    }

    if (this.sim.status === 'ended') {
      const best = this.sim.maxHeight;
      this.sim.reset();
      this.translate(this.checkpoint);
      this.sim.maxHeight = best;
      this.sim.start();
      this.falls++;
      this.penalties += 5;
      this.combo = 0;
      this.previousType = null;
      this.rememberStance();
      this.emit('rescue', '月うさぎがキャッチ！ ＋5秒', `${this.checkpoint === 0 ? '竹のふもと' : `中継地点 ${this.checkpoint} m`}から再出発。転んでも、月は逃げない。`);
      return;
    }

    // A save point matters more than a simultaneous story beat.
    if (checkpointChanged) {
      this.emit('checkpoint', `${this.checkpoint} m 中継地点に到着`, 'ここまでの登りを保存！ 落ちてもここから。月うさぎが見守っています。');
    } else if (stageChanged) {
      const story = STORIES[this.stage - 1];
      this.emit('story', story.title, story.text);
    }
  }

  recordGrip(id: LimbId, previousY: number, success: boolean): void {
    if (!this.started || this.completed || this.retired) return;
    const limb = this.sim.limbs[id];
    const uplift = limb.pos.y - previousY;
    // An already rewarded hold cannot be lowered and re-gripped for free boosts.
    const freshUplift = limb.pos.y - this.creditedHeight[id];
    if (!success || !limb.gripped || !Number.isFinite(previousY)
      || uplift < MIN_UPLIFT - 1e-8 || freshUplift < MIN_UPLIFT - 1e-8) {
      this.combo = 0;
      this.previousType = null;
      return;
    }
    this.creditedHeight[id] = limb.pos.y;
    const type: LimbType = id.endsWith('Hand') ? 'hand' : 'foot';
    this.combo = type === this.previousType ? 1 : this.combo + 1;
    this.previousType = type;
    if (this.combo < 4) return;

    this.combo = 0;
    this.previousType = null;
    if (this.sim.supportCount < 3 || LIMB_IDS.some(other => other !== id && this.sim.limbs[other].dragging)) return;
    this.translate(BOOST_DISTANCE);
    for (const other of LIMB_IDS) this.creditedHeight[other] += BOOST_DISTANCE;
    this.boosts++;
    this.emit('boost', '手・足・手・足！ 羽衣の追い風', 'リズムよく4回つかんで、ぐんっと上昇！');
    this.afterStep();
  }

  retire(): void {
    if (!this.started || this.completed || this.retired) return;
    this.retired = true;
    this.combo = 0;
    this.sim.finish();
  }

  private translate(amount: number): void {
    this.sim.body.y += amount;
    for (const id of LIMB_IDS) {
      this.sim.limbs[id].pos.y += amount;
      this.sim.limbs[id].target.y += amount;
    }
    this.sim.height = Math.max(0, this.sim.body.y - BASE_HEIGHT);
    this.sim.maxHeight = Math.max(this.sim.maxHeight, this.sim.height);
  }

  private rememberStance(): void {
    for (const id of LIMB_IDS) this.creditedHeight[id] = this.sim.limbs[id].pos.y;
  }

  private emit(kind: RaceEvent['kind'], title: string, text: string): void {
    this.event = { id: ++this.eventId, kind, title, text };
  }
}
