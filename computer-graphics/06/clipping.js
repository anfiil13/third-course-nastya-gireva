// ЛР6. Алгоритм Сазерленда–Ходжмана — только геометрия, без рисования.
// Координаты как в Canvas: ось Y направлена вниз.

// Пересечение ребра A→B с вертикальной границей x = xBoundary
function intersectVertical(a, b, xBoundary) {
  const t = (xBoundary - a.x) / (b.x - a.x);
  return {
    x: xBoundary,
    y: a.y + t * (b.y - a.y)
  };
}

// Пересечение ребра A→B с горизонтальной границей y = yBoundary
function intersectHorizontal(a, b, yBoundary) {
  const t = (yBoundary - a.y) / (b.y - a.y);
  return {
    x: a.x + t * (b.x - a.x),
    y: yBoundary
  };
}

// Определяет, какой из четырёх переходов у ребра S → P
function transitionName(sInside, pInside) {
  if (sInside && pInside) return 'inside → inside';
  if (sInside && !pInside) return 'inside → outside';
  if (!sInside && pInside) return 'outside → inside';
  return 'outside → outside';
}

// Отсечение многоугольника одной границей.
// log (необязательно) — массив, куда записываются шаги для отладки/README.
function clipAgainstBoundary(polygon, isInside, getIntersection, log) {
  const output = [];

  if (polygon.length === 0) {
    return output;
  }

  // Первое ребро — от последней вершины к первой (контур замкнут)
  let s = polygon[polygon.length - 1];

  for (const p of polygon) {
    const sInside = isInside(s);
    const pInside = isInside(p);
    const added = [];

    if (sInside && pInside) {
      // 1) inside → inside: сохраняем P
      added.push(p);
    } else if (sInside && !pInside) {
      // 2) inside → outside: только точка пересечения
      added.push(getIntersection(s, p));
    } else if (!sInside && pInside) {
      // 3) outside → inside: пересечение, затем P
      added.push(getIntersection(s, p));
      added.push(p);
    }
    // 4) outside → outside: ничего не добавляем

    output.push(...added);

    if (log) {
      log.push({ s, p, transition: transitionName(sInside, pInside), added });
    }

    s = p;
  }

  return output;
}

// Описание четырёх границ прямоугольного окна (в порядке обработки)
function windowBoundaries(rect) {
  return [
    {
      name: 'LEFT',
      isInside: p => p.x >= rect.xmin,
      intersect: (a, b) => intersectVertical(a, b, rect.xmin)
    },
    {
      name: 'RIGHT',
      isInside: p => p.x <= rect.xmax,
      intersect: (a, b) => intersectVertical(a, b, rect.xmax)
    },
    {
      name: 'TOP',
      isInside: p => p.y >= rect.ymin,
      intersect: (a, b) => intersectHorizontal(a, b, rect.ymin)
    },
    {
      name: 'BOTTOM',
      isInside: p => p.y <= rect.ymax,
      intersect: (a, b) => intersectHorizontal(a, b, rect.ymax)
    }
  ];
}

// Полный алгоритм. Возвращает все промежуточные результаты:
// [{ name: 'исходный', polygon }, { name: 'LEFT', polygon, log }, ...]
function clipPolygonStages(polygon, rect) {
  const stages = [{ name: 'исходный', polygon }];
  let result = polygon;

  for (const boundary of windowBoundaries(rect)) {
    const log = [];
    // Если на прошлом шаге всё отсечено, дальше проверять нечего
    result = result.length === 0
      ? []
      : clipAgainstBoundary(result, boundary.isInside, boundary.intersect, log);
    stages.push({ name: boundary.name, polygon: result, log });
  }

  return stages;
}

function clipPolygon(polygon, rect) {
  const stages = clipPolygonStages(polygon, rect);
  return stages[stages.length - 1].polygon;
}

// Экспорт для проверки в Node.js (в браузере module не определён)
if (typeof module !== 'undefined') {
  module.exports = {
    intersectVertical,
    intersectHorizontal,
    clipAgainstBoundary,
    clipPolygon,
    clipPolygonStages,
    windowBoundaries
  };
}
