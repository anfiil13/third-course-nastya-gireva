// ЛР6. Интерфейс: выбор теста / ввод мышью, окно, этапы, таблицы.
// Сам алгоритм — в clipping.js, тесты — в tests.js.

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

const STAGE_NAMES = ['исходный', 'LEFT', 'RIGHT', 'TOP', 'BOTTOM'];

// ---------- Состояние ----------
let rect = { ...DEFAULT_RECT };
let polygon = TESTS[0].polygon;
let stages = [];
let currentStage = 4;     // по умолчанию показываем итог (после BOTTOM)
let drawing = false;      // режим ввода мышью
let draft = [];           // вершины, которые сейчас вводятся мышью

// ---------- Форматирование ----------
function fmt(n) {
  return String(Math.round(n * 100) / 100);
}

function fmtPoint(p) {
  return '(' + fmt(p.x) + ', ' + fmt(p.y) + ')';
}

function fmtPolygon(poly) {
  return poly.length === 0 ? '— пусто —' : poly.map(fmtPoint).join(' ');
}

// ---------- Пересчёт ----------
function recompute() {
  stages = clipPolygonStages(polygon, rect);
  render();
}

// ---------- Рисование ----------
function drawGrid() {
  ctx.save();
  ctx.strokeStyle = '#f0f0f0';
  ctx.fillStyle = '#b0b0b0';
  ctx.font = '10px sans-serif';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
    if (x > 0) ctx.fillText(x, x + 2, 10);
  }
  for (let y = 0; y <= canvas.height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
    if (y > 0) ctx.fillText(y, 2, y - 2);
  }
  ctx.restore();
}

function pathPolygon(poly) {
  ctx.beginPath();
  poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function drawPoints(poly, color) {
  ctx.fillStyle = color;
  for (const p of poly) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Линия текущей границы на всю ширину/высоту холста
function drawBoundaryLine(name) {
  ctx.save();
  ctx.strokeStyle = '#dc2626';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (name === 'LEFT' || name === 'RIGHT') {
    const x = name === 'LEFT' ? rect.xmin : rect.xmax;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  } else {
    const y = name === 'TOP' ? rect.ymin : rect.ymax;
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Окно отсечения
  ctx.save();
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.xmin, rect.ymin, rect.xmax - rect.xmin, rect.ymax - rect.ymin);
  ctx.restore();

  if (drawing) {
    // Многоугольник в процессе ввода мышью
    ctx.save();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    draft.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    drawPoints(draft, '#7c3aed');
    return;
  }

  // Исходный контур
  ctx.save();
  ctx.strokeStyle = '#6b7280';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.5;
  pathPolygon(polygon);
  ctx.stroke();
  ctx.restore();

  // Многоугольник выбранного этапа
  const stage = stages[currentStage];
  if (currentStage > 0) {
    drawBoundaryLine(stage.name);
  }
  if (stage.polygon.length > 0) {
    ctx.save();
    pathPolygon(stage.polygon);
    ctx.fillStyle = 'rgba(22, 163, 74, 0.3)';
    ctx.fill();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    drawPoints(stage.polygon, '#15803d');
  }
}

// ---------- Таблицы ----------
function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderStagesTable() {
  const tbody = document.querySelector('#stages-table tbody');
  tbody.replaceChildren();
  stages.forEach((stage, i) => {
    const tr = document.createElement('tr');
    tr.className = 'clickable' + (i === currentStage ? ' current' : '');
    tr.append(
      cell(stage.name),
      cell(String(stage.polygon.length), 'num'),
      cell(fmtPolygon(stage.polygon))
    );
    tr.addEventListener('click', () => selectStage(i));
    tbody.append(tr);
  });
}

function renderLogTable() {
  const tbody = document.querySelector('#log-table tbody');
  tbody.replaceChildren();
  const stage = stages[currentStage];

  if (currentStage === 0) {
    const tr = document.createElement('tr');
    const td = cell('Выберите этап LEFT, RIGHT, TOP или BOTTOM');
    td.colSpan = 4;
    tr.append(td);
    tbody.append(tr);
    return;
  }
  if (stage.log.length === 0) {
    const tr = document.createElement('tr');
    const td = cell('Вход этапа пуст — граница не обрабатывалась');
    td.colSpan = 4;
    tr.append(td);
    tbody.append(tr);
    return;
  }
  for (const step of stage.log) {
    const tr = document.createElement('tr');
    tr.append(
      cell(fmtPoint(step.s)),
      cell(fmtPoint(step.p)),
      cell(step.transition),
      cell(step.added.length ? step.added.map(fmtPoint).join(', ') : 'ничего')
    );
    tbody.append(tr);
  }
}

function renderStageButtons() {
  const box = document.querySelector('#stage-buttons');
  box.replaceChildren();
  STAGE_NAMES.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = name;
    if (i === currentStage) btn.className = 'active';
    btn.addEventListener('click', () => selectStage(i));
    box.append(btn);
  });
}

function render() {
  drawScene();
  if (drawing) return;
  renderStageButtons();
  renderStagesTable();
  renderLogTable();
  document.querySelector('#hint').textContent =
    'Показан этап: ' + stages[currentStage].name +
    ' — вершин: ' + stages[currentStage].polygon.length;
}

function selectStage(i) {
  currentStage = i;
  render();
}

// ---------- Тесты ----------
const testSelect = document.querySelector('#test-select');

TESTS.forEach((test, i) => {
  const option = document.createElement('option');
  option.value = i;
  option.textContent = test.name;
  testSelect.append(option);
});

const customOption = document.createElement('option');
customOption.value = 'custom';
customOption.textContent = 'Свой (мышью)';
testSelect.append(customOption);

testSelect.addEventListener('change', () => {
  if (testSelect.value === 'custom') return;
  polygon = TESTS[Number(testSelect.value)].polygon;
  currentStage = 4;
  recompute();
});

document.querySelector('#run-tests').addEventListener('click', () => {
  const tbody = document.querySelector('#tests-table tbody');
  tbody.replaceChildren();
  for (const test of TESTS) {
    const r = runTest(test);
    const changed = changedStages(r.stages);
    const tr = document.createElement('tr');
    tr.append(
      cell(test.name),
      cell(test.expect),
      cell(test.polygon.length + ' → ' + r.result.length, 'num'),
      cell(changed.length ? changed.join(', ') : 'нет'),
      cell(r.ok ? 'пройден' : 'ОШИБКА', r.ok ? 'ok' : 'fail')
    );
    tbody.append(tr);
  }
});

// ---------- Окно ----------
const inputs = ['xmin', 'xmax', 'ymin', 'ymax'].map(id => document.querySelector('#' + id));

function fillWindowInputs() {
  inputs.forEach(input => (input.value = rect[input.id]));
}

document.querySelector('#apply-window').addEventListener('click', () => {
  const errorEl = document.querySelector('#window-error');
  const values = {};
  for (const input of inputs) {
    const v = Number(input.value);
    if (input.value.trim() === '' || !Number.isFinite(v)) {
      errorEl.textContent = input.id + ': введите число';
      return;
    }
    values[input.id] = v;
  }
  if (!(values.xmin < values.xmax)) {
    errorEl.textContent = 'Должно быть xmin < xmax';
    return;
  }
  if (!(values.ymin < values.ymax)) {
    errorEl.textContent = 'Должно быть ymin < ymax';
    return;
  }
  errorEl.textContent = '';
  rect = values;
  recompute();
});

// ---------- Ввод мышью ----------
const drawBtn = document.querySelector('#draw-btn');
const finishBtn = document.querySelector('#finish-btn');

function canvasPoint(event) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.round((event.clientX - r.left) * canvas.width / r.width),
    y: Math.round((event.clientY - r.top) * canvas.height / r.height)
  };
}

drawBtn.addEventListener('click', () => {
  drawing = true;
  draft = [];
  testSelect.value = 'custom';
  finishBtn.disabled = false;
  document.querySelector('#hint').textContent =
    'Щёлкайте по холсту, чтобы добавить вершины (минимум 3)';
  render();
});

function finishDrawing() {
  if (draft.length < 3) {
    document.querySelector('#hint').textContent = 'Нужно минимум 3 вершины';
    return;
  }
  drawing = false;
  finishBtn.disabled = true;
  polygon = draft;
  currentStage = 4;
  recompute();
}

finishBtn.addEventListener('click', finishDrawing);

canvas.addEventListener('click', event => {
  if (!drawing) return;
  const p = canvasPoint(event);
  const last = draft[draft.length - 1];
  // второй щелчок двойного щелчка не добавляет дубликат
  if (last && Math.abs(last.x - p.x) < 3 && Math.abs(last.y - p.y) < 3) return;
  draft.push(p);
  render();
});

canvas.addEventListener('dblclick', () => {
  if (drawing) finishDrawing();
});

// ---------- Старт ----------
fillWindowInputs();
recompute();
document.querySelector('#run-tests').click();
