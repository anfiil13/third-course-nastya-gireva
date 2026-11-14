// ЛР7. Интерфейс редактора преобразований.
// Вся математика — в matrix.js. ctx.translate/rotate/scale/transform НЕ используются:
// Canvas получает уже посчитанные координаты.

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const UNIT = 20;                 // пикселей в одной единице модели
const ORIGIN_X = canvas.width / 2;
const ORIGIN_Y = canvas.height / 2;

const DEFAULT_POLYGON = [
  { x: 2, y: 2 },
  { x: 6, y: 2 },
  { x: 7, y: 5 },
  { x: 3, y: 7 }
];

const DEFAULT_PARAMS = { tx: 0, ty: 0, sx: 1, sy: 1, angle: 0, cx: 0, cy: 0, mode: 'A' };

// ---------- Состояние ----------
let original = DEFAULT_POLYGON.map(p => ({ ...p }));  // исходные вершины не меняются
let params = { ...DEFAULT_PARAMS };
let matrix = buildMatrix(params);
let result = transformPolygon(matrix, original);

const FIELDS = ['tx', 'ty', 'sx', 'sy', 'angle', 'cx', 'cy'];

// ---------- Форматирование (округление только для показа) ----------
function fmt(n) {
  const r = Math.round(n * 1000) / 1000;
  return String(Object.is(r, -0) ? 0 : r);
}

function fmtPoint(p) {
  return '(' + fmt(p.x) + ', ' + fmt(p.y) + ')';
}

// ---------- Модель → экран ----------
// Округление до пикселя делается только здесь, при переводе в растр.
function toScreen(p) {
  return {
    x: Math.round(ORIGIN_X + p.x * UNIT),
    y: Math.round(ORIGIN_Y - p.y * UNIT)   // ось Y модели вверх, Canvas — вниз
  };
}

function toModel(sx, sy) {
  return {
    x: (sx - ORIGIN_X) / UNIT,
    y: (ORIGIN_Y - sy) / UNIT
  };
}

// ---------- Рисование ----------
function drawGrid() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#eef0f3';
  for (let x = ORIGIN_X % UNIT; x <= canvas.width; x += UNIT) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let y = ORIGIN_Y % UNIT; y <= canvas.height; y += UNIT) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }

  // Оси
  ctx.strokeStyle = '#9ca3af';
  ctx.beginPath();
  ctx.moveTo(0, ORIGIN_Y + 0.5);
  ctx.lineTo(canvas.width, ORIGIN_Y + 0.5);
  ctx.moveTo(ORIGIN_X + 0.5, 0);
  ctx.lineTo(ORIGIN_X + 0.5, canvas.height);
  ctx.stroke();

  // Подписи делений через 5 единиц
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px sans-serif';
  for (let u = -15; u <= 15; u += 5) {
    if (u === 0) continue;
    ctx.fillText(u, ORIGIN_X + u * UNIT + 2, ORIGIN_Y + 12);
    ctx.fillText(u, ORIGIN_X + 3, ORIGIN_Y - u * UNIT - 2);
  }
  ctx.fillText('x', canvas.width - 10, ORIGIN_Y - 4);
  ctx.fillText('y', ORIGIN_X + 6, 10);
  ctx.restore();
}

function drawPolygon(poly, stroke, fill, dashed) {
  const pts = poly.map(toScreen);
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawLabels(poly, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  poly.forEach((p, i) => {
    const s = toScreen(p);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('P' + i, s.x + 5, s.y - 5);
  });
  ctx.restore();
}

function drawCenter() {
  const c = toScreen({ x: params.cx, y: params.cy });
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#92400e';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#92400e';
  ctx.fillText('C', c.x + 7, c.y + 14);
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  if (document.querySelector('#show-other').checked) {
    const otherMode = params.mode === 'A' ? 'B' : 'A';
    const other = transformPolygon(buildMatrix({ ...params, mode: otherMode }), original);
    drawPolygon(other, '#7c3aed', null, true);
  }

  drawPolygon(original, '#2563eb', 'rgba(37, 99, 235, 0.12)');
  drawPolygon(result, '#dc2626', 'rgba(220, 38, 38, 0.12)');
  drawLabels(original, '#1d4ed8');
  drawLabels(result, '#b91c1c');
  drawCenter();
}

// ---------- Таблицы ----------
function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderMatrix() {
  const table = document.querySelector('#matrix');
  table.replaceChildren();
  for (const row of matrix) {
    const tr = document.createElement('tr');
    row.forEach(v => tr.append(cell(fmt(v))));
    table.append(tr);
  }
  document.querySelector('#mode-label').textContent = '(режим ' + params.mode + ')';
  document.querySelector('#formula').textContent = params.mode === 'A'
    ? 'M = T(tx,ty) · Rc(θ) · Sc(sx,sy)'
    : 'M = Rc(θ) · T(tx,ty) · Sc(sx,sy)';
}

function renderVertexTable() {
  const tbody = document.querySelector('#vertex-table tbody');
  tbody.replaceChildren();
  original.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.append(
      cell('P' + i),
      cell(fmt(p.x), 'num'),
      cell(fmt(p.y), 'num'),
      cell(fmt(result[i].x), 'num'),
      cell(fmt(result[i].y), 'num')
    );
    tbody.append(tr);
  });
}

function renderCompare() {
  const a = transformPolygon(buildMatrix({ ...params, mode: 'A' }), original);
  const b = transformPolygon(buildMatrix({ ...params, mode: 'B' }), original);
  const tbody = document.querySelector('#compare tbody');
  tbody.replaceChildren();
  original.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.append(cell('P' + i), cell(fmtPoint(a[i]), 'num'), cell(fmtPoint(b[i]), 'num'));
    tbody.append(tr);
  });
}

function renderChecks() {
  const tbody = document.querySelector('#checks-table tbody');
  tbody.replaceChildren();
  runChecks(original).forEach((check, i) => {
    const tr = document.createElement('tr');
    tr.append(
      cell(String(i + 1)),
      cell(check.name),
      cell(check.details),
      cell(check.ok ? 'пройдена' : 'ОШИБКА', check.ok ? 'ok' : 'fail')
    );
    tbody.append(tr);
  });
}

function render() {
  drawScene();
  renderMatrix();
  renderVertexTable();
  renderCompare();
}

// ---------- Пересчёт: всегда от исходных вершин ----------
function recompute() {
  matrix = buildMatrix(params);
  result = transformPolygon(matrix, original);
  render();
}

// ---------- Поля ввода ----------
function fillInputs() {
  FIELDS.forEach(id => (document.querySelector('#' + id).value = params[id]));
  document.querySelector('input[name="mode"][value="' + params.mode + '"]').checked = true;
  document.querySelector('#vertices').value =
    original.map(p => p.x + ' ' + p.y).join('\n');
}

function readParams() {
  const values = {};
  for (const id of FIELDS) {
    const raw = document.querySelector('#' + id).value.trim();
    const v = Number(raw);
    if (raw === '' || !Number.isFinite(v)) {
      throw new Error(id + ': введите число');
    }
    values[id] = v;
  }
  values.mode = document.querySelector('input[name="mode"]:checked').value;
  return values;
}

function applyParams() {
  const errorEl = document.querySelector('#params-error');
  try {
    params = readParams();
    errorEl.textContent = '';
    recompute();
  } catch (e) {
    errorEl.textContent = e.message;
  }
}

function parseVertices(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const points = lines.map((line, i) => {
    const parts = line.split(/[\s,;]+/).map(Number);
    if (parts.length !== 2 || parts.some(n => !Number.isFinite(n))) {
      throw new Error('Строка ' + (i + 1) + ': нужно два числа «x y»');
    }
    return { x: parts[0], y: parts[1] };
  });
  if (points.length < 4) {
    throw new Error('Нужно минимум 4 вершины');
  }
  return points;
}

document.querySelector('#apply').addEventListener('click', applyParams);

// Режим и чекбокс пересчитываются сразу
document.querySelectorAll('input[name="mode"]').forEach(r =>
  r.addEventListener('change', applyParams));
document.querySelector('#show-other').addEventListener('change', render);

// Enter в любом поле = «Применить»
FIELDS.forEach(id => document.querySelector('#' + id).addEventListener('keydown', e => {
  if (e.key === 'Enter') applyParams();
}));

document.querySelector('#reset').addEventListener('click', () => {
  params = { ...DEFAULT_PARAMS };
  document.querySelector('#params-error').textContent = '';
  fillInputs();
  recompute();
});

document.querySelector('#apply-vertices').addEventListener('click', () => {
  const errorEl = document.querySelector('#vertices-error');
  try {
    original = parseVertices(document.querySelector('#vertices').value);
    errorEl.textContent = '';
    recompute();
    renderChecks();
  } catch (e) {
    errorEl.textContent = e.message;
  }
});

// ---------- Выбор центра ----------
function setCenter(x, y) {
  document.querySelector('#cx').value = fmt(x);
  document.querySelector('#cy').value = fmt(y);
  applyParams();
}

document.querySelector('#center-centroid').addEventListener('click', () => {
  const n = original.length;
  setCenter(
    original.reduce((s, p) => s + p.x, 0) / n,
    original.reduce((s, p) => s + p.y, 0) / n
  );
});

document.querySelector('#center-origin').addEventListener('click', () => setCenter(0, 0));
document.querySelector('#center-p0').addEventListener('click', () =>
  setCenter(original[0].x, original[0].y));

canvas.addEventListener('click', event => {
  const r = canvas.getBoundingClientRect();
  const m = toModel(
    (event.clientX - r.left) * canvas.width / r.width,
    (event.clientY - r.top) * canvas.height / r.height
  );
  // привязка к сетке с шагом 0.5
  setCenter(Math.round(m.x * 2) / 2, Math.round(m.y * 2) / 2);
});

// ---------- Старт ----------
fillInputs();
recompute();
renderChecks();
