// ЛР7. Сервер из ЛР6 + раздача интерфейса из папки public (один origin)
const express = require('express');
const Database = require('better-sqlite3');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.db');

const app = express();
app.use(express.json());

// HTML, CSS и JS интерфейса отдаёт тот же сервер, что и API
app.use(express.static(path.join(__dirname, 'public')));

// ---------- База данных ----------
const db = new Database(DB_FILE);

// Таблица создаётся автоматически при первом запуске
db.prepare(
  'CREATE TABLE IF NOT EXISTS books (' +
  'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
  "title TEXT NOT NULL, " +
  "author TEXT NOT NULL DEFAULT '', " +
  'year INTEGER, ' +
  'available INTEGER NOT NULL DEFAULT 1' +
  ')'
).run();

// Подготовленные запросы (значения передаются только параметрами "?")
const selectById = db.prepare(
  'SELECT id, title, author, year, available FROM books WHERE id = ?'
);
const insertBook = db.prepare(
  'INSERT INTO books (title, author, year, available) VALUES (?, ?, ?, ?)'
);
const updateBook = db.prepare(
  'UPDATE books SET title = ?, author = ?, year = ?, available = ? WHERE id = ?'
);
const deleteBook = db.prepare('DELETE FROM books WHERE id = ?');

// SQLite хранит boolean как 0/1 — переводим в true/false для клиента
function toJson(row) {
  return { ...row, available: Boolean(row.available) };
}

// id из URL: только целое положительное число
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------- Валидация ----------
const MAX_YEAR = new Date().getFullYear() + 1;

function validateTitle(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { error: 'title is required and must be a non-empty string' };
  }
  if (value.trim().length > 200) {
    return { error: 'title must be at most 200 characters' };
  }
  return { value: value.trim() };
}

function validateAuthor(value) {
  if (typeof value !== 'string') {
    return { error: 'author must be a string' };
  }
  if (value.trim().length > 100) {
    return { error: 'author must be at most 100 characters' };
  }
  return { value: value.trim() };
}

function validateYear(value) {
  if (value === null || value === '') return { value: null };
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1 || year > MAX_YEAR) {
    return { error: 'year must be an integer from 1 to ' + MAX_YEAR + ' or null' };
  }
  return { value: year };
}

function validateAvailable(value) {
  if (typeof value !== 'boolean') {
    return { error: 'available must be true or false' };
  }
  return { value };
}

// ---------- Маршруты ----------

// GET /api/books?available=true&author=Толстой&q=война
app.get('/api/books', (req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.available !== undefined) {
    if (req.query.available !== 'true' && req.query.available !== 'false') {
      return res.status(400).json({ error: 'available must be true or false' });
    }
    conditions.push('available = ?');
    params.push(req.query.available === 'true' ? 1 : 0);
  }

  if (req.query.author !== undefined) {
    conditions.push('author LIKE ?');
    params.push('%' + String(req.query.author).trim() + '%');
  }

  if (req.query.q !== undefined) {
    conditions.push('title LIKE ?');
    params.push('%' + String(req.query.q).trim() + '%');
  }

  // В строку SQL склеиваются только наши фиксированные фрагменты,
  // пользовательские значения идут отдельно в params.
  let sql = 'SELECT id, title, author, year, available FROM books';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY id';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(toJson));
});

// GET /api/books/:id
app.get('/api/books/:id', (req, res) => {
  const id = parseId(req.params.id);
  const book = id && selectById.get(id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(toJson(book));
});

// POST /api/books
app.post('/api/books', (req, res) => {
  const body = req.body ?? {};

  const title = validateTitle(body.title);
  if (title.error) return res.status(400).json({ error: title.error });

  const author = validateAuthor(body.author ?? '');
  if (author.error) return res.status(400).json({ error: author.error });

  const year = validateYear(body.year ?? null);
  if (year.error) return res.status(400).json({ error: year.error });

  const available = validateAvailable(body.available ?? true);
  if (available.error) return res.status(400).json({ error: available.error });

  const result = insertBook.run(
    title.value,
    author.value,
    year.value,
    available.value ? 1 : 0
  );

  const book = selectById.get(result.lastInsertRowid);
  res.status(201).json(toJson(book));
});

// PATCH /api/books/:id — меняются только переданные поля
app.patch('/api/books/:id', (req, res) => {
  const id = parseId(req.params.id);
  const current = id && selectById.get(id);

  if (!current) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const body = req.body ?? {};
  const next = {
    title: current.title,
    author: current.author,
    year: current.year,
    available: Boolean(current.available)
  };

  if (body.title !== undefined) {
    const r = validateTitle(body.title);
    if (r.error) return res.status(400).json({ error: r.error });
    next.title = r.value;
  }
  if (body.author !== undefined) {
    const r = validateAuthor(body.author);
    if (r.error) return res.status(400).json({ error: r.error });
    next.author = r.value;
  }
  if (body.year !== undefined) {
    const r = validateYear(body.year);
    if (r.error) return res.status(400).json({ error: r.error });
    next.year = r.value;
  }
  if (body.available !== undefined) {
    const r = validateAvailable(body.available);
    if (r.error) return res.status(400).json({ error: r.error });
    next.available = r.value;
  }

  updateBook.run(next.title, next.author, next.year, next.available ? 1 : 0, id);
  res.json(toJson(selectById.get(id)));
});

// DELETE /api/books/:id
app.delete('/api/books/:id', (req, res) => {
  const id = parseId(req.params.id);
  const result = id ? deleteBook.run(id) : { changes: 0 };

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.status(204).end();
});

// Неизвестный маршрут
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Общий обработчик ошибок
app.use((err, req, res, next) => {
  // Некорректный JSON в теле запроса — ошибка клиента
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('Server: http://localhost:' + PORT);
});
