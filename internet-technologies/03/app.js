const API_URL = 'https://jsonplaceholder.typicode.com/users';

const state = {
  users: [],
  isLoading: false,
  error: null,
  filter: ''
};

const loadButton = document.querySelector('#loadButton');
const reloadButton = document.querySelector('#reloadButton');
const filterInput = document.querySelector('#filterInput');

const statusElement = document.querySelector('#status');
const statisticsElement = document.querySelector('#statistics');
const usersElement = document.querySelector('#users');


async function loadUsers() {
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText}`);
    }

    const users = await response.json();
    state.users = users;
  } catch (error) {
    state.error = error.message || 'Не удалось загрузить данные';
    state.users = [];
    console.error('[loadUsers]', error);
  } finally {
    state.isLoading = false;
    render();
  }
}


function getFilteredUsers(users, filter) {
  const query = filter.trim().toLowerCase();

  if (!query) return users.slice();

  return users.filter(user => {
    const name = (user.name || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();

    return (
      name.includes(query) ||
      username.includes(query) ||
      email.includes(query)
    );
  });
}


function createUserCard(user) {
  const article = document.createElement('article');
  article.className = 'user-card';

  const name = document.createElement('h2');
  name.className = 'user-card__name';
  name.textContent = user.name;
  article.append(name);

  const username = document.createElement('div');
  username.className = 'user-card__username';
  username.textContent = '@' + user.username;
  article.append(username);

  const emailRow = document.createElement('div');
  emailRow.className = 'user-card__field';
  const emailLabel = document.createElement('span');
  emailLabel.className = 'user-card__label';
  emailLabel.textContent = 'Email:';
  const emailValue = document.createElement('a');
  emailValue.className = 'user-card__email';
  emailValue.href = 'mailto:' + user.email;
  emailValue.textContent = user.email;
  emailRow.append(emailLabel, emailValue);
  article.append(emailRow);

  const cityRow = document.createElement('div');
  cityRow.className = 'user-card__field';
  const cityLabel = document.createElement('span');
  cityLabel.className = 'user-card__label';
  cityLabel.textContent = 'Город:';
  const cityValue = document.createElement('span');
  cityValue.className = 'user-card__value';
  cityValue.textContent = (user.address && user.address.city) || '—';
  cityRow.append(cityLabel, cityValue);
  article.append(cityRow);

  const companyRow = document.createElement('div');
  companyRow.className = 'user-card__field';
  const companyLabel = document.createElement('span');
  companyLabel.className = 'user-card__label';
  companyLabel.textContent = 'Компания:';
  const companyValue = document.createElement('span');
  companyValue.className = 'user-card__value';
  companyValue.textContent = (user.company && user.company.name) || '—';
  companyRow.append(companyLabel, companyValue);
  article.append(companyRow);

  return article;
}


function getStatistics(users, filteredUsers) {
  const cities = new Set(
    users.map(user => user.address && user.address.city).filter(Boolean)
  );

  return {
    total: users.length,
    visible: filteredUsers.length,
    uniqueCities: cities.size
  };
}


function render() {
  usersElement.innerHTML = '';
  statisticsElement.textContent = '';

  // Управление доступностью кнопки «Обновить» и поля поиска
  const hasData = state.users.length > 0;
  reloadButton.disabled = state.isLoading || !hasData;
  filterInput.disabled = state.isLoading || !hasData;

  if (state.isLoading) {
    statusElement.textContent = 'Загрузка...';
    return;
  }

  if (state.error) {
    statusElement.textContent = 'Ошибка: ' + state.error;
    return;
  }

  if (state.users.length === 0) {
    statusElement.textContent = 'Данные ещё не загружены.';
    return;
  }

  const filteredUsers = getFilteredUsers(state.users, state.filter);

  if (filteredUsers.length === 0) {
    statusElement.textContent = 'Ничего не найдено по запросу «' + state.filter + '»';
    return;
  }

  statusElement.textContent = '';
  filteredUsers.forEach(user => {
    usersElement.append(createUserCard(user));
  });

  const stats = getStatistics(state.users, filteredUsers);
  statisticsElement.textContent =
    `Всего получено: ${stats.total} | ` +
    `Отображается: ${stats.visible} | ` +
    `Уникальных городов: ${stats.uniqueCities}`;
}


loadButton.addEventListener('click', () => {
  loadUsers();
});

reloadButton.addEventListener('click', () => {
  state.filter = '';
  filterInput.value = '';
  loadUsers();
});

filterInput.addEventListener('input', event => {
  state.filter = event.target.value;
  render();
});

render();