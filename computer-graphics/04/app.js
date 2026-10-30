const INSIDE = 0; 
const LEFT   = 1; 
const RIGHT  = 2; 
const BOTTOM = 4; 
const TOP    = 8; 

const BIT_NAMES = [
  { bit: TOP,    name: 'TOP'    },
  { bit: BOTTOM, name: 'BOTTOM' },
  { bit: LEFT,   name: 'LEFT'   },
  { bit: RIGHT,  name: 'RIGHT'  },
];

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const els = {
  xmin: document.getElementById('xmin'),
  xmax: document.getElementById('xmax'),
  ymin: document.getElementById('ymin'),
  ymax: document.getElementById('ymax'),
  x1: document.getElementById('x1'),
  y1: document.getElementById('y1'),
  x2: document.getElementById('x2'),
  y2: document.getElementById('y2'),
  segFields: document.getElementById('segment-fields'),
  polyFields: document.getElementById('polyline-fields'),
  polyInputs: document.getElementById('poly-inputs'),
  winError: document.getElementById('window-error'),
  codes: document.getElementById('codes'),
  iterTable: document.querySelector('#iter-table tbody'),
  apply: document.getElementById('apply'),
  random: document.getElementById('random'),
  clear: document.getElementById('clear'),
  stAccept: document.getElementById('st-accept'),
  stClipped: document.getElementById('st-clipped'),
  stReject: document.getElementById('st-reject'),
};

function getCode(x, y, rect) {
  let code = INSIDE;

  if (x < rect.xmin) {
    code |= LEFT;
  } else if (x > rect.xmax) {
    code |= RIGHT;
  }

  if (y < rect.ymin) {
    code |= TOP;
  } else if (y > rect.ymax) {
    code |= BOTTOM;
  }

  return code;
}

function codeToBin(code) {
  return code.toString(2).padStart(4, '0');
}

function codeNames(code) {
  if (code === INSIDE) return 'INSIDE';
  return BIT_NAMES.filter(b => code & b.bit).map(b => b.name).join(' + ');
}

function clipLine(x1, y1, x2, y2, rect) {
  let code1 = getCode(x1, y1, rect);
  let code2 = getCode(x2, y2, rect);

  let accepted = false;
  let status = 'reject';
  const steps = [];
  let stepNo = 0;

  while (true) {
    steps.push({
      step: stepNo,
      A: `(${fmt(x1)}, ${fmt(y1)})`,
      codeA: codeToBin(code1),
      B: `(${fmt(x2)}, ${fmt(y2)})`,
      codeB: codeToBin(code2),
      action: 'проверка',
    });

    if ((code1 | code2) === 0) {
      steps[steps.length - 1].action = 'ACCEPT';
      accepted = true;
      status = 'accept';
      break;
    }

    if ((code1 & code2) !== 0) {
      steps[steps.length - 1].action = 'REJECT';
      status = 'reject';
      break;
    }

    const codeOut = code1 !== 0 ? code1 : code2;

    let x;
    let y;

    if (codeOut & TOP) {
      const t = (rect.ymin - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1);
      y = rect.ymin;
      steps[steps.length - 1].action = 'пересечение TOP';
    } else if (codeOut & BOTTOM) {
      const t = (rect.ymax - y1) / (y2 - y1);
      x = x1 + t * (x2 - x1);
      y = rect.ymax;
      steps[steps.length - 1].action = 'пересечение BOTTOM';
    } else if (codeOut & RIGHT) {
      const t = (rect.xmax - x1) / (x2 - x1);
      x = rect.xmax;
      y = y1 + t * (y2 - y1);
      steps[steps.length - 1].action = 'пересечение RIGHT';
    } else {
      const t = (rect.xmin - x1) / (x2 - x1);
      x = rect.xmin;
      y = y1 + t * (y2 - y1);
      steps[steps.length - 1].action = 'пересечение LEFT';
    }

    if (codeOut === code1) {
      x1 = x;
      y1 = y;
      code1 = getCode(x1, y1, rect);
    } else {
      x2 = x;
      y2 = y;
      code2 = getCode(x2, y2, rect);
    }

    stepNo++;

    if (stepNo > 64) {
      steps[steps.length - 1].action = 'REJECT (защита от цикла)';
      status = 'reject';
      break;
    }
  }

  const result = accepted ? { x1, y1, x2, y2 } : null;
  return { result, status, steps };
}

function fmt(v) {
  if (!isFinite(v)) return String(v);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function readRect() {
  const rect = {
    xmin: Number(els.xmin.value),
    xmax: Number(els.xmax.value),
    ymin: Number(els.ymin.value),
    ymax: Number(els.ymax.value),
  };
  const ok = rect.xmin < rect.xmax && rect.ymin < rect.ymax &&
             [rect.xmin, rect.xmax, rect.ymin, rect.ymax].every(isFinite);
  els.winError.hidden = ok;
  return ok ? rect : null;
}

const POLY_COUNT = 5;
let polyValues = [
  { x: 40,  y: 60  },
  { x: 180, y: 480 },
  { x: 360, y: 40  },
  { x: 560, y: 500 },
  { x: 720, y: 200 },
];

function buildPolyInputs() {
  els.polyInputs.innerHTML = '';
  polyValues.forEach((p, i) => {
    const lab = document.createElement('div');
    lab.className = 'poly-label';
    lab.textContent = `P${i}`;
    els.polyInputs.appendChild(lab);

    const lx = document.createElement('label');
    lx.className = 'v-label';
    lx.innerHTML = `x${i} <input type="number" data-poly="${i}" data-axis="x" value="${p.x}">`;
    els.polyInputs.appendChild(lx);

    const ly = document.createElement('label');
    ly.className = 'v-label';
    ly.innerHTML = `y${i} <input type="number" data-poly="${i}" data-axis="y" value="${p.y}">`;
    els.polyInputs.appendChild(ly);
  });

  els.polyInputs.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      const i = Number(inp.dataset.poly);
      const axis = inp.dataset.axis;
      polyValues[i][axis] = Number(inp.value);
    });
  });
}

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

const VIEW = { w: canvas.width, h: canvas.height };

function clearCanvas() {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  drawBackgroundGrid();
}

function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = '#f1f2f5';
  ctx.lineWidth = 1;
  const gs = 40;
  for (let x = 0; x <= VIEW.w; x += gs) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, VIEW.h);
    ctx.stroke();
  }
  for (let y = 0; y <= VIEW.h; y += gs) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(VIEW.w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWindow(rect) {
  ctx.save();
  ctx.strokeStyle = '#4d6bfe';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.xmin, rect.ymin, rect.xmax - rect.xmin, rect.ymax - rect.ymin);

  ctx.fillStyle = 'rgba(77, 107, 254, 0.04)';
  ctx.fillRect(rect.xmin, rect.ymin, rect.xmax - rect.xmin, rect.ymax - rect.ymin);

  ctx.fillStyle = '#4d6bfe';
  ctx.font = '11px ui-monospace, monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`xmin=${rect.xmin}`, rect.xmin, rect.ymin - 4);
  ctx.fillText(`xmax=${rect.xmax}`, rect.xmax - 62, rect.ymin - 4);
  ctx.fillText(`ymin=${rect.ymin}`, rect.xmin + 4, rect.ymin + 13);
  ctx.fillText(`ymax=${rect.ymax}`, rect.xmin + 4, rect.ymax - 4);
  ctx.restore();
}

function drawSegment(x1, y1, x2, y2, color, width, dashed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawPoint(x, y, radius, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function renderCodes(entries) {
  els.codes.innerHTML = '';
  if (!entries.length) {
    els.codes.innerHTML = '<span class="code-empty">— нет данных —</span>';
    return;
  }
  entries.forEach(e => {
    const div = document.createElement('div');
    div.className = 'code-line';
    div.innerHTML = `
      <span class="k">${e.label}</span>
      <span class="v">${codeToBin(e.code)}</span>
      <span class="names">${codeNames(e.code)}</span>
    `;
    els.codes.appendChild(div);
  });
}

function renderSteps(steps) {
  els.iterTable.innerHTML = '';
  if (!steps.length) {
    els.iterTable.innerHTML = '<tr><td colspan="6" class="table-empty">— нет данных —</td></tr>';
    return;
  }
  steps.forEach(s => {
    const tr = document.createElement('tr');
    let cls = '';
    if (s.action === 'ACCEPT') cls = 'act-accept';
    else if (s.action === 'REJECT') cls = 'act-reject';
    else if (s.action.startsWith('пересечение')) cls = 'act-clip';
    tr.innerHTML = `
      <td>${s.step}</td>
      <td>${s.A}</td>
      <td>${s.codeA}</td>
      <td>${s.B}</td>
      <td>${s.codeB}</td>
      <td class="${cls}">${s.action}</td>
    `;
    els.iterTable.appendChild(tr);
  });
}

const stats = { accept: 0, clipped: 0, reject: 0 };
function resetStats() {
  stats.accept = stats.clipped = stats.reject = 0;
  updateStatsView();
}
function addStat(status, changed) {
  if (status === 'accept' && !changed) stats.accept++;
  else if (status === 'accept' && changed) stats.clipped++;
  else stats.reject++;
  updateStatsView();
}
function updateStatsView() {
  els.stAccept.textContent = stats.accept;
  els.stClipped.textContent = stats.clipped;
  els.stReject.textContent = stats.reject;
}

function render() {
  const rect = readRect();
  if (!rect) return;

  clearCanvas();
  drawWindow(rect);

  if (currentMode() === 'segment') renderSingleSegment(rect);
  else renderPolyline(rect);
}

function renderSingleSegment(rect) {
  const x1 = Number(els.x1.value);
  const y1 = Number(els.y1.value);
  const x2 = Number(els.x2.value);
  const y2 = Number(els.y2.value);

  if (![x1, y1, x2, y2].every(isFinite)) return;

  drawSegment(x1, y1, x2, y2, '#c3c8d2', 2, false);

  const { result, status, steps } = clipLine(x1, y1, x2, y2, rect);

  if (result) {
    drawSegment(result.x1, result.y1, result.x2, result.y2, '#16a34a', 3, false);
    drawPoint(result.x1, result.y1, 4, '#16a34a');
    drawPoint(result.x2, result.y2, 4, '#16a34a');
  } else {
    drawSegment(x1, y1, x2, y2, 'rgba(220, 38, 38, 0.5)', 2, true);
  }

  const c1 = getCode(x1, y1, rect);
  const c2 = getCode(x2, y2, rect);
  renderCodes([
    { label: `A (${fmt(x1)}, ${fmt(y1)})`, code: c1 },
    { label: `B (${fmt(x2)}, ${fmt(y2)})`, code: c2 },
  ]);

  renderSteps(steps);

  resetStats();
  const changed = result && (Math.abs(result.x1 - x1) > 1e-9 || Math.abs(result.y1 - y1) > 1e-9 ||
                             Math.abs(result.x2 - x2) > 1e-9 || Math.abs(result.y2 - y2) > 1e-9);
  addStat(status, changed);

  labelPoint(x1, y1, 'A', '#6b7280');
  labelPoint(x2, y2, 'B', '#6b7280');
}

function labelPoint(x, y, text, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x + 6, y - 5);
  ctx.restore();
}

function renderPolyline(rect) {
  const pts = polyValues;
  if (pts.length < 2) return;

  ctx.save();
  ctx.strokeStyle = '#c3c8d2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();

  resetStats();

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];

    const { result, status } = clipLine(a.x, a.y, b.x, b.y, rect);

    if (result) {
      drawSegment(result.x1, result.y1, result.x2, result.y2, '#16a34a', 3, false);
    } else {
      drawSegment(a.x, a.y, b.x, b.y, 'rgba(220, 38, 38, 0.45)', 2, true);
    }

    const changed = result && (Math.abs(result.x1 - a.x) > 1e-9 || Math.abs(result.y1 - a.y) > 1e-9 ||
                               Math.abs(result.x2 - b.x) > 1e-9 || Math.abs(result.y2 - b.y) > 1e-9);
    addStat(status, changed);
  }

  pts.forEach((p, i) => {
    drawPoint(p.x, p.y, 4, '#0d0d0d');
    labelPoint(p.x, p.y, `P${i}`, '#0d0d0d');
  });

  renderCodes(pts.map((p, i) => ({
    label: `P${i} (${fmt(p.x)}, ${fmt(p.y)})`,
    code: getCode(p.x, p.y, rect),
  })));

  const rows = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const { result, status } = clipLine(a.x, a.y, b.x, b.y, rect);
    rows.push({
      step: `seg ${i}`,
      A: `(${fmt(a.x)}, ${fmt(a.y)})`,
      codeA: codeToBin(getCode(a.x, a.y, rect)),
      B: `(${fmt(b.x)}, ${fmt(b.y)})`,
      codeB: codeToBin(getCode(b.x, b.y, rect)),
      action: status === 'accept'
        ? (result && (Math.abs(result.x1 - a.x) > 1e-9 || Math.abs(result.y1 - a.y) > 1e-9 ||
                      Math.abs(result.x2 - b.x) > 1e-9 || Math.abs(result.y2 - b.y) > 1e-9)
            ? 'ACCEPT (отсечён)' : 'ACCEPT')
        : 'REJECT',
    });
  }
  renderSteps(rows);
}

function runRandomExperiment() {
  const rect = readRect();
  if (!rect) return;

  clearCanvas();
  drawWindow(rect);
  resetStats();

  const N = 300;
  const colors = {
    accept: 'rgba(77, 107, 254, 0.55)',
    clipped: 'rgba(22, 163, 74, 0.65)',
    reject: 'rgba(220, 38, 38, 0.30)',
  };

  for (let i = 0; i < N; i++) {
    const x1 = Math.random() * VIEW.w;
    const y1 = Math.random() * VIEW.h;
    const x2 = Math.random() * VIEW.w;
    const y2 = Math.random() * VIEW.h;

    const { result, status } = clipLine(x1, y1, x2, y2, rect);

    const changed = result && (Math.abs(result.x1 - x1) > 1e-9 || Math.abs(result.y1 - y1) > 1e-9 ||
                               Math.abs(result.x2 - x2) > 1e-9 || Math.abs(result.y2 - y2) > 1e-9);

    if (status === 'accept') {
      drawSegment(result.x1, result.y1, result.x2, result.y2,
        changed ? colors.clipped : colors.accept, changed ? 2 : 1.5, false);
      addStat(status, changed);
    } else {
      drawSegment(x1, y1, x2, y2, colors.reject, 1, false);
      addStat(status, false);
    }
  }

  renderCodes([]);
  renderSteps([]);
}

function runMandatoryTests() {
  const rect = { xmin: 100, xmax: 560, ymin: 120, ymax: 440 };
  const tests = [
    { name: 'полностью внутри',                x1: 150, y1: 150, x2: 500, y2: 400 },
    { name: 'полностью слева',                 x1: 10,  y1: 200, x2: 80,  y2: 300 },
    { name: 'полностью сверху',                x1: 200, y1: 10,  x2: 400, y2: 90  },
    { name: 'пересекает одну границу (LEFT)',  x1: 20,  y1: 250, x2: 300, y2: 260 },
    { name: 'пересекает две противоположные (L/R)', x1: 20, y1: 250, x2: 700, y2: 260 },
    { name: 'проходит через угол',             x1: 20,  y1: 60,  x2: 200, y2: 200 },
    { name: 'вертикальный',                    x1: 300, y1: 20,  x2: 300, y2: 550 },
    { name: 'горизонтальный',                  x1: 20,  y1: 300, x2: 700, y2: 300 },
    { name: 'обе точки снаружи, проходит через окно', x1: 20, y1: 20, x2: 700, y2: 500 },
  ];
  console.group('Обязательные тесты (Коэн–Сазерленд)');
  tests.forEach(t => {
    const { result, status, steps } = clipLine(t.x1, t.y1, t.x2, t.y2, rect);
    console.log(
      `%c${t.name}`,
      'font-weight:600',
      '→', status,
      result ? `→ (${fmt(result.x1)}, ${fmt(result.y1)}) – (${fmt(result.x2)}, ${fmt(result.y2)})` : '→ null',
      `| шагов: ${steps.length}`
    );
  });
  console.groupEnd();
}

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener('change', () => {
    const poly = currentMode() === 'polyline';
    els.segFields.hidden = poly;
    els.polyFields.hidden = !poly;
    render();
  });
});

[els.xmin, els.xmax, els.ymin, els.ymax, els.x1, els.y1, els.x2, els.y2].forEach(inp => {
  inp.addEventListener('input', render);
});

els.apply.addEventListener('click', () => {
  if (!readRect()) return;
  render();
});

els.random.addEventListener('click', runRandomExperiment);

els.clear.addEventListener('click', () => {
  resetStats();
  renderCodes([]);
  renderSteps([]);
  clearCanvas();
  const rect = readRect();
  if (rect) drawWindow(rect);
});

buildPolyInputs();
render();
runMandatoryTests();

window.__cg = { getCode, clipLine, getCodeNames: codeNames };