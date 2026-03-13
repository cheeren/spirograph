// sketch_kali.js  (p5.js instance mode)
// Kaleidoscope — p5.js port of C++/SFML original by Cinda Heeren (2015)
// Mount with: new p5(kaliSketch, containerElement)
// p.setImage(path) — switch source texture

function kaliSketch(p) {
  const SPEED = 25;   // rotation speed, degrees/second

  let img, sin60;
  let texCenter, texP1, texP2;
  let lastTime, triSize;
  let cols, rows;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function doRotation(about, pt, angleDeg) {
    const a = p.radians(angleDeg);
    const c = p.cos(a), s = p.sin(a);
    const dx = pt.x - about.x, dy = pt.y - about.y;
    return p.createVector(dx * c + dy * s + about.x,
                          dy * c - dx * s + about.y);
  }

  function rollTexture(angleDeg) {
    texP1 = doRotation(texCenter, texP1, angleDeg);
    texP2 = doRotation(texCenter, texP2, angleDeg);
  }

  function computeLayout() {
    triSize = p.height / (Math.sqrt(3) * 5.5);
    cols = Math.ceil(p.width  / (1.5   * triSize)) + 4;
    rows = Math.ceil(p.height / (Math.sqrt(3) * triSize)) + 3;
  }

  function initTexture() {
    if (!img) return;
    const r = Math.min(img.width, img.height) * 0.42;
    texCenter = p.createVector(img.width / 2, img.height / 2);
    texP1     = p.createVector(img.width / 2 + r,     img.height / 2);
    texP2     = p.createVector(img.width / 2 + r / 2, img.height / 2 + sin60 * r);
  }

  function makeProceduralTexture(w, h) {
    const g = p.createGraphics(w, h);
    g.background(20, 30, 60);
    g.noStroke();
    for (let i = 0; i < 300; i++) {
      g.fill(p.random(80, 255), p.random(40, 200), p.random(80, 255), p.random(140, 220));
      g.ellipse(p.random(w), p.random(h), p.random(20, 110), p.random(20, 110));
    }
    return g;
  }

  function drawSnowflake() {
    p.noStroke();
    p.texture(img);

    const cx  = texCenter.x / img.width,  cy  = texCenter.y / img.height;
    const p1x = texP1.x     / img.width,  p1y = texP1.y     / img.height;
    const p2x = texP2.x     / img.width,  p2y = texP2.y     / img.height;

    const rim = [
      [ triSize,       0              ],
      [ triSize / 2,   sin60 * triSize],
      [-triSize / 2,   sin60 * triSize],
      [-triSize,       0              ],
      [-triSize / 2,  -sin60 * triSize],
      [ triSize / 2,  -sin60 * triSize],
    ];

    p.beginShape(p.TRIANGLES);
    for (let k = 0; k < 6; k++) {
      const next = (k + 1) % 6;
      const [uax, uay] = k % 2 === 0 ? [p1x, p1y] : [p2x, p2y];
      const [ubx, uby] = k % 2 === 0 ? [p2x, p2y] : [p1x, p1y];
      p.vertex(0,            0,            cx,  cy );
      p.vertex(rim[k][0],    rim[k][1],    uax, uay);
      p.vertex(rim[next][0], rim[next][1], ubx, uby);
    }
    p.endShape();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  p.setImage = function(path) {
    p.loadImage(path, newImg => { img = newImg; initTexture(); });
  };

  // -------------------------------------------------------------------------
  // p5 lifecycle
  // -------------------------------------------------------------------------

  p.preload = function() {
    img = p.loadImage('wildflowers.jpg', null, () => { img = null; });
  };

  p.setup = function() {
    sin60 = Math.sqrt(3) / 2;
    const el = p.canvas ? p.canvas.parentElement
                        : document.getElementById('canvas-container');
    p.createCanvas(el.offsetWidth, el.offsetHeight, p.WEBGL);
    p.textureMode(p.NORMAL);
    p.textureWrap(p.CLAMP);

    if (!img) img = makeProceduralTexture(600, 400);

    computeLayout();
    initTexture();
    lastTime = p.millis();
  };

  p.draw = function() {
    if (!img) return;
    p.background(18, 20, 24);

    const now   = p.millis();
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    rollTexture(SPEED * delta);

    const gridW = 1.5        * triSize * (cols - 1);
    const gridH = Math.sqrt(3) * triSize * (rows - 1);

    for (let j = 0; j < cols; j++) {
      for (let i = 0; i < rows; i++) {
        const x = -gridW / 2 + 1.5        * triSize * j;
        const y = -gridH / 2 + Math.sqrt(3) * triSize * i + sin60 * triSize * (j % 2);
        p.push();
        p.translate(x, y);
        drawSnowflake();
        p.pop();
      }
    }

    // Image inset + rotating red triangle (top-right corner)
    const INSET_W  = 180;
    const insetH   = INSET_W * img.height / img.width;
    const insetX   = p.width  / 2 - INSET_W - 12;
    const insetY   = -p.height / 2 + 12;
    const insetS   = INSET_W / img.width;

    p.push();
    p.noStroke();
    p.image(img, insetX, insetY, INSET_W, insetH);
    p.noFill();
    p.stroke(255, 0, 0);
    p.strokeWeight(2);
    p.triangle(
      insetX + texCenter.x * insetS, insetY + texCenter.y * insetS,
      insetX + texP1.x     * insetS, insetY + texP1.y     * insetS,
      insetX + texP2.x     * insetS, insetY + texP2.y     * insetS
    );
    p.pop();
  };

  p.windowResized = function() {
    const el = p.canvas ? p.canvas.parentElement
                        : document.getElementById('canvas-container');
    p.resizeCanvas(el.offsetWidth, el.offsetHeight);
    computeLayout();
  };
}
