'use strict';

const values = [];

const inputEl = document.querySelector('#number');
const addBtn = document.querySelector('#add-btn');
const removeBtn = document.querySelector('#remove-btn');
const clearBtn = document.querySelector('#clear-btn');
const errorEl = document.querySelector('#error');

const listEl = document.querySelector('#list');
const emptyMessageEl = document.querySelector('#empty-message');

const countEl = document.querySelector('#count');
const sumEl = document.querySelector('#sum');
const averageEl = document.querySelector('#average');
const minEl = document.querySelector('#min');
const maxEl = document.querySelector('#max');

function addValue(value) {
  values.push(value);
}

function removeLastValue() {
  values.pop();
}

function clearValues() {
  values.length = 0;
}

function getStatistics(values) {
  const count = values.length;

  if (count === 0) {
    return { count: 0, sum: null, min: null, max: null, average: null };
  }

  let sum = 0;
  let min = values[0];
  let max = values[0];

  for (const value of values) {
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return {
    count,
    sum,
    min,
    max,
    average: sum / count
  };
}

function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4)));
}

function renderList() {
  listEl.innerHTML = '';

  for (const value of values) {
    const li = document.createElement('li');
    li.textContent = formatNumber(value);
    listEl.appendChild(li);
  }

  emptyMessageEl.hidden = values.length > 0;
}

function renderStats() {
  const stats = getStatistics(values);

  countEl.textContent = String(stats.count);

  if (stats.count === 0) {
    sumEl.textContent = '—';
    averageEl.textContent = '—';
    minEl.textContent = '—';
    maxEl.textContent = '—';
    return;
  }

  sumEl.textContent = formatNumber(stats.sum);
  averageEl.textContent = formatNumber(stats.average);
  minEl.textContent = formatNumber(stats.min);
  maxEl.textContent = formatNumber(stats.max);
}

function render() {
  renderList();
  renderStats();
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.textContent = '';
  errorEl.hidden = true;
}

function handleAdd() {
  const raw = inputEl.value.trim();
  const value = Number(raw);

  if (raw === '' || !Number.isFinite(value)) {
    showError('Введите корректное число.');
    return;
  }

  hideError();
  addValue(value);
  render();

  inputEl.value = '';
  inputEl.focus();
}

function handleRemoveLast() {
  if (values.length === 0) {
    showError('Список уже пуст.');
    return;
  }

  hideError();
  removeLastValue();
  render();
}

function handleClear() {
  hideError();
  clearValues();
  render();
}

addBtn.addEventListener('click', handleAdd);
removeBtn.addEventListener('click', handleRemoveLast);
clearBtn.addEventListener('click', handleClear);

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleAdd();
  }
});

render();