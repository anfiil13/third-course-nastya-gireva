/* ============================================================
   Занятие 1. Растровая графика
   Связывает Canvas, элементы управления и алгоритм ЦДА.
   ============================================================ */

const LOGICAL_WIDTH  = 40;  // логическая ширина в пикселях
const LOGICAL_HEIGHT = 30;  // логическая высота в пикселях
const SCALE = 20;           // 1 логический пиксель = 20 экранных

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Подгоняем размер canvas под логическую область и масштаб.
canvas.width  = LOGICAL_WIDTH  * SCALE;
canvas.height = LOGICAL_HEIGHT * SCALE;

/**
 * Закрашивает один логический пиксель.
 */
function putPixel(x, y, color = 'black') {
    if (x < 0 || x >= LOGICAL_WIDTH || y < 0 || y >= LOGICAL_HEIGHT) return;
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

/**
 * Рисует сетку логических пикселей и оси координат.
 */
function drawGrid() {
    ctx.strokeStyle = '#eef0f4';
    ctx.lineWidth = 1;

    for (let x = 0; x <= LOGICAL_WIDTH; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * SCALE + 0.5, 0);
        ctx.lineTo(x * SCALE + 0.5, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= LOGICAL_HEIGHT; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * SCALE + 0.5);
        ctx.lineTo(canvas.width, y * SCALE + 0.5);
        ctx.stroke();
    }

    // Оси координат (начало (0,0) в левом верхнем углу)
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, canvas.height);
    ctx.stroke();
}

/**
 * Подписи осей.
 */
function drawAxisLabels() {
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let x = 0; x <= LOGICAL_WIDTH; x += 5) {
        ctx.fillText(String(x), x * SCALE, 3);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= LOGICAL_HEIGHT; y += 5) {
        if (y === 0) continue;
        ctx.fillText(String(y), 4, y * SCALE);
    }
}

/**
 * Очищает canvas, рисует сетку и строит отрезок алгоритмом ЦДА.
 */
function buildLine() {
    const x1 = parseInt(document.getElementById('x1').value, 10);
    const y1 = parseInt(document.getElementById('y1').value, 10);
    const x2 = parseInt(document.getElementById('x2').value, 10);
    const y2 = parseInt(document.getElementById('y2').value, 10);

    if ([x1, y1, x2, y2].some(v => Number.isNaN(v))) {
        alert('Введите корректные целые координаты.');
        return;
    }

    // Очищаем canvas и рисуем фон.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawAxisLabels();

    // Запускаем алгоритм ЦДА.
    const result = computeDDA(x1, y1, x2, y2);

    // Рисуем все пиксели, полученные алгоритмом.
    for (const p of result.steps_log) {
        putPixel(p.x, p.y, '#4d6bfe');
    }

    // Отмечаем начало и конец отрезка.
    putPixel(x1, y1, '#16a34a');  // начало — зелёный
    putPixel(x2, y2, '#dc2626');  // конец — красный

    updateInfo(result);
    updateTable(result.steps_log);

    return result;
}

function updateInfo(result) {
    document.getElementById('infoDx').textContent     = result.dx;
    document.getElementById('infoDy').textContent     = result.dy;
    document.getElementById('infoSteps').textContent  = result.steps;
    document.getElementById('infoXStep').textContent  = result.xStep.toFixed(3);
    document.getElementById('infoYStep').textContent  = result.yStep.toFixed(3);
    document.getElementById('infoPixels').textContent = result.steps_log.length;
}

function updateTable(stepsLog) {
    const tbody = document.getElementById('stepsBody');
    tbody.innerHTML = '';

    for (const p of stepsLog) {
        const tr = document.createElement('tr');

        const isInteger =
            Math.abs(p.xRaw - Math.round(p.xRaw)) < 1e-9 &&
            Math.abs(p.yRaw - Math.round(p.yRaw)) < 1e-9;
        if (isInteger) tr.classList.add('integer-step');

        const cells = [
            { text: p.step,          cls: 'step-num' },
            { text: p.xRaw.toFixed(2) },
            { text: p.yRaw.toFixed(2) },
            { text: p.x },
            { text: p.y }
        ];

        for (const c of cells) {
            const td = document.createElement('td');
            td.textContent = c.text;
            if (c.cls) td.classList.add(c.cls);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

document.getElementById('buildBtn').addEventListener('click', buildLine);

document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawAxisLabels();

    ['infoDx', 'infoDy', 'infoSteps', 'infoXStep', 'infoYStep', 'infoPixels']
        .forEach(id => document.getElementById(id).textContent = '—');

    document.getElementById('stepsBody').innerHTML =
        '<tr><td colspan="5" class="empty">Нажмите «Построить», чтобы увидеть шаги алгоритма</td></tr>';
});

document.querySelectorAll('button.preset').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('x1').value = btn.dataset.x1;
        document.getElementById('y1').value = btn.dataset.y1;
        document.getElementById('x2').value = btn.dataset.x2;
        document.getElementById('y2').value = btn.dataset.y2;
        buildLine();
    });
});

// Первичная отрисовка
drawGrid();
drawAxisLabels();
buildLine();