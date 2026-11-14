// ЛР7. Обязательные проверки. Каждая возвращает { ok, details }.
const EPS = 1e-9;

const BASE_PARAMS = { tx: 0, ty: 0, sx: 1, sy: 1, angle: 0, cx: 0, cy: 0, mode: 'A' };

function near(a, b, eps = EPS) {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

function samePolygon(a, b, eps = EPS) {
  return a.length === b.length && a.every((p, i) => near(p, b[i], eps));
}

function pt(p) {
  return '(' + (Math.round(p.x * 1000) / 1000) + ', ' + (Math.round(p.y * 1000) / 1000) + ')';
}

function runChecks(polygon) {
  const withParams = changes =>
    transformPolygon(buildMatrix({ ...BASE_PARAMS, ...changes }), polygon);

  const checks = [];

  // 1. Перенос (0, 0)
  checks.push({
    name: 'Перенос (0, 0) не меняет фигуру',
    ok: samePolygon(withParams({ tx: 0, ty: 0 }), polygon),
    details: 'все вершины совпали с исходными'
  });

  // 2. Масштаб (1, 1)
  checks.push({
    name: 'Масштаб (1, 1) не меняет фигуру',
    ok: samePolygon(withParams({ sx: 1, sy: 1, cx: 3, cy: 4 }), polygon),
    details: 'проверено и для центра (3, 4)'
  });

  // 3. Поворот 360°
  const r360 = withParams({ angle: 360 });
  const maxErr = Math.max(...r360.map((p, i) =>
    Math.max(Math.abs(p.x - polygon[i].x), Math.abs(p.y - polygon[i].y))));
  checks.push({
    name: 'Поворот 360° возвращает исходные координаты',
    ok: maxErr < 1e-9,
    details: 'максимальная погрешность ' + maxErr.toExponential(2)
  });

  // 4. Поворот 90° вокруг (0, 0) точки (2, 1)
  const p4 = transformPoint(rotation(90), { x: 2, y: 1 });
  checks.push({
    name: 'R(90°) · (2, 1) = (−1, 2)',
    ok: near(p4, { x: -1, y: 2 }),
    details: 'получено ' + pt(p4) + ' (cos 90° = ' + Math.cos(Math.PI / 2).toExponential(1) + ')'
  });

  // 5. Поворот вокруг вершины P0 оставляет P0 на месте
  const v = polygon[0];
  const r5 = withParams({ angle: 37, cx: v.x, cy: v.y });
  checks.push({
    name: 'Поворот вокруг вершины P0 оставляет P0 на месте',
    ok: near(r5[0], v) && !samePolygon(r5, polygon),
    details: 'P0 = ' + pt(v) + ' → ' + pt(r5[0]) + ', угол 37°'
  });

  // 6. T·R и R·T дают разные результаты (пример из раздела 9)
  const P = { x: 2, y: 1 };
  const a = transformPoint(buildMatrix({ ...BASE_PARAMS, tx: 3, angle: 90, mode: 'A' }), P);
  const b = transformPoint(buildMatrix({ ...BASE_PARAMS, tx: 3, angle: 90, mode: 'B' }), P);
  checks.push({
    name: 'Режимы T·R и R·T дают разные результаты',
    ok: near(a, { x: 2, y: 2 }) && near(b, { x: -1, y: 5 }),
    details: 'A (T·R): ' + pt(a) + ', B (R·T): ' + pt(b)
  });

  // 7. Отрицательный масштаб — отражение
  const r7 = withParams({ sx: -1, sy: 1 });
  checks.push({
    name: 'Масштаб (−1, 1) отражает фигуру относительно оси Y',
    ok: r7.every((p, i) => near(p, { x: -polygon[i].x, y: polygon[i].y })),
    details: 'P0 ' + pt(polygon[0]) + ' → ' + pt(r7[0])
  });

  // 8. Повторное применение не накапливается
  const params = { ...BASE_PARAMS, angle: 30, tx: 1 };
  const first = transformPolygon(buildMatrix(params), polygon);
  const second = transformPolygon(buildMatrix(params), polygon);
  const accumulated = transformPolygon(buildMatrix(params), first);
  checks.push({
    name: 'Повторное «Применить» считает от исходной фигуры',
    ok: samePolygon(first, second) && !samePolygon(first, accumulated),
    details: 'два нажатия с одинаковыми параметрами дают одну и ту же фигуру'
  });

  return checks;
}

if (typeof module !== 'undefined') {
  module.exports = { runChecks };
}
