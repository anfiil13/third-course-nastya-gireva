// ЛР7. Клиент для собственного API /api/books

// ---------- Состояние ----------
let books = [];          // текущая копия данных с сервера
let loading = false;     // идёт ли загрузка списка
let loadError = '';      // ошибка последней загрузки
let editingId = null;    // id книги, которая сейчас редактируется

// ---------- Элементы страницы ----------
const form = document.querySelector('#book-form');
const titleInput = document.querySelector('#book-title');
const authorInput = document.querySelector('#book-author');
const yearInput = document.querySelector('#book-year');
const list = document.querySelector('#book-list');
const statusEl = document.querySelector('#status');
const messageEl = document.querySelector('#message');
const refreshBtn = document.querySelector('#refresh-btn');
const filterQ = document.querySelector('#filter-q');
const filterAvailable = document.querySelector('#filter-available');

// ---------- HTTP ----------

// Общая обёртка: проверяет response.ok, достаёт текст ошибки, учитывает 204
async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    // Сюда попадаем, только если HTTP-ответа нет вообще (сервер выключен)
    throw new Error('Сервер недоступен. Проверьте, что запущен node server.js');
  }

  if (!response.ok) {
    let message = 'HTTP ' + response.status;
    try {
      const data = await response.json();
      if (data.error) message += ': ' + data.error;
    } catch {
      // тело ошибки могло быть не JSON
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null; // у успешного DELETE нет тела
  }
  return response.json();
}

const jsonHeaders = { 'Content-Type': 'application/json' };

function createBook(book) {
  return request('/api/books', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(book)
  });
}

function updateBook(id, changes) {
  return request('/api/books/' + id, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(changes)
  });
}

function deleteBook(id) {
  return request('/api/books/' + id, { method: 'DELETE' });
}

// ---------- Загрузка списка ----------

function buildListUrl() {
  const params = new URLSearchParams();
  const q = filterQ.value.trim();
  if (q) params.set('q', q);
  if (filterAvailable.value) params.set('available', filterAvailable.value);
  const query = params.toString();
  return '/api/books' + (query ? '?' + query : '');
}

async function refreshBooks() {
  loading = true;
  loadError = '';
  render();

  try {
    books = await request(buildListUrl());
  } catch (error) {
    loadError = error.message;
  } finally {
    loading = false;
    render();
  }
}

// ---------- Сообщения ----------

let messageTimer = null;

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = 'message ' + type;
  clearTimeout(messageTimer);
  if (type === 'success') {
    messageTimer = setTimeout(() => {
      messageEl.textContent = '';
    }, 3000);
  }
}

// ---------- Отрисовка ----------

function render() {
  refreshBtn.disabled = loading;

  if (loading) {
    statusEl.textContent = 'Загрузка...';
  } else if (loadError) {
    statusEl.textContent = 'Ошибка загрузки: ' + loadError;
  } else if (books.length === 0) {
    statusEl.textContent = 'Список пуст';
  } else {
    statusEl.textContent = 'Загружено книг: ' + books.length;
  }

  list.replaceChildren();
  if (loadError) return;

  for (const book of books) {
    list.append(book.id === editingId ? renderEditItem(book) : renderItem(book));
  }
}

// Все пользовательские данные выводятся через textContent, не через innerHTML
function renderItem(book) {
  const li = document.createElement('li');
  li.className = 'book' + (book.available ? '' : ' unavailable');

  const info = document.createElement('div');
  info.className = 'book-info';

  const title = document.createElement('div');
  title.className = 'book-title';
  title.textContent = book.title;

  const meta = document.createElement('div');
  meta.className = 'book-meta';
  const parts = [];
  if (book.author) parts.push(book.author);
  if (book.year) parts.push(book.year);
  parts.push('#' + book.id);
  meta.textContent = parts.join(' · ');

  info.append(title, meta);

  // PATCH: переключение поля available
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = book.available;
  checkbox.addEventListener('change', () => handleToggle(book, checkbox));
  label.append(checkbox, ' в наличии');

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'secondary';
  editBtn.textContent = 'Изменить';
  editBtn.addEventListener('click', () => {
    editingId = book.id;
    render();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'danger';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => handleDelete(book));

  li.append(info, label, editBtn, deleteBtn);
  return li;
}

// Режим редактирования названия и автора (PATCH)
function renderEditItem(book) {
  const li = document.createElement('li');
  li.className = 'book';

  const info = document.createElement('div');
  info.className = 'book-info';

  const titleEdit = document.createElement('input');
  titleEdit.className = 'edit-input';
  titleEdit.value = book.title;
  titleEdit.maxLength = 200;

  const authorEdit = document.createElement('input');
  authorEdit.className = 'edit-input';
  authorEdit.value = book.author;
  authorEdit.placeholder = 'Автор';
  authorEdit.maxLength = 100;

  info.append(titleEdit, authorEdit);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Сохранить';
  saveBtn.addEventListener('click', () =>
    handleSave(book, titleEdit.value, authorEdit.value)
  );

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'secondary';
  cancelBtn.textContent = 'Отмена';
  cancelBtn.addEventListener('click', () => {
    editingId = null;
    render();
  });

  li.append(info, saveBtn, cancelBtn);
  setTimeout(() => titleEdit.focus());
  return li;
}

// ---------- Обработчики ----------

form.addEventListener('submit', async event => {
  event.preventDefault(); // без перезагрузки страницы

  const title = titleInput.value.trim();
  if (!title) {
    showMessage('Введите название книги', 'error');
    titleInput.focus();
    return;
  }

  const book = {
    title,
    author: authorInput.value.trim()
  };
  if (yearInput.value !== '') {
    book.year = Number(yearInput.value);
  }

  try {
    const created = await createBook(book);
    form.reset();
    await refreshBooks();
    showMessage('Книга «' + created.title + '» добавлена');
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

async function handleToggle(book, checkbox) {
  checkbox.disabled = true;
  try {
    await updateBook(book.id, { available: checkbox.checked });
    await refreshBooks();
    showMessage('Статус книги изменён');
  } catch (error) {
    showMessage(error.message, 'error');
    await refreshBooks(); // вернуть то, что реально хранится на сервере
  }
}

async function handleSave(book, newTitle, newAuthor) {
  const title = newTitle.trim();
  if (!title) {
    showMessage('Название не может быть пустым', 'error');
    return;
  }
  try {
    await updateBook(book.id, { title, author: newAuthor.trim() });
    editingId = null;
    await refreshBooks();
    showMessage('Изменения сохранены');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function handleDelete(book) {
  if (!confirm('Удалить книгу «' + book.title + '»?')) return;
  try {
    await deleteBook(book.id);
    if (editingId === book.id) editingId = null;
    await refreshBooks();
    showMessage('Книга удалена');
  } catch (error) {
    showMessage(error.message, 'error');
    await refreshBooks();
  }
}

refreshBtn.addEventListener('click', refreshBooks);
filterAvailable.addEventListener('change', refreshBooks);

// Поиск — с небольшой задержкой, чтобы не слать запрос на каждую букву
let searchTimer = null;
filterQ.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(refreshBooks, 300);
});

// Первая загрузка
refreshBooks();
