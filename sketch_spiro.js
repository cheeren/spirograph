// sketch_spiro.js  (p5.js instance mode)
// Mount with: new p5(spiroSketch, containerElement)

function spiroSketch(p) {
  const { buildCurves } = makeSpiroCore(p);

  const SPEEDS = [0.02, 0.06, 0.15, 0.4];
  let speedIdx = 1;
  let curves = [], t = 0, pg, cx, cy;

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

  function makeCurves() {
    const S = Math.min(p.width, p.height) * 0.42;
    const cols = p.shuffle(PALETTE.slice()).slice(0, 3)
                   .map(([r, gv, b]) => p.color(r, gv, b, 210));
    curves = buildCurves(S);
    curves.forEach((c, i) => c.col = cols[i]);
  }

  function restart() {
    t = 0;
    pg.background(0);
    makeCurves();
  }

  p.setup = function() {
    const el = document.getElementById('canvas-container');
    p.createCanvas(el.offsetWidth, el.offsetHeight);
    cx = p.width  / 2;
    cy = p.height / 2;
    pg = p.createGraphics(p.width, p.height);
    pg.background(0);
    pg.strokeWeight(3.5);
    pg.noFill();
    makeCurves();
  };

  p.draw = function() {
    const steps = Math.min(200, Math.max(1, Math.round(SPEEDS[speedIdx] / 0.002)));
    const step  = SPEEDS[speedIdx] / steps;
    for (let s = 0; s < steps; s++) {
      t += step;
      for (const c of curves) {
        if (c.done) continue;
        const prev = c.pts[c.pts.length - 1];
        const curr = c.advance(t);
        if (curr) {
          pg.stroke(c.col);
          pg.line(cx + prev[0], cy + prev[1], cx + curr[0], cy + curr[1]);
          if (c.done) {
            pg.line(cx + curr[0], cy + curr[1], cx + c.pts[0][0], cy + c.pts[0][1]);
          }
        }
      }
    }
    p.image(pg, 0, 0);
  };

  p.keyPressed = function() {
    if (p.key === ' ')                restart();
    if (p.key === '+' || p.key === '=') speedIdx = Math.min(speedIdx + 1, SPEEDS.length - 1);
    if (p.key === '-')                speedIdx = Math.max(speedIdx - 1, 0);
  };

  p.mousePressed = function() { restart(); };

  p.windowResized = function() {
    const el = document.getElementById('canvas-container');
    p.resizeCanvas(el.offsetWidth, el.offsetHeight);
    cx = p.width  / 2;
    cy = p.height / 2;
    pg = p.createGraphics(p.width, p.height);
    pg.background(0);
    pg.strokeWeight(3.5);
    pg.noFill();
    restart();
  };
}
