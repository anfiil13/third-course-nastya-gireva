let value = 0;

const valueEl   = document.querySelector('#value');
const messageEl = document.querySelector('#message');
const btnInc    = document.querySelector('#increase');
const btnDec    = document.querySelector('#decrease');
const btnReset  = document.querySelector('#reset');

function render() {
  valueEl.textContent = value;

  valueEl.classList.remove('positive', 'negative', 'zero');

  if (value > 0) {
    valueEl.classList.add('positive');
    messageEl.textContent = 'Число положительное';
  } else if (value < 0) {
    valueEl.classList.add('negative');
    messageEl.textContent = 'Число отрицательное';
  } else {
    valueEl.classList.add('zero');
    messageEl.textContent = 'Число равно нулю';
  }
}

btnInc.addEventListener('click', () => {
  value += 1;
  render();
});

btnDec.addEventListener('click', () => {
  value -= 1;
  render();
});

btnReset.addEventListener('click', () => {
  value = 0;
  render();
});

render();