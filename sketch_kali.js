// sketch_kali.js  (p5.js instance mode)
// Kaleidoscope — wallpaper-group symmetries, animated texture + probe inset.
// Mount with: new p5(kaliSketch, containerElement)
// Public API: p.setImage(path)  p.setGroup(key)  p.setMotion(mode)

function kaliSketch(p) {

  const GROUPS = {
    p3:   { grid: 'hex' },
    p3m1: { grid: 'hex' },
    p31m: { grid: 'hex' },
    p4g:  { grid: 'sq'  },
    p4m:  { grid: 'sq'  },
    p6:   { grid: 'hex' },
    p6m:  { grid: 'hex' },
  };

  let activeGroup = 'p6m';
  let triSize;
  let cachedGrid = null, cachedGridKey = '';
  let currentImg  = null;
  let motionMode  = 'rotate';
  let probe = { cx: 0, cy: 0, angle: 0, scale: 1, vx: 1, vy: 0.7 };

  // ── Public API ────────────────────────────────────────────────────────────

  p.setImage = function(src) {
    p.loadImage(src, img => {
      currentImg = img;
      resetProbe();
      p.loop();
    });
  };

  p.setGroup = function(key) {
    activeGroup = key;
    computeTriSize();
    cachedGrid = null;
    if (!currentImg) p.redraw();
  };

  p.setMotion = function(mode) {
    motionMode = mode;
  };

  // ── p5 lifecycle ──────────────────────────────────────────────────────────

  p.preload = function() {
    p.loadImage('wildflowers.jpg', img => { currentImg = img; }, () => {});
  };

  p.setup = function() {
    const sidebar = document.getElementById('sidebar');
    const cnv = p.createCanvas(
      p.windowWidth - (sidebar ? sidebar.offsetWidth : 0),
      p.windowHeight,
      p.WEBGL
    );
    cnv.parent('canvas-container');
    computeTriSize();
    p.textureMode(p.NORMAL);
    if (currentImg) { resetProbe(); p.loop(); }
    else p.noLoop();
  };

  p.draw = function() {
    p.background(18, 20, 24);
    if (currentImg) animateProbe();
    drawGrid();
    if (currentImg) drawProbeInset();
  };

  p.windowResized = function() {
    const sidebar = document.getElementById('sidebar');
    p.resizeCanvas(
      p.windowWidth - (sidebar ? sidebar.offsetWidth : 0),
      p.windowHeight
    );
    computeTriSize();
    cachedGrid = null;
    if (currentImg) resetProbe(); else p.redraw();
  };

  // ── Tile size ─────────────────────────────────────────────────────────────

  function computeTriSize() {
    triSize = GROUPS[activeGroup].grid === 'sq'
      ? p.height / (p.sqrt(2) * 7)
      : p.height / (p.sqrt(3) * 5);
  }

  // ── Probe ─────────────────────────────────────────────────────────────────

  function resetProbe() {
    if (!currentImg) return;
    const s     = p.min(currentImg.width, currentImg.height);
    probe.cx    = currentImg.width  / 2;
    probe.cy    = currentImg.height / 2;
    probe.angle = 0;
    probe.scale = s * 0.25 / triSize;
    probe.vx    = s * 0.0005;
    probe.vy    = s * 0.00035;
  }

  function animateProbe() {
    if (motionMode === 'rotate') {
      probe.angle += 0.008;
    } else if (motionMode === 'float') {
      probe.cx += probe.vx;
      probe.cy += probe.vy;
      const m = probe.scale * triSize * 1.5;
      if (probe.cx < m || probe.cx > currentImg.width  - m) probe.vx *= -1;
      if (probe.cy < m || probe.cy > currentImg.height - m) probe.vy *= -1;
      probe.cx = p.constrain(probe.cx, m, currentImg.width  - m);
      probe.cy = p.constrain(probe.cy, m, currentImg.height - m);
    }
  }

  // UV for fundamental-domain coords (fdx, fdy).
  // mirror=true flips x, producing the reflected kaleidoscope copy.
  function fuv(fdx, fdy, mirror) {
    const x  = mirror ? -fdx : fdx;
    const px = probe.cx + (p.cos(probe.angle)*x   - p.sin(probe.angle)*fdy) * probe.scale;
    const py = probe.cy + (p.sin(probe.angle)*x   + p.cos(probe.angle)*fdy) * probe.scale;
    return [px / currentImg.width, py / currentImg.height];
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  function drawGrid() {
    const key = activeGroup + '|' + triSize.toFixed(2) + '|' + p.width + '|' + p.height;
    if (key !== cachedGridKey) {
      cachedGrid    = GROUPS[activeGroup].grid === 'sq' ? sqGridPts() : hexGridPts();
      cachedGridKey = key;
    }

    if (currentImg) {
      p.texture(currentImg);
      p.noStroke();
      p.beginShape(p.TRIANGLES);
      for (const { x, y } of cachedGrid) addTileVerts(x, y);
      p.endShape();
    } else {
      for (const { x, y } of cachedGrid) {
        p.push(); p.translate(x, y); drawTileDebug(); p.pop();
      }
    }
  }

  function hexGridPts() {
    const dx   = 1.5       * triSize;
    const dy   = p.sqrt(3) * triSize;
    const stag = p.sqrt(3) * triSize * 0.5;
    const cols = p.ceil(p.width  / dx) + 4;
    const rows = p.ceil(p.height / dy) + 4;
    const pts  = [];
    for (let j = 0; j < cols; j++)
      for (let i = 0; i < rows; i++)
        pts.push({
          x: -(cols - 1) / 2 * dx + dx * j,
          y: -(rows - 1) / 2 * dy + dy * i + stag * (j % 2),
        });
    return pts;
  }

  function sqGridPts() {
    const d    = triSize * p.sqrt(2);
    const cols = p.ceil(p.width  / d) + 4;
    const rows = p.ceil(p.height / d) + 4;
    const pts  = [];
    for (let j = 0; j < cols; j++)
      for (let i = 0; i < rows; i++)
        pts.push({
          x: -(cols - 1) / 2 * d + d * j,
          y: -(rows - 1) / 2 * d + d * i,
        });
    return pts;
  }

  // ── Texture vertex dispatch ───────────────────────────────────────────────

  function addTileVerts(lx, ly) {
    switch (activeGroup) {
      case 'p3':   addVerts_p3(lx, ly);                    break;
      case 'p3m1': addVerts_fan(lx, ly, 6, p.PI/3, true);  break;
      case 'p31m': addVerts_p31m(lx, ly);                   break;
      case 'p4g':  addVerts_sq(lx, ly, false);             break;
      case 'p4m':  addVerts_sq(lx, ly, true);              break;
      case 'p6':   addVerts_hex12(lx, ly, false);          break;
      case 'p6m':  addVerts_hex12(lx, ly, true);           break;
    }
  }

  // ── p3 : 3 rhombuses ─────────────────────────────────────────────────────
  function addVerts_p3(lx, ly) {
    const T   = triSize;
    const sq3 = p.sqrt(3);
    const [uO,vO] = fuv(0,    0,        false);
    const [uA,vA] = fuv(T,    0,        false);
    const [uM,vM] = fuv(T/2,  T*sq3/2,  false);
    const [uC,vC] = fuv(-T/2, T*sq3/2,  false);

    for (let k = 0; k < 3; k++) {
      const ax = T * p.cos(k * p.TWO_PI / 3),          ay = T * p.sin(k * p.TWO_PI / 3);
      const bx = T * p.cos((k*2+1) * p.PI / 3),        by = T * p.sin((k*2+1) * p.PI / 3);
      const cx = T * p.cos(((k*2+2)%6) * p.PI / 3),    cy = T * p.sin(((k*2+2)%6) * p.PI / 3);

      p.vertex(lx,    ly,    uO, vO);
      p.vertex(lx+ax, ly+ay, uA, vA);
      p.vertex(lx+bx, ly+by, uM, vM);

      p.vertex(lx,    ly,    uO, vO);
      p.vertex(lx+bx, ly+by, uM, vM);
      p.vertex(lx+cx, ly+cy, uC, vC);
    }
  }

  // ── generic uniform-radius fan (p3m1) ────────────────────────────────────
  function addVerts_fan(lx, ly, nSlices, da, useMirror) {
    const T = triSize;
    const [uO,vO] = fuv(0,           0,           false);
    const [uA,vA] = fuv(T,           0,           false);
    const [uB,vB] = fuv(T*p.cos(da), T*p.sin(da), false);

    for (let k = 0; k < nSlices; k++) {
      const a0 = k * da, a1 = (k+1) * da;
      const ax = T * p.cos(a0), ay = T * p.sin(a0);
      const bx = T * p.cos(a1), by = T * p.sin(a1);
      const mirror = useMirror && (k % 2 === 1);
      const [u1,v1] = mirror ? [uB,vB] : [uA,vA];
      const [u2,v2] = mirror ? [uA,vA] : [uB,vB];

      p.vertex(lx,    ly,    uO, vO);
      p.vertex(lx+ax, ly+ay, u1, v1);
      p.vertex(lx+bx, ly+by, u2, v2);
    }
  }

  // ── p31m : centroid-subdivided equilaterals ───────────────────────────────
  function addVerts_p31m(lx, ly) {
    const T   = triSize;
    const sq3 = p.sqrt(3);

    for (let k = 0; k < 6; k++) {
      const a0  = k * p.PI / 3, a1 = (k+1) * p.PI / 3;
      const vx0 = T * p.cos(a0), vy0 = T * p.sin(a0);
      const vx1 = T * p.cos(a1), vy1 = T * p.sin(a1);
      const ecx = (vx0 + vx1) / 3, ecy = (vy0 + vy1) / 3;

      const mirror = (k % 2 === 1);
      const [uO,vO] = fuv(0,   0,        mirror);
      const [uA,vA] = fuv(T,   0,        mirror);
      const [uB,vB] = fuv(T/2, T*sq3/2,  mirror);
      const [uC,vC] = fuv(T/2, T*sq3/6,  mirror);

      p.vertex(lx,     ly,     uO, vO);
      p.vertex(lx+vx0, ly+vy0, uA, vA);
      p.vertex(lx+ecx, ly+ecy, uC, vC);

      p.vertex(lx+vx0, ly+vy0, uA, vA);
      p.vertex(lx+vx1, ly+vy1, uB, vB);
      p.vertex(lx+ecx, ly+ecy, uC, vC);

      p.vertex(lx+vx1, ly+vy1, uB, vB);
      p.vertex(lx,     ly,     uO, vO);
      p.vertex(lx+ecx, ly+ecy, uC, vC);
    }
  }

  // ── p4g / p4m : 8 right (45/45/90) triangles, alternating radii ──────────
  function addVerts_sq(lx, ly, useMirror) {
    const T  = triSize;
    const ri = T / p.sqrt(2);
    const [uO,vO] = fuv(0,  0,  false);
    const [uA,vA] = fuv(ri, 0,  false);
    const [uB,vB] = fuv(ri, ri, false);

    for (let k = 0; k < 8; k++) {
      const ak = k * p.PI / 4, an = (k+1) * p.PI / 4;
      const rk = (k     % 2 === 0) ? ri : T;
      const rn = ((k+1) % 2 === 0) ? ri : T;
      const ax = rk * p.cos(ak), ay = rk * p.sin(ak);
      const bx = rn * p.cos(an), by = rn * p.sin(an);
      const mirror = useMirror && (k % 2 === 1);
      const [u1,v1] = mirror ? [uB,vB] : [uA,vA];
      const [u2,v2] = mirror ? [uA,vA] : [uB,vB];

      p.vertex(lx,    ly,    uO, vO);
      p.vertex(lx+ax, ly+ay, u1, v1);
      p.vertex(lx+bx, ly+by, u2, v2);
    }
  }

  // ── p6 / p6m : 12 right (30/60/90) triangles, alternating radii ──────────
  function addVerts_hex12(lx, ly, useMirror) {
    const T  = triSize;
    const rm = T * p.sqrt(3) / 2;
    const [uO,vO] = fuv(0,      0,             false);
    const [uA,vA] = fuv(T,      0,             false);
    const [uB,vB] = fuv(3*T/4,  T*p.sqrt(3)/4, false);

    for (let k = 0; k < 12; k++) {
      const ak = k * p.PI / 6, an = (k+1) * p.PI / 6;
      const rk = (k     % 2 === 0) ? T  : rm;
      const rn = ((k+1) % 2 === 0) ? T  : rm;
      const ax = rk * p.cos(ak), ay = rk * p.sin(ak);
      const bx = rn * p.cos(an), by = rn * p.sin(an);
      const mirror = useMirror && (k % 2 === 1);
      const [u1,v1] = mirror ? [uB,vB] : [uA,vA];
      const [u2,v2] = mirror ? [uA,vA] : [uB,vB];

      p.vertex(lx,    ly,    uO, vO);
      p.vertex(lx+ax, ly+ay, u1, v1);
      p.vertex(lx+bx, ly+by, u2, v2);
    }
  }

  // ── Probe inset ───────────────────────────────────────────────────────────

  function drawProbeInset() {
    const margin = 12;
    const maxH   = 180;
    const aspect = currentImg.width / currentImg.height;
    const insetH = maxH;
    const insetW = p.round(maxH * aspect);

    const x1 = p.width  / 2 - margin;
    const y1 = p.height / 2 - margin;
    const x0 = x1 - insetW;
    const y0 = y1 - insetH;

    // Source image
    p.texture(currentImg);
    p.noStroke();
    p.beginShape(p.TRIANGLES);
      p.vertex(x0, y0, 0, 0);  p.vertex(x1, y0, 1, 0);  p.vertex(x1, y1, 1, 1);
      p.vertex(x0, y0, 0, 0);  p.vertex(x1, y1, 1, 1);  p.vertex(x0, y1, 0, 1);
    p.endShape();

    const sx   = insetW / currentImg.width;
    const sy   = insetH / currentImg.height;
    const cosA = p.cos(probe.angle);
    const sinA = p.sin(probe.angle);

    const fdXY = (fdx, fdy) => {
      const ix = probe.cx + (cosA*fdx - sinA*fdy) * probe.scale;
      const iy = probe.cy + (sinA*fdx + cosA*fdy) * probe.scale;
      return [x0 + ix*sx, y0 + iy*sy];
    };

    // Border
    p.noFill();
    p.stroke(180, 180, 180, 120);
    p.strokeWeight(1);
    p.line(x0,y0,x1,y0); p.line(x1,y0,x1,y1);
    p.line(x1,y1,x0,y1); p.line(x0,y1,x0,y0);

    // FD shape in red
    const T   = triSize;
    const sq3 = p.sqrt(3);
    let verts;
    switch (activeGroup) {
      case 'p3':
        verts = [[0,0],[T,0],[T/2,T*sq3/2],[-T/2,T*sq3/2]]; break;
      case 'p3m1':
        verts = [[0,0],[T,0],[T/2,T*sq3/2]];                 break;
      case 'p31m':
        verts = [[0,0],[T,0],[T/2,T*sq3/6]];                 break;
      case 'p4g': case 'p4m': {
        const ri = T / p.sqrt(2);
        verts = [[0,0],[ri,0],[ri,ri]];                       break;
      }
      case 'p6': case 'p6m':
        verts = [[0,0],[T,0],[3*T/4,T*sq3/4]];               break;
      default:
        verts = [[0,0],[T,0],[T/2,T*sq3/2]];
    }

    p.stroke(255, 60, 60);
    p.strokeWeight(1.5);
    const pts = verts.map(([fx,fy]) => fdXY(fx, fy));
    for (let i = 0; i < pts.length; i++) {
      const [ax,ay] = pts[i];
      const [bx,by] = pts[(i+1) % pts.length];
      p.line(ax, ay, bx, by);
    }
    const [pcx, pcy] = fdXY(0, 0);
    p.strokeWeight(4);
    p.point(pcx, pcy);
  }

  // ── Debug tile dispatch (shown when no image loaded) ─────────────────────

  function drawTileDebug() {
    switch (activeGroup) {
      case 'p3':   drawDebug_p3();          break;
      case 'p3m1': drawDebug_p3m1();        break;
      case 'p31m': drawDebug_p31m();        break;
      case 'p4g':  drawDebug_sq(false);     break;
      case 'p4m':  drawDebug_sq(true);      break;
      case 'p6':   drawDebug_hex12(false);  break;
      case 'p6m':  drawDebug_hex12(true);   break;
    }
  }

  function drawDebug_p3() {
    const T = triSize;
    for (let k = 0; k < 3; k++) {
      const ax = T*p.cos(k*p.TWO_PI/3),        ay = T*p.sin(k*p.TWO_PI/3);
      const bx = T*p.cos((k*2+1)*p.PI/3),      by = T*p.sin((k*2+1)*p.PI/3);
      const cx = T*p.cos(((k*2+2)%6)*p.PI/3),  cy = T*p.sin(((k*2+2)%6)*p.PI/3);
      if (k===0) { p.noStroke(); p.fill(200,180,40,120); p.triangle(0,0,ax,ay,bx,by); p.triangle(0,0,bx,by,cx,cy); }
      p.stroke(60,80,140); p.strokeWeight(0.8); p.noFill();
      p.line(0,0,ax,ay); p.line(ax,ay,bx,by); p.line(bx,by,cx,cy); p.line(cx,cy,0,0);
      p.push(); p.translate(bx/2,by/2); p.rotate(p.atan2(by/2,bx/2)+p.HALF_PI); drawF(T*0.11,false); p.pop();
    }
  }

  function drawDebug_p3m1() {
    const T = triSize;
    for (let k = 0; k < 6; k++) {
      const mirror=(k%2===1), a0=k*p.PI/3, a1=(k+1)*p.PI/3;
      const ax=T*p.cos(a0),ay=T*p.sin(a0),bx=T*p.cos(a1),by=T*p.sin(a1);
      if (k===0) { p.noStroke(); p.fill(200,180,40,120); p.triangle(0,0,ax,ay,bx,by); }
      p.stroke(60,80,140); p.strokeWeight(0.8); p.noFill();
      p.line(0,0,ax,ay); p.line(ax,ay,bx,by);
      const mid=(a0+a1)/2;
      p.push(); p.translate(T*0.48*p.cos(mid),T*0.48*p.sin(mid)); p.rotate(mid+p.HALF_PI);
      if (mirror) p.scale(-1,1); drawF(T*0.13,mirror); p.pop();
    }
  }

  function drawDebug_p31m() {
    const T=triSize; let first=true;
    for (let k=0;k<6;k++) {
      const a0=k*p.PI/3,a1=(k+1)*p.PI/3;
      const vx0=T*p.cos(a0),vy0=T*p.sin(a0),vx1=T*p.cos(a1),vy1=T*p.sin(a1);
      const ecx=(vx0+vx1)/3,ecy=(vy0+vy1)/3;
      const mirror=(k%2===1);
      for (const [x0,y0,x1,y1,x2,y2] of [[0,0,vx0,vy0,ecx,ecy],[vx0,vy0,vx1,vy1,ecx,ecy],[vx1,vy1,0,0,ecx,ecy]]) {
        if (first) { p.noStroke(); p.fill(200,180,40,120); p.triangle(x0,y0,x1,y1,x2,y2); first=false; }
        p.stroke(60,80,140); p.strokeWeight(0.8); p.noFill();
        p.line(x0,y0,x1,y1); p.line(x1,y1,x2,y2); p.line(x2,y2,x0,y0);
        p.push(); p.translate((x0+x1+x2)/3,(y0+y1+y2)/3);
        p.rotate(p.atan2((y0+y1+y2)/3,(x0+x1+x2)/3)+p.HALF_PI);
        if (mirror) p.scale(-1,1); drawF(T*0.07,mirror); p.pop();
      }
    }
  }

  function drawDebug_sq(useMirror) {
    const T=triSize,ri=T/p.sqrt(2);
    for (let k=0;k<8;k++) {
      const ak=k*p.PI/4,an=(k+1)*p.PI/4;
      const rk=(k%2===0)?ri:T,rn=((k+1)%2===0)?ri:T;
      const ax=rk*p.cos(ak),ay=rk*p.sin(ak),bx=rn*p.cos(an),by=rn*p.sin(an);
      const mirror=useMirror&&(k%2===1);
      if (k===0) { p.noStroke(); p.fill(200,180,40,120); p.triangle(0,0,ax,ay,bx,by); }
      p.stroke(60,80,140); p.strokeWeight(0.8); p.noFill();
      p.line(0,0,ax,ay); p.line(ax,ay,bx,by);
      p.push(); p.translate((ax+bx)/3,(ay+by)/3); p.rotate(p.atan2((ay+by)/3,(ax+bx)/3)+p.HALF_PI);
      if (mirror) p.scale(-1,1); drawF(T*0.10,mirror); p.pop();
    }
  }

  function drawDebug_hex12(useMirror) {
    const T=triSize,rm=T*p.sqrt(3)/2;
    for (let k=0;k<12;k++) {
      const ak=k*p.PI/6,an=(k+1)*p.PI/6;
      const rk=(k%2===0)?T:rm,rn=((k+1)%2===0)?T:rm;
      const ax=rk*p.cos(ak),ay=rk*p.sin(ak),bx=rn*p.cos(an),by=rn*p.sin(an);
      const mirror=useMirror&&(k%2===1);
      if (k===0) { p.noStroke(); p.fill(200,180,40,120); p.triangle(0,0,ax,ay,bx,by); }
      p.stroke(60,80,140); p.strokeWeight(0.8); p.noFill();
      p.line(0,0,ax,ay); p.line(ax,ay,bx,by);
      p.push(); p.translate((ax+bx)/3,(ay+by)/3); p.rotate(p.atan2((ay+by)/3,(ax+bx)/3)+p.HALF_PI);
      if (mirror) p.scale(-1,1); drawF(T*0.09,mirror); p.pop();
    }
  }

  function drawF(sz, mirrored) {
    const c = mirrored ? p.color(255,100,80) : p.color(80,180,255);
    p.stroke(c); p.strokeWeight(p.max(1,sz*0.22)); p.noFill();
    const h=sz*0.85,w=sz*0.6;
    p.line(0,h,0,-h); p.line(0,-h,w,-h); p.line(0,-h*0.1,w*0.75,-h*0.1);
  }

} // end kaliSketch
