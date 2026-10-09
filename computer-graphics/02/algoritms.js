function lineDDA(x1, y1, x2, y2) {
  const pts = [];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps === 0) {
    pts.push({ x: x1, y: y1 });
    return pts;
  }

  const xInc = dx / steps;
  const yInc = dy / steps;

  let x = x1;
  let y = y1;

  for (let i = 0; i <= steps; i++) {
    pts.push({ x: Math.round(x), y: Math.round(y) });
    x += xInc;
    y += yInc;
  }
  return pts;
}


function lineBresenham(x1, y1, x2, y2) {
  const pts = [];

  x1 = Math.round(x1); y1 = Math.round(y1);
  x2 = Math.round(x2); y2 = Math.round(y2);

  let x = x1;
  let y = y1;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  const sx = x1 < x2 ? 1 : (x1 > x2 ? -1 : 0);
  const sy = y1 < y2 ? 1 : (y1 > y2 ? -1 : 0);

  let error = dy - dx;

  pts.push({ x, y });

  while (x !== x2 || y !== y2) {
    const error2 = 2 * error;

    if (error2 > -dx) { error -= dy; x += sx; }
    if (error2 <  dy) { error += dx; y += sy; }

    pts.push({ x, y });
  }
  return pts;
}

function lineBresenhamTraced(x1, y1, x2, y2) {
  x1 = Math.round(x1); y1 = Math.round(y1);
  x2 = Math.round(x2); y2 = Math.round(y2);

  let x = x1, y = y1;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : (x1 > x2 ? -1 : 0);
  const sy = y1 < y2 ? 1 : (y1 > y2 ? -1 : 0);

  let error = dy - dx;
  const rows = [];
  let step = 0;

  rows.push({
    step, x, y, error, error2: 2 * error,
    condX: false, condY: false, change: '—'
  });

  while (x !== x2 || y !== y2) {
    step++;
    const error2 = 2 * error;
    const condX = error2 > -dx;
    const condY = error2 <  dy;

    let change = '—';
    if (condX && condY) change = 'x, y';
    else if (condX) change = 'x';
    else if (condY) change = 'y';

    if (condX) { error -= dy; x += sx; }
    if (condY) { error += dx; y += sy; }

    rows.push({ step, x, y, error, error2, condX, condY, change });
  }
  return rows;
}

function countDDA(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return 1;
  const xInc = dx / steps, yInc = dy / steps;
  let x = x1, y = y1, n = 0;
  for (let i = 0; i <= steps; i++) {
    Math.round(x); Math.round(y);
    n++; x += xInc; y += yInc;
  }
  return n;
}

function countBresenham(x1, y1, x2, y2) {
  let x = x1 | 0, y = y1 | 0;
  const x2i = x2 | 0, y2i = y2 | 0;
  const dx = Math.abs(x2i - x), dy = Math.abs(y2i - y);
  const sx = x < x2i ? 1 : (x > x2i ? -1 : 0);
  const sy = y < y2i ? 1 : (y > y2i ? -1 : 0);
  let error = dy - dx, n = 1;
  while (x !== x2i || y !== y2i) {
    const e2 = 2 * error;
    if (e2 > -dx) { error -= dy; x += sx; }
    if (e2 <  dy) { error += dx; y += sy; }
    n++;
  }
  return n;
}

const keyOf = p => p.x + ',' + p.y;

function comparePixelSets(a, b) {
  const setA = new Set(a.map(keyOf));
  const setB = new Set(b.map(keyOf));

  const onlyA = a.filter(p => !setB.has(keyOf(p)));
  const onlyB = b.filter(p => !setA.has(keyOf(p)));

  return {
    onlyA,
    onlyB,
    identicalSet: onlyA.length === 0 && onlyB.length === 0,
    lenA: a.length,
    lenB: b.length
  };
}