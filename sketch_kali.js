// sketch_kali.js  (p5.js instance mode)
// Generalized kaleidoscope — wallpaper-group symmetries, animated texture.
// Inspired by Kali (geom.uiuc.edu/apps/kali) and KaleidoPaint (geometrygames.org/KaleidoPaint)
// Mount with: new p5(kaliSketch, containerElement)
// Public API: p.setImage(path)  p.setGroup(key)  p.setMotion(mode)

function kaliSketch(p) {
  const ROTATE_SPEED = 25;   // degrees/second
  const INSET_W      = 160;  // source-image preview width

  // ── Wallpaper groups ────────────────────────────────────────────────────
  // n:       rotation order
  // reflect: alternates UV at each shared edge → adds mirror lines
  // grid:    tile placement lattice
  const GROUPS = {
    p3:   { n: 3, reflect: false, grid: 'hex' },
    p3m1: { n: 3, reflect: true,  grid: 'hex' },
    p4:   { n: 4, reflect: false, grid: 'sq'  },
    p4m:  { n: 4, reflect: true,  grid: 'sq'  },
    p6:   { n: 6, reflect: false, grid: 'hex' },
    p6m:  { n: 6, reflect: true,  grid: 'hex' },
  };

  let activeGroup = 'p6m';
  let motionMode  = 'rotate';

  let img = null;
  let sin60, lastTime, noiseT;
  let triSize;
  let texCenter, texAngle, texRadius;
  let cachedGrid = null, cachedGridKey = '';

  // Trace-path state
  let tracePath = [], traceIdx = 0, traceRec = false, tracePlay = false;

  // ── Public API ───────────────────────────────────────────────────────────

  p.setImage = function(path) {
    p.loadImage(path, i => { img = i; initTexture(); });
  };

  p.setGroup = function(key) {
    activeGroup = key;
    computeTriSize();
    cachedGrid = null;
  };

  p.setMotion = function(mode) {
    motionMode = mode;
    tracePath = []; traceRec = false; tracePlay = false;
  };

  // ── p5 lifecycle ─────────────────────────────────────────────────────────

  p.preload = function() {
    img = p.loadImage('wildflowers.jpg', null, () => { img = null; });
  };

  p.setup = function() {
    const el = p.canvas ? p.canvas.parentElement
                        : document.getElementById('canvas-container');
    p.createCanvas(el.offsetWidth, el.offsetHeight, p.WEBGL);
    sin60 = Math.sqrt(3) / 2;
    p.textureMode(p.NORMAL);
    p.textureWrap(p.CLAMP);
    if (!img) img = makeProceduralTexture(600, 400);
    computeTriSize();
    initTexture();
    lastTime = p.millis();
    noiseT   = 0;
  };

  p.draw = function() {
    if (!img) return;
    p.background(18, 20, 24);
    const now = p.millis();
    const dt  = Math.min((now - lastTime) / 1000, 0.1);
    lastTime  = now;
    updateMotion(dt);
    drawGrid();
    drawInset();
  };

  p.mousePressed = function() {
    if (motionMode === 'trace') {
      tracePath = []; traceRec = true; tracePlay = false;
    }
  };

  p.mouseReleased = function() {
    if (motionMode === 'trace' && tracePath.length > 2) {
      traceRec = false; tracePlay = true; traceIdx = 0;
    }
  };

  p.windowResized = function() {
    const el = p.canvas ? p.canvas.parentElement
                        : document.getElementById('canvas-container');
    p.resizeCanvas(el.offsetWidth, el.offsetHeight);
    computeTriSize();
    cachedGrid = null;
  };

  // ── Layout ───────────────────────────────────────────────────────────────

  function computeTriSize() {
    triSize = GROUPS[activeGroup].grid === 'sq'
      ? p.height / 11
      : p.height / (Math.sqrt(3) * 5.5);
  }

  // ── Texture state ─────────────────────────────────────────────────────────
  // Parameterised as (center, angle, radius) rather than explicit P1/P2.
  // P1 = center + radius·(cos angle, sin angle)
  // P2 = center + radius·(cos(angle + sliceAngle), sin(angle + sliceAngle))

  function initTexture() {
    texCenter = p.createVector(img.width / 2, img.height / 2);
    texRadius = Math.min(img.width, img.height) * 0.38;
    texAngle  = 0;
  }

  function sliceAngle() {
    const g = GROUPS[activeGroup];
    return p.TWO_PI / (g.reflect ? 2 * g.n : g.n);
  }

  function p1() {
    return p.createVector(
      texCenter.x + texRadius * p.cos(texAngle),
      texCenter.y + texRadius * p.sin(texAngle));
  }

  function p2() {
    const a = texAngle + sliceAngle();
    return p.createVector(
      texCenter.x + texRadius * p.cos(a),
      texCenter.y + texRadius * p.sin(a));
  }

  // ── Tile drawing ──────────────────────────────────────────────────────────

  function drawTile() {
    const g      = GROUPS[activeGroup];
    const slices = g.reflect ? 2 * g.n : g.n;
    const da     = p.TWO_PI / slices;
    const tp1    = p1(), tp2 = p2();

    const cx  = texCenter.x / img.width,  cy  = texCenter.y / img.height;
    const p1x = tp1.x       / img.width,  p1y = tp1.y       / img.height;
    const p2x = tp2.x       / img.width,  p2y = tp2.y       / img.height;

    p.noStroke();
    p.texture(img);
    p.beginShape(p.TRIANGLES);
    for (let k = 0; k < slices; k++) {
      const mirror    = g.reflect && (k % 2 === 1);
      const [uax,uay] = mirror ? [p2x, p2y] : [p1x, p1y];
      const [ubx,uby] = mirror ? [p1x, p1y] : [p2x, p2y];
      p.vertex(0,                           0,                          cx,  cy );
      p.vertex(triSize * p.cos(k      * da), triSize * p.sin(k      * da), uax, uay);
      p.vertex(triSize * p.cos((k+1)  * da), triSize * p.sin((k+1)  * da), ubx, uby);
    }
    p.endShape();
  }

  // ── Grid ─────────────────────────────────────────────────────────────────

  function drawGrid() {
    const key = activeGroup + '|' + triSize.toFixed(1) + '|' + p.width + '|' + p.height;
    if (key !== cachedGridKey) {
      cachedGrid    = GROUPS[activeGroup].grid === 'sq' ? sqGridPts() : hexGridPts();
      cachedGridKey = key;
    }
    for (const { x, y } of cachedGrid) {
      p.push(); p.translate(x, y); drawTile(); p.pop();
    }
  }

  function hexGridPts() {
    const dx = 1.5          * triSize;
    const dy = Math.sqrt(3) * triSize;
    const cols = Math.ceil(p.width  / dx) + 4;
    const rows = Math.ceil(p.height / dy) + 4;
    const pts = [];
    for (let j = 0; j < cols; j++)
      for (let i = 0; i < rows; i++)
        pts.push({
          x: -(cols - 1) / 2 * dx + dx * j,
          y: -(rows - 1) / 2 * dy + dy * i + sin60 * triSize * (j % 2),
        });
    return pts;
  }

  function sqGridPts() {
    const d    = 2 * triSize;
    const cols = Math.ceil(p.width  / d) + 4;
    const rows = Math.ceil(p.height / d) + 4;
    const pts  = [];
    for (let j = 0; j < cols; j++)
      for (let i = 0; i < rows; i++)
        pts.push({
          x: -(cols - 1) / 2 * d + d * j,
          y: -(rows - 1) / 2 * d + d * i,
        });
    return pts;
  }

  // ── Motion modes ─────────────────────────────────────────────────────────

  function updateMotion(dt) {
    if      (motionMode === 'rotate') motionRotate(dt);
    else if (motionMode === 'float')  motionFloat(dt);
    else if (motionMode === 'trace')  motionTrace(dt);
  }

  function motionRotate(dt) {
    texAngle += p.radians(ROTATE_SPEED * dt);
  }

  function motionFloat(dt) {
    noiseT += dt * 0.18;
    texCenter.x += (p.noise(noiseT, 0)   - 0.5) * img.width  * 0.02;
    texCenter.y += (p.noise(noiseT, 100) - 0.5) * img.height * 0.02;
    texCenter.x  = p.constrain(texCenter.x, img.width  * 0.1, img.width  * 0.9);
    texCenter.y  = p.constrain(texCenter.y, img.height * 0.1, img.height * 0.9);
    texAngle    += (p.noise(noiseT, 200) - 0.5) * 0.06;
    texRadius   += (p.noise(noiseT, 300) - 0.5) * Math.min(img.width, img.height) * 0.008;
    texRadius    = p.constrain(texRadius,
      Math.min(img.width, img.height) * 0.08,
      Math.min(img.width, img.height) * 0.48);
  }

  function motionTrace(dt) {
    const mx = p.map(p.mouseX, 0, p.width,  0, img.width);
    const my = p.map(p.mouseY, 0, p.height, 0, img.height);
    if (traceRec) {
      const last = tracePath[tracePath.length - 1];
      if (!last || p.dist(mx, my, last.x, last.y) > img.width * 0.005)
        tracePath.push({ x: mx, y: my });
      texCenter.x = p.lerp(texCenter.x, mx, 0.15);
      texCenter.y = p.lerp(texCenter.y, my, 0.15);
    } else if (tracePlay && tracePath.length > 1) {
      traceIdx = (traceIdx + dt * 12) % tracePath.length;
      const pt = tracePath[Math.floor(traceIdx)];
      texCenter.x = p.lerp(texCenter.x, pt.x, 0.12);
      texCenter.y = p.lerp(texCenter.y, pt.y, 0.12);
    } else {
      texCenter.x = p.lerp(texCenter.x, mx, 0.1);
      texCenter.y = p.lerp(texCenter.y, my, 0.1);
    }
    texAngle += p.radians(ROTATE_SPEED * 0.18 * dt);
  }

  // ── Inset ────────────────────────────────────────────────────────────────

  function drawInset() {
    const insetH = INSET_W * img.height / img.width;
    const insetX = p.width  / 2 - INSET_W - 12;
    const insetY = -p.height / 2 + 12;
    const s      = INSET_W / img.width;
    const tp1 = p1(), tp2 = p2();
    p.push();
    p.noStroke();
    p.image(img, insetX, insetY, INSET_W, insetH);
    p.noFill();
    p.stroke(255, 50, 50);
    p.strokeWeight(1.5);
    p.triangle(
      insetX + texCenter.x * s, insetY + texCenter.y * s,
      insetX + tp1.x       * s, insetY + tp1.y       * s,
      insetX + tp2.x       * s, insetY + tp2.y       * s);
    if (tracePath.length > 1) {
      p.stroke(255, 200, 50, 160);
      p.strokeWeight(1);
      p.noFill();
      p.beginShape();
      for (const pt of tracePath)
        p.vertex(insetX + pt.x * s, insetY + pt.y * s);
      p.endShape();
    }
    p.pop();
  }

  // ── Fallback texture ─────────────────────────────────────────────────────

  function makeProceduralTexture(w, h) {
    const g = p.createGraphics(w, h);
    g.background(20, 30, 60);
    g.noStroke();
    for (let i = 0; i < 300; i++) {
      g.fill(p.random(80,255), p.random(40,200), p.random(80,255), p.random(140,220));
      g.ellipse(p.random(w), p.random(h), p.random(20,110), p.random(20,110));
    }
    return g;
  }
}
