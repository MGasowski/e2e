const STIFF = 110;
const DAMP = 11;
const PUSH = 3200;
const COUPLE = 1.6;
const KICK = 0.55;
const SPEED_REF = 700;
const MAGNET = 4200;
const GRAV = 55;
const TERM = 85;

const SPRING = 0;
const SAND = 1;

export type ParticleFieldOptions = {
  cols: number;
  rows: number;
  /** Grid pitch in field units; a particle's home is its cell center. */
  cellSize: number;
  /** Cell indexes that hold a particle; ambient grains detach from these. */
  homes: readonly number[];
  capacity: number;
  /** Field units per reference pixel; physics constants scale with it. */
  unit: number;
  /** Farthest a spring particle may stray from home. */
  maxDisplacement: number;
  /** Magnet radius around the cursor; blast radius is a multiple of it. */
  radius: number;
  blast: { radiusScale: number; strength: number; jitter: number };
  /** Grains detaching per second while ambient motion runs. */
  rainPerSecond: number;
};

/**
 * Square-particle physics shared by the /e2e canvases: every particle rests at
 * its grid cell, the cursor is a standing repelling magnet, springs pull
 * displaced particles home, and detached "sand" grains drift upward until
 * they pass `exitY`. Only displaced particles are simulated; settled ones
 * return their slot, so a scene only redraws what moved.
 */
export class ParticleField {
  radius: number;
  /** Sand grains above this y leave the simulation. */
  exitY = -Infinity;

  private readonly opts: ParticleFieldOptions;
  private readonly occupied: Uint8Array;
  private readonly slot: Int32Array;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly cell: Int32Array;
  private readonly mode: Uint8Array;
  private count = 0;
  private rainCarry = 0;

  private pointerIn = false;
  private mx = -1e9;
  private my = -1e9;
  private mvx = 0;
  private mvy = 0;
  private lastMove = 0;

  constructor(opts: ParticleFieldOptions) {
    this.opts = opts;
    this.radius = opts.radius;
    this.occupied = new Uint8Array(opts.cols * opts.rows);
    for (const c of opts.homes) this.occupied[c] = 1;
    this.slot = new Int32Array(opts.cols * opts.rows).fill(-1);
    this.px = new Float32Array(opts.capacity);
    this.py = new Float32Array(opts.capacity);
    this.vx = new Float32Array(opts.capacity);
    this.vy = new Float32Array(opts.capacity);
    this.cell = new Int32Array(opts.capacity);
    this.mode = new Uint8Array(opts.capacity);
  }

  /** Feeds a cursor position in field units; sweeps the path so fast moves leave no gaps. */
  pointerMove(x: number, y: number, now: number) {
    if (this.pointerIn) {
      const dt = Math.max((now - this.lastMove) / 1000, 0.004);
      this.mvx = this.mvx * 0.7 + ((x - this.mx) / dt) * 0.3;
      this.mvy = this.mvy * 0.7 + ((y - this.my) / dt) * 0.3;
      const strength = Math.min(Math.hypot(this.mvx, this.mvy) / (SPEED_REF * this.opts.unit), 1);
      const segs = Math.max(
        1,
        Math.ceil(Math.hypot(x - this.mx, y - this.my) / (this.radius * 0.5)),
      );
      for (let s = 1; s <= segs; s++) {
        this.activateAround(
          this.mx + (x - this.mx) * (s / segs),
          this.my + (y - this.my) * (s / segs),
          this.mvx / 60,
          this.mvy / 60,
          strength,
        );
      }
    }
    this.mx = x;
    this.my = y;
    this.lastMove = now;
    this.pointerIn = true;
  }

  pointerLeave() {
    this.pointerIn = false;
    this.mx = -1e9;
    this.my = -1e9;
  }

  /** Click shockwave: wakes every particle in the blast disk, then shoves the active field radially. */
  blast(ax: number, ay: number) {
    const { cellSize: P, cols, rows, unit, blast } = this.opts;
    const r = this.radius * blast.radiusScale;
    const r2 = r * r;
    const cx0 = Math.max(0, Math.floor((ax - r) / P));
    const cx1 = Math.min(cols - 1, Math.ceil((ax + r) / P));
    const cy0 = Math.max(0, Math.floor((ay - r) / P));
    const cy1 = Math.min(rows - 1, Math.ceil((ay + r) / P));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const dx = cx * P + P / 2 - ax;
        const dy = cy * P + P / 2 - ay;
        if (dx * dx + dy * dy > r2) continue;
        this.spawn(cy * cols + cx, SPRING, 0, 0);
      }
    }
    const { px, py, vx, vy } = this;
    const jitter = blast.jitter * unit;
    const strength = blast.strength * unit;
    for (let i = 0; i < this.count; i++) {
      const dx = px[i] - ax;
      const dy = py[i] - ay;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const d = Math.sqrt(d2) || 1;
      const fall = 1 - d / r;
      vx[i] += (dx / d) * strength * fall + (Math.random() - 0.5) * jitter * fall;
      vy[i] += (dy / d) * strength * fall + (Math.random() - 0.5) * jitter * fall;
    }
  }

  /** Detaches random resting particles as rising grains. */
  rain(dt: number) {
    const { homes, rainPerSecond, unit } = this.opts;
    if (homes.length === 0) return;
    this.rainCarry += dt * rainPerSecond;
    let n = Math.floor(this.rainCarry);
    this.rainCarry -= n;
    while (n-- > 0) {
      this.spawn(
        homes[(Math.random() * homes.length) | 0],
        SAND,
        (Math.random() - 0.5) * 8 * unit,
        -(8 + Math.random() * 18) * unit,
      );
    }
  }

  /** Advances the simulation by `dt` seconds. */
  step(dt: number, now: number) {
    const { unit, maxDisplacement: MAXD } = this.opts;
    // pointer velocity dies quickly once the mouse stops, so no crater forms
    // around a resting cursor
    if (now - this.lastMove > 50) {
      this.mvx *= 0.55;
      this.mvy *= 0.55;
      if (this.mvx * this.mvx + this.mvy * this.mvy < 25 * unit * unit) {
        this.mvx = 0;
        this.mvy = 0;
      }
    }

    const r = this.radius;
    const r2 = r * r;
    const { px, py, vx, vy, mode, mx, my, mvx, mvy, pointerIn } = this;
    const magnet = MAGNET * unit;
    const grav = GRAV * unit;
    const term = TERM * unit;
    // the magnet works on a resting cursor too, so particles entering its
    // radius must wake up every frame
    if (pointerIn) this.activateAround(mx, my, 0, 0, 0);
    for (let i = 0; i < this.count; i++) {
      let ax = 0;
      let ay = 0;
      if (pointerIn) {
        const dx = px[i] - mx;
        const dy = py[i] - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1;
          const f1 = 1 - d / r;
          const fall = f1 * f1 * (3 - 2 * f1);
          const f = (magnet * fall) / d;
          ax += dx * f + mvx * COUPLE * fall * 8;
          ay += dy * f + mvy * COUPLE * fall * 8;
        }
      }

      if (mode[i] === SAND) {
        ax -= vx[i] * 1.5;
        ay -= grav;
        vx[i] += ax * dt;
        vy[i] += ay * dt;
        if (vy[i] < -term) vy[i] = -term;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
        if (py[i] < this.exitY) this.deactivate(i--);
        continue;
      }

      const hx = this.homeX(i);
      const hy = this.homeY(i);
      ax += (hx - px[i]) * STIFF - vx[i] * DAMP;
      ay += (hy - py[i]) * STIFF - vy[i] * DAMP;
      vx[i] += ax * dt;
      vy[i] += ay * dt;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;

      let ddx = px[i] - hx;
      let ddy = py[i] - hy;
      const dd2 = ddx * ddx + ddy * ddy;
      if (dd2 > MAXD * MAXD) {
        const dd = Math.sqrt(dd2);
        px[i] = hx + (ddx / dd) * MAXD;
        py[i] = hy + (ddy / dd) * MAXD;
        // bleed off outward velocity at the cap so particles glide along it
        const vr = (vx[i] * ddx + vy[i] * ddy) / dd;
        if (vr > 0) {
          vx[i] -= (ddx / dd) * vr;
          vy[i] -= (ddy / dd) * vr;
        }
        ddx = px[i] - hx;
        ddy = py[i] - hy;
      }
      if (ddx * ddx + ddy * ddy < 0.02 && vx[i] * vx[i] + vy[i] * vy[i] < 1) {
        this.deactivate(i--);
      }
    }
  }

  /** Visits every particle that has visibly left its home cell. */
  forEachDisplaced(visit: (cell: number, x: number, y: number) => void) {
    for (let i = 0; i < this.count; i++) {
      const ddx = this.px[i] - this.homeX(i);
      const ddy = this.py[i] - this.homeY(i);
      if (ddx * ddx + ddy * ddy < 0.64) continue;
      visit(this.cell[i], this.px[i], this.py[i]);
    }
  }

  private homeX(i: number) {
    return (this.cell[i] % this.opts.cols) * this.opts.cellSize + this.opts.cellSize / 2;
  }

  private homeY(i: number) {
    return ((this.cell[i] / this.opts.cols) | 0) * this.opts.cellSize + this.opts.cellSize / 2;
  }

  /** Wakes cell `c` at home with the given velocity; returns its slot, or -1 if it cannot move. */
  private spawn(c: number, mode: number, kvx: number, kvy: number) {
    if (!this.occupied[c] || this.slot[c] !== -1 || this.count >= this.opts.capacity) return -1;
    const { cols, cellSize: P } = this.opts;
    const i = this.count++;
    this.slot[c] = i;
    this.cell[i] = c;
    this.mode[i] = mode;
    this.px[i] = (c % cols) * P + P / 2;
    this.py[i] = ((c / cols) | 0) * P + P / 2;
    this.vx[i] = kvx;
    this.vy[i] = kvy;
    return i;
  }

  private activateAround(ax: number, ay: number, kvx: number, kvy: number, strength: number) {
    const { cellSize: P, cols, rows, unit } = this.opts;
    const r = this.radius;
    const r2 = r * r;
    const push = PUSH * unit * KICK * strength;
    const cx0 = Math.max(0, Math.floor((ax - r) / P));
    const cx1 = Math.min(cols - 1, Math.ceil((ax + r) / P));
    const cy0 = Math.max(0, Math.floor((ay - r) / P));
    const cy1 = Math.min(rows - 1, Math.ceil((ay + r) / P));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const dx = cx * P + P / 2 - ax;
        const dy = cy * P + P / 2 - ay;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const d = Math.sqrt(d2) || 1;
        // cubic falloff: strong right at the cursor, nothing at the rim
        const f1 = 1 - d / r;
        const fall = f1 * f1 * f1;
        this.spawn(
          cy * cols + cx,
          SPRING,
          ((dx / d) * push * fall) / 60 + kvx * COUPLE * fall,
          ((dy / d) * push * fall) / 60 + kvy * COUPLE * fall,
        );
      }
    }
  }

  private deactivate(i: number) {
    this.slot[this.cell[i]] = -1;
    const j = --this.count;
    if (i === j) return;
    this.px[i] = this.px[j];
    this.py[i] = this.py[j];
    this.vx[i] = this.vx[j];
    this.vy[i] = this.vy[j];
    this.cell[i] = this.cell[j];
    this.mode[i] = this.mode[j];
    this.slot[this.cell[i]] = i;
  }
}
