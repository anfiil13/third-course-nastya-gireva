tion (global) {
  "use strict";

  function plot8(cx, cy, x, y) {
    const pts = [
      [cx + x, cy + y],
      [cx + y, cy + x],
      [cx - x, cy + y],
      [cx - y, cy + x],
      [cx + x, cy - y],
      [cx + y, cy - x],
      [cx - x, cy - y],
      [cx - y, cy - x],
    ];
    const seen = new Set();
    const out = [];
    for (const [px, py] of pts) {
      const key = px + "," + py;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([px, py]);
      }
    }
    return out;
  }

  function circleMidpointFull(cx, cy, r) {
    let x = 0;
    let y = r;
    let d = 1 - r;

    const steps = [];
    const pixels = [];
    const seen = new Set();

    let i = 0;
    while (x <= y) {
      const sx = x;
      const sy = y;
      const dBefore = d;

      for (const [px, py] of plot8(cx, cy, sx, sy)) {
        const key = px + "," + py;
        if (!seen.has(key)) {
          seen.add(key);
          pixels.push([px, py]);
        }
      }

      let variant;
      if (d < 0) {
        variant = "E";
        d += 2 * x + 3;
      } else {
        variant = "SE";
        d += 2 * (x - y) + 5;
        y -= 1;
      }

      steps.push({
        i,
        x: sx,
        y: sy,
        dBefore,
        variant,
        dAfter: d,
      });

      x += 1;
      i += 1;
    }

    return { steps, pixels };
  }

  function circleByFormula(cx, cy, r) {
    const pixels = [];
    const seen = new Set();
    const r2 = r * r;

    const xMax = Math.round(r / Math.SQRT2);

    let basePoints = 0;
    for (let x = 0; x <= xMax; x++) {
      const inside = r2 - x * x;
      if (inside < 0) break;
      const y = Math.round(Math.sqrt(inside));
      basePoints++;

      for (const [px, py] of plot8(cx, cy, x, y)) {
        const key = px + "," + py;
        if (!seen.has(key)) {
          seen.add(key);
          pixels.push([px, py]);
        }
      }
    }

    return { pixels, basePoints };
  }

  global.CircleAlgo = {
    plot8,
    circleMidpointFull,
    circleByFormula,
  };
})(window);