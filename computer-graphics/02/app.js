'use strict';
const COLS = 80, ROWS = 50, CELL = 10, BIG = 7;

const state = {
  x1: 2, y1: 2, x2: 70, y2: 30,
  algo: 'dda', pixelMode: true, showGrid: true, showLabels: false
};

const $ = id => document.getElementById(id);
const cv = $('cv');
const ctx = cv.getContext('2d');

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $(tab.dataset.panel).classList.add('active');
    if (tab.dataset.panel === 'panel-table') buildBresTable();
    if (tab.dataset.panel === 'panel-compare') renderCompare();
  });
});

const PRESETS = [
  { name: 'Горизонтальный',  x1: 5,  y1: 25, x2: 70, y2: 25 },
  { name: 'Вертикальный',    x1: 40, y1: 3,  x2: 40, y2: 46 },
  { name: 'Пологий',         x1: 3,  y1: 10, x2: 74, y2: 33 },
  { name: 'Крутой',          x1: 12, y1: 4,  x2: 30, y2: 45 },
  { name: 'Обратный',        x1: 70, y1: 30, x2: 2,  y2: 2  },
  { name: 'Диагональ 1:1',   x1: 6,  y1: 6,  x2: 44, y2: 44 },
  { name: 'Точка',           x1: 40, y1: 25, x2: 40, y2: 25 }
];

function renderPresets() {
  const box = $('presets');
  box.innerHTML = '';
  PRESETS.forEach(p => {
    const b = document.createElement('button');
    b.className = 'preset';
    b.textContent = p.name;
    b.title = `(${p.x1},${p.y1}) → (${p.x2},${p.y2})`;
    b.onclick = () => {
      Object.assign(state, { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 });
      syncInputs(); redraw();
    };
    box.appendChild(b);
  });
}

function syncInputs() {
  $('x1').value = state.x1; $('y1').value = state.y1;
  $('x2').value = state.x2; $('y2').value = state.y2;
}
const clampInput = (v, max) => {
  v = parseInt(v, 10);
  return isNaN(v) ? 0 : Math.min(max, Math.max(0, v));
};

['x1','y1','x2','y2'].forEach(id => {
  $(id).addEventListener('input', () => {
    state.x1 = clampInput($('x1').value, COLS - 1);
    state.y1 = clampInput($('y1').value, ROWS - 1);
    state.x2 = clampInput($('x2').value, COLS - 1);
    state.y2 = clampInput($('y2').value, ROWS - 1);
    redraw();
  });
});

document.querySelectorAll('input[name=algo]').forEach(r => {
  r.addEventListener('change', () => { state.algo = r.value; redraw(); });
});

$('pixelMode').addEventListener('change', e => { state.pixelMode = e.target.checked; redraw(); });
$('showGrid').addEventListener('change',  e => { state.showGrid  = e.target.checked; redraw(); });
$('showLabels').addEventListener('change',e => { state.showLabels= e.target.checked; redraw(); });

function drawGrid() {
  if (!state.showGrid) return;
  ctx.save();
  ctx.strokeStyle = '#eef0f3';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
  }
  ctx.strokeStyle = '#dfe3e8';
  for (let x = 0; x <= COLS; x += 10) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL); ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y += 10) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL); ctx.stroke();
  }
  ctx.restore();
}

function drawPixel(x, y, fill) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  if (state.pixelMode) {
    const ox = x * CELL + (CELL - BIG) / 2;
    const oy = y * CELL + (CELL - BIG) / 2;
    ctx.fillStyle = fill;
    ctx.fillRect(ox, oy, BIG, BIG);
  } else {
    ctx.fillStyle = fill;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  }
}

function redraw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cv.width, cv.height);

  drawGrid();

  const pts = state.algo === 'dda'
    ? lineDDA(state.x1, state.y1, state.x2, state.y2)
    : lineBresenham(state.x1, state.y1, state.x2, state.y2);

  pts.forEach(p => drawPixel(p.x, p.y, '#4d6bfe'));

  drawPixel(state.x1, state.y1, '#e0483c');
  drawPixel(state.x2, state.y2, '#e0483c');

  if (state.showLabels) {
    ctx.save();
    ctx.fillStyle = '#374151';
    ctx.font = '10px ui-monospace, Menlo, monospace';
    pts.forEach(p => {
      ctx.fillText(`${p.x},${p.y}`, p.x * CELL + CELL + 2, p.y * CELL + CELL - 1);
    });
    ctx.restore();
  }

  $('statAlgo').textContent = state.algo === 'dda' ? 'ЦДА' : 'Брезенхем';
  $('statCount').textContent = pts.length;
  $('statDelta').textContent = `${state.x2 - state.x1}, ${state.y2 - state.y1}`;

  renderPixelList(pts);
}

function renderPixelList(pts) {
  const box = $('pixelList');
  box.innerHTML = '';
  $('pixelBadge').textContent = pts.length + ' шт.';
  pts.forEach(p => {
    const s = document.createElement('span');
    s.textContent = `(${p.x}, ${p.y})`;
    box.appendChild(s);
  });
}

cv.addEventListener('click', e => {
  const r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / (r.width  / COLS));
  const y = Math.floor((e.clientY - r.top ) / (r.height / ROWS));
  if (e.shiftKey) { state.x2 = x; state.y2 = y; }
  else            { state.x1 = x; state.y1 = y; }
  syncInputs();
  redraw();
});

function buildBresTable() {
  const tbody = $('bresTable').querySelector('tbody');
  tbody.innerHTML = '';
  const rows = lineBresenhamTraced(state.x1, state.y1, state.x2, state.y2);

  rows.forEach(r => {
    const tr = document.createElement('tr');
    const cls = r.change === 'x' ? 'changed-x'
              : r.change === 'y' ? 'changed-y'
              : r.change === 'x, y' ? 'changed-xy' : '';
    tr.innerHTML = `
      <td>${r.step}</td>
      <td>${r.x}</td>
      <td>${r.y}</td>
      <td>${r.error}</td>
      <td>${r.error2}</td>
      <td>${r.condX ? 'да' : '—'}</td>
      <td>${r.condY ? 'да' : '—'}</td>
      <td class="${cls}">${r.change}</td>
    `;
    tbody.appendChild(tr);
  });
}
$('tblAll').addEventListener('click', buildBresTable);

const COMPARE_SEGMENTS = [
  { label: 'Горизонтальный',  x1: 5,  y1: 25, x2: 70, y2: 25 },
  { label: 'Вертикальный',    x1: 40, y1: 3,  x2: 40, y2: 46 },
  { label: 'Пологий',         x1: 3,  y1: 10, x2: 74, y2: 33 },
  { label: 'Крутой',          x1: 12, y1: 4,  x2: 30, y2: 45 },
  { label: 'Обратный',        x1: 70, y1: 30, x2: 2,  y2: 2  }
];

function renderCompare() {
  const out = $('compareResults');
  out.innerHTML = '';

  COMPARE_SEGMENTS.forEach(seg => {
    const dda = lineDDA(seg.x1, seg.y1, seg.x2, seg.y2);
    const br  = lineBresenham(seg.x1, seg.y1, seg.x2, seg.y2);
    const cmp = comparePixelSets(dda, br);

    const block = document.createElement('div');
    block.className = 'cmp-block';

    const verdict = cmp.identicalSet
      ? `<span class="cmp-verdict verdict-ok">наборы совпали (${cmp.lenA} пикселей)</span>`
      : `<span class="cmp-verdict verdict-diff">отличия: ЦДА ${cmp.lenA} · Брезенхем ${cmp.lenB}</span>`;

    let diffHtml = '';
    if (!cmp.identicalSet) {
      const onlyDda = cmp.onlyA.slice(0, 20).map(p => `<span class="hl">ЦДА (${p.x},${p.y})</span>`).join('');
      const onlyBr  = cmp.onlyB.slice(0, 20).map(p => `<span class="hl">Бр (${p.x},${p.y})</span>`).join('');
      diffHtml = `<div class="cmp-diff"><b>Расхождения по координатам:</b><br>${onlyDda}${onlyBr}</div>`;
    } else {
      diffHtml = `<div class="cmp-diff">Все точки совпадают по координатам.</div>`;
    }

    block.innerHTML = `
      <div class="cmp-head">
        <div class="cmp-title">${seg.label}<small>(${seg.x1},${seg.y1}) → (${seg.x2},${seg.y2})</small></div>
        ${verdict}
      </div>
      <div class="cmp-body">
        <div><b>ЦДА</b><div class="cmp-mini">${dda.map(p => `(${p.x},${p.y})`).join(' ')}</div></div>
        <div><b>Брезенхем</b><div class="cmp-mini">${br.map(p => `(${p.x},${p.y})`).join(' ')}</div></div>
      </div>
      ${diffHtml}
    `;
    out.appendChild(block);
  });
}
$('runCompare').addEventListener('click', renderCompare);

function randomSegments(n) {
  const segs = [];
  for (let i = 0; i < n; i++) {
    segs.push({
      x1: (Math.random() * COLS) | 0, y1: (Math.random() * ROWS) | 0,
      x2: (Math.random() * COLS) | 0, y2: (Math.random() * ROWS) | 0
    });
  }
  return segs;
}

function benchDDA(segs) {
  let sink = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    sink += countDDA(s.x1, s.y1, s.x2, s.y2);
  }
  return sink;
}
function benchBres(segs) {
  let sink = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    sink += countBresenham(s.x1, s.y1, s.x2, s.y2);
  }
  return sink;
}

function timeIt(fn, segs) {
  const t0 = performance.now();
  fn(segs);
  const t1 = performance.now();
  return t1 - t0;
}

$('runBench').addEventListener('click', () => {
  const N = Math.max(1000, parseInt($('benchN').value, 10) || 20000);
  const RUNS = Math.max(3, parseInt($('benchRuns').value, 10) || 7);
  const WARM = Math.max(0, parseInt($('benchWarm').value, 10) || 5000);

  const segs = randomSegments(N);
  const warmSegs = randomSegments(WARM);

  for (let i = 0; i < 3; i++) { benchDDA(warmSegs); benchBres(warmSegs); }

  const ddaTimes = [];
  const brTimes  = [];

  for (let r = 0; r < RUNS; r++) {
    ddaTimes.push(timeIt(benchDDA, segs));
    brTimes.push(timeIt(benchBres, segs));
  }

  const med = a => {
    const s = [...a].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const ddaMed = med(ddaTimes);
  const brMed  = med(brTimes);

  const out = $('benchOut');
  out.innerHTML = '';
  out.innerHTML += `<div class="bench-line"><span>Отрезков за прогон</span><b>${N}</b></div>`;
  out.innerHTML += `<div class="bench-line"><span>Повторов</span><b>${RUNS}</b></div>`;
  out.innerHTML += `<div class="bench-line"><span>ЦДА — медиана</span><b>${ddaMed.toFixed(3)} мс</b></div>`;
  out.innerHTML += `<div class="bench-line"><span>Брезенхем — медиана</span><b>${brMed.toFixed(3)} мс</b></div>`;
  out.innerHTML += `<div class="bench-line"><span>Разница</span><b>${(Math.abs(ddaMed - brMed)).toFixed(3)} мс (${((Math.abs(ddaMed - brMed) / Math.min(ddaMed, brMed)) * 100).toFixed(1)} %)</b></div>`;
  out.innerHTML += `<div class="bench-line winner"><span>Быстрее в этом запуске</span><b>${ddaMed < brMed ? 'ЦДА' : 'Брезенхем'}</b></div>`;
  out.innerHTML += `<div class="bench-line"><span>Все замеры ЦДА</span><b>${ddaTimes.map(t => t.toFixed(2)).join(' · ')}</b></div>`;
  out.innerHTML += `<div class="bench-line"><span>Все замеры Брезенхема</span><b>${brTimes.map(t => t.toFixed(2)).join(' · ')}</b></div>`;

  drawBenchChart(ddaTimes, brTimes, ddaMed, brMed);
});

function drawBenchChart(ddaTimes, brTimes, ddaMed, brMed) {
  const c = $('benchChart');
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);

  const pad = { l: 45, r: 16, t: 16, b: 28 };
  const n = Math.max(ddaTimes.length, brTimes.length);
  const all = [...ddaTimes, ...brTimes];
  const maxV = Math.max(...all) * 1.15;

  g.strokeStyle = '#eef0f3';
  g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (H - pad.t - pad.b) * i / 4;
    g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke();
    g.fillStyle = '#9ca3af';
    g.font = '10px ui-monospace, monospace';
    g.fillText((maxV * (1 - i / 4)).toFixed(1), 6, y + 3);
  }

  const xAt = i => pad.l + (W - pad.l - pad.r) * (n === 1 ? 0.5 : i / (n - 1));
  const yAt = v => pad.t + (H - pad.t - pad.b) * (1 - v / maxV);

  const drawLine = (arr, color) => {
    g.strokeStyle = color; g.lineWidth = 2; g.beginPath();
    arr.forEach((v, i) => { i ? g.lineTo(xAt(i), yAt(v)) : g.moveTo(xAt(i), yAt(v)); });
    g.stroke();
    arr.forEach((v, i) => {
      g.fillStyle = color;
      g.beginPath(); g.arc(xAt(i), yAt(v), 3, 0, Math.PI * 2); g.fill();
    });
  };
  drawLine(ddaTimes, '#4d6bfe');
  drawLine(brTimes,  '#e0483c');

  g.font = '11px ui-monospace, monospace';
  g.fillStyle = '#4d6bfe'; g.fillRect(W - 190, 12, 10, 10);
  g.fillStyle = '#374151'; g.fillText(`ЦДА  медиана ${ddaMed.toFixed(2)} мс`, W - 174, 21);
  g.fillStyle = '#e0483c'; g.fillRect(W - 190, 30, 10, 10);
  g.fillStyle = '#374151'; g.fillText(`Брез. медиана ${brMed.toFixed(2)} мс`, W - 174, 39);
}

renderPresets();
syncInputs();
redraw();