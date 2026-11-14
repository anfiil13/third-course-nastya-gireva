// ЛР6. Набор обязательных тестов и их автоматическая проверка.
// Окно по умолчанию для всех тестов.
const DEFAULT_RECT = { xmin: 150, xmax: 450, ymin: 100, ymax: 330 };

function pts(list) {
  return list.map(([x, y]) => ({ x, y }));
}

// Звезда (невыпуклый многоугольник)
function star(cx, cy, rOuter, rInner, rays) {
  const result = [];
  for (let i = 0; i < rays * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + i * Math.PI / rays;
    result.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return result;
}

const EPS = 1e-9;

function samePolygon(a, b) {
  return a.length === b.length &&
    a.every((p, i) => Math.abs(p.x - b[i].x) < EPS && Math.abs(p.y - b[i].y) < EPS);
}

// Сколько этапов (LEFT/RIGHT/TOP/BOTTOM) изменили многоугольник
function changedStages(stages) {
  const names = [];
  for (let i = 1; i < stages.length; i++) {
    if (!samePolygon(stages[i].polygon, stages[i - 1].polygon)) {
      names.push(stages[i].name);
    }
  }
  return names;
}

function allInside(polygon, rect) {
  return polygon.every(p =>
    p.x >= rect.xmin - EPS && p.x <= rect.xmax + EPS &&
    p.y >= rect.ymin - EPS && p.y <= rect.ymax + EPS
  );
}

const TESTS = [
  {
    name: '1. Полностью внутри',
    polygon: pts([[200, 150], [400, 140], [380, 300], [220, 280]]),
    expect: 'результат совпадает с исходным',
    check: (stages, src) => samePolygon(stages[4].polygon, src)
  },
  {
    name: '2. Полностью снаружи',
    polygon: pts([[20, 20], [120, 30], [80, 80]]),
    expect: 'результат пуст',
    check: stages => stages[4].polygon.length === 0
  },
  {
    name: '3. Пересекает одну границу',
    polygon: pts([[100, 180], [250, 150], [260, 260], [90, 250]]),
    expect: 'меняет только LEFT',
    check: stages => changedStages(stages).join() === 'LEFT'
  },
  {
    name: '4. Пересекает две границы',
    polygon: pts([[380, 40], [520, 60], [500, 200], [400, 180]]),
    expect: 'меняют RIGHT и TOP',
    check: stages => changedStages(stages).join() === 'RIGHT,TOP'
  },
  {
    name: '5. Пересекает все четыре',
    polygon: pts([[300, 40], [520, 215], [300, 390], [80, 215]]),
    expect: 'меняют все 4 этапа, вершин стало 8',
    check: stages =>
      changedStages(stages).length === 4 && stages[4].polygon.length === 8
  },
  {
    name: '6. Вершина на границе',
    polygon: pts([[150, 200], [300, 150], [350, 280]]),
    expect: 'вершина (150, 200) считается inside, фигура не меняется',
    check: (stages, src) => samePolygon(stages[4].polygon, src)
  },
  {
    name: '7. Ребро вдоль границы',
    polygon: pts([[150, 150], [150, 300], [300, 260]]),
    expect: 'ребро на x = xmin сохраняется, фигура не меняется',
    check: (stages, src) => samePolygon(stages[4].polygon, src)
  },
  {
    name: '8. Невыпуклый (звезда)',
    polygon: star(420, 215, 110, 45, 5),
    expect: 'лучи справа обрезаны по RIGHT, остальное сохранено',
    check: stages =>
      changedStages(stages).join() === 'RIGHT' && stages[4].polygon.length > 0
  },
  {
    name: '9. Результат пуст (у угла окна)',
    polygon: pts([[100, 60], [200, 20], [60, 200]]),
    expect: 'вершины в разных зонах, но результат пуст',
    check: stages => stages[4].polygon.length === 0
  },
  {
    name: '10. Доп.: распадается на две части',
    polygon: pts([
      [200, 150], [250, 150], [250, 360], [350, 360],
      [350, 150], [400, 150], [400, 400], [200, 400]
    ]),
    expect: 'две части соединены вырожденным ребром по BOTTOM',
    check: stages => changedStages(stages).join() === 'BOTTOM'
  }
];

function runTest(test, rect = DEFAULT_RECT) {
  const stages = clipPolygonStages(test.polygon, rect);
  const result = stages[4].polygon;
  const ok = test.check(stages, test.polygon) && allInside(result, rect);
  return { stages, result, ok };
}

if (typeof module !== 'undefined') {
  module.exports = { TESTS, DEFAULT_RECT, runTest, changedStages };
}
