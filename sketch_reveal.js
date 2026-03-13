// sketch_spiro.js  v3
// Spirograph portrait reveal
// 20 groups of 3 nested curves erase a black overlay to uncover a background image.
//
// Hypotrochoid (pen inside fixed circle):
//   x = (R-r)*cos(t) + d*cos((R-r)/r · t)
//   y = (R-r)*sin(t) − d*sin((R-r)/r · t)
//
// Epitrochoid (pen outside fixed circle):
//   x = (R+r)*cos(t) − d*cos((R+r)/r · t)
//   y = (R+r)*sin(t) − d*sin((R+r)/r · t)
//
// Space or click = restart  |  + / − = speed

const SPEEDS = [0.02, 0.06, 0.15, 0.4];
let speedIdx = 1;

let bgImage;
let pg;          // black overlay — erased by spiro strokes to reveal bgImage
let groups = [];

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function igcd(a, b) {
  a = Math.round(Math.abs(a));
  b = Math.round(Math.abs(b));
  return b === 0 ? a : igcd(b, a % b);
}

function curvePeriod(R, r) { return TWO_PI * r / igcd(R, r); }

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
  constructor(R, r, d, isEpi = false) {
    this.R     = R;
    this.r     = r;
    this.d     = d;
    this.tMax  = curvePeriod(R, r);
    this.isEpi = isEpi;
    this.pts   = [];
    this.done  = false;
  }

  advance(t) {
    if (this.done) return null;
    let x, y;
    if (this.isEpi) {
      let k = (this.R + this.r) / this.r;
      x = (this.R + this.r) * cos(t) - this.d * cos(k * t);
      y = (this.R + this.r) * sin(t) - this.d * sin(k * t);
    } else {
      let k = (this.R - this.r) / this.r;
      x = (this.R - this.r) * cos(t) + this.d * cos(k * t);
      y = (this.R - this.r) * sin(t) - this.d * sin(k * t);
    }
    this.pts.push([x, y]);
    if (t >= this.tMax) this.done = true;
    return [x, y];
  }
}

// ---------------------------------------------------------------------------
// buildCurves — returns 3 nested Spiro objects for a given canvas radius S
// ---------------------------------------------------------------------------

function buildCurves(S) {
  const curves = [];
  const g = floor(random(3, 8));
  for (let i = 0; i < 3; i++) {
    const m = floor(random(1, 5));
    const q = g * m;
    const R = round(random(0.15 * S, 0.85 * S) / q) * q;
    const p = random(validNumerators(q));
    const r = R * p / q;
    const isEpi = random() < 0.1;
    const d = random(0.85 * r, 2.2 * r);
    curves.push(new Spiro(R, r, d, isEpi));
  }
  return curves;
}

// ---------------------------------------------------------------------------
// Group — one spiro composition with its own center and time
// ---------------------------------------------------------------------------

class Group {
  constructor() {
    const minS = min(width, height) * 0.07;
    const maxS = min(width, height) * 0.15;
    this.S  = random(minS, maxS);
    this.cx = random(this.S, width  - this.S);
    this.cy = random(this.S, height - this.S);
    this.t  = 0;
    this.curves  = buildCurves(this.S);
    this.allDone = false;
  }

  advance(dt) {
    if (this.allDone) return;
    this.t += dt;
    let anyActive = false;
    for (const c of this.curves) {
      if (c.done) continue;
      anyActive = true;
      const prev = c.pts.length > 0 ? c.pts[c.pts.length - 1] : null;
      const curr = c.advance(this.t);
      if (prev && curr) {
        pg.erase();
        pg.line(this.cx + prev[0], this.cy + prev[1],
                this.cx + curr[0], this.cy + curr[1]);
        pg.noErase();
      }
    }
    if (!anyActive) this.allDone = true;
  }
}

// ---------------------------------------------------------------------------
// p5 lifecycle
// ---------------------------------------------------------------------------

function preload() {
  bgImage = loadImage('KJ.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  pg.strokeWeight(3);
  pg.noFill();
  pg.background(0);
  spawnGroups(20);
}

function draw() {
  const dt = SPEEDS[speedIdx];

  for (const g of groups) {
    g.advance(dt);
  }

  // Replace each finished group with a fresh one at a new random location
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].allDone) {
      groups.splice(i, 1);
      groups.push(new Group());
    }
  }

  image(bgImage, 0, 0, width, height);
  image(pg, 0, 0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnGroups(n) {
  for (let i = 0; i < n; i++) groups.push(new Group());
}

function restart() {
  pg.background(0);
  groups = [];
  spawnGroups(20);
}

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

function keyPressed() {
  if (key === ' ')                restart();
  if (key === '+' || key === '=') speedIdx = min(speedIdx + 1, SPEEDS.length - 1);
  if (key === '-')                speedIdx = max(speedIdx - 1, 0);
}

function mousePressed() { restart(); }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  pg.strokeWeight(3);
  pg.noFill();
  pg.background(0);
  groups = [];
  spawnGroups(20);
}
