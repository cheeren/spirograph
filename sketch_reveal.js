// sketch_reveal.js  (p5.js instance mode)
// Mount with: new p5(revealSketch, containerElement)
// p.setImage(path) — load a new background image and restart

function revealSketch(p) {
  const { buildCurves } = makeSpiroCore(p);

  const SPEEDS = [0.02, 0.06, 0.15, 0.4];
  let speedIdx = 1;

  let bgImage = null;
  let pg = null;
  let groups = [];
  let imagePath = 'KJ.png';

  // -------------------------------------------------------------------------
  // Group — one spiro composition at a random location
  // -------------------------------------------------------------------------

  class Group {
    constructor() {
      const minS = Math.min(p.width, p.height) * 0.07;
      const maxS = Math.min(p.width, p.height) * 0.15;
      this.S  = p.random(minS, maxS);
      this.cx = p.random(p.width);
      this.cy = p.random(p.height);
      this.t  = 0;
      this.curves  = buildCurves(this.S);
      this.allDone = false;

      // Erase the center point immediately
      pg.erase();
      pg.point(this.cx, this.cy);
      pg.noErase();
    }

    advance(dt) {
      if (this.allDone) return;
      this.t += dt;
      let anyActive = false;
      for (const c of this.curves) {
        if (c.done) continue;
        anyActive = true;
        const prev = c.pts[c.pts.length - 1];
        const curr = c.advance(this.t);
        if (curr) {
          pg.erase();
          pg.line(this.cx + prev[0], this.cy + prev[1],
                  this.cx + curr[0], this.cy + curr[1]);
          if (c.done) {
            pg.line(this.cx + curr[0], this.cy + curr[1],
                    this.cx + c.pts[0][0], this.cy + c.pts[0][1]);
          }
          pg.noErase();
        }
      }
      if (!anyActive) this.allDone = true;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function spawnGroups(n) {
    for (let i = 0; i < n; i++) groups.push(new Group());
  }

  function initOverlay() {
    pg = p.createGraphics(p.width, p.height);
    pg.strokeWeight(1);
    pg.noFill();
    pg.background(0);
  }

  function restart() {
    if (!pg) return;
    pg.background(0);
    groups = [];
    spawnGroups(20);
  }

  function applyImage() {
    if (!bgImage) return;
    p.resizeCanvas(bgImage.width, bgImage.height);
    initOverlay();
    groups = [];
    spawnGroups(20);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  p.setImage = function(path) {
    imagePath = path;
    p.loadImage(path, img => {
      bgImage = img;
      applyImage();
    });
  };

  // -------------------------------------------------------------------------
  // p5 lifecycle
  // -------------------------------------------------------------------------

  p.preload = function() {
    bgImage = p.loadImage(imagePath);
  };

  p.setup = function() {
    const el = p.canvas ? p.canvas.parentElement
                        : document.getElementById('canvas-container');
    // Size canvas to image; fall back to container if image failed
    const w = bgImage ? bgImage.width  : el.offsetWidth;
    const h = bgImage ? bgImage.height : el.offsetHeight;
    p.createCanvas(w, h);
    initOverlay();
    spawnGroups(20);
  };

  p.draw = function() {
    if (!bgImage || !pg) return;
    const dt = SPEEDS[speedIdx];

    for (const g of groups) g.advance(dt);

    // Replace finished groups with fresh ones
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i].allDone) {
        groups.splice(i, 1);
        groups.push(new Group());
      }
    }

    p.image(bgImage, 0, 0, p.width, p.height);
    p.image(pg, 0, 0);
  };

  p.keyPressed = function() {
    if (p.key === ' ')                restart();
    if (p.key === '+' || p.key === '=') speedIdx = Math.min(speedIdx + 1, SPEEDS.length - 1);
    if (p.key === '-')                speedIdx = Math.max(speedIdx - 1, 0);
  };

  p.mousePressed = function() { restart(); };

  p.windowResized = function() {
    // Canvas is sized to image — no resize needed unless image changes
  };
}
