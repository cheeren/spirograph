// spiro_core.js  (instance mode)
// Call makeSpiroCore(p) inside a p5 instance sketch to get
// { igcd, curvePeriod, validNumerators, Spiro, buildCurves }.
//
// Hypotrochoid:  x = (R-r)cos(t) + d·cos((R-r)/r · t)
//                y = (R-r)sin(t) − d·sin((R-r)/r · t)
// Epitrochoid:   x = (R+r)cos(t) − d·cos((R+r)/r · t)
//                y = (R+r)sin(t) − d·sin((R+r)/r · t)
//
// r/R = num/q (lowest terms) → petal count = q, tMax = 2π·num
// d < r → smooth/braid  |  d > r → loopy/snowflake
// Inner radius = |arm − d|, outer = arm + d  (arm = R ± r)
// Quality check: retry if every curve has |arm−d|/(arm+d) > 0.25

function makeSpiroCore(p) {

  function igcd(a, b) {
    a = Math.round(Math.abs(a));
    b = Math.round(Math.abs(b));
    return b === 0 ? a : igcd(b, a % b);
  }

  function curvePeriod(R, r) { return p.TWO_PI * r / igcd(R, r); }

  function validNumerators(q, maxP = 4) {
    const out = [];
    for (let num = 1; num <= Math.min(maxP, q - 1); num++) {
      if (igcd(num, q) === 1) out.push(num);
    }
    return out;
  }

  class Spiro {
    constructor(R, r, d, isEpi = false) {
      this.R     = R;
      this.r     = r;
      this.d     = d;
      this.tMax  = curvePeriod(R, r);
      this.isEpi = isEpi;
      this.done  = false;
      this.pts   = [this._xy(0)];
    }

    _xy(t) {
      if (this.isEpi) {
        const k = (this.R + this.r) / this.r;
        return [(this.R + this.r) * p.cos(t) - this.d * p.cos(k * t),
                (this.R + this.r) * p.sin(t) - this.d * p.sin(k * t)];
      } else {
        const k = (this.R - this.r) / this.r;
        return [(this.R - this.r) * p.cos(t) + this.d * p.cos(k * t),
                (this.R - this.r) * p.sin(t) - this.d * p.sin(k * t)];
      }
    }

    advance(t) {
      if (this.done) return null;
      const pt = this._xy(Math.min(t, this.tMax));
      this.pts.push(pt);
      if (t >= this.tMax) this.done = true;
      return pt;
    }
  }

  function buildCurves(S) {
    const g = Math.floor(p.random(3, 8));
    let curves;
    let attempts = 0;
    do {
      curves = [];
      for (let i = 0; i < 3; i++) {
        const m   = Math.floor(p.random(1, 5));
        const q   = g * m;
        const R   = Math.round(p.random(0.15 * S, 0.85 * S) / q) * q;
        const num = p.random(validNumerators(q));
        const r   = R * num / q;
        const isEpi = p.random() < 0.1;
        const d = p.random() < 0.4
          ? p.random(0.25 * r, 0.92 * r)
          : p.random(1.08 * r, 2.2  * r);
        curves.push(new Spiro(R, r, d, isEpi));
      }
      attempts++;
    } while (attempts < 20 && curves.every(c => {
      const arm = c.isEpi ? c.R + c.r : c.R - c.r;
      return Math.abs(arm - c.d) / (arm + c.d) > 0.25;
    }));
    return curves;
  }

  return { igcd, curvePeriod, validNumerators, Spiro, buildCurves };
}
