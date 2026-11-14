// ЛР7. Матрицы 3×3 в однородных координатах, векторы-столбцы.
// Только математика — ничего не рисует.

function translation(tx, ty) {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1]
  ];
}

function scaling(sx, sy) {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ];
}

function rotation(degrees) {
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
}

function identity() {
  return translation(0, 0);
}

// C = A · B,  C[i][j] = Σk A[i][k] · B[k][j]
function multiplyMatrices(a, b) {
  const result = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

// Произведение нескольких матриц слева направо: M1 · M2 · ... · Mn.
// К точке первой применяется САМАЯ ПРАВАЯ матрица.
function compose(...matrices) {
  return matrices.reduce((acc, m) => multiplyMatrices(acc, m), identity());
}

// P' = M · (x, y, 1)ᵀ
function transformPoint(m, p) {
  return {
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2]
  };
}

function transformPolygon(m, polygon) {
  return polygon.map(p => transformPoint(m, p)); // исходный массив не меняется
}

// Итоговая матрица для параметров из интерфейса.
// Масштаб и поворот выполняются вокруг центра C(cx, cy).
//   Sc = T(c) · S · T(−c)        — масштаб вокруг C
//   Rc = T(c) · R · T(−c)        — поворот вокруг C
// Режим A (сначала повернуть, потом перенести): M = T(t) · Rc · Sc
// Режим B (сначала перенести, потом повернуть): M = Rc · T(t) · Sc
function buildMatrix(params) {
  const { tx, ty, sx, sy, angle, cx, cy, mode } = params;

  const toOrigin = translation(-cx, -cy);
  const back = translation(cx, cy);

  const Sc = compose(back, scaling(sx, sy), toOrigin);
  const Rc = compose(back, rotation(angle), toOrigin);
  const T = translation(tx, ty);

  return mode === 'B'
    ? compose(Rc, T, Sc)
    : compose(T, Rc, Sc);
}

if (typeof module !== 'undefined') {
  module.exports = {
    translation, scaling, rotation, identity,
    multiplyMatrices, compose, transformPoint, transformPolygon, buildMatrix
  };
}
