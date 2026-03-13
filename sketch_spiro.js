// sketch_spiro.js  v2
// Spirograph art — groups of 3 nested curves with prime-based petal counts
//
// Hypotrochoid (pen inside fixed circle):
//   x = (R-r)*cos(t) + d*cos((R-r)/r · t)
//   y = (R-r)*sin(t) − d*sin((R-r)/r · t)
//
// Epitrochoid (pen outside fixed circle):
//   x = (R+r)*cos(t) − d*cos((R+r)/r · t)
//   y = (R+r)*sin(t) − d*sin((R+r)/r · t)
//
// For r/R = p/q in lowest terms (p,q positive integers, gcd(p,q)=1):
//   petal count = q                       ← denominator
//   tMax        = 2π · p                  ← numerator; p > 1 means multiple trips
//
// Nesting: three curves nest visibly when their petal counts share a common factor.
//
// d_frac controls pen offset relative to r:
//   d < r  → smooth rounded petals
//   d = r  → cusps at tips
//   d > r  → loops (hypo: outward loops at tips; epi: outward loops / classic toy look)
//
// Space or click = restart  |  + / − = speed

const SPEEDS = [0.02, 0.06, 0.15, 0.4];
let speedIdx = 1;

let curves = [];
let t = 0;
let pg;         // offscreen buffer — new segments painted here each frame
let cx, cy;

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function igcd(a, b) {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  return b === 0 ? a : igcd(b, a % b);
}

function petalCount(R, r) { return R / igcd(R, r); }
function curvePeriod(R, r) { return TWO_PI * r / igcd(R, r); }

// All p in [1, maxP] coprime to q — these are valid numerators for r/R = p/q.
// tMax = TWO_PI * p, so p > 1 means multiple trips around before closing.
function validNumerators(q, maxP = 4) {
  const out = [];
  for (let p = 1; p <= min(maxP, q - 1); p++) {
    if (igcd(p, q) === 1) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spiro class
// ---------------------------------------------------------------------------

class Spiro {
  constructor(R, r, d, col, isEpi = false) {
    this.R     = R;
    this.r     = r;
    this.d     = d;
    this.tMax  = curvePeriod(R, r);
    this.col   = col;
    this.isEpi = isEpi;
    this.done  = false;
    // Seed with t=0 so the closing segment returns exactly to the start
    this.pts   = [this._xy(0)];
  }

  _xy(t) {
    if (this.isEpi) {
      const k = (this.R + this.r) / this.r;
      return [(this.R + this.r) * cos(t) - this.d * cos(k * t),
              (this.R + this.r) * sin(t) - this.d * sin(k * t)];
    } else {
      const k = (this.R - this.r) / this.r;
      return [(this.R - this.r) * cos(t) + this.d * cos(k * t),
              (this.R - this.r) * sin(t) - this.d * sin(k * t)];
    }
  }

  // k = angular rate of the fast (pen) component — drives smoothness requirement
  get k() {
    return this.isEpi ? (this.R + this.r) / this.r : (this.R - this.r) / this.r;
  }

  advance(t) {
    if (this.done) return null;
    const pt = this._xy(min(t, this.tMax));
    this.pts.push(pt);
    if (t >= this.tMax) this.done = true;
    return pt;
  }
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const PALETTE = [
  [240, 210,  85],  // golden yellow
  [210, 105,  35],  // warm orange
  [160,  60,  50],  // brick red
  [125,  25, 110],  // deep magenta-purple
  [130,  90, 155],  // dusty purple
  [ 50,  85, 165],  // cobalt blue
  [130, 150, 160],  // slate blue-grey
  [ 40, 110,  80],  // forest green
];

// ---------------------------------------------------------------------------

function makeCurves() {
  curves = [];
  const S = min(width, height) * 0.42;  // canvas radius

  // 1. Pick g — the shared petal symmetry factor.
  const g = floor(random(3, 8));  // 3, 4, 5, 6, or 7

  // 2. Pick 3 distinct random colors from the palette.
  const cols = shuffle(PALETTE.slice()).slice(0, 3)
                 .map(([r, gv, b]) => color(r, gv, b, 210));

  // 3. For each curve, independently choose R, m, and p.
  for (let i = 0; i < 3; i++) {
    const m = floor(random(1, 5));    // 1, 2, 3, or 4
    const q = g * m;
    const R = round(random(0.15 * S, 0.85 * S) / q) * q;
    const p = random(validNumerators(q));
    const r = R * p / q;
    const isEpi = random() < 0.1;
    // d > r = outward loops at petal tips (the snowflake look)
    // d < r  → smooth rounded petals; multiple trips (p>1) create a braid/weave
    // d > r  → outward loops at petal tips (snowflake look)
    const d = random() < 0.4
      ? random(0.25 * r, 0.92 * r)   // braid / smooth
      : random(1.08 * r, 2.2  * r);  // loopy / snowflake
    curves.push(new Spiro(R, r, d, cols[i], isEpi));
  }
}

// ---------------------------------------------------------------------------
// p5 lifecycle
// ---------------------------------------------------------------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  cx = width  / 2;
  cy = height / 2;
  pg = createGraphics(width, height);
  pg.background(0);
  pg.strokeWeight(3.5);
  pg.noFill();
  makeCurves();
}

function draw() {
  // Fixed small step size for smooth curves; cap steps for performance
  const steps = min(200, max(1, round(SPEEDS[speedIdx] / 0.002)));
  const step  = SPEEDS[speedIdx] / steps;

  for (let s = 0; s < steps; s++) {
    t += step;
    for (const c of curves) {
      if (c.done) continue;
      const prev = c.pts[c.pts.length - 1];   // always valid — pts seeded at t=0
      const curr = c.advance(t);
      if (curr) {
        pg.stroke(c.col);
        pg.line(cx + prev[0], cy + prev[1],
                cx + curr[0], cy + curr[1]);
        if (c.done) {
          // close back to the exact t=0 starting point
          pg.line(cx + curr[0], cy + curr[1],
                  cx + c.pts[0][0], cy + c.pts[0][1]);
        }
      }
    }
  }

  image(pg, 0, 0);
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

function restart() {
  t = 0;
  pg.background(0);
  makeCurves();
}

function keyPressed() {
  if (key === ' ')                restart();
  if (key === '+' || key === '=') speedIdx = min(speedIdx + 1, SPEEDS.length - 1);
  if (key === '-')                speedIdx = max(speedIdx - 1, 0);
}

function mousePressed() { restart(); }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cx = width  / 2;
  cy = height / 2;
  pg = createGraphics(width, height);
  pg.background(0);
  pg.strokeWeight(3.5);
  pg.noFill();
  restart();
}
