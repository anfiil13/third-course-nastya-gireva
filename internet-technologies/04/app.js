const API_URL = 'https://jsonplaceholder.typicode.com/posts';

const state = {
  posts: [],         
  filter: '',        
  isLoading: false,  
  isSaving: false,   
  isDeleting: false, 
  error: null,       
  editingId: null    
};

const loadButton   = document.querySelector('#loadButton');
const reloadButton = document.querySelector('#reloadButton');
const filterInput  = document.querySelector('#filterInput');

const statusElement     = document.querySelector('#status');
const statisticsElement = document.querySelector('#statistics');

const postsElement = document.querySelector('#posts');

const postForm     = document.querySelector('#postForm');
const formTitle    = document.querySelector('#formTitle');
const titleInput   = document.querySelector('#titleInput');
const bodyInput    = document.querySelector('#bodyInput');
const submitButton = document.querySelector('#submitButton');
const cancelButton = document.querySelector('#cancelButton');
const formError    = document.querySelector('#formError');

async function loadPosts() {
  if (state.isLoading) return;

  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${API_URL}?_limit=10`);

    if (!response.ok) {
      throw new Error(`Ошибка загрузки: HTTP ${response.status}`);
    }

    const data = await response.json();
    state.posts = Array.isArray(data) ? data : [];
  } catch (error) {
    state.error = error.message || 'Не удалось загрузить публикации';
  } finally {
    state.isLoading = false;
    render();
  }
}

async function createPost(data) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Не удалось создать публикацию: HTTP ${response.status}`);
  }

  const created = await response.json();

  const maxId = state.posts.length > 0
    ? Math.max(...state.posts.map(p => p.id))
    : 0;
  created.id = maxId + 1;

  state.posts.unshift(created);
  return created;
}

async function updatePost(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Не удалось сохранить изменения: HTTP ${response.status}`);
  }

  const updated = await response.json();

  const index = state.posts.findIndex(post => post.id === id);
  if (index !== -1) {
    state.posts[index] = { ...state.posts[index], ...updated, ...data };
  }

  return updated;
}

async function deletePost(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Не удалось удалить публикацию: HTTP ${response.status}`);
  }

  state.posts = state.posts.filter(post => post.id !== id);
}

function getFilteredPosts(posts, filter) {
  const query = filter.trim().toLowerCase();
  if (!query) return posts;

  return posts.filter(post => {
    if (!post) return false;
    const title = (post.title || '').toLowerCase();
    const body  = (post.body  || '').toLowerCase();
    return title.includes(query) || body.includes(query);
  });
}

function createPostCard(post) {
  const article = document.createElement('article');
  article.className = 'post-card';

  const idEl = document.createElement('span');
  idEl.className = 'post-card__id';
  idEl.textContent = `#${post.id}`;

  const titleEl = document.createElement('h3');
  titleEl.className = 'post-card__title';
  titleEl.textContent = post.title || '(без заголовка)';

  const bodyEl = document.createElement('p');
  bodyEl.className = 'post-card__body';
  bodyEl.textContent = post.body || '';

  const actions = document.createElement('div');
  actions.className = 'post-card__actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Редактировать';
  editButton.addEventListener('click', () => startEditing(post));

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'danger';
  deleteButton.textContent = 'Удалить';
  deleteButton.addEventListener('click', () => handleDelete(post.id));

  actions.append(editButton, deleteButton);
  article.append(idEl, titleEl, bodyEl, actions);

  return article;
}

function render() {
  if (state.isLoading) {
    statusElement.textContent = 'Загрузка публикаций...';
    statusElement.classList.remove('error');
  } else if (state.error) {
    statusElement.textContent = state.error;
    statusElement.classList.add('error');
  } else if (state.posts.length === 0) {
    statusElement.textContent = 'Данные ещё не загружены.';
    statusElement.classList.remove('error');
  } else {
    statusElement.textContent = '';
    statusElement.classList.remove('error');
  }

  loadButton.disabled   = state.isLoading || state.isSaving || state.isDeleting;
  reloadButton.disabled = state.isLoading || state.isSaving || state.isDeleting;
  submitButton.disabled = state.isSaving;
  cancelButton.disabled = state.isSaving;

  formTitle.textContent = state.editingId === null
    ? 'Новая публикация'
    : `Редактирование публикации #${state.editingId}`;

  submitButton.textContent = state.editingId === null
    ? (state.isSaving ? 'Сохранение...' : 'Сохранить')
    : (state.isSaving ? 'Сохранение...' : 'Сохранить изменения');

  cancelButton.hidden = state.editingId === null;

  postsElement.innerHTML = '';

  if (state.posts.length === 0 && !state.isLoading) {
    return;
  }

  const filtered = getFilteredPosts(state.posts, state.filter);

  if (filtered.length === 0 && state.posts.length > 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Ничего не найдено по запросу.';
    postsElement.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach(post => fragment.append(createPostCard(post)));
  postsElement.append(fragment);
}

function startEditing(post) {
  state.editingId = post.id;
  titleInput.value = post.title || '';
  bodyInput.value  = post.body  || '';
  formError.hidden = true;
  formError.textContent = '';
  render();
  titleInput.focus();
}

function resetForm() {
  state.editingId = null;
  postForm.reset();
  formError.hidden = true;
  formError.textContent = '';
  render();
  titleInput.focus();
}

async function handleFormSubmit(event) {
  event.preventDefault();

  if (state.isSaving) return;

  const title = titleInput.value.trim();
  const body  = bodyInput.value.trim();

  if (!title || !body) {
    formError.textContent = 'Заполните оба поля: заголовок и текст.';
    formError.hidden = false;
    return;
  }

  formError.hidden = true;
  formError.textContent = '';

  state.isSaving = true;
  state.error = null;
  render();

  try {
    if (state.editingId === null) {
      await createPost({ title, body, userId: 1 });
    } else {
      await updatePost(state.editingId, { title, body });
    }

    resetForm();
  } catch (error) {
    state.error = error.message || 'Ошибка сохранения';
    formError.textContent = state.error;
    formError.hidden = false;
  } finally {
    state.isSaving = false;
    render();
  }
}

async function handleDelete(id) {
  if (state.isDeleting) return;

  state.isDeleting = true;
  state.error = null;
  render();

  try {
    await deletePost(id);
  } catch (error) {
    state.error = error.message || 'Ошибка удаления';
  } finally {
    state.isDeleting = false;
    render();
  }
}

loadButton.addEventListener('click', loadPosts);
reloadButton.addEventListener('click', loadPosts);

postForm.addEventListener('submit', handleFormSubmit);
cancelButton.addEventListener('click', resetForm);

filterInput.addEventListener('input', event => {
  state.filter = event.target.value;
  render();
});

loadPosts();