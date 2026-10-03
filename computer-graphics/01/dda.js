/* ============================================================
   Занятие 1. Растровая графика
   Алгоритм ЦДА (цифровой дифференциальный анализатор)

   ВАЖНО: мы НЕ используем ctx.lineTo() — линия строится
   вручную из отдельных пикселей.
   ============================================================ */

/**
 * Вычисляет все параметры растеризации отрезка A→B.
 *
 * @param {number} x1 - x начала
 * @param {number} y1 - y начала
 * @param {number} x2 - x конца
 * @param {number} y2 - y конца
 * @returns {object} параметры и журнал шагов
 */
function computeDDA(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Количество шагов: максимальное из модулей приращений.
    // Это гарантирует, что за один шаг координата меняется
    // не более чем на 1 пиксель — линия будет связной.
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    // Вырожденный случай: начало и конец совпадают.
    if (steps === 0) {
        return {
            x1, y1, x2, y2,
            dx: 0, dy: 0,
            steps: 0,
            xStep: 0, yStep: 0,
            steps_log: [{ step: 0, xRaw: x1, yRaw: y1, x: x1, y: y1 }]
        };
    }

    // Приращения координат за один шаг (вещественные числа).
    const xStep = dx / steps;
    const yStep = dy / steps;

    // Журнал шагов — для наглядной таблицы.
    const steps_log = [];

    let x = x1;
    let y = y1;

    for (let i = 0; i <= steps; i += 1) {
        // Округляем текущие вещественные координаты до пикселя.
        const px = Math.round(x);
        const py = Math.round(y);

        steps_log.push({
            step: i,
            xRaw: x,
            yRaw: y,
            x: px,
            y: py
        });

        // Переходим к следующей точке.
        x += xStep;
        y += yStep;
    }

    return { x1, y1, x2, y2, dx, dy, steps, xStep, yStep, steps_log };
}