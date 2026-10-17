(function () {
  "use strict";

  const COLS = 60; 
  const ROWS = 45;

  const canvas = document.getElementById("canvas");
  const statusEl = document.getElementById("status");
  const tableBody = document.querySelector("#steps-table tbody");
  const stepSelect = document.getElementById("step-select");
  const compareEl = document.getElementById("compare-result");

  const inputCx = document.getElementById("cx");
  const inputCy = document.getElementById("cy");
  const inputR = document.getElementById("r");

  const chkGrid = document.getElementById("chk-grid");
  const chkSymmetry = document.getElementById("chk-symmetry");
  const chkFormula = document.getElementById("chk-formula");

  const btnBuild = document.getElementById("btn-build");
  const btnClear = document.getElementById("btn-clear");
  const btnCompare = document.getElementById("btn-compare");

  const raster = new Raster(canvas, COLS, ROWS);

  let lastSteps = [];
  let lastPixels = [];
  let lastCx = 0;
  let lastCy = 0;
  let lastR = 0;

  function setStatus(text, warn = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("warn", warn);
  }

  function readParams() {
    return {
      cx: Number(inputCx.value),
      cy: Number(inputCy.value),
      r: Number(inputR.value),
    };
  }

  function validate({ cx, cy, r }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) {
      return "Параметры должны быть числами.";
    }
    if (!Number.isInteger(cx) || !Number.isInteger(cy) || !Number.isInteger(r)) {
      return "cx, cy и r должны быть целыми.";
    }
    if (r <= 0) {
      return "Радиус должен быть больше 0.";
    }
    return null;
  }

  function outOfBoundsWarning({ cx, cy, r }) {
    if (cx - r < 0 || cx + r >= COLS || cy - r < 0 || cy + r >= ROWS) {
      return `Внимание: окружность выходит за границы логической области (${COLS}×${ROWS} клеток). ` +
             "Выходящие за границы пиксели не рисуются.";
    }
    return null;
  }

  function draw() {
    raster.clear();
    if (chkGrid.checked) raster.drawGrid();

    for (const [px, py] of lastPixels) {
      raster.putPixel(px, py, "#1a1d23");
    }

    if (chkFormula.checked && lastR > 0) {
      const { pixels } = CircleAlgo.circleByFormula(lastCx, lastCy, lastR);
      for (const [px, py] of pixels) {
        raster.strokePixel(px, py, "#0ea5a4");
      }
    }

    if (chkSymmetry.checked && lastSteps.length > 0) {
      const idx = Number(stepSelect.value);
      const step = lastSteps.find((s) => s.i === idx);
      if (step) {
        const pts = CircleAlgo.plot8(lastCx, lastCy, step.x, step.y);
        for (const [px, py] of pts) {
          raster.strokePixel(px, py, "#e11d48");
        }
      }
    }
  }

  function fillTable(steps) {
    tableBody.innerHTML = "";
    for (const s of steps) {
      const tr = document.createElement("tr");
      tr.dataset.step = String(s.i);

      tr.innerHTML = `
        <td>${s.i}</td>
        <td>${s.x}</td>
        <td>${s.y}</td>
        <td>${s.dBefore}</td>
        <td>${s.variant === "E" ? "E (y не меняется)" : "SE (y − 1)"}</td>
        <td>${s.dAfter}</td>
      `;
      tableBody.appendChild(tr);
    }
  }

  function fillStepSelect(steps) {
    stepSelect.innerHTML = "";
    if (steps.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "—";
      opt.value = "";
      stepSelect.appendChild(opt);
      return;
    }
    for (const s of steps) {
      const opt = document.createElement("option");
      opt.value = String(s.i);
      opt.textContent = `шаг ${s.i}: базовая точка (${s.x}, ${s.y})`;
      stepSelect.appendChild(opt);
    }
  }

  function highlightTableRow(idx) {
    for (const tr of tableBody.querySelectorAll("tr")) {
      tr.classList.toggle("highlight", tr.dataset.step === String(idx));
    }
  }

  function build() {
    const params = readParams();
    const err = validate(params);
    if (err) {
      setStatus(err, true);
      lastSteps = [];
      lastPixels = [];
      fillTable([]);
      fillStepSelect([]);
      raster.clear();
      if (chkGrid.checked) raster.drawGrid();
      return;
    }

    lastCx = params.cx;
    lastCy = params.cy;
    lastR = params.r;

    const { steps, pixels } = CircleAlgo.circleMidpointFull(lastCx, lastCy, lastR);
    lastSteps = steps;
    lastPixels = pixels;

    fillTable(steps);
    fillStepSelect(steps);
    highlightTableRow(Number(stepSelect.value));
    draw();

    const warn = outOfBoundsWarning(params);
    if (warn) {
      setStatus(
        `Построено с предупреждением: r = ${lastR}, шагов: ${steps.length}, ` +
        `пикселей: ${pixels.length}. ${warn}`,
        true
      );
    } else {
      setStatus(
        `Построено: r = ${lastR}, базовых шагов: ${steps.length}, пикселей: ${pixels.length}.`
      );
    }
  }

  function clearAll() {
    lastSteps = [];
    lastPixels = [];
    lastCx = lastCy = lastR = 0;
    fillTable([]);
    fillStepSelect([]);
    raster.clear();
    if (chkGrid.checked) raster.drawGrid();
    compareEl.textContent = "";
    setStatus("Очищено.");
  }

  function compare() {
    const { cx, cy, r } = readParams();
    const err = validate({ cx, cy, r });
    if (err) {
      compareEl.textContent = err;
      return;
    }

    const mid = CircleAlgo.circleMidpointFull(cx, cy, r);
    const f = CircleAlgo.circleByFormula(cx, cy, r);

    const setMid = new Set(mid.pixels.map(([x, y]) => x + "," + y));
    const setF = new Set(f.pixels.map(([x, y]) => x + "," + y));

    let same = setMid.size === setF.size;
    if (same) {
      for (const k of setMid) {
        if (!setF.has(k)) { same = false; break; }
      }
    }

    const RUNS = 50;

    const t0 = performance.now();
    for (let k = 0; k < RUNS; k++) CircleAlgo.circleMidpointFull(cx, cy, r);
    const tMid = (performance.now() - t0) / RUNS;

    const t1 = performance.now();
    for (let k = 0; k < RUNS; k++) CircleAlgo.circleByFormula(cx, cy, r);
    const tForm = (performance.now() - t1) / RUNS;

    const fmt = (v) => v.toFixed(4) + " мс";

    compareEl.textContent =
      `Пиксели совпали: ${same ? "да" : "нет"}\n` +
      `Пикселей midpoint: ${mid.pixels.length}, sqrt: ${f.pixels.length}\n` +
      `Базовых точек midpoint: ${mid.steps.length}, sqrt: ${f.basePoints}\n` +
      `Время (среднее за ${RUNS} прогонов):\n` +
      `  midpoint: ${fmt(tMid)}\n` +
      `  sqrt:     ${fmt(tForm)}\n` +
      `Вывод делайте по серии запусков, а не по одному.`;
  }

  btnBuild.addEventListener("click", build);
  btnClear.addEventListener("click", clearAll);
  btnCompare.addEventListener("click", compare);

  chkGrid.addEventListener("change", draw);
  chkFormula.addEventListener("change", draw);
  chkSymmetry.addEventListener("change", draw);

  stepSelect.addEventListener("change", () => {
    highlightTableRow(Number(stepSelect.value));
    draw();
  });

  raster.clear();
  if (chkGrid.checked) raster.drawGrid();
  setStatus("Введите параметры и нажмите «Построить».");
})();